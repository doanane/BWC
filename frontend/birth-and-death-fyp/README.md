# Ghana Births and Deaths Registry Frontend

Frontend web application for the Ghana Births and Deaths Registry portal.

This app supports citizen registration workflows, staff/admin operations, accessibility tools, multilingual UI, and AI-assisted automation for staff and administrators.

## 1) What This Frontend Provides

- Citizen onboarding and authentication
- Birth registration workflow
- Death registration workflow
- Application tracking and status timelines
- Notifications and realtime updates
- Profile and account management
- Service pages (extracts, verification, statistics, adoptions)
- Public certificate QR verification (`/certificates/verify/:certNo`)
- **Staff Dashboard**: application queue, claim/lock workflow, assignment badges, 3-tab drawer (Details/Chat/AI Assist), certificate issuance, AI review, AI fraud check, AI response letter drafting
- **Super-Admin Dashboard**: analytics, user management, KYC review, audit logs, application assignment with staff dropdown, admin-staff chat, staff productivity tracking, AI workload suggestions, AI daily briefing, AI fraud check
- Accessibility controls (vision, reading, navigation, screen reader helpers)
- Language switching for supported Ghanaian/local language options
- AI assistance for form fill and status explanations

## 2) Key UX Safeguards

- Global fallback navigation controls are present on non-auth pages:
  - Back action
  - Home/Dashboard action
- This prevents users getting stuck when a device/browser back gesture is unavailable.

## 3) AI Features

AI functionality is powered by **Anthropic Claude + Google Gemini** through backend endpoints (`/ai/*`).

### Citizen-facing AI
- Chat assistant widget (BDR Assistant) — Gemini-powered contextual guidance
- Birth form "Fill with AI" — extract form fields from natural language description
- Death form "Fill with AI" — same for death registration
- Death form upload-assisted extraction for one-week observation notes (`.txt`, `.md`, `.json`)
- Plain-language status summaries in application tracking

### Staff AI Assist (in application drawer — AI Assist tab)
- **AI Application Review** — Claude analyses application data, returns recommendation (Approve/Reject/Request Info), confidence score, flags, and strengths
- **AI Fraud Check** — detects duplicate Ghana Cards across applications, impossible dates, missing critical fields; returns risk level (LOW/MEDIUM/HIGH) with specific indicators
- **AI Draft Response Letter** — Claude drafts a formal, professional BDR response letter based on the decision selected

### Admin AI Tools (Super-Admin Dashboard)
- **AI Workload Optimiser** — suggests optimal staff assignment based on current workload, completion rates, and application complexity (express vs normal)
- **AI Daily Briefing** — generates a daily operations summary with highlights, alerts, and recommendations for the Registrar
- **AI Fraud Check** — accessible from the application drawer for any application

### AI behavior summary
- Backend uses Anthropic Claude as primary provider with automatic fallback to Google Gemini.
- Frontend displays "Powered by Claude AI" labelling on all AI surfaces.
- If AI service is unavailable (503), the panel shows a clear error and the user can still complete tasks manually.

## 4) Legal Reference (Act 1027)

This frontend references and maps services to:

- **Registration of Births and Deaths Act, 2020 (Act 1027)**
- Official reference URL:
  - https://ghalii.org/akn/gh/act/2020/1027/eng@2020-10-06

Legal guidance is exposed in portal documentation and linked service flows.

## 5) Tech Stack

- React 19
- Vite
- React Router
- Plain CSS (component/page-level styles)
- `lucide-react` icons
- `recharts` for charts/visualizations
- Browser `fetch` via `src/api/client.js` (with token refresh and cache handling)

## 6) Project Structure

```text
src/
  api/
    client.js                # API wrapper and endpoint clients
  components/
    Header.jsx
    Footer.jsx
    ChatbotWidget.jsx
    AccessibilityWidget.jsx
    ProtectedRoute.jsx
    RealtimeNotifications.jsx
    ...
  context/
    AuthContext.jsx
    LanguageContext.jsx
    ThemeContext.jsx
    SnackbarContext.jsx
  pages/
    BirthRegistration.jsx
    DeathRegistration.jsx
    TrackApplication.jsx
    Dashboard.jsx
    StaffDashboard.jsx
    SuperAdminDashboard.jsx
    Documentation.jsx
    ...
  App.jsx                    # Routing + providers + layout
  App.css
  index.css
```

