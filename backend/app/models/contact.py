import enum
import random
import string
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text, func
from app.core.database import Base


class SubmissionType(str, enum.Enum):
    COMPLAINT = "COMPLAINT"
    FEEDBACK = "FEEDBACK"
    GENERAL = "GENERAL"


class SubmissionStatus(str, enum.Enum):
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


def _make_reference(prefix: str) -> str:
    date_str = datetime.utcnow().strftime("%Y%m%d")
    rand = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}-{date_str}-{rand}"


class ContactSubmission(Base):
    __tablename__ = "contact_submissions"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(40), unique=True, nullable=False)
    submission_type = Column(
        Enum(SubmissionType, name="submissiontype"),
        default=SubmissionType.GENERAL,
        nullable=False,
    )
    name = Column(String(120), nullable=False)
    email = Column(String(180), nullable=False)
    phone = Column(String(30), nullable=True)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    rating = Column(Integer, nullable=True)
    status = Column(
        Enum(SubmissionStatus, name="submissionstatus"),
        default=SubmissionStatus.NEW,
        nullable=False,
    )
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    @staticmethod
    def make_reference(submission_type: SubmissionType) -> str:
        prefix_map = {
            SubmissionType.COMPLAINT: "COMP",
            SubmissionType.FEEDBACK: "FB",
            SubmissionType.GENERAL: "MSG",
        }
        return _make_reference(prefix_map.get(submission_type, "MSG"))
