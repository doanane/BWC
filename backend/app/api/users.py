from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_admin, require_staff
from app.schemas.user import UserResponse, UserUpdate, UserListResponse, ChangePasswordRequest, AdminUpdateUser, StaffCreate
from app.schemas.common import PaginatedResponse, MessageResponse
from app.services.user_service import UserService
from app.models.user import KycStatus, User, UserRole, UserStatus
from app.models.application import Application, ApplicationStatus
from app.utils.cloudinary_storage import upload_bytes_to_cloudinary

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return UserService.update_profile(db, current_user, update_data)


@router.post("/profile/photo", response_model=UserResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if file.content_type not in ["image/jpeg", "image/jpg", "image/png"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are allowed")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Image must be less than 5MB")

    upload = upload_bytes_to_cloudinary(
        content,
        folder="profiles",
        filename=file.filename,
        resource_type="image",
    )

    return UserService.update_profile_photo(db, current_user, upload["url"])


@router.delete("/me", response_model=MessageResponse)
def delete_account(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    UserService.delete_account(db, current_user)
    return {"message": "Account deleted successfully"}


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    UserService.change_password(db, current_user, data.current_password, data.new_password)
    return {"message": "Password changed successfully"}


@router.get("/", response_model=PaginatedResponse)
def list_users(
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None,
    kyc_status: Optional[KycStatus] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return UserService.get_all_users(db, role, status, kyc_status, search, page, page_size)


@router.get("/stats")
def user_stats(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return UserService.get_user_stats(db)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    _: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return UserService.get_user_by_id(db, user_id)


@router.put("/{user_id}/admin-update", response_model=UserResponse)
def admin_update_user(
    user_id: int,
    update_data: AdminUpdateUser,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return UserService.admin_update_user(db, user_id, update_data)


@router.post("/staff/create", response_model=UserResponse)
def create_staff(
    staff_data: StaffCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return UserService.create_staff(db, staff_data)


@router.get("/staff/list")
def list_staff_members(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    staff = db.query(User).filter(
        User.role.in_([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
        User.is_active == True
    ).order_by(User.first_name).all()
    return [
        {
            "id": s.id,
            "name": f"{s.first_name or ''} {s.last_name or ''}".strip() or s.email,
            "email": s.email,
            "role": s.role.value,
        }
        for s in staff
    ]


@router.get("/staff/productivity")
def staff_productivity(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    staff_members = db.query(User).filter(
        User.role.in_([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
        User.is_active == True
    ).all()

    results = []
    for staff in staff_members:
        assigned_count = db.query(func.count(Application.id)).filter(
            Application.assigned_to_id == staff.id
        ).scalar() or 0

        completed_count = db.query(func.count(Application.id)).filter(
            Application.assigned_to_id == staff.id,
            Application.status.in_([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED])
        ).scalar() or 0

        in_progress_count = db.query(func.count(Application.id)).filter(
            Application.assigned_to_id == staff.id,
            Application.status.in_([ApplicationStatus.UNDER_REVIEW, ApplicationStatus.SUBMITTED])
        ).scalar() or 0

        results.append({
            "id": staff.id,
            "name": f"{staff.first_name or ''} {staff.last_name or ''}".strip() or staff.email,
            "email": staff.email,
            "role": staff.role.value,
            "assigned_total": assigned_count,
            "completed": completed_count,
            "in_progress": in_progress_count,
            "completion_rate": round((completed_count / assigned_count * 100) if assigned_count > 0 else 0, 1),
        })

    results.sort(key=lambda x: x["completed"], reverse=True)
    return results


@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    if target.role in (UserRole.SUPER_ADMIN,) and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only a super admin can delete another super admin")
    db.delete(target)
    db.commit()
    return {"message": f"User {target.email} has been permanently deleted"}
