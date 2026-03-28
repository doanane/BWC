from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.schemas.accessibility import AccessibilityPreferences
from app.models.user import User

router = APIRouter(prefix="/users/me", tags=["Accessibility"])


@router.get("/accessibility", response_model=AccessibilityPreferences)
def get_accessibility(
    current_user: User = Depends(get_current_active_user),
):
    if current_user.accessibility_preferences:
        return AccessibilityPreferences(**current_user.accessibility_preferences)
    return AccessibilityPreferences()


@router.put("/accessibility", response_model=AccessibilityPreferences)
def update_accessibility(
    prefs: AccessibilityPreferences,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    current_user.accessibility_preferences = prefs.model_dump()
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return AccessibilityPreferences(**current_user.accessibility_preferences)
