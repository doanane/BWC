import base64
import json
import logging
from urllib.parse import quote

import httpx

try:
    import anthropic
except ModuleNotFoundError:  # pragma: no cover - environment dependent
    anthropic = None

from app.core.config import settings

logger = logging.getLogger(__name__)

CLAUDE_FAST = "claude-haiku-4-5-20251001"
GEMINI_DEFAULT_MODEL = "gemini-2.0-flash"
GEMINI_FALLBACK_MODELS = (
    "gemini-flash-lite-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
)
POWERED_BY_LABEL = "Gemini + Anthropic"

CHAT_SYSTEM = """You are a helpful assistant for the Ghana Births and Deaths Registry (GBD Registry).
You help Ghanaian citizens with:
- Birth registration: requirements, documents, fees, process, timelines
- Death registration: requirements, burial permits, cause categories
- Certificate applications and extracts (true copies)
- Application tracking and status updates
- Payment information (Normal plan: GHS 50, Express plan: GHS 150)
- Required documents (Ghana Card, birth notification, etc.)
- Office locations across all 16 regions of Ghana
- Account and portal support
- Adoptions, record corrections, verifications, and statistics

Important facts:
- Free birth registration within 12 months of birth. Express: 7 days. Normal: 30 days.
- Late registration penalty: GHS 5 per day after 7-day grace period.
- Ghana has 16 regions and 260+ district BDR offices.
- Ghana Card format: GHA-XXXXXXXXX-X
- Required for birth registration: hospital birth notification, parent Ghana Card, parent details.
- Required for death registration: informant details, cause/date/place of death.

If a question is completely unrelated to BDR services, politely decline and redirect.
Always respond in the same language the user is using or has selected.
Be warm, clear, helpful, and concise.

CRITICAL FORMATTING RULE: Write in plain prose only. Never use markdown symbols of any kind — no asterisks, no hyphens for bullet points, no hash signs for headings, no double asterisks for bold, no underscores. Write complete sentences in flowing paragraphs. If you need to list items, write them as numbered sentences within a paragraph (e.g. "First... Second... Third...")."""


def _client():
    if not settings.ANTHROPIC_API_KEY:
        return None
    if anthropic is None:
        logger.warning("Anthropic SDK is not installed; Anthropic provider disabled")
        return None
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def _is_anthropic_low_credit_error(exc: Exception) -> bool:
    return "credit balance is too low" in str(exc).lower()


def _gemini_models() -> list[str]:
    configured = (settings.GEMINI_MODEL or "").strip() or GEMINI_DEFAULT_MODEL
    models = [configured]
    for fallback in GEMINI_FALLBACK_MODELS:
        if fallback not in models:
            models.append(fallback)
    return models


def _gemini_url(model: str) -> str:
    encoded_model = quote(model, safe="")
    return f"https://generativelanguage.googleapis.com/v1beta/models/{encoded_model}:generateContent"


def _gemini_extract_text(payload: dict) -> str:
    candidates = payload.get("candidates") or []
    for candidate in candidates:
        content = candidate.get("content") or {}
        for part in content.get("parts") or []:
            text = part.get("text")
            if text and text.strip():
                return text.strip()
    return ""


def _gemini_generate_with_status(payload: dict) -> tuple[str, str]:
    if not settings.GEMINI_API_KEY:
        return "", "gemini_api_key_missing"

    last_error = ""

    with httpx.Client(timeout=25.0) as client:
        for model in _gemini_models():
            try:
                resp = client.post(
                    _gemini_url(model),
                    json=payload,
                    headers={"x-goog-api-key": settings.GEMINI_API_KEY},
                )

                if resp.status_code in (400, 404):
                    last_error = f"gemini_model_unavailable:{model}"
                    logger.warning(
                        "Gemini model unavailable (status=%s, model=%s)",
                        resp.status_code,
                        model,
                    )
                    continue

                resp.raise_for_status()
                data = resp.json()
                text = _gemini_extract_text(data)
                if text:
                    return text, ""

                last_error = f"gemini_empty_response:{model}"
                logger.warning("Gemini returned empty text (model=%s)", model)
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code if exc.response is not None else "unknown"
                last_error = f"gemini_http_error:{status_code}:{model}"
                logger.warning("Gemini HTTP error (status=%s, model=%s)", status_code, model)
            except Exception as exc:
                last_error = f"gemini_request_error:{model}"
                logger.exception("Gemini request error (model=%s): %s", model, exc)

    return "", (last_error or "gemini_unknown_error")


