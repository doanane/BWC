from app.core.security import hash_password
from app.models.user import AccountType, User, UserRole, UserStatus


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _mock_upload(*args, **kwargs):
    filename = kwargs.get("filename") or "file"
    return {"url": f"https://example.com/{filename}"}


def test_submit_kyc_documents_rejects_wrong_ghana_card(client, db, test_citizen, citizen_token):
    test_citizen.ghana_card_number = "GHA7177302546"
    db.commit()

    response = client.post(
        "/api/kyc/submit-documents",
        headers=_auth_header(citizen_token),
        data={"ghana_card_number": "GHA-000000000-0"},
        files={
            "front": ("front.jpg", b"front-bytes", "image/jpeg"),
            "back": ("back.jpg", b"back-bytes", "image/jpeg"),
        },
    )

    assert response.status_code == 400
    assert "not the ghana card we are expecting" in response.json()["detail"].lower()


def test_submit_kyc_documents_success_with_matched_ghana_card(client, db, test_citizen, citizen_token, monkeypatch):
    test_citizen.ghana_card_number = "GHA7177302546"
    db.commit()

    monkeypatch.setattr("app.api.kyc.upload_bytes_to_cloudinary", _mock_upload)

    response = client.post(
        "/api/kyc/submit-documents",
        headers=_auth_header(citizen_token),
        data={"ghana_card_number": "GHA-717730254-6"},
        files={
            "front": ("front.jpg", b"front-bytes", "image/jpeg"),
            "back": ("back.jpg", b"back-bytes", "image/jpeg"),
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "submitted" in data["message"].lower()
    assert data["kyc_status"] in ("pending", "PENDING")
    assert data["kyc_document_front"].startswith("https://example.com/")
    assert data["kyc_document_back"].startswith("https://example.com/")


def test_submit_kyc_documents_rejects_non_citizen_account(client, db):
    user = User(
        email="resident@test.com",
        phone_number="+233244001234",
        hashed_password=hash_password("Test@12345"),
        first_name="Res",
        last_name="Ident",
        role=UserRole.CITIZEN,
        status=UserStatus.ACTIVE,
        account_type=AccountType.RESIDENT,
        ghana_card_number="GHA7177302546",
        is_active=True,
        email_verified=True,
    )
    db.add(user)
    db.commit()

    login_resp = client.post("/api/auth/login", json={"email": "resident@test.com", "password": "Test@12345"})
    token = login_resp.json()["access_token"]

    response = client.post(
        "/api/kyc/submit-documents",
        headers=_auth_header(token),
        data={"ghana_card_number": "GHA-717730254-6"},
        files={
            "front": ("front.jpg", b"front-bytes", "image/jpeg"),
            "back": ("back.jpg", b"back-bytes", "image/jpeg"),
        },
    )

    assert response.status_code == 400
    assert "citizen ghana card verification" in response.json()["detail"].lower()
