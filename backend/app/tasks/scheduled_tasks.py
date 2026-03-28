from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.application_service import ApplicationService
from app.services.notification_service import NotificationService
from app.models.application import Application, ApplicationStatus
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)


@celery_app.task
def calculate_penalties():
    db = SessionLocal()
    try:
        count = ApplicationService.calculate_penalties(db)
        logger.info(f"Penalties calculated for {count} applications")
        return {"success": True, "count": count}
    except Exception as e:
        logger.error(f"Penalty calculation failed: {e}")
        return {"success": False, "error": str(e)}
    finally:
        db.close()


@celery_app.task
def send_7day_reminders():
    db = SessionLocal()
    try:
        target_date = datetime.now(timezone.utc) + timedelta(days=7)
        applications = db.query(Application).filter(
            Application.status == ApplicationStatus.READY,
            Application.collection_deadline.between(
                target_date.replace(hour=0, minute=0, second=0),
                target_date.replace(hour=23, minute=59, second=59)
            )
        ).all()

        for app in applications:
            NotificationService.create_notification(
                db, app.applicant_id,
                "reminder_7_days", "in_app",
                "Certificate Collection Reminder",
                f"Your certificate {app.application_number} must be collected within 7 days.",
                app.id
            )

        logger.info(f"7-day reminders sent for {len(applications)} applications")
        return {"success": True, "count": len(applications)}
    except Exception as e:
        logger.error(f"7-day reminder task failed: {e}")
        return {"success": False, "error": str(e)}
    finally:
        db.close()


@celery_app.task
def send_2day_reminders():
    db = SessionLocal()
    try:
        target_date = datetime.now(timezone.utc) + timedelta(days=2)
        applications = db.query(Application).filter(
            Application.status == ApplicationStatus.READY,
            Application.collection_deadline.between(
                target_date.replace(hour=0, minute=0, second=0),
                target_date.replace(hour=23, minute=59, second=59)
            )
        ).all()

        for app in applications:
            NotificationService.create_notification(
                db, app.applicant_id,
                "reminder_2_days", "in_app",
                "Urgent: Certificate Collection Reminder",
                f"URGENT: Your certificate {app.application_number} must be collected within 2 days or penalties will apply.",
                app.id
            )

        logger.info(f"2-day reminders sent for {len(applications)} applications")
        return {"success": True, "count": len(applications)}
    except Exception as e:
        logger.error(f"2-day reminder task failed: {e}")
        return {"success": False, "error": str(e)}
    finally:
        db.close()
