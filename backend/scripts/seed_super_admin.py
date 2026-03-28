"""
Run this script once to create the super admin account.

Usage:
    cd backend
    python scripts/seed_super_admin.py

The super admin credentials are:
    Username (email): superadmin@bdr.gov.gh
    Password:         GhanaBDR@2026!
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole, UserStatus

SUPER_ADMIN_EMAIL = "superadmin@bdr.gov.gh"
SUPER_ADMIN_PASSWORD = "GhanaBDR@2026!"
SUPER_ADMIN_FIRST_NAME = "System"
SUPER_ADMIN_LAST_NAME = "Administrator"


def seed_super_admin():
    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == SUPER_ADMIN_EMAIL).first()
        if existing:
            print(f"Super admin already exists: {SUPER_ADMIN_EMAIL}")
            if existing.role != UserRole.SUPER_ADMIN:
                existing.role = UserRole.SUPER_ADMIN
                existing.status = UserStatus.ACTIVE
                existing.is_active = True
                existing.is_verified = True
                existing.email_verified = True
                db.commit()
                print("Role updated to super_admin.")
            return

        super_admin = User(
            email=SUPER_ADMIN_EMAIL,
            hashed_password=hash_password(SUPER_ADMIN_PASSWORD),
            first_name=SUPER_ADMIN_FIRST_NAME,
            last_name=SUPER_ADMIN_LAST_NAME,
            role=UserRole.SUPER_ADMIN,
            status=UserStatus.ACTIVE,
            is_active=True,
            is_verified=True,
            email_verified=True,
            phone_verified=False,
            notification_email=True,
            notification_sms=False,
            notification_push=True,
        )

        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)
        print(f"Super admin created successfully.")
        print(f"  Email:    {SUPER_ADMIN_EMAIL}")
        print(f"  Password: {SUPER_ADMIN_PASSWORD}")
        print(f"  ID:       {super_admin.id}")
        print(f"  Role:     {super_admin.role}")
    except Exception as e:
        db.rollback()
        print(f"Error creating super admin: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_super_admin()
