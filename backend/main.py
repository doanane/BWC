import logging
import os
import re
import time
from collections import defaultdict
from threading import Lock

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import api_router
from app.core.config import settings
from app.core.database import active_db_mode, create_tables

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

_is_production = settings.ENVIRONMENT.lower() == "production"

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Digital Birth Certificate Registration and Management System API for Ghana's Births and Deaths Registry",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store"
        if _is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        return response


# In-memory rate limiter (IP-based, no Redis dependency)
_rate_store: dict[str, list[float]] = defaultdict(list)
_rate_lock = Lock()


def _is_rate_limited(key: str, max_requests: int, window_seconds: int) -> bool:
    now = time.monotonic()
    with _rate_lock:
        timestamps = _rate_store[key]
        _rate_store[key] = [t for t in timestamps if now - t < window_seconds]
        if len(_rate_store[key]) >= max_requests:
            return True
        _rate_store[key].append(now)
        return False


AUTH_PATHS = {"/api/auth/login", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/digital-id-login"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in AUTH_PATHS and request.method == "POST":
            ip = request.client.host if request.client else "unknown"
            if _is_rate_limited(f"auth:{ip}", max_requests=20, window_seconds=60):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please wait a moment before trying again."},
                )
        return await call_next(request)


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

from app.middleware.audit_middleware import RequestLoggingMiddleware
app.add_middleware(RequestLoggingMiddleware)

_CORS_EXTRA = [
    "https://bdr-cb0.pages.dev",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(settings.get_cors_origins() + _CORS_EXTRA)),
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
        r"|^https://[a-z0-9-]+\.ngrok(-free)?\.(app|dev)$"
        r"|^https://[a-z0-9-]+\.ngrok\.io$"
        r"|^https://[a-z0-9-]+\.pages\.dev$"
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With", "ngrok-skip-browser-warning"],
)

for directory in ["uploads", "uploads/documents", "uploads/certificates", "uploads/profiles", "logs"]:
    os.makedirs(directory, exist_ok=True)

if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(api_router, prefix="/api")


# Schema migration — adds new columns and encrypts existing plaintext cards
def _run_schema_migrations(db):
    from sqlalchemy import inspect as sa_inspect, text

    from app.core.database import engine

    inspector = sa_inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing = {col["name"] for col in inspector.get_columns("users")}
    new_cols = []
    if "ghana_card_hash" not in existing:
        new_cols.append("ALTER TABLE users ADD COLUMN ghana_card_hash VARCHAR(64)")
    if "login_attempts" not in existing:
        new_cols.append("ALTER TABLE users ADD COLUMN login_attempts INTEGER NOT NULL DEFAULT 0")
    if "locked_until" not in existing:
        new_cols.append("ALTER TABLE users ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE")

    # statistics_requests: add approval_status if missing
    if "statistics_requests" in inspector.get_table_names():
        stat_cols = {col["name"] for col in inspector.get_columns("statistics_requests")}
        if "approval_status" not in stat_cols:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE statistics_requests ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending'"
                ))
            logger.info("Schema migration: added approval_status to statistics_requests")

    with engine.begin() as conn:
        for stmt in new_cols:
            conn.execute(text(stmt))
        # Widen ghana_card_number to hold Fernet ciphertext (~150 chars)
        conn.execute(text(
            "ALTER TABLE users ALTER COLUMN ghana_card_number TYPE VARCHAR(500)"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_ghana_card_hash "
            "ON users (ghana_card_hash) WHERE ghana_card_hash IS NOT NULL"
        ))
    if new_cols:
        logger.info("Schema migration: added %d new column(s) to users table", len(new_cols))
    logger.info("Schema migration: ghana_card_number column widened to VARCHAR(500)")

    # Data migration: encrypt any existing plaintext Ghana Card numbers
    from app.core.security import decrypt_pii, encrypt_pii, hash_pii_lookup
    from app.models.user import User as UserModel

    users = db.query(UserModel).filter(
        UserModel.ghana_card_number.isnot(None),
        UserModel.ghana_card_hash.is_(None),
    ).all()

    known_hashes = {
        row[0]
        for row in db.query(UserModel.ghana_card_hash)
        .filter(UserModel.ghana_card_hash.isnot(None))
        .all()
        if row[0]
    }

    migrated_hashes = 0
    encrypted_plaintext = 0
    skipped_duplicates = 0

    for u in users:
        raw = u.ghana_card_number or ""
        plaintext = decrypt_pii(raw)
        normalized = re.sub(r"[\s\-]", "", plaintext or "").upper()
        if not normalized:
            continue

        card_hash = hash_pii_lookup(normalized)
        needs_encrypt = raw == plaintext

        if card_hash in known_hashes:
            if needs_encrypt:
                u.ghana_card_number = encrypt_pii(normalized)
                encrypted_plaintext += 1
            skipped_duplicates += 1
            continue

        u.ghana_card_hash = card_hash
        known_hashes.add(card_hash)
        migrated_hashes += 1

        if needs_encrypt:
            u.ghana_card_number = encrypt_pii(normalized)
            encrypted_plaintext += 1

    if migrated_hashes or encrypted_plaintext:
        db.commit()
        if migrated_hashes:
            logger.info("Data migration: stored ghana_card_hash for %d user(s)", migrated_hashes)
        if encrypted_plaintext:
            logger.info("Data migration: encrypted %d plaintext Ghana Card number(s)", encrypted_plaintext)
    if skipped_duplicates:
        logger.warning(
            "Data migration: skipped ghana_card_hash for %d duplicate Ghana Card value(s) "
            "to satisfy unique index",
            skipped_duplicates,
        )


@app.on_event("startup")
async def startup_event():
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    db_label = "Neon (cloud)" if active_db_mode == "primary" else "Local PostgreSQL (fallback)"
    logger.info("Database: %s", db_label)
    create_tables()
    logger.info("Database tables verified")

    from app.core.database import SessionLocal
    from app.utils.nia_seed import seed_nia_data
    from app.services import ai_service as _ai_service

    db = SessionLocal()
    try:
        _run_schema_migrations(db)
        seed_nia_data(db)
        logger.info("NIA mock Ghana Card data ready")
    finally:
        db.close()

    health = _ai_service.check_ai_health()
    active = health.get("active_providers", [])
    if active:
        logger.info("AI providers ready: %s", ", ".join(active))
    else:
        logger.critical("NO AI PROVIDERS AVAILABLE — check ANTHROPIC_API_KEY and GEMINI_API_KEY")


@app.get("/", tags=["Health"])
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health", tags=["Health"])
def health_check():
    from sqlalchemy import text

    from app.core.database import SessionLocal

    db_status = "connected"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_status = "disconnected"

    db_source = "Neon (cloud)" if active_db_mode == "primary" else "Local PostgreSQL (fallback)"
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "version": settings.APP_VERSION,
        "database": db_status,
        "database_source": db_source,
        "environment": settings.ENVIRONMENT,
    }
