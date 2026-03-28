# Ghana Births & Deaths Registry — Backend API

FastAPI-based REST API powering the Ghana Births and Deaths Registry digital platform.

A production-grade backend system for Ghana's vital registration digitisation project, handling citizen registration, birth/death applications, biometric identity verification, secure payments, PDF certificates, and real-time notifications.

---

## Table of Contents

- [Overview](#overview)
- [Project Context](#project-context)
- [Tech Stack](#tech-stack)
- [Architecture Highlights](#architecture-highlights)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Core Features Implemented](#core-features-implemented)
- [API Reference](#api-reference)
- [Authentication & Security](#authentication--security)
- [Database Design](#database-design)
- [KYC & Identity Verification](#kyc--identity-verification)
- [Payment Integration](#payment-integration)
- [Notifications System](#notifications-system)
- [File Storage](#file-storage)
- [Analytics & Reporting](#analytics--reporting)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

This backend provides all API services for the Ghana Births and Deaths Registry (BDR) digital portal. It handles:

- **Citizen Account Management**: User registration, login, profile management, password reset
- **Vital Registration**: Birth and death application creation, editing, submission, and status tracking
- **Identity Verification**: Biometric KYC via MetaMap and Ghana Card verification against NIA database
- **Payment Processing**: Integration with Paystack for application fees, express processing, delivery, and penalty charges
- **Certificate Management**: Generation of tamper-evident PDF certificates with QR codes, public QR verification endpoint
- **Delivery Tracking**: Managing certificate delivery logistics and delivery confirmations
- **Notifications**: Real-time in-app notifications, email (SendGrid + SMTP), SMS (Twilio), and WebSocket updates
- **Staff Task Management**: Application assignment/locking, per-application admin–staff chat, claim/lock workflow
- **Staff Productivity Tracking**: Per-staff workload stats (assigned, in-progress, completed, completion rate)
- **Administrative Tools**: Staff dashboards, super-admin analytics, audit logging, KYC review, user management
- **Analytics & Reporting**: Revenue tracking, processing metrics, regional statistics, downloadable reports
- **AI Automation**: Dual-provider AI (Anthropic Claude + Google Gemini) for application review, fraud detection, workload optimisation, daily briefings, response letter drafting, form-fill assist, and citizen chatbot

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115+ |
| Language | Python 3.11+ |
| ORM | SQLAlchemy 2.x |
| Database | PostgreSQL (Neon cloud) + local PostgreSQL fallback |
| Auth | JWT (python-jose) — access + refresh token pattern |
| Password hashing | passlib (sha256_crypt + pbkdf2_sha256) |
| PII encryption | cryptography (Fernet / AES-128-CBC) |
| File storage | Cloudinary |
| Email | SendGrid + SMTP fallback (Gmail) |
| SMS | Twilio |
| Payments | Paystack |
| Identity verification | MetaMap (biometric KYC) |
| PDF generation | ReportLab + qrcode + PIL |
| AI Chatbot | Google Gemini API |
| AI Staff/Admin Tools | Anthropic Claude (claude-haiku-4-5) + Google Gemini fallback |
| Task queue | Celery + Redis |
| Server | Uvicorn |

---

## Project Structure

```
backend/
├── main.py                        # App entrypoint, middleware, startup migration
├── app/
│   ├── api/                       # Route handlers (one file per domain)
│   │   ├── auth.py                # Registration, login, token refresh, password reset
│   │   ├── users.py               # User profile, accessibility, account deletion
│   │   ├── applications.py        # Birth/death application CRUD and workflow
│   │   ├── payments.py            # Paystack payment initiation and webhooks
│   │   ├── documents.py           # Document upload and verification
│   │   ├── certificates.py        # Certificate generation, printing, download
│   │   ├── deliveries.py          # Delivery tracking and management
│   │   ├── notifications.py       # In-app notifications and WebSocket
│   │   ├── kyc.py                 # MetaMap webhook, KYC status, document submission
│   │   ├── nia.py                 # NIA Ghana Card database verification
│   │   ├── analytics.py           # Dashboard stats, trends, revenue reports
│   │   ├── reports.py             # Downloadable PDF/CSV reports
│   │   ├── audit.py               # Audit log viewer (admin)
│   │   ├── contact.py             # Contact form and feedback submissions
│   │   ├── penalties.py           # Late registration penalty management
│   │   ├── chatbot.py             # Gemini AI chatbot endpoint
│   │   └── misc.py                # Regions, districts, document requirements
│   ├── core/
│   │   ├── config.py              # Pydantic settings (reads from .env)
│   │   ├── database.py            # SQLAlchemy engine, session, dual DB setup
│   │   ├── dependencies.py        # FastAPI dependency injection (auth guards)
│   │   └── security.py            # JWT, hashing, Fernet PII encryption, HMAC lookup
│   ├── middleware/
│   │   └── audit_middleware.py    # Request logging and audit trail
│   ├── models/                    # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── application.py
│   │   ├── certificate.py
│   │   ├── document.py
│   │   ├── payment.py
│   │   ├── delivery.py
│   │   ├── notification.py
│   │   ├── penalty.py
│   │   ├── audit.py
│   │   └── contact.py
│   ├── schemas/                   # Pydantic request/response schemas
│   ├── services/                  # Business logic layer
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── application_service.py
│   │   ├── payment_service.py
│   │   ├── certificate_service.py
│   │   └── delivery_service.py
│   └── utils/
│       ├── cloudinary_storage.py
│       ├── email.py
│       ├── sms.py
│       ├── nia_seed.py
│       └── pdf_generator.py
├── requirements.txt
└── .env.example
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL (local or Neon cloud account)
- Redis (optional — required only for Celery task queue)

### Installation

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Running the Development Server

```bash
uvicorn main:app --reload
```

API base URL: `http://localhost:8000`
Interactive docs (development only): `http://localhost:8000/docs`

---

## Environment Variables

```env
# ── Database ──────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host/dbname
DATABASE_URL_FALLBACK=postgresql://user:password@localhost/bdr_local

# ── JWT Security ──────────────────────────────────────────────────────
SECRET_KEY=your-very-long-random-secret-key-min-64-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ── Application ───────────────────────────────────────────────────────
ENVIRONMENT=development     # Set to "production" to disable /docs
DEBUG=false

# ── Email — SendGrid (primary) ────────────────────────────────────────
SENDGRID_API_KEY=SG.xxxx
SENDGRID_FROM_EMAIL=noreply@birthdeathregistry.gov.gh

# ── Email — SMTP fallback ─────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your-app-password

# ── Twilio SMS ────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=VAxxxx

# ── Paystack ──────────────────────────────────────────────────────────
PAYSTACK_SECRET_KEY=sk_test_xxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxx

# ── MetaMap (biometric KYC) ───────────────────────────────────────────
METAMAP_CLIENT_ID=xxxx
METAMAP_CLIENT_SECRET=xxxx
METAMAP_WEBHOOK_SECRET=xxxx
METAMAP_API_URL=https://api.getmati.com

# ── Cloudinary ────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=xxxx
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx

# ── Google Gemini AI (chatbot) ────────────────────────────────────────
GEMINI_API_KEY=xxxx

# ── Redis ─────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── CORS & Frontend ───────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# ── Fee Schedule (GHS) ────────────────────────────────────────────────
NORMAL_PROCESSING_FEE=50.00
EXPRESS_PROCESSING_FEE=150.00
DELIVERY_BASE_FEE=30.00
PENALTY_DAILY_RATE=5.00
PENALTY_GRACE_PERIOD_DAYS=7
```

---

## API Reference

All endpoints are prefixed with `/api`.

### Authentication — `/api/auth`

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register new citizen account | No |
| POST | `/auth/login` | Login with email + password | No |
| POST | `/auth/digital-id-login` | Login via Ghana Card + MetaMap biometrics | No |
| POST | `/auth/refresh` | Rotate access + refresh tokens | No |
| POST | `/auth/logout` | Revoke refresh token | Yes |
| GET | `/auth/me` | Get current authenticated user | Yes |
| POST | `/auth/verify-email` | Verify email address with token | No |
| POST | `/auth/forgot-password` | Send password reset email | No |
| POST | `/auth/reset-password` | Set new password with reset token | No |

### Users — `/api/users`

| Method | Path | Description | Auth |
|---|---|---|---|
| PUT | `/users/me` | Update profile fields | Yes |
| DELETE | `/users/me` | Permanently delete account | Yes |
| POST | `/users/me/change-password` | Change password | Yes |
| POST | `/users/me/upload-photo` | Upload profile photo | Yes |
| GET | `/users/me/accessibility` | Get accessibility preferences | Yes |
| PUT | `/users/me/accessibility` | Save accessibility preferences | Yes |
| GET | `/users/` | List all users | Admin |
| GET | `/users/stats` | User statistics summary | Admin |
| PUT | `/users/{id}` | Admin update user | Admin |
| POST | `/users/staff` | Create staff account | Super Admin |

### Applications — `/api/applications`

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/applications/` | Create birth registration application | Yes |
| POST | `/applications/death` | Create death registration application | Yes |
| GET | `/applications/my` | Get current user's applications | Yes |
| GET | `/applications/track/{ref}` | Track application by reference number | No |
| GET | `/applications/{id}` | Get application details | Yes |
| PUT | `/applications/{id}` | Update draft application | Yes |
| POST | `/applications/{id}/submit` | Submit application for review | Yes |
| POST | `/applications/{id}/cancel` | Cancel application | Yes |
| POST | `/applications/{id}/status` | Update status (staff) | Staff |
| GET | `/applications/{id}/history` | Full status change history | Yes |
| POST | `/applications/{id}/confirm-collection` | Confirm certificate collected | Yes |

### KYC — `/api/kyc`

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/kyc/webhook` | MetaMap verification result webhook | No (HMAC) |
| POST | `/kyc/submit-metamap` | Store MetaMap verification ID | Yes |
| GET | `/kyc/status` | Get own KYC status | Yes |
| POST | `/kyc/submit-documents` | Upload Ghana Card front and back | Yes |
| POST | `/kyc/request-documents` | Email user to resubmit KYC (admin) | Admin |

### Payments — `/api/payments`

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/payments/initiate` | Initiate Paystack payment | Yes |
| GET | `/payments/verify/{reference}` | Verify payment after redirect | Yes |
| POST | `/payments/webhook/paystack` | Paystack payment webhook | No (HMAC) |
| GET | `/payments/plans/pricing` | Get current fee schedule | No |
| POST | `/payments/{id}/refund` | Request payment refund | Yes |

### Certificates — `/api/certificates`

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/certificates/generate/{app_id}` | Generate PDF certificate | Staff |
| POST | `/certificates/{id}/mark-printed` | Mark certificate as printed | Staff |
| GET | `/certificates/verify/{cert_no}` | Public certificate authenticity check | No |
| GET | `/certificates/application/{app_id}` | Get certificate for application | Yes |
| GET | `/certificates/{cert_no}/download` | Download certificate PDF | Yes |
| POST | `/certificates/{id}/revoke` | Revoke certificate | Admin |

### Deliveries — `/api/deliveries`

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/deliveries/application/{app_id}` | Create delivery order | Yes |
| GET | `/deliveries/track/{tracking_no}` | Track delivery status | No |
| POST | `/deliveries/{id}/assign` | Assign delivery agent | Staff |
| POST | `/deliveries/{id}/update-status` | Update delivery status | Staff |
| GET | `/deliveries/my-deliveries` | Get agent's assigned deliveries | Staff |

### Notifications — `/api/notifications`

| Method | Path | Description | Auth |
|---|---|---|---|
| WS | `/notifications/ws` | Real-time WebSocket connection | Yes |
| GET | `/notifications/` | Get all notifications | Yes |
| GET | `/notifications/unread-count` | Get unread notification count | Yes |
| POST | `/notifications/{id}/read` | Mark notification as read | Yes |
| POST | `/notifications/read-all` | Mark all notifications as read | Yes |

### Analytics — `/api/analytics`

| Method | Path | Auth |
|---|---|---|
| GET | `/analytics/dashboard` | Staff |
| GET | `/analytics/application-trends` | Staff |
| GET | `/analytics/revenue` | Admin |
| GET | `/analytics/regional` | Staff |
| GET | `/analytics/processing-times` | Staff |
| GET | `/analytics/super-admin/overview` | Super Admin |
| GET | `/analytics/super-admin/monthly` | Super Admin |

---

## Authentication

The system uses a **dual-token JWT scheme**:

- **Access token** — short-lived (30 min), sent as `Authorization: Bearer <token>`
- **Refresh token** — long-lived (7 days), stored in the database. Rotated on every use: the old token is immediately invalidated and a new pair is issued.

### Login lockout

After **5 consecutive failed password attempts**, the account is locked for **15 minutes**. State is persisted in the database (`login_attempts`, `locked_until`) and survives server restarts.

### Rate limiting

Auth endpoints are rate-limited to **20 requests per minute per IP**. Exceeding the limit returns HTTP 429.

---

## Security Architecture

### PII Encryption at Rest

Ghana Card numbers are stored **encrypted** in the database using Fernet (AES-128-CBC + HMAC-SHA256) with a key derived from `SECRET_KEY`. A separate `ghana_card_hash` column stores an HMAC-SHA256 lookup hash that is:

- Used for all uniqueness checks and database lookups
- Used by the MetaMap webhook to cross-check the extracted card number
- Impossible to reverse without `SECRET_KEY`

### Security Response Headers

Applied to every API response: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control: no-store`, and `Strict-Transport-Security` (production only).

### Webhook Verification

- MetaMap webhooks verified with HMAC-SHA256 (`x-signature` header)
- Paystack webhooks verified with SHA-512 HMAC (`x-paystack-signature` header)

### API Docs

`/docs`, `/redoc`, `/openapi.json` are **disabled in production** (`ENVIRONMENT=production`).

---

## Database Models

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Accounts, KYC state, login lockout, encrypted Ghana Card |
| `RefreshToken` | `refresh_tokens` | JWT refresh tokens with revocation |
| `StaffProfile` | `staff_profiles` | Staff permission flags |
| `Application` | `applications` | Birth and death registration applications |
| `ApplicationStatusHistory` | `application_status_history` | Audit trail of status transitions |
| `Certificate` | `certificates` | PDF certificates with QR code |
| `Document` | `documents` | Uploaded supporting documents |
| `Payment` | `payments` | Paystack payment records |
| `Delivery` | `deliveries` | Certificate delivery orders |
| `DeliveryTrackingEvent` | `delivery_tracking_events` | Delivery status history |
| `Penalty` | `penalties` | Late registration penalties |
| `Notification` | `notifications` | Email/SMS/in-app notification records |
| `AuditLog` | `audit_logs` | Full system audit log |
| `ContactSubmission` | `contact_submissions` | Contact form and feedback |
| `GhanaCardRecord` | `nia_ghana_cards` | NIA Ghana Card mock verification data |

### Automatic Schema Migration

On every startup, `_run_schema_migrations()` runs automatically:

1. Adds `ghana_card_hash`, `login_attempts`, `locked_until` columns if missing
2. Widens `ghana_card_number` to `VARCHAR(500)` for Fernet ciphertext
3. Creates a unique partial index on `ghana_card_hash`
4. Encrypts any existing plaintext Ghana Card numbers

---

## KYC & Identity Verification

**Layer 1 — NIA database check**
The Ghana Card number entered at registration is validated against the NIA (National Identification Authority) database. Card number, full name, and date of birth must all match.

**Layer 2 — MetaMap biometric verification**
After account creation, citizens complete MetaMap which:
- Reads and authenticates the physical Ghana Card (OCR + document AI)
- Performs a liveness check (face vs. card photo)
- Sends a webhook to `POST /api/kyc/webhook`

The webhook cross-checks the card number MetaMap extracted from the physical card against the stored HMAC hash, and the name MetaMap read against the registered name. A mismatch on either sets `kyc_status = REJECTED`.

---

## Payment Integration

1. Frontend calls `POST /api/payments/initiate` → receives Paystack authorization URL
2. User pays on Paystack's hosted page
3. Paystack calls `POST /api/payments/webhook/paystack`
4. Backend verifies webhook HMAC and updates payment and application status

**Fee schedule (GHS)**

| Service | Fee |
|---|---|
| Normal processing (30 days) | 50.00 |
| Express processing (7 days) | 150.00 |
| Home delivery | 30.00+ |
| Late registration penalty | 5.00/day |

---

## Email & SMS Notifications

- **Email**: SendGrid (primary), Gmail SMTP (fallback)
- **SMS**: Twilio

Triggered by: account creation, email verification, password reset, KYC document request, application status changes, payment confirmation, certificate ready, delivery updates, and late collection reminders.

---

## File Storage

All files (KYC documents, photos, certificates) are stored on **Cloudinary**.
Max size: 10 MB. Accepted formats: JPEG, PNG, PDF.

---

## Analytics & Reporting

- Application volume trends (day/week/month)
- Revenue by payment type
- Regional distribution
- Average processing time by service plan
- Staff performance metrics
- Penalty statistics

Downloadable PDF reports available at `/api/reports/`.

---

## Deployment

### Running in Production

```bash
ENVIRONMENT=production

pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Production Checklist

- `SECRET_KEY` must be cryptographically random (≥64 chars)
- `ENVIRONMENT=production` disables interactive API docs at `/docs`
- Database URL points to production PostgreSQL (Neon cloud recommended)
- All external API keys (SendGrid, Paystack, MetaMap, Cloudinary, Gemini) configured
- Redis accessible if using Celery for background tasks
- CORS_ORIGINS restricted to production domain

### Environment-specific behavior

| Setting | Development | Production |
|---|---|---|
| API docs (`/docs`) | Enabled | Disabled |
| Debug output | Verbose errors | Generic errors |
| Password hashing | Single round | Multiple rounds |
| SMTP fallback | Enabled | Not recommended |

---

## Testing

Tests are located in `tests/` and cover:

- Unit tests: authentication, user validation, data models
- Integration tests: API endpoints, webhook handling
- Fixtures: test users, applications, payments

Run tests:

```bash
pytest tests/ -v
pytest tests/unit/ -v
pytest tests/integration/ -v
```

Coverage:

```bash
coverage run -m pytest tests/
coverage report
coverage html
```

---

## Troubleshooting

### Database connection failed

- Verify `DATABASE_URL` format: `postgresql://user:password@host:5432/dbname`
- Check PostgreSQL server is running
- If using Neon cloud, ensure IP is whitelisted in project settings
- Fallback: `DATABASE_URL_FALLBACK` will be used if primary fails

### Email not sending

- Verify `SENDGRID_API_KEY` is set and valid
- Check `SENDGRID_FROM_EMAIL` matches a verified sender in SendGrid console
- If SendGrid fails, SMTP fallback will be attempted
- Check logs for SMTP credentials errors

### MetaMap webhook not processing

- Verify `METAMAP_WEBHOOK_SECRET` in `.env` matches MetaMap dashboard
- Check webhook URL is publicly accessible (not localhost)
- Verify webhook signature verification in `kyc.py` passes

### Payment webhook failing

- Verify `PAYSTACK_SECRET_KEY` in environment and Paystack dashboard match
- Check webhook signature verification in `payments.py`
- Ensure webhook URL is publicly accessible

### KYC status not updating

- Check MetaMap dashboard for failed verifications
- Verify user didn't cancel MetaMap flow
- Ensure `POST /api/kyc/webhook` endpoint is receiving requests

### Certificate generation failing

- Ensure ReportLab is installed: `pip install reportlab`
- Check Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, key, secret)
- Verify application has required documents before generation

###  WebSocket notifications not real-time

- Check Redis connection (`REDIS_URL`)
- Verify client maintains `/notifications/ws` connection
- Check browser console for WebSocket errors

---

## Key Implementation Details

### Birth vs. Death applications

Both use the same `Application` model with a `type` field (BIRTH or DEATH). Differences:

- Birth: requires birth certificate parents' names, hospital info
- Death: requires death certificate place of death, cause of death
- Death applications can be submitted by authorized person (family/official)

### Application workflow

```
DRAFT → SUBMITTED → PENDING_REVIEW → APPROVED → CERTIFICATE_READY → COLLECTED
                         ↓
                    REJECTED
                         ↓
                    RESUBMIT_REQUIRED
```

Optional paths:
- From any stage except COLLECTED: user can CANCEL
- From PENDING_REVIEW: staff can REQUEST_CLARIFICATION

### Certificate QR code

QR code encodes: `cert_number|issued_date|hash(cert_data)`.
Public verification at `GET /api/certificates/verify/{cert_no}` performs:
1. Lookup certificate in database
2. Regenerate hash from stored record
3. Compare against QR code hash
4. Return certificate status and issuer

### Audit logging

Every state-changing request is logged in `audit_logs` with:
- Timestamp, user ID, endpoint, method, request body
- IP address, user agent
- Response status code
- Captured before response is sent

Staff/admins can view logs at `GET /api/audit/logs`.

### Accessibility

- All endpoints tested with WCAG 2.1 AA standards in mind
- Font styles, text contrast, keyboard navigation checklist provided for frontend
- Backend enforces accessible JSON error responses
- User accessibility preferences stored in `User.accessibility_prefs` (JSON)

---

## Architecture Highlights

### Layered Architecture

```
┌─────────────────────────────────────────────────────┐
│  API Layer (app/api/*.py)                           │
│  - Route handlers                                   │
│  - Request/response validation (Pydantic)           │
│  - FastAPI dependency injection                     │
└────────────┬────────────────────────────────────────┘
             │
┌────────────┴────────────────────────────────────────┐
│  Service Layer (app/services/*.py)                  │
│  - Business logic                                   │
│  - Cross-cutting concerns (payments, emails, auth)  │
└────────────┬────────────────────────────────────────┘
             │
┌────────────┴────────────────────────────────────────┐
│  ORM / Model Layer (app/models/*.py)                │
│  - SQLAlchemy models                                │
│  - Database schema                                  │
└────────────┬────────────────────────────────────────┘
             │
┌────────────┴────────────────────────────────────────┐
│  Data Layer (PostgreSQL / Neon)                     │
└─────────────────────────────────────────────────────┘
```

### Core Design Patterns

**Dependency Injection**: FastAPI's `Depends()` used for:
- Authentication guard (`get_current_user`)
- Role checking (`require_staff`, `require_admin`)
- Database session (`get_db`)

**Separation of Concerns**: 
- Models describe only data structure
- Services contain business logic
- API routes handle HTTP only
- Utils contain external integrations

**Configuration Management**: 
- Pydantic `Settings` class reads from `.env`
- Environment-specific overrides in `core/config.py`
- No hardcoded secrets

---

## Core Features Implemented

### 1. User Authentication & Authorization

- Email + password registration with email verification
- JWT-based login with access + refresh tokens
- Role-based access control (citizen, staff, super-admin)
- Password hashing (SHA256_CRYPT + PBKDF2)
- "Forgot password" flow with time-limited token
- Login attempt tracking with auto-lockout
- Account deletion with data purge

### 2. Birth & Death Registration

- Multi-step application workflow (draft → submit → review → approved → collected)
- Birth registration: child details, parents' details, hospital info, mother's KYC
- Death registration: deceased details, informant, physician details
- Attachment of supporting documents (birth cert, hospital discharge, etc.)
- Status tracking with full history
- Real-time notifications on status changes

### 3. Biometric Identity Verification

**NIA Ghana Card Validation**
- Card number format validation
- Cross-check against NIA database
- Date of birth and name matching
- Mock NIA database seeded with demo records

**MetaMap KYC**
- Document authentication (card authenticity)
- Liveness check (user vs. card photo)
- Webhook-based result handling
- Automatic status updates and notifications

### 4. Payment Processing

- Paystack integration for secure payment collection
- Multiple payment types: application fees, express processing, delivery, penalties  
- Webhook verification with HMAC-SHA512
- Payment status tracking (pending, completed, failed, refunded)
- Refund request functionality
- Fee structure management

### 5. Certificate Management

- PDF generation with tamper-evident design
- QR code embedding for quick verification
- Certificate numbering with automatic increments
- Certificate revocation capability
- Public verification endpoint (no auth required)
- Download and print tracking
- Delivery coordination

### 6. Delivery Management

- Delivery order creation and assignment
- Real-time delivery tracking with status updates
- Tracking number generation
- Delivery event history
- Route and agent assignment

### 7. Real-time Notifications

- In-app notifications with WebSocket
- Email notifications (SendGrid + SMTP fallback)
- SMS notifications (Twilio)
- Notification history and read/unread state
- Bulk notification sent to staff/admins

### 8. Staff Task Management

- Application assignment by admin: `POST /applications/{id}/assign` with staff dropdown, note, and real-time notification
- Staff self-assignment (claim): `POST /applications/{id}/claim` — atomic lock prevents double-assignment (409 if already claimed)
- Assignment indicators: `assigned_to_id`, `assigned_at`, `assignment_note` on the Application model
- Per-application chat: `GET/POST /applications/{id}/chat` for admin–staff communication, message history stored in `application_chats` table
- Staff productivity: `GET /users/staff/productivity` — per-staff stats (total assigned, in-progress, completed, completion rate %)
- Staff list for dropdowns: `GET /users/staff/list`

### 9. Administrative Tools

- **Staff Dashboard**: application queue with assignment badges, claim/lock workflow, status updates, certificate issuance, AI review, AI response drafting
- **Super-Admin Dashboard**: analytics, user management, KYC review, audit logs, staff assignment, chat, productivity tracking
- Staff account creation with role (staff/admin)
- Bulk notification broadcasting
- Document requirement management

### 10. Analytics & Reporting

- Application volume trends with server-side 60-second response caching
- Revenue tracking by payment type
- Regional statistics
- Processing time metrics
- Staff performance metrics (completion rates, workload distribution)
- Downloadable PDF/CSV reports

### 11. AI Automation (Dual-provider: Anthropic + Gemini)

All AI endpoints are under `/ai/` and use Anthropic Claude (claude-haiku-4-5) with automatic fallback to Google Gemini.

| Endpoint | Role | Description |
|---|---|---|
| `POST /ai/form-fill` | Any | Extract birth/death form fields from natural language |
| `POST /ai/form-fill-from-observation` | Any | Extract from uploaded image/document |
| `POST /ai/status-summary` | Any | Plain-language explanation of application status |
| `POST /ai/document-screen` | Any | Pre-screen uploaded Ghana Card for quality |
| `POST /ai/review-application/{id}` | Staff | Full application review: flags, strengths, recommendation, confidence % |
| `POST /ai/draft-response/{id}` | Staff | Draft professional response letter (Approve/Reject/Request Info) |
| `POST /ai/fraud-check/{id}` | Staff | Fraud risk analysis: duplicate Ghana Cards, impossible dates, missing fields |
| `POST /ai/workload-suggestion` | Admin | Suggest optimal staff assignment based on workload + application complexity |
| `POST /ai/daily-briefing` | Admin | AI-generated daily operations briefing with highlights, alerts, recommendations |

### 12. Certificate QR Verification

- `POST /certificates/generate/{application_id}` — generates PDF certificate with embedded QR code (staff only)
- `GET /certificates/verify/{cert_number}` — public endpoint, no auth required
- QR encodes `https://your-domain/certificates/verify/{cert_number}`
- Tamper-evident hash: `SHA256(cert_number|issued_date|SECRET_KEY)`
- `POST /certificates/{id}/mark-printed` — marks as printed
- Download: `GET /certificates/{cert_number}/download`

### 13. Accessibility & Internationalization

- Accessibility preference storage
- Prepared for multi-language support through frontend
- Readable error messages
- Structured JSON responses

### 14. Security & Audit

- PII encryption at rest (Fernet)
- Rate limiting on auth endpoints
- CORS protection
- Security headers on all responses
- Complete audit logging
- HMAC webhook verification
- Password reset token expiration
- Email verification flow

---

## Contact & Support

For issues, feature requests, or questions, refer to the project documentation or contact the team.

**Built for the Ghana Births and Deaths Registry — March 2026**
- HTTPS enforced at the reverse proxy (nginx / Caddy)
- `CORS_ORIGINS` set to your production frontend domain only
- All webhook secrets configured and verified
- Database backups enabled on Neon dashboard
