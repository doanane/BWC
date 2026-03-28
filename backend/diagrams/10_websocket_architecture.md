# 10 — WebSocket Real-Time Architecture

Real-time notification delivery using WebSockets (FastAPI + React).

```mermaid
graph TB
    subgraph FRONTEND["React Frontend"]
        COMP["RealtimeNotifications.jsx\n(mounts on login)"]
        HEADER["Header.jsx\nbadge count + panel"]
        SNACK["SnackbarContext\ntoast display"]
        EVENTS["Window Events\nbdr:notification-created\nbdr:ws-connected"]
    end

    subgraph WS_LAYER["FastAPI WebSocket Layer"]
        ENDPOINT["WS Endpoint\n/api/notifications/ws?token=JWT"]
        AUTH_WS["JWT Auth\ndecodes token, gets user_id"]
        CONN_MAP["ConnectionManager\nactive_connections: Dict[int, WebSocket]"]
        BROADCAST["broadcast_to_user(user_id, payload)"]
        PING["Heartbeat Ping\nevery 30 seconds"]
    end

    subgraph BACKEND_EVENTS["Backend Event Sources"]
        APP_EVENT["Application status change\napplication_service.py"]
        PAY_EVENT["Payment received\npayment_service.py"]
        CERT_EVENT["Certificate issued\ncertificate_service.py"]
        NOTIF_SVC["Notification Service\ncreate_notification()"]
    end

    subgraph DB["PostgreSQL"]
        NOTIF_TABLE["notifications table\nstored for panel fetch"]
    end

    COMP -->|"ws://localhost:8000/api/notifications/ws?token=JWT"| ENDPOINT
    ENDPOINT --> AUTH_WS
    AUTH_WS -->|valid| CONN_MAP
    AUTH_WS -->|invalid| CLOSE["Close 1008"]

    APP_EVENT --> NOTIF_SVC
    PAY_EVENT --> NOTIF_SVC
    CERT_EVENT --> NOTIF_SVC
    NOTIF_SVC --> NOTIF_TABLE
    NOTIF_SVC --> BROADCAST
    BROADCAST --> CONN_MAP
    CONN_MAP --> COMP

    COMP --> EVENTS
    EVENTS --> HEADER
    EVENTS --> SNACK

    PING --> COMP
    COMP --> PING

    style COMP fill:#006B3C,color:#fff
    style BROADCAST fill:#FCD116,color:#000
```

---

## Connection State Machine

```mermaid
stateDiagram-v2
    [*] --> DISCONNECTED: App loads
    DISCONNECTED --> CONNECTING: User authenticated
    CONNECTING --> CONNECTED: JWT valid, handshake ok
    CONNECTING --> DISCONNECTED: JWT invalid / network error
    CONNECTED --> RECEIVING: Server sends notification
    RECEIVING --> CONNECTED: Message handled
    CONNECTED --> RECONNECTING: Connection dropped
    RECONNECTING --> CONNECTING: Retry after backoff
    RECONNECTING --> DISCONNECTED: Max retries exceeded
    CONNECTED --> DISCONNECTED: User logs out
```

---

## Broadcast Payload Structure

```json
{
  "id": 42,
  "title": "Application Approved",
  "message": "Your application BDR-2026-0042 has been approved.",
  "notification_type": "application_approved",
  "status": "unread",
  "application_id": 17,
  "data": {
    "ref": "BDR-2026-0042",
    "status": "approved",
    "application_id": 17
  },
  "created_at": "2026-03-28T10:15:30Z"
}
```
