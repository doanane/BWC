from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_staff, require_admin
from app.services.certificate_service import CertificateService
from app.models.user import User
import os

router = APIRouter(prefix="/certificates", tags=["Certificates"])


@router.post("/generate/{application_id}")
def generate_certificate(
    application_id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return CertificateService.generate_certificate(db, application_id, current_user.id)


@router.post("/{certificate_id}/mark-printed")
def mark_certificate_printed(
    certificate_id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return CertificateService.mark_printed(db, certificate_id, current_user.id)


@router.get("/verify/{certificate_number}")
def verify_certificate(
    certificate_number: str,
    db: Session = Depends(get_db)
):
    return CertificateService.verify_certificate_public(db, certificate_number)


@router.get("/application/{application_id}")
def get_application_certificate(
    application_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from app.models.certificate import Certificate
    cert = db.query(Certificate).filter(
        Certificate.application_id == application_id
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert


@router.get("/{certificate_number}/download")
def download_certificate(
    certificate_number: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    cert = CertificateService.get_certificate(db, certificate_number)

    if current_user.role.value == "citizen":
        if cert.application.applicant_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    if not cert.file_path or not os.path.exists(cert.file_path):
        raise HTTPException(status_code=404, detail="Certificate file not found")

    return FileResponse(
        path=cert.file_path,
        filename=f"{certificate_number}.pdf",
        media_type="application/pdf"
    )


@router.post("/{certificate_id}/revoke")
def revoke_certificate(
    certificate_id: int,
    reason: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return CertificateService.revoke_certificate(db, certificate_id, current_user.id, reason)
