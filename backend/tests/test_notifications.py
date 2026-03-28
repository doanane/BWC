import pytest
from unittest.mock import patch
from datetime import date
from app.models.application import Application, ApplicationStatus, ServicePlan, DeliveryMethod, Gender
from app.models.notification import Notification, NotificationChannel, NotificationStatus
from app.models.user import User, UserRole, UserStatus
from app.core.security import hash_password
from app.services.notification_service import NotificationService


def _make_application(db, user):
    app = Application(
        application_number="BDR-TEST-0001",
        applicant_id=user.id,
        status=ApplicationStatus.SUBMITTED,
        service_plan=ServicePlan.NORMAL,
        delivery_method=DeliveryMethod.PICKUP,
        child_first_name="Kofi",
        child_last_name="Mensah",
        child_date_of_birth=date(2023, 1, 15),
        child_gender=Gender.MALE,
        child_place_of_birth="Korle Bu Teaching Hospital",
        child_region_of_birth="Greater Accra",
        child_district_of_birth="Accra Metropolitan",
        mother_first_name="Ama",
        mother_last_name="Mensah",
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


def test_notify_status_changed_creates_in_app_notification(db, test_citizen):
    application = _make_application(db, test_citizen)
    with patch("app.utils.email.send_email_notification", return_value=True), \
         patch("app.utils.sms.send_sms_notification", return_value=True):
        NotificationService.notify_status_changed(
            db, application, test_citizen, ApplicationStatus.UNDER_REVIEW
        )
    notifs = db.query(Notification).filter(
        Notification.user_id == test_citizen.id,
        Notification.channel == NotificationChannel.IN_APP,
    ).all()
    assert len(notifs) >= 1
    assert any("review" in n.title.lower() or "under" in n.title.lower() for n in notifs)


def test_notify_status_changed_approved(db, test_citizen):
    application = _make_application(db, test_citizen)
    with patch("app.utils.email.send_email_notification", return_value=True), \
         patch("app.utils.sms.send_sms_notification", return_value=True):
        NotificationService.notify_status_changed(
            db, application, test_citizen, ApplicationStatus.APPROVED
        )
    notifs = db.query(Notification).filter(
        Notification.user_id == test_citizen.id,
        Notification.channel == NotificationChannel.IN_APP,
    ).all()
    assert len(notifs) >= 1
    titles = [n.title.lower() for n in notifs]
    assert any("approv" in t for t in titles)


def test_notify_status_changed_rejected_with_reason(db, test_citizen):
    application = _make_application(db, test_citizen)
    with patch("app.utils.email.send_email_notification", return_value=True), \
         patch("app.utils.sms.send_sms_notification", return_value=True):
        NotificationService.notify_status_changed(
            db, application, test_citizen, ApplicationStatus.REJECTED,
            reason="Incomplete documentation"
        )
    notifs = db.query(Notification).filter(
        Notification.user_id == test_citizen.id,
        Notification.channel == NotificationChannel.IN_APP,
    ).all()
    assert len(notifs) >= 1
    messages = [n.message for n in notifs]
    assert any("Incomplete documentation" in m for m in messages)


def test_notify_status_changed_ready(db, test_citizen):
    application = _make_application(db, test_citizen)
    with patch("app.utils.email.send_email_notification", return_value=True), \
         patch("app.utils.sms.send_sms_notification", return_value=True):
        NotificationService.notify_status_changed(
            db, application, test_citizen, ApplicationStatus.READY
        )
    notifs = db.query(Notification).filter(
        Notification.user_id == test_citizen.id,
        Notification.channel == NotificationChannel.IN_APP,
    ).all()
    assert len(notifs) >= 1


def test_notify_each_status_creates_notification(db, test_citizen):
    statuses_to_test = [
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.PAYMENT_PENDING,
        ApplicationStatus.PROCESSING,
        ApplicationStatus.READY,
    ]
    application = _make_application(db, test_citizen)
    with patch("app.utils.email.send_email_notification", return_value=True), \
         patch("app.utils.sms.send_sms_notification", return_value=True):
        for status in statuses_to_test:
            NotificationService.notify_status_changed(db, application, test_citizen, status)

    total = db.query(Notification).filter(
        Notification.user_id == test_citizen.id,
        Notification.channel == NotificationChannel.IN_APP,
    ).count()
    assert total >= len(statuses_to_test)


def test_notifications_linked_to_application(db, test_citizen):
    application = _make_application(db, test_citizen)
    with patch("app.utils.email.send_email_notification", return_value=True), \
         patch("app.utils.sms.send_sms_notification", return_value=True):
        NotificationService.notify_status_changed(
            db, application, test_citizen, ApplicationStatus.APPROVED
        )
    notifs = db.query(Notification).filter(
        Notification.application_id == application.id
    ).all()
    assert len(notifs) >= 1
    assert all(n.user_id == test_citizen.id for n in notifs)


def test_notify_staff_and_admin_targets_only_staff_roles(db, test_citizen, test_staff):
    admin_user = User(
        email="admin-notify@test.com",
        phone_number="+233244000099",
        hashed_password=hash_password("Test@12345"),
        first_name="Admin",
        last_name="Notify",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True,
        email_verified=True,
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    sent_count = NotificationService.notify_staff_and_admin(
        db=db,
        title="New Application Requires Review",
        message="A new application has been submitted and requires staff action.",
        notification_type="application_submitted",
        data={"event": "application_submitted"},
    )

    assert sent_count == 2

    notifs = db.query(Notification).filter(
        Notification.channel == NotificationChannel.IN_APP,
        Notification.title == "New Application Requires Review",
    ).all()
    recipient_ids = {n.user_id for n in notifs}

    assert test_staff.id in recipient_ids
    assert admin_user.id in recipient_ids
    assert test_citizen.id not in recipient_ids
