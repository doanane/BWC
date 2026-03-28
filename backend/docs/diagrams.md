# Ghana BDR Digital Platform — System Diagrams

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph Client["Client Layer (Browser)"]
        UI[React + Vite SPA]
        A11Y[Accessibility Widget]
        CHAT[Chatbot Widget]
        WS_C[WebSocket Client]
    end

    subgraph Gateway["API Gateway (FastAPI)"]
        REST[REST API :8000]
        WSS[WebSocket /ws]
        SWAGGER[Swagger UI /docs]
    end

    subgraph Services["Backend Services"]
        AUTH[Auth Service]
        APP[Application Service]
        PAY[Payment Service]
        NOTIF[Notification Service]
        BOT[Chatbot Service]
        CERT[Certificate Service]
        ANALYTICS[Analytics Service]
        AUDIT[Audit Service]
        AI[AI Service]
        CHAT[Chat Service]
    end

    subgraph External["External APIs"]
        PAYSTACK[Paystack]
        GEMINI[Google Gemini AI]
        ANTHROPIC[Anthropic Claude]
        CLOUDINARY[Cloudinary CDN]
        GMAIL[Gmail SMTP]
        TWILIO[Twilio SMS]
        GOOGLE_OAUTH[Google OAuth2]
    end

    subgraph Storage["Data Layer"]
        POSTGRES[(PostgreSQL)]
        ALEMBIC[Alembic Migrations]
    end

    UI --> REST
    UI --> WSS
    WS_C --> WSS
    REST --> AUTH
    REST --> APP
    REST --> PAY
    REST --> NOTIF
    REST --> BOT
    REST --> CERT
    REST --> ANALYTICS
    REST --> AUDIT
    PAY --> PAYSTACK
    BOT --> GEMINI
    AI --> ANTHROPIC
    AI --> GEMINI
    APP --> CLOUDINARY
    NOTIF --> GMAIL
    NOTIF --> TWILIO
    AUTH --> GOOGLE_OAUTH
    AUTH --> POSTGRES
    APP --> POSTGRES
    PAY --> POSTGRES
    NOTIF --> POSTGRES
    CERT --> POSTGRES
    ANALYTICS --> POSTGRES
    AUDIT --> POSTGRES
    CHAT --> POSTGRES
    AI --> POSTGRES
    ALEMBIC --> POSTGRES
