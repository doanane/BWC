from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false"))
        conn.commit()
        print("Index created")
    except Exception as e:
        print(f"Index skipped: {e}")
