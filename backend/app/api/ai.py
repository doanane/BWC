import mimetypes

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_staff, require_admin
from app.models.application import Application
from app.models.user import User
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["AI"])

MAX_OBSERVATION_FILE_BYTES = 5 * 1024 * 1024
MAX_OBSERVATION_IMAGE_BYTES = 10 * 1024 * 1024

ALLOWED_OBSERVATION_TEXT_TYPES = {
    "text/plain",
    "text/markdown",
    "application/json",
}
ALLOWED_OBSERVATION_TEXT_EXTENSIONS = (".txt", ".md", ".json")


class FormFillRequest(BaseModel):
    description: str
    form_type: str = "birth"


class FormFillResponse(BaseModel):
    fields: dict
    powered_by: str = ai_service.POWERED_BY_LABEL
    providers_used: list[str] = Field(default_factory=list)


class StatusSummaryRequest(BaseModel):
    status: str
    application_type: str = ""
    reference_number: str = ""
    rejection_reason: str = ""


class StatusSummaryResponse(BaseModel):
    summary: str


class DocScreenRequest(BaseModel):
    base64_image: str
    mime_type: str = "image/jpeg"


class DocScreenResponse(BaseModel):
    ok: bool
    is_ghana_card: bool = True
    fully_visible: bool = True
    readable: bool = True
    message: str = ""


@router.post("/form-fill", response_model=FormFillResponse)
def form_fill(data: FormFillRequest):
    if not data.description or len(data.description.strip()) < 5:
        raise HTTPException(status_code=400, detail="Description too short.")
    if data.form_type == "death":
        fields, providers_used = ai_service.extract_death_form_with_meta(data.description)
    else:
        fields, providers_used = ai_service.extract_birth_form_with_meta(data.description)
    return FormFillResponse(fields=fields, providers_used=providers_used)


async def _read_observation_text(file: UploadFile) -> str:
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    guessed_content_type = (mimetypes.guess_type(filename)[0] or "").lower()

    is_text_upload = (
        content_type in ALLOWED_OBSERVATION_TEXT_TYPES
        or guessed_content_type in ALLOWED_OBSERVATION_TEXT_TYPES
        or filename.endswith(ALLOWED_OBSERVATION_TEXT_EXTENSIONS)
    )
    is_image_upload = (
        content_type.startswith("image/")
        or guessed_content_type.startswith("image/")
    )

    if not is_text_upload and not is_image_upload:
        raise HTTPException(
            status_code=415,
            detail=(
                "Unsupported observation file type. Upload a one-week observation poster image "
                "or notes file (.txt, .md, .json)."
            ),
        )

    max_bytes = MAX_OBSERVATION_IMAGE_BYTES if is_image_upload else MAX_OBSERVATION_FILE_BYTES

    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        limit = "10MB" if is_image_upload else "5MB"
        raise HTTPException(status_code=413, detail=f"Observation file is too large (max {limit}).")

    if is_image_upload:
        mime_type = content_type or guessed_content_type or "image/jpeg"
        extracted_text, extraction_meta = ai_service.extract_observation_text_from_image_with_meta(
            content,
            mime_type=mime_type,
        )
        extracted_text = extracted_text.strip()
        if not extracted_text:
            errors = extraction_meta.get("errors") if isinstance(extraction_meta, dict) else {}
            gemini_error = str((errors or {}).get("gemini") or "")
            anthropic_error = str((errors or {}).get("anthropic") or "")
            provider_issue_markers = (
                "api_key_missing",
                "model_unavailable",
                "http_error",
                "request_error",
                "low_credit",
            )
            provider_issue_count = sum(
                1
                for err in (gemini_error, anthropic_error)
                if err and any(marker in err for marker in provider_issue_markers)
            )

            if provider_issue_count >= 2:
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "Observation extraction services are currently unavailable. "
                        "Please try again later or paste the notes manually."
                    ),
                )

            raise HTTPException(
                status_code=422,
                detail=(
                    "We could not read text from this poster image. "
                    "Please upload a clearer photo or type the observation notes."
                ),
            )
        return extracted_text[:12000]

    text = content.decode("utf-8", errors="ignore").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Observation file is empty.")

    # Keep prompt size predictable for both providers.
    return text[:12000]