def _gemini_generate(payload: dict) -> str:
    text, _ = _gemini_generate_with_status(payload)
    return text


def _strip_json(text: str) -> str:
    text = (text or "").strip()
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]
    return text.strip()


def _safe_json_loads(text: str) -> dict:
    if not text:
        return {}
    try:
        return json.loads(_strip_json(text))
    except Exception:
        return {}


def _normalize_field_value(value):
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned or cleaned.lower() == "null":
            return None
        return cleaned
    return value


def _merge_fields(primary: dict, secondary: dict) -> dict:
    merged = {}
    keys = set(primary.keys()) | set(secondary.keys())

    for key in keys:
        left = _normalize_field_value(primary.get(key))
        right = _normalize_field_value(secondary.get(key))

        if left is None and right is None:
            merged[key] = None
            continue
        if left is None:
            merged[key] = right
            continue
        if right is None:
            merged[key] = left
            continue

        if isinstance(left, str) and isinstance(right, str) and left != right:
            merged[key] = left if len(left) >= len(right) else right
        else:
            merged[key] = left

    return merged


def _history_to_claude(history):
    messages = []
    for item in (history or [])[-10:]:
        role = item.get("role", "user") if isinstance(item, dict) else getattr(item, "role", "user")
        text = item.get("text", "") if isinstance(item, dict) else getattr(item, "text", "")
        if not text or not text.strip():
            continue
        api_role = "assistant" if role == "bot" else "user"
        messages.append({"role": api_role, "content": text})
    return messages


def _history_to_gemini(history):
    messages = []
    for item in (history or [])[-10:]:
        role = item.get("role", "user") if isinstance(item, dict) else getattr(item, "role", "user")
        text = item.get("text", "") if isinstance(item, dict) else getattr(item, "text", "")
        if not text or not text.strip():
            continue
        api_role = "model" if role == "bot" else "user"
        messages.append({"role": api_role, "parts": [{"text": text}]})
    return messages


def _chat_claude(message: str, history=None, language: str = "English") -> str:
    cl = _client()
    if not cl:
        return ""

    system = CHAT_SYSTEM
    if language and language.lower() not in ("english", "en"):
        system += f"\n\nThe user has selected {language}. Respond entirely in {language}."

    messages = _history_to_claude(history)
    messages.append({"role": "user", "content": message})

    try:
        resp = cl.messages.create(
            model=CLAUDE_FAST,
            max_tokens=700,
            system=system,
            messages=messages,
        )
        return (resp.content[0].text or "").strip()
    except Exception as exc:
        if _is_anthropic_low_credit_error(exc):
            logger.warning("Anthropic chat unavailable: low credit")
            return ""
        logger.exception("Claude chat error: %s", exc)
        return ""


def _chat_gemini(message: str, history=None, language: str = "English") -> str:
    if not settings.GEMINI_API_KEY:
        return ""

    system = CHAT_SYSTEM
    if language and language.lower() not in ("english", "en"):
        system += f"\n\nThe user has selected {language}. Respond entirely in {language}."

    contents = _history_to_gemini(history)
    contents.append({"role": "user", "parts": [{"text": message}]})

    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 700,
        },
    }
    return _gemini_generate(payload)


def chat(message: str, history=None, language: str = "English") -> tuple[str, bool]:
    claude_answer = _chat_claude(message, history=history, language=language)
    if claude_answer:
        logger.info("[AI:chat] Provider=Claude SUCCESS")
        return claude_answer, False

    logger.warning("[AI:chat] Claude FAILED — falling back to Gemini")
    gemini_answer = _chat_gemini(message, history=history, language=language)
    if gemini_answer:
        logger.info("[AI:chat] Provider=Gemini SUCCESS (Claude fallback)")
        return gemini_answer, False

    logger.error("[AI:chat] ALL PROVIDERS FAILED")
    return _fallback(message), False


