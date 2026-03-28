import base64
import logging
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def _extract_first_name(full_name: str) -> str:
    """Extract first name from full name, fallback to full name if parsing fails."""
    if not full_name or not isinstance(full_name, str):
        return "Valued Customer"
    parts = full_name.strip().split()
    return parts[0] if parts else "Valued Customer"

try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, ReplyTo
except Exception:
    SendGridAPIClient = None
    Mail = None
    ReplyTo = None


def _sendgrid_ready() -> bool:
    return bool(settings.SENDGRID_API_KEY)


def _smtp_ready() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_PORT and settings.SMTP_USER and settings.SMTP_PASSWORD)


def _resolve_logo_src() -> str:
    return settings.LOGO_URL


def _base_template(content_html: str, preheader: str = "") -> str:
    logo_url = _resolve_logo_src()
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Births and Deaths Registry Ghana</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">{preheader}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr>
    <td style="background-color:#006B3C;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
      <img src="{logo_url}" alt="BDR Logo" width="60" height="60" style="border-radius:50%;border:2px solid #FCD116;display:block;margin:0 auto 14px;" />
      <div style="font-size:20px;font-weight:700;color:#FCD116;letter-spacing:0.03em;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Births and Deaths Registry</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;letter-spacing:0.05em;text-transform:uppercase;">Ministry of Interior, Republic of Ghana</div>
    </td>
  </tr>
  <tr><td style="height:4px;background-color:#FCD116;"></td></tr>
  <tr>
    <td style="background-color:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      {content_html}
    </td>
  </tr>
  <tr>
    <td style="background-color:#f8f9fa;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
      <div style="font-size:11px;color:#9ca3af;line-height:1.8;">
        <strong style="color:#6b7280;font-size:12px;">Births and Deaths Registry Ghana</strong><br>
        P.O. Box M239, Ministries, Accra &mdash; Greater Accra, Ghana<br>
        This is an official communication from the Births and Deaths Registry,<br>Ministry of Interior, Republic of Ghana.<br><br>
        <span style="font-size:10px;color:#d1d5db;">&copy; 2026 Births and Deaths Registry. All rights reserved.</span>
      </div>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>"""


def _send_via_smtp(to_email, subject, html_body, text_body, attachments):
    if attachments:
        outer = MIMEMultipart("mixed")
        outer["Subject"] = subject
        outer["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        outer["To"] = to_email
        alt = MIMEMultipart("alternative")
        alt.attach(MIMEText(text_body or "Please use an HTML-compatible email client.", "plain", "utf-8"))
        alt.attach(MIMEText(html_body, "html", "utf-8"))
        outer.attach(alt)
        for att in attachments:
            part = MIMEApplication(att["content"], Name=att["filename"])
            part["Content-Disposition"] = f'attachment; filename="{att["filename"]}"'
            outer.attach(part)
        msg = outer
    else:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(text_body or "Please use an HTML-compatible email client.", "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
    logger.info("SMTP: email sent to %s", to_email)
    return True


def send_email_notification(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
    attachments: list | None = None,
) -> bool:
    # SMTP first — Gmail app-password is verified and reliable
    if _smtp_ready():
        try:
            return _send_via_smtp(to_email, subject, html_body, text_body, attachments)
        except Exception as exc:
            logger.warning("SMTP failed for %s: %s — trying SendGrid", to_email, exc)

    # SendGrid fallback
    if _sendgrid_ready() and SendGridAPIClient is not None:
        try:
            from sendgrid.helpers.mail import Attachment, FileContent, FileName, FileType, Disposition
            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            message = Mail(
                from_email=(settings.SENDGRID_FROM_EMAIL, settings.SENDGRID_FROM_NAME),
                to_emails=to_email,
                subject=subject,
                html_content=html_body,
                plain_text_content=text_body or "Please use an HTML-compatible email client.",
            )
            if settings.SENDGRID_REPLY_TO:
                message.reply_to = ReplyTo(settings.SENDGRID_REPLY_TO)
            if attachments:
                for att in attachments:
                    message.add_attachment(Attachment(
                        file_content=FileContent(base64.b64encode(att["content"]).decode()),
                        file_name=FileName(att["filename"]),
                        file_type=FileType(att.get("mime_type", "application/octet-stream")),
                        disposition=Disposition("attachment"),
                    ))
            response = sg.send(message)
            if 200 <= response.status_code < 300:
                logger.info("SendGrid: email sent to %s (status %s)", to_email, response.status_code)
                return True
            logger.warning("SendGrid returned status %s for %s", response.status_code, to_email)
        except Exception as exc:
            logger.exception("SendGrid failed for %s: %s", to_email, exc)

    logger.error("All email transports failed for %s — email not delivered", to_email)
    return False


def send_verification_email(to_email: str, full_name: str, token: str) -> bool:
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    subject = "Verify your Births and Deaths Registry account"
    preheader = "Please verify your email address to activate your account."
    first_name = _extract_first_name(full_name)
    content = f"""
