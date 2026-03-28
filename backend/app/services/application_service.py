from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.models.application import Application, ApplicationStatus
from app.models.penalty import Penalty, PenaltyStatus
from app.models.user import User, UserRole
from app.core.config import settings
from datetime import date, datetime, timedelta, timezone
import random
import logging

logger = logging.getLogger(__name__)


class ApplicationService:
    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _normalize_nationality(value: str | None) -> str:
        if not value:
            return ""
        return value.strip().lower()

    @staticmethod
    def _generate_application_number(db: Session) -> str:
        today = date.today().strftime("%Y%m%d")
        for _ in range(20):
            suffix = random.randint(100000, 999999)
            number = f"BDR-{today}-{suffix}"
            exists = db.query(Application).filter(Application.application_number == number).first()
            if not exists:
                return number
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate unique application number",
        )

    @staticmethod
    def _calculate_fees(service_plan, delivery_method) -> tuple[float, float, float]:
        processing_fee = (
            float(settings.EXPRESS_PROCESSING_FEE)
            if str(service_plan.value if hasattr(service_plan, "value") else service_plan).lower() == "express"
            else float(settings.NORMAL_PROCESSING_FEE)
        )
        delivery_fee = (
            float(settings.DELIVERY_BASE_FEE)
            if str(delivery_method.value if hasattr(delivery_method, "value") else delivery_method).upper() == "DELIVERY"
            else 0.0
        )
        return processing_fee, delivery_fee, processing_fee + delivery_fee

    @staticmethod
    def _history(
        db: Session,
        app: Application,
        to_status: ApplicationStatus,
        changed_by_id: int | None,
        reason: str | None = None,
    ) -> None:
        from app.models.application import ApplicationStatusHistory

        history = ApplicationStatusHistory(
            application_id=app.id,
            from_status=app.status,
            to_status=to_status,
            changed_by_id=changed_by_id,
            reason=reason,
        )
        db.add(history)

    @staticmethod
    def _serialize_application(app: Application) -> dict:
        extra_data = app.extra_data if isinstance(app.extra_data, dict) else {}
        app_type = str(extra_data.get("application_type", "BIRTH")).upper()
        applicant = app.applicant

        return {
            "id": app.id,
            "application_number": app.application_number,
            "reference_number": app.application_number,
            "application_type": app_type,
            "applicant_id": app.applicant_id,
            "applicant_email": applicant.email if applicant else None,
            "applicant": {
                "id": applicant.id,
                "first_name": applicant.first_name,
                "last_name": applicant.last_name,
                "email": applicant.email,
                "profile_photo": applicant.profile_photo,
            } if applicant else None,
            "status": app.status.value if hasattr(app.status, "value") else app.status,
            "service_plan": app.service_plan.value if hasattr(app.service_plan, "value") else app.service_plan,
            "delivery_method": app.delivery_method.value if hasattr(app.delivery_method, "value") else app.delivery_method,
            "child_first_name": app.child_first_name,
            "child_last_name": app.child_last_name,
            "child_other_names": app.child_other_names,
            "child_date_of_birth": app.child_date_of_birth,
            "child_gender": app.child_gender.value if hasattr(app.child_gender, "value") else app.child_gender,
            "child_place_of_birth": app.child_place_of_birth,
            "child_region_of_birth": app.child_region_of_birth,
            "child_district_of_birth": app.child_district_of_birth,
            "child_nationality": app.child_nationality,
            "father_first_name": app.father_first_name,
            "father_last_name": app.father_last_name,
            "father_ghana_card": app.father_ghana_card,
            "father_phone": app.father_phone,
            "mother_first_name": app.mother_first_name,
            "mother_last_name": app.mother_last_name,
            "mother_ghana_card": app.mother_ghana_card,
            "mother_phone": app.mother_phone,
            "informant_name": app.informant_name,
            "informant_relationship": app.informant_relationship,
            "informant_phone": app.informant_phone,
            "delivery_address": app.delivery_address,
            "delivery_region": app.delivery_region,
            "delivery_district": app.delivery_district,
            "delivery_digital_address": app.delivery_digital_address,
            "delivery_notes": app.delivery_notes,
            "processing_fee": app.processing_fee,
            "delivery_fee": app.delivery_fee,
            "created_at": app.created_at,
            "updated_at": app.updated_at,
            "total_fee": app.total_fee,
            "submitted_at": app.submitted_at,
            "expected_ready_date": app.expected_ready_date,
            "rejection_reason": app.rejection_reason,
            "additional_info_request": app.additional_info_request,
            "reviewed_by_id": app.reviewed_by_id,
            "extra_data": extra_data,
            "assigned_to_id": app.assigned_to_id,
            "assigned_to_name": (
                ((app.assigned_to.first_name or "") + " " + (app.assigned_to.last_name or "")).strip()
                if app.assigned_to else None
            ),
            "assigned_at": app.assigned_at.isoformat() if app.assigned_at else None,
        }

    @staticmethod
    def _build_track_payload(app: Application) -> dict:
        extra = app.extra_data or {}
        app_type = str(extra.get("application_type", "BIRTH")).upper()
        event_date = (
            extra.get("date_of_death")
            if app_type == "DEATH"
            else (app.child_date_of_birth.isoformat() if app.child_date_of_birth else None)
        )
        applicant_first_name = app.applicant.first_name if app.applicant else None
        applicant_last_name = app.applicant.last_name if app.applicant else None

        status_value = app.status.value if hasattr(app.status, "value") else str(app.status)
        status_value = "CERTIFICATE_READY" if status_value == "READY" else status_value

        return {
            "id": app.id,
            "reference_number": app.application_number,
            "application_type": app_type,
            "status": status_value,
            "applicant_first_name": applicant_first_name,
            "applicant_last_name": applicant_last_name,
            "date_of_event": event_date,
            "region": app.child_region_of_birth,
            "district": app.child_district_of_birth,
            "created_at": app.created_at,
            "updated_at": app.updated_at,
            "subject_name": f"{app.child_first_name} {app.child_last_name}".strip(),
        }

    @staticmethod
    def create_application(db: Session, user_id: int, data) -> Application:
        child_nationality = (data.child_nationality or "").strip() or "Ghanaian"
        if ApplicationService._normalize_nationality(child_nationality) != "ghanaian":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only Ghanaian birth registrations are accepted on this portal",
            )

        if str(data.delivery_method.value).upper() == "DELIVERY":
            if not data.delivery_address or not data.delivery_region or not data.delivery_district:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Delivery address, region, and district are required for delivery method",
                )

        processing_fee, delivery_fee, total_fee = ApplicationService._calculate_fees(
            data.service_plan,
            data.delivery_method,
        )
        now = ApplicationService._now()
        processing_days = (
            int(settings.EXPRESS_PROCESSING_DAYS)
            if str(data.service_plan.value).lower() == "express"
            else int(settings.NORMAL_PROCESSING_DAYS)
        )

        app = Application(
            application_number=ApplicationService._generate_application_number(db),
            applicant_id=user_id,
            status=ApplicationStatus.DRAFT,
            service_plan=data.service_plan,
            delivery_method=data.delivery_method,
            child_first_name=data.child_first_name,
            child_last_name=data.child_last_name,
            child_other_names=data.child_other_names,
            child_date_of_birth=data.child_date_of_birth,
            child_gender=data.child_gender,
            child_place_of_birth=data.child_place_of_birth,
            child_region_of_birth=data.child_region_of_birth,
            child_district_of_birth=data.child_district_of_birth,
            child_nationality="Ghanaian",
            child_birth_order=data.child_birth_order,
            father_first_name=data.father_first_name,
            father_last_name=data.father_last_name,
            father_other_names=data.father_other_names,
            father_nationality=data.father_nationality,
            father_date_of_birth=data.father_date_of_birth,
            father_ghana_card=data.father_ghana_card,
            father_occupation=data.father_occupation,
            father_phone=data.father_phone,
            father_address=data.father_address,
            mother_first_name=data.mother_first_name,
            mother_last_name=data.mother_last_name,
            mother_other_names=data.mother_other_names,
            mother_nationality=data.mother_nationality,
            mother_date_of_birth=data.mother_date_of_birth,
            mother_ghana_card=data.mother_ghana_card,
            mother_occupation=data.mother_occupation,
            mother_phone=data.mother_phone,
            mother_address=data.mother_address,
            informant_name=data.informant_name,
            informant_relationship=data.informant_relationship,
            informant_phone=data.informant_phone,
            informant_address=data.informant_address,
            hospital_name=data.hospital_name,
            hospital_address=data.hospital_address,
            attending_physician=data.attending_physician,
            delivery_address=data.delivery_address,
            delivery_region=data.delivery_region,
            delivery_district=data.delivery_district,
            delivery_digital_address=data.delivery_digital_address,
            delivery_notes=data.delivery_notes,
            processing_fee=processing_fee,
            delivery_fee=delivery_fee,
            total_fee=total_fee,
            expected_ready_date=now + timedelta(days=processing_days),
            extra_data={"application_type": "BIRTH"},
        )
        db.add(app)
        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def create_death_application(db: Session, user_id: int, data) -> Application:
        processing_fee, delivery_fee, total_fee = ApplicationService._calculate_fees(
            data.service_plan,
            data.delivery_method,
        )
        now = ApplicationService._now()
        processing_days = (
            int(settings.EXPRESS_PROCESSING_DAYS)
            if str(data.service_plan.value).lower() == "express"
            else int(settings.NORMAL_PROCESSING_DAYS)
        )

        informant_name = (data.informant_name or "").strip()
        informant_parts = [p for p in informant_name.split(" ") if p]
        mother_first_name = informant_parts[0] if informant_parts else "Unknown"
        mother_last_name = " ".join(informant_parts[1:]) if len(informant_parts) > 1 else "Unknown"

        date_of_death_iso = data.date_of_death.isoformat()
        app = Application(
            application_number=ApplicationService._generate_application_number(db),
            applicant_id=user_id,
            status=ApplicationStatus.DRAFT,
            service_plan=data.service_plan,
            delivery_method=data.delivery_method,
            child_first_name=data.deceased_first_name,
            child_last_name=data.deceased_last_name,
            child_other_names=data.deceased_other_names,
            child_date_of_birth=data.deceased_dob or data.date_of_death,
            child_gender=data.gender,
            child_place_of_birth=data.place_of_death or "Unknown",
            child_region_of_birth=data.region,
            child_district_of_birth=data.district,
            child_nationality=(data.nationality or "Unknown").strip(),
            mother_first_name=mother_first_name,
            mother_last_name=mother_last_name,
            informant_name=data.informant_name,
            informant_relationship=data.informant_relation,
            informant_phone=data.informant_phone,
            informant_address=data.informant_address,
            hospital_name=data.place_of_death,
            delivery_address=data.delivery_address,
            delivery_region=data.delivery_region,
            delivery_district=data.delivery_district,
            delivery_digital_address=data.delivery_digital_address,
            delivery_notes=data.notes,
            processing_fee=processing_fee,
            delivery_fee=delivery_fee,
            total_fee=total_fee,
            expected_ready_date=now + timedelta(days=processing_days),
            extra_data={
                "application_type": "DEATH",
                "date_of_death": date_of_death_iso,
                "cause_of_death": data.cause_of_death,
                "death_type": data.death_type,
                "occupation": data.occupation,
                "registrant_ghana_card": data.registrant_ghana_card,
            },
        )
        db.add(app)
        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def search_applications(db: Session, params, current_user: User) -> dict:
        query = db.query(Application).options(joinedload(Application.applicant))

        if current_user.role == UserRole.CITIZEN:
            query = query.filter(Application.applicant_id == current_user.id)
        elif params.applicant_id:
            query = query.filter(Application.applicant_id == params.applicant_id)

        if params.status:
            query = query.filter(Application.status == params.status)
        if params.service_plan:
            query = query.filter(Application.service_plan == params.service_plan)
        if params.search:
            term = f"%{params.search}%"
            query = query.filter(or_(
                Application.child_first_name.ilike(term),
                Application.child_last_name.ilike(term),
                Application.application_number.ilike(term),
                Application.child_region_of_birth.ilike(term),
            ))
        if params.child_first_name:
            query = query.filter(Application.child_first_name.ilike(f"%{params.child_first_name}%"))
        if params.child_last_name:
            query = query.filter(Application.child_last_name.ilike(f"%{params.child_last_name}%"))
        if params.application_number:
            query = query.filter(Application.application_number.ilike(f"%{params.application_number}%"))
        if params.region:
            query = query.filter(Application.child_region_of_birth.ilike(f"%{params.region}%"))
        if params.district:
            query = query.filter(Application.child_district_of_birth.ilike(f"%{params.district}%"))
        if params.from_date:
            query = query.filter(Application.created_at >= params.from_date)
        if params.to_date:
            query = query.filter(Application.created_at <= params.to_date)

        total = query.count()
        page = max(1, params.page)
        page_size = max(1, params.page_size)
        items = (
            query.order_by(Application.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        total_pages = (total + page_size - 1) // page_size if total else 0

        return {
            "items": [ApplicationService._serialize_application(item) for item in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        }

    @staticmethod
    def get_application(db: Session, application_id: int, user_id: int | None = None) -> Application:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        if user_id and app.applicant_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        return app

    @staticmethod
    def update_application(db: Session, application_id: int, current_user: User, data) -> Application:
        app = ApplicationService.get_application(db, application_id, current_user.id)
        if app.status not in [ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application can only be updated in draft or submitted state",
            )

        updates = data.model_dump(exclude_unset=True)
        for key, value in updates.items():
            if hasattr(app, key):
                setattr(app, key, value)

        processing_fee, delivery_fee, total_fee = ApplicationService._calculate_fees(
            app.service_plan,
            app.delivery_method,
        )
        app.processing_fee = processing_fee
        app.delivery_fee = delivery_fee
        app.total_fee = total_fee

        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def submit_application(db: Session, application_id: int, current_user: User) -> Application:
        app = ApplicationService.get_application(db, application_id, current_user.id)
        if app.status in [ApplicationStatus.CANCELLED, ApplicationStatus.COLLECTED, ApplicationStatus.DELIVERED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application cannot be submitted in current state",
            )

        ApplicationService._history(
            db,
            app,
            ApplicationStatus.SUBMITTED,
            current_user.id,
            "Application submitted by applicant",
        )
        app.status = ApplicationStatus.SUBMITTED
        app.submitted_at = ApplicationService._now()
        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def cancel_application(db: Session, application_id: int, current_user: User, reason: str) -> Application:
        app = ApplicationService.get_application(db, application_id, current_user.id)
        if app.status in [ApplicationStatus.COLLECTED, ApplicationStatus.DELIVERED, ApplicationStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application cannot be cancelled in current state",
            )

        ApplicationService._history(db, app, ApplicationStatus.CANCELLED, current_user.id, reason)
        app.status = ApplicationStatus.CANCELLED
        app.internal_notes = reason
        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def confirm_collection_or_delivery(db: Session, application_id: int, current_user: User) -> Application:
        app = ApplicationService.get_application(db, application_id, current_user.id)
        if app.status != ApplicationStatus.READY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only ready applications can be confirmed",
            )

        to_status = (
            ApplicationStatus.DELIVERED
            if str(app.delivery_method.value).upper() == "DELIVERY"
            else ApplicationStatus.COLLECTED
        )
        ApplicationService._history(db, app, to_status, current_user.id, "Certificate collected/delivered")

        app.status = to_status
        app.confirmed_at = ApplicationService._now()
        if to_status == ApplicationStatus.DELIVERED:
            app.delivered_at = app.confirmed_at
        else:
            app.collected_at = app.confirmed_at

        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def staff_update_status(db: Session, application_id: int, current_user: User, data) -> Application:
        app = ApplicationService.get_application(db, application_id)

        reason = data.reason or data.staff_notes
        ApplicationService._history(db, app, data.status, current_user.id, reason)

        app.reviewed_by_id = current_user.id
        app.status = data.status
        app.staff_notes = data.staff_notes

        if data.status == ApplicationStatus.REJECTED:
            app.rejection_reason = data.reason or "Rejected by reviewing officer"
        if data.status == ApplicationStatus.READY:
            app.ready_at = ApplicationService._now()
            app.collection_deadline = app.ready_at + timedelta(days=int(settings.PENALTY_GRACE_PERIOD_DAYS))
        if data.status == ApplicationStatus.PAYMENT_PENDING:
            app.additional_info_request = "Payment required to continue processing"
        if data.additional_info_request:
            app.additional_info_request = data.additional_info_request

        db.commit()
        db.refresh(app)
        return app

    @staticmethod
    def track_application(db: Session, application_number: str, current_user: User) -> dict:
        query = db.query(Application).filter(Application.application_number == application_number)
        if current_user.role == UserRole.CITIZEN:
            query = query.filter(Application.applicant_id == current_user.id)

        app = query.first()
        if not app:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        return ApplicationService._build_track_payload(app)

    @staticmethod
    def calculate_penalties(db: Session) -> int:
        now = datetime.now(timezone.utc)
        daily_rate = float(getattr(settings, "PENALTY_DAILY_RATE", 5.0))
        grace_days = int(getattr(settings, "PENALTY_GRACE_PERIOD_DAYS", 7))

        overdue_applications = db.query(Application).filter(
            Application.status == ApplicationStatus.READY,
            Application.collection_deadline < now,
        ).all()

        affected = 0
        for app in overdue_applications:
            existing = db.query(Penalty).filter(
                Penalty.application_id == app.id,
                Penalty.status == PenaltyStatus.ACTIVE,
            ).first()

            deadline = app.collection_deadline
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)

            days_overdue = max(0, (now - deadline).days)

            if existing:
                existing.days_overdue = days_overdue
                existing.total_amount = days_overdue * daily_rate
                existing.last_calculated_at = now
            else:
                grace_expires = deadline.replace(
                    hour=23, minute=59, second=59
                ) if days_overdue == 0 else deadline

                penalty = Penalty(
                    application_id=app.id,
                    status=PenaltyStatus.ACTIVE,
                    daily_rate=daily_rate,
                    days_overdue=days_overdue,
                    total_amount=days_overdue * daily_rate,
                    paid_amount=0.0,
                    grace_period_days=grace_days,
                    grace_period_expires=grace_expires,
                    last_calculated_at=now,
                )
                db.add(penalty)

            affected += 1

        db.commit()
        logger.info(f"Penalty calculation completed for {affected} applications")
        return affected
