import logging
import random
from datetime import datetime

import requests
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import List

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.statistics_request import StatisticsRequest
from app.models.user import User, UserRole
from app.services.notification_service import NotificationService
from app.utils.email import send_statistics_request_email, send_statistics_status_email
from app.utils.statistics_data import generate_statistics_data_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/statistics", tags=["Statistics"])


def _auto_fulfill(db: Session, req: StatisticsRequest, note: str = "") -> None:
    req.payment_status = "paid"
    req.approval_status = "fulfilled"
    db.commit()

    attachments = None
    try:
        file_bytes, filename, mime_type = generate_statistics_data_file(db, req)
        attachments = [{"filename": filename, "content": file_bytes, "mime_type": mime_type}]
    except Exception as exc:
        logger.warning("Auto-fulfill file generation failed: %s", exc)

    deliver_note = note or "Your payment has been confirmed. Your requested data is attached to this email."
    try:
        send_statistics_status_email(
            to_email=req.email,
            full_name=req.contact_person,
            reference=req.reference,
            org_name=req.org_name,
            approval_status="fulfilled",
            note=deliver_note,
            data_format=req.format,
            attachments=attachments,
        )
    except Exception as exc:
        logger.warning("Auto-fulfill email failed: %s", exc)

    if req.user_id:
        try:
            NotificationService.create_notification(
                db=db,
                user_id=req.user_id,
                notification_type="application_update",
                channel="in_app",
                title="Statistics Data Delivered",
                message=(
                    f"Your data for request {req.reference} has been delivered to {req.email}. "
                    "You can also download it directly from the portal."
                ),
                data={"reference": req.reference, "section": "statistics"},
            )
        except Exception:
            pass


def auto_fulfill_by_ref(db: Session, reference: str) -> bool:
    req = db.query(StatisticsRequest).filter(StatisticsRequest.reference == reference).first()
    if req and req.payment_status != "paid":
        _auto_fulfill(db, req, note="Payment confirmed via Paystack. Your data is attached.")
        return True
    return False

ORG_TYPE_FEES = {
    "government": 0.0,
    "academic": 50.0,
    "ngo": 50.0,
    "commercial": 200.0,
}


class StatisticsRequestIn(BaseModel):
    org_name: str
    org_type: str
    contact_person: str
    email: str
    purpose: str
    data_types: List[str]
    period_from: str
    period_to: str
    format: str = "pdf"


class StatisticsRequestOut(BaseModel):
    reference: str
    requires_payment: bool
    amount_ghs: float
    authorization_url: str | None = None
    message: str


def _generate_ref() -> str:
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    rnd = random.randint(100, 999)
    return f"STAT-{ts}-{rnd}"


def _paystack_init(email: str, amount_ghs: float, reference: str, callback_url: str) -> dict | None:
    if not settings.PAYSTACK_SECRET_KEY:
        return None
    try:
        resp = requests.post(
            f"{settings.PAYSTACK_BASE_URL}/transaction/initialize",
            headers={
                "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "email": email,
                "amount": int(amount_ghs * 100),
                "reference": reference,
                "callback_url": callback_url,
                "metadata": {"service": "statistics_data_request"},
            },
            timeout=10,
        )
        data = resp.json()
        if data.get("status"):
            return data.get("data", {})
    except Exception as exc:
        logger.exception("Paystack init for statistics failed: %s", exc)
    return None


