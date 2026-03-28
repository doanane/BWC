from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey, Float, Date, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ApplicationStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"
    PROCESSING = "PROCESSING"
    READY = "READY"
    COLLECTED = "COLLECTED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class ServicePlan(str, enum.Enum):
    NORMAL = "normal"
    EXPRESS = "express"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"


class DeliveryMethod(str, enum.Enum):
    PICKUP = "PICKUP"
    DELIVERY = "DELIVERY"


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_number = Column(String(50), unique=True, index=True, nullable=False)
    applicant_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.DRAFT, nullable=False)
    service_plan = Column(Enum(ServicePlan), default=ServicePlan.NORMAL, nullable=False)
    delivery_method = Column(Enum(DeliveryMethod), default=DeliveryMethod.PICKUP, nullable=False)

    child_first_name = Column(String(100), nullable=False)
    child_last_name = Column(String(100), nullable=False)
    child_other_names = Column(String(100), nullable=True)
    child_date_of_birth = Column(Date, nullable=False)
    child_gender = Column(Enum(Gender), nullable=False)
    child_place_of_birth = Column(String(200), nullable=False)
    child_region_of_birth = Column(String(100), nullable=False)
    child_district_of_birth = Column(String(100), nullable=False)
    child_nationality = Column(String(100), default="Ghanaian")
    child_birth_order = Column(Integer, nullable=True)

    father_first_name = Column(String(100), nullable=True)
    father_last_name = Column(String(100), nullable=True)
    father_other_names = Column(String(100), nullable=True)
    father_nationality = Column(String(100), nullable=True)
    father_date_of_birth = Column(Date, nullable=True)
    father_ghana_card = Column(String(50), nullable=True)
    father_occupation = Column(String(100), nullable=True)
    father_phone = Column(String(20), nullable=True)
    father_address = Column(Text, nullable=True)

    mother_first_name = Column(String(100), nullable=False)
    mother_last_name = Column(String(100), nullable=False)
    mother_other_names = Column(String(100), nullable=True)
    mother_nationality = Column(String(100), nullable=True)
    mother_date_of_birth = Column(Date, nullable=True)
    mother_ghana_card = Column(String(50), nullable=True)
    mother_occupation = Column(String(100), nullable=True)
    mother_phone = Column(String(20), nullable=True)
    mother_address = Column(Text, nullable=True)

    informant_name = Column(String(200), nullable=True)
    informant_relationship = Column(String(100), nullable=True)
    informant_phone = Column(String(20), nullable=True)
    informant_address = Column(Text, nullable=True)

    hospital_name = Column(String(200), nullable=True)
    hospital_address = Column(Text, nullable=True)
    attending_physician = Column(String(200), nullable=True)

    delivery_address = Column(Text, nullable=True)
    delivery_region = Column(String(100), nullable=True)
    delivery_district = Column(String(100), nullable=True)
    delivery_digital_address = Column(String(50), nullable=True)
    delivery_fee = Column(Float, default=0.0)
    delivery_notes = Column(Text, nullable=True)

    processing_fee = Column(Float, nullable=False, default=0.0)
    total_fee = Column(Float, nullable=False, default=0.0)

    rejection_reason = Column(Text, nullable=True)
    additional_info_request = Column(Text, nullable=True)
    staff_notes = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)

    expected_ready_date = Column(DateTime(timezone=True), nullable=True)
    ready_at = Column(DateTime(timezone=True), nullable=True)
    collection_deadline = Column(DateTime(timezone=True), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    printed_at = Column(DateTime(timezone=True), nullable=True)
    collected_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    extra_data = Column(JSON, nullable=True)

    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    assignment_note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    applicant = relationship("User", back_populates="applications", foreign_keys=[applicant_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    documents = relationship("Document", back_populates="application")
    certificate = relationship("Certificate", back_populates="application", uselist=False)
    payments = relationship("Payment", back_populates="application")
    penalties = relationship("Penalty", back_populates="application")
    delivery = relationship("Delivery", back_populates="application", uselist=False)
    status_history = relationship("ApplicationStatusHistory", back_populates="application")
    notifications = relationship("Notification", back_populates="application")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    from_status = Column(Enum(ApplicationStatus), nullable=True)
    to_status = Column(Enum(ApplicationStatus), nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("Application", back_populates="status_history")
    changed_by = relationship("User")