<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Dear {first_name},</h2>
<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
  Welcome to the Ghana Births and Deaths Registry Portal. To activate your account and begin
  accessing our services, please verify your email address by clicking the button below.
</p>
<p style="margin:0 0 12px;font-size:13px;color:#6b7280;">This link expires in <strong>24 hours</strong>.</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="border-radius:8px;background-color:#006B3C;">
      <a href="{verify_url}" style="display:inline-block;background-color:#006B3C;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.02em;">Verify Email Address</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">
  If the button above does not work, copy and paste this link into your browser:<br>
  <a href="{verify_url}" style="color:#006B3C;word-break:break-all;">{verify_url}</a>
</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
<p style="font-size:12px;color:#9ca3af;margin:0;">If you did not create an account with the Births and Deaths Registry, you can safely ignore this email.</p>
"""
    html = _base_template(content, preheader)
    text = f"Dear {first_name},\n\nVerify your account: {verify_url}\n\nThis link expires in 24 hours.\n\nIf you did not create this account, ignore this email."
    return send_email_notification(to_email, subject, html, text)


def send_password_reset_email(to_email: str, full_name: str, token: str) -> bool:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    subject = "Password Reset Request - Births and Deaths Registry"
    preheader = "We received a request to reset your password."
    first_name = _extract_first_name(full_name)
    content = f"""
<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Dear {first_name},</h2>
<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
  We received a request to reset the password for your Births and Deaths Registry account.
  Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.
</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="border-radius:8px;background-color:#006B3C;">
      <a href="{reset_url}" style="display:inline-block;background-color:#006B3C;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.02em;">Reset My Password</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">
  If the button above does not work, copy and paste this link into your browser:<br>
  <a href="{reset_url}" style="color:#006B3C;word-break:break-all;">{reset_url}</a>
</p>
<div style="background-color:#fef3cd;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;margin:20px 0;">
  <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
    <strong>Security notice:</strong> If you did not request a password reset, your account may be at risk.
    Please contact us immediately at <a href="mailto:support@birthdeathregistry.gov.gh" style="color:#92400e;">support@birthdeathregistry.gov.gh</a>.
  </p>
</div>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
<p style="font-size:12px;color:#9ca3af;margin:0;">If you did not request this password reset, you can safely ignore this email. Your password will not change.</p>
"""
    html = _base_template(content, preheader)
    text = f"Dear {first_name},\n\nReset your password: {reset_url}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email."
    return send_email_notification(to_email, subject, html, text)


def send_welcome_email(to_email: str, full_name: str, account_type: str = "citizen") -> bool:
    subject = "Welcome to the Births and Deaths Registry Ghana"
    preheader = "Your account is active. Here is what you can do next."
    first_name = _extract_first_name(full_name)
    portal_url = settings.FRONTEND_URL
    account_label = account_type.replace("_", " ").title()
    content = f"""