@router.post("/form-fill-from-observation", response_model=FormFillResponse)
async def form_fill_from_observation(
    form_type: str = Form("death"),
    description: str = Form(""),
    observation_file: UploadFile = File(...),
):
    observation_text = await _read_observation_text(observation_file)
    context = (description or "").strip() or "Extract registration details from this observation report."

    if form_type == "death":
        fields, providers_used = ai_service.extract_death_form_with_meta(
            context,
            observation_text=observation_text,
        )
    else:
        fields, providers_used = ai_service.extract_birth_form_with_meta(
            context,
            observation_text=observation_text,
        )

    return FormFillResponse(fields=fields, providers_used=providers_used)


@router.post("/status-summary", response_model=StatusSummaryResponse)
def status_summary(data: StatusSummaryRequest):
    summary = ai_service.generate_status_summary({
        "status": data.status,
        "application_type": data.application_type,
        "reference_number": data.reference_number,
        "rejection_reason": data.rejection_reason,
    })
    return StatusSummaryResponse(summary=summary)


@router.post("/document-screen", response_model=DocScreenResponse)
def document_screen(data: DocScreenRequest):
    result = ai_service.prescreen_document(data.base64_image, data.mime_type)
    return DocScreenResponse(**result)


@router.post("/review-application/{application_id}")
def ai_review_application(
    application_id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    extra = app.extra_data or {}
    app_type = extra.get("application_type", "BIRTH").upper()

    prompt = f"""You are an expert civil registration officer reviewing a {app_type} registration application for Ghana's Births and Deaths Registry.

APPLICATION DATA:
- Reference: {app.application_number}
- Type: {app_type}
- Status: {app.status.value if app.status else 'unknown'}
- Child/Deceased Name: {app.child_first_name} {app.child_last_name}
- Date of Birth/Death: {str(app.child_date_of_birth) if app.child_date_of_birth else 'not provided'}
- Place: {app.child_place_of_birth or 'not provided'}
- Region: {app.child_region_of_birth or 'not provided'}
- District: {app.child_district_of_birth or 'not provided'}
- Mother: {app.mother_first_name} {app.mother_last_name} | Ghana Card: {app.mother_ghana_card or 'not provided'}
- Father: {(app.father_first_name or '') + ' ' + (app.father_last_name or '')} | Ghana Card: {app.father_ghana_card or 'not provided'}
- Hospital: {app.hospital_name or 'not provided'}
- Informant: {app.informant_name or 'not provided'} ({app.informant_relationship or 'not provided'})
- Service Plan: {app.service_plan.value if app.service_plan else 'normal'}

Provide a professional review in JSON format with these exact fields:
{{
  "recommendation": "APPROVE" or "REJECT" or "REQUEST_MORE_INFO",
  "confidence": 0-100,
  "flags": ["list of specific issues or missing information"],
  "strengths": ["list of things that look correct and complete"],
  "summary": "2-3 sentence professional summary for the reviewing officer",
  "action_notes": "Specific action items for the staff member"
}}

Be concise, professional, and focus on official registration requirements."""

    result = None
    powered_by = "Claude AI"
    client = ai_service._client()
    if client:
        try:
            resp = client.messages.create(
                model=ai_service.CLAUDE_FAST,
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}],
            )
            result = resp.content[0].text
        except Exception:
            result = None

    if not result:
        gemini_payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 800},
        }
        result = ai_service._gemini_generate(gemini_payload)
        if result:
            powered_by = "Gemini AI"

    if not result:
        raise HTTPException(status_code=503, detail="AI review service unavailable. Check ANTHROPIC_API_KEY or GEMINI_API_KEY.")

    import json as _json
    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        review = _json.loads(result[start:end])
    except Exception:
        review = {
            "recommendation": "REQUEST_MORE_INFO",
            "confidence": 50,
            "flags": [],
            "strengths": [],
            "summary": result[:500] if result else "Review could not be parsed",
            "action_notes": "Please review manually",
        }

    return {"application_id": application_id, "review": review, "powered_by": powered_by}


