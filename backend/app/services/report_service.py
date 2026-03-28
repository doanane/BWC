from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus.flowables import Flowable
from reportlab.graphics.shapes import Drawing, String
from io import BytesIO
from typing import Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.application import Application, ApplicationStatus
from app.models.user import User, UserRole
from app.models.payment import Payment, PaymentStatus
from app.core.config import settings
import os
import logging

logger = logging.getLogger(__name__)

PRIMARY = colors.HexColor("#006B3C")
GOLD = colors.HexColor("#FCD116")
DARK = colors.HexColor("#1a2332")
MUTED = colors.HexColor("#6b7280")
LIGHT_GREEN = colors.HexColor("#f0f9f4")
BORDER = colors.HexColor("#e5e7eb")
WHITE = colors.white
BLACK = colors.black


def _get_logo_path() -> Optional[str]:
    candidates = [
        settings.LOGO_PATH,
        os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "logo.png"),
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "birth-and-death-fyp", "src", "assets", "logo.png"),
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return os.path.abspath(p)
    return None


def _add_watermark(canvas, doc):
    from reportlab.lib.utils import ImageReader
    canvas.saveState()
    logo_path = _get_logo_path()
    if logo_path:
        try:
            img = ImageReader(logo_path)
            w, h = A4
            canvas.setFillAlpha(0.06)
            img_w = 10 * cm
            img_h = 10 * cm
            canvas.drawImage(
                img,
                (w - img_w) / 2,
                (h - img_h) / 2,
                width=img_w,
                height=img_h,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception as e:
            logger.warning("Could not draw watermark: %s", e)

    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.setFillAlpha(1)
    w, h = A4
    canvas.drawString(1.5 * cm, 1 * cm, f"Ghana Births and Deaths Registry | Confidential | Generated: {datetime.now().strftime('%d %B %Y at %H:%M')}")
    canvas.drawRightString(w - 1.5 * cm, 1 * cm, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("rpt_title", parent=base["Normal"], fontSize=22, fontName="Helvetica-Bold", textColor=DARK, leading=28, spaceAfter=4),
        "subtitle": ParagraphStyle("rpt_sub", parent=base["Normal"], fontSize=11, fontName="Helvetica", textColor=MUTED, spaceAfter=16),
        "section": ParagraphStyle("rpt_sec", parent=base["Normal"], fontSize=12, fontName="Helvetica-Bold", textColor=PRIMARY, spaceBefore=18, spaceAfter=8),
        "body": ParagraphStyle("rpt_body", parent=base["Normal"], fontSize=10, fontName="Helvetica", textColor=DARK, leading=15),
        "small": ParagraphStyle("rpt_small", parent=base["Normal"], fontSize=8, fontName="Helvetica", textColor=MUTED),
        "right": ParagraphStyle("rpt_right", parent=base["Normal"], fontSize=10, fontName="Helvetica", textColor=DARK, alignment=TA_RIGHT),
        "center": ParagraphStyle("rpt_center", parent=base["Normal"], fontSize=10, fontName="Helvetica", textColor=DARK, alignment=TA_CENTER),
        "bold": ParagraphStyle("rpt_bold", parent=base["Normal"], fontSize=10, fontName="Helvetica-Bold", textColor=DARK),
    }


def _header_block(styles, report_title: str, period: str, generated_by: str) -> list:
    from reportlab.platypus import Image as RLImage
    elements = []
    logo_path = _get_logo_path()

    header_data = []
    if logo_path:
        try:
            logo_img = RLImage(logo_path, width=1.8 * cm, height=1.8 * cm)
            header_data.append([logo_img, "", ""])
        except Exception:
            logo_path = None

    title_para = Paragraph("BIRTHS AND DEATHS REGISTRY", ParagraphStyle(
        "hdr_name", fontSize=14, fontName="Helvetica-Bold", textColor=WHITE,
    ))
    sub_para = Paragraph("Republic of Ghana &mdash; Official Report", ParagraphStyle(
        "hdr_sub", fontSize=9, fontName="Helvetica", textColor=colors.HexColor("#c8e6c9"),
    ))

    right_para = Paragraph(f"<b>{report_title}</b>", ParagraphStyle(
        "hdr_rpt", fontSize=11, fontName="Helvetica-Bold", textColor=WHITE, alignment=TA_RIGHT,
    ))
    period_para = Paragraph(period, ParagraphStyle(
        "hdr_period", fontSize=9, fontName="Helvetica", textColor=colors.HexColor("#c8e6c9"), alignment=TA_RIGHT,
    ))

    if logo_path:
        try:
            logo_img = RLImage(logo_path, width=1.8 * cm, height=1.8 * cm)
            tbl = Table(
                [[logo_img, [title_para, sub_para], [right_para, period_para]]],
                colWidths=[2 * cm, 11 * cm, 6 * cm],
            )
        except Exception:
            tbl = Table(
                [[[title_para, sub_para], [right_para, period_para]]],
                colWidths=[13 * cm, 6 * cm],
            )
    else:
        tbl = Table(
            [[[title_para, sub_para], [right_para, period_para]]],
            colWidths=[13 * cm, 6 * cm],
        )

    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PRIMARY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, 0), 14),
        ("RIGHTPADDING", (-1, 0), (-1, 0), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    elements.append(tbl)
    elements.append(Spacer(1, 6))

    meta_para = Paragraph(
        f"Generated by: <b>{generated_by}</b> &nbsp;|&nbsp; Date: <b>{datetime.now().strftime('%d %B %Y')}</b> &nbsp;|&nbsp; Time: <b>{datetime.now().strftime('%H:%M UTC')}</b>",
        styles["small"],
    )
    elements.append(meta_para)
    elements.append(Spacer(1, 4))
    elements.append(HRFlowable(width="100%", thickness=2, color=PRIMARY))
    elements.append(Spacer(1, 12))
    return elements


def _stat_row(label: str, value: str, styles: dict) -> list:
    return [
        Paragraph(label, styles["body"]),
        Paragraph(f"<b>{value}</b>", styles["right"]),
    ]


def _summary_table(rows: list, styles: dict) -> Table:
    tbl = Table(rows, colWidths=[12 * cm, 7 * cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GREEN),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, colors.HexColor("#f9fafb")]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (-1, 0), PRIMARY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return tbl


def generate_overview_report(
    db: Session,
    generated_by: str = "System",
    period_days: int = 30,
) -> bytes:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=period_days)
    period_label = f"Last {period_days} Days ({since.strftime('%d %b %Y')} – {now.strftime('%d %b %Y')})"

    total_apps = db.query(func.count(Application.id)).scalar() or 0
    period_apps = db.query(func.count(Application.id)).filter(Application.created_at >= since).scalar() or 0
    pending = db.query(func.count(Application.id)).filter(
        Application.status.in_([ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW])
    ).scalar() or 0
    approved = db.query(func.count(Application.id)).filter(Application.status == ApplicationStatus.APPROVED).scalar() or 0
    rejected = db.query(func.count(Application.id)).filter(Application.status == ApplicationStatus.REJECTED).scalar() or 0
    ready = db.query(func.count(Application.id)).filter(Application.status == ApplicationStatus.READY).scalar() or 0
    total_citizens = db.query(func.count(User.id)).filter(User.role == UserRole.CITIZEN).scalar() or 0
    period_citizens = db.query(func.count(User.id)).filter(
        User.role == UserRole.CITIZEN, User.created_at >= since
    ).scalar() or 0
    revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED, Payment.paid_at >= since
    ).scalar() or 0.0
    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.COMPLETED).scalar() or 0.0

    status_rows = db.query(Application.status, func.count(Application.id).label("cnt")).group_by(Application.status).all()

    recent_apps = (
        db.query(Application)
        .order_by(Application.created_at.desc())
        .limit(20)
        .all()
    )

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.8 * cm,
        bottomMargin=2 * cm,
        title=f"BDR Overview Report – {now.strftime('%B %Y')}",
        author="Ghana Births and Deaths Registry",
    )

    styles = _styles()
    story = []

    story.extend(_header_block(styles, "OVERVIEW REPORT", period_label, generated_by))

    story.append(Paragraph("EXECUTIVE SUMMARY", styles["section"]))
    summary_rows = [
        [Paragraph("Metric", styles["bold"]), Paragraph("Value", styles["bold"])],
        _stat_row("Total Applications (All Time)", f"{total_apps:,}", styles),
        _stat_row(f"New Applications ({period_days}-Day Period)", f"{period_apps:,}", styles),
        _stat_row("Pending Review", f"{pending:,}", styles),
        _stat_row("Approved", f"{approved:,}", styles),
        _stat_row("Rejected", f"{rejected:,}", styles),
        _stat_row("Ready for Collection", f"{ready:,}", styles),
        _stat_row("Registered Citizens (All Time)", f"{total_citizens:,}", styles),
        _stat_row(f"New Citizens ({period_days}-Day Period)", f"{period_citizens:,}", styles),
        _stat_row(f"Revenue – {period_days} Days (GHS)", f"GHS {float(revenue):,.2f}", styles),
        _stat_row("Total Revenue (All Time)", f"GHS {float(total_revenue):,.2f}", styles),
    ]

    story.append(_summary_table(summary_rows, styles))
    story.append(Spacer(1, 16))

    if status_rows:
        story.append(Paragraph("APPLICATION STATUS BREAKDOWN", styles["section"]))
        status_data = [
            [Paragraph("Status", styles["bold"]), Paragraph("Count", styles["bold"]), Paragraph("Percentage", styles["bold"])],
        ]
        for row in status_rows:
            pct = (row.cnt / total_apps * 100) if total_apps else 0
            status_lbl = row.status.value.replace("_", " ").title() if hasattr(row.status, "value") else str(row.status)
            status_data.append([
                Paragraph(status_lbl, styles["body"]),
                Paragraph(f"{row.cnt:,}", styles["right"]),
                Paragraph(f"{pct:.1f}%", styles["right"]),
            ])
        tbl = Table(status_data, colWidths=[10 * cm, 4.5 * cm, 4.5 * cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#f9fafb")]),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 16))

    if recent_apps:
        story.append(Paragraph("RECENT APPLICATIONS", styles["section"]))
        app_data = [
            [
                Paragraph("Reference", styles["bold"]),
                Paragraph("Type", styles["bold"]),
                Paragraph("Applicant", styles["bold"]),
                Paragraph("Status", styles["bold"]),
                Paragraph("Date", styles["bold"]),
            ]
        ]
        for app in recent_apps:
            extra = app.extra_data or {}
            app_type = str(extra.get("application_type", "BIRTH")).upper()
            status_val = app.status.value.replace("_", " ").title() if hasattr(app.status, "value") else str(app.status)
            date_str = app.created_at.strftime("%d/%m/%Y") if app.created_at else "—"
            applicant_name = ""
            if app.applicant:
                applicant_name = f"{app.applicant.first_name or ''} {app.applicant.last_name or ''}".strip()
            app_data.append([
                Paragraph(app.application_number or "—", styles["small"]),
                Paragraph(app_type, styles["small"]),
                Paragraph(applicant_name or "—", styles["small"]),
                Paragraph(status_val, styles["small"]),
                Paragraph(date_str, styles["small"]),
            ])

        col_widths = [4.5 * cm, 2.5 * cm, 4.5 * cm, 4 * cm, 3.5 * cm]
        tbl = Table(app_data, colWidths=col_widths, repeatRows=1)
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#f9fafb")]),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(tbl)

    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    story.append(Spacer(1, 6))
    disclaimer = (
        "This report is generated by the Ghana Births and Deaths Registry digital management system. "
        "The information contained herein is confidential and intended solely for authorised staff. "
        "Unauthorised disclosure, distribution, or reproduction of this document is strictly prohibited."
    )
    story.append(Paragraph(disclaimer, styles["small"]))

    doc.build(story, onFirstPage=_add_watermark, onLaterPages=_add_watermark)
    return buffer.getvalue()


def generate_applications_report(
    db: Session,
    generated_by: str = "System",
    period_days: int = 30,
) -> bytes:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=period_days)
    period_label = f"Last {period_days} Days ({since.strftime('%d %b %Y')} – {now.strftime('%d %b %Y')})"

    total_period = db.query(func.count(Application.id)).filter(Application.created_at >= since).scalar() or 0
    total_all = db.query(func.count(Application.id)).scalar() or 0

    status_rows = (
        db.query(Application.status, func.count(Application.id).label("cnt"))
        .filter(Application.created_at >= since)
        .group_by(Application.status)
        .all()
    )

    applications = (
        db.query(Application)
        .filter(Application.created_at >= since)
        .order_by(Application.created_at.desc())
        .limit(50)
        .all()
    )

    birth_count = sum(
        1 for a in applications
        if str((a.extra_data or {}).get("application_type", "BIRTH")).upper() == "BIRTH"
    )
    death_count = total_period - birth_count

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=1.5 * cm, leftMargin=1.5 * cm,
        topMargin=1.8 * cm, bottomMargin=2 * cm,
        title=f"BDR Applications Report – {now.strftime('%B %Y')}",
        author="Ghana Births and Deaths Registry",
    )

    styles = _styles()
    story = []
    story.extend(_header_block(styles, "APPLICATIONS REPORT", period_label, generated_by))

    story.append(Paragraph("SUMMARY", styles["section"]))
    summary_rows = [
        [Paragraph("Metric", styles["bold"]), Paragraph("Value", styles["bold"])],
        _stat_row("Total Applications (Period)", f"{total_period:,}", styles),
        _stat_row("Total Applications (All Time)", f"{total_all:,}", styles),
        _stat_row("Birth Registrations (Period)", f"{birth_count:,}", styles),
        _stat_row("Death Registrations (Period)", f"{death_count:,}", styles),
    ]
    story.append(_summary_table(summary_rows, styles))
    story.append(Spacer(1, 16))

    if status_rows:
        story.append(Paragraph("STATUS BREAKDOWN (PERIOD)", styles["section"]))
        status_data = [
            [Paragraph("Status", styles["bold"]), Paragraph("Count", styles["bold"]), Paragraph("% of Period", styles["bold"])],
        ]
        for row in status_rows:
            pct = (row.cnt / total_period * 100) if total_period else 0
            lbl = row.status.value.replace("_", " ").title() if hasattr(row.status, "value") else str(row.status)
            status_data.append([
                Paragraph(lbl, styles["body"]),
                Paragraph(f"{row.cnt:,}", styles["right"]),
                Paragraph(f"{pct:.1f}%", styles["right"]),
            ])
        tbl = Table(status_data, colWidths=[10 * cm, 4.5 * cm, 4.5 * cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#f9fafb")]),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 16))

    if applications:
        story.append(Paragraph(f"APPLICATION LISTING (LAST {min(len(applications), 50)})", styles["section"]))
        app_data = [
            [
                Paragraph("Reference", styles["bold"]),
                Paragraph("Type", styles["bold"]),
                Paragraph("Applicant", styles["bold"]),
                Paragraph("Status", styles["bold"]),
                Paragraph("Date", styles["bold"]),
            ]
        ]
        for app in applications:
            extra = app.extra_data or {}
            app_type = str(extra.get("application_type", "BIRTH")).upper()
            status_val = app.status.value.replace("_", " ").title() if hasattr(app.status, "value") else str(app.status)
            date_str = app.created_at.strftime("%d/%m/%Y") if app.created_at else "—"
            applicant_name = ""
            if app.applicant:
                applicant_name = f"{app.applicant.first_name or ''} {app.applicant.last_name or ''}".strip()
            app_data.append([
                Paragraph(app.application_number or "—", styles["small"]),
                Paragraph(app_type, styles["small"]),
                Paragraph(applicant_name or "—", styles["small"]),
                Paragraph(status_val, styles["small"]),
                Paragraph(date_str, styles["small"]),
            ])
        tbl = Table(app_data, colWidths=[4.5 * cm, 2.5 * cm, 4.5 * cm, 4 * cm, 3.5 * cm], repeatRows=1)
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#f9fafb")]),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(tbl)

    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "This report is generated by the Ghana Births and Deaths Registry digital management system. "
        "Confidential — authorised staff only.",
        styles["small"],
    ))

    doc.build(story, onFirstPage=_add_watermark, onLaterPages=_add_watermark)
    return buffer.getvalue()


