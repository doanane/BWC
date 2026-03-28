import pytest
from datetime import date
from unittest.mock import patch
from app.models.application import Application, ApplicationStatus, ServicePlan, DeliveryMethod, Gender
from app.models.user import UserRole, UserStatus
from app.core.security import hash_password
from app.models.user import User


BIRTH_PAYLOAD = {
    "child_first_name": "Kwame",
    "child_last_name": "Asante",
    "child_date_of_birth": "2023-06-10",
    "child_gender": "male",
    "child_place_of_birth": "Ridge Hospital",
    "child_region_of_birth": "Greater Accra",
    "child_district_of_birth": "Accra Metropolitan",
    "child_nationality": "Ghanaian",
    "mother_first_name": "Akua",
    "mother_last_name": "Asante",
    "service_plan": "normal",
    "delivery_method": "PICKUP",
}


def _admin_token(client, db):
    admin = User(
        email="admin@test.com",
        phone_number="+233244000099",
        hashed_password=hash_password("Admin@12345"),
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
        email_verified=True,
    )
    db.add(admin)
    db.commit()
    resp = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "Admin@12345"})
    return resp.json()["access_token"]


class TestApplicationCreate:
    def test_create_birth_application_requires_auth(self, client):
        resp = client.post("/api/applications/", json=BIRTH_PAYLOAD)
        assert resp.status_code == 401

    def test_create_birth_application_success(self, client, citizen_token):
        resp = client.post(
            "/api/applications/",
            json=BIRTH_PAYLOAD,
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert "application_number" in data
        assert data["child_first_name"] == "Kwame"
        assert data["status"] == "DRAFT"

    def test_list_my_applications(self, client, citizen_token):
        client.post(
            "/api/applications/",
            json=BIRTH_PAYLOAD,
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        resp = client.get(
            "/api/applications/my",
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert resp.status_code == 200

    def test_staff_cannot_create_application(self, client, staff_token):
        resp = client.post(
            "/api/applications/",
            json=BIRTH_PAYLOAD,
            headers={"Authorization": f"Bearer {staff_token}"},
        )
        assert resp.status_code in (403, 404)


class TestApplicationStatusUpdate:
    def test_staff_can_update_status(self, client, db, citizen_token, staff_token):
        create = client.post(
            "/api/applications/",
            json=BIRTH_PAYLOAD,
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert create.status_code in (200, 201)
        app_id = create.json()["id"]

        submit = client.post(
            f"/api/applications/{app_id}/submit",
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert submit.status_code in (200, 201)

        with patch("app.utils.email.send_email_notification", return_value=True), \
             patch("app.utils.sms.send_sms_notification", return_value=True):
            resp = client.post(
                f"/api/applications/{app_id}/status",
                json={"status": "UNDER_REVIEW", "reason": "Documents verified"},
                headers={"Authorization": f"Bearer {staff_token}"},
            )
        assert resp.status_code == 200
        assert resp.json()["status"] == "UNDER_REVIEW"

    def test_citizen_cannot_update_status(self, client, citizen_token):
        create = client.post(
            "/api/applications/",
            json=BIRTH_PAYLOAD,
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        app_id = create.json()["id"]
        resp = client.post(
            f"/api/applications/{app_id}/status",
            json={"status": "APPROVED"},
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert resp.status_code in (403, 422)

    def test_status_update_sends_notification(self, client, db, citizen_token, staff_token):
        create = client.post(
            "/api/applications/",
            json=BIRTH_PAYLOAD,
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        app_id = create.json()["id"]
        client.post(
            f"/api/applications/{app_id}/submit",
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        with patch("app.utils.email.send_email_notification", return_value=True), \
             patch("app.utils.sms.send_sms_notification", return_value=True):
            resp = client.post(
                f"/api/applications/{app_id}/status",
                json={"status": "APPROVED", "reason": "All documents valid"},
                headers={"Authorization": f"Bearer {staff_token}"},
            )
        assert resp.status_code == 200
        from app.models.notification import Notification, NotificationChannel
        notifs = db.query(Notification).filter(
            Notification.application_id == app_id,
            Notification.channel == NotificationChannel.IN_APP,
        ).all()
        assert len(notifs) >= 1


class TestApplicationHistory:
    def test_get_history_after_status_change(self, client, db, citizen_token, staff_token):
        create = client.post(
            "/api/applications/",
            json=BIRTH_PAYLOAD,
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        app_id = create.json()["id"]
        client.post(
            f"/api/applications/{app_id}/submit",
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        with patch("app.utils.email.send_email_notification", return_value=True), \
             patch("app.utils.sms.send_sms_notification", return_value=True):
            client.post(
                f"/api/applications/{app_id}/status",
                json={"status": "UNDER_REVIEW"},
                headers={"Authorization": f"Bearer {staff_token}"},
            )
        resp = client.get(
            f"/api/applications/{app_id}/history",
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert resp.status_code == 200
        history = resp.json()
        assert isinstance(history, list)
        assert len(history) >= 1

    def test_cannot_view_other_users_application(self, client, db, citizen_token):
        other = User(
            email="other@test.com",
            phone_number="+233244000088",
            hashed_password=hash_password("Test@12345"),
            first_name="Other",
            last_name="User",
            role=UserRole.CITIZEN,
            status=UserStatus.ACTIVE,
            is_active=True,
            email_verified=True,
        )
        db.add(other)
        db.commit()
        other_login = client.post("/api/auth/login", json={"email": "other@test.com", "password": "Test@12345"})
        other_token = other_login.json()["access_token"]

        create = client.post(
            "/api/applications/",
            json=BIRTH_PAYLOAD,
            headers={"Authorization": f"Bearer {other_token}"},
        )
        app_id = create.json()["id"]

        resp = client.get(
            f"/api/applications/{app_id}",
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert resp.status_code in (403, 404)


class TestApplicationTracking:
    def test_track_by_reference(self, client, citizen_token):
        create = client.post(
            "/api/applications/",
            json=BIRTH_PAYLOAD,
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        ref = create.json()["application_number"]
        resp = client.get(f"/api/applications/track/{ref}")
        assert resp.status_code == 200
        assert resp.json()["application_number"] == ref

    def test_track_invalid_reference_returns_404(self, client):
        resp = client.get("/api/applications/track/BDR-INVALID-9999")
        assert resp.status_code == 404
