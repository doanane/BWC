from fastapi import APIRouter, Depends, Query, HTTPException, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_staff, require_admin
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate, ApplicationResponse,
    ApplicationListResponse, ApplicationStatusUpdate, ApplicationSearchParams,
    DeathApplicationCreate,
)
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.application_service import ApplicationService
from app.services.notification_service import NotificationService
from app.services.realtime_service import notification_ws_manager
from app.models.user import User, UserRole
from app.models.application import ApplicationStatus, ServicePlan, Application
from app.models.chat import ApplicationChat

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post("/", response_model=ApplicationResponse, status_code=201)
def create_application(
    data: ApplicationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    application = ApplicationService.create_application(db, current_user.id, data)
    return application


@router.post("/death", response_model=ApplicationResponse, status_code=201)
def create_death_application(
    data: DeathApplicationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    application = ApplicationService.create_death_application(db, current_user.id, data)
    return application


@router.get("/", response_model=PaginatedResponse)
def list_applications(
    status: Optional[ApplicationStatus] = None,
    service_plan: Optional[ServicePlan] = None,
    search: Optional[str] = None,
    child_first_name: Optional[str] = None,
    child_last_name: Optional[str] = None,
    application_number: Optional[str] = None,
    region: Optional[str] = None,
    district: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    params = ApplicationSearchParams(
        status=status,
        service_plan=service_plan,
        search=search,
        child_first_name=child_first_name,
        child_last_name=child_last_name,
        application_number=application_number,
        region=region,
        district=district,
        from_date=from_date,
        to_date=to_date,
        page=page,
        page_size=page_size
    )
    return ApplicationService.search_applications(db, params, current_user)


@router.get("/my", response_model=PaginatedResponse)
def my_applications(
    status: Optional[ApplicationStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    params = ApplicationSearchParams(
        status=status,
        page=page,
        page_size=page_size
    )
    return ApplicationService.search_applications(db, params, current_user)


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user.role == UserRole.CITIZEN else None
    return ApplicationService.get_application(db, application_id, user_id)


@router.get("/track/{application_number}")
def track_application(
    application_number: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return ApplicationService.track_application(db, application_number, current_user)


@router.put("/{application_id}", response_model=ApplicationResponse)
def update_application(
    application_id: int,
    data: ApplicationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return ApplicationService.update_application(db, application_id, current_user, data)


@router.post("/{application_id}/submit", response_model=ApplicationResponse)
def submit_application(
    application_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    application = ApplicationService.submit_application(db, application_id, current_user)
    NotificationService.notify_application_submitted(db, application, current_user)

    extra = application.extra_data or {}
    app_type = str(extra.get("application_type") or "application").replace("_", " ").title()
    submitter_name = f"{current_user.first_name} {current_user.last_name}".strip()
    NotificationService.notify_staff_and_admin(
        db=db,
        title="New Application Requires Review",
        message=(
            f"{app_type} {application.application_number} was submitted by {submitter_name}. "
            "Please review and move it to Under Review."
        ),
        notification_type="application_submitted",
        application_id=application.id,
        data={
            "application_id": application.id,
            "reference": application.application_number,
            "event": "application_submitted",
        },
    )

    from app.models.user import UserRole as _UR
    _staff_ids = [
        row[0] for row in db.query(User.id).filter(
            User.role.in_([_UR.STAFF, _UR.ADMIN, _UR.SUPER_ADMIN]),
            User.is_active == True,
        ).all()
    ]
    _ws_payload = {
        "type": "application_submitted",
        "application_id": application.id,
        "reference": application.application_number,
        "applicant": submitter_name,
        "app_type": app_type,
    }
    try:
        import anyio.from_thread
        anyio.from_thread.run(notification_ws_manager.broadcast_to_user_ids, _staff_ids, _ws_payload)
    except Exception:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(notification_ws_manager.broadcast_to_user_ids(_staff_ids, _ws_payload))
        except Exception:
            pass

    return application


@router.post("/{application_id}/cancel", response_model=ApplicationResponse)
def cancel_application(
    application_id: int,
    reason: str = Body(..., embed=True),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return ApplicationService.cancel_application(db, application_id, current_user, reason)


@router.post("/{application_id}/confirm-collection", response_model=ApplicationResponse)
def confirm_collection(
    application_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return ApplicationService.confirm_collection_or_delivery(db, application_id, current_user)


class RequestMoreInfoBody(BaseModel):
    message: str
    staff_note: Optional[str] = None


@router.post("/{application_id}/request-info")
def request_more_info(
    application_id: int,
    body: RequestMoreInfoBody,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    message = body.message.strip()
    staff_note = (body.staff_note or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    app.additional_info_request = message
    db.commit()

    applicant = app.applicant
    if applicant:
        in_app_msg = f"Your application {app.application_number} requires additional information."
        if applicant.email:
            in_app_msg += " Please check your email and reply with the required documents."
        else:
            in_app_msg += f" Details: {message[:200]}"

        NotificationService.create_notification(
            db=db,
            user_id=applicant.id,
            notification_type="application_update",
            channel="in_app",
            title="Additional Information Required",
            message=in_app_msg,
            application_id=application_id,
            data={"application_id": application_id, "reference": app.application_number},
        )
        if applicant.email:
            email_body = (
                f"{message}\n\n"
                "--- HOW TO SUBMIT YOUR DOCUMENTS ---\n"
                "Please reply to this email with the required documents attached, "
                "or submit them in person at your nearest BDR office.\n\n"
                f"Reference your application number in the subject: {app.application_number}\n\n"
                "Contact us:\n"
                "Tel: +233 302 664 001\n"
                "Email: info@bdregistry.gov.gh\n"
                "Online: https://bdregistry.gov.gh"
            )
            NotificationService.create_notification(
                db=db,
                user_id=applicant.id,
                notification_type="application_update",
                channel="email",
                title=f"Additional Information Required — {app.application_number}",
                message=email_body,
                application_id=application_id,
                data={"application_id": application_id, "reference": app.application_number},
            )

    staff_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    admin_message = (
        f"Staff {staff_name} has sent an 'Additional Information' request to the applicant for "
        f"application {app.application_number}."
    )
    if staff_note:
        admin_message += f"\n\nStaff note: {staff_note}"

    admins = db.query(User).filter(
        User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
        User.is_active == True,
    ).all()
    for admin in admins:
        NotificationService.create_notification(
            db=db,
            user_id=admin.id,
            notification_type="application_update",
            channel="in_app",
            title=f"Info Requested from Applicant — {app.application_number}",
            message=admin_message,
            application_id=application_id,
            data={"application_id": application_id, "reference": app.application_number, "staff_id": current_user.id, "staff_name": staff_name},
        )

    return {"sent": True, "application_number": app.application_number}


@router.post("/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    from app.api.audit import log_action
    from app.models.audit import AuditAction
    application = ApplicationService.staff_update_status(db, application_id, current_user, data)
    applicant = application.applicant
    if applicant:
        NotificationService.notify_status_changed(
            db, application, applicant, data.status, data.reason
        )
    log_action(
        db,
        action=AuditAction.STATUS_CHANGED,
        resource_type="application",
        user_id=current_user.id,
        resource_id=application_id,
        description=f"Status changed to {data.status.value}",
        new_values={"status": data.status.value, "reason": data.reason},
    )
    return application


@router.get("/{application_id}/history")
def get_status_history(
    application_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from app.models.application import ApplicationStatusHistory
    user_id = current_user.id if current_user.role == UserRole.CITIZEN else None
    ApplicationService.get_application(db, application_id, user_id)
    history = db.query(ApplicationStatusHistory).filter(
        ApplicationStatusHistory.application_id == application_id
    ).order_by(ApplicationStatusHistory.created_at.desc()).all()
    return history


@router.post("/admin/calculate-penalties")
def calculate_penalties(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    count = ApplicationService.calculate_penalties(db)
    return {"message": f"Penalty calculation completed", "applications_affected": count}


@router.post("/{application_id}/assign")
def assign_application(
    application_id: int,
    body: dict = Body(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    staff_id = body.get("staff_id")
    note = body.get("note", "")
    if staff_id:
        staff = db.query(User).filter(User.id == staff_id, User.role == UserRole.STAFF, User.is_active == True).first()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found")
        app.assigned_to_id = staff_id
        app.assigned_at = datetime.now(timezone.utc)
        app.assignment_note = note
        db.commit()
        NotificationService.create_notification(
            db=db,
            user_id=staff_id,
            notification_type="task_assigned",
            channel="in_app",
            title="Application Assigned to You",
            message=f"Application {app.application_number} has been assigned to you by {current_user.first_name or current_user.email}.",
            application_id=application_id,
            data={"application_id": application_id, "section": "queue", "reference": app.application_number},
        )
        return {"assigned": True, "staff_id": staff_id, "application_number": app.application_number}
    else:
        app.assigned_to_id = None
        app.assigned_at = None
        app.assignment_note = None
        db.commit()
        return {"assigned": False}


@router.post("/{application_id}/claim")
def claim_application(
    application_id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.assigned_to_id and app.assigned_to_id != current_user.id:
        raise HTTPException(status_code=409, detail="This application is already claimed by another staff member")
    app.assigned_to_id = current_user.id
    app.assigned_at = datetime.now(timezone.utc)
    app.assignment_note = "Self-claimed"
    db.commit()
    return {"claimed": True, "application_number": app.application_number}


@router.get("/{application_id}/chat")
def get_application_chat(
    application_id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    msgs = (
        db.query(ApplicationChat)
        .filter(ApplicationChat.application_id == application_id)
        .order_by(ApplicationChat.created_at.asc())
        .all()
    )
    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": (m.sender.first_name or "") + " " + (m.sender.last_name or ""),
            "sender_role": m.sender.role.value if m.sender else "unknown",
            "message": m.message,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in msgs
    ]


@router.post("/{application_id}/chat")
def send_application_chat(
    application_id: int,
    body: dict = Body(...),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    chat_msg = ApplicationChat(
        application_id=application_id,
        sender_id=current_user.id,
        message=message,
    )
    db.add(chat_msg)
    db.commit()
    db.refresh(chat_msg)
    return {
        "id": chat_msg.id,
        "sender_id": current_user.id,
        "sender_name": (current_user.first_name or "") + " " + (current_user.last_name or ""),
        "sender_role": current_user.role.value,
        "message": chat_msg.message,
        "created_at": chat_msg.created_at.isoformat() if chat_msg.created_at else None,
    }
