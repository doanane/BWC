from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class NotificationType(str, enum.Enum):
    APPLICATION_SUBMITTED = "application_submitted"
    APPLICATION_UNDER_REVIEW = "application_under_review"
    APPLICATION_APPROVED = "application_approved"
    APPLICATION_REJECTED = "application_rejected"
    ADDITIONAL_INFO_REQUIRED = "additional_info_required"
    PAYMENT_REQUIRED = "payment_required"
    PAYMENT_RECEIVED = "payment_received"
    CERTIFICATE_READY = "certificate_ready"
    REMINDER_7_DAYS = "reminder_7_days"
    REMINDER_2_DAYS = "reminder_2_days"
    PENALTY_APPLIED = "penalty_applied"
    DELIVERY_SCHEDULED = "delivery_scheduled"
    DELIVERY_IN_TRANSIT = "delivery_in_transit"
    DELIVERY_COMPLETED = "delivery_completed"
    DELIVERY_FAILED = "delivery_failed"
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    PASSWORD_RESET = "password_reset"
    ACCOUNT_VERIFIED = "account_verified"


class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"
    PUSH = "push"


class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    READ = "read"


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_channel_created_at", "user_id", "channel", "created_at"),
        Index("ix_notifications_user_channel_status", "user_id", "channel", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    notification_type = Column(Enum(NotificationType), nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.PENDING, nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="notifications")
    application = relationship("Application", back_populates="notifications")
