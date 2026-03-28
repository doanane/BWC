from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"


class PaymentType(str, enum.Enum):
    APPLICATION_FEE = "application_fee"
    DELIVERY_FEE = "delivery_fee"
    PENALTY_FEE = "penalty_fee"
    REPLACEMENT_FEE = "replacement_fee"


class PaymentChannel(str, enum.Enum):
    CARD = "card"
    MOBILE_MONEY = "mobile_money"
    BANK_TRANSFER = "bank_transfer"


class MobileMoneyProvider(str, enum.Enum):
    MTN = "mtn"
    VODAFONE = "vodafone"
    AIRTELTIGO = "airteltigo"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    payment_type = Column(Enum(PaymentType), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    channel = Column(Enum(PaymentChannel), nullable=True)
    mobile_money_provider = Column(Enum(MobileMoneyProvider), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="GHS")
    reference = Column(String(100), unique=True, nullable=False)
    paystack_reference = Column(String(100), nullable=True)
    receipt_number = Column(String(50), unique=True, nullable=True)
    mobile_number = Column(String(20), nullable=True)
    gateway_response = Column(JSON, nullable=True)
    refund_amount = Column(Float, nullable=True)
    refund_reason = Column(Text, nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    application = relationship("Application", back_populates="payments")
    user = relationship("User")
