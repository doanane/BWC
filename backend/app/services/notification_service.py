from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional, Tuple
from app.models.notification import Notification, NotificationType, NotificationChannel, NotificationStatus
from app.models.user import User, UserRole
from app.services.realtime_service import notification_ws_manager
from app.utils.email import send_email_notification
from app.utils.sms import send_sms_notification
from datetime import datetime, timezone
import anyio
import logging

logger = logging.getLogger(__name__)

STATUS_NOTIFICATION_MAP = {
    "SUBMITTED": {
        "type": NotificationType.APPLICATION_SUBMITTED,
        "title": "Application Submitted Successfully",
        "badge": "blue",
        "message_tpl": "We have received your application {ref} and it is now in our queue for review. Our team will begin processing it shortly. You will be notified at each stage of your application.",
    },
    "UNDER_REVIEW": {
        "type": NotificationType.APPLICATION_UNDER_REVIEW,
        "title": "Application Under Review",
        "badge": "yellow",
        "message_tpl": "Your application {ref} is currently being reviewed by our registration officers. This process typically takes 3–5 working days. We will notify you of any updates or if additional information is required.",
    },
    "APPROVED": {
        "type": NotificationType.APPLICATION_APPROVED,
        "title": "Application Approved",
        "badge": "green",
        "message_tpl": "Your application {ref} has been approved by our reviewing officer. To proceed with certificate generation, please log in to the portal and complete the required payment.",
    },
    "REJECTED": {
        "type": NotificationType.APPLICATION_REJECTED,
        "title": "Application Rejected",
        "badge": "red",
        "message_tpl": "We regret to inform you that your application {ref} has been rejected by our reviewing officer. Please review the reason provided below and contact your nearest Births and Deaths Registry office for further guidance or to resubmit with the correct documentation.",
    },
    "ADDITIONAL_INFO_REQUIRED": {
        "type": NotificationType.APPLICATION_UNDER_REVIEW,
        "title": "Additional Information Required",
        "badge": "orange",
        "message_tpl": "Your application {ref} requires additional information or documentation before we can continue processing. Please review the details below and provide the requested documents through the portal or by visiting your nearest district office within 14 days.",
    },
    "PENDING_DOCUMENTS": {
        "type": NotificationType.APPLICATION_UNDER_REVIEW,
        "title": "Documents Required",
        "badge": "orange",
        "message_tpl": "Your application {ref} is on hold pending supporting documents. Please review what is required below and submit them through the portal or visit your nearest district office within 14 days to avoid delays.",
    },
    "PAYMENT_PENDING": {
        "type": NotificationType.PAYMENT_REQUIRED,
        "title": "Payment Required",
        "badge": "orange",
        "message_tpl": "A payment of GHS {fee} is required to continue processing your application {ref}. Please log in to the portal to complete your payment. Your application will proceed immediately after payment is confirmed.",
    },
    "PAYMENT_COMPLETED": {
        "type": NotificationType.PAYMENT_RECEIVED,
        "title": "Payment Confirmed",
        "badge": "green",
        "message_tpl": "Your payment for application {ref} has been received and confirmed. Your certificate is now being prepared for printing. You will be notified once it is ready for collection.",
    },
    "PROCESSING": {
        "type": NotificationType.APPLICATION_UNDER_REVIEW,
        "title": "Certificate Being Printed",
        "badge": "blue",
        "message_tpl": "Your certificate for application {ref} is currently being printed and quality-checked at our processing centre. You will be notified as soon as it is ready for collection at your selected district office.",
    },
    "READY": {
        "type": NotificationType.CERTIFICATE_READY,
        "title": "Certificate Ready for Collection",
        "badge": "green",
        "message_tpl": "Your certificate for application {ref} is ready and waiting for you at your selected Births and Deaths Registry district office. Please bring a valid national ID card and your application reference number. Certificates not collected within 30 days may attract a late collection fee.",
    },
    "CERTIFICATE_READY": {
        "type": NotificationType.CERTIFICATE_READY,
        "title": "Certificate Ready for Collection",
        "badge": "green",
        "message_tpl": "Your certificate for application {ref} is ready and waiting for you at your selected Births and Deaths Registry district office. Please bring a valid national ID card and your application reference number. Certificates not collected within 30 days may attract a late collection fee.",
    },
    "COLLECTED": {
        "type": NotificationType.CERTIFICATE_READY,
        "title": "Certificate Collected",
        "badge": "green",
        "message_tpl": "Your certificate for application {ref} has been successfully collected. This application is now complete. Thank you for using the Ghana Births and Deaths Registry digital portal.",
    },
    "DELIVERED": {
        "type": NotificationType.DELIVERY_COMPLETED,
        "title": "Certificate Delivered",
        "badge": "green",
        "message_tpl": "Your certificate for application {ref} has been successfully delivered to your address. This application is now complete. Thank you for using the Ghana Births and Deaths Registry.",
    },
    "CANCELLED": {
        "type": NotificationType.SYSTEM_ANNOUNCEMENT,
        "title": "Application Cancelled",
        "badge": "red",
        "message_tpl": "Your application {ref} has been cancelled. If you believe this was done in error, please contact your nearest Births and Deaths Registry office immediately with your reference number.",
    },
}