def _build_birth_prompt(description: str, observation_text: str = "") -> str:
    observation_block = ""
    if observation_text.strip():
        observation_block = (
            "\n\nAdditional observation notes:\n"
            f"{observation_text.strip()}\n"
        )

    return (
        "Extract birth registration details from the text below and return ONLY a JSON object."
        "\n\nPrimary description:\n"
        f"{description}\n"
        f"{observation_block}\n"
        "Return JSON with these exact keys (use null if not mentioned):\n"
        '{"child_first_name":null,"child_last_name":null,"child_other_names":null,'
        '"child_date_of_birth":null,"child_gender":null,"child_place_of_birth":null,'
        '"child_region_of_birth":null,"child_district_of_birth":null,'
        '"mother_first_name":null,"mother_last_name":null,"mother_other_names":null,'
        '"mother_nationality":null,"mother_phone":null,'
        '"father_first_name":null,"father_last_name":null,"father_nationality":null,'
        '"father_phone":null,"hospital_name":null,"attending_physician":null}\n\n'
        "Rules:\n"
        "- child_date_of_birth format: YYYY-MM-DD\n"
        "- child_gender: male or female\n"
        "- Return ONLY the JSON, no markdown, no explanation."
    )


def _build_death_prompt(description: str, observation_text: str = "") -> str:
    observation_block = ""
    if observation_text.strip():
        observation_block = (
            "\n\nOne-week observation notes (if provided):\n"
            f"{observation_text.strip()}\n"
        )

    return (
        "Extract death registration details from the text below and return ONLY a JSON object."
        "\n\nPrimary description:\n"
        f"{description}\n"
        f"{observation_block}\n"
        "Return JSON with these exact keys (use null if not mentioned):\n"
        '{"deceased_first_name":null,"deceased_last_name":null,"deceased_other_names":null,'
        '"date_of_death":null,"deceased_dob":null,"gender":null,"place_of_death":null,'
        '"cause_of_death":null,"death_type":null,"nationality":null,"occupation":null,'
        '"informant_name":null,"informant_relation":null,"informant_phone":null}\n\n'
        "Rules:\n"
        "- date_of_death and deceased_dob format: YYYY-MM-DD\n"
        "- gender: male or female\n"
        "- death_type must be one of: NATURAL, ACCIDENT, HOMICIDE, STILLBIRTH\n"
        "- Return ONLY the JSON, no markdown, no explanation."
    )


def _observation_image_prompt() -> str:
    return (
        "You are reading a photo of a one-week observation poster used for death registration.\n"
        "Extract all legible text faithfully, preserving names, dates, places, causes, and phone numbers.\n"
        "If some parts are unclear, keep only what is readable and do not invent details.\n"
        "Return plain text only. No markdown, no explanation."
    )


def _clean_extracted_text(text: str) -> str:
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        lines = [line for line in cleaned.splitlines() if not line.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()
    return cleaned


def _extract_observation_text_claude(base64_image: str, mime_type: str) -> tuple[str, str]:
    cl = _client()
    if not cl:
        return "", "anthropic_api_key_missing"

    try:
        resp = cl.messages.create(
            model=CLAUDE_FAST,
            max_tokens=1500,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": base64_image,
                        },
                    },
                    {"type": "text", "text": _observation_image_prompt()},
                ],
            }],
        )
        text = _clean_extracted_text(resp.content[0].text or "")
        if text:
            return text, ""
        return "", "anthropic_empty_response"
    except Exception as exc:
        if _is_anthropic_low_credit_error(exc):
            logger.warning("Anthropic observation image extraction unavailable: low credit")
            return "", "anthropic_low_credit"
        logger.exception("Claude observation image extraction error: %s", exc)
        return "", "anthropic_request_error"


def _extract_observation_text_gemini(base64_image: str, mime_type: str) -> tuple[str, str]:
    if not settings.GEMINI_API_KEY:
        return "", "gemini_api_key_missing"

    payload = {
        "contents": [{
            "role": "user",
            "parts": [
                {"text": _observation_image_prompt()},
                {"inline_data": {"mime_type": mime_type, "data": base64_image}},
            ],
        }],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 1500,
        },
    }
    text, error = _gemini_generate_with_status(payload)
    cleaned = _clean_extracted_text(text)
    if cleaned:
        return cleaned, ""
    return "", (error or "gemini_empty_response")


