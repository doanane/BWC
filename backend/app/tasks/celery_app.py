from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "birth_registry",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.scheduled_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Accra",
    enable_utc=True,
    beat_schedule={
        "calculate-penalties-daily": {
            "task": "app.tasks.scheduled_tasks.calculate_penalties",
            "schedule": crontab(hour=0, minute=0),
        },
        "send-reminder-7days": {
            "task": "app.tasks.scheduled_tasks.send_7day_reminders",
            "schedule": crontab(hour=8, minute=0),
        },
        "send-reminder-2days": {
            "task": "app.tasks.scheduled_tasks.send_2day_reminders",
            "schedule": crontab(hour=8, minute=30),
        },
    }
)
