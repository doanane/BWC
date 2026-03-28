from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.utils.ghana_data import GHANA_REGIONS, GHANA_DISTRICTS, DOCUMENT_REQUIREMENTS
from app.models.application import Application, ApplicationStatus
from app.models.certificate import Certificate
from app.models.user import User

router = APIRouter(prefix="/misc", tags=["Reference Data"])


ACT_1027_REFERENCE = {
    "title": "Registration of Births and Deaths Act, 2020",
    "citation": "Act 1027 of 2020",
    "jurisdiction": "Ghana",
    "commenced_on": "2020-10-06",
    "official_reference_url": (
        "https://ghalii.org/akn/gh/act/2020/1027/eng@2020-10-06"
    ),
    "key_sections_for_portal_users": [
        {
            "section": "16",
            "topic": "Notification of birth",
            "user_guidance": "Births should be notified to the District Registrar within 7 days by the relevant notifier.",
            "portal_service": "/register/birth",
        },
        {
            "section": "17",
            "topic": "Registration of birth",
            "user_guidance": "Birth registration is free within 12 months; late registration requires reason and prescribed fee.",
            "portal_service": "/register/birth",
        },
        {
            "section": "23-31",
            "topic": "Notification and registration of death",
            "user_guidance": "Deaths should be reported promptly, with medical or coroner certification where required.",
            "portal_service": "/register/death",
        },
        {
            "section": "37-38",
            "topic": "Correction of errors",
            "user_guidance": "Corrections require written application and statutory declaration or affidavit support.",
            "portal_service": "/contact",
        },
        {
            "section": "39",
            "topic": "Search of records",
            "user_guidance": "Search reports confirm whether a record is registered and provide only the registration number.",
            "portal_service": "/services/verification",
        },
        {
            "section": "40-41",
            "topic": "Certified copies by court order",
            "user_guidance": "Third-party certified copy requests require High Court order and prescribed fee.",
            "portal_service": "/services/extracts",
        },
        {
            "section": "44",
            "topic": "Security protocols",
            "user_guidance": "Registry data access is restricted to authorised persons under security controls.",
            "portal_service": "/legal/privacy",
        },
    ],
}


class RecordSearchRequest(BaseModel):
    record_type: str
    reference: str


def _matches_record_type(app: Application, record_type: str) -> bool:
    app_type = str((app.extra_data or {}).get("application_type", "BIRTH")).upper()
    requested = (record_type or "").strip().upper()
    if requested == "BIRTH":
        return app_type == "BIRTH"
    if requested == "DEATH":
        return app_type == "DEATH"
    return False


def _is_registered_status(status: ApplicationStatus) -> bool:
    return status in {
        ApplicationStatus.APPROVED,
        ApplicationStatus.PAYMENT_COMPLETED,
        ApplicationStatus.PROCESSING,
        ApplicationStatus.READY,
        ApplicationStatus.COLLECTED,
        ApplicationStatus.DELIVERED,
    }


@router.get("/regions")
def get_regions():
    return {"regions": GHANA_REGIONS}


@router.get("/districts/{region}")
def get_districts(region: str):
    districts = GHANA_DISTRICTS.get(region, [])
    return {"region": region, "districts": districts}


@router.get("/document-requirements")
def get_document_requirements():
    return DOCUMENT_REQUIREMENTS


@router.get("/legal/act-1027-reference")
def get_act_1027_reference():
    return ACT_1027_REFERENCE


@router.post("/records/search")
def search_records(
    payload: RecordSearchRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    record_type = (payload.record_type or "").strip().upper()
    if record_type not in {"BIRTH", "DEATH"}:
        return {
            "record_type": record_type,
            "reference": payload.reference,
            "registered": False,
            "registration_number": None,
            "report": "Invalid record type. Use BIRTH or DEATH.",
            "legal_basis": "Act 1027 section 39",
        }

    ref = (payload.reference or "").strip()
    if not ref:
        return {
            "record_type": record_type,
            "reference": "",
            "registered": False,
            "registration_number": None,
            "report": "Reference is required for record search.",
            "legal_basis": "Act 1027 section 39",
        }

    cert = (
        db.query(Certificate)
        .join(Application, Certificate.application_id == Application.id)
        .filter(Certificate.certificate_number == ref)
        .first()
    )
    if cert and cert.application and _matches_record_type(cert.application, record_type):
        return {
            "record_type": record_type,
            "reference": ref,
            "registered": True,
            "registration_number": cert.certificate_number,
            "report": (
                "Record is registered. Registration number has been provided in line with "
                "Act 1027 section 39(3)-(4)."
            ),
            "legal_basis": "Act 1027 section 39",
            "requested_by_user_id": current_user.id,
        }

    app = db.query(Application).filter(Application.application_number == ref).first()
    if app and _matches_record_type(app, record_type) and _is_registered_status(app.status):
        return {
            "record_type": record_type,
            "reference": ref,
            "registered": True,
            "registration_number": app.application_number,
            "report": (
                "Record is registered. Registration number has been provided in line with "
                "Act 1027 section 39(3)-(4)."
            ),
            "legal_basis": "Act 1027 section 39",
            "requested_by_user_id": current_user.id,
        }

    return {
        "record_type": record_type,
        "reference": ref,
        "registered": False,
        "registration_number": None,
        "report": (
            "No registered record was found for this search reference. "
            "Per Act 1027 section 39, no further details can be disclosed."
        ),
        "legal_basis": "Act 1027 section 39",
        "requested_by_user_id": current_user.id,
    }


@router.get("/application-statuses")
def get_application_statuses():
    from app.models.application import ApplicationStatus
    return {
        s.value: s.value.replace("_", " ").title()
        for s in ApplicationStatus
    }


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "ok", "api": "ok"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"status": "error", "database": "error", "detail": str(e)})
