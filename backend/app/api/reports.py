from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.dependencies import require_admin, require_staff
from app.services.report_service import generate_overview_report, generate_applications_report, generate_revenue_report
from app.models.user import User
# calling  the apirouter for the reports and defining the endpoints for the reports with the required parameters and dependencies
router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/overview")
def download_overview_report(
    days: int = Query(30, ge=7, le=365, description="Period in days for the report"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    generated_by = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    pdf_bytes = generate_overview_report(db, generated_by=generated_by, period_days=days)
    filename = f"BDR_Overview_Report_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/applications")
def download_applications_report(
    days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    generated_by = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    pdf_bytes = generate_applications_report(db, generated_by=generated_by, period_days=days)
    filename = f"BDR_Applications_Report_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/revenue")
def download_revenue_report(
    days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    generated_by = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    pdf_bytes = generate_revenue_report(db, generated_by=generated_by, period_days=days)
    filename = f"BDR_Revenue_Report_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