def extract_observation_text_from_image_with_meta(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> tuple[str, dict]:
    if not image_bytes:
        return "", {
            "providers_used": [],
            "errors": {"gemini": "empty_image", "anthropic": "empty_image"},
        }

    base64_image = base64.b64encode(image_bytes).decode("ascii")

    # Claude first, Gemini fallback
    claude_text, claude_error = _extract_observation_text_claude(base64_image, mime_type)
    if claude_text:
        logger.info("[AI:observation_image] Provider=Claude SUCCESS")
        return claude_text, {
            "providers_used": ["anthropic"],
            "errors": {"gemini": "not_attempted", "anthropic": ""},
        }

    logger.warning("[AI:observation_image] Claude FAILED (%s) — falling back to Gemini", claude_error)
    gemini_text, gemini_error = _extract_observation_text_gemini(base64_image, mime_type)
    if gemini_text:
        logger.info("[AI:observation_image] Provider=Gemini SUCCESS (Claude fallback)")
        return gemini_text, {
            "providers_used": ["gemini"],
            "errors": {"gemini": "", "anthropic": claude_error},
        }

    logger.error("[AI:observation_image] ALL PROVIDERS FAILED — Claude: %s | Gemini: %s", claude_error, gemini_error)
    return "", {
        "providers_used": [],
        "errors": {"gemini": gemini_error, "anthropic": claude_error},
    }


def extract_observation_text_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    text, _ = extract_observation_text_from_image_with_meta(image_bytes, mime_type)
    return text


def _extract_json_claude(prompt: str) -> dict:
    cl = _client()
    if not cl:
        return {}

    try:
        resp = cl.messages.create(
            model=CLAUDE_FAST,
            max_tokens=650,
            messages=[{"role": "user", "content": prompt}],
        )
        text = (resp.content[0].text or "").strip()
        return _safe_json_loads(text)
    except Exception as exc:
        if _is_anthropic_low_credit_error(exc):
            logger.warning("Anthropic JSON extraction unavailable: low credit")
            return {}
        logger.exception("Claude JSON extraction error: %s", exc)
        return {}


def _extract_json_gemini(prompt: str) -> dict:
    if not settings.GEMINI_API_KEY:
        return {}

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 650,
        },
    }
    text = _gemini_generate(payload)
    return _safe_json_loads(text)


def extract_birth_form_with_meta(description: str, observation_text: str = "") -> tuple[dict, list[str]]:
    prompt = _build_birth_prompt(description, observation_text=observation_text)

    claude_fields = _extract_json_claude(prompt)
    if claude_fields:
        logger.info("[AI:birth_form] Provider=Claude SUCCESS")
        return claude_fields, ["anthropic"]

    logger.warning("[AI:birth_form] Claude FAILED — falling back to Gemini")
    gemini_fields = _extract_json_gemini(prompt)
    if gemini_fields:
        logger.info("[AI:birth_form] Provider=Gemini SUCCESS (Claude fallback)")
        return gemini_fields, ["gemini"]

    logger.error("[AI:birth_form] ALL PROVIDERS FAILED")
    return {}, []


def extract_death_form_with_meta(description: str, observation_text: str = "") -> tuple[dict, list[str]]:
    prompt = _build_death_prompt(description, observation_text=observation_text)

    claude_fields = _extract_json_claude(prompt)
    if claude_fields:
        logger.info("[AI:death_form] Provider=Claude SUCCESS")
        return claude_fields, ["anthropic"]

    logger.warning("[AI:death_form] Claude FAILED — falling back to Gemini")
    gemini_fields = _extract_json_gemini(prompt)
    if gemini_fields:
        logger.info("[AI:death_form] Provider=Gemini SUCCESS (Claude fallback)")
        return gemini_fields, ["gemini"]

    logger.error("[AI:death_form] ALL PROVIDERS FAILED")
    return {}, []


def extract_birth_form(description: str) -> dict:
    fields, _ = extract_birth_form_with_meta(description)
    return fields


def extract_death_form(description: str) -> dict:
    fields, _ = extract_death_form_with_meta(description)
    return fields


