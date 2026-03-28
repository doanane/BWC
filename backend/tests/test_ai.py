from app.api import ai


def test_form_fill_from_observation_accepts_text_notes(client, monkeypatch):
    captured = {}

    def fake_extract(description, observation_text=""):
        captured["description"] = description
        captured["observation_text"] = observation_text
        return {"deceased_first_name": "Kwame"}, ["gemini"]

    monkeypatch.setattr(ai.ai_service, "extract_death_form_with_meta", fake_extract)

    response = client.post(
        "/api/ai/form-fill-from-observation",
        data={"form_type": "death", "description": "use notes context"},
        files={
            "observation_file": (
                "observation.txt",
                b"Name: Kwame Boateng\nDate of death: 2026-03-01\nCause: natural",
                "text/plain",
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["fields"]["deceased_first_name"] == "Kwame"
    assert captured["description"] == "use notes context"
    assert "Kwame Boateng" in captured["observation_text"]


def test_form_fill_from_observation_accepts_poster_image(client, monkeypatch):
    captured = {}

    def fake_image_extract_with_meta(image_bytes, mime_type="image/jpeg"):
        captured["mime_type"] = mime_type
        captured["bytes_len"] = len(image_bytes)
        return (
            "Name: Ama Serwaa\nDate of death: 2026-03-10\nCause: accident",
            {"errors": {"gemini": "", "anthropic": ""}, "providers_used": ["gemini"]},
        )

    def fake_extract(description, observation_text=""):
        captured["description"] = description
        captured["observation_text"] = observation_text
        return {"deceased_first_name": "Ama"}, ["anthropic"]

    monkeypatch.setattr(
        ai.ai_service,
        "extract_observation_text_from_image_with_meta",
        fake_image_extract_with_meta,
    )
    monkeypatch.setattr(ai.ai_service, "extract_death_form_with_meta", fake_extract)

    response = client.post(
        "/api/ai/form-fill-from-observation",
        data={"form_type": "death", "description": ""},
        files={
            "observation_file": (
                "poster.heic",
                b"\xff\xd8\xffposter-bytes",
                "image/heic",
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["fields"]["deceased_first_name"] == "Ama"
    assert captured["mime_type"] == "image/heic"
    assert captured["bytes_len"] > 0
    assert "Ama Serwaa" in captured["observation_text"]
    assert captured["description"] == "Extract registration details from this observation report."


def test_form_fill_from_observation_rejects_unsupported_file_type(client):
    response = client.post(
        "/api/ai/form-fill-from-observation",
        data={"form_type": "death"},
        files={"observation_file": ("observation.csv", b"a,b\n1,2", "text/csv")},
    )

    assert response.status_code == 415
    assert "Unsupported observation file type" in response.json()["detail"]


def test_form_fill_from_observation_returns_error_when_image_text_not_readable(client, monkeypatch):
    monkeypatch.setattr(
        ai.ai_service,
        "extract_observation_text_from_image_with_meta",
        lambda *_args, **_kwargs: (
            "",
            {"errors": {"gemini": "gemini_empty_response", "anthropic": "anthropic_empty_response"}},
        ),
    )

    response = client.post(
        "/api/ai/form-fill-from-observation",
        data={"form_type": "death"},
        files={"observation_file": ("poster.png", b"\x89PNG\r\n", "image/png")},
    )

    assert response.status_code == 422
    assert "could not read text" in response.json()["detail"].lower()


def test_form_fill_from_observation_returns_503_when_ai_providers_unavailable(client, monkeypatch):
    monkeypatch.setattr(
        ai.ai_service,
        "extract_observation_text_from_image_with_meta",
        lambda *_args, **_kwargs: (
            "",
            {
                "errors": {
                    "gemini": "gemini_model_unavailable:gemini-1.5-flash",
                    "anthropic": "anthropic_low_credit",
                }
            },
        ),
    )

    response = client.post(
        "/api/ai/form-fill-from-observation",
        data={"form_type": "death"},
        files={"observation_file": ("poster.png", b"\x89PNG\r\n", "image/png")},
    )

    assert response.status_code == 503
    assert "currently unavailable" in response.json()["detail"].lower()
