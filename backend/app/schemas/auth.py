from pydantic import BaseModel, EmailStr
from typing import Optional
from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str


class VerifyPhoneRequest(BaseModel):
    code: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class DigitalIdLoginRequest(BaseModel):
    ghana_card_number: Optional[str] = None
    passport_number: Optional[str] = None
    verification_id: Optional[str] = None