def _status_prompt(application_data: dict) -> str:
    status = application_data.get("status", "UNKNOWN")
    app_type = application_data.get("application_type", "")
    ref = application_data.get("reference_number", "")
    rejection = application_data.get("rejection_reason", "")

    context = f"Reference: {ref}\nType: {app_type} registration\nStatus: {status}\n"
    if rejection:
        context += f"Rejection reason: {rejection}\n"

    return (
        f"You are a helpful assistant for the Ghana Births and Deaths Registry.\n\n{context}\n"
        "Write a friendly, empathetic 2-3 sentence plain-language explanation of:\n"
        "1. What this status means for the applicant\n"
        "2. What they need to do next (if anything)\n"
        "3. A brief note of reassurance or next step\n\n"
        "Be warm, clear, and direct. No jargon. No bullet points."
    )


def generate_status_summary(application_data: dict) -> str:
    prompt = _status_prompt(application_data)

    cl = _client()
    if cl:
        try:
            resp = cl.messages.create(
                model=CLAUDE_FAST,
                max_tokens=260,
                messages=[{"role": "user", "content": prompt}],
            )
            text = (resp.content[0].text or "").strip()
            if text:
                logger.info("[AI:status_summary] Provider=Claude SUCCESS")
                return text
        except Exception as exc:
            if _is_anthropic_low_credit_error(exc):
                logger.error("[AI:status_summary] Claude FAILED — insufficient credits")
            else:
                logger.warning("[AI:status_summary] Claude FAILED: %s", exc)

    logger.warning("[AI:status_summary] Claude FAILED — falling back to Gemini")
    gemini_text = _gemini_generate({
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 260},
    })
    if gemini_text:
        logger.info("[AI:status_summary] Provider=Gemini SUCCESS (Claude fallback)")
        return gemini_text

    logger.error("[AI:status_summary] ALL PROVIDERS FAILED")
    return ""


def _prescreen_prompt() -> str:
    return (
        "Analyze this ID document image. Answer:\n"
        "1. Is this a Ghana National ID card (Ghana Card)?\n"
        "2. Is the card fully visible (not cut off at edges)?\n"
        "3. Is the text and photo readable/clear?\n\n"
        "Respond ONLY in this JSON format:\n"
        '{"ok":true/false,"is_ghana_card":true/false,"fully_visible":true/false,'
        '"readable":true/false,"message":"brief user-friendly note if there is a '
        'problem, empty string if everything looks good"}\n'
        "Return ONLY the JSON."
    )


def _prescreen_claude(base64_image: str, mime_type: str) -> dict:
    cl = _client()
    if not cl:
        return {}

    try:
        resp = cl.messages.create(
            model=CLAUDE_FAST,
            max_tokens=320,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": base64_image,
                        },
                    },
                    {"type": "text", "text": _prescreen_prompt()},
                ],
            }],
        )
        return _safe_json_loads(resp.content[0].text or "")
    except Exception as exc:
        if _is_anthropic_low_credit_error(exc):
            logger.warning("Anthropic document prescreen unavailable: low credit")
            return {}
        logger.exception("Claude document pre-screen error: %s", exc)
        return {}


def _prescreen_gemini(base64_image: str, mime_type: str) -> dict:
    if not settings.GEMINI_API_KEY:
        return {}

    payload = {
        "contents": [{
            "role": "user",
            "parts": [
                {"text": _prescreen_prompt()},
                {"inline_data": {"mime_type": mime_type, "data": base64_image}},
            ],
        }],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 320},
    }
    text = _gemini_generate(payload)
    return _safe_json_loads(text)


