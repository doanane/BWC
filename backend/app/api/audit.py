from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app.core.database import get_db
from app.core.dependencies import require_admin, require_staff
from app.models.audit import AuditLog, AuditAction
from app.models.user import User

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/logs")
def get_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[AuditAction] = None,
    resource_type: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    from sqlalchemy import func
    query = db.query(AuditLog)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if from_date:
        query = query.filter(func.date(AuditLog.created_at) >= from_date)
    if to_date:
        query = query.filter(func.date(AuditLog.created_at) <= to_date)

    total = query.count()
    items = query.order_by(AuditLog.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


def log_action(
    db: Session,
    action: AuditAction,
    resource_type: str,
    user_id: int = None,
    resource_id: str = None,
    description: str = None,
    old_values: dict = None,
    new_values: dict = None,
    request: Request = None
):
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        description=description,
        old_values=old_values,
        new_values=new_values,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
        endpoint=str(request.url) if request else None,
        http_method=request.method if request else None
    )
    db.add(log)
    db.commit()
