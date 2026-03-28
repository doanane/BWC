from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole, UserStatus, AccountType, KycStatus
from app.core.security import decrypt_pii
import re


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    other_names: Optional[str] = None
    phone_number: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v):
        if v is None or v.strip() == "":
            return None
        ghana = r"^(\+233|0)[0-9]{9}$"
        international = r"^\+[1-9][0-9]{6,14}$"
        if not (re.match(ghana, v) or re.match(international, v)):
            raise ValueError("Invalid phone number. Use +233XXXXXXXXX, 0XXXXXXXXX, or international format +XXXXXXXXXXX")
        return v

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v.strip().title()


class UserCreate(UserBase):
    password: str
    confirm_password: str
    account_type: str = "citizen"
    nationality: Optional[str] = None
    passport_number: Optional[str] = None
    permit_number: Optional[str] = None
    permit_type: Optional[str] = None
    unhcr_number: Optional[str] = None
    diplomatic_id: Optional[str] = None
    embassy_mission: Optional[str] = None
    visa_type: Optional[str] = None
    date_of_birth: Optional[str] = None
    ghana_card_number: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    other_names: Optional[str] = None
    phone_number: Optional[str] = None
    ghana_card_number: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    notification_email: Optional[bool] = None
    notification_sms: Optional[bool] = None
    notification_push: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    other_names: Optional[str] = None
    phone_number: Optional[str] = None
    ghana_card_number: Optional[str] = None
    role: UserRole
    status: UserStatus
    account_type: AccountType = AccountType.CITIZEN
    kyc_status: KycStatus = KycStatus.NOT_STARTED
    is_active: bool
    is_verified: bool
    email_verified: bool
    phone_verified: bool
    region: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    nationality: Optional[str] = None
    profile_photo: Optional[str] = None
    notification_email: bool
    notification_sms: bool
    notification_push: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    @field_validator("ghana_card_number", mode="before")
    @classmethod
    def decrypt_ghana_card_number(cls, v):
        if not v:
            return v
        return decrypt_pii(v)

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    role: UserRole
    status: UserStatus
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class StaffCreate(UserCreate):
    role: UserRole = UserRole.STAFF
    staff_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    office_location: Optional[str] = None
    can_approve: bool = False
    can_reject: bool = False
    can_print: bool = False
    can_deliver: bool = False


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class AdminUpdateUser(BaseModel):
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    kyc_status: Optional[KycStatus] = None