def prescreen_document(base64_image: str, mime_type: str = "image/jpeg") -> dict:
    claude_result = _prescreen_claude(base64_image, mime_type)
    if claude_result:
        logger.info("[AI:prescreen] Provider=Claude SUCCESS")
        return {
            "ok": bool(claude_result.get("ok", True)),
            "is_ghana_card": bool(claude_result.get("is_ghana_card", True)),
            "fully_visible": bool(claude_result.get("fully_visible", True)),
            "readable": bool(claude_result.get("readable", True)),
            "message": (claude_result.get("message") or ""),
        }

    logger.warning("[AI:prescreen] Claude FAILED — falling back to Gemini")
    gemini_result = _prescreen_gemini(base64_image, mime_type)
    if gemini_result:
        logger.info("[AI:prescreen] Provider=Gemini SUCCESS (Claude fallback)")
        return {
            "ok": bool(gemini_result.get("ok", True)),
            "is_ghana_card": bool(gemini_result.get("is_ghana_card", True)),
            "fully_visible": bool(gemini_result.get("fully_visible", True)),
            "readable": bool(gemini_result.get("readable", True)),
            "message": (gemini_result.get("message") or ""),
        }

    logger.error("[AI:prescreen] ALL PROVIDERS FAILED — returning safe default")
    return {"ok": True, "is_ghana_card": True, "fully_visible": True, "readable": True, "message": ""}


def _fallback(message: str) -> str:
    m = (message or "").lower()
    if "document" in m or "required" in m or "need" in m:
        return (
            "For birth registration you need: hospital birth notification, parent Ghana Card, "
            "and parent details. For death registration: informant details, cause and place of death."
        )
    if "fee" in m or "cost" in m or "pay" in m or "price" in m:
        return (
            "Normal plan: GHS 50 (30 days). Express plan: GHS 150 (7 days). "
            "Birth registration is free within the first 12 months. "
            "Late registration incurs a GHS 5/day penalty after a 7-day grace period."
        )
    if "track" in m or "status" in m or "reference" in m:
        return "Use your BDR reference number on the Track Application page for real-time status updates."
    if "office" in m or "location" in m or "where" in m:
        return "Visit the Offices page to find your nearest district BDR office across all 16 regions."
    return (
        "I can help with birth/death registration, certificates, fees, tracking, "
        "and office locations in Ghana. What would you like to know?"
    )


# ── Centralized AI call ────────────────────────────────────────────────────────

def ai_call(
    prompt: str,
    max_tokens: int = 800,
    operation: str = "ai",
    image_base64: str = None,
    image_mime: str = "image/jpeg",
) -> tuple[str, str, dict]:
    """
    Unified Claude-first, Gemini-fallback AI call with structured logging.
    Returns (text, powered_by_label, failure_info).
    """
    failure_info: dict = {}

    cl = _client()
    if cl:
        try:
            if image_base64:
                content = [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": image_mime, "data": image_base64},
                    },
                    {"type": "text", "text": prompt},
                ]
            else:
                content = prompt
            resp = cl.messages.create(
                model=CLAUDE_FAST,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": content}],
            )
            text = (resp.content[0].text or "").strip()
            if text:
                logger.info("[AI:%s] Provider=Claude SUCCESS tokens=%d", operation, max_tokens)
                return text, "Claude AI", failure_info
            failure_info["claude"] = "empty_response"
            logger.warning("[AI:%s] Claude returned empty response", operation)
        except Exception as exc:
            err = str(exc)
            if _is_anthropic_low_credit_error(exc):
                failure_info["claude"] = "insufficient_credits"
                logger.error("[AI:%s] Claude FAILED — insufficient credits", operation)
            else:
                failure_info["claude"] = err[:200]
                logger.warning("[AI:%s] Claude FAILED: %s", operation, err[:120])
    else:
        failure_info["claude"] = "not_configured"
        logger.warning("[AI:%s] Claude SKIPPED — not configured", operation)

    parts: list = []
    if image_base64:
        parts.append({"inline_data": {"mime_type": image_mime, "data": image_base64}})
    parts.append({"text": prompt})
    gemini_payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"maxOutputTokens": max_tokens},
    }
    text, gemini_err = _gemini_generate_with_status(gemini_payload)
    if text:
        logger.info("[AI:%s] Provider=Gemini SUCCESS (Claude fallback)", operation)
        return text, "Gemini AI", failure_info

    failure_info["gemini"] = gemini_err
    logger.error(
        "[AI:%s] ALL PROVIDERS FAILED — Claude: %s | Gemini: %s",
        operation, failure_info.get("claude"), gemini_err,
    )
    return "", "none", failure_info


# ── AI Health Check ────────────────────────────────────────────────────────────

