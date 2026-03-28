from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.contact import ContactSubmission, SubmissionType, SubmissionStatus
from app.models.user import User, UserRole

router = APIRouter(prefix="/contact", tags=["Contact"])


class ContactSubmitRequest(BaseModel):
    submission_type: SubmissionType = SubmissionType.GENERAL
    name: str
    email: str
    phone: Optional[str] = None
    subject: str
    message: str


class FeedbackRequest(BaseModel):
    name: str
    email: str
    message: str
    rating: Optional[int] = None


class ContactStatusUpdate(BaseModel):
    status: SubmissionStatus


def _require_admin(current_user: User):
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF):
        raise HTTPException(status_code=403, detail="Admin access required")


@router.post("/", status_code=201)
def submit_contact(
    body: ContactSubmitRequest,
    db: Session = Depends(get_db),
):
    if not body.name.strip() or not body.email.strip() or not body.subject.strip() or not body.message.strip():
        raise HTTPException(status_code=422, detail="Name, email, subject, and message are required")
    reference = ContactSubmission.make_reference(body.submission_type)
    submission = ContactSubmission(
        reference=reference,
        submission_type=body.submission_type,
        name=body.name.strip(),
        email=body.email.strip().lower(),
        phone=body.phone,
        subject=body.subject.strip(),
        message=body.message.strip(),
        status=SubmissionStatus.NEW,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return {
        "reference": submission.reference,
        "message": "Your submission has been received. We will respond within 24 business hours.",
        "submission_type": submission.submission_type,
    }


@router.post("/feedback", status_code=201)
def submit_feedback(
    body: FeedbackRequest,
    db: Session = Depends(get_db),
):
    if not body.name.strip() or not body.email.strip() or not body.message.strip():
        raise HTTPException(status_code=422, detail="Name, email, and message are required")
    if body.rating is not None and not (1 <= body.rating <= 5):
        raise HTTPException(status_code=422, detail="Rating must be between 1 and 5")
    reference = ContactSubmission.make_reference(SubmissionType.FEEDBACK)
    submission = ContactSubmission(
        reference=reference,
        submission_type=SubmissionType.FEEDBACK,
        name=body.name.strip(),
        email=body.email.strip().lower(),
        subject="User Feedback",
        message=body.message.strip(),
        rating=body.rating,
        status=SubmissionStatus.NEW,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return {
        "reference": submission.reference,
        "message": "Thank you for your feedback. It helps us improve our services.",
    }


@router.get("/")
def list_submissions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[SubmissionStatus] = None,
    submission_type: Optional[SubmissionType] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    q = db.query(ContactSubmission)
    if status:
        q = q.filter(ContactSubmission.status == status)
    if submission_type:
        q = q.filter(ContactSubmission.submission_type == submission_type)
    total = q.count()
    items = q.order_by(ContactSubmission.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": s.id,
                "reference": s.reference,
                "submission_type": s.submission_type,
                "name": s.name,
                "email": s.email,
                "phone": s.phone,
                "subject": s.subject,
                "message": s.message,
                "rating": s.rating,
                "status": s.status,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in items
        ],
    }


@router.patch("/{submission_id}/status")
def update_status(
    submission_id: int,
    body: ContactStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    submission = db.query(ContactSubmission).filter(ContactSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    submission.status = body.status
    db.commit()
    return {"reference": submission.reference, "status": submission.status}