```

---

## 2. Enhanced Entity Relationship Diagram (EERD)

```mermaid
erDiagram
    USERS {
        int id PK
        string email UK
        string phone_number UK
        string hashed_password
        string first_name
        string last_name
        string other_names
        string ghana_card_number UK
        enum role "citizen|staff|admin|super_admin"
        enum status "active|inactive|suspended|pending_verification"
        bool is_active
        bool is_verified
        bool email_verified
        bool phone_verified
        string email_verification_token
        string password_reset_token
        datetime password_reset_expires
        datetime last_login
        string profile_photo
        string region
        string district
        text address
        bool notification_email
        bool notification_sms
        bool notification_push
        json accessibility_preferences
        datetime created_at
        datetime updated_at
    }

    STAFF_PROFILES {
        int id PK
        int user_id FK
        string staff_id UK
        string department
        string designation
        string office_location
        int supervisor_id FK
        bool can_approve
        bool can_reject
        bool can_print
        bool can_deliver
        datetime created_at
        datetime updated_at
    }

    REFRESH_TOKENS {
        int id PK
        int user_id FK
        string token UK
        datetime expires_at
        bool is_revoked
        datetime created_at
    }

    APPLICATIONS {
        int id PK
        string reference_number UK
        int applicant_id FK
        int assigned_to_id FK
        int reviewed_by_id FK
        enum application_type "birth|death"
        enum status "draft|submitted|under_review|approved|rejected|payment_pending|payment_completed|processing|ready|collected|delivered|cancelled"
        json form_data
        string nationality
        string region
        string district
        string office_code
        bool is_late_registration
        int penalty_amount
        text rejection_reason
        text review_notes
        datetime assigned_at
        text assignment_note
        datetime submitted_at
        datetime reviewed_at
        datetime approved_at
        datetime completed_at
        datetime created_at
        datetime updated_at
    }

    APPLICATION_CHATS {
        int id PK
        int application_id FK
        int sender_id FK
        text message
        datetime created_at
    }

    DOCUMENTS {
        int id PK
        int application_id FK
        int uploaded_by_id FK
        string document_type
        string original_filename
        string file_url
        string cloudinary_public_id
        string mime_type
        int file_size_bytes
        bool is_verified
        string verification_notes
        datetime created_at
    }

    PAYMENTS {
        int id PK
        int application_id FK
        int user_id FK
        string reference UK
        string paystack_reference
        decimal amount
        string currency
        enum status "pending|completed|failed|refunded"
        string payment_method
        string channel
        json metadata
        datetime paid_at
        datetime created_at
        datetime updated_at
    }

    CERTIFICATES {
        int id PK
        int application_id FK
        int issued_by_id FK
        string certificate_number UK
        string qr_code_url
        string pdf_url
        enum certificate_type "birth|death"
        string registrar_name
        string office_stamp
        bool is_valid
        string invalidation_reason
        datetime issued_at
        datetime created_at
    }

    NOTIFICATIONS {
        int id PK
        int user_id FK
        int application_id FK
        string title
        text message
        enum type "info|success|warning|error"
        enum channel "in_app|email|sms"
        bool is_read
        datetime read_at
        datetime created_at
    }

    AUDIT_LOGS {
        int id PK
        int user_id FK
        int application_id FK
        string action
        string entity_type
        int entity_id
        json changes
        string ip_address
        string user_agent
        datetime created_at
    }

    PENALTIES {
        int id PK
        int application_id FK
        enum penalty_type "late_birth|late_death"
        int days_late
        decimal penalty_amount
        bool is_waived
        string waiver_reason
        int waived_by_id FK
        datetime created_at
    }

    DELIVERIES {
        int id PK
        int application_id FK
        int assigned_to_id FK
        enum status "pending|in_transit|delivered|failed"
        string delivery_address
        string tracking_code UK
        text delivery_notes
        datetime scheduled_at
        datetime delivered_at
        datetime created_at
        datetime updated_at
    }

    USERS ||--o{ APPLICATIONS : "applicant_id"
    USERS ||--o{ STAFF_PROFILES : "user_id"
    USERS ||--o{ REFRESH_TOKENS : "user_id"
    USERS ||--o{ NOTIFICATIONS : "user_id"
    USERS ||--o{ AUDIT_LOGS : "user_id"
    USERS ||--o{ PAYMENTS : "user_id"
    STAFF_PROFILES }o--o| USERS : "supervisor_id"
    APPLICATIONS ||--o{ DOCUMENTS : "application_id"
    APPLICATIONS ||--o| PAYMENTS : "application_id"
    APPLICATIONS ||--o| CERTIFICATES : "application_id"
    APPLICATIONS ||--o{ NOTIFICATIONS : "application_id"
    APPLICATIONS ||--o{ AUDIT_LOGS : "application_id"
    APPLICATIONS ||--o| PENALTIES : "application_id"
    APPLICATIONS ||--o| DELIVERIES : "application_id"
    APPLICATIONS }o--o| USERS : "assigned_to_id"
    APPLICATIONS }o--o| USERS : "reviewed_by_id"
    APPLICATIONS ||--o{ APPLICATION_CHATS : "application_id"
    APPLICATION_CHATS }o--|| USERS : "sender_id"
    CERTIFICATES }o--|| USERS : "issued_by_id"
    PENALTIES }o--o| USERS : "waived_by_id"
    DELIVERIES }o--o| USERS : "assigned_to_id"
```

---

## 3. User Roles and Permissions Matrix

```mermaid
graph LR
    subgraph Roles["User Roles"]
        SA[Super Admin]
        AD[Admin]
        ST[Staff]
        CI[Citizen]
    end

    subgraph CitizenPerms["Citizen Permissions"]
        C1[Register Birth/Death]
        C2[Pay Fees]
        C3[Track Applications]
        C4[Download Certificates]
        C5[Update Profile]
        C6[Use Chatbot]
    end

    subgraph StaffPerms["Staff Permissions"]
        S1[All Citizen Permissions]
        S2[Review Applications]
        S3[Upload Verified Docs]
        S4[Process Deliveries]
        S5[View Reports]
    end

    subgraph AdminPerms["Admin Permissions"]
        A1[All Staff Permissions]
        A2[Approve/Reject Applications]
        A3[Issue Certificates]
        A4[Manage Staff Accounts]
        A5[View Revenue Analytics]
        A6[Waive Penalties]
    end

    subgraph SuperAdminPerms["Super Admin Permissions"]
        SA1[All Admin Permissions]
        SA2[Manage All Users]
        SA3[System Configuration]
        SA4[Monthly Analytics Dashboard]
        SA5[Audit Log Access]
        SA6[Suspend/Activate Any Account]
        SA7[Change User Roles]
    end

    CI --> CitizenPerms
    ST --> StaffPerms
    AD --> AdminPerms
    SA --> SuperAdminPerms
```

---

## 4. Main Application Flowchart — Birth Registration

```mermaid
flowchart TD
    START([User visits platform]) --> LANDING[Home Page]
    LANDING --> AUTH{Authenticated?}
    AUTH -->|No| SIGNIN[Sign In / Register]
    AUTH -->|Yes| DASHBOARD[Dashboard]
    SIGNIN --> DASHBOARD

    DASHBOARD --> BR[Start Birth Registration]
    BR --> STEP1[Step 1: Child Information\nName, DOB, Place of Birth, Gender]
    STEP1 --> STEP2[Step 2: Parent Information\nMother, Father, Ghana Card Numbers]
    STEP2 --> GHANA_CHECK{Ghana Card\nVerified?}
    GHANA_CHECK -->|No| GHANA_UPLOAD[Upload Ghana Card\n+ Selfie/Liveness Check]
    GHANA_UPLOAD --> GHANA_CHECK
    GHANA_CHECK -->|Yes| STEP3[Step 3: Document Upload\nBirth Notification, Hospital Letter, ID]
    STEP3 --> STEP4[Step 4: Review & Submit]
    STEP4 --> LATE_CHECK{Birth > 12\nmonths ago?}
    LATE_CHECK -->|Yes| PENALTY[Calculate Late\nRegistration Penalty]
    PENALTY --> PAYMENT_PAGE[Payment — Paystack]
    LATE_CHECK -->|No| FEE[Standard Fee\nCalculation]
    FEE --> PAYMENT_PAGE
    PAYMENT_PAGE --> PAY_VERIFY{Payment\nVerified?}
    PAY_VERIFY -->|No| PAY_FAIL[Show Error\nRetry Payment]
    PAY_FAIL --> PAYMENT_PAGE
    PAY_VERIFY -->|Yes| SUBMITTED[Application Submitted]
    SUBMITTED --> NOTIFY_STAFF[Email + SMS to Staff]
    NOTIFY_STAFF --> STAFF_REVIEW{Staff Reviews}
    STAFF_REVIEW -->|Needs More Info| NOTIFY_USER_DOCS[Notify User:\nAdditional Documents Needed]
    NOTIFY_USER_DOCS --> USER_UPLOADS[User Uploads\nAdditional Documents]
    USER_UPLOADS --> STAFF_REVIEW
    STAFF_REVIEW -->|Reject| REJECTED[Application Rejected]
    REJECTED --> NOTIFY_USER_REJECT[Notify User\nWith Reason]
    STAFF_REVIEW -->|Approve| APPROVED[Application Approved]
    APPROVED --> CERT_GEN[Generate Birth Certificate\nPDF + QR Code]
    CERT_GEN --> DELIVERY_CHOICE{Delivery\nPreference}
    DELIVERY_CHOICE -->|Office Collection| READY[Certificate Ready]
    DELIVERY_CHOICE -->|Home Delivery| ASSIGN_COURIER[Assign Courier]
    ASSIGN_COURIER --> TRANSIT[In Transit]
    TRANSIT --> DELIVERED[Delivered]
    READY --> COLLECT[User Collects at Office]
    COLLECT --> DONE([Complete])
    DELIVERED --> DONE
```

---

## 5. Death Registration Flowchart

```mermaid
flowchart TD
    START([Relative/Hospital visits platform]) --> AUTH{Authenticated?}
    AUTH -->|No| SIGNIN[Sign In]
    AUTH -->|Yes| DR[Start Death Registration]
    SIGNIN --> DR
    DR --> D1[Step 1: Deceased Details\nName, DOB, Date of Death, Gender]
    D1 --> D2[Step 2: Cause of Death\nMedical Certification or Coroner Report]
    D2 --> D3[Step 3: Informant Details\nRelationship, Ghana Card, Contact]
    D3 --> D4[Step 4: Document Upload\nDeath Notification, Medical Certificate, ID of Informant]
    D4 --> D5[Step 5: Review & Submit]
    D5 --> LATE_D{Death > 3\nmonths ago?}
    LATE_D -->|Yes| PENALTY_D[Late Death\nRegistration Penalty]
    LATE_D -->|No| FEE_D[Standard Fee]
    PENALTY_D --> PAY_D[Paystack Payment]
    FEE_D --> PAY_D
    PAY_D --> SUBMITTED_D[Submitted — Reference # Generated]
    SUBMITTED_D --> STAFF_D[Staff Review]
    STAFF_D -->|Approve| DEATH_CERT[Issue Death Certificate\nPDF + QR Code]
    STAFF_D -->|Reject| REJ_D[Reject with Reason]
    DEATH_CERT --> COLLECT_D[Office Collection or Delivery]
    COLLECT_D --> DONE_D([Complete])
```

---

## 6. Authentication & Token Lifecycle

```mermaid
sequenceDiagram
    participant U as User Browser
    participant FE as React Frontend
    participant API as FastAPI Backend
    participant DB as PostgreSQL

    U->>FE: Enter credentials
    FE->>API: POST /auth/login
    API->>DB: Verify user credentials
    DB-->>API: User record
    API-->>FE: { access_token (30min), refresh_token (7d) }
    FE->>FE: Store tokens in localStorage

    Note over FE,API: Normal API usage

    FE->>API: GET /applications (access_token)
    API-->>FE: 200 + data

    Note over FE,API: Token expires after 30 minutes

    FE->>API: GET /chatbot/ask (expired access_token)
    API-->>FE: 401 Unauthorized

    Note over FE: client.js interceptor activates

    FE->>API: POST /auth/refresh (refresh_token)
    API->>DB: Verify refresh token not revoked
    DB-->>API: Valid
    API-->>FE: { new access_token, new refresh_token }
    FE->>FE: Update localStorage

    FE->>API: GET /chatbot/ask (new access_token) [retry]
    API-->>FE: 200 + chatbot response

    Note over FE,API: Idle for 1 hour

    FE->>FE: AuthContext idle timer fires
    FE->>FE: logout() — clear localStorage
    FE->>U: Redirect to /signin
```

---

## 7. Payment Integration Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant PS as Paystack
    participant DB as PostgreSQL

    U->>FE: Initiate Payment
    FE->>API: POST /payments/initiate
    API->>DB: Create payment record (status=pending)
    API->>PS: Initialize transaction (amount, email, reference)
    PS-->>API: { authorization_url, reference }
    API-->>FE: { payment_url, reference }
    FE->>U: Redirect to Paystack checkout

    U->>PS: Enter card details
    PS->>PS: Process payment
    PS->>API: Webhook: charge.success
    API->>PS: Verify transaction (reference)
    PS-->>API: { status: success, amount }
    API->>DB: Update payment status=completed
    API->>DB: Update application status=payment_completed
    API->>FE: Email receipt to user

    Note over U,FE: User returned from Paystack

    FE->>API: GET /payments/verify/reference
    API-->>FE: { status: completed }
    FE->>U: Show success screen + reference number
```

---

## 8. Super Admin Control Flow

```mermaid
flowchart TD
    SA([Super Admin Login]) --> SA_DASH[Super Admin Dashboard]
    SA_DASH --> OVERVIEW[System Overview\nTotal Users, Applications, Revenue]
    SA_DASH --> ANALYTICS[Monthly Analytics\nCharts + Trends]
    SA_DASH --> USER_MGMT[User Management]
    SA_DASH --> APP_OVERSIGHT[Application Oversight]
    SA_DASH --> AUDIT[Audit Log Viewer]
    SA_DASH --> SYSTEM_CFG[System Configuration]

    USER_MGMT --> LIST_USERS[List All Users\nFilter by Role/Status]
    LIST_USERS --> VIEW_USER[View User Profile]
    VIEW_USER --> ACTIONS{Admin Actions}
    ACTIONS --> SUSPEND[Suspend Account]
    ACTIONS --> ACTIVATE[Activate Account]
    ACTIONS --> CHANGE_ROLE[Change Role\ncitizen/staff/admin]
    ACTIONS --> RESET_PW[Force Password Reset]
    ACTIONS --> VIEW_APPS_USER[View User's Applications]

    ANALYTICS --> MONTHLY[Monthly Registrations\nBirth vs Death]
    ANALYTICS --> REVENUE_CHART[Revenue Chart\nFees + Penalties]
    ANALYTICS --> REGIONAL[Regional Breakdown\n16 Regions Heatmap]
    ANALYTICS --> STAFF_PERF[Staff Performance\nApplications Processed]
    ANALYTICS --> PROCESSING_TIME[Average Processing Time\nper Application Type]

    APP_OVERSIGHT --> ALL_APPS[All Applications\nAny Status]
    ALL_APPS --> FILTER_APP[Filter by Type/Status/Region/Date]
    FILTER_APP --> REASSIGN[Reassign Staff]
    FILTER_APP --> FORCE_STATUS[Override Status]
    FILTER_APP --> VIEW_DOCS[View Documents]

    AUDIT --> FILTER_AUDIT[Filter by User/Action/Date]
    AUDIT --> EXPORT_AUDIT[Export CSV]

    SYSTEM_CFG --> FEE_SETTINGS[Fee Configuration\nBirth/Death Fees]
    SYSTEM_CFG --> PENALTY_RULES[Penalty Rules\nLate Days Thresholds]
    SYSTEM_CFG --> NOTIF_TEMPLATES[Notification Templates\nEmail/SMS]
```

---

## 9. Notification System Flow

```mermaid
sequenceDiagram
    participant TRIGGER as Event Trigger
    participant NOTIF as Notification Service
    participant WS as WebSocket Manager
    participant EMAIL as Gmail SMTP
    participant SMS as Twilio
    participant DB as PostgreSQL
    participant FE as React Frontend

    TRIGGER->>NOTIF: Application status changed
    NOTIF->>DB: Create notification record (type=in_app)
    NOTIF->>WS: Broadcast to user's WS connection
    WS-->>FE: Real-time notification event
    FE->>FE: Show notification toast

    NOTIF->>EMAIL: Send email (SMTP async)
    EMAIL-->>NOTIF: Email delivered

    NOTIF->>SMS: Send SMS (Twilio API)
    SMS-->>NOTIF: SMS delivered

    Note over FE: User opens notifications panel

    FE->>NOTIF: GET /notifications (unread)
    NOTIF-->>FE: List of notifications
    FE->>NOTIF: PUT /notifications/id/read
    NOTIF->>DB: Mark as read
```

---

## 10. Document Upload and Verification Flow

```mermaid
flowchart LR
    USER([User]) --> UPLOAD[Upload Document\nGhana Card, Birth Notification, etc.]
    UPLOAD --> VALIDATE{File Validation}
    VALIDATE -->|Invalid type/size| ERROR[Return Error\nJPEG/PNG/PDF only, max 10MB]
    ERROR --> UPLOAD
    VALIDATE -->|Valid| CLOUDINARY[Upload to Cloudinary CDN]
    CLOUDINARY --> SECURE_URL[Secure URL + CDN Distribution]
    SECURE_URL --> DB_RECORD[Save Document Record\n+ file_url in PostgreSQL]
    DB_RECORD --> STAFF_NOTIF[Notify Staff\nNew Documents Available]
    STAFF_NOTIF --> STAFF_VIEW[Staff Views Documents]
    STAFF_VIEW --> VERIFY{Staff Verifies}
    VERIFY -->|Authentic| VERIFIED[Mark is_verified=true]
    VERIFY -->|Suspect| FLAGGED[Flag Document\n+ Request Resubmission]
    FLAGGED --> USER
    VERIFIED --> PROCEED[Proceed with Application Review]
```

---

## 11. WebSocket Real-Time Architecture

```mermaid
graph TD
    FE[React Frontend] -->|"ws://localhost:8000/ws?token=JWT"| WS[WebSocket Manager]
    WS --> CONN_MAP["active_connections: Dict user_id to WebSocket"]
    CONN_MAP --> AUTH_CHECK{JWT Valid?}
    AUTH_CHECK -->|No| CLOSE[Close Connection\n1008 Policy Violation]
    AUTH_CHECK -->|Yes| REGISTER[Register Connection\nuser_id keyed]

    EVENT[Backend Event] --> BROADCAST["broadcast_to_user(user_id, message)"]
    BROADCAST --> CONN_MAP
    CONN_MAP --> SEND[Send JSON to WebSocket]
    SEND --> FE_HANDLER["RealtimeNotifications.jsx\nonmessage handler"]
    FE_HANDLER --> TOAST[Show Snackbar Toast]
    FE_HANDLER --> UPDATE[Update Notification Count]
```

---

## 12. Ghana Card Verification Flow

```mermaid
flowchart TD
    START([User starts birth/death registration]) --> STEP[Step 2: Verify Identity]
    STEP --> UPLOAD_CARD[Upload Ghana Card Photo\nGHA-XXXXXXXXX format validation]
    UPLOAD_CARD --> FORMAT{Card number\nformat valid?}
    FORMAT -->|No| FORMAT_ERR[Show format error\nGHA-XXXXXXXXX-X]
    FORMAT_ERR --> UPLOAD_CARD
    FORMAT -->|Yes| SELFIE[Take Selfie / Upload Photo]
    SELFIE --> COMPARE{Face Match\n> 70% confidence?}
    COMPARE -->|face_api_enabled=true| AI_COMPARE[face-api.js\nClient-side comparison]
    AI_COMPARE --> RESULT{Match?}
    RESULT -->|No| RETRY[Show mismatch\nRetry selfie]
    RETRY --> SELFIE
    RESULT -->|Yes| VERIFIED[Identity Verified]
    COMPARE -->|face_api_enabled=false| MANUAL[Manual Review Flag\nStaff verifies manually]
    MANUAL --> VERIFIED
    VERIFIED --> PROCEED[Proceed to Document Upload]
```

---

## 13. Certificate Generation Flow

```mermaid
flowchart TD
    APPROVED([Application Approved]) --> TRIGGER[Certificate Generation Triggered]
    TRIGGER --> CERT_NUM[Generate Unique Certificate Number\nBDR-YYYY-XXXXXXXX]
    CERT_NUM --> QR[Generate QR Code\nVerification URL]
    QR --> PDF[Render PDF via reportlab\nOfficial BDR Letterhead + Watermark]
    PDF --> UPLOAD_CERT[Upload PDF to Cloudinary]
    UPLOAD_CERT --> CERT_RECORD[Create Certificate Record in DB\ncertificate_number, pdf_url, qr_code_url]
    CERT_RECORD --> NOTIFY_READY[Notify Applicant\nEmail + SMS + In-App]
    NOTIFY_READY --> VERIFY_LINK[Public Verification Link\n/verify/cert-number]
    VERIFY_LINK --> QR_SCAN[Anyone scans QR - Public page\nShows authentic or invalid status]
```

---

## 14. Staff Task Assignment & Collaboration Flow

```mermaid
flowchart TD
    SUBMIT([Application Submitted]) --> QUEUE[Appears in Staff Queue\nAll active staff can see it]
    QUEUE --> ASSIGN{How assigned?}

    ASSIGN -->|Admin assigns| ADMIN_ASSIGN[Admin: Applications tab\nAssign tab → select staff → save]
    ADMIN_ASSIGN --> NOTIFY_STAFF[Notification sent to staff\nIn-app + WebSocket]
    NOTIFY_STAFF --> LOCKED[Application shows as LOCKED\nOther staff see staff name badge]

    ASSIGN -->|Staff claims| CLAIM_BTN[Staff clicks Claim button\nPOST /applications/{id}/claim]
    CLAIM_BTN --> LOCK_CHECK{Already claimed\nby another?}
    LOCK_CHECK -->|Yes| CONFLICT[409 Conflict\nShows assigned staff name]
    LOCK_CHECK -->|No| LOCKED

    LOCKED --> CHAT[Admin & assigned staff\ncan chat per-application]
    LOCKED --> AI_REVIEW[Staff runs AI Review\nFlags, strengths, recommendation]
    AI_REVIEW --> FRAUD[Staff runs Fraud Check\nDuplicate cards, impossible dates]
    AI_REVIEW --> DRAFT[Staff drafts response letter\nAI generates formal letter]
    DRAFT --> DECISION[Staff updates status\nApproved/Rejected/Request Info]
    DECISION --> COMPLETE[Application marked done\nOther staff see completion badge]
```

---

## 15. AI Automation Architecture

```mermaid
graph TB
    subgraph AI_ENDPOINTS["AI API Endpoints (/ai/)"]
        FF[form-fill\nExtract fields from text]
        SS[status-summary\nPlain language status]
        DS[document-screen\nGhana Card quality check]
        RA[review-application\nFull application audit]
        DR[draft-response\nResponse letter generation]
        FC[fraud-check\nRisk analysis]
        WS[workload-suggestion\nOptimal staff assignment]
        DB[daily-briefing\nOperations summary]
    end

    subgraph PROVIDERS["AI Providers (auto-fallback)"]
        ANTHROPIC[Anthropic Claude\nclaude-haiku-4-5-20251001]
        GEMINI[Google Gemini\ngemini-flash-lite-latest]
    end

    subgraph USERS_UI["Who uses it"]
        CITIZEN[Citizens\nform-fill, status-summary]
        STAFF_UI[Staff\nreview-application, draft-response, fraud-check]
        ADMIN_UI[Admin / Super Admin\nworkload-suggestion, daily-briefing]
    end

    FF --> ANTHROPIC
    FF --> GEMINI
    SS --> ANTHROPIC
    SS --> GEMINI
    DS --> ANTHROPIC
    DS --> GEMINI
    RA --> ANTHROPIC
    DR --> ANTHROPIC
    FC --> ANTHROPIC
    FC --> GEMINI
    WS --> ANTHROPIC
    DB --> ANTHROPIC

    CITIZEN --> FF
    CITIZEN --> SS
    STAFF_UI --> RA
    STAFF_UI --> DR
    STAFF_UI --> FC
    ADMIN_UI --> WS
    ADMIN_UI --> DB

    ANTHROPIC -->|low credit / unavailable| GEMINI
```
