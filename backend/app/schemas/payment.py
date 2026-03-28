from pydantic import BaseModel, field_validator
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.payment import PaymentStatus, PaymentType, PaymentChannel, MobileMoneyProvider


class InitiatePaymentRequest(BaseModel):
    application_id: int
    payment_type: PaymentType = PaymentType.APPLICATION_FEE
    channel: PaymentChannel
    mobile_number: Optional[str] = None
    mobile_money_provider: Optional[MobileMoneyProvider] = None
    callback_url: Optional[str] = None

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v):
        if v:
            import re
            if not re.match(r"^(\+233|0)[0-9]{9}$", v):
                raise ValueError("Invalid Ghana phone number")
        return v


class PaystackWebhookRequest(BaseModel):
    event: str
    data: Dict[str, Any]


class PaymentResponse(BaseModel):
    id: int
    application_id: int
    payment_type: PaymentType
    status: PaymentStatus
    channel: Optional[PaymentChannel] = None
    amount: float
    currency: str
    reference: str
    paystack_reference: Optional[str] = None
    receipt_number: Optional[str] = None
    mobile_number: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentInitiatedResponse(BaseModel):
    payment_id: int
    reference: str
    amount: float
    currency: str
    authorization_url: Optional[str] = None
    access_code: Optional[str] = None
    message: str


class RefundRequest(BaseModel):
    reason: str
    amount: Optional[float] = None
