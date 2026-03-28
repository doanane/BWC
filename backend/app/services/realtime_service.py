from collections import defaultdict
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class NotificationConnectionManager:
    def __init__(self):
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[user_id].add(websocket)
        logger.info("Notification websocket connected for user_id=%s", user_id)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        user_connections = self._connections.get(user_id)
        if not user_connections:
            return
        user_connections.discard(websocket)
        if not user_connections:
            self._connections.pop(user_id, None)
        logger.info("Notification websocket disconnected for user_id=%s", user_id)

    async def send_to_user(self, user_id: int, payload: dict) -> None:
        sockets = list(self._connections.get(user_id, []))
        stale: list[WebSocket] = []
        for socket in sockets:
            try:
                await socket.send_json(payload)
            except Exception:
                stale.append(socket)
        for socket in stale:
            self.disconnect(user_id, socket)

    async def broadcast_to_user_ids(self, user_ids: list, payload: dict) -> None:
        for user_id in user_ids:
            await self.send_to_user(user_id, payload)

    async def broadcast_to_staff_admin(self, payload: dict, db=None) -> None:
        if db is None:
            return
        try:
            from app.models.user import User, UserRole
            staff_ids = [
                row[0] for row in db.query(User.id).filter(
                    User.role.in_([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
                    User.is_active == True,
                ).all()
            ]
            await self.broadcast_to_user_ids(staff_ids, payload)
        except Exception as exc:
            logger.warning("broadcast_to_staff_admin error: %s", exc)

    def connected_user_ids(self) -> list[int]:
        return [uid for uid, sockets in self._connections.items() if sockets]


notification_ws_manager = NotificationConnectionManager()
