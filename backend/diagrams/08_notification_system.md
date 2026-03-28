# 08 — Notification System

Multi-channel notification architecture — in-app, email, SMS, and real-time WebSocket.

## Notification Dispatch Flow

```mermaid
sequenceDiagram
    participant EVENT as Application Event\n(status change, payment, etc.)
    participant NOTIF_SVC as Notification Service
    participant DB as PostgreSQL
    participant WS_MGR as WebSocket Manager
    participant FE as React Frontend
    participant SMTP as Gmail SMTP
    participant TWILIO as Twilio SMS

    EVENT->>NOTIF_SVC: notify_user(user_id, type, title, message, data)

    NOTIF_SVC->>DB: INSERT notifications\n{user_id, application_id, title, message,\nnotification_type, data={ref, status, application_id}}

    par In-App via WebSocket
        NOTIF_SVC->>WS_MGR: broadcast_to_user(user_id, notification_payload)
        WS_MGR->>FE: ws.send(JSON)
        FE->>FE: Show snackbar toast\nUpdate bell badge count
    and Email
        NOTIF_SVC->>SMTP: send_email(to, subject, html_body)\nJinja2 template with first name only
        SMTP-->>NOTIF_SVC: Delivered
    and SMS
        NOTIF_SVC->>TWILIO: send_sms(phone, message)
        TWILIO-->>NOTIF_SVC: Sent
    end
```

---

## Notification Types & Navigation Routes

```mermaid
flowchart LR
    subgraph TYPES["Notification Types"]
        T1["application_submitted\nReference number issued"]
        T2["application_approved\nCertificate will be generated"]
        T3["application_rejected\nReason provided"]
        T4["payment_required\nFee payment outstanding"]
        T5["payment_received\nReceipt confirmation"]
        T6["certificate_ready\nPDF available for download"]
        T7["document_requested\nAdditional documents needed"]
        T8["account_verified\nEmail verification complete"]
        T9["delivery_update\nCourier status change"]
        T10["system_announcement\nSystem-wide message"]
    end

    subgraph ROUTES["Navigation on Click (Header.jsx)"]
        R1["/track?ref=BDR-XXXX"]
        R2["/track?ref=BDR-XXXX"]
        R3["/track?ref=BDR-XXXX"]
        R4["/payment?application_id=X"]
        R5["/track?ref=BDR-XXXX"]
        R6["/track?ref=BDR-XXXX"]
        R7["/track?ref=BDR-XXXX"]
        R8["/profile"]
        R9["/track?ref=BDR-XXXX"]
        R10["/dashboard"]
    end

    T1 --> R1
    T2 --> R2
    T3 --> R3
    T4 --> R4
    T5 --> R5
    T6 --> R6
    T7 --> R7
    T8 --> R8
    T9 --> R9
    T10 --> R10
```

---

## Notification Panel UX (Header.jsx)

```mermaid
flowchart TD
    BELL["User clicks bell icon"] --> TOGGLE["Fetch notifications list\nFetch unread count"]
    TOGGLE --> PANEL["Notification panel opens"]
    PANEL --> ITEMS["List: title, message, timestamp\nUnread items highlighted"]
    ITEMS --> CLICK["User clicks a notification"]
    CLICK --> MARK["markRead() — fire and forget\nNo await — instant navigation"]
    MARK --> CLOSE["Close panel"]
    CLOSE --> NAVIGATE["navigate(route)\nDerived from notification_type + data.ref"]
    PANEL --> MARK_ALL["Mark All Read button"]
    MARK_ALL --> API_MARK_ALL["PUT /api/notifications/mark-all-read"]
    API_MARK_ALL --> ZERO["Badge resets to 0"]
```

---

## WebSocket Connection Lifecycle

```mermaid
sequenceDiagram
    participant FE as RealtimeNotifications.jsx
    participant WS_SERVER as FastAPI WebSocket\n/api/notifications/ws
    participant DB as PostgreSQL

    FE->>WS_SERVER: ws://localhost:8000/api/notifications/ws?token=JWT
    WS_SERVER->>WS_SERVER: Decode JWT, verify signature
    alt Token invalid
        WS_SERVER-->>FE: Close 1008 Policy Violation
    else Token valid
        WS_SERVER->>DB: SELECT user
        WS_SERVER->>WS_SERVER: Register connection\nactive_connections[user_id] = websocket
        WS_SERVER-->>FE: Connected

        loop Keep alive
            WS_SERVER->>FE: ping (every 30s)
            FE-->>WS_SERVER: pong
        end

        Note over WS_SERVER,FE: Application event triggers
        WS_SERVER->>FE: JSON notification payload
        FE->>FE: Show toast\nUpdate unread count
        FE->>FE: Append to notifications list

        Note over FE: User closes tab or navigates away
        FE-->>WS_SERVER: Close
        WS_SERVER->>WS_SERVER: Remove from active_connections
    end
```
