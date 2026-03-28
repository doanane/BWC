from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_staff
from app.services.delivery_service import DeliveryService
from app.models.delivery import DeliveryStatus
from app.models.user import User

router = APIRouter(prefix="/deliveries", tags=["Deliveries"])


@router.post("/application/{application_id}")
def create_delivery(
    application_id: int,
    agent_id: Optional[int] = None,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    from app.models.application import Application
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return DeliveryService.create_delivery(db, application, agent_id)


@router.get("/track/{tracking_number}")
def track_delivery(
    tracking_number: str,
    db: Session = Depends(get_db)
):
    delivery = DeliveryService.get_delivery_by_tracking(db, tracking_number)
    return {
        "tracking_number": delivery.tracking_number,
        "status": delivery.status,
        "recipient_name": delivery.recipient_name,
        "delivery_address": delivery.delivery_address,
        "scheduled_date": delivery.scheduled_date,
        "delivered_at": delivery.delivered_at,
        "attempts": delivery.attempts_count,
        "events": [
            {
                "status": e.status,
                "description": e.description,
                "location": e.location,
                "timestamp": e.created_at
            }
            for e in delivery.tracking_events
        ]
    }


@router.post("/{delivery_id}/assign")
def assign_agent(
    delivery_id: int,
    agent_id: int,
    scheduled_date: Optional[datetime] = None,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return DeliveryService.assign_agent(db, delivery_id, agent_id, scheduled_date)


@router.post("/{delivery_id}/update-status")
def update_delivery_status(
    delivery_id: int,
    status: DeliveryStatus,
    description: Optional[str] = None,
    location: Optional[str] = None,
    failure_reason: Optional[str] = None,
    proof_of_delivery: Optional[str] = None,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return DeliveryService.update_delivery_status(
        db, delivery_id, status, current_user.id,
        description, location, failure_reason, proof_of_delivery
    )


@router.get("/my-deliveries")
def get_my_deliveries(
    status: Optional[DeliveryStatus] = None,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return DeliveryService.get_agent_deliveries(db, current_user.id, status)
