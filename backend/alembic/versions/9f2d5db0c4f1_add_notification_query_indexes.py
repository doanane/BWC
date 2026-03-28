"""add_notification_query_indexes

Revision ID: 9f2d5db0c4f1
Revises: 4733c7cc85eb
Create Date: 2026-03-19 21:55:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "9f2d5db0c4f1"
down_revision: Union[str, None] = "4733c7cc85eb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_notifications_user_channel_created_at "
        "ON notifications (user_id, channel, created_at)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_notifications_user_channel_status "
        "ON notifications (user_id, channel, status)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_notifications_user_channel_status")
    op.execute("DROP INDEX IF EXISTS ix_notifications_user_channel_created_at")
