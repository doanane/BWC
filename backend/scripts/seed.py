import sys
import os
import argparse
from sqlalchemy import text
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, create_tables, engine
from app.core.security import hash_password
from app.models.user import User, UserRole, UserStatus, StaffProfile
import logging

logger = logging.getLogger(__name__)


def seed_super_admin(db):
    existing = db.query(User).filter(User.email == "admin@birthdeathregistry.gov.gh").first()
    if existing:
        logger.info("Super admin already exists")
        return existing

    admin = User(
        email="admin@birthdeathregistry.gov.gh",
        phone_number="+233200000001",
        hashed_password=hash_password("Admin@123456"),
        first_name="System",
        last_name="Administrator",
        role=UserRole.SUPER_ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
        is_verified=True,
        email_verified=True,
        phone_verified=True
    )
    db.add(admin)
    db.flush()

    profile = StaffProfile(
        user_id=admin.id,
        staff_id="STF-000001",
        department="IT Administration",
        designation="System Administrator",
        office_location="Head Office, Accra",
        can_approve=True,
        can_reject=True,
        can_print=True,
        can_deliver=True
    )
    db.add(profile)
    db.commit()
    logger.info(f"Super admin created: {admin.email}")
    return admin


def seed_staff_users(db):
    staff_users = [
        {
            "email": "staff1@birthdeathregistry.gov.gh",
            "phone": "+233200000002",
            "first_name": "Kwame",
            "last_name": "Asante",
            "role": UserRole.STAFF,
            "staff_id": "STF-000002",
            "department": "Registration",
            "designation": "Registration Officer",
            "can_approve": True,
            "can_reject": True,
            "can_print": False,
            "can_deliver": False
        },
        {
            "email": "staff2@birthdeathregistry.gov.gh",
            "phone": "+233200000003",
            "first_name": "Ama",
            "last_name": "Mensah",
            "role": UserRole.STAFF,
            "staff_id": "STF-000003",
            "department": "Printing",
            "designation": "Printing Officer",
            "can_approve": False,
            "can_reject": False,
            "can_print": True,
            "can_deliver": False
        },
        {
            "email": "manager@birthdeathregistry.gov.gh",
            "phone": "+233200000004",
            "first_name": "Kofi",
            "last_name": "Boateng",
            "role": UserRole.ADMIN,
            "staff_id": "STF-000004",
            "department": "Management",
            "designation": "Registry Manager",
            "can_approve": True,
            "can_reject": True,
            "can_print": True,
            "can_deliver": True
        }
    ]

    for s in staff_users:
        existing = db.query(User).filter(User.email == s["email"]).first()
        if existing:
            continue

        user = User(
            email=s["email"],
            phone_number=s["phone"],
            hashed_password=hash_password("Staff@123456"),
            first_name=s["first_name"],
            last_name=s["last_name"],
            role=s["role"],
            status=UserStatus.ACTIVE,
            is_active=True,
            is_verified=True,
            email_verified=True
        )
        db.add(user)
        db.flush()

        profile = StaffProfile(
            user_id=user.id,
            staff_id=s["staff_id"],
            department=s["department"],
            designation=s["designation"],
            office_location="Head Office, Accra",
            can_approve=s["can_approve"],
            can_reject=s["can_reject"],
            can_print=s["can_print"],
            can_deliver=s["can_deliver"]
        )
        db.add(profile)

    db.commit()
    logger.info("Staff users created")


def seed_test_citizens(db):
    citizens = [
        {"email": "citizen1@test.com", "phone": "+233244000001", "first": "Abena", "last": "Owusu"},
        {"email": "citizen2@test.com", "phone": "+233244000002", "first": "Yaw", "last": "Darko"},
        {"email": "citizen3@test.com", "phone": "+233244000003", "first": "Akosua", "last": "Frimpong"},
    ]

    for c in citizens:
        existing = db.query(User).filter(User.email == c["email"]).first()
        if existing:
            continue

        user = User(
            email=c["email"],
            phone_number=c["phone"],
            hashed_password=hash_password("Citizen@123456"),
            first_name=c["first"],
            last_name=c["last"],
            role=UserRole.CITIZEN,
            status=UserStatus.ACTIVE,
            is_active=True,
            is_verified=True,
            email_verified=True,
            region="Greater Accra",
            district="Accra Metropolitan"
        )
        db.add(user)

    db.commit()
    logger.info("Test citizens created")


def main():
    parser = argparse.ArgumentParser(description="Seed default users and profiles")
    parser.add_argument(
        "--reset-db",
        action="store_true",
        help="Drop all tables and recreate schema before seeding (destructive)",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    if args.reset_db:
        logger.warning("--reset-db specified: dropping and recreating public schema before seeding")
        with engine.begin() as conn:
            conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))

    create_tables()
    db = SessionLocal()

    try:
        seed_super_admin(db)
        seed_staff_users(db)
        seed_test_citizens(db)
        logger.info("Seeding completed successfully")
        print("\nSeed Credentials:")
        print("Super Admin: admin@birthdeathregistry.gov.gh | Admin@123456")
        print("Staff: staff1@birthdeathregistry.gov.gh | Staff@123456")
        print("Staff: staff2@birthdeathregistry.gov.gh | Staff@123456")
        print("Admin: manager@birthdeathregistry.gov.gh | Staff@123456")
        print("Citizen: citizen1@test.com | Citizen@123456")
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
