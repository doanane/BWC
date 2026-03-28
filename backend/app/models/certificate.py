from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class CertificateStatus(str, enum.Enum):
    PENDING = "PENDING"
    GENERATED = "GENERATED"
    PRINTED = "PRINTED"
    READY = "READY"
    COLLECTED = "COLLECTED"
    DELIVERED = "DELIVERED"
    UNCOLLECTED = "UNCOLLECTED"
    PENALTY_APPLIED = "PENALTY_APPLIED"
    CANCELLED = "CANCELLED"


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True, nullable=False)
    certificate_number = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(Enum(CertificateStatus), default=CertificateStatus.PENDING, nullable=False)
    generated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    printed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    revoked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    file_path = Column(String(500), nullable=True)
    qr_code_data = Column(Text, nullable=True)
    qr_code_path = Column(String(500), nullable=True)
    blockchain_hash = Column(String(255), nullable=True)
    revocation_reason = Column(Text, nullable=True)
    replacement_certificate_id = Column(Integer, ForeignKey("certificates.id"), nullable=True)
    print_count = Column(Integer, default=0)
    generated_at = Column(DateTime(timezone=True), nullable=True)
    printed_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    application = relationship("Application", back_populates="certificate")
    generated_by = relationship("User", foreign_keys=[generated_by_id])
    printed_by = relationship("User", foreign_keys=[printed_by_id])
    revoked_by = relationship("User", foreign_keys=[revoked_by_id])
    replacement = relationship("Certificate", foreign_keys=[replacement_certificate_id])
