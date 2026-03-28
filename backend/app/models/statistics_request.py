from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class StatisticsRequest(Base):
    __tablename__ = "statistics_requests"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(60), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    org_name = Column(String(255), nullable=False)
    org_type = Column(String(50), nullable=False)
    contact_person = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    purpose = Column(Text, nullable=False)
    data_types = Column(JSON, nullable=False, default=list)
    period_from = Column(String(10), nullable=False)
    period_to = Column(String(10), nullable=False)
    format = Column(String(20), nullable=False, default="pdf")
    fee_amount = Column(Float, default=0.0)
    payment_status = Column(String(20), default="free")
    approval_status = Column(String(20), default="pending")
    paystack_ref = Column(String(120), nullable=True)
    authorization_url = Column(String(600), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