EMAIL_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ghana Births and Deaths Registry</title>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#eef0f3;padding:24px 12px}}
    .outer{{max-width:620px;margin:0 auto}}
    .card{{background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.10)}}
    .hdr{{background:#006B3C;padding:0}}
    .hdr-top{{padding:20px 32px 16px;border-bottom:3px solid #FCD116}}
    .hdr-flag{{font-size:11px;color:rgba(255,255,255,.6);letter-spacing:.8px;text-transform:uppercase;margin-bottom:4px}}
    .hdr-org{{color:#FCD116;font-size:15px;font-weight:700;letter-spacing:.4px}}
    .hdr-sub{{color:rgba(255,255,255,.7);font-size:11px;margin-top:2px}}
    .status-bar{{background:rgba(0,0,0,.15);padding:10px 32px;display:flex;align-items:center;gap:10px}}
    .badge{{display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase}}
    .badge-green{{background:#dcfce7;color:#166534}}
    .badge-blue{{background:#dbeafe;color:#1e3a8a}}
    .badge-yellow{{background:#fef9c3;color:#854d0e}}
    .badge-orange{{background:#ffedd5;color:#9a3412}}
    .badge-red{{background:#fee2e2;color:#991b1b}}
    .bdy{{padding:32px}}
    .greet{{font-size:16px;font-weight:600;color:#111827;margin-bottom:16px}}
    .ttl{{font-size:20px;font-weight:700;color:#006B3C;margin-bottom:14px;line-height:1.3}}
    .msg{{font-size:14px;color:#374151;line-height:1.75;margin-bottom:22px}}
    .ref-box{{background:#f0f9f4;border:1px solid #bbf7d0;border-left:4px solid #006B3C;padding:14px 18px;border-radius:6px;margin-bottom:20px}}
    .ref-lbl{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;margin-bottom:5px}}
    .ref-val{{font-size:18px;font-weight:700;color:#111827;letter-spacing:1px;font-family:monospace}}
    .reason-box{{background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #f97316;padding:16px 18px;border-radius:6px;margin-bottom:20px}}
    .reason-lbl{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#c2410c;margin-bottom:8px}}
    .reason-val{{font-size:14px;color:#431407;line-height:1.65}}
    .divider{{border:none;border-top:1px solid #e5e7eb;margin:24px 0}}
    .cta-wrap{{margin-bottom:24px}}
    .cta{{display:inline-block;background:#006B3C;color:#FCD116!important;text-decoration:none;font-size:14px;font-weight:700;padding:13px 34px;border-radius:7px;letter-spacing:.3px}}
    .note{{font-size:12px;color:#9ca3af;line-height:1.6}}
    .ftr{{background:#f3f4f6;padding:20px 32px;border-top:1px solid #e5e7eb}}
    .ftr-org{{font-size:12px;font-weight:700;color:#374151;margin-bottom:4px}}
    .ftr-links{{font-size:11px;color:#9ca3af;line-height:1.7}}
  </style>
</head>
<body>
  <div class="outer">
    <div class="card">
      <div class="hdr">
        <div class="hdr-top">
          <div class="hdr-flag">Republic of Ghana &mdash; Official Communication</div>
          <div class="hdr-org">Ghana Births and Deaths Registry</div>
          <div class="hdr-sub">Ministry of Local Government and Rural Development</div>
        </div>
        <div class="status-bar">
          <span class="badge badge-{badge_class}">{status_label}</span>
        </div>
      </div>
      <div class="bdy">
        <p class="greet">Dear {first_name},</p>
        <h2 class="ttl">{title}</h2>
        <p class="msg">{message}</p>
        {reason_html}
        <div class="ref-box">
          <div class="ref-lbl">Application Reference Number</div>
          <div class="ref-val">{ref}</div>
        </div>
        <div class="cta-wrap">
          <a href="{portal_url}" class="cta">View Application in Portal</a>
        </div>
        <hr class="divider">
        <p class="note">
          If you did not submit this application or have concerns about this notification,
          please contact us immediately at <strong>info@bdregistry.gov.gh</strong>
          or call <strong>+233 302 665 125</strong>.
        </p>
      </div>
      <div class="ftr">
        <div class="ftr-org">Ghana Births and Deaths Registry</div>
        <div class="ftr-links">
          This is an automated notification &mdash; please do not reply to this email.<br>
          Helpline: +233 302 665 125 &bull; Email: info@bdregistry.gov.gh &bull; Web: bdregistry.gov.gh
        </div>
      </div>
    </div>
  </div>
</body>
</html>"""

PORTAL_URL = "http://localhost:5173/dashboard"


class NotificationService:
    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _serialize(notification: Notification) -> dict:
        return {
            "id": notification.id,
            "user_id": notification.user_id,
            "application_id": notification.application_id,
            "notification_type": notification.notification_type.value,
            "channel": notification.channel.value,
            "status": notification.status.value,
            "title": notification.title,
            "message": notification.message,
            "data": notification.data,
            "error_message": notification.error_message,
            "sent_at": notification.sent_at,
            "read_at": notification.read_at,
            "created_at": notification.created_at,
        }

    @staticmethod
    def _dispatch_channel(notification: Notification, user: User) -> Tuple[NotificationStatus, Optional[str]]:
        try:
            if notification.channel == NotificationChannel.EMAIL:
                if not user.notification_email or not user.email:
                    return NotificationStatus.FAILED, "User email notifications disabled"
                data = notification.data or {}
                ref = data.get("ref", "")
                first_name = (getattr(user, "first_name", None) or user.email.split("@")[0]).title()
                status_key = data.get("status", "")
                config = STATUS_NOTIFICATION_MAP.get(status_key.upper(), {})
                badge_class = config.get("badge", "blue")
                status_label = notification.title
                reason = data.get("reason", "")
                reason_html = ""
                if reason:
                    reason_html = (
                        '<div class="reason-box">'
                        '<div class="reason-lbl">Reason / Further Action Required</div>'
                        f'<div class="reason-val">{reason}</div>'
                        "</div>"
                    )
                html_body = EMAIL_HTML_TEMPLATE.format(
                    title=notification.title,
                    message=notification.message,
                    ref=ref,
                    portal_url=PORTAL_URL,
                    first_name=first_name,
                    badge_class=badge_class,
                    status_label=status_label,
                    reason_html=reason_html,
                )
                ok = send_email_notification(
                    to_email=user.email,
                    subject=f"Ghana BDR — {notification.title} [{ref}]",
                    html_body=html_body,
                    text_body=f"Dear {first_name},\n\n{notification.title}\n\n{notification.message}\n\n{'Reason: ' + reason + chr(10) if reason else ''}Reference: {ref}\nPortal: {PORTAL_URL}",
                )
                return (NotificationStatus.DELIVERED, None) if ok else (NotificationStatus.FAILED, "Email dispatch failed")

            if notification.channel == NotificationChannel.SMS:
                if not user.notification_sms or not user.phone_number:
                    return NotificationStatus.FAILED, "User SMS notifications disabled"
                ok = send_sms_notification(
                    user.phone_number,
                    f"Ghana BDR: {notification.title}. {notification.message[:120]} Portal: {PORTAL_URL}",
                )
                return (NotificationStatus.DELIVERED, None) if ok else (NotificationStatus.FAILED, "SMS dispatch failed")

            return NotificationStatus.DELIVERED, None
        except Exception as exc:
            return NotificationStatus.FAILED, str(exc)

    @staticmethod
    def _finalize_dispatch(db: Session, notification: Notification, user: User) -> Notification:
        status_value, error_message = NotificationService._dispatch_channel(notification, user)
        notification.status = status_value
        notification.error_message = error_message
        notification.sent_at = NotificationService._now()
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        notification_type: str,
        channel: str,
        title: str,
        message: str,
        application_id: int = None,
        data: dict = None,
    ) -> Notification:
        try:
            notif_type = NotificationType(notification_type)
        except ValueError:
            notif_type = NotificationType.SYSTEM_ANNOUNCEMENT

        try:
            notif_channel = NotificationChannel(channel)
        except ValueError:
            notif_channel = NotificationChannel.IN_APP

        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        notification = Notification(
            user_id=user_id,
            application_id=application_id,
            notification_type=notif_type,
            channel=notif_channel,
            status=NotificationStatus.PENDING,
            title=title,
            message=message,
            data=data or {},
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        notification = NotificationService._finalize_dispatch(db, notification, user)

        try:
            payload = {
                "event": "notification.created",
                "notification": NotificationService._serialize(notification),
            }
            try:
                anyio.from_thread.run(notification_ws_manager.send_to_user, user_id, payload)
            except RuntimeError:
                import asyncio
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.ensure_future(notification_ws_manager.send_to_user(user_id, payload))
        except Exception as exc:
            logger.warning("Realtime push failed for notification %s: %s", notification.id, exc)

        return notification

    @staticmethod
    def notify_status_changed(
        db: Session,
        application,
        user: User,
        new_status,
        reason: str = None,
    ) -> None:
        status_key = new_status.value if hasattr(new_status, "value") else str(new_status)
        config = STATUS_NOTIFICATION_MAP.get(status_key.upper())
        if not config:
            logger.warning("No notification config for status: %s", status_key)
            return

        ref = getattr(application, "application_number", "—")
        fee = getattr(application, "total_fee", 0) or 0
        reason_text = reason or ""

        message = (
            config["message_tpl"]
            .replace("{ref}", ref)
            .replace("{reason}", reason_text or "No reason provided")
            .replace("{fee}", f"{float(fee):.2f}")
        )
        title = config["title"]
        notif_type = config["type"].value
        notif_data = {
            "ref": ref,
            "status": status_key,
            "application_id": application.id,
            "reason": reason_text,
        }

        NotificationService.create_notification(
            db, user.id, notif_type, NotificationChannel.IN_APP.value,
            title, message, application_id=application.id, data=notif_data,
        )

        if user.email:
            NotificationService.create_notification(
                db, user.id, notif_type, NotificationChannel.EMAIL.value,
                title, message, application_id=application.id, data=notif_data,
            )

        if user.notification_sms:
            sms_msg = f"Ref {ref}: {title}. Visit portal for full details."
            NotificationService.create_notification(
                db, user.id, notif_type, NotificationChannel.SMS.value,
                title, sms_msg, application_id=application.id, data=notif_data,
            )

        logger.info("Status change notifications sent for application %s → %s", ref, status_key)

    @staticmethod
    def notify_application_submitted(db: Session, application, user: User):
        NotificationService.notify_status_changed(
            db, application, user,
            type("_S", (), {"value": "SUBMITTED"})(),
        )

    @staticmethod
    def notify_certificate_ready(db: Session, application, user: User):
        NotificationService.notify_status_changed(
            db, application, user,
            type("_R", (), {"value": "READY"})(),
        )

    @staticmethod
    def notify_staff_and_admin(
        db: Session,
        title: str,
        message: str,
        notification_type: str = NotificationType.SYSTEM_ANNOUNCEMENT.value,
        application_id: int | None = None,
        data: dict | None = None,
    ) -> int:
        recipients = (
            db.query(User)
            .filter(
                User.is_active == True,
                User.role.in_([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
            )
            .all()
        )

        sent = 0
        for recipient in recipients:
            try:
                NotificationService.create_notification(
                    db=db,
                    user_id=recipient.id,
                    notification_type=notification_type,
                    channel=NotificationChannel.IN_APP.value,
                    title=title,
                    message=message,
                    application_id=application_id,
                    data=data,
                )
                sent += 1
            except Exception as exc:
                logger.warning("Failed to notify staff/admin user %s: %s", recipient.id, exc)

        return sent

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        unread_only: bool = False,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        query = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.channel == NotificationChannel.IN_APP,
        )
        if unread_only:
            query = query.filter(Notification.status != NotificationStatus.READ)

        total = query.count()
        page = max(1, page)
        page_size = max(1, min(100, page_size))
        items = (
            query.order_by(Notification.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        total_pages = (total + page_size - 1) // page_size if total else 0

        return {
            "items": [NotificationService._serialize(item) for item in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        }

    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        count = (
            db.query(func.count(Notification.id))
            .filter(
                Notification.user_id == user_id,
                Notification.channel == NotificationChannel.IN_APP,
                Notification.status != NotificationStatus.READ,
            )
            .scalar()
        )
        return int(count or 0)

    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> None:
        notification = (
            db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )
        if not notification:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

        notification.status = NotificationStatus.READ
        notification.read_at = NotificationService._now()
        db.add(notification)
        db.commit()

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> int:
        unread_notifications = (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.status != NotificationStatus.READ,
            )
            .all()
        )
        now = NotificationService._now()
        for n in unread_notifications:
            n.status = NotificationStatus.READ
            n.read_at = now
            db.add(n)

        db.commit()
        return len(unread_notifications)
