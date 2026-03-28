"""
Seed realistic demo data: citizens + birth/death applications.

Usage:
    cd backend
    python scripts/seed_demo.py
"""
import sys, os, random
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole, UserStatus, AccountType, KycStatus
from app.models.application import Application, ApplicationStatus, ServicePlan, Gender, DeliveryMethod

REGIONS = [
    "Greater Accra", "Ashanti", "Central", "Western", "Eastern",
    "Northern", "Volta", "Brong-Ahafo", "Upper East", "Upper West",
]
DISTRICTS = {
    "Greater Accra": ["Accra Metropolitan", "Tema Municipal", "Ga West", "Ga East"],
    "Ashanti": ["Kumasi Metropolitan", "Oforikrom", "Asokwa", "Suame"],
    "Central": ["Cape Coast Metropolitan", "Mfantsiman", "Komenda-Edina"],
    "Western": ["Sekondi-Takoradi Metropolitan", "Ahanta West", "Nzema East"],
    "Eastern": ["Koforidua Municipal", "Birim Central", "Fanteakwa"],
    "Northern": ["Tamale Metropolitan", "Sagnarigu", "Savelugu"],
    "Volta": ["Ho Municipal", "Keta", "Kpando"],
    "Brong-Ahafo": ["Sunyani Municipal", "Techiman", "Berekum"],
    "Upper East": ["Bolgatanga Municipal", "Bawku West", "Kassena-Nankana"],
    "Upper West": ["Wa Municipal", "Jirapa", "Lawra"],
}
FIRST_NAMES = ["Kwame", "Ama", "Kofi", "Akosua", "Yaw", "Adwoa", "Kweku", "Abena",
               "Fiifi", "Efua", "Kojo", "Araba", "Kwesi", "Abenaa", "Kwabena",
               "Isaac", "Grace", "Emmanuel", "Esther", "Daniel", "Priscilla", "Samuel"]
LAST_NAMES = ["Mensah", "Asante", "Boateng", "Owusu", "Acheampong", "Darko",
              "Amponsah", "Amoah", "Appiah", "Ofori", "Antwi", "Asare",
              "Bonsu", "Frimpong", "Kyei", "Osei", "Kwarteng", "Agyemang"]
HOSPITALS = [
    "Korle-Bu Teaching Hospital", "37 Military Hospital", "Komfo Anokye Teaching Hospital",
    "Cape Coast Teaching Hospital", "Tamale Teaching Hospital", "Ridge Hospital",
    "University of Ghana Hospital", "Accra Specialist Hospital",
]
STATUSES_WEIGHTED = (
    [ApplicationStatus.SUBMITTED] * 8 +
    [ApplicationStatus.UNDER_REVIEW] * 5 +
    [ApplicationStatus.APPROVED] * 10 +
    [ApplicationStatus.REJECTED] * 2 +
    [ApplicationStatus.PAYMENT_PENDING] * 4 +
    [ApplicationStatus.PROCESSING] * 3 +
    [ApplicationStatus.READY] * 3 +
    [ApplicationStatus.COLLECTED] * 5
)


def rand_date(start_days_ago: int, end_days_ago: int = 0) -> date:
    delta = random.randint(end_days_ago, start_days_ago)
    return (datetime.now(timezone.utc) - timedelta(days=delta)).date()


def rand_phone() -> str:
    prefixes = ["024", "054", "055", "059", "020", "050", "026", "056"]
    return random.choice(prefixes) + "".join([str(random.randint(0, 9)) for _ in range(7)])


