from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class DeliveryStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    ASSIGNED = "ASSIGNED"
    PICKED_UP = "PICKED_UP"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True, nullable=False)
    tracking_number = Column(String(50), unique=True, nullable=False)
    status = Column(Enum(DeliveryStatus), default=DeliveryStatus.PENDING, nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recipient_name = Column(String(200), nullable=False)
    recipient_phone = Column(String(20), nullable=False)
    delivery_address = Column(Text, nullable=False)
    delivery_region = Column(String(100), nullable=False)
    delivery_district = Column(String(100), nullable=False)
    digital_address = Column(String(50), nullable=True)
    delivery_fee = Column(Float, nullable=False)
    delivery_notes = Column(Text, nullable=True)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    attempted_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    proof_of_delivery = Column(String(500), nullable=True)
    recipient_signature = Column(Text, nullable=True)
    attempts_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    application = relationship("Application", back_populates="delivery")
    agent = relationship("User", foreign_keys=[agent_id])
    tracking_events = relationship("DeliveryTrackingEvent", back_populates="delivery")


class DeliveryTrackingEvent(Base):
    __tablename__ = "delivery_tracking_events"

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(DeliveryStatus), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(200), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    delivery = relationship("Delivery", back_populates="tracking_events")
    updated_by = relationship("User", foreign_keys=[updated_by_id])
