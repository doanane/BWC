import pytest
from unittest.mock import patch, MagicMock


def test_sendgrid_ready_when_configured():
    with patch("app.utils.email.settings") as mock_settings:
        mock_settings.SENDGRID_API_KEY = "SG.test_key"
        from app.utils.email import _sendgrid_ready
        assert _sendgrid_ready() is True


def test_sendgrid_ready_when_not_configured():
    with patch("app.utils.email.settings") as mock_settings:
        mock_settings.SENDGRID_API_KEY = ""
        from app.utils.email import _sendgrid_ready
        assert _sendgrid_ready() is False


def test_send_email_notification_via_sendgrid():
    mock_mail_instance = MagicMock()
    mock_mail_class = MagicMock(return_value=mock_mail_instance)
    mock_reply_to_class = MagicMock()

    mock_sg = MagicMock()
    mock_response = MagicMock()
    mock_response.status_code = 202
    mock_sg.send.return_value = mock_response
    mock_sg_class = MagicMock(return_value=mock_sg)

    with patch("app.utils.email.SendGridAPIClient", mock_sg_class), \
         patch("app.utils.email.Mail", mock_mail_class), \
         patch("app.utils.email.ReplyTo", mock_reply_to_class), \
         patch("app.utils.email.settings") as mock_settings:

        mock_settings.SENDGRID_API_KEY = "SG.test_key"
        mock_settings.SENDGRID_FROM_EMAIL = "test@example.com"
        mock_settings.SENDGRID_FROM_NAME = "Test Registry"
        mock_settings.SENDGRID_REPLY_TO = "reply@example.com"
        mock_settings.LOGO_URL = "https://example.com/logo.png"

        from app.utils import email as email_module
        result = email_module.send_email_notification(
            to_email="user@example.com",
            subject="Test Subject",
            html_body="<p>Test body</p>",
            text_body="Test body",
        )
        assert result is True
        mock_sg.send.assert_called_once()


def test_send_verification_email():
    with patch("app.utils.email.send_email_notification", return_value=True) as mock_send:
        with patch("app.utils.email.settings") as mock_settings:
            mock_settings.FRONTEND_URL = "http://localhost:5173"
            mock_settings.LOGO_URL = "https://example.com/logo.png"
            from app.utils import email as email_module
            email_module.settings = mock_settings
            result = email_module.send_verification_email(
                to_email="user@example.com",
                full_name="John Doe",
                token="test_token_123",
            )
            assert result is True
            mock_send.assert_called_once()


def test_send_password_reset_email():
    with patch("app.utils.email.send_email_notification", return_value=True) as mock_send:
        with patch("app.utils.email.settings") as mock_settings:
            mock_settings.FRONTEND_URL = "http://localhost:5173"
            mock_settings.LOGO_URL = "https://example.com/logo.png"
            from app.utils import email as email_module
            email_module.settings = mock_settings
            result = email_module.send_password_reset_email(
                to_email="user@example.com",
                full_name="Jane Doe",
                token="reset_token_456",
            )
            assert result is True
            mock_send.assert_called_once()


def test_send_welcome_email():
    with patch("app.utils.email.send_email_notification", return_value=True) as mock_send:
        from app.utils import email as email_module
        result = email_module.send_welcome_email(
            to_email="user@example.com",
            full_name="Kwame Asante",
            account_type="citizen",
        )
        assert result is True


def test_send_application_submitted_email():
    with patch("app.utils.email.send_email_notification", return_value=True) as mock_send:
        from app.utils import email as email_module
        result = email_module.send_application_submitted_email(
            to_email="user@example.com",
            full_name="Ama Mensah",
            application_number="BDR-2024-001234",
            app_type="Birth Registration",
            processing_type="Normal",
        )
        assert result is True


def test_send_certificate_ready_email():
    with patch("app.utils.email.send_email_notification", return_value=True) as mock_send:
        from app.utils import email as email_module
        result = email_module.send_certificate_ready_email(
            to_email="user@example.com",
            full_name="Kofi Boateng",
            application_number="BDR-2024-001234",
            office_name="Accra Central Office",
        )
        assert result is True
