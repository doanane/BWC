import logging

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal
from app.core.dependencies import get_current_active_user
from app.core.security import decode_token
from app.services.notification_service import NotificationService
from app.services.realtime_service import notification_ws_manager
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])
logger = logging.getLogger(__name__)


def _safe_close_session(db: Session | None) -> None:
    if db is None:
        return
    try:
        db.close()
    except Exception as exc:
        logger.warning("Ignored websocket DB close error: %s", exc)


@router.websocket("/ws")
async def notifications_ws(websocket: WebSocket, token: str = Query(...)):
    user_id: int | None = None
    db: Session | None = None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        sub = payload.get("sub")
        if not sub:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        user_id = int(sub)

        # Keep DB usage short-lived: authenticate once, then release connection
        # before entering the long-running websocket receive loop.
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        _safe_close_session(db)
        db = None

        await notification_ws_manager.connect(user_id, websocket)
        await websocket.send_json({"event": "notification.connected"})

        while True:
            msg = await websocket.receive_text()
            if msg.strip().lower() == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception:
        if websocket.client_state.name != "DISCONNECTED":
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    finally:
        if user_id is not None:
            notification_ws_manager.disconnect(user_id, websocket)
        _safe_close_session(db)


@router.get("", include_in_schema=False)
@router.get("/")
def get_notifications(
    unread_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return NotificationService.get_user_notifications(
        db, current_user.id, unread_only, page, page_size
    )


@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    count = NotificationService.get_unread_count(db, current_user.id)
    return {"unread_count": count}


@router.post("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    NotificationService.mark_as_read(db, notification_id, current_user.id)
    return {"message": "Notification marked as read"}


@router.post("/read-all")
def mark_all_as_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    count = NotificationService.mark_all_as_read(db, current_user.id)
    return {"message": f"{count} notifications marked as read"}
