import csv
import io
import logging
from datetime import date, datetime, timedelta
from typing import Tuple

from sqlalchemy.orm import Session

from app.models.application import Application, ApplicationStatus
from app.models.statistics_request import StatisticsRequest

logger = logging.getLogger(__name__)


def _parse_date_str(s: str | None) -> date | None:
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _get_apps(db: Session, req: StatisticsRequest):
    q = db.query(Application).filter(
        Application.status.notin_([ApplicationStatus.DRAFT, ApplicationStatus.CANCELLED])
    )
    date_from = _parse_date_str(req.period_from)
    date_to = _parse_date_str(req.period_to)
    if date_from:
        q = q.filter(Application.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        end = datetime.combine(date_to, datetime.min.time()) + timedelta(days=1)
        q = q.filter(Application.created_at < end)
    return q.all()


def _app_type(app) -> str:
    extra = app.extra_data or {}
    return str(extra.get("application_type", "BIRTH")).upper()


def generate_statistics_csv(db: Session, req: StatisticsRequest) -> Tuple[bytes, str]:
    apps = _get_apps(db, req)
    births = [a for a in apps if _app_type(a) == "BIRTH"]
    deaths = [a for a in apps if _app_type(a) == "DEATH"]
    data_types = req.data_types or []

    buf = io.StringIO()
    w = csv.writer(buf)

    w.writerow(["BIRTHS AND DEATHS REGISTRY — GHANA"])
    w.writerow(["Official Statistical Data Report"])
    w.writerow([])
    w.writerow(["Reference Number:", req.reference])
    w.writerow(["Organisation:", req.org_name])
    w.writerow(["Contact Person:", req.contact_person])
    w.writerow(["Data Period:", f"{req.period_from} to {req.period_to}"])
    w.writerow(["Generated:", datetime.now().strftime("%Y-%m-%d %H:%M UTC")])
    w.writerow([])
    w.writerow([
        "CONFIDENTIALITY NOTICE: This data is for the stated purpose only. "
        "Redistribution is prohibited under Ghana's Data Protection Act, 2012 (Act 843)."
    ])
    w.writerow([])

    section = 1

    if "national" in data_types or "bulletins" in data_types:
        w.writerow([f"SECTION {section}: NATIONAL SUMMARY"])
        section += 1
        w.writerow(["Category", "Count"])
        w.writerow(["Total Registrations", len(apps)])
        w.writerow(["Birth Registrations", len(births)])
        w.writerow(["Death Registrations", len(deaths)])
        w.writerow([])

    if "regional" in data_types:
        w.writerow([f"SECTION {section}: REGIONAL BREAKDOWN"])
        section += 1
        w.writerow(["Region", "Births", "Deaths", "Total"])
        regions: dict = {}
        for a in births:
            r = a.child_region_of_birth or "Unspecified"
            regions.setdefault(r, {"births": 0, "deaths": 0})
            regions[r]["births"] += 1
        for a in deaths:
            extra = a.extra_data or {}
            r = extra.get("region_of_death") or a.child_region_of_birth or "Unspecified"
            regions.setdefault(r, {"births": 0, "deaths": 0})
            regions[r]["deaths"] += 1
        for region, counts in sorted(regions.items()):
            w.writerow([region, counts["births"], counts["deaths"], counts["births"] + counts["deaths"]])
        w.writerow([])

    if "agesex" in data_types:
        w.writerow([f"SECTION {section}: SEX DISTRIBUTION (BIRTHS)"])
        section += 1
        w.writerow(["Sex", "Count", "Percentage"])
        males = sum(1 for a in births if str(a.child_gender or "").lower() == "male")
        females = sum(1 for a in births if str(a.child_gender or "").lower() == "female")
        total_b = len(births) or 1
        w.writerow(["Male", males, f"{males / total_b * 100:.1f}%"])
        w.writerow(["Female", females, f"{females / total_b * 100:.1f}%"])
        w.writerow(["Total", len(births), "100%"])
        w.writerow([])

    if "cause" in data_types:
        w.writerow([f"SECTION {section}: CAUSE OF DEATH"])
        section += 1
        w.writerow(["Note: Cause-of-death data is not yet available in the digital records system."])
        w.writerow(["Please contact the BDR Head Office at data@bdregistry.gov.gh for historical records."])
        w.writerow([])

    if "bulletins" in data_types:
        w.writerow([f"SECTION {section}: REGISTRATION STATUS SUMMARY"])
        section += 1
        w.writerow(["Status", "Count"])
        status_counts: dict = {}
        for a in apps:
            s = str(a.status.value if hasattr(a.status, "value") else a.status)
            status_counts[s] = status_counts.get(s, 0) + 1
        for s, c in sorted(status_counts.items()):
            w.writerow([s.replace("_", " ").title(), c])
        w.writerow([])

    w.writerow(["END OF REPORT"])
    w.writerow(["For queries: data@bdregistry.gov.gh | P.O. Box M239, Ministries, Accra, Ghana"])

    content = buf.getvalue().encode("utf-8-sig")
    return content, f"BDR_Statistics_{req.reference}.csv"


def generate_statistics_pdf(db: Session, req: StatisticsRequest) -> Tuple[bytes, str]:
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT

    PRIMARY = colors.HexColor("#006B3C")
    GOLD = colors.HexColor("#FCD116")
    LIGHT = colors.HexColor("#f0fdf4")
    MUTED = colors.HexColor("#6b7280")
    BORDER = colors.HexColor("#e5e7eb")

    apps = _get_apps(db, req)
    births = [a for a in apps if _app_type(a) == "BIRTH"]
    deaths = [a for a in apps if _app_type(a) == "DEATH"]
    data_types = req.data_types or []

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2.5 * cm, bottomMargin=2 * cm,
        title=f"BDR Statistics Report {req.reference}",
        author="Births and Deaths Registry Ghana",
    )

    base = getSampleStyleSheet()
    title_s = ParagraphStyle("title_s", parent=base["Title"], fontSize=17, textColor=PRIMARY, spaceAfter=4)
    sub_s = ParagraphStyle("sub_s", parent=base["Normal"], fontSize=11, textColor=MUTED, spaceAfter=12)
    h1_s = ParagraphStyle("h1_s", parent=base["Heading2"], fontSize=12, textColor=PRIMARY, spaceAfter=6, spaceBefore=14)
    body_s = ParagraphStyle("body_s", parent=base["Normal"], fontSize=10, spaceAfter=4, leading=14)
    small_s = ParagraphStyle("small_s", parent=base["Normal"], fontSize=8, textColor=MUTED, leading=12)

    TBL = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ])

    story = []

    story.append(Paragraph("Births and Deaths Registry — Ghana", title_s))
    story.append(Paragraph("Official Statistical Data Report", sub_s))
    story.append(HRFlowable(width="100%", thickness=2, color=GOLD, spaceAfter=12))

    meta = [
        ["Reference:", req.reference],
        ["Organisation:", req.org_name],
        ["Organisation Type:", req.org_type.capitalize()],
        ["Contact Person:", req.contact_person],
        ["Data Period:", f"{req.period_from}  to  {req.period_to}"],
        ["Report Generated:", datetime.now().strftime("%d %B %Y, %H:%M UTC")],
    ]
    mt = Table(meta, colWidths=[4.5 * cm, 12 * cm])
    mt.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(mt)
    story.append(Spacer(1, 0.5 * cm))

    if "national" in data_types or "bulletins" in data_types:
        story.append(Paragraph("1. National Summary", h1_s))
        tdata = [
            ["Category", "Count"],
            ["Total Registrations", str(len(apps))],
            ["Birth Registrations", str(len(births))],
            ["Death Registrations", str(len(deaths))],
        ]
        t = Table(tdata, colWidths=[11 * cm, 5.5 * cm])
        t.setStyle(TBL)
        story.append(t)
        story.append(Spacer(1, 0.3 * cm))

    if "regional" in data_types:
        story.append(Paragraph("2. Regional Breakdown", h1_s))
        regions: dict = {}
        for a in births:
            r = a.child_region_of_birth or "Unspecified"
            regions.setdefault(r, {"births": 0, "deaths": 0})
            regions[r]["births"] += 1
        for a in deaths:
            extra = a.extra_data or {}
            r = extra.get("region_of_death") or a.child_region_of_birth or "Unspecified"
            regions.setdefault(r, {"births": 0, "deaths": 0})
            regions[r]["deaths"] += 1
        tdata = [["Region", "Births", "Deaths", "Total"]]
        for region, counts in sorted(regions.items()):
            tdata.append([region, str(counts["births"]), str(counts["deaths"]), str(counts["births"] + counts["deaths"])])
        t = Table(tdata, colWidths=[8 * cm, 2.8 * cm, 2.8 * cm, 2.8 * cm])
        t.setStyle(TBL)
        story.append(t)
        story.append(Spacer(1, 0.3 * cm))

    if "agesex" in data_types:
        story.append(Paragraph("3. Sex Distribution (Births)", h1_s))
        males = sum(1 for a in births if str(a.child_gender or "").lower() == "male")
        females = sum(1 for a in births if str(a.child_gender or "").lower() == "female")
        total_b = len(births) or 1
        tdata = [
            ["Sex", "Count", "Percentage"],
            ["Male", str(males), f"{males / total_b * 100:.1f}%"],
            ["Female", str(females), f"{females / total_b * 100:.1f}%"],
            ["Total", str(len(births)), "100.0%"],
        ]
        t = Table(tdata, colWidths=[7 * cm, 4 * cm, 5.5 * cm])
        t.setStyle(TBL)
        story.append(t)
        story.append(Spacer(1, 0.3 * cm))

    if "cause" in data_types:
        story.append(Paragraph("4. Cause of Death", h1_s))
        story.append(Paragraph(
            "Cause-of-death data is not yet available in the digital records system. "
            "Please contact the BDR Head Office at data@bdregistry.gov.gh for historical records.",
            body_s,
        ))
        story.append(Spacer(1, 0.3 * cm))

    if "bulletins" in data_types:
        story.append(Paragraph("5. Registration Status Summary", h1_s))
        status_counts: dict = {}
        for a in apps:
            s = str(a.status.value if hasattr(a.status, "value") else a.status)
            status_counts[s] = status_counts.get(s, 0) + 1
        tdata = [["Status", "Count"]]
        for s, c in sorted(status_counts.items()):
            tdata.append([s.replace("_", " ").title(), str(c)])
        t = Table(tdata, colWidths=[11 * cm, 5.5 * cm])
        t.setStyle(TBL)
        story.append(t)
        story.append(Spacer(1, 0.3 * cm))

    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=8))
    story.append(Paragraph(
        "<b>Confidentiality Notice:</b> The data provided by the Births and Deaths Registry is for the "
        "stated purpose only. Redistribution, resale, or use beyond the approved scope is strictly "
        "prohibited under Ghana\u2019s Data Protection Act, 2012 (Act 843). Unauthorised sharing may result in legal action.",
        small_s,
    ))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "For assistance: data@bdregistry.gov.gh \u2022 P.O. Box M239, Ministries, Accra, Ghana",
        small_s,
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read(), f"BDR_Statistics_{req.reference}.pdf"


def generate_statistics_data_file(db: Session, req: StatisticsRequest) -> Tuple[bytes, str, str]:
    fmt = (req.format or "pdf").lower()
    if fmt == "pdf":
        try:
            content, filename = generate_statistics_pdf(db, req)
            return content, filename, "application/pdf"
        except Exception as exc:
            logger.warning("PDF generation failed, falling back to CSV: %s", exc)
            content, filename = generate_statistics_csv(db, req)
            return content, filename, "text/csv"
    else:
        content, filename = generate_statistics_csv(db, req)
        return content, filename, "text/csv"
