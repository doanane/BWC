import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from twilio.rest import Client
except Exception:
    Client = None


def _twilio_client():
    if Client is None:
        return None
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN):
        return None
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


def send_sms_notification(phone_number: str, message: str) -> bool:
    client = _twilio_client()
    if not client:
        logger.warning("Twilio not configured. Skipping SMS to %s", phone_number)
        return False
    if not settings.TWILIO_PHONE_NUMBER:
        logger.warning("TWILIO_PHONE_NUMBER not set")
        return False
    try:
        client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone_number,
        )
        logger.info("SMS sent to %s", phone_number)
        return True
    except Exception as exc:
        logger.exception("Failed to send SMS to %s: %s", phone_number, exc)
        return False


def send_phone_otp(phone_number: str) -> bool:
    client = _twilio_client()
    if not client:
        logger.warning("Twilio not configured. Cannot send OTP to %s", phone_number)
        return False
    if not settings.TWILIO_VERIFY_SERVICE_SID:
        logger.warning("TWILIO_VERIFY_SERVICE_SID not set")
        return False
    try:
        verification = client.verify.v2.services(settings.TWILIO_VERIFY_SERVICE_SID).verifications.create(
            to=phone_number,
            channel="sms",
        )
        logger.info("OTP sent to %s, status: %s", phone_number, verification.status)
        return verification.status in ("pending", "approved")
    except Exception as exc:
        logger.exception("Failed to send OTP to %s: %s", phone_number, exc)
        return False


def verify_phone_otp(phone_number: str, code: str) -> bool:
    client = _twilio_client()
    if not client:
        return False
    if not settings.TWILIO_VERIFY_SERVICE_SID:
        return False
    try:
        check = client.verify.v2.services(settings.TWILIO_VERIFY_SERVICE_SID).verification_checks.create(
            to=phone_number,
            code=code,
        )
        logger.info("OTP check for %s: %s", phone_number, check.status)
        return check.status == "approved"
    except Exception as exc:
        logger.exception("OTP verification failed for %s: %s", phone_number, exc)
        return False


def send_registration_sms(phone_number: str, full_name: str) -> bool:
    message = (
        f"Welcome to Ghana Births & Deaths Registry, {full_name}! "
        "Your account has been created successfully. "
        "Visit bdr.gov.gh to get started."
    )
    return send_sms_notification(phone_number, message)


def send_application_sms(phone_number: str, application_number: str, app_type: str) -> bool:
    message = (
        f"BDR Ghana: Your {app_type} application {application_number} has been submitted. "
        "You will be notified on status updates. Thank you."
    )
    return send_sms_notification(phone_number, message)


def send_status_update_sms(phone_number: str, application_number: str, status: str) -> bool:
    message = (
        f"BDR Ghana: Application {application_number} status updated to: {status}. "
        "Log in to your account for details."
    )
    return send_sms_notification(phone_number, message)


def send_certificate_ready_sms(phone_number: str, application_number: str, office: str) -> bool:
    message = (
        f"BDR Ghana: Your certificate for application {application_number} is ready. "
        f"Please collect it at {office} with a valid ID."
    )
    return send_sms_notification(phone_number, message)