def seed(db: Session):
    existing_citizens = db.query(User).filter(User.role == UserRole.CITIZEN).count()
    if existing_citizens >= 20:
        print(f"Already have {existing_citizens} citizens — skipping user seeding.")
    else:
        print("Creating 30 citizen accounts...")
        citizens = []
        for i in range(30):
            fn = random.choice(FIRST_NAMES)
            ln = random.choice(LAST_NAMES)
            email = f"{fn.lower()}.{ln.lower()}{i}@gmail.com"
            if db.query(User).filter(User.email == email).first():
                continue
            status = random.choice([UserStatus.ACTIVE] * 8 + [UserStatus.PENDING_VERIFICATION] * 2)
            u = User(
                email=email,
                hashed_password=hash_password("Demo@1234"),
                first_name=fn,
                last_name=ln,
                role=UserRole.CITIZEN,
                status=status,
                account_type=AccountType.CITIZEN,
                kyc_status=random.choice([KycStatus.VERIFIED, KycStatus.NOT_STARTED, KycStatus.PENDING]),
                phone_number=rand_phone(),
                region=random.choice(REGIONS),
                is_active=True,
                is_verified=status == UserStatus.ACTIVE,
                email_verified=status == UserStatus.ACTIVE,
            )
            db.add(u)
            citizens.append(u)
        db.commit()
        for c in citizens:
            db.refresh(c)
        print(f"  Created {len(citizens)} citizens")

    all_citizens = db.query(User).filter(User.role == UserRole.CITIZEN).all()
    existing_apps = db.query(Application).count()
    if existing_apps >= 20:
        print(f"Already have {existing_apps} applications — skipping.")
        return

    print("Creating 60 applications...")
    apps_created = 0
    for _ in range(60):
        citizen = random.choice(all_citizens)
        region = random.choice(REGIONS)
        districts = DISTRICTS.get(region, ["Central District"])
        district = random.choice(districts)
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        dob = rand_date(3650, 1)
        service_plan = random.choice([ServicePlan.NORMAL, ServicePlan.NORMAL, ServicePlan.EXPRESS])
        delivery_method = random.choice([DeliveryMethod.PICKUP, DeliveryMethod.PICKUP, DeliveryMethod.DELIVERY])
        processing_fee = 150.0 if service_plan == ServicePlan.EXPRESS else 50.0
        delivery_fee = 30.0 if delivery_method == DeliveryMethod.DELIVERY else 0.0
        total_fee = processing_fee + delivery_fee
        app_status = random.choice(STATUSES_WEIGHTED)
        created_days_ago = random.randint(1, 180)
        created_at = datetime.now(timezone.utc) - timedelta(days=created_days_ago)
        submitted_at = created_at + timedelta(hours=random.randint(1, 48)) if app_status != ApplicationStatus.SUBMITTED else None
        app_type = random.choice(["BIRTH", "BIRTH", "DEATH"])

        import string
        suffix = "".join(random.choices(string.digits, k=6))
        app_num = f"BDR-{created_at.strftime('%Y%m%d')}-{suffix}"
        if db.query(Application).filter(Application.application_number == app_num).first():
            continue

        a = Application(
            application_number=app_num,
            applicant_id=citizen.id,
            status=app_status,
            service_plan=service_plan,
            delivery_method=delivery_method,
            child_first_name=fn,
            child_last_name=ln,
            child_date_of_birth=dob,
            child_gender=random.choice([Gender.MALE, Gender.FEMALE]),
            child_place_of_birth=random.choice(HOSPITALS),
            child_region_of_birth=region,
            child_district_of_birth=district,
            child_nationality="Ghanaian",
            father_first_name=random.choice(FIRST_NAMES),
            father_last_name=ln,
            father_phone=rand_phone(),
            mother_first_name=random.choice(FIRST_NAMES),
            mother_last_name=random.choice(LAST_NAMES),
            mother_phone=rand_phone(),
            hospital_name=random.choice(HOSPITALS),
            processing_fee=processing_fee,
            delivery_fee=delivery_fee,
            total_fee=total_fee,
            submitted_at=submitted_at,
            created_at=created_at,
            extra_data={"application_type": app_type},
        )
        db.add(a)
        apps_created += 1

    db.commit()
    print(f"  Created {apps_created} applications")
    print("Done! Seed complete.")


if __name__ == "__main__":
    db: Session = SessionLocal()
    try:
        seed(db)
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()
