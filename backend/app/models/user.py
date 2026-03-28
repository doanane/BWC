from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    CITIZEN = "citizen"
    STAFF = "staff"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class AccountType(str, enum.Enum):
    CITIZEN = "citizen"
    RESIDENT = "resident"
    REFUGEE = "refugee"
    DIPLOMAT = "diplomat"
    FOREIGNER = "foreigner"


class KycStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone_number = Column(String(30), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    other_names = Column(String(100), nullable=True)
    ghana_card_number = Column(String(500), nullable=True)
    ghana_card_hash = Column(String(64), nullable=True, index=True)
    login_attempts = Column(Integer, default=0, nullable=False, server_default="0")
    locked_until = Column(DateTime(timezone=True), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.CITIZEN, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING_VERIFICATION, nullable=False)
    account_type = Column(Enum(AccountType), default=AccountType.CITIZEN, nullable=False)
    kyc_status = Column(Enum(KycStatus), default=KycStatus.NOT_STARTED, nullable=False)
    metamap_verification_id = Column(String(100), nullable=True)
    kyc_document_front = Column(String(500), nullable=True)
    kyc_document_back = Column(String(500), nullable=True)
    nationality = Column(String(100), nullable=True)
    passport_number = Column(String(50), nullable=True)
    permit_number = Column(String(50), nullable=True)
    permit_type = Column(String(50), nullable=True)
    unhcr_number = Column(String(50), nullable=True)
    diplomatic_id = Column(String(50), nullable=True)
    embassy_mission = Column(String(200), nullable=True)
    visa_type = Column(String(50), nullable=True)
    date_of_birth = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255), nullable=True)
    phone_verification_code = Column(String(10), nullable=True)
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    profile_photo = Column(String(500), nullable=True)
    region = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    notification_email = Column(Boolean, default=True)
    notification_sms = Column(Boolean, default=True)
    notification_push = Column(Boolean, default=True)
    accessibility_preferences = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    applications = relationship("Application", back_populates="applicant", foreign_keys="Application.applicant_id")
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    staff_profile = relationship(
        "StaffProfile",
        back_populates="user",
        uselist=False,
        foreign_keys="StaffProfile.user_id",
    )

    @property
    def full_name(self):
        names = [self.first_name]
        if self.other_names:
            names.append(self.other_names)
        names.append(self.last_name)
        return " ".join(names)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(500), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="refresh_tokens")


class StaffProfile(Base):
    __tablename__ = "staff_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    staff_id = Column(String(50), unique=True, nullable=False)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)
    office_location = Column(String(200), nullable=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    can_approve = Column(Boolean, default=False)
    can_reject = Column(Boolean, default=False)
    can_print = Column(Boolean, default=False)
    can_deliver = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="staff_profile", foreign_keys=[user_id])