## 7) Route Overview

Main routes are configured in `src/App.jsx`.

Common routes:

- `/` landing/root routing
- `/home`
- `/signin`, `/register`, `/forgot-password`, `/reset-password`
- `/dashboard`, `/profile`, `/track`, `/payment`
- `/register/birth`, `/register/death`
- `/services/extracts`, `/services/adoptions`, `/services/verification`, `/services/statistics`
- `/docs`, `/legal/privacy`, `/legal/terms`, `/legal/accessibility`
- `/admin`, `/staff`

## 8) Environment Variables

Create `.env` in this frontend directory (`frontend/birth-and-death-fyp/.env`).

```dotenv
VITE_API_URL=http://localhost:8000/api
VITE_FACE_API_ENABLED=false
VITE_NIA_API_URL=
VITE_NIA_API_KEY=
VITE_METAMAP_CLIENT_ID=
VITE_METAMAP_FLOW_ID=
VITE_PAYSTACK_PUBLIC_KEY=
```

Notes:

- `VITE_API_URL` can be absolute or relative.
- API base is normalized in `src/api/client.js`.
- If hosted publicly with tunneled/local backend mismatch, client auto-adjusts to proxy path when needed.

## 9) Local Development

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## 10) Quality Commands

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## 11) Important Integration Notes

- Backend must expose `/api/*` endpoints expected by `src/api/client.js`.
- JWT access/refresh tokens are managed in local storage by auth context.
- API wrapper handles refresh on 401 for non-auth routes.
- Realtime notifications rely on backend websocket endpoint.

## 12) Death Observation Upload in AI Section

Implemented in death registration page:

- Users may upload one-week observation notes file in AI panel.
- Supported formats: `.txt`, `.md`, `.json`.
- Backend extracts relevant death fields and returns candidate form values.
- User still must review and correct before final submission.

## 13) Act-Aligned Record Search Service

Verification flow now supports backend record search aligned to Act 1027 section 39 constraints:

- Search returns whether record is registered.
- If found, search returns registration number.
- Search does not disclose additional protected record details.

## 14) Certificate QR Verification

- Route: `/certificates/verify` or `/certificates/verify/:certNo`
- Public page — no authentication required
- When a staff member generates a certificate, a QR code is embedded in the PDF
- The QR encodes `https://your-domain/certificates/verify/{certificate_number}`
- Anyone who scans the QR is taken to this page which shows: certificate status, subject name, issuance date, certificate number, and a tamper-detection hash check
- A certificate flagged as revoked shows a prominent red "INVALID" banner

## 15) Staff Assignment & Collaboration

- Staff Dashboard shows all active applications (SUBMITTED, UNDER_REVIEW, etc.)
- Applications show assignment badges: green "You" (yours), amber "[Staff Name]" (claimed by other), or "Claim" button (unassigned)
- Clicking "Claim" locks the application to you (409 if another staff already claimed it)
- The 3-tab drawer in StaffDashboard:
  - **Details** — full application data, status update form, history timeline
  - **Chat** — real-time text chat with the admin for this specific application
  - **AI Assist** — AI Review panel and AI Draft Response panel

## 16) Troubleshooting

- If auth routes fail with 404, ensure backend is started with the correct app entrypoint and `/api` prefix routing.
- **Backend must be started using the venv uvicorn**, not system Python: `c:\Users\hp\Downloads\fyp\.venv\Scripts\uvicorn.exe main:app --reload` from `backend/` directory.
- If AI features fail, verify backend provider keys (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) are configured in `.env`.
- If staff queue is empty, check that the backend is running on the correct venv Python.
- If UI appears stale after profile updates, clear app cache/storage and refresh session.
- If websocket notifications do not update, verify backend ws endpoint and token validity.
- If assignment returns 500, ensure the Alembic migration was run: `alembic upgrade head` from the backend directory.

## 15) Security and Compliance Reminder

Do not commit real secrets or production keys in frontend env files.
Use environment-specific secret management for deployment.
