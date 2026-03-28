import hashlib
import io
import os
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.application import Application, ApplicationStatus
from app.models.certificate import Certificate, CertificateStatus
from app.models.user import User

try:
    import qrcode
    _QR_AVAILABLE = True
except ImportError:
    _QR_AVAILABLE = False

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.utils import ImageReader
    from PIL import Image
    _PDF_AVAILABLE = True
except ImportError:
    _PDF_AVAILABLE = False


def _generate_cert_number() -> str:
    year = datetime.now(timezone.utc).year
    uid = uuid.uuid4().hex[:8].upper()
    return f"BDR-{year}-{uid}"


def _compute_hash(cert_number: str, issued_date: str) -> str:
    raw = f"{cert_number}|{issued_date}|{settings.SECRET_KEY}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _make_qr_bytes(url: str) -> bytes:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=5,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#006B3C", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


def _build_pdf(app: Application, cert: Certificate) -> bytes:
    verify_url = f"{settings.FRONTEND_URL}/certificates/verify/{cert.certificate_number}"
    issued_date = (cert.generated_at or datetime.now(timezone.utc)).strftime("%d %B %Y")
    child_name = " ".join(filter(None, [
        app.child_first_name,
        app.child_other_names,
        app.child_last_name,
    ]))
    mother_name = " ".join(filter(None, [app.mother_first_name, app.mother_last_name]))
    father_name = " ".join(filter(None, [app.father_first_name, app.father_last_name])) or "Not Provided"
    dob = app.child_date_of_birth.strftime("%d %B %Y") if app.child_date_of_birth else "—"
    gender = (app.child_gender.value.capitalize() if app.child_gender else "—")

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4

    def rgb(hex_str):
        h = hex_str.lstrip("#")
        return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))

    GREEN = rgb("006B3C")
    GOLD = rgb("FCD116")
    WHITE = (1, 1, 1)
    DARK = rgb("111827")
    MUTED = rgb("6b7280")
    LIGHT_GREEN = rgb("f0fdf4")

    def fill(color):
        c.setFillColorRGB(*color)

    def stroke(color):
        c.setStrokeColorRGB(*color)

    def field_block(label, value, x, y, w=200):
        fill(MUTED)
        c.setFont("Helvetica", 7.5)
        c.drawString(x, y + 13, label.upper())
        fill(DARK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x, y, str(value) if value else "—")
        stroke(rgb("e5e7eb"))
        c.setLineWidth(0.5)
        c.line(x, y - 3, x + w, y - 3)

    # ── Background ───────────────────────────────────────────
    fill(LIGHT_GREEN)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # ── Top green banner ─────────────────────────────────────
    fill(GREEN)
    c.rect(0, H - 110, W, 110, fill=1, stroke=0)

    # Gold stripe
    fill(GOLD)
    c.rect(0, H - 114, W, 4, fill=1, stroke=0)

    # Logo circle
    fill(WHITE)
    c.circle(W / 2, H - 72, 38, fill=1, stroke=0)
    stroke(GOLD)
    c.setLineWidth(2.5)
    c.circle(W / 2, H - 72, 38, fill=0, stroke=1)

    # Logo text inside circle (BDR initials)
    fill(GREEN)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(W / 2, H - 76, "BDR")

    # Header text
    fill(GOLD)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(W / 2, H - 128, "REPUBLIC OF GHANA")

    fill(WHITE)
    c.setFont("Helvetica-Bold", 17)
    c.drawCentredString(W / 2, H - 148, "BIRTHS AND DEATHS REGISTRY")

    fill(rgb("d1fae5"))
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, H - 165, "Ministry of Interior — Official Vital Registration Certificate")

    # ── Divider ───────────────────────────────────────────────
    stroke(GREEN)
    c.setLineWidth(1.5)
    c.line(50, H - 177, W - 50, H - 177)
    stroke(GOLD)
    c.setLineWidth(0.6)
    c.line(50, H - 181, W - 50, H - 181)

    # ── Certificate Title ─────────────────────────────────────
    fill(GREEN)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(W / 2, H - 216, "CERTIFICATE OF BIRTH")

    fill(MUTED)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, H - 233, "This is to certify that the following birth has been duly registered with the")
    c.drawCentredString(W / 2, H - 246, "Births and Deaths Registry of the Republic of Ghana")

    # ── White info card ───────────────────────────────────────
    card_top = H - 265
    card_h = 220
    fill(WHITE)
    c.roundRect(35, card_top - card_h, W - 70, card_h, 10, fill=1, stroke=0)
    stroke(rgb("bbf7d0"))
    c.setLineWidth(1)
    c.roundRect(35, card_top - card_h, W - 70, card_h, 10, fill=0, stroke=1)

    # Child Name (full width)
    field_block("Full Name of Child", child_name, 55, card_top - 36, W - 110)

    # DOB | Gender | Nationality
    field_block("Date of Birth", dob, 55, card_top - 88, 155)
    field_block("Gender", gender, 225, card_top - 88, 100)
    field_block("Nationality", app.child_nationality or "Ghanaian", 340, card_top - 88, 130)

    # Place | Region
    field_block("Place of Birth", app.child_place_of_birth or "—", 55, card_top - 140, 175)
    field_block("Region", app.child_region_of_birth or "—", 245, card_top - 140, 155)

    # Parents
    field_block("Mother's Full Name", mother_name, 55, card_top - 192, 215)
    field_block("Father's Full Name", father_name, 285, card_top - 192, 215)

    # ── Cert details strip ────────────────────────────────────
    strip_top = card_top - card_h - 8
    fill(rgb("f0fdf4"))
    c.roundRect(35, strip_top - 60, W - 70, 60, 6, fill=1, stroke=0)
    stroke(rgb("006B3C"))
    c.setLineWidth(0.6)
    c.roundRect(35, strip_top - 60, W - 70, 60, 6, fill=0, stroke=1)

    field_block("Certificate Number", cert.certificate_number, 55, strip_top - 44, 175)
    field_block("Application Reference", app.application_number, 245, strip_top - 44, 165)
    field_block("Date Issued", issued_date, 425, strip_top - 44, 130)

    # ── QR Code ───────────────────────────────────────────────
    qr_bytes = _make_qr_bytes(verify_url)
    qr_pil = Image.open(io.BytesIO(qr_bytes))
    qr_buf = io.BytesIO()
    qr_pil.save(qr_buf, format="PNG")
    qr_buf.seek(0)
    qr_reader = ImageReader(qr_buf)

    qr_size = 105
    qr_x = W - 55 - qr_size
    qr_y = strip_top - 60 - 18 - qr_size
    c.drawImage(qr_reader, qr_x, qr_y, qr_size, qr_size)

    # QR label
    fill(MUTED)
    c.setFont("Helvetica", 7)
    c.drawCentredString(qr_x + qr_size / 2, qr_y - 10, "Scan to verify authenticity")

    # ── Verification URL ──────────────────────────────────────
    vurl_y = strip_top - 60 - 22
    fill(GREEN)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(55, vurl_y, "VERIFY ONLINE:")
    fill(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(55, vurl_y - 14, verify_url)

    # Security hash line
    if cert.blockchain_hash:
        fill(rgb("9ca3af"))
        c.setFont("Helvetica", 6.5)
        c.drawString(55, vurl_y - 28, f"Security hash: {cert.blockchain_hash[:48]}...")

    # ── Gold stripe + Green footer ────────────────────────────
    fill(GOLD)
    c.rect(0, 90, W, 4, fill=1, stroke=0)
    fill(GREEN)
    c.rect(0, 0, W, 90, fill=1, stroke=0)

    fill(WHITE)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(W / 2, 68, "OFFICIAL DOCUMENT — REPUBLIC OF GHANA")

    fill(GOLD)
    c.setFont("Helvetica", 8)
    c.drawCentredString(W / 2, 52, "Issued under the Births and Deaths (Registration) Act, 2020 (Act 1027)")
    c.drawCentredString(W / 2, 40, "Alteration or unauthorised reproduction of this document is a criminal offence.")

    fill(rgb("bbf7d0"))
    c.setFont("Helvetica", 7)
    c.drawCentredString(W / 2, 24, f"Cert: {cert.certificate_number}  |  Issued: {issued_date}  |  BDR Digital Registry")
    c.drawCentredString(W / 2, 13, f"Hash: {cert.blockchain_hash[:40] + '...' if cert.blockchain_hash else 'N/A'}")

    c.save()
    buf.seek(0)
    return buf.read()


class CertificateService:

    @staticmethod
    def generate_certificate(db: Session, application_id: int, staff_id: int):
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        allowed = {ApplicationStatus.APPROVED, ApplicationStatus.PAYMENT_COMPLETED, ApplicationStatus.PROCESSING}
        if app.status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot generate certificate for application in '{app.status}' status. "
                       "Application must be Approved or Payment Completed.",
            )

        existing = db.query(Certificate).filter(
            Certificate.application_id == application_id
        ).first()
        if existing and existing.status not in (CertificateStatus.CANCELLED,):
            raise HTTPException(
                status_code=409,
                detail=f"Certificate {existing.certificate_number} already exists for this application.",
            )

        cert_number = _generate_cert_number()
        now = datetime.now(timezone.utc)
        issued_date_str = now.strftime("%Y-%m-%d")
        hash_val = _compute_hash(cert_number, issued_date_str)

        qr_data = f"{cert_number}|{issued_date_str}|{hash_val[:16]}"
        verify_url = f"{settings.FRONTEND_URL}/certificates/verify/{cert_number}"

        cert = Certificate(
            application_id=application_id,
            certificate_number=cert_number,
            status=CertificateStatus.GENERATED,
            generated_by_id=staff_id,
            generated_at=now,
            qr_code_data=qr_data,
            blockchain_hash=hash_val,
        )
        db.add(cert)
        db.flush()

        if _PDF_AVAILABLE and _QR_AVAILABLE:
            try:
                pdf_bytes = _build_pdf(app, cert)
                upload_dir = os.path.join(settings.UPLOAD_DIR, "certificates")
                os.makedirs(upload_dir, exist_ok=True)
                pdf_path = os.path.join(upload_dir, f"{cert_number}.pdf")
                with open(pdf_path, "wb") as f:
                    f.write(pdf_bytes)
                cert.file_path = pdf_path

                qr_bytes = _make_qr_bytes(verify_url)
                qr_path = os.path.join(upload_dir, f"{cert_number}_qr.png")
                with open(qr_path, "wb") as f:
                    f.write(qr_bytes)
                cert.qr_code_path = qr_path
            except Exception:
                pass

        app.status = ApplicationStatus.READY

        from app.models.audit import AuditLog
        audit = AuditLog(
            user_id=staff_id,
            action="certificate_generated",
            resource_type="certificate",
            resource_id=str(cert.id),
            details=f"Certificate {cert_number} generated for application {app.application_number}",
        )
        db.add(audit)
        db.commit()
        db.refresh(cert)

        return {
            "id": cert.id,
            "certificate_number": cert.certificate_number,
            "application_id": cert.application_id,
            "status": cert.status.value,
            "generated_at": cert.generated_at.isoformat() if cert.generated_at else None,
            "file_path": cert.file_path,
            "qr_code_data": cert.qr_code_data,
            "blockchain_hash": cert.blockchain_hash,
            "verify_url": verify_url,
        }

    @staticmethod
    def verify_certificate_public(db: Session, certificate_number: str):
        cert = db.query(Certificate).filter(
            Certificate.certificate_number == certificate_number
        ).first()

        if not cert:
            return {
                "valid": False,
                "reason": "Certificate not found in the registry",
                "certificate_number": certificate_number,
            }

        if cert.status == CertificateStatus.CANCELLED:
            return {
                "valid": False,
                "reason": "This certificate has been revoked",
                "certificate_number": certificate_number,
                "revocation_reason": cert.revocation_reason,
                "revoked_at": cert.revoked_at.isoformat() if cert.revoked_at else None,
            }

        issued_date_str = cert.generated_at.strftime("%Y-%m-%d") if cert.generated_at else ""
        expected_hash = _compute_hash(certificate_number, issued_date_str)

        if cert.blockchain_hash != expected_hash:
            return {
                "valid": False,
                "reason": "Certificate integrity check failed — document may have been tampered with",
                "certificate_number": certificate_number,
            }

        app = cert.application
        child_name = " ".join(filter(None, [
            app.child_first_name,
            app.child_other_names,
            app.child_last_name,
        ])) if app else "—"

        return {
            "valid": True,
            "certificate_number": certificate_number,
            "certificate_status": cert.status.value,
            "issued_date": cert.generated_at.isoformat() if cert.generated_at else None,
            "child_name": child_name,
            "date_of_birth": str(app.child_date_of_birth) if app and app.child_date_of_birth else None,
            "place_of_birth": app.child_place_of_birth if app else None,
            "region": app.child_region_of_birth if app else None,
            "nationality": app.child_nationality if app else None,
            "application_number": app.application_number if app else None,
            "registry_name": "Births and Deaths Registry, Republic of Ghana",
            "issued_under": "Births and Deaths (Registration) Act, 2020 (Act 1027)",
        }

    @staticmethod
    def mark_printed(db: Session, certificate_id: int, staff_id: int):
        cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")
        cert.status = CertificateStatus.PRINTED
        cert.printed_by_id = staff_id
        cert.printed_at = datetime.now(timezone.utc)
        cert.print_count = (cert.print_count or 0) + 1
        db.commit()
        db.refresh(cert)
        return {"message": "Certificate marked as printed", "print_count": cert.print_count}

    @staticmethod
    def get_certificate(db: Session, certificate_number: str):
        cert = db.query(Certificate).filter(
            Certificate.certificate_number == certificate_number
        ).first()
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")
        return cert

    @staticmethod
    def revoke_certificate(db: Session, certificate_id: int, staff_id: int, reason: str):
        cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")
        cert.status = CertificateStatus.CANCELLED
        cert.revoked_by_id = staff_id
        cert.revoked_at = datetime.now(timezone.utc)
        cert.revocation_reason = reason
        db.commit()
        db.refresh(cert)
        return {"message": "Certificate revoked", "certificate_number": cert.certificate_number}
