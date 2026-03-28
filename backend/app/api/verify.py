from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.utils.sms import send_phone_otp, verify_phone_otp

router = APIRouter(prefix="/verify", tags=["Verification"])


class SendOTPRequest(BaseModel):
    phone_number: str


class VerifyOTPRequest(BaseModel):
    phone_number: str
    code: str


@router.post("/phone/send")
def send_otp(
    body: SendOTPRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    ok = send_phone_otp(body.phone_number)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to send OTP. Please try again.",
        )
    return {"message": "OTP sent successfully", "phone_number": body.phone_number}


@router.post("/phone/verify")
def verify_otp(
    body: VerifyOTPRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    approved = verify_phone_otp(body.phone_number, body.code)
    if not approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code.",
        )
    user = db.query(User).filter(User.id == current_user.id).first()
    user.phone_number = body.phone_number
    user.phone_verified = True
    user.phone_verification_code = None
    db.commit()
    return {"message": "Phone number verified successfully", "phone_verified": True}
