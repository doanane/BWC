from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


def _make_engine(url: str):
    is_serverless = any(h in url for h in ("neon.tech", "amazonaws.com", "supabase.co"))
    pool_size = settings.DB_POOL_SIZE
    max_overflow = settings.DB_MAX_OVERFLOW
    pool_timeout = settings.DB_POOL_TIMEOUT
    pool_recycle = settings.DB_POOL_RECYCLE

    if is_serverless:
        # Keep a healthy minimum for serverless Postgres under dashboard fan-out requests.
        pool_size = max(pool_size, 8)
        max_overflow = max(max_overflow, 12)

    extra = (
        {"keepalives": 1, "keepalives_idle": 30, "keepalives_interval": 10, "keepalives_count": 5}
        if not url.startswith("sqlite") else {}
    )
    eng = create_engine(
        url,
        pool_pre_ping=True,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_timeout=pool_timeout,
        pool_recycle=pool_recycle,
        pool_use_lifo=True,
        echo=False,
        connect_args=extra,
    )

    @event.listens_for(eng, "connect")
    def _set_search_path(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("SET search_path TO public")
        cursor.close()

    return eng


def _resolve_engine():
    primary_url = settings.DATABASE_URL
    fallback_url = settings.DATABASE_URL_FALLBACK

    try:
        eng = _make_engine(primary_url)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Connected to primary database (Neon)")
        return eng, "primary"
    except Exception as e:
        logger.warning(f"Primary database unavailable: {e}")

    if fallback_url:
        try:
            eng = _make_engine(fallback_url)
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.warning("Connected to fallback database (local)")
            return eng, "fallback"
        except Exception as e:
            logger.error(f"Fallback database also unavailable: {e}")

    raise RuntimeError("No database available. Check DATABASE_URL and DATABASE_URL_FALLBACK in .env")


engine, active_db_mode = _resolve_engine()
logger.info(f"Database engine active: {active_db_mode}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def create_tables():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"create_tables skipped (tables may already exist): {e}")
