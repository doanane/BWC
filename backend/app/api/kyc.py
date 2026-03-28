import hashlib
import hmac
import json
import os
import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_admin
from app.core.security import hash_pii_lookup
from app.models.user import AccountType, KycStatus, User, UserRole
from app.utils.cloudinary_storage import upload_bytes_to_cloudinary
from app.utils.email import send_kyc_document_request_email


class MetaMapCallbackRequest(BaseModel):
    verification_id: str
    user_data: dict = {}

router = APIRouter(prefix="/kyc", tags=["KYC"])


def _normalize_ghana_card(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[\s\-]", "", value).upper()


def _extract_document_number(resource: dict) -> str | None:
    """
    Walk MetaMap's verification resource to find the document number
    extracted from the physical Ghana Card. MetaMap nests this inside
    the steps array under various key names depending on the flow version.
    """
    for step in resource.get("steps", []):
        data = step.get("data", {})
        # MetaMap document-reading step field names (varies by SDK version)
        for field in ("documentNumber", "personalNumber", "idNumber", "cardNumber"):
            val = data.get(field) or data.get("documentFields", {}).get(field)
            if val:
                return str(val)
    # Fallback: sometimes at the top level of resource
    for field in ("documentNumber", "personalNumber", "idNumber"):
        val = resource.get(field)
        if val:
            return str(val)
    return None


def _extract_full_name(resource: dict) -> str | None:
    for step in resource.get("steps", []):
        data = step.get("data", {})
        doc_fields = data.get("documentFields", {})
        first = doc_fields.get("firstName") or data.get("firstName", "")
        last  = doc_fields.get("lastName")  or data.get("lastName", "")
        if first or last:
            return f"{first} {last}".strip()
    return None


def _names_match(extracted: str, registered: str) -> bool:
    """
    Loose name comparison: allow for middle names and minor OCR differences.
    Both names must share at least one word of 3+ characters.
    """
    a = set(w.lower() for w in re.split(r"\s+", extracted.strip())   if len(w) >= 3)
    b = set(w.lower() for w in re.split(r"\s+", registered.strip())  if len(w) >= 3)
    return bool(a & b)


@router.post("/webhook")
async def metamap_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("x-signature", "")
    secret = os.environ.get("METAMAP_WEBHOOK_SECRET", "")

    if secret and signature:
        expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(f"sha256={expected}", signature):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_name = data.get("eventName", "")
    resource = data.get("resource", {})

    if event_name in ("verification_completed", "step_completed", "verification_updated"):
        verification_id = resource.get("identity") or resource.get("_id", "")
        status_value = resource.get("status", "")
        metadata = resource.get("metadata", {})
        internal_user_id = metadata.get("internal_user_id")

        if internal_user_id:
            user = db.query(User).filter(User.id == int(internal_user_id)).first()
            if user:
                user.metamap_verification_id = verification_id

                if status_value == "verified":
                    # Extract document fields MetaMap read from the physical card
                    extracted_card_number = _extract_document_number(resource)

                    # Cross-check: hash the card MetaMap extracted and compare with
                    # the HMAC hash we stored at registration. This works even though
                    # the stored ghana_card_number column is now Fernet-encrypted.
                    if extracted_card_number and user.ghana_card_hash:
                        extracted_normalized = _normalize_ghana_card(extracted_card_number)
                        extracted_hash = hash_pii_lookup(extracted_normalized)
                        if extracted_hash != user.ghana_card_hash:
                            user.kyc_status = KycStatus.REJECTED
                            db.commit()
                            return {"received": True}

                    # Also cross-check full name if MetaMap extracted it
                    extracted_name = _extract_full_name(resource)
                    if extracted_name and user.full_name:
                        if not _names_match(extracted_name, user.full_name):
                            user.kyc_status = KycStatus.REJECTED
                            db.commit()
                            return {"received": True}

                    user.kyc_status = KycStatus.VERIFIED
                    user.is_verified = True

                elif status_value in ("rejected", "reviewNeeded"):
                    user.kyc_status = KycStatus.REJECTED
                else:
                    user.kyc_status = KycStatus.PENDING

                db.commit()

    return {"received": True}


@router.post("/submit-metamap")
def submit_metamap_verification(
    data: MetaMapCallbackRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    current_user.metamap_verification_id = data.verification_id
    current_user.kyc_status = KycStatus.PENDING
    db.commit()
    db.refresh(current_user)
    return {
        "message": "Identity verification submitted. Your account is under review.",
        "kyc_status": current_user.kyc_status,
        "verification_id": current_user.metamap_verification_id,
    }


@router.get("/status")
def get_kyc_status(current_user: User = Depends(get_current_active_user)):
    return {
        "kyc_status": current_user.kyc_status,
        "is_verified": current_user.is_verified,
        "metamap_verification_id": current_user.metamap_verification_id,
        "kyc_document_front": current_user.kyc_document_front,
        "kyc_document_back": current_user.kyc_document_back,
    }


@router.post("/submit-documents")
async def submit_kyc_documents(
    front: UploadFile = File(...),
    back: UploadFile = File(...),
    ghana_card_number: str = Form(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.account_type != AccountType.CITIZEN:
        raise HTTPException(status_code=400, detail="Only citizen Ghana Card verification is supported for this upload.")

    if not current_user.ghana_card_hash:
        raise HTTPException(
            status_code=400,
            detail="No Ghana Card is linked to this account yet. Please update your profile first.",
        )
    provided_hash = hash_pii_lookup(_normalize_ghana_card(ghana_card_number))
    if provided_hash != current_user.ghana_card_hash:
        raise HTTPException(
            status_code=400,
            detail="This is not the Ghana Card registered with this account. Please use your registered Ghana Card.",
        )

    allowed_types = {"image/jpeg", "image/jpg", "image/png", "application/pdf"}
    if front.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Front document must be JPEG, PNG, or PDF.")
    if back.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Back document must be JPEG, PNG, or PDF.")

    front_content = await front.read()
    back_content = await back.read()

    max_size = 10 * 1024 * 1024
    if len(front_content) > max_size:
        raise HTTPException(status_code=400, detail="Front document must be less than 10MB.")
    if len(back_content) > max_size:
        raise HTTPException(status_code=400, detail="Back document must be less than 10MB.")

    front_upload = upload_bytes_to_cloudinary(
        front_content,
        folder="kyc_documents",
        filename=front.filename or "front",
        resource_type="image" if front.content_type != "application/pdf" else "raw",
    )
    back_upload = upload_bytes_to_cloudinary(
        back_content,
        folder="kyc_documents",
        filename=back.filename or "back",
        resource_type="image" if back.content_type != "application/pdf" else "raw",
    )

    current_user.kyc_document_front = front_upload["url"]
    current_user.kyc_document_back = back_upload["url"]
    current_user.kyc_status = KycStatus.PENDING
    db.commit()

    return {
        "message": "Ghana Card documents submitted successfully. Your identity is under review.",
        "kyc_status": current_user.kyc_status,
        "kyc_document_front": current_user.kyc_document_front,
        "kyc_document_back": current_user.kyc_document_back,
    }


@router.post("/request-documents")
def request_kyc_documents(
    user_id: int = Form(...),
    message: str = Form(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
    if target_user.role != UserRole.CITIZEN:
        raise HTTPException(status_code=400, detail="KYC document requests are only for citizens.")

    portal_url = f"{settings.FRONTEND_URL}/profile"
    sent = send_kyc_document_request_email(
        to_email=target_user.email,
        full_name=target_user.full_name,
        admin_message=message,
        portal_url=portal_url,
    )

    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send email. Check email configuration.")

    return {"message": f"Document request email sent to {target_user.email}."}
