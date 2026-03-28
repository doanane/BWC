from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_admin
from app.models.penalty import Penalty, PenaltyStatus
from app.models.user import User

router = APIRouter(prefix="/penalties", tags=["Penalties"])


@router.get("/application/{application_id}")
def get_application_penalties(
    application_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return db.query(Penalty).filter(Penalty.application_id == application_id).all()


@router.get("/")
def list_penalties(
    status: PenaltyStatus = None,
    page: int = 1,
    page_size: int = 20,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Penalty)
    if status:
        query = query.filter(Penalty.status == status)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/{penalty_id}/request-waiver")
def request_waiver(
    penalty_id: int,
    reason: str = Body(..., embed=True),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    penalty = db.query(Penalty).filter(Penalty.id == penalty_id).first()
    if not penalty:
        raise HTTPException(status_code=404, detail="Penalty not found")

    if penalty.application.applicant_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    penalty.waiver_requested = True
    penalty.waiver_reason = reason
    db.commit()
    return {"message": "Waiver request submitted"}


@router.post("/{penalty_id}/approve-waiver")
def approve_waiver(
    penalty_id: int,
    approve: bool = True,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    from datetime import datetime, timezone
    penalty = db.query(Penalty).filter(Penalty.id == penalty_id).first()
    if not penalty:
        raise HTTPException(status_code=404, detail="Penalty not found")

    if approve:
        penalty.status = PenaltyStatus.WAIVED
        penalty.waiver_approved_by_id = admin.id
        penalty.waiver_approved_at = datetime.now(timezone.utc)
    else:
        penalty.waiver_requested = False
        penalty.waiver_reason = None

    db.commit()
    return {"message": "Waiver decision saved"}