def _notify_staff(db: Session, reference: str, org_name: str, org_type: str):
    staff_users = db.query(User).filter(
        User.role.in_([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
        User.is_active == True,
    ).all()
    for u in staff_users:
        try:
            NotificationService.create_notification(
                db=db,
                user_id=u.id,
                notification_type="system_announcement",
                channel="in_app",
                title="New Statistics Data Request",
                message=(
                    f"A new statistics data request ({reference}) has been submitted by "
                    f"{org_name} ({org_type}). Please review and approve via the admin panel."
                ),
                data={"reference": reference, "org_type": org_type, "section": "data-requests"},
            )
        except Exception as exc:
            logger.warning("Failed to notify user %s: %s", u.id, exc)


@router.post("/request", response_model=StatisticsRequestOut)
def submit_statistics_request(
    data: StatisticsRequestIn,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    org_type = data.org_type.lower()
    if org_type not in ORG_TYPE_FEES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid org_type. Must be government, academic, ngo, or commercial.",
        )

    fee = ORG_TYPE_FEES[org_type]
    reference = _generate_ref()
    authorization_url = None
    paystack_ref = None
    payment_status = "free"

    if fee > 0:
        callback_url = f"{settings.FRONTEND_URL}/services/statistics?payment=success&ref={reference}"
        init = _paystack_init(data.email, fee, reference, callback_url)
        if init:
            authorization_url = init.get("authorization_url")
            paystack_ref = init.get("reference")
            payment_status = "pending"
        else:
            payment_status = "pending_manual"

    req = StatisticsRequest(
        reference=reference,
        user_id=current_user.id,
        org_name=data.org_name,
        org_type=org_type,
        contact_person=data.contact_person,
        email=data.email,
        purpose=data.purpose,
        data_types=data.data_types,
        period_from=data.period_from,
        period_to=data.period_to,
        format=data.format,
        fee_amount=fee,
        payment_status=payment_status,
        paystack_ref=paystack_ref,
        authorization_url=authorization_url,
    )
    db.add(req)
    db.commit()

    _notify_staff(db, reference, data.org_name, org_type)

    try:
        send_statistics_request_email(
            to_email=data.email,
            full_name=data.contact_person,
            reference=reference,
            org_name=data.org_name,
            fee_amount=fee,
            format_type=data.format,
        )
    except Exception as exc:
        logger.warning("Statistics request email failed: %s", exc)

    msg = (
        "Your data request has been submitted. Our team will review and respond within 5 working days."
        if fee == 0
        else f"Your request has been submitted. Please complete your payment of GH\u20b5 {fee:.2f} to proceed."
    )

    return StatisticsRequestOut(
        reference=reference,
        requires_payment=fee > 0,
        amount_ghs=fee,
        authorization_url=authorization_url,
        message=msg,
    )


ADMIN_ROLES = (UserRole.ADMIN, UserRole.SUPER_ADMIN)


class StatisticsRequestDetail(BaseModel):
    id: int
    reference: str
    org_name: str
    org_type: str
    contact_person: str
    email: str
    purpose: str
    data_types: list
    period_from: str
    period_to: str
    format: str
    fee_amount: float
    payment_status: str
    approval_status: str
    paystack_ref: str | None
    created_at: str
    submitter_name: str | None = None
    submitter_email: str | None = None

    class Config:
        from_attributes = True


class StatisticsStatusUpdate(BaseModel):
    approval_status: str
    note: str = ""


@router.get("/admin/requests")
def admin_list_requests(
    page: int = 1,
    per_page: int = 20,
    org_type: str = "",
    payment_status: str = "",
    approval_status: str = "",
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admins only.")
    q = db.query(StatisticsRequest)
    if org_type:
        q = q.filter(StatisticsRequest.org_type == org_type.lower())
    if payment_status:
        q = q.filter(StatisticsRequest.payment_status == payment_status.lower())
    if approval_status:
        q = q.filter(StatisticsRequest.approval_status == approval_status.lower())
    total = q.count()
    items = q.order_by(StatisticsRequest.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    results = []
    for r in items:
        u = r.user
        results.append({
            "id": r.id,
            "reference": r.reference,
            "org_name": r.org_name,
            "org_type": r.org_type,
            "contact_person": r.contact_person,
            "email": r.email,
            "purpose": r.purpose,
            "data_types": r.data_types or [],
            "period_from": r.period_from,
            "period_to": r.period_to,
            "format": r.format,
            "fee_amount": r.fee_amount,
            "payment_status": r.payment_status,
            "approval_status": getattr(r, "approval_status", "pending"),
            "paystack_ref": r.paystack_ref,
            "created_at": r.created_at.isoformat() if r.created_at else "",
            "submitter_name": f"{u.first_name} {u.last_name}".strip() if u else None,
            "submitter_email": u.email if u else None,
        })
    return {"total": total, "page": page, "per_page": per_page, "items": results}


@router.get("/admin/requests/{reference}")
def admin_get_request(
    reference: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admins only.")
    req = db.query(StatisticsRequest).filter(StatisticsRequest.reference == reference).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    u = req.user
    return {
        "id": req.id,
        "reference": req.reference,
        "org_name": req.org_name,
        "org_type": req.org_type,
        "contact_person": req.contact_person,
        "email": req.email,
        "purpose": req.purpose,
        "data_types": req.data_types or [],
        "period_from": req.period_from,
        "period_to": req.period_to,
        "format": req.format,
        "fee_amount": req.fee_amount,
        "payment_status": req.payment_status,
        "approval_status": getattr(req, "approval_status", "pending"),
        "paystack_ref": req.paystack_ref,
        "created_at": req.created_at.isoformat() if req.created_at else "",
        "submitter_name": f"{u.first_name} {u.last_name}".strip() if u else None,
        "submitter_email": u.email if u else None,
    }


@router.patch("/admin/requests/{reference}/status")
def admin_update_request_status(
    reference: str,
    body: StatisticsStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admins only.")
    allowed = ("pending", "approved", "rejected", "fulfilled")
    if body.approval_status not in allowed:
        raise HTTPException(status_code=422, detail=f"approval_status must be one of {allowed}")
    req = db.query(StatisticsRequest).filter(StatisticsRequest.reference == reference).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if not hasattr(req, "approval_status"):
        raise HTTPException(status_code=500, detail="approval_status column missing. Run a DB migration.")
    req.approval_status = body.approval_status
    db.commit()

    status_labels = {
        "approved": "approved and is being processed",
        "rejected": "reviewed but could not be approved at this time",
        "fulfilled": "fulfilled — your data has been sent to your email",
        "pending": "returned to pending review",
    }
    status_label = status_labels.get(body.approval_status, body.approval_status)

    try:
        NotificationService.create_notification(
            db=db,
            user_id=req.user_id,
            notification_type="application_update",
            channel="in_app",
            title="Statistics Data Request Update",
            message=(
                f"Your data request {reference} has been {status_label}."
                + (f" Note: {body.note}" if body.note else "")
            ),
            data={"reference": reference, "approval_status": body.approval_status, "section": "statistics"},
        )
    except Exception:
        pass

    email_attachments = None
    if body.approval_status == "fulfilled":
        try:
            file_bytes, filename, mime_type = generate_statistics_data_file(db, req)
            email_attachments = [{"filename": filename, "content": file_bytes, "mime_type": mime_type}]
        except Exception as exc:
            logger.warning("Statistics data file generation failed: %s", exc)

    try:
        send_statistics_status_email(
            to_email=req.email,
            full_name=req.contact_person,
            reference=reference,
            org_name=req.org_name,
            approval_status=body.approval_status,
            note=body.note or "",
            data_format=req.format,
            attachments=email_attachments,
        )
    except Exception as exc:
        logger.warning("Statistics status email failed: %s", exc)

    return {"reference": reference, "approval_status": body.approval_status}


@router.post("/admin/requests/{reference}/mark-paid")
def admin_mark_paid(
    reference: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admins only.")
    req = db.query(StatisticsRequest).filter(StatisticsRequest.reference == reference).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    req.payment_status = "paid"
    db.commit()
    return {"reference": reference, "payment_status": "paid"}


@router.get("/download/{reference}")
def download_statistics_file(
    reference: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    req = db.query(StatisticsRequest).filter(StatisticsRequest.reference == reference).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.user_id != current_user.id and current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Access denied.")
    if req.fee_amount > 0 and req.payment_status != "paid":
        raise HTTPException(status_code=402, detail="Payment must be completed before download.")

    try:
        file_bytes, filename, mime_type = generate_statistics_data_file(db, req)
    except Exception as exc:
        logger.exception("Download file generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Could not generate data file.")

    return Response(
        content=file_bytes,
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/status/{reference}")
def get_statistics_request_status(
    reference: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    req = db.query(StatisticsRequest).filter(StatisticsRequest.reference == reference).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.user_id != current_user.id and current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Access denied.")
    return {
        "reference": req.reference,
        "payment_status": req.payment_status,
        "approval_status": getattr(req, "approval_status", "pending"),
        "fee_amount": req.fee_amount,
        "format": req.format,
        "data_types": req.data_types or [],
    }
