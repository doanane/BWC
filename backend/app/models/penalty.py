from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class PenaltyStatus(str, enum.Enum):
    ACTIVE = "active"
    PAID = "paid"
    WAIVED = "waived"
    CANCELLED = "cancelled"


class Penalty(Base):
    __tablename__ = "penalties"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    status = Column(Enum(PenaltyStatus), default=PenaltyStatus.ACTIVE, nullable=False)
    daily_rate = Column(Float, nullable=False)
    days_overdue = Column(Integer, default=0)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    grace_period_days = Column(Integer, nullable=False)
    grace_period_expires = Column(DateTime(timezone=True), nullable=False)
    waiver_requested = Column(Boolean, default=False)
    waiver_reason = Column(Text, nullable=True)
    waiver_approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    waiver_approved_at = Column(DateTime(timezone=True), nullable=True)
    last_calculated_at = Column(DateTime(timezone=True), nullable=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    application = relationship("Application", back_populates="penalties")
    waiver_approved_by = relationship("User", foreign_keys=[waiver_approved_by_id])
    payment = relationship("Payment", foreign_keys=[payment_id])