@router.post("/draft-response/{application_id}")
def ai_draft_response(
    application_id: int,
    body: dict = Body(...),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    decision = body.get("decision", "APPROVE")
    reason = body.get("reason", "")

    extra = app.extra_data or {}
    app_type = extra.get("application_type", "BIRTH").upper()
    applicant_name = ""
    if app.applicant:
        applicant_name = (app.applicant.first_name or app.applicant.email or "Applicant")

    _DECISION_LABELS = {
        "APPROVE": "your application has been approved",
        "REJECT": "your application has been rejected",
        "REQUEST_MORE_INFO": "we require additional information before we can proceed with your application",
    }
    decision_phrase = _DECISION_LABELS.get(decision, decision.replace("_", " ").lower())

    _NEXT_STEPS = {
        "APPROVE": "Please proceed to the payment and collection stage as indicated on the portal. Your certificate will be ready within the expected timeframe.",
        "REJECT": f"Reason: {reason or 'Please contact our office for full details.'}. You may resubmit with the required corrections.",
        "REQUEST_MORE_INFO": f"Specifically, we require: {reason or 'additional documentation or clarification. Please contact our office for details.'}. Kindly submit the required information at your earliest convenience through the portal or in person at your nearest BDR office.",
    }
    next_steps = _NEXT_STEPS.get(decision, reason or "Please log in to the portal for further details.")

    prompt = f"""You are a professional officer at Ghana's Births and Deaths Registry drafting an official formal response letter.

CONTEXT:
- Application Reference: {app.application_number}
- Registration Type: {app_type}
- Applicant First Name: {applicant_name}
- Subject (child/deceased): {app.child_first_name} {app.child_last_name}
- Decision summary: {decision_phrase}
- Next steps for applicant: {next_steps}

Write a formal government letter (3-4 short paragraphs) following these rules exactly:
1. Open with exactly: "Dear {applicant_name},"
2. Acknowledge receipt of the application for {app_type.lower()} registration of {app.child_first_name} {app.child_last_name} (ref {app.application_number})
3. State the decision in plain, clear English — do NOT repeat the decision code word or any technical system label
4. State the next steps the applicant needs to take
5. Close with: "Yours faithfully,\\nThe Registrar\\nBirths and Deaths Registry, Ghana\\nTel: +233 302 664 001 | Email: info@bdregistry.gov.gh"

Rules:
- Do NOT use markdown, asterisks, bold, or any formatting symbols
- Do NOT write placeholder text like [Insert contact] — use the contact details above
- Keep the letter under 220 words
- Use formal, warm, professional government language

Output ONLY the letter text. Nothing before or after it."""

    letter = None
    powered_by = "Claude AI"
    client = ai_service._client()
    if client:
        try:
            resp = client.messages.create(
                model=ai_service.CLAUDE_FAST,
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}],
            )
            letter = resp.content[0].text.strip()
        except Exception:
            letter = None

    if not letter:
        gemini_payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 600},
        }
        letter = ai_service._gemini_generate(gemini_payload)
        if letter:
            powered_by = "Gemini AI"

    if not letter:
        raise HTTPException(status_code=503, detail="AI draft service unavailable. Check ANTHROPIC_API_KEY or GEMINI_API_KEY.")

    return {
        "application_id": application_id,
        "decision": decision,
        "letter": letter.strip(),
        "powered_by": powered_by,
    }


import json as _json
from datetime import date as _date


class WorkloadStaffItem(BaseModel):
    id: int
    name: str
    in_progress: int = 0
    completed: int = 0


class WorkloadAppItem(BaseModel):
    id: int
    application_number: str
    service_plan: str = "normal"
    child_name: str = ""


class WorkloadRequest(BaseModel):
    applications: list[WorkloadAppItem]
    staff: list[WorkloadStaffItem]


class DailyBriefingStats(BaseModel):
    total_applications: int = 0
    pending: int = 0
    approved: int = 0
    rejected: int = 0
    staff_count: int = 0
    revenue: float = 0.0


class DailyBriefingRequest(BaseModel):
    date: str
    stats: DailyBriefingStats