<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Welcome, {first_name}!</h2>
<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
  Your <strong>{account_label}</strong> account on the Ghana Births and Deaths Registry Portal has been
  successfully created and is now active. You can now access a full range of civil registration services online.
</p>
<table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 28px;">
  <tr>
    <td style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#166534;">What you can do with your account:</p>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#374151;line-height:2;">
        <li>Register births and deaths online</li>
        <li>Track your application status in real time</li>
        <li>Request certified certificates and extracts</li>
        <li>Make secure online payments</li>
        <li>Choose delivery or office pickup for documents</li>
      </ul>
    </td>
  </tr>
</table>
<table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
  <tr>
    <td style="border-radius:8px;background-color:#006B3C;">
      <a href="{portal_url}/dashboard" style="display:inline-block;background-color:#006B3C;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.02em;">Go to My Dashboard</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
  If you need assistance, please visit our <a href="{portal_url}/faq" style="color:#006B3C;">FAQ page</a> or
  <a href="{portal_url}/contact" style="color:#006B3C;">contact our support team</a>.
</p>
"""
    html = _base_template(content, preheader)
    text = f"Welcome, {first_name}!\n\nYour {account_label} account has been created successfully.\n\nVisit your dashboard: {portal_url}/dashboard"
    return send_email_notification(to_email, subject, html, text)


def send_application_submitted_email(
    to_email: str,
    full_name: str,
    application_number: str,
    app_type: str,
    processing_type: str,
) -> bool:
    subject = f"Application Submitted - {application_number}"
    preheader = f"Your {app_type} application has been received and is being processed."
    first_name = _extract_first_name(full_name)
    portal_url = settings.FRONTEND_URL
    processing_days = 30 if processing_type.lower() == "normal" else 7
    content = f"""
<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Dear {first_name},</h2>
<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
  Your <strong>{app_type}</strong> application has been successfully submitted to the Births and Deaths Registry.
  Our team will review your application and process it within the expected timeframe.
</p>
<table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 28px;">
  <tr>
    <td style="background-color:#f8f9fa;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:50%;">Application Number</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">{application_number}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Application Type</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">{app_type}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Processing Type</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">{processing_type}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Expected Processing Time</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">Up to {processing_days} working days</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Status</td>
          <td style="padding:6px 0;">
            <span style="display:inline-block;background-color:#fef3c7;color:#92400e;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">PENDING REVIEW</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
  <tr>
    <td style="border-radius:8px;background-color:#006B3C;">
      <a href="{portal_url}/track" style="display:inline-block;background-color:#006B3C;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.02em;">Track Application Status</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
  Please save your application number <strong>{application_number}</strong> for future reference.
  You will receive email and SMS notifications as your application progresses.
</p>
"""
    html = _base_template(content, preheader)
    text = (
        f"Dear {first_name},\n\nYour {app_type} application has been submitted.\n\n"
        f"Application Number: {application_number}\nProcessing Type: {processing_type}\n"
        f"Expected Time: Up to {processing_days} working days\n\n"
        f"Track your application: {portal_url}/track"
    )
    return send_email_notification(to_email, subject, html, text)


def send_application_status_email(
    to_email: str,
    full_name: str,
    application_number: str,
    new_status: str,
    message: str = "",
) -> bool:
    subject = f"Application Update - {application_number}"
    preheader = f"Your application status has been updated to {new_status}."
    first_name = _extract_first_name(full_name)
    portal_url = settings.FRONTEND_URL
    status_upper = new_status.upper().replace("_", " ")

    status_color_map = {
        "approved": ("#d1fae5", "#065f46", "#059669"),
        "rejected": ("#fee2e2", "#7f1d1d", "#dc2626"),
        "completed": ("#d1fae5", "#065f46", "#059669"),
        "under review": ("#dbeafe", "#1e3a8a", "#2563eb"),
        "pending": ("#fef3c7", "#78350f", "#d97706"),
    }
    default_colors = ("#f3f4f6", "#111827", "#6b7280")
    bg, text_c, badge_c = status_color_map.get(new_status.lower(), default_colors)

    extra_message = f"""
