import re
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.ghana_card_record import GhanaCardRecord

router = APIRouter(prefix="/nia", tags=["NIA Verification"])

GHANA_CARD_RE = re.compile(r"^GHA-\d{9}-\d$")


def _normalize(value: str) -> str:
    return re.sub(r"\s", "", (value or "").upper())


class NiaVerifyRequest(BaseModel):
    card_number: str
    date_of_birth: str


@router.post("/verify")
def verify_ghana_card(body: NiaVerifyRequest, db: Session = Depends(get_db)):
    normalized = _normalize(body.card_number)

    if not GHANA_CARD_RE.match(normalized):
        raise HTTPException(
            status_code=422,
            detail="Invalid Ghana Card format. Expected GHA-XXXXXXXXX-X (e.g. GHA-123456789-0).",
        )

    try:
        dob = date_type.fromisoformat(body.date_of_birth)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date of birth. Use YYYY-MM-DD format.")

    record = (
        db.query(GhanaCardRecord)
        .filter(GhanaCardRecord.card_number == normalized, GhanaCardRecord.is_active == True)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Ghana Card not found in the National Identification Authority database. Please verify your card number.",
        )

    if record.date_of_birth != dob:
        raise HTTPException(
            status_code=400,
            detail="Date of birth does not match the records for this Ghana Card. Please verify your details.",
        )

    full_name_parts = [record.first_name]
    if record.other_names:
        full_name_parts.append(record.other_names)
    full_name_parts.append(record.last_name)

    return {
        "valid": True,
        "card_number": record.card_number,
        "full_name": " ".join(full_name_parts),
        "first_name": record.first_name,
        "last_name": record.last_name,
        "other_names": record.other_names,
        "gender": record.gender,
        "nationality": record.nationality,
        "region": record.region,
        "district": record.district,
    }


@router.get("/card-info")
def get_card_format_info():
    return {
        "format": "GHA-XXXXXXXXX-X",
        "description": "Ghana National Identification Authority card number",
        "example": "GHA-123456789-0",
        "pattern": "GHA followed by 9 digits, a hyphen, then 1 check digit",
    }
