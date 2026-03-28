import time as _time

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_staff, require_admin, require_super_admin
from app.services.analytics_service import AnalyticsService
from app.models.user import User
from datetime import datetime, timezone

router = APIRouter(prefix="/analytics", tags=["Analytics"])

_CACHE: dict = {}
_CACHE_TTL = 60


def _cache_get(key: str):
    entry = _CACHE.get(key)
    if entry and _time.time() - entry["ts"] < _CACHE_TTL:
        return entry["data"]
    return None


def _cache_set(key: str, data):
    _CACHE[key] = {"data": data, "ts": _time.time()}


@router.get("/dashboard")
def get_dashboard(
    _: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_dashboard_summary(db)


@router.get("/application-trends")
def get_application_trends(
    days: int = Query(30, ge=7, le=365),
    _: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_application_trends(db, days)


@router.get("/revenue")
def get_revenue_summary(
    days: int = Query(30, ge=7, le=365),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    cache_key = f"revenue_{days}"
    cached = _cache_get(cache_key)
    if cached:
        return cached
    result = AnalyticsService.get_revenue_summary(db, days)
    _cache_set(cache_key, result)
    return result


@router.get("/status-distribution")
def get_status_distribution(
    _: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    cached = _cache_get("status_distribution")
    if cached:
        return cached
    result = AnalyticsService.get_status_distribution(db)
    _cache_set("status_distribution", result)
    return result


@router.get("/regional")
def get_regional_stats(
    _: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_regional_stats(db)


@router.get("/processing-times")
def get_processing_times(
    _: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_processing_time_stats(db)


@router.get("/penalties")
def get_penalty_stats(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_penalty_stats(db)


@router.get("/super-admin/overview")
def get_super_admin_overview(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    cached = _cache_get("overview")
    if cached:
        return cached
    result = AnalyticsService.get_super_admin_overview(db)
    _cache_set("overview", result)
    return result


@router.get("/super-admin/monthly")
def get_monthly_analytics(
    year: int = Query(None),
    month: int = Query(None, ge=1, le=12),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    y = year or now.year
    m = month or now.month
    cache_key = f"monthly_{y}_{m}"
    cached = _cache_get(cache_key)
    if cached:
        return cached
    result = AnalyticsService.get_monthly_analytics(db, y, m)
    _cache_set(cache_key, result)
    return result


@router.get("/revenue/yearly")
def get_yearly_revenue(
    year: int = Query(None),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    return AnalyticsService.get_yearly_revenue(db, year or now.year)


@router.get("/staff/overview")
def get_staff_overview(
    _: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_staff_overview(db)
