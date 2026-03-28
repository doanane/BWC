from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import Optional
import hmac, hashlib
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_admin
from app.schemas.payment import InitiatePaymentRequest, PaymentResponse, RefundRequest, PaymentInitiatedResponse
from app.services.payment_service import PaymentService
from app.models.user import User
from app.core.config import settings

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/initiate", response_model=PaymentInitiatedResponse)
def initiate_payment(
    data: InitiatePaymentRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return PaymentService.initiate_payment(db, current_user.id, data)


@router.get("/verify/{reference}", response_model=PaymentResponse)
def verify_payment(
    reference: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return PaymentService.verify_payment(db, reference, current_user.id)


@router.post("/webhook/paystack")
async def paystack_webhook(
    request: Request,
    x_paystack_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    body = await request.body()

    if x_paystack_signature and settings.PAYSTACK_SECRET_KEY:
        expected = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode(),
            body,
            hashlib.sha512
        ).hexdigest()

        if not hmac.compare_digest(expected, x_paystack_signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    import json
    payload = json.loads(body)
    event = payload.get("event")
    data = payload.get("data", {})
    reference = data.get("reference", "")

    if event == "charge.success" and reference.startswith("STAT-"):
        from app.api.statistics import auto_fulfill_by_ref
        auto_fulfill_by_ref(db, reference)
    else:
        PaymentService.handle_webhook(db, event, data)

    return {"status": "ok"}


@router.post("/{payment_id}/refund", response_model=PaymentResponse)
def request_refund(
    payment_id: int,
    data: RefundRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return PaymentService.request_refund(db, payment_id, current_user.id, data)


@router.get("/application/{application_id}")
def get_application_payments(
    application_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return PaymentService.get_payment_history(db, application_id, current_user.id)


@router.get("/plans/pricing")
def get_pricing():
    return {
        "normal": {
            "processing_days": settings.NORMAL_PROCESSING_DAYS,
            "fee": settings.NORMAL_PROCESSING_FEE,
            "description": "Standard processing - 30 working days"
        },
        "express": {
            "processing_days": settings.EXPRESS_PROCESSING_DAYS,
            "fee": settings.EXPRESS_PROCESSING_FEE,
            "description": "Express processing - 7 working days"
        },
        "delivery_fee": settings.DELIVERY_BASE_FEE,
        "penalty_daily_rate": settings.PENALTY_DAILY_RATE,
        "penalty_grace_period_days": settings.PENALTY_GRACE_PERIOD_DAYS,
        "currency": "GHS"
    }
