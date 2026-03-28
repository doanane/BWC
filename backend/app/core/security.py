import base64
import hashlib
import hmac as _hmac
import secrets
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["sha256_crypt", "pbkdf2_sha256"], deprecated="auto")


# PII encryption (Fernet / AES-128-CBC + HMAC-SHA256)

_fernet_instance: Optional[Fernet] = None


def _get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is None:
        raw_key = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
        url_safe_key = base64.urlsafe_b64encode(raw_key)
        _fernet_instance = Fernet(url_safe_key)
    return _fernet_instance


def encrypt_pii(value: Optional[str]) -> Optional[str]:
    """Encrypt a PII string for at-rest database storage (AES via Fernet)."""
    if not value:
        return value
    return _get_fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_pii(ciphertext: Optional[str]) -> Optional[str]:
    """
    Decrypt a Fernet-encrypted PII value.
    Falls back to returning the raw value so un-migrated plaintext records
    still work correctly during the transition period.
    """
    if not ciphertext:
        return ciphertext
    try:
        return _get_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception):
        return ciphertext


def hash_pii_lookup(value: Optional[str]) -> Optional[str]:
    """
    HMAC-SHA256 of a normalized PII value keyed to SECRET_KEY.
    Deterministic (same input → same output) so it can be used for DB
    lookups and uniqueness checks.  Cannot be reversed without SECRET_KEY.
    """
    if not value:
        return None
    return _hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict, expires_delta=None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def generate_verification_token() -> str:
    return secrets.token_urlsafe(32)


def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)


def generate_certificate_number() -> str:
    date_str = date.today().strftime("%Y%m%d")
    random_part = secrets.randbelow(90000) + 10000  # 5-digit range: 10000–99999
    return f"CERT-{date_str}-{random_part}"


def generate_receipt_number() -> str:
    date_str = date.today().strftime("%Y%m%d")
    random_part = secrets.randbelow(900000) + 100000  # 6-digit range: 100000–999999
    return f"RCP-{date_str}-{random_part}"


def generate_reference_code() -> str:
    return secrets.token_hex(8).upper()


def hash_file(file_content: bytes) -> str:
    return hashlib.sha256(file_content).hexdigest()