def check_ai_health() -> dict:
    """Probe both providers with a minimal request. Used on startup and health endpoint."""
    result: dict = {
        "claude": {"available": False, "model": CLAUDE_FAST, "error": None},
        "gemini": {"available": False, "model": GEMINI_DEFAULT_MODEL, "error": None},
    }

    cl = _client()
    if not cl:
        result["claude"]["error"] = "not_configured"
        logger.warning("[AI:health] Claude NOT CONFIGURED — ANTHROPIC_API_KEY missing or SDK absent")
    else:
        try:
            cl.messages.create(
                model=CLAUDE_FAST,
                max_tokens=5,
                messages=[{"role": "user", "content": "ping"}],
            )
            result["claude"]["available"] = True
            logger.info("[AI:health] Claude OK (model=%s)", CLAUDE_FAST)
        except Exception as exc:
            err = str(exc)
            if _is_anthropic_low_credit_error(exc):
                result["claude"]["error"] = "insufficient_credits"
                logger.error("[AI:health] Claude FAILED — insufficient credits")
            else:
                result["claude"]["error"] = err[:200]
                logger.error("[AI:health] Claude FAILED: %s", err[:200])

    probe = {
        "contents": [{"parts": [{"text": "ping"}]}],
        "generationConfig": {"maxOutputTokens": 5},
    }
    text, gemini_err = _gemini_generate_with_status(probe)
    if text:
        result["gemini"]["available"] = True
        logger.info("[AI:health] Gemini OK (model=%s)", GEMINI_DEFAULT_MODEL)
    else:
        result["gemini"]["error"] = gemini_err
        logger.error("[AI:health] Gemini FAILED: %s", gemini_err)

    active = [k for k, v in result.items() if isinstance(v, dict) and v.get("available")]
    result["active_providers"] = active
    result["any_available"] = bool(active)
    if not active:
        logger.critical("[AI:health] NO AI PROVIDERS AVAILABLE — all features degraded")
    return result


# ── Translation ────────────────────────────────────────────────────────────────

_SUPPORTED_LANGUAGES: dict[str, str] = {
    "twi": "Twi (Akan)",
    "ga": "Ga",
    "ewe": "Ewe",
    "hausa": "Hausa",
    "dagbani": "Dagbani",
    "french": "French",
}
SUPPORTED_LANGUAGE_KEYS = list(_SUPPORTED_LANGUAGES.keys())


def translate_content(text: str, target_language: str) -> tuple[str, str]:
    """Translate text to a Ghanaian local language. Returns (translated_text, powered_by)."""
    lang_label = _SUPPORTED_LANGUAGES.get(target_language.lower(), target_language)
    prompt = (
        f"Translate the following text into {lang_label}.\n"
        "Return ONLY the translated text. No explanation, no original, no markdown.\n\n"
        f"{text}"
    )
    translated, powered_by, _ = ai_call(prompt, max_tokens=600, operation=f"translate:{target_language}")
    return (translated or text), powered_by


# ── Document Vision Extraction ────────────────────────────────────────────────

def analyze_document_image(
    base64_image: str,
    mime_type: str,
    form_type: str = "birth",
) -> tuple[dict, str]:
    """Use AI vision to extract registration fields from a scanned document image."""
    if form_type == "death":
        fields_json = (
            '{"deceased_first_name":null,"deceased_last_name":null,"deceased_other_names":null,'
            '"date_of_death":null,"deceased_dob":null,"gender":null,"place_of_death":null,'
            '"cause_of_death":null,"death_type":null,"nationality":null,"occupation":null,'
            '"informant_name":null,"informant_relation":null,"informant_phone":null}'
        )
        doc_desc = "death registration document, hospital death certificate, or one-week observation poster"
    else:
        fields_json = (
            '{"child_first_name":null,"child_last_name":null,"child_other_names":null,'
            '"child_date_of_birth":null,"child_gender":null,"child_place_of_birth":null,'
            '"child_region_of_birth":null,"child_district_of_birth":null,'
            '"mother_first_name":null,"mother_last_name":null,"mother_other_names":null,'
            '"mother_nationality":null,"mother_phone":null,'
            '"father_first_name":null,"father_last_name":null,"father_nationality":null,'
            '"father_phone":null,"hospital_name":null,"attending_physician":null}'
        )
        doc_desc = "hospital birth notification form, birth record, or Ghana Card"

    prompt = (
        f"You are reading a scanned {doc_desc} for Ghana's Births and Deaths Registry.\n"
        "Extract all visible registration information from this document image.\n"
        "Return ONLY a valid JSON object with exactly these keys (null for any field not visible):\n"
        f"{fields_json}\n\n"
        "Rules:\n"
        "- Date format: YYYY-MM-DD\n"
        "- gender/child_gender: 'male' or 'female'\n"
        "- death_type must be: NATURAL, ACCIDENT, HOMICIDE, or STILLBIRTH\n"
        "- Use null if unsure — do NOT guess\n"
        "- Return ONLY the JSON object, no markdown, no explanation"
    )
    text, powered_by, _ = ai_call(
        prompt, max_tokens=900, operation="document_vision",
        image_base64=base64_image, image_mime=mime_type,
    )
    parsed = _safe_json_loads(text)
    return parsed, powered_by


