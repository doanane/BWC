from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case, and_
from datetime import datetime, timedelta, timezone
from app.models.user import User, UserRole, UserStatus
from app.models.application import Application, ApplicationStatus
from app.models.payment import Payment, PaymentStatus
from app.models.statistics_request import StatisticsRequest

class AnalyticsService:

    @staticmethod
    def get_dashboard_summary(db: Session) -> dict:
        total_apps = db.query(func.count(Application.id)).scalar() or 0
        pending = db.query(func.count(Application.id)).filter(
            Application.status.in_([ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW])
        ).scalar() or 0
        approved_today = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.APPROVED,
            func.date(Application.updated_at) == func.current_date()
        ).scalar() or 0
        total_users = db.query(func.count(User.id)).filter(
            User.role == UserRole.CITIZEN
        ).scalar() or 0
        revenue = db.query(func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.COMPLETED
        ).scalar() or 0.0

        return {
            "total_applications": total_apps,
            "pending_review": pending,
            "approved_today": approved_today,
            "total_citizens": total_users,
            "total_revenue_ghs": round(float(revenue), 2),
        }

    @staticmethod
    def get_application_trends(db: Session, days: int = 30) -> list:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        rows = (
            db.query(
                func.date(Application.created_at).label("date"),
                func.count(Application.id).label("count"),
            )
            .filter(Application.created_at >= since)
            .group_by(func.date(Application.created_at))
            .order_by(func.date(Application.created_at))
            .all()
        )
        return [{"date": str(r.date), "count": r.count} for r in rows]

    @staticmethod
    def _stats_revenue_since(db: Session, since=None):
        q = db.query(func.sum(StatisticsRequest.fee_amount)).filter(
            StatisticsRequest.payment_status == "paid",
            StatisticsRequest.fee_amount > 0,
        )
        if since is not None:
            q = q.filter(StatisticsRequest.created_at >= since)
        return float(q.scalar() or 0.0)

    @staticmethod
    def get_revenue_summary(db: Session, days: int = 30) -> dict:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        payment_total = db.query(func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.COMPLETED,
            Payment.paid_at >= since,
        ).scalar() or 0.0
        stats_total = AnalyticsService._stats_revenue_since(db, since)
        total = float(payment_total) + stats_total

        daily = (
            db.query(
                func.date(Payment.paid_at).label("date"),
                func.sum(Payment.amount).label("amount"),
                func.count(Payment.id).label("count"),
            )
            .filter(Payment.status == PaymentStatus.COMPLETED, Payment.paid_at >= since)
            .group_by(func.date(Payment.paid_at))
            .order_by(func.date(Payment.paid_at))
            .all()
        )

        return {
            "total_revenue_ghs": round(total, 2),
            "period_days": days,
            "daily_breakdown": [
                {"date": str(r.date), "amount": round(float(r.amount), 2), "transactions": r.count}
                for r in daily
            ],
        }

    @staticmethod
    def get_status_distribution(db: Session) -> list:
        rows = (
            db.query(Application.status, func.count(Application.id).label("count"))
            .group_by(Application.status)
            .all()
        )
        return [{"status": r.status.value, "count": r.count} for r in rows]

    @staticmethod
    def get_regional_stats(db: Session) -> list:
        rows = (
            db.query(
                Application.child_region_of_birth.label("region"),
                func.count(Application.id).label("total"),
                func.sum(case((Application.status == ApplicationStatus.APPROVED, 1), else_=0)).label("approved"),
            )
            .filter(Application.child_region_of_birth.isnot(None))
            .group_by(Application.child_region_of_birth)
            .order_by(func.count(Application.id).desc())
            .all()
        )
        return [{"region": r.region, "total": r.total, "approved": int(r.approved or 0)} for r in rows]

    @staticmethod
    def get_processing_time_stats(db: Session) -> dict:
        rows = (
            db.query(Application.submitted_at, Application.updated_at, Application.status)
            .filter(
                Application.status.in_([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]),
                Application.submitted_at.isnot(None),
            )
            .all()
        )
        times = []
        for r in rows:
            if r.submitted_at and r.updated_at:
                delta = (r.updated_at - r.submitted_at).total_seconds() / 3600
                if delta > 0:
                    times.append(delta)

        if not times:
            return {"average_hours": 0, "min_hours": 0, "max_hours": 0, "sample_size": 0}

        return {
            "average_hours": round(sum(times) / len(times), 1),
            "min_hours": round(min(times), 1),
            "max_hours": round(max(times), 1),
            "sample_size": len(times),
        }

    @staticmethod
    def get_penalty_stats(db: Session) -> dict:
        from app.models.penalty import Penalty
        total = db.query(func.count(Penalty.id)).scalar() or 0
        waived = db.query(func.count(Penalty.id)).filter(Penalty.is_waived == True).scalar() or 0
        revenue = db.query(func.sum(Penalty.penalty_amount)).filter(Penalty.is_waived == False).scalar() or 0.0
        return {
            "total_penalties": total,
            "waived": waived,
            "active": total - waived,
            "penalty_revenue_ghs": round(float(revenue), 2),
        }

    @staticmethod
    def get_monthly_analytics(db: Session, year: int, month: int) -> dict:
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

        total_apps = db.query(func.count(Application.id)).filter(
            Application.created_at >= start, Application.created_at < end
        ).scalar() or 0

        approved = db.query(func.count(Application.id)).filter(
            Application.created_at >= start, Application.created_at < end,
            Application.status == ApplicationStatus.APPROVED
        ).scalar() or 0

        rejected = db.query(func.count(Application.id)).filter(
            Application.created_at >= start, Application.created_at < end,
            Application.status == ApplicationStatus.REJECTED
        ).scalar() or 0

        new_users = db.query(func.count(User.id)).filter(
            User.created_at >= start, User.created_at < end,
            User.role == UserRole.CITIZEN
        ).scalar() or 0

        payment_rev = float(db.query(func.sum(Payment.amount)).filter(
            Payment.paid_at >= start, Payment.paid_at < end,
            Payment.status == PaymentStatus.COMPLETED
        ).scalar() or 0.0)
        stats_rev = float(db.query(func.sum(StatisticsRequest.fee_amount)).filter(
            StatisticsRequest.payment_status == "paid",
            StatisticsRequest.fee_amount > 0,
            StatisticsRequest.created_at >= start,
            StatisticsRequest.created_at < end,
        ).scalar() or 0.0)
        revenue = payment_rev + stats_rev

        daily_apps = (
            db.query(
                func.date(Application.created_at).label("date"),
                func.count(Application.id).label("count"),
            )
            .filter(Application.created_at >= start, Application.created_at < end)
            .group_by(func.date(Application.created_at))
            .order_by(func.date(Application.created_at))
            .all()
        )

        daily_revenue = (
            db.query(
                func.date(Payment.paid_at).label("date"),
                func.sum(Payment.amount).label("amount"),
            )
            .filter(
                Payment.paid_at >= start, Payment.paid_at < end,
                Payment.status == PaymentStatus.COMPLETED
            )
            .group_by(func.date(Payment.paid_at))
            .order_by(func.date(Payment.paid_at))
            .all()
        )

        user_roles = (
            db.query(User.role, func.count(User.id).label("count"))
            .group_by(User.role)
            .all()
        )

        status_dist = (
            db.query(Application.status, func.count(Application.id).label("count"))
            .filter(Application.created_at >= start, Application.created_at < end)
            .group_by(Application.status)
            .all()
        )

        regional = (
            db.query(
                Application.child_region_of_birth.label("region"),
                func.count(Application.id).label("total"),
            )
            .filter(
                Application.created_at >= start,
                Application.created_at < end,
                Application.child_region_of_birth.isnot(None),
            )
            .group_by(Application.child_region_of_birth)
            .order_by(func.count(Application.id).desc())
            .all()
        )

        return {
            "period": {"year": year, "month": month},
            "summary": {
                "total_applications": total_apps,
                "approved": approved,
                "rejected": rejected,
                "new_citizens": new_users,
                "revenue_ghs": round(float(revenue), 2),
                "approval_rate": round((approved / total_apps * 100) if total_apps > 0 else 0, 1),
            },
            "daily_applications": [{"date": str(r.date), "count": r.count} for r in daily_apps],
            "daily_revenue": [{"date": str(r.date), "amount": round(float(r.amount), 2)} for r in daily_revenue],
            "user_role_distribution": [{"role": r.role.value, "count": r.count} for r in user_roles],
            "status_distribution": [{"status": r.status.value, "count": r.count} for r in status_dist],
            "regional_breakdown": [{"region": r.region, "total": r.total} for r in regional],
        }

    @staticmethod
    def get_super_admin_overview(db: Session) -> dict:
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(User.status == UserStatus.ACTIVE).scalar() or 0
        suspended = db.query(func.count(User.id)).filter(User.status == UserStatus.SUSPENDED).scalar() or 0
        total_apps = db.query(func.count(Application.id)).scalar() or 0
        pending = db.query(func.count(Application.id)).filter(
            Application.status.in_([ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW])
        ).scalar() or 0
        total_revenue = float(db.query(func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.COMPLETED
        ).scalar() or 0.0) + AnalyticsService._stats_revenue_since(db)

        this_month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_apps = db.query(func.count(Application.id)).filter(
            Application.created_at >= this_month_start
        ).scalar() or 0
        month_revenue = float(db.query(func.sum(Payment.amount)).filter(
            Payment.paid_at >= this_month_start,
            Payment.status == PaymentStatus.COMPLETED
        ).scalar() or 0.0) + AnalyticsService._stats_revenue_since(db, this_month_start)

        staff_count = db.query(func.count(User.id)).filter(
            User.role.in_([UserRole.STAFF, UserRole.ADMIN])
        ).scalar() or 0

        recent_users = (
            db.query(User)
            .filter(User.role == UserRole.CITIZEN)
            .order_by(User.created_at.desc())
            .limit(5)
            .all()
        )

        last_30 = datetime.now(timezone.utc) - timedelta(days=30)
        monthly_trend = (
            db.query(
                func.date(Application.created_at).label("date"),
                func.count(Application.id).label("count"),
            )
            .filter(Application.created_at >= last_30)
            .group_by(func.date(Application.created_at))
            .order_by(func.date(Application.created_at))
            .all()
        )

        return {
            "users": {
                "total": total_users,
                "active": active_users,
                "suspended": suspended,
                "staff": staff_count,
            },
            "applications": {
                "total": total_apps,
                "pending_review": pending,
                "this_month": month_apps,
            },
            "revenue": {
                "total_ghs": round(float(total_revenue), 2),
                "this_month_ghs": round(float(month_revenue), 2),
            },
            "recent_registrations": [
                {
                    "id": u.id,
                    "name": u.full_name,
                    "email": u.email,
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                }
                for u in recent_users
            ],
            "monthly_trend": [{"date": str(r.date), "count": r.count} for r in monthly_trend],
        }

    @staticmethod
    def get_yearly_revenue(db: Session, year: int) -> dict:
        months = []
        grand_total = 0.0
        for m in range(1, 13):
            start = datetime(year, m, 1, tzinfo=timezone.utc)
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc) if m == 12 else datetime(year, m + 1, 1, tzinfo=timezone.utc)
            pay_rev = float(db.query(func.sum(Payment.amount)).filter(
                Payment.status == PaymentStatus.COMPLETED,
                Payment.paid_at >= start,
                Payment.paid_at < end,
            ).scalar() or 0.0)
            stats_rev = float(db.query(func.sum(StatisticsRequest.fee_amount)).filter(
                StatisticsRequest.payment_status == "paid",
                StatisticsRequest.fee_amount > 0,
                StatisticsRequest.created_at >= start,
                StatisticsRequest.created_at < end,
            ).scalar() or 0.0)
            total = pay_rev + stats_rev
            count = int(db.query(func.count(Payment.id)).filter(
                Payment.status == PaymentStatus.COMPLETED,
                Payment.paid_at >= start,
                Payment.paid_at < end,
            ).scalar() or 0)
            months.append({
                "month": m,
                "month_name": start.strftime("%B"),
                "payment_revenue": round(pay_rev, 2),
                "statistics_revenue": round(stats_rev, 2),
                "total": round(total, 2),
                "transactions": count,
            })
            grand_total += total

        all_time = float(db.query(func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.COMPLETED
        ).scalar() or 0.0) + AnalyticsService._stats_revenue_since(db)

        return {
            "year": year,
            "months": months,
            "year_total": round(grand_total, 2),
            "all_time_total": round(all_time, 2),
        }

    @staticmethod
    def get_staff_overview(db: Session) -> dict:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)

        submitted = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.SUBMITTED
        ).scalar() or 0
        under_review = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.UNDER_REVIEW
        ).scalar() or 0
        approved_today = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.APPROVED,
            Application.updated_at >= today_start,
        ).scalar() or 0
        ready = db.query(func.count(Application.id)).filter(
            Application.status == ApplicationStatus.READY
        ).scalar() or 0
        processed_week = db.query(func.count(Application.id)).filter(
            Application.status.in_([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]),
            Application.updated_at >= week_start,
        ).scalar() or 0
        total_pending = submitted + under_review

        daily_processed = (
            db.query(
                func.date(Application.updated_at).label("date"),
                func.count(Application.id).label("count"),
            )
            .filter(
                Application.status.in_([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED, ApplicationStatus.READY]),
                Application.updated_at >= week_start,
            )
            .group_by(func.date(Application.updated_at))
            .order_by(func.date(Application.updated_at))
            .all()
        )

        return {
            "queue": {
                "submitted": submitted,
                "under_review": under_review,
                "approved_today": approved_today,
                "ready_for_collection": ready,
                "total_pending": total_pending,
                "processed_this_week": processed_week,
            },
            "daily_processed": [{"date": str(r.date), "count": r.count} for r in daily_processed],
        }
