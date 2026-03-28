import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    encrypt_pii,
    generate_reset_token,
    generate_verification_token,
    hash_password,
    hash_pii_lookup,
    verify_password,
)
from app.models.user import AccountType, RefreshToken, User
from app.schemas.auth import LoginRequest, RefreshTokenRequest
from app.schemas.user import UserCreate
from app.utils.email import send_verification_email, send_welcome_email
from app.utils.sms import send_registration_sms

logger = logging.getLogger(__name__)

MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def normalize_card(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"[\s\-]", "", value).upper()


def _fetch_metamap_document_number(verification_id: str) -> Optional[str]:
    if not settings.METAMAP_CLIENT_ID or not settings.METAMAP_CLIENT_SECRET:
        return None
    try:
        with httpx.Client(timeout=10) as client:
            token_res = client.post(
                f"{settings.METAMAP_API_URL}/oauth",
                data={"grant_type": "client_credentials"},
                auth=(settings.METAMAP_CLIENT_ID, settings.METAMAP_CLIENT_SECRET),
            )
            if not token_res.is_success:
                logger.warning("MetaMap token request failed: %s", token_res.status_code)
                return None
            access_token = token_res.json().get("access_token")
            if not access_token:
                return None

            ver_res = client.get(
                f"{settings.METAMAP_API_URL}/v2/verifications/{verification_id}",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if not ver_res.is_success:
                logger.warning("MetaMap verification fetch failed: %s", ver_res.status_code)
                return None

            data = ver_res.json()
            documents = data.get("documents") or []
            for doc in documents:
                fields = doc.get("fields") or {}
                for key in ("documentNumber", "personalNumber", "cardNumber", "idNumber"):
                    val = fields.get(key, {})
                    if isinstance(val, dict):
                        val = val.get("value") or val.get("content")
                    if val and isinstance(val, str) and len(val) >= 6:
                        return val.strip()
    except Exception as exc:
        logger.warning("MetaMap document lookup error: %s", exc)
    return None


class AuthService:
    @staticmethod
    def register(db: Session, user_data: UserCreate) -> User:
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        if user_data.phone_number:
            existing_phone = db.query(User).filter(User.phone_number == user_data.phone_number).first()
            if existing_phone:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already registered")

        raw_card = getattr(user_data, "ghana_card_number", None)
        clean_card = normalize_card(raw_card)
        card_hash = hash_pii_lookup(clean_card) if clean_card else None

        if card_hash:
            duplicate = db.query(User).filter(User.ghana_card_hash == card_hash).first()
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This Ghana Card is already registered to another account.",
                )

        raw_type = getattr(user_data, "account_type", "citizen") or "citizen"
        try:
            acct_type = AccountType(raw_type)
        except ValueError:
            acct_type = AccountType.CITIZEN

        user = User(
            email=user_data.email,
            phone_number=user_data.phone_number,
            hashed_password=hash_password(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            other_names=user_data.other_names,
            region=user_data.region,
            district=user_data.district,
            address=user_data.address,
            account_type=acct_type,
            ghana_card_number=encrypt_pii(clean_card) if clean_card else None,
            ghana_card_hash=card_hash,
            nationality=getattr(user_data, "nationality", None),
            passport_number=getattr(user_data, "passport_number", None),
            permit_number=getattr(user_data, "permit_number", None),
            permit_type=getattr(user_data, "permit_type", None),
            unhcr_number=getattr(user_data, "unhcr_number", None),
            diplomatic_id=getattr(user_data, "diplomatic_id", None),
            embassy_mission=getattr(user_data, "embassy_mission", None),
            visa_type=getattr(user_data, "visa_type", None),
            date_of_birth=getattr(user_data, "date_of_birth", None),
            email_verification_token=generate_verification_token(),
            login_attempts=0,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        full_name = f"{user.first_name} {user.last_name}".strip()
        if user.email_verification_token:
            send_verification_email(user.email, full_name, user.email_verification_token)
        send_welcome_email(user.email, full_name, raw_type or "citizen")
        if user.phone_number:
            send_registration_sms(user.phone_number, full_name)

        return user

    @staticmethod
    def login(db: Session, login_data: LoginRequest, ip_address: Optional[str] = None) -> dict:  # noqa: ARG002
        user = db.query(User).filter(User.email == login_data.email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="This email is not yet registered.")

        now = datetime.now(timezone.utc)

        if user.locked_until:
            locked_until = user.locked_until
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if locked_until > now:
                remaining = int((locked_until - now).total_seconds() / 60) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Account locked due to too many failed attempts. Try again in {remaining} minute(s).",
                )
            user.login_attempts = 0
            user.locked_until = None

        if not verify_password(login_data.password, user.hashed_password):
            user.login_attempts = (user.login_attempts or 0) + 1
            if user.login_attempts >= MAX_LOGIN_ATTEMPTS:
                user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
                user.login_attempts = 0
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many failed attempts. Account locked for {LOCKOUT_MINUTES} minutes.",
                )
            remaining = MAX_LOGIN_ATTEMPTS - user.login_attempts
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid email or password. {remaining} attempt(s) remaining before lockout.",
            )

        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

        user.login_attempts = 0
        user.locked_until = None

        token_data = {"sub": str(user.id), "role": user.role.value}
        access_token = create_access_token(token_data)
        if login_data.remember_me:
            refresh_token = create_refresh_token(token_data, expires_delta=timedelta(days=settings.REMEMBER_ME_EXPIRE_DAYS))
            refresh_expires = now + timedelta(days=settings.REMEMBER_ME_EXPIRE_DAYS)
        else:
            refresh_token = create_refresh_token(token_data)
            refresh_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        db.add(RefreshToken(
            user_id=user.id,
            token=refresh_token,
            expires_at=refresh_expires,
            is_revoked=False,
        ))
        user.last_login = now
        db.commit()
        db.refresh(user)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user,
        }

    @staticmethod
    def refresh_token(db: Session, token_data: RefreshTokenRequest) -> dict:
        from jose import JWTError
        raw_token = token_data.refresh_token

        try:
            from app.core.security import decode_token
            payload = decode_token(raw_token)
            if payload.get("type") != "refresh":
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        token_record = (
            db.query(RefreshToken)
            .filter(RefreshToken.token == raw_token, RefreshToken.is_revoked == False)
            .first()
        )
        if not token_record:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not recognized")

        now = datetime.now(timezone.utc)
        expires_at = token_record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at <= now:
            token_record.is_revoked = True
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired")

        user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

        token_record.is_revoked = True
        new_token_data = {"sub": str(user.id), "role": user.role.value}
        new_access_token = create_access_token(new_token_data)
        new_refresh_token = create_refresh_token(new_token_data)

        db.add(RefreshToken(
            user_id=user.id,
            token=new_refresh_token,
            expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            is_revoked=False,
        ))
        db.commit()

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user,
        }

    @staticmethod
    def logout(db: Session, refresh_token: str, user_id: int) -> None:
        token_record = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token == refresh_token,
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False,
            )
            .first()
        )
        if token_record:
            token_record.is_revoked = True
            db.commit()

    @staticmethod
    def verify_email(db: Session, token: str) -> None:
        user = db.query(User).filter(User.email_verification_token == token).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")
        user.email_verified = True
        user.is_verified = True
        user.email_verification_token = None
        db.commit()

    @staticmethod
    def request_password_reset(db: Session, email: str) -> tuple[str, str, str]:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This email is not yet registered.")
        reset_token = generate_reset_token()
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        full_name = f"{user.first_name} {user.last_name}".strip()
        return user.email, full_name, reset_token

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> None:
        user = db.query(User).filter(User.password_reset_token == token).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")
        if not user.password_reset_expires:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")

        now = datetime.now(timezone.utc)
        expires_at = user.password_reset_expires
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token has expired")

        user.hashed_password = hash_password(new_password)
        user.password_reset_token = None
        user.password_reset_expires = None
        db.commit()

    @staticmethod
    def digital_id_login(
        db: Session,
        ghana_card_number: Optional[str],
        passport_number: Optional[str],
        verification_id: Optional[str],
    ) -> dict:
        metamap_doc_number: Optional[str] = None

        if verification_id:
            metamap_doc_number = _fetch_metamap_document_number(verification_id)
            if metamap_doc_number and not ghana_card_number and not passport_number:
                ghana_card_number = metamap_doc_number

        if not ghana_card_number and not passport_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide a Ghana Card number or passport number.",
            )

        user = None

        if ghana_card_number:
            clean = normalize_card(ghana_card_number)
            card_hash = hash_pii_lookup(clean)
            user = db.query(User).filter(User.ghana_card_hash == card_hash).first()

            if not user and metamap_doc_number and ghana_card_number != metamap_doc_number:
                clean_meta = normalize_card(metamap_doc_number)
                meta_hash = hash_pii_lookup(clean_meta)
                user = db.query(User).filter(User.ghana_card_hash == meta_hash).first()

        if not user and passport_number:
            clean_passport = passport_number.strip().upper()
            all_passport = db.query(User).filter(User.passport_number.isnot(None)).all()
            for u in all_passport:
                if (u.passport_number or "").strip().upper() == clean_passport:
                    user = u
                    break

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this ID number. Please register first.",
            )

        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

        if verification_id:
            user.metamap_verification_id = verification_id

        from app.models.user import KycStatus
        user.kyc_status = KycStatus.VERIFIED
        user.is_verified = True
        user.last_login = datetime.now(timezone.utc)

        token_data = {"sub": str(user.id), "role": user.role.value}
        access_token = create_access_token(token_data)
        refresh_token_str = create_refresh_token(token_data)

        db.add(RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            is_revoked=False,
        ))
        db.commit()
        db.refresh(user)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token_str,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user,
        }
