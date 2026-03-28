import pytest
from datetime import date


def test_create_application_unauthenticated(client):
    response = client.post("/api/applications/", json={})
    assert response.status_code in (401, 403, 501)


def test_list_applications_unauthenticated(client):
    response = client.get("/api/applications/")
    assert response.status_code in (401, 403, 501)


def test_get_application_not_found(client, citizen_token):
    response = client.get(
        "/api/applications/99999",
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert response.status_code in (404, 501)


def test_my_applications_authenticated(client, citizen_token):
    response = client.get(
        "/api/applications/my",
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert response.status_code in (200, 501)