<div style="background-color:#f0fdf4;border-left:4px solid #006B3C;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
  <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">{message}</p>
</div>""" if message else ""

    content = f"""
<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Dear {first_name},</h2>
<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
  There has been an update to your application with the Births and Deaths Registry.
  Please review the details below.
</p>
<table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;">
  <tr>
    <td style="background-color:#f8f9fa;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:50%;">Application Number</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">{application_number}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">New Status</td>
          <td style="padding:6px 0;">
            <span style="display:inline-block;background-color:{bg};color:{text_c};font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">{status_upper}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
{extra_message}
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="border-radius:8px;background-color:#006B3C;">
      <a href="{portal_url}/dashboard" style="display:inline-block;background-color:#006B3C;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.02em;">View Application Details</a>
    </td>
  </tr>
</table>
<p style="font-size:12px;color:#9ca3af;margin:0;">If you have questions about this update, please contact your nearest registry office or visit our contact page.</p>
"""
    html = _base_template(content, preheader)
    text = (
        f"Dear {first_name},\n\nApplication {application_number} status updated to: {new_status}.\n"
        + (f"\n{message}\n" if message else "")
        + f"\nView details: {portal_url}/dashboard"
    )
    return send_email_notification(to_email, subject, html, text)


def send_certificate_ready_email(
    to_email: str,
    full_name: str,
    application_number: str,
    office_name: str,
) -> bool:
    subject = f"Certificate Ready for Collection - {application_number}"
    preheader = "Your certificate is ready. Please collect it at your designated office."
    first_name = _extract_first_name(full_name)
    portal_url = settings.FRONTEND_URL
    content = f"""
<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Dear {first_name},</h2>
<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
  Great news! Your certificate for application <strong>{application_number}</strong> has been processed
  and is now ready for collection at the office indicated below.