@router.post("/workload-suggestion")
def workload_suggestion(
    data: WorkloadRequest,
    current_user: User = Depends(require_admin),
):
    if not data.staff:
        raise HTTPException(status_code=400, detail="No staff provided")
    if not data.applications:
        return {"suggestions": [], "summary": "No applications to assign.", "powered_by": "Claude AI"}

    staff_lines = "\n".join(
        f"- ID={s.id}, Name={s.name}, In-Progress={s.in_progress}, Completed={s.completed}"
        for s in data.staff
    )
    app_lines = "\n".join(
        f"- AppNum={a.application_number}, Plan={a.service_plan}, Subject={a.child_name}"
        for a in data.applications
    )

    prompt = f"""You are a workload management assistant for the Ghana Births and Deaths Registry.

STAFF:
{staff_lines}

APPLICATIONS TO ASSIGN:
{app_lines}

Rules:
- Prefer staff with fewer in-progress applications.
- Express plan applications should go to staff with higher completion rates.
- Distribute load evenly.

Respond with valid JSON only, no markdown:
{{
  "suggestions": [
    {{"application_number": "...", "suggested_staff_id": N, "suggested_staff_name": "...", "reason": "..."}}
  ],
  "summary": "..."
}}"""

    client = ai_service._client()
    result = None
    powered_by = "Claude AI"
    if client:
        try:
            resp = client.messages.create(
                model=ai_service.CLAUDE_FAST,
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}],
            )
            result = resp.content[0].text
        except Exception:
            result = None

    if not result:
        gemini_payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 1000},
        }
        result = ai_service._gemini_generate(gemini_payload)
        if result:
            powered_by = "Gemini AI"

    if not result:
        raise HTTPException(status_code=503, detail="AI workload service unavailable")

    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        parsed = _json.loads(result[start:end])
    except Exception:
        parsed = {"suggestions": [], "summary": result[:500] if result else "Could not parse suggestions"}

    parsed["powered_by"] = powered_by
    return parsed


@router.post("/daily-briefing")
def daily_briefing(
    data: DailyBriefingRequest,
    current_user: User = Depends(require_admin),
):
    s = data.stats
    prompt = f"""You are a professional operations assistant for the Ghana Births and Deaths Registry.

Generate a daily operations briefing for {data.date}.

STATISTICS:
- Total Applications: {s.total_applications}
- Pending: {s.pending}
- Approved: {s.approved}
- Rejected: {s.rejected}
- Active Staff: {s.staff_count}
- Revenue (GHS): {s.revenue}

Produce a concise briefing in valid JSON only, no markdown:
{{
  "briefing": "2-3 paragraph professional narrative summary",
  "highlights": ["key positive highlight 1", "key positive highlight 2"],
  "alerts": ["any concern or alert if metrics look problematic, else empty list"],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}}"""

    client = ai_service._client()
    result = None
    powered_by = "Claude AI"
    if client:
        try:
            resp = client.messages.create(
                model=ai_service.CLAUDE_FAST,
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}],
            )
            result = resp.content[0].text
        except Exception:
            result = None

    if not result:
        gemini_payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 800},
        }
        result = ai_service._gemini_generate(gemini_payload)
        if result:
            powered_by = "Gemini AI"

    if not result:
        raise HTTPException(status_code=503, detail="AI briefing service unavailable")

    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        parsed = _json.loads(result[start:end])
    except Exception:
        parsed = {
            "briefing": result[:800] if result else "Briefing unavailable",
            "highlights": [],
            "alerts": [],
            "recommendations": [],
        }

    parsed["powered_by"] = powered_by
    return parsed


