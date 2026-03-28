import re

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import encrypt_pii, hash_password, hash_pii_lookup, verify_password
from app.models.user import KycStatus, StaffProfile, User, UserRole, UserStatus
from app.schemas.user import AdminUpdateUser, StaffCreate, UserResponse, UserUpdate


def _normalize_card(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[\s\-]", "", value).upper()


class UserService:
    @staticmethod
    def _serialize_user(user: User) -> dict:
        # Convert ORM model to a JSON-safe payload for paginated list responses.
        return UserResponse.model_validate(user).model_dump(mode="json")

    @staticmethod
    def update_profile(db: Session, current_user: User, update_data: UserUpdate) -> User:
        updates = update_data.model_dump(exclude_unset=True)

        if "phone_number" in updates and updates["phone_number"] != current_user.phone_number:
            existing = db.query(User).filter(User.phone_number == updates["phone_number"]).first()
            if existing and existing.id != current_user.id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already in use")

        if "ghana_card_number" in updates and updates["ghana_card_number"]:
            clean = _normalize_card(updates["ghana_card_number"])
            card_hash = hash_pii_lookup(clean)
            existing_card = db.query(User).filter(User.ghana_card_hash == card_hash).first()
            if existing_card and existing_card.id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This Ghana Card is already registered to another account.",
                )
            updates["ghana_card_number"] = encrypt_pii(clean)
            updates["ghana_card_hash"] = card_hash

        for key, value in updates.items():
            setattr(current_user, key, value)

        db.commit()
        db.refresh(current_user)
        return current_user

    @staticmethod
    def update_profile_photo(db: Session, current_user: User, path: str) -> User:
        current_user.profile_photo = path
        db.commit()
        db.refresh(current_user)
        return current_user

    @staticmethod
    def change_password(db: Session, current_user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, current_user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

        current_user.hashed_password = hash_password(new_password)
        db.commit()

    @staticmethod
    def delete_account(db: Session, user: User) -> None:
        db.delete(user)
        db.commit()

    @staticmethod
    def get_all_users(
        db: Session,
        role: UserRole | None,
        status_filter: UserStatus | None,
        kyc_status: KycStatus | None,
        search: str | None,
        page: int,
        page_size: int,
    ) -> dict:
        query = db.query(User)

        if role:
            query = query.filter(User.role == role)
        if status_filter:
            query = query.filter(User.status == status_filter)
        if kyc_status:
            query = query.filter(User.kyc_status == kyc_status)
        if search:
            term = f"%{search}%"
            query = query.filter(
                or_(
                    User.email.ilike(term),
                    User.first_name.ilike(term),
                    User.last_name.ilike(term),
                    User.phone_number.ilike(term),
                )
            )

        total = query.count()
        items = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        total_pages = (total + page_size - 1) // page_size if total else 0

        return {
            "items": [UserService._serialize_user(item) for item in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        }

    @staticmethod
    def get_user_stats(db: Session) -> dict:
        return {
            "total_users": db.query(User).count(),
            "active_users": db.query(User).filter(User.is_active == True).count(),
            "citizens": db.query(User).filter(User.role == UserRole.CITIZEN).count(),
            "staff": db.query(User).filter(User.role == UserRole.STAFF).count(),
            "admins": db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])).count(),
            "pending_verification": db.query(User).filter(User.status == UserStatus.PENDING_VERIFICATION).count(),
        }

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    @staticmethod
    def admin_update_user(db: Session, user_id: int, update_data: AdminUpdateUser) -> User:
        user = UserService.get_user_by_id(db, user_id)
        updates = update_data.model_dump(exclude_unset=True)

        for key, value in updates.items():
            setattr(user, key, value)

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def create_staff(db: Session, staff_data: StaffCreate) -> User:
        existing_email = db.query(User).filter(User.email == staff_data.email).first()
        if existing_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        if staff_data.phone_number:
            existing_phone = db.query(User).filter(User.phone_number == staff_data.phone_number).first()
            if existing_phone:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already registered")

        user = User(
            email=staff_data.email,
            phone_number=staff_data.phone_number,
            hashed_password=hash_password(staff_data.password),
            first_name=staff_data.first_name,
            last_name=staff_data.last_name,
            other_names=staff_data.other_names,
            role=staff_data.role if staff_data.role in [UserRole.STAFF, UserRole.ADMIN] else UserRole.STAFF,
            status=UserStatus.ACTIVE,
            is_active=True,
            is_verified=True,
            email_verified=True,
            phone_verified=bool(staff_data.phone_number),
            region=staff_data.region,
            district=staff_data.district,
            address=staff_data.address,
        )
        db.add(user)
        db.flush()

        profile = StaffProfile(
            user_id=user.id,
            staff_id=staff_data.staff_id or f"STF-{user.id:06d}",
            department=staff_data.department,
            designation=staff_data.designation,
            office_location=staff_data.office_location,
            can_approve=staff_data.can_approve,
            can_reject=staff_data.can_reject,
            can_print=staff_data.can_print,
            can_deliver=staff_data.can_deliver,
        )
        db.add(profile)

        db.commit()
        db.refresh(user)
        return user