# ── Citizen Guidance ─────────────────────────────────────────────────────────

def generate_citizen_guidance(app_data: dict) -> tuple[str, str]:
    """Generate personalised next-step guidance for a citizen based on their application."""
    status = app_data.get("status", "PENDING")
    app_type = app_data.get("app_type", "BIRTH")
    ref = app_data.get("reference", "N/A")
    name = app_data.get("name", "Applicant")
    reason = app_data.get("rejection_reason", "")
    plan = app_data.get("service_plan", "NORMAL")

    prompt = (
        f"You are a helpful civil registration officer at Ghana's Births and Deaths Registry.\n"
        f"Applicant: {name} | Application: {app_type} registration (ref: {ref}) | "
        f"Status: {status} ({plan} plan).\n"
        f"{('Issue: ' + reason) if reason else ''}\n\n"
        "Write a warm, clear, personalised 2-3 sentence message telling this applicant exactly "
        "what they need to do next. Be specific, not generic. No jargon. "
        "End with an encouraging sentence.\n"
        "Return ONLY the message text."
    )
    guidance, powered_by, _ = ai_call(prompt, max_tokens=300, operation="citizen_guidance")
    return guidance, powered_by


# ── Public Health Pattern Analysis ────────────────────────────────────────────

def analyze_public_health_patterns(death_records: list) -> tuple[dict, str]:
    """Analyse recent death registrations for public health patterns and anomalies."""
    if not death_records:
        return {
            "briefing": "No death registrations available for analysis.",
            "patterns": [], "anomalies": [], "top_causes": [],
            "high_risk_regions": [], "recommendations": [], "alert_level": "LOW",
        }, "none"

    records_text = "\n".join(
        f"- Date: {r.get('date','?')}, Region: {r.get('region','?')}, "
        f"Cause: {r.get('cause','?')}, Gender: {r.get('gender','?')}"
        for r in death_records[:100]
    )

    prompt = (
        "You are a public health analyst reviewing death registration data from Ghana's "
        "Births and Deaths Registry. Analyze these recent death records for patterns:\n\n"
        f"{records_text}\n\n"
        "Return ONLY valid JSON:\n"
        "{\n"
        '  "briefing": "2-3 sentence overall public health assessment",\n'
        '  "patterns": ["observed pattern 1", "observed pattern 2"],\n'
        '  "anomalies": ["unusual cluster or spike worth flagging, or empty list"],\n'
        '  "top_causes": ["cause 1 (N cases)", "cause 2 (N cases)"],\n'
        '  "high_risk_regions": ["region with elevated mortality"],\n'
        '  "recommendations": ["recommended action for health team 1", "action 2"],\n'
        '  "alert_level": "LOW" or "MEDIUM" or "HIGH"\n'
        "}\n"
        "Be data-driven. Flag anything that might indicate an outbreak or epidemic cluster."
    )
    text, powered_by, _ = ai_call(prompt, max_tokens=800, operation="public_health")
    parsed = _safe_json_loads(text)
    if not parsed:
        parsed = {
            "briefing": text[:500] if text else "Analysis unavailable.",
            "patterns": [], "anomalies": [], "top_causes": [],
            "high_risk_regions": [], "recommendations": [], "alert_level": "LOW",
        }
    return parsed, powered_by