@router.post("/fraud-check/{application_id}")
def fraud_check(
    application_id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    indicators = []
    clean_signals = []
    today = _date.today()

    dob = app.child_date_of_birth
    if dob and dob > today:
        indicators.append("Birth date is in the future")
    elif dob:
        clean_signals.append("Birth date is valid")

    extra = app.extra_data or {}
    app_type = extra.get("application_type", "BIRTH").upper()
    death_date = extra.get("date_of_death")
    if death_date and dob:
        try:
            from datetime import datetime as _dt
            dd = _dt.fromisoformat(str(death_date)).date() if not isinstance(death_date, _date) else death_date
            if dd < dob:
                indicators.append("Death date is before birth date")
            elif dd > today:
                indicators.append("Death date is in the future")
            else:
                clean_signals.append("Death date is consistent with birth date")
        except Exception:
            pass

    is_death = app_type == "DEATH"

    if not is_death:
        mother_card = app.mother_ghana_card
        father_card = app.father_ghana_card

        if mother_card:
            mother_count = db.query(Application).filter(
                Application.mother_ghana_card == mother_card,
                Application.id != application_id,
            ).count()
            if mother_count > 2:
                indicators.append(f"Mother Ghana Card used in {mother_count} other applications")
            else:
                clean_signals.append("Mother Ghana Card usage is within normal range")
        else:
            indicators.append("Mother Ghana Card not provided")

        if father_card:
            father_count = db.query(Application).filter(
                Application.father_ghana_card == father_card,
                Application.id != application_id,
            ).count()
            if father_count > 2:
                indicators.append(f"Father Ghana Card used in {father_count} other applications")
            else:
                clean_signals.append("Father Ghana Card usage is within normal range")

        if not app.hospital_name:
            indicators.append("Hospital name not provided")
        else:
            clean_signals.append("Hospital name present")
    else:
        registrant_card = extra.get("registrant_ghana_card")
        if registrant_card:
            dup_count = db.query(Application).filter(
                Application.extra_data["registrant_ghana_card"].astext == registrant_card,
                Application.id != application_id,
            ).count()
            if dup_count > 3:
                indicators.append(f"Registrant Ghana Card used in {dup_count} other death applications")
            else:
                clean_signals.append("Registrant Ghana Card usage is within normal range")
        else:
            indicators.append("Registrant Ghana Card not provided")

        if not app.informant_name:
            indicators.append("Informant/registrant name missing")
        else:
            clean_signals.append("Informant details present")

    if not is_death and not app.informant_name:
        indicators.append("Informant name missing")
    elif not is_death and app.informant_name:
        clean_signals.append("Informant details present")

    indicator_count = len(indicators)
    if indicator_count == 0:
        risk_level = "LOW"
    elif indicator_count <= 2:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    indicator_text = "\n".join(f"- {i}" for i in indicators) or "None"
    clean_text = "\n".join(f"- {c}" for c in clean_signals) or "None"

    prompt = f"""You are a fraud detection analyst for the Ghana Births and Deaths Registry.

APPLICATION: {app.application_number}
TYPE: {(app.extra_data or {}).get('application_type', 'BIRTH')}
SERVICE PLAN: {app.service_plan.value if app.service_plan else 'normal'}

RISK INDICATORS FOUND:
{indicator_text}

CLEAN SIGNALS:
{clean_text}

CURRENT RISK LEVEL (DB analysis): {risk_level}

Write a concise fraud assessment summary (2-3 sentences) for a registry officer, explaining the risk level and what to look for."""

    client = ai_service._client()
    summary = None
    ai_provider = "Claude AI"
    if client:
        try:
            resp = client.messages.create(
                model=ai_service.CLAUDE_FAST,
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
            )
            summary = resp.content[0].text.strip()
        except Exception:
            summary = None

    if not summary:
        gemini_payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 300},
        }
        summary = ai_service._gemini_generate(gemini_payload)
        if summary:
            ai_provider = "Gemini AI"

    if not summary:
        summary = f"Risk level {risk_level} based on {indicator_count} indicator(s) detected."
        ai_provider = "DB analysis only"

    return {
        "application_id": application_id,
        "risk_level": risk_level,
        "indicators": indicators,
        "clean_signals": clean_signals,
        "summary": summary,
        "powered_by": f"{ai_provider} + DB analysis",
    }


# ── New AI endpoints ──────────────────────────────────────────────────────────

from datetime import datetime as _datetime, timedelta as _timedelta


@router.get("/health")
def ai_health():
    """Test both AI providers and return live status. No auth required."""
    return ai_service.check_ai_health()


class TranslateRequest(BaseModel):
    text: str
    language: str


class TranslateResponse(BaseModel):
    translated: str
    language: str
    powered_by: str


