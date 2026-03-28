import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_token, generate_certificate_number
from app.models.user import AccountType, User, UserRole, UserStatus


def test_password_hashing():
    password = "TestPassword@123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrong_password", hashed)


def test_access_token_creation():
    data = {"sub": "1", "role": "citizen"}
    token = create_access_token(data)
    assert token is not None
    decoded = decode_token(token)
    assert decoded["sub"] == "1"
    assert decoded["role"] == "citizen"
    assert decoded["type"] == "access"


def test_certificate_number_format():
    cert_num = generate_certificate_number()
    assert cert_num.startswith("CERT-")
    parts = cert_num.split("-")
    assert len(parts) == 3
    assert len(parts[1]) == 8
    assert len(parts[2]) == 5


def test_register_user(client):
    response = client.post("/api/auth/register", json={
        "email": "newuser@test.com",
        "phone_number": "+233244999000",
        "password": "TestPass@123",
        "confirm_password": "TestPass@123",
        "first_name": "John",
        "last_name": "Doe"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["first_name"] == "John"
    assert "hashed_password" not in data


def test_register_duplicate_email(client, test_citizen):
    response = client.post("/api/auth/register", json={
        "email": "citizen@test.com",
        "phone_number": "+233244000099",
        "password": "TestPass@123",
        "confirm_password": "TestPass@123",
        "first_name": "Another",
        "last_name": "User"
    })
    assert response.status_code == 400


def test_register_duplicate_ghana_card(client, db):
    existing = User(
        email="hascard@test.com",
        phone_number="+233244555111",
        hashed_password=hash_password("TestPass@123"),
        first_name="Has",
        last_name="Card",
        role=UserRole.CITIZEN,
        status=UserStatus.ACTIVE,
        account_type=AccountType.CITIZEN,
        ghana_card_number="GHA7177302546",
        is_active=True,
        email_verified=True,
    )
    db.add(existing)
    db.commit()

    response = client.post("/api/auth/register", json={
        "email": "newcard@test.com",
        "phone_number": "+233244999000",
        "password": "TestPass@123",
        "confirm_password": "TestPass@123",
        "first_name": "John",
        "last_name": "Doe",
        "ghana_card_number": "GHA-717730254-6",
        "account_type": "citizen",
    })
    assert response.status_code == 400
    assert "ghana card number already registered" in response.json()["detail"].lower()


def test_login_success(client, test_citizen):
    response = client.post("/api/auth/login", json={
        "email": "citizen@test.com",
        "password": "Test@12345"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, test_citizen):
    response = client.post("/api/auth/login", json={
        "email": "citizen@test.com",
        "password": "wrong_password"
    })
    assert response.status_code == 401


def test_login_unregistered_email(client):
    response = client.post("/api/auth/login", json={
        "email": "unknown@test.com",
        "password": "Test@12345"
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "This email is not yet registered."


def test_forgot_password_unregistered_email(client):
    response = client.post("/api/auth/forgot-password", json={
        "email": "unknown@test.com",
    })
    assert response.status_code == 404
    assert response.json()["detail"] == "This email is not yet registered."


def test_get_current_user(client, citizen_token):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {citizen_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "citizen@test.com"
