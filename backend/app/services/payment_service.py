from datetime import datetime, timezone, timedelta
import logging
import random

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import requests

from app.core.config import settings
from app.core.security import generate_receipt_number
from app.models.application import Application, ApplicationStatus
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.penalty import Penalty, PenaltyStatus
from app.models.user import User
from app.schemas.payment import InitiatePaymentRequest, RefundRequest
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class PaymentService:
    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _generate_reference() -> str:
        return f"PAY-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"

    @staticmethod
    def _paystack_headers() -> dict:
        return {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _find_payment_by_reference(db: Session, reference: str) -> Payment | None:
        return (
            db.query(Payment)
            .filter((Payment.reference == reference) | (Payment.paystack_reference == reference))
            .first()
        )

    @staticmethod
    def _calculate_amount(db: Session, application: Application, payment_type: PaymentType) -> float:
        if payment_type == PaymentType.APPLICATION_FEE:
            return float(application.total_fee or 0)
        if payment_type == PaymentType.DELIVERY_FEE:
            return float(application.delivery_fee or 0)
        if payment_type == PaymentType.PENALTY_FEE:
            penalty = (
                db.query(Penalty)
                .filter(
                    Penalty.application_id == application.id,
                    Penalty.status == PenaltyStatus.ACTIVE,
                )
                .order_by(Penalty.created_at.desc())
                .first()
            )
            if not penalty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No active penalty found for this application",
                )
            return float(penalty.total_amount or 0)
        return float(application.processing_fee or 0)

    @staticmethod
    def _mark_payment_completed(db: Session, payment: Payment, gateway_payload: dict | None = None) -> Payment:
        payment.status = PaymentStatus.COMPLETED
        payment.paid_at = PaymentService._now()
        payment.gateway_response = gateway_payload or payment.gateway_response
        if not payment.receipt_number:
            payment.receipt_number = generate_receipt_number()

        application = payment.application
        if application and application.status in [
            ApplicationStatus.DRAFT,
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.PAYMENT_PENDING,
        ]:
            application.status = ApplicationStatus.PAYMENT_COMPLETED

        db.add(payment)
        db.commit()
        db.refresh(payment)

        user = db.query(User).filter(User.id == payment.user_id).first()
        if user:
            title = "Payment received"
            message = f"Your payment {payment.reference} was successful. Receipt: {payment.receipt_number}."
            NotificationService.create_notification(
                db,
                user.id,
                "payment_received",
                "in_app",
                title,
                message,
                application_id=payment.application_id,
            )
            if user.notification_email:
                NotificationService.create_notification(
                    db,
                    user.id,
                    "payment_received",
                    "email",
                    title,
                    message,
                    application_id=payment.application_id,
                )

        if application:
            NotificationService.notify_staff_and_admin(
                db=db,
                title="Payment Confirmed - Ready for Processing",
                message=(
                    f"Payment for application {application.application_number} has been confirmed. "
                    "The case can proceed to processing."
                ),
                notification_type="payment_received",
                application_id=application.id,
                data={
                    "application_id": application.id,
                    "reference": application.application_number,
                    "payment_reference": payment.reference,
                    "event": "payment_completed",
                },
            )

        return payment

    @staticmethod
    def initiate_payment(db: Session, user_id: int, data: InitiatePaymentRequest):
        application = db.query(Application).filter(Application.id == data.application_id).first()
        if not application:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        if application.applicant_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot pay for this application")

        amount = PaymentService._calculate_amount(db, application, data.payment_type)
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount must be greater than zero",
            )

        reference = PaymentService._generate_reference()
        payment = Payment(
            application_id=application.id,
            user_id=user_id,
            payment_type=data.payment_type,
            status=PaymentStatus.PENDING,
            channel=data.channel,
            mobile_money_provider=data.mobile_money_provider,
            amount=amount,
            currency="GHS",
            reference=reference,
            mobile_number=data.mobile_number,
            expires_at=PaymentService._now() + timedelta(hours=24),
        )
        db.add(payment)

        application.status = ApplicationStatus.PAYMENT_PENDING
        db.commit()
        db.refresh(payment)

        if settings.PAYSTACK_SECRET_KEY:
            user = db.query(User).filter(User.id == user_id).first()
            callback_url = data.callback_url or f"{settings.FRONTEND_URL}/payment"
            payload = {
                "email": user.email if user else "customer@registry.gov.gh",
                "amount": int(round(amount * 100)),
                "reference": reference,
                "currency": "GHS",
                "callback_url": callback_url,
                "metadata": {
                    "application_id": application.id,
                    "user_id": user_id,
                    "payment_type": data.payment_type.value,
                },
            }

            try:
                res = requests.post(
                    f"{settings.PAYSTACK_BASE_URL}/transaction/initialize",
                    headers=PaymentService._paystack_headers(),
                    json=payload,
                    timeout=20,
                )
                response_data = res.json()
                if not res.ok or not response_data.get("status"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=response_data.get("message", "Failed to initialize payment"),
                    )

                init_data = response_data.get("data", {})
                payment.status = PaymentStatus.PROCESSING
                payment.paystack_reference = init_data.get("reference")
                payment.gateway_response = response_data
                db.add(payment)
                db.commit()
                db.refresh(payment)

                NotificationService.create_notification(
                    db,
                    user_id,
                    "payment_required",
                    "in_app",
                    "Payment initiated",
                    f"Complete payment for application {application.application_number}",
                    application_id=application.id,
                )

                return {
                    "payment_id": payment.id,
                    "reference": payment.reference,
                    "amount": payment.amount,
                    "currency": payment.currency,
                    "authorization_url": init_data.get("authorization_url"),
                    "access_code": init_data.get("access_code"),
                    "message": "Payment initialized successfully",
                }
            except HTTPException:
                raise
            except Exception as exc:
                logger.exception("Paystack initialize failed for payment %s: %s", payment.id, exc)
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Payment gateway initialization failed",
                )

        return {
            "payment_id": payment.id,
            "reference": payment.reference,
            "amount": payment.amount,
            "currency": payment.currency,
            "authorization_url": None,
            "access_code": None,
            "message": "Payment created. Configure PAYSTACK_SECRET_KEY to enable live checkout.",
        }

    @staticmethod
    def verify_payment(db: Session, reference: str, user_id: int | None = None):
        payment = PaymentService._find_payment_by_reference(db, reference)
        if not payment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
        if user_id is not None and payment.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        if payment.status in [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED]:
            return payment

        if settings.PAYSTACK_SECRET_KEY:
            verify_ref = payment.paystack_reference or payment.reference
            try:
                res = requests.get(
                    f"{settings.PAYSTACK_BASE_URL}/transaction/verify/{verify_ref}",
                    headers=PaymentService._paystack_headers(),
                    timeout=20,
                )
                response_data = res.json()
                if not res.ok or not response_data.get("status"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=response_data.get("message", "Payment verification failed"),
                    )

                tx_data = response_data.get("data", {})
                tx_status = str(tx_data.get("status", "")).lower()
                payment.gateway_response = response_data
                payment.paystack_reference = tx_data.get("reference") or payment.paystack_reference

                if tx_status == "success":
                    return PaymentService._mark_payment_completed(db, payment, response_data)

                if tx_status in ["failed", "abandoned"]:
                    payment.status = PaymentStatus.FAILED
                else:
                    payment.status = PaymentStatus.PROCESSING

                db.add(payment)
                db.commit()
                db.refresh(payment)
                return payment
            except HTTPException:
                raise
            except Exception as exc:
                logger.exception("Payment verification failed for %s: %s", reference, exc)
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unable to verify payment at this time",
                )

        return PaymentService._mark_payment_completed(db, payment, {"mode": "simulated"})

    @staticmethod
    def handle_webhook(db: Session, event: str, data: dict):
        reference = data.get("reference")
        if not reference:
            return

        payment = PaymentService._find_payment_by_reference(db, reference)
        if not payment:
            logger.warning("Webhook received for unknown reference %s", reference)
            return

        if event in ["charge.success", "transaction.success"]:
            PaymentService._mark_payment_completed(db, payment, data)
            return

        if event in ["charge.failed", "charge.abandoned"]:
            payment.status = PaymentStatus.FAILED
            payment.gateway_response = data
            db.add(payment)
            db.commit()

    @staticmethod
    def request_refund(db: Session, payment_id: int, user_id: int, data: RefundRequest):
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
        if payment.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
        if payment.status != PaymentStatus.COMPLETED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only completed payments can be refunded")

        refund_amount = float(data.amount if data.amount is not None else payment.amount)
        if refund_amount <= 0 or refund_amount > float(payment.amount):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid refund amount")

        if settings.PAYSTACK_SECRET_KEY:
            payload = {
                "transaction": payment.paystack_reference or payment.reference,
                "amount": int(round(refund_amount * 100)),
                "currency": payment.currency,
                "customer_note": data.reason,
            }
            try:
                res = requests.post(
                    f"{settings.PAYSTACK_BASE_URL}/refund",
                    headers=PaymentService._paystack_headers(),
                    json=payload,
                    timeout=20,
                )
                response_data = res.json()
                if not res.ok or not response_data.get("status"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=response_data.get("message", "Refund request failed"),
                    )
                payment.gateway_response = response_data
            except HTTPException:
                raise
            except Exception as exc:
                logger.exception("Refund request failed for payment %s: %s", payment.id, exc)
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unable to process refund at this time",
                )

        payment.status = PaymentStatus.REFUNDED
        payment.refund_amount = refund_amount
        payment.refund_reason = data.reason
        payment.refunded_at = PaymentService._now()
        db.add(payment)
        db.commit()
        db.refresh(payment)

        NotificationService.create_notification(
            db,
            user_id,
            "system_announcement",
            "in_app",
            "Refund processed",
            f"Refund of GHS {refund_amount:.2f} has been processed for payment {payment.reference}.",
            application_id=payment.application_id,
        )

        return payment

    @staticmethod
    def get_payment_history(db: Session, application_id: int, user_id: int):
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        if application.applicant_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        payments = (
            db.query(Payment)
            .filter(Payment.application_id == application_id)
            .order_by(Payment.created_at.desc())
            .all()
        )
        return [
            {
                "id": p.id,
                "application_id": p.application_id,
                "payment_type": p.payment_type.value,
                "status": p.status.value,
                "channel": p.channel.value if p.channel else None,
                "amount": p.amount,
                "currency": p.currency,
                "reference": p.reference,
                "paystack_reference": p.paystack_reference,
                "receipt_number": p.receipt_number,
                "mobile_number": p.mobile_number,
                "paid_at": p.paid_at,
                "created_at": p.created_at,
            }
            for p in payments
        ]
