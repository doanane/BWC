import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from main import app
from app.core.security import hash_password
from app.models.user import User, UserRole, UserStatus

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_citizen(db):
    user = User(
        email="citizen@test.com",
        phone_number="+233244000001",
        hashed_password=hash_password("Test@12345"),
        first_name="Test",
        last_name="Citizen",
        role=UserRole.CITIZEN,
        status=UserStatus.ACTIVE,
        is_active=True,
        email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_staff(db):
    user = User(
        email="staff@test.com",
        phone_number="+233244000002",
        hashed_password=hash_password("Test@12345"),
        first_name="Test",
        last_name="Staff",
        role=UserRole.STAFF,
        status=UserStatus.ACTIVE,
        is_active=True,
        email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def citizen_token(client, test_citizen):
    response = client.post("/api/auth/login", json={
        "email": "citizen@test.com",
        "password": "Test@12345"
    })
    return response.json()["access_token"]


@pytest.fixture
def staff_token(client, test_staff):
    response = client.post("/api/auth/login", json={
        "email": "staff@test.com",
        "password": "Test@12345"
    })
    return response.json()["access_token"]
