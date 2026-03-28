import pytest
from unittest.mock import patch, MagicMock


def test_send_sms_notification_success():
    with patch("app.utils.sms.Client") as mock_client_class:
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_client.messages.create.return_value = mock_message
        mock_client_class.return_value = mock_client

        with patch("app.utils.sms.settings") as mock_settings:
            mock_settings.TWILIO_ACCOUNT_SID = "ACtest"
            mock_settings.TWILIO_AUTH_TOKEN = "test_token"
            mock_settings.TWILIO_PHONE_NUMBER = "+15005550006"
            mock_settings.TWILIO_VERIFY_SERVICE_SID = ""

            from app.utils import sms as sms_module
            sms_module.settings = mock_settings

            result = sms_module.send_sms_notification("+233501234567", "Test message")
            assert result is True
            mock_client.messages.create.assert_called_once()


def test_send_sms_notification_no_credentials():
    with patch("app.utils.sms.settings") as mock_settings:
        mock_settings.TWILIO_ACCOUNT_SID = ""
        mock_settings.TWILIO_AUTH_TOKEN = ""
        mock_settings.TWILIO_PHONE_NUMBER = ""

        from app.utils import sms as sms_module
        sms_module.settings = mock_settings

        result = sms_module.send_sms_notification("+233501234567", "Test message")
        assert result is False


def test_send_phone_otp_success():
    with patch("app.utils.sms.Client") as mock_client_class:
        mock_client = MagicMock()
        mock_verification = MagicMock()
        mock_verification.status = "pending"
        mock_client.verify.v2.services.return_value.verifications.create.return_value = mock_verification
        mock_client_class.return_value = mock_client

        with patch("app.utils.sms.settings") as mock_settings:
            mock_settings.TWILIO_ACCOUNT_SID = "ACtest"
            mock_settings.TWILIO_AUTH_TOKEN = "test_token"
            mock_settings.TWILIO_VERIFY_SERVICE_SID = "VAtest"

            from app.utils import sms as sms_module
            sms_module.settings = mock_settings

            result = sms_module.send_phone_otp("+233501234567")
            assert result is True


def test_verify_phone_otp_approved():
    with patch("app.utils.sms.Client") as mock_client_class:
        mock_client = MagicMock()
        mock_check = MagicMock()
        mock_check.status = "approved"
        mock_client.verify.v2.services.return_value.verification_checks.create.return_value = mock_check
        mock_client_class.return_value = mock_client

        with patch("app.utils.sms.settings") as mock_settings:
            mock_settings.TWILIO_ACCOUNT_SID = "ACtest"
            mock_settings.TWILIO_AUTH_TOKEN = "test_token"
            mock_settings.TWILIO_VERIFY_SERVICE_SID = "VAtest"

            from app.utils import sms as sms_module
            sms_module.settings = mock_settings

            result = sms_module.verify_phone_otp("+233501234567", "123456")
            assert result is True


def test_verify_phone_otp_rejected():
    with patch("app.utils.sms.Client") as mock_client_class:
        mock_client = MagicMock()
        mock_check = MagicMock()
        mock_check.status = "pending"
        mock_client.verify.v2.services.return_value.verification_checks.create.return_value = mock_check
        mock_client_class.return_value = mock_client

        with patch("app.utils.sms.settings") as mock_settings:
            mock_settings.TWILIO_ACCOUNT_SID = "ACtest"
            mock_settings.TWILIO_AUTH_TOKEN = "test_token"
            mock_settings.TWILIO_VERIFY_SERVICE_SID = "VAtest"

            from app.utils import sms as sms_module
            sms_module.settings = mock_settings

            result = sms_module.verify_phone_otp("+233501234567", "000000")
            assert result is False


def test_send_registration_sms():
    with patch("app.utils.sms.send_sms_notification", return_value=True) as mock_send:
        from app.utils import sms as sms_module
        result = sms_module.send_registration_sms("+233501234567", "Kwame Asante")
        assert result is True
        mock_send.assert_called_once()


def test_send_application_sms():
    with patch("app.utils.sms.send_sms_notification", return_value=True) as mock_send:
        from app.utils import sms as sms_module
        result = sms_module.send_application_sms("+233501234567", "BDR-2024-001", "Birth Registration")
        assert result is True