</p>
<table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 28px;">
  <tr>
    <td style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:50%;">Application Number</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">{application_number}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Collection Office</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">{office_name}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Status</td>
          <td style="padding:6px 0;">
            <span style="display:inline-block;background-color:#d1fae5;color:#065f46;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">READY FOR COLLECTION</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<div style="background-color:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;margin:0 0 28px;">
  <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">What to bring when collecting:</p>
  <ul style="margin:0;padding-left:20px;font-size:13px;color:#78350f;line-height:2;">
    <li>A valid government-issued photo ID (Ghana Card, Passport, or Driver's Licence)</li>
    <li>Your application number: <strong>{application_number}</strong></li>
    <li>Payment receipt (if applicable)</li>
  </ul>
</div>
<table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
  <tr>
    <td style="border-radius:8px;background-color:#006B3C;">
      <a href="{portal_url}/offices" style="display:inline-block;background-color:#006B3C;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.02em;">View Office Location</a>
    </td>
  </tr>
</table>
<p style="font-size:12px;color:#9ca3af;margin:0;">Certificates not collected within 90 days may be returned to central records. Contact us if you need to arrange a later collection date.</p>
"""
    html = _base_template(content, preheader)
    text = (
        f"Dear {first_name},\n\nYour certificate for application {application_number} is ready.\n"
        f"Please collect it at: {office_name}\n\n"
        "Bring a valid government-issued ID and your application number.\n\n"
        f"Office locations: {portal_url}/offices"
    )
    return send_email_notification(to_email, subject, html, text)


def send_kyc_document_request_email(to_email: str, full_name: str, admin_message: str, portal_url: str = "") -> bool:
    subject = "Action Required: Additional Documents Needed — Births and Deaths Registry"
    preheader = "Your identity verification requires additional documents. Please sign in to submit them."
    first_name = _extract_first_name(full_name)
    upload_url = portal_url or "https://bdr.gov.gh/profile"
    content = f"""
<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Dear {first_name},</h2>
<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
  Thank you for registering on the Ghana Births and Deaths Registry Portal. Our verification team has reviewed your
  account and requires additional documents to complete your identity verification (KYC).
</p>
<div style="background-color:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
  <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#713f12;text-transform:uppercase;letter-spacing:0.05em;">Message from Verification Team</p>
  <p style="margin:0;font-size:14px;color:#78350f;line-height:1.7;">{admin_message}</p>
</div>
<p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
  Please sign in to your account and navigate to your <strong>Profile &rarr; Identity Verification</strong> section to upload the requested documents.
</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="border-radius:8px;background-color:#006B3C;">
      <a href="{upload_url}" style="display:inline-block;background-color:#006B3C;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.02em;">Upload Documents Now</a>
    </td>
  </tr>
</table>
<div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin:0 0 20px;">
  <p style="margin:0;font-size:13px;color:#7f1d1d;line-height:1.6;">
    <strong>Important:</strong> Failure to submit the requested documents within <strong>14 days</strong> may result in your account being suspended. Please act promptly.
  </p>
</div>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
<p style="font-size:12px;color:#9ca3af;margin:0;">If you believe you have received this email in error or have already submitted the required documents, please contact us at <a href="mailto:support@bdr.gov.gh" style="color:#006B3C;">support@bdr.gov.gh</a>.</p>
"""
    html = _base_template(content, preheader)
    text = (
        f"Dear {first_name},\n\n"
        f"Additional documents are required to complete your identity verification.\n\n"
        f"Message from our team:\n{admin_message}\n\n"
        f"Please sign in to your account and upload the requested documents: {upload_url}\n\n"
        f"You have 14 days to comply, otherwise your account may be suspended."
    )
    return send_email_notification(to_email, subject, html, text)


def send_statistics_request_email(
    to_email: str,
    full_name: str,
    reference: str,
    org_name: str,
    fee_amount: float,
    format_type: str,
) -> bool:
    subject = f"Statistics Data Request Received — {reference}"
    preheader = "Your statistics data request has been received. We will review it shortly."
    first_name = _extract_first_name(full_name)
    portal_url = settings.FRONTEND_URL
    fee_str = "Free of charge" if fee_amount == 0 else f"GH\u20b5 {fee_amount:.2f}"
    payment_note = "" if fee_amount == 0 else f"""
<div style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 18px;margin:20px 0;">
  <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">
    <strong>Payment required:</strong> A fee of <strong>GH\u20b5 {fee_amount:.2f}</strong> is required to process
    this request. Please return to the portal to complete your payment. Your request will only be reviewed
    once payment is confirmed.
  </p>
</div>"""
    content = f"""
<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Dear {first_name},</h2>
<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
  Thank you for submitting a statistics data request to the Births and Deaths Registry. We have received
  your request and it will be reviewed by our data management team within <strong>5 working days</strong>.
</p>
<table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;">
  <tr>
    <td style="background-color:#f8f9fa;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;width:50%;">Reference Number</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;font-family:monospace;">{reference}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">Organisation</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">{org_name}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">Output Format</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;">{format_type}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">Service Fee</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:#111827;">{fee_str}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#6b7280;">Status</td>
            <td style="padding:6px 0;"><span style="display:inline-block;background-color:#fef3c7;color:#92400e;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">PENDING REVIEW</span></td></tr>
      </table>
    </td>
  </tr>
</table>
{payment_note}
<div style="background-color:#f0fdf4;border-left:4px solid #006B3C;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px;">
  <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">
    <strong>What happens next?</strong><br>
    Our data management team will review your request and contact you if additional information is required.
    You will receive a notification by email once your request has been approved, rejected, or fulfilled.
  </p>
</div>
<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="border-radius:8px;background-color:#006B3C;">
      <a href="{portal_url}/services/statistics" style="display:inline-block;background-color:#006B3C;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.02em;">Track My Request</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
  Please keep your reference number <strong>{reference}</strong> safe for future correspondence.
  If you have any questions, contact us at <a href="mailto:data@bdregistry.gov.gh" style="color:#006B3C;">data@bdregistry.gov.gh</a>.
</p>
"""
    html = _base_template(content, preheader)
    text = (
        f"Dear {first_name},\n\n"
        f"Your statistics data request has been received.\n\n"
        f"Reference: {reference}\nOrganisation: {org_name}\nFormat: {format_type}\nFee: {fee_str}\n\n"
        f"Our team will review your request within 5 working days.\n\n"
        f"Track your request: {portal_url}/services/statistics"
    )
    return send_email_notification(to_email, subject, html, text)


def send_statistics_status_email(
    to_email: str,
    full_name: str,
    reference: str,
    org_name: str,
    approval_status: str,
    note: str = "",
    data_format: str = "pdf",
    attachments: list | None = None,
) -> bool:
    status_configs = {
        "approved": {
            "subject": f"Statistics Request Approved — {reference}",
            "preheader": "Your data request has been approved. We are preparing your data.",
            "badge_bg": "#d1fae5", "badge_color": "#065f46", "badge_label": "APPROVED",
            "title": "Your Data Request Has Been Approved",
            "body": (
                f"We are pleased to inform you that your statistics data request <strong>{reference}</strong> "
                f"for <strong>{org_name}</strong> has been reviewed and approved by our data management team. "
                f"We are now preparing your data in <strong>{data_format.upper()}</strong> format "
                f"and it will be delivered to this email address once ready."
            ),
            "next_step": "You will receive another email with your data file attached once it has been prepared.",
        },
        "rejected": {
            "subject": f"Statistics Request Declined — {reference}",
            "preheader": "Your data request could not be approved. Please see the details below.",
            "badge_bg": "#fee2e2", "badge_color": "#7f1d1d", "badge_label": "DECLINED",
            "title": "Your Data Request Could Not Be Approved",
            "body": (
                f"We regret to inform you that your statistics data request <strong>{reference}</strong> "
                f"for <strong>{org_name}</strong> has not been approved at this time. "
                f"Please review the reason provided below and contact our data team if you need clarification "
                f"or wish to resubmit with updated information."
            ),
            "next_step": "You may resubmit a new request through our portal after addressing the stated concerns.",
        },
        "fulfilled": {
            "subject": f"Statistics Data Ready — {reference}",
            "preheader": "Your requested data has been fulfilled and is on its way.",
            "badge_bg": "#d1fae5", "badge_color": "#065f46", "badge_label": "FULFILLED",
            "title": "Your Statistics Data Has Been Sent",
            "body": (
                f"Your statistics data request <strong>{reference}</strong> for <strong>{org_name}</strong> "
                f"has been fulfilled. The requested data in <strong>{data_format.upper()}</strong> format "
                f"has been prepared and sent to this email address as an attachment or secure download link."
            ),
            "next_step": (
                "If you do not receive the data within 24 hours, please check your spam folder or "
                "contact us at <a href='mailto:data@bdregistry.gov.gh' style='color:#006B3C;'>data@bdregistry.gov.gh</a>."
            ),
        },
    }
    cfg = status_configs.get(approval_status.lower(), {
        "subject": f"Statistics Request Update — {reference}",
        "preheader": "There is an update on your statistics data request.",
        "badge_bg": "#f3f4f6", "badge_color": "#111827", "badge_label": approval_status.upper(),
        "title": "Update on Your Data Request",
        "body": f"Your statistics data request <strong>{reference}</strong> status has been updated to <strong>{approval_status}</strong>.",
        "next_step": "Please log in to the portal to view the full details.",
    })

    first_name = _extract_first_name(full_name)
    portal_url = settings.FRONTEND_URL
    note_html = ""
    if note:
        note_html = f"""
<div style="background-color:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #f97316;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
  <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#c2410c;">Message from BDR Data Team</p>
  <p style="margin:0;font-size:14px;color:#431407;line-height:1.65;">{note}</p>
</div>"""

    content = f"""
<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Dear {first_name},</h2>
<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">{cfg['body']}</p>
{note_html}
<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0 20px;">
  <tr>
    <td style="background-color:#f8f9fa;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;width:50%;">Reference</td>
            <td style="padding:5px 0;font-size:13px;font-weight:700;color:#111827;font-family:monospace;">{reference}</td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Organisation</td>
            <td style="padding:5px 0;font-size:13px;font-weight:700;color:#111827;">{org_name}</td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Status</td>
            <td style="padding:5px 0;"><span style="display:inline-block;background-color:{cfg['badge_bg']};color:{cfg['badge_color']};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">{cfg['badge_label']}</span></td></tr>
      </table>
    </td>
  </tr>
</table>
<div style="background-color:#f0fdf4;border-left:4px solid #006B3C;border-radius:0 8px 8px 0;padding:14px 18px;margin:0 0 24px;">
  <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;"><strong>Next steps:</strong><br>{cfg['next_step']}</p>
</div>
<div style="background-color:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin:0 0 24px;">
  <p style="margin:0;font-size:12px;color:#78350f;line-height:1.6;">
    <strong>Confidentiality Notice:</strong> The data provided by the Births and Deaths Registry is for
    the stated purpose only. Redistribution, resale, or use beyond the approved scope is strictly prohibited
    under Ghana's Data Protection Act, 2012 (Act 843). Unauthorised sharing may result in legal action.
  </p>
</div>
<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr>
    <td style="border-radius:8px;background-color:#006B3C;">
      <a href="{portal_url}/services/statistics" style="display:inline-block;background-color:#006B3C;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.02em;">View Request Status</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
  For assistance, contact our data team at <a href="mailto:data@bdregistry.gov.gh" style="color:#006B3C;">data@bdregistry.gov.gh</a>.
</p>
"""
    html = _base_template(content, cfg["preheader"])
    text = (
        f"Dear {first_name},\n\nYour statistics data request {reference} status: {approval_status.upper()}.\n\n"
        + (f"Note from BDR: {note}\n\n" if note else "")
        + f"Track your request: {portal_url}/services/statistics\n\n"
        "CONFIDENTIALITY: This data is for your stated purpose only. Redistribution is prohibited under Ghana's Data Protection Act."
    )
    return send_email_notification(to_email, cfg["subject"], html, text, attachments=attachments)


def send_phone_otp_email(to_email: str, full_name: str, otp_code: str) -> bool:
    subject = "Your One-Time Passcode - Births and Deaths Registry"
    preheader = f"Your OTP is {otp_code}. It expires in 10 minutes."
    first_name = _extract_first_name(full_name)
    content = f"""
<h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Dear {first_name},</h2>
<p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
  Your one-time passcode (OTP) for the Births and Deaths Registry Portal is:
</p>
<table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;width:100%;">
  <tr>
    <td align="center">
      <div style="display:inline-block;background-color:#006B3C;color:#FCD116;font-size:36px;font-weight:900;letter-spacing:0.3em;padding:20px 40px;border-radius:12px;font-family:'Courier New',Courier,monospace;">{otp_code}</div>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7;text-align:center;">
  This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.
</p>
<div style="background-color:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:14px 18px;margin:0 0 20px;">
  <p style="margin:0;font-size:13px;color:#7f1d1d;line-height:1.6;">
    <strong>Security warning:</strong> The Births and Deaths Registry will never ask you for your OTP via phone or email. Do not share this code with anyone.
  </p>
</div>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
<p style="font-size:12px;color:#9ca3af;margin:0;">If you did not request this code, please ignore this email and ensure your account is secure.</p>
"""
    html = _base_template(content, preheader)
    text = f"Dear {first_name},\n\nYour OTP is: {otp_code}\n\nThis code expires in 10 minutes. Do not share it with anyone."
    return send_email_notification(to_email, subject, html, text)