@router.post("/translate", response_model=TranslateResponse)
def translate_text(data: TranslateRequest):
    """Translate text to a Ghanaian local language (twi, ga, ewe, hausa, dagbani) or French."""
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    supported = set(ai_service.SUPPORTED_LANGUAGE_KEYS)
    if data.language.lower() not in supported:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language. Choose from: {', '.join(sorted(supported))}",
        )
    translated, powered_by = ai_service.translate_content(data.text, data.language)
    return TranslateResponse(translated=translated, language=data.language, powered_by=powered_by)


class DocumentVisionRequest(BaseModel):
    base64_image: str
    mime_type: str = "image/jpeg"
    form_type: str = "birth"


@router.post("/document-vision")
def document_vision(data: DocumentVisionRequest):
    """
    Use AI vision to extract registration fields from a scanned document image.
    Pass a base64-encoded image of a hospital birth notification, death certificate,
    or observation poster and receive pre-filled form fields.
    """
    if not data.base64_image:
        raise HTTPException(status_code=400, detail="base64_image is required")
    if data.form_type not in ("birth", "death"):
        raise HTTPException(status_code=400, detail="form_type must be 'birth' or 'death'")

    fields, powered_by = ai_service.analyze_document_image(
        data.base64_image, data.mime_type, data.form_type
    )
    if not fields:
        raise HTTPException(
            status_code=503,
            detail="Document vision analysis failed. Both AI providers unavailable.",
        )
    filled = sum(1 for v in fields.values() if v is not None)
    return {
        "fields": fields,
        "form_type": data.form_type,
        "fields_extracted": filled,
        "powered_by": powered_by,
    }


@router.post("/public-health-snapshot")
def public_health_snapshot(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Analyse recent death registrations for public health patterns.
    Detects cause-of-death clusters, regional anomalies, and outbreak signals.
    Admin only.
    """
    cutoff = _datetime.utcnow() - _timedelta(days=90)
    apps = db.query(Application).filter(Application.created_at >= cutoff).all()

    death_records = []
    for a in apps:
        extra = a.extra_data or {}
        if extra.get("application_type", "BIRTH").upper() != "DEATH":
            continue
        death_records.append({
            "date": str(extra.get("date_of_death") or a.child_date_of_birth or "unknown"),
            "region": a.child_region_of_birth or extra.get("region_of_death", "unknown"),
            "cause": extra.get("cause_of_death", "unknown"),
            "gender": extra.get("gender", getattr(a, "child_gender", None) or "unknown"),
        })

    insights, powered_by = ai_service.analyze_public_health_patterns(death_records)
    insights["records_analyzed"] = len(death_records)
    insights["powered_by"] = powered_by
    return insights


class RegistryAskRequest(BaseModel):
    question: str


@router.post("/ask")
def registry_ask(
    req: RegistryAskRequest,
    current_user: User = Depends(require_staff),
):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    prompt = (
        "You are an expert assistant for Ghana's Births and Deaths Registry (BDR). "
        "Answer the question below professionally and clearly, in plain prose. "
        "No markdown symbols like asterisks or dashes — write complete sentences. "
        "Focus on Ghana's specific regulations, processes, and requirements.\n\n"
        f"Question: {req.question}"
    )
    answer, powered_by, _ = ai_service.ai_call(prompt, max_tokens=700, operation="registry-ask")
    return {"answer": answer or "No answer available at this time.", "powered_by": powered_by}


@router.get("/citizen-guidance/{application_id}")
def citizen_guidance(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    """
    Generate personalised next-step guidance for a citizen based on their application state.
    Staff/admin use this to get a suggested message for the applicant.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    extra = app.extra_data or {}
    name = ""
    if app.applicant:
        name = app.applicant.first_name or app.applicant.email or "Applicant"

    guidance, powered_by = ai_service.generate_citizen_guidance({
        "status": app.status.value if app.status else "PENDING",
        "app_type": extra.get("application_type", "BIRTH"),
        "reference": app.application_number,
        "name": name,
        "rejection_reason": getattr(app, "rejection_reason", "") or "",
        "service_plan": app.service_plan.value if app.service_plan else "NORMAL",
    })
    if not guidance:
        raise HTTPException(status_code=503, detail="AI guidance service unavailable.")

    return {
        "application_id": application_id,
        "guidance": guidance,
        "powered_by": powered_by,
    }