def generate_revenue_report(
    db: Session,
    generated_by: str = "System",
    period_days: int = 30,
) -> bytes:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=period_days)
    period_label = f"Last {period_days} Days ({since.strftime('%d %b %Y')} – {now.strftime('%d %b %Y')})"

    period_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED, Payment.paid_at >= since
    ).scalar() or 0.0
    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.COMPLETED).scalar() or 0.0
    period_txns = db.query(func.count(Payment.id)).filter(
        Payment.status == PaymentStatus.COMPLETED, Payment.paid_at >= since
    ).scalar() or 0
    total_txns = db.query(func.count(Payment.id)).filter(Payment.status == PaymentStatus.COMPLETED).scalar() or 0
    pending_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.PENDING
    ).scalar() or 0.0

    recent_payments = (
        db.query(Payment)
        .filter(Payment.status == PaymentStatus.COMPLETED, Payment.paid_at >= since)
        .order_by(Payment.paid_at.desc())
        .limit(50)
        .all()
    )

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=1.5 * cm, leftMargin=1.5 * cm,
        topMargin=1.8 * cm, bottomMargin=2 * cm,
        title=f"BDR Revenue Report – {now.strftime('%B %Y')}",
        author="Ghana Births and Deaths Registry",
    )

    styles = _styles()
    story = []
    story.extend(_header_block(styles, "REVENUE & PAYMENTS REPORT", period_label, generated_by))

    story.append(Paragraph("FINANCIAL SUMMARY", styles["section"]))
    avg = float(period_revenue) / period_txns if period_txns else 0.0
    summary_rows = [
        [Paragraph("Metric", styles["bold"]), Paragraph("Value", styles["bold"])],
        _stat_row(f"Revenue Collected ({period_days}-Day Period)", f"GHS {float(period_revenue):,.2f}", styles),
        _stat_row("Total Revenue (All Time)", f"GHS {float(total_revenue):,.2f}", styles),
        _stat_row(f"Transactions Completed ({period_days}-Day Period)", f"{period_txns:,}", styles),
        _stat_row("Total Transactions (All Time)", f"{total_txns:,}", styles),
        _stat_row("Average Transaction Value (Period)", f"GHS {avg:,.2f}", styles),
        _stat_row("Outstanding (Pending Payments)", f"GHS {float(pending_revenue):,.2f}", styles),
    ]
    story.append(_summary_table(summary_rows, styles))
    story.append(Spacer(1, 16))

    if recent_payments:
        story.append(Paragraph(f"PAYMENT TRANSACTIONS (LAST {min(len(recent_payments), 50)})", styles["section"]))
        pay_data = [
            [
                Paragraph("Reference", styles["bold"]),
                Paragraph("Amount (GHS)", styles["bold"]),
                Paragraph("Method", styles["bold"]),
                Paragraph("Date", styles["bold"]),
            ]
        ]
        for p in recent_payments:
            date_str = p.paid_at.strftime("%d/%m/%Y %H:%M") if p.paid_at else "—"
            channel_label = (p.channel.value if p.channel else "—").replace("_", " ").title()
            pay_data.append([
                Paragraph(p.reference or "—", styles["small"]),
                Paragraph(f"{float(p.amount):,.2f}", styles["right"]),
                Paragraph(channel_label, styles["small"]),
                Paragraph(date_str, styles["small"]),
            ])
        tbl = Table(pay_data, colWidths=[6 * cm, 4 * cm, 4 * cm, 5 * cm], repeatRows=1)
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#f9fafb")]),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(tbl)

    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "This financial report is generated by the Ghana Births and Deaths Registry digital management system. "
        "Confidential — authorised finance and management staff only.",
        styles["small"],
    ))

    doc.build(story, onFirstPage=_add_watermark, onLaterPages=_add_watermark)
    return buffer.getvalue()
