"""add_kyc_and_account_type_to_users

Revision ID: e3f1a8b2c9d7
Revises: d2605220294d
Create Date: 2026-03-09 00:00:00.000000

SQLAlchemy serializes str,enum.Enum members using their .name (uppercase)
to the PostgreSQL native enum type, so all label values here must be
uppercase to match what SQLAlchemy sends in INSERT/UPDATE statements.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'e3f1a8b2c9d7'
down_revision: Union[str, None] = 'd2605220294d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    conn.execute(sa.text("DROP TYPE IF EXISTS accounttype CASCADE"))
    conn.execute(sa.text("DROP TYPE IF EXISTS kycstatus CASCADE"))

    conn.execute(sa.text(
        "CREATE TYPE accounttype AS ENUM ('CITIZEN','RESIDENT','REFUGEE','DIPLOMAT','FOREIGNER')"
    ))
    conn.execute(sa.text(
        "CREATE TYPE kycstatus AS ENUM ('NOT_STARTED','PENDING','VERIFIED','REJECTED')"
    ))

    op.alter_column('users', 'phone_number',
                    existing_type=sa.String(20), type_=sa.String(30))

    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type accounttype NOT NULL DEFAULT 'CITIZEN'"
    ))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status kycstatus NOT NULL DEFAULT 'NOT_STARTED'"
    ))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS metamap_verification_id VARCHAR(100)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(100)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS permit_number VARCHAR(50)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS permit_type VARCHAR(50)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS unhcr_number VARCHAR(50)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS diplomatic_id VARCHAR(50)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS embassy_mission VARCHAR(200)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS visa_type VARCHAR(50)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(20)"
    ))


def downgrade() -> None:
    conn = op.get_bind()
    for col in ['date_of_birth', 'visa_type', 'embassy_mission', 'diplomatic_id',
                'unhcr_number', 'permit_type', 'permit_number', 'passport_number',
                'nationality', 'metamap_verification_id', 'kyc_status', 'account_type']:
        conn.execute(sa.text(f"ALTER TABLE users DROP COLUMN IF EXISTS {col}"))

    op.alter_column('users', 'phone_number',
                    existing_type=sa.String(30), type_=sa.String(20))

    conn.execute(sa.text("DROP TYPE IF EXISTS kycstatus"))
    conn.execute(sa.text("DROP TYPE IF EXISTS accounttype"))
