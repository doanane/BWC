from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class DocumentType(str, enum.Enum):
    BIRTH_NOTIFICATION = "birth_notification"
    PARENT_GHANA_CARD = "parent_ghana_card"
    HOSPITAL_RECORD = "hospital_record"
    AFFIDAVIT = "affidavit"
    MARRIAGE_CERTIFICATE = "marriage_certificate"
    PASSPORT_PHOTO = "passport_photo"
    OTHER = "other"


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    document_type = Column(Enum(DocumentType), nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.PENDING, nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_hash = Column(String(64), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    application = relationship("Application", back_populates="documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])
