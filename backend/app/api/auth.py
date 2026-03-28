from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.schemas.auth import LoginRequest, TokenResponse, RefreshTokenRequest, VerifyEmailRequest, DigitalIdLoginRequest, ForgotPasswordRequest
from app.schemas.user import UserCreate, UserResponse, ResetPasswordRequest
from app.services.auth_service import AuthService
from app.models.user import User
from app.utils.email import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    user = AuthService.register(db, user_data)
    return user


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else None
    result = AuthService.login(db, login_data, ip_address=ip)
    return result


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    return AuthService.refresh_token(db, token_data)


@router.post("/logout")
def logout(
    token_data: RefreshTokenRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    AuthService.logout(db, token_data.refresh_token, current_user.id)
    return {"message": "Logged out successfully"}


@router.post("/verify-email")
def verify_email(request: VerifyEmailRequest, db: Session = Depends(get_db)):
    AuthService.verify_email(db, request.token)
    return {"message": "Email verified successfully"}


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    result = AuthService.request_password_reset(db, data.email)
    to_email, full_name, token = result
    background_tasks.add_task(send_password_reset_email, to_email, full_name, token)
    return {"message": "Password reset link has been sent to your email."}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    AuthService.reset_password(db, data.token, data.new_password)
    return {"message": "Password reset successfully"}


@router.get("/me", response_model=UserResponse)
def get_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.post("/digital-id-login", response_model=TokenResponse)
def digital_id_login(body: DigitalIdLoginRequest, db: Session = Depends(get_db)):
    return AuthService.digital_id_login(
        db,
        ghana_card_number=body.ghana_card_number,
        passport_number=body.passport_number,
        verification_id=body.verification_id,
    )
