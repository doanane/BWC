# Ghana Births & Deaths Registry — Frontend Portal

A modern, accessible, responsive React portal for Ghana's vital registration service. The system provides tailored interfaces for citizens, staff, and administrators.

---

## Table of Contents

- [Overview](#overview)
- [Project Context](#project-context)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features by Role](#features-by-role)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Style & UI Standards](#style--ui-standards)
- [Authentication & Authorization](#authentication--authorization)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Routing](#routing)
- [Real-time Features](#real-time-features)
- [Accessibility](#accessibility)
- [Internationalization](#internationalization)
- [Building & Deployment](#building--deployment)
- [Troubleshooting](#troubleshooting)
- [Key Implementation Details](#key-implementation-details)

---

## Overview

This is a **citizen-first, government-grade frontend** for the Ghana Births and Deaths Registry digital platform. It serves:

- **Citizens**: Register births/deaths, track applications, manage payments, download certificates
- **Staff**: Review applications, generate certificates, manage deliveries, view dashboards
- **Super-Admins**: System-wide analytics, user administration, audit logs, KYC review

The application is built with **React 19**, styled with **plain CSS** (no CSS-in-JS), and includes comprehensive accessibility features, offline resilience, and support for 9 Ghanaian languages.

---

## Project Context

The Ghana Births and Deaths Registry (BDR) has historically operated through a paper-based system. This digital transformation project provides:

- **Online vital registration** accessible 24/7 from any location
- **Real-time application tracking** without needing to visit an office
- **Secure payment integration** for application fees and penalties
- **Tamper-evident digital certificates** with instant QR code verification
- **Inclusive design** supporting multiple languages and accessibility preferences

This frontend is the public-facing layer of a **production-grade system** with real integrations to Paystack (payments), MetaMap (biometric KYC), SendGrid (email), Twilio (SMS), and Cloudinary (file storage).

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 |
| **Build Tool** | Vite 7 |
| **Routing** | React Router 7 |
| **HTTP Client** | Fetch API + custom caching layer |
| **Styling** | Plain CSS (no framework) |
| **Charts/Graphics** | Recharts |
| **Icons** | Lucide React |
| **State Management** | React Context + custom hooks |
| **UI Patterns** | Custom components (Header, Footer, Alerts, Modals) |
| **Notifications** | Toast notifications via Snackbar context |
| **WebSocket** | Real-time notification listener |
| **Payment Gateway** | Paystack integration |
| **Identity Verification** | MetaMap integration |
| **File Storage** | Cloudinary |

---

## Project Structure

```
frontend/
├── README.md                          # This guide
└── birth-and-death-fyp/               # Main application package
    ├── package.json                   # Dependencies and scripts
    ├── vite.config.js                 # Vite configuration
    ├── index.html                     # Entry HTML
    ├── .env.example                   # Environment variables template
    ├── public/                        # Static assets
    │   └── ...
    ├── src/
    │   ├── main.jsx                   # React entry point
    │   ├── App.jsx                    # Main router and layout
    │   ├── api/
    │   │   ├── client.js              # API client with caching and auth
    │   │   └── endpoints.js           # API endpoint definitions
    │   ├── context/
    │   │   ├── AuthContext.jsx        # User auth state
    │   │   ├── LanguageContext.jsx    # i18n/localization
    │   │   ├── ThemeContext.jsx       # Theme (light/dark/system)
    │   │   └── SnackbarContext.jsx    # Toast notification state
    │   ├── components/
    │   │   ├── Header.jsx             # Navigation header with user menu
    │   │   ├── Footer.jsx             # Footer with legal links
    │   │   ├── ProtectedRoute.jsx     # Role-based route guard
    │   │   ├── Snackbar.jsx           # Toast notification container
    │   │   ├── LanguageSwitcher.jsx   # Language selector
    │   │   ├── ThemeSwitcher.jsx      # Theme switcher
    │   │   ├── AccessibilityWidget.jsx # Accessibility controls
    │   │   ├── SkeletonLoader.jsx     # Loading placeholder
    │   │   ├── ChatBot.jsx            # AI chatbot widget
    │   │   ├── Modal.jsx              # Reusable modal
    │   │   └── ...
    │   ├── pages/
    │   │   ├── public/
    │   │   │   ├── HomePage.jsx       # Landing page
    │   │   │   ├── AboutPage.jsx      # About the registry
    │   │   │   ├── OfficesPage.jsx    # Regional offices info
    │   │   │   ├── FAQPage.jsx        # FAQ
    │   │   │   ├── ContactPage.jsx    # Contact form
    │   │   │   ├── LegalPages.jsx     # Privacy, Terms, Accessibility
    │   │   │   └── MediaPages.jsx     # News, downloads, gallery
    │   │   ├── auth/
    │   │   │   ├── SignInPage.jsx     # Login form
    │   │   │   ├── RegisterPage.jsx   # Registration form
    │   │   │   ├── ForgotPasswordPage.jsx
    │   │   │   └── ResetPasswordPage.jsx
    │   │   ├── citizen/
    │   │   │   ├── DashboardPage.jsx  # Application list
    │   │   │   ├── ProfilePage.jsx    # Profile management
    │   │   │   ├── TrackPage.jsx      # Public application tracker
    │   │   │   ├── PaymentPage.jsx    # Payment handling
    │   │   │   ├── RegistrationPages.jsx
    │   │   │   │   ├── BirthRegistration.jsx
    │   │   │   │   ├── DeathRegistration.jsx
    │   │   │   │   └── ServicePages.jsx (extracts, adoptions, etc.)
    │   │   ├── staff/
    │   │   │   └── StaffDashboard.jsx
    │   │   │       ├── ApplicationQueue.jsx
    │   │   │       ├── CertificateIssuance.jsx
    │   │   │       ├── DeliveryManagement.jsx
    │   │   │       └── NotificationCenter.jsx
    │   │   └── admin/
    │   │       └── AdminDashboard.jsx
    │   │           ├── OverviewSection.jsx
    │   │           ├── AnalyticsSection.jsx
    │   │           ├── UserManagement.jsx
    │   │           ├── KYCReview.jsx
    │   │           ├── AuditLogViewer.jsx
    │   │           └── SystemSettings.jsx
    │   ├── assets/
    │   │   ├── styles/
    │   │   │   ├── globals.css        # Global styles
    │   │   │   ├── variables.css      # CSS variables (colors, spacing)
    │   │   │   ├── accessibility.css  # A11y support
    │   │   │   ├── responsive.css     # Mobile/tablet/desktop breakpoints
    │   │   │   └── ...
    │   │   ├── images/
    │   │   ├── fonts/
    │   │   └── icons/
    │   └── utils/
    │       ├── dateFormatter.js
    │       ├── validation.js
    │       ├── errorHandler.js
    │       ├── paymentHelper.js
    │       └── maskingUtils.js
    └── dist/                          # Production build output
```

---

## Features by Role

### Citizen Features

#### Registration & KYC

- Create account with email verification
- First-time biometric KYC via MetaMap (document + liveness check)
- Ghana Card validation against NIA database
- Upload supporting documents (photos, certificates)
- View KYC status and request re-submission flows

#### Vital Registration

- **Birth Registration**: Child name, date of birth, parents' details, hospital information
- **Death Registration**: Deceased name, date of death, place of death, cause, physician details
- Attach required documents (birth certificate, hospital discharge, etc.)
- Save as draft and return to edit
- Submit for review

#### Application Management

- View all personal applications (birth and death)
- Track application status in real-time
- View full status history
- Cancel applications (if not yet approved)
- Receive notifications on status updates
- Download certificate when ready
- Confirm certificate collection

#### Payments

- Initiate payment for application fees
- Choose service level (normal 30-day or express 7-day processing)
- Optional express delivery to home address
- Redirect to Paystack secure payment gateway
- Payment verification and confirmation
- View payment history
- Request refunds (if applicable)

#### Profile Management

- Upload profile photo
- Update personal information (address, phone)
- Change password
- Set accessibility preferences (font size, contrast, etc.)
- View notification history
- Delete account permanently

#### Additional Services

- Verify certificate authenticity (public, no login required)
- Request certified extracts
- Adoption record services
- Statistics and vital records requests
- Contact registrar for specific inquiries

### Staff Features

#### Application Review Queue

- Queued list of submitted applications
- Filter: pending, approved, rejected, needs clarification
- View full application details including attached documents
- Request additional documents from citizen
- Approve application with notes
- Reject with reason
- Assign to self or colleague

#### Certificate Management

- Generate PDF certificate from approved application
- Preview certificate before issuance
- View generated certificates
- Mark certificates as printed
- Track certificate print status

#### Delivery Management

- Create delivery orders for issued certificates
- Assign to delivery agents
- Track delivery status in real-time
- View agent delivery routes
- Receive delivery updates

#### Notification Center

- Receive real-time notifications on application activity
- Send messages to citizens (resubmit docs, etc.)
- Broadcast announcements to all users
- Notification history

#### Dashboards

- Application statistics (volume, trends, aging)
- Revenue reports
- Regional performance metrics
- Processing times by service type
- Staff productivity metrics

### Super-Admin Features

#### System Dashboard

- System health overview
- Total users, applications, revenue
- Key performance indicators
- Monthly trends

#### User Management

- View all users (citizens, staff, admins)
- Search and filter users
- Edit user details
- Deactivate/reactivate accounts
- View user activity history
- Bulk operations

#### KYC Administration

- View all KYC submissions
- Approve/reject KYC documents
- Request resubmission
- View KYC status by region

#### Audit & Logs

- Full system audit log
- Filter by user, action, timestamp
- Export audit reports
- Security event tracking

#### System Settings

- Fee schedule management
- Processing time settings
- Email templates
- SMS templates
- Notification preference configuration

#### Analytics & Reports

- Revenue by region and payment type
- Application trends (daily/weekly/monthly)
- Average processing times
- Staff performance metrics
- User demographics
- Downloadable PDF/CSV reports

---

## Architecture

### Component Hierarchy

```
App
├── Providers (Auth, Language, Theme, Snackbar)
├── Header (Navigation, User Menu)
├── Router
│   ├── HomePage
│   ├── PublicRoutes
│   │   ├── AboutPage
│   │   ├── FAQPage
│   │   ├── ContactPage
│   │   └── LegalPages
│   ├── AuthRoutes
│   │   ├── SignInPage
│   │   ├── RegisterPage
│   │   └── PasswordResetPages
│   ├── ProtectedRoutes
│   │   ├── CitizenOnlyRoute
│   │   │   ├── DashboardPage
│   │   │   ├── ProfilePage
│   │   │   ├── RegistrationPages
│   │   │   └── PaymentPage
│   │   ├── StaffRoute
│   │   │   └── StaffDashboard
│   │   └── AdminRoute
│   │       └── AdminDashboard
│   └── NotFoundPage
├── Footer
├── Snackbar
├── ChatBot
└── AccessibilityWidget
```

### State Management with Context

**AuthContext**
- User profile and role
- Authentication tokens (managed in memory)
- Login/logout actions
- Auto-rehydration from backend on startup

**LanguageContext**
- Active language
- Translation strings for 9 Ghanaian languages
- Language selector control

**ThemeContext**
- Active theme (light/dark/system)
- CSS class toggling on `<html>`
- Persistence in localStorage

**SnackbarContext**
- Toast notification queue
- Toast actions (show, dismiss)
- Auto-dismiss after timeout

---

## API Integration

### Client Setup (`src/api/client.js`)

```javascript
const api = {
  baseURL: VITE_API_URL,
  
  // Auto-attach auth token to headers
  // Auto-refresh token on 401 (Unauthorized)
  // Lightweight GET response cache with invalidation
  
  endpoints: {
    auth: { ... },
    apps: { ... },
    users: { ... },
    kyc: { ... },
    payments: { ... },
    certificates: { ... },
    deliveries: { ... },
    notifications: { ... },
    admin: { ... },
    chatbot: { ... },
    analytics: { ... }
  }
}
```

### Key Features

**Auth Token Handling**
- Access token stored in memory (not localStorage for security)
- Refresh token used silently to get new access token
- 401 response triggers token refresh + automatic retry

**GET Response Caching**
- Simple in-memory cache for GET requests
- Cache key: `${method}:${url}`
- Cache valid for 5 minutes
- Cache invalidated on any POST/PUT/DELETE
- Manual cache clear option available

**Error Handling**
- Centralized error interceptor
- Friendly error messages for UI
- Specific handling for 401 (auth), 403 (forbidden), 404 (not found), 500 (server)

---

## Routing

### Route Guard: `ProtectedRoute`

```jsx
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/profile" element={<ProfilePage />} />
</Route>
```

Checks:
- User is authenticated
- User role matches required role(s)
- Redirects to `/signin` if not authenticated
- Redirects to `/` if role mismatch

### Main Route Groups

**Public Routes** (no auth required)
- `/` — Home
- `/about`, `/offices`, `/faq`, `/contact`
- `/media/news`, `/media/downloads`, `/media/gallery`
- `/legal/privacy`, `/legal/terms`, `/legal/accessibility`
- `/applications/track/:ref` — Public application tracker (by reference number)
- `/certificates/verify/:cert_no` — Public certificate verification

**Auth Routes** (logged-out users only)
- `/signin` — Login form
- `/register` — Registration form
- `/forgot-password` — Password reset request
- `/reset-password/:token` — Password reset form

**Citizen Routes** (authenticated, `CITIZEN` role)
- `/dashboard` — Application list and management
- `/profile` — Profile and preferences
- `/track` — Personal application tracker
- `/payment` — Payment initiation
- `/register/birth` — New birth registration
- `/register/death` — New death registration
- `/services/extracts` — Request vital extract
- `/services/adoptions` — Adoption services
- `/services/verification` — Certificate verification request

**Staff Routes** (authenticated, `STAFF` role)
- `/staff` — Staff dashboard with tabs:
  - Application queue
  - Certificate issuance
  - Delivery management
  - Notification center

**Admin Routes** (authenticated, `ADMIN` or `SUPER_ADMIN` role)
- `/admin` — Admin dashboard with sections:
  - Overview
  - Analytics
  - User management
  - KYC review
  - Audit logs
  - System settings

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Backend API running at `http://localhost:8000` (or configured `VITE_API_URL`)

### Installation

From `frontend/birth-and-death-fyp/`:

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173` with hot module reloading.

API docs available at `http://localhost:8000/docs` (backend).

### Build

```bash
npm run build
```

Creates optimized production bundle in `dist/`.

### Preview Production Build

```bash
npm run preview
```

Serves `dist/` locally at `http://localhost:4173` to verify production build.

### Lint & Format

```bash
npm run lint          # ESLint check
npm run lint:fix      # Auto-fix lint issues
npm run format        # Prettier format
npm run format:check  # Check formatting
```

---

## Environment Configuration

Create `birth-and-death-fyp/.env` from `.env.example`:

```env
# API Configuration
VITE_API_URL=http://localhost:8000/api
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxx

# Optional integrations
VITE_NIA_API_URL=http://localhost:3001/api/nia
VITE_NIA_API_KEY=xxxx
VITE_FACE_API_ENABLED=false
VITE_GOOGLE_MAPS_KEY=xxxx (optional)

# Features
VITE_ENABLE_CHATBOT=true
VITE_METAMAP_CLIENT_ID=xxxx
VITE_METAMAP_FLOW_ID=xxxx
```

| Variable | Purpose | Required |
|---|---|---|
| `VITE_API_URL` | Backend API base URL (includes `/api`) | Yes |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack payment gateway public key | Yes |
| `VITE_NIA_API_URL` | NIA Ghana Card verification API | Optional |
| `VITE_NIA_API_KEY` | NIA API key | Optional |
| `VITE_FACE_API_ENABLED` | Enable face verification | Optional |
| `VITE_ENABLE_CHATBOT` | Enable AI chatbot widget | Optional |
| `VITE_METAMAP_CLIENT_ID` | MetaMap biometric KYC client ID | Optional |
| `VITE_METAMAP_FLOW_ID` | MetaMap flow configuration | Optional |

---

## Style & UI Standards

### Design System

**Colors** (defined in `assets/styles/variables.css`)
- Primary: Ghana flag colors (gold, green, white, red)
- Semantics: Blue (info), Green (success), Orange (warning), Red (error)
- Neutrals: Dark gray, light gray, white

**Typography**
- Headings: Bold, large (24px–48px)
- Body: Regular, readable (16px)
- Small text: 14px
- Font family: System stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", ...`)

**Spacing & Layout**
- 8px baseline grid
- Margins: 8px, 16px, 24px, 32px  
- Padding: varies by component
- Mobile-first responsive design

**Components**
- Buttons: Primary (colored), secondary (outline), danger (red)
- Cards: Bordered, padded content, subtle shadow
- Form inputs: Full-width, clear labels, error states
- Modals: Overlay, centered, dismissible
- Alerts and toasts: Color-coded (info, success, warning, error)

### Office Hours Format

Office hours are written in **readable sentence form**:
- "Monday to Friday, 8:00 AM to 5:00 PM"
- Not: "Mon-Fri 08:00-17:00"

### Navigation & UX

- Close controls (**X** button) on all openable panels/dropdowns for mobile usability
- Breadcrumbs on form pages for clear navigation
- Confirmation dialogs for destructive actions (delete, cancel application)
- Loading states (skeleton, spinner) while fetching
- Empty states with guidance when data is unavailable
- Keyboard navigation support throughout

---

## Authentication & Authorization

### Login Flow

1. User enters email + password
2. Frontend calls `POST /api/auth/login`
3. Backend returns `access_token` and `refresh_token`
4. Frontend stores tokens in memory + sets auth state
5. Subsequent requests include `Authorization: Bearer <access_token>`

### Token Refresh

When a request returns **401 Unauthorized**:

1. Frontend automatically calls `POST /api/auth/refresh` with refresh token
2. Backend returns new `access_token` and `refresh_token`
3. Rotates tokens (old refresh token invalidated)
4. Original request retried with new token
5. If refresh fails → redirect user to `/signin`

### Role-Based Access

Roles: `CITIZEN`, `STAFF`, `ADMIN`, `SUPER_ADMIN`

Routes are protected by checking:
- User is authenticated
- User's role matches required role(s)

Example:
```jsx
<Route element={<AdminRoute />}>
  <Route path="/admin" element={<AdminDashboard />} />
</Route>
```

### Initialization

On app startup (`App.jsx`):

1. Check if auth token exists in memory
2. If not, try to rehydrate user state from `/auth/me`
3. If successful, restore auth state
4. If fails, redirect to home (user is logged out)

---

## State Management

### AuthContext

```javascript
{
  user: {
    id: "...",
    email: "...",
    name: "...",
    role: "CITIZEN|STAFF|ADMIN|SUPER_ADMIN",
    profile_photo: "...",
    kyc_status: "PENDING|APPROVED|REJECTED",
    accessibility_prefs: { ... }
  },
  isAuthenticated: boolean,
  isLoading: boolean,
  error: string | null,
  login: (email, password) => Promise,
  logout: () => void,
  register: (data) => Promise,
  updateProfile: (data) => Promise, 
  refetchUser: () => Promise
}
```

### LanguageContext

```javascript
{
  currentLanguage: "en|tw|ak|ewe|ha|dz|nzm|ky|ff",
  availableLanguages: [  { code, name } ],
  t: (key) => translatedString,
  setLanguage: (code) => void
}
```

### ThemeContext

```javascript
{
  theme: "light|dark|system",
  effectiveTheme: "light|dark",
  toggleTheme: (newTheme) => void
}
```

### SnackbarContext

```javascript
{
  snackbars: [ { id, message, type, duration } ],
  showSnackbar: (message, type, duration) => void,
  dismissSnackbar: (id) => void
}
```

---

## Real-time Features

### WebSocket Notifications

Maintains persistent WebSocket connection to `ws://localhost:8000/api/notifications/ws`.

**Message types**:
- `APPLICATION_STATUS_CHANGED`: Application approved/rejected/needs docs
- `PAYMENT_CONFIRMED`: Payment successful
- `CERTIFICATE_READY`: Certificate generated and ready for download
- `DELIVERY_UPDATE`: Certificate delivery status changed
- `KYC_STATUS_UPDATED`: KYC submission reviewed
- `STAFF_MESSAGE`: Message from registrar

**Implementation** (in `NotificationListener.jsx`):
```javascript
useEffect(() => {
  if (!isAuthenticated) return;
  
  ws = new WebSocket(WS_URL, [accessToken]);
  ws.onmessage = (event) => {
    const { type, data } = JSON.parse(event.data);
    handleNotification(type, data);
  };
  
  return () => ws?.close();
}, [isAuthenticated, accessToken]);
```

---

## Accessibility

### WCAG 2.1 Level AA Compliance

The frontend is tested for compliance with accessibility standards:

- **Keyboard Navigation**: All functionality accessible via keyboard (Tab, Enter, Esc)
- **Screen Reader**: Semantic HTML, ARIA labels, role attributes
- **Contrast**: Minimum 4.5:1 ratio for normal text, 3:1 for large text
- **Touch Targets**: Buttons and links at least 44×44 pixels
- **Focus Indicators**: Clear visible focus ring on all interactive elements
- **Motion**: Respects `prefers-reduced-motion` preference

### Accessibility Widget

Appears in footer (or floating button). Allows users to:
- Increase/decrease font size
- Toggle high contrast mode
- Disable animations
- Reset to defaults

User preference saved to `localStorage` and applied on page load.

---

## Internationalization

The app supports **9 Ghanaian languages**:

- English (`en`)
- Twi (`tw`)
- Akan (`ak`)
- Ewe (`ewe`)
- Hausa (`ha`)
- Dagbani (`dz`)
- Nzema (`nzm`)
- Kyarbo (`ky`)
- Fulani (`ff`)

### Translation Structure

Strings defined in `src/context/LanguageContext.jsx`:

```javascript
const translations = {
  en: { "dashboard.title": "My Applications", ... },
  tw: { "dashboard.title": "Wɔ Adom a Me De", ... },
  ...
}
```

Usage in components:
```javascript
const { t } = useContext(LanguageContext);

<h1>{t('dashboard.title')}</h1>
```

Fallback: Strings default to English if translation missing.

---

## Building & Deployment

### Production Build

```bash
npm run build
```

Creates `dist/` folder with:
- Minified JavaScript (tree-shaking enabled)
- Optimized CSS
- Image optimization
- Source maps for debugging

### Environment

Production `.env` should have:
- `VITE_API_URL=https://api.birthdeathregistry.gov.gh/api` (production domain)
- All external API keys configured
- `VITE_ENABLE_CHATBOT=true` (if using)

### Deployment Options

**Static hosting** (Vercel, Netlify, GitHub Pages):
```bash
npm run build
# Deploy dist/ folder
```

**Docker**:
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

**Performance Checklist**:
- Lazy-loading for page components (React.lazy + Suspense)
- Code splitting by route
- Image optimization
- CSS minification
- No blocking scripts in `<head>`
- Defer analytics scripts

---

## Troubleshooting

### API connection failures

- Verify `VITE_API_URL` in `.env` matches backend URL
- Check backend is running (`http://localhost:8000`)
- Check CORS configuration on backend
- Check browser console for network errors

### Authentication not persisting

- Backend should return user data in `/auth/me` response
- Frontend calls `/auth/me` on app startup to rehydrate
- Check `AuthContext` for proper initialization
- Clear browser storage and try again

### Notifications not real-time

- Verify WebSocket URL is correct (derived from `VITE_API_URL`)
- Check browser WebSocket support (DevTools → Network → WS)
- Verify token is being sent with WebSocket connection
- Check backend logs for connection errors

### Stale data after mutations

- API client automatically invalidates GET cache on POST/PUT/DELETE
- If still seeing stale data, manually call `refetchUser()` or navigate away and back
- Check network tab for response codes

### Payment fails/never confirms

- Verify `VITE_PAYSTACK_PUBLIC_KEY` is correct
- Check Paystack dashboard for test/live mode mismatch
- Backend logs should show webhook receipt; check if payment was recorded
- User can retry payment if it fails silently

### Mobile layout broken

- Check responsive CSS in `assets/styles/responsive.css`
- Verify mobile breakpoints: 480px, 768px, 1024px
- Test in browser DevTools mobile emulator
- Check images are not hardcoded to large dimensions

### Chatbot not responding

- Verify `VITE_ENABLE_CHATBOT=true` in `.env`
- Check backend `GEMINI_API_KEY` is configured
- Check browser console for errors
- Verify chatbot endpoint is in API client

### Language switcher not working

- Check `LanguageContext` is providing `t()` and `setLanguage()`
- Verify translation strings exist for current language
- Check localStorage is not full
- Try clearing browser data

---

## Key Implementation Details

### Birth vs. Death Application Forms

**Birth Registration** (`/register/birth`)
- Child full name, date of birth, place of birth
- Mother: full name, date of birth, nationality, address
- Father: full name, nationality (optional if unknown)
- Hospital/health facility: name, location
- Informant: name and relationship
- Supporting documents: birth notification, hospital discharge

**Death Registration** (`/register/death`)
- Deceased: full name, date of death, age, place of death, gender
- Cause of death (medical form required)
- Informant: full name, relationship to deceased, address
- Physician: name, facility, signature
- Supporting documents: medical certificate, death notification

Both saved as **drafts** and can be edited before final submission.

### Application Status Workflow

```
┌──────────┐
│  DRAFT   │ (User editing)
└────┬─────┘
     │ User submits
     ↓
┌──────────────────┐
│ SUBMITTED        │ (Awaiting staff review)
└────┬────────────┬┘
     │ Approved  │ Rejected
     ↓           ↓
┌──────────┐  ┌─────────────┐
│ APPROVED │  │ NEEDS DOCS  │ (Back to user)
└────┬─────┘  └──────┬──────┘
     │               │ User resubmits
     │               ↓
     │          ┌──────────────┐
     │          │ RESUBMITTED  │
     │          └──────┬───────┘
     │                 │
     └────────────┬────┘
                  │ Staff generates certificate
                  ↓
           ┌─────────────────┐
           │ CERTIFICATE_READY│ (User can download)
           └────────┬─────────┘
                    │ User confirms collection
                    ↓
             ┌───────────────┐
             │ COLLECTED     │ (Completed)
             └───────────────┘
```

### Payment Flow

1. User selects service (birth reg + express processing + delivery)
2. Frontend calculates total: `NORMAL_FEE + EXPRESS_FEE + DELIVERY_FEE`
3. Click "Pay" → `POST /api/payments/initiate`
4. Backend returns Paystack authorization URL
5. Redirect to Paystack hosted checkout
6. After payment, Paystack redirects to `/payment?reference=<ref>`
7. Frontend calls `GET /api/payments/verify/{reference}`
8. Backend confirms payment with Paystack and updates application status
9. Snackbar shows success, user redirected to dashboard

### Certificate QR Code

QR code encodes: `CERT_NUMBER|ISSUED_DATE|HASH`

To verify certificate (public, no auth):
1. Scan QR code or goto `/certificates/verify/CERT_NUMBER`
2. Frontend calls `GET /api/certificates/verify/{cert_no}`
3. Backend retrieves certificate, regenerates hash, compares
4. Returns certificate validity and issuer details

### Notification Subscriptions

Behind the scenes, the app:
- Maintains WebSocket connection to `/notifications/ws`
- Manages a queue of notification objects in SnackbarContext
- Auto-dismisses toasts after 5–6 seconds
- Persist notification history visible at `/dashboard` (for citizens)

### Profile Photo Upload

- User selects image → validation (JPEG/PNG, < 5MB)
- Uploaded to Cloudinary via backend `POST /users/me/upload-photo`
- Backend returns photo URL
- Frontend stores in AuthContext and displays in Header avatar (28×28px fixed)
- Avatar image cached by browser

---

## Contact & Support

For issues, feature requests, or questions about the frontend, refer to the backend API documentation or contact the development team.

**Built for the Ghana Births and Deaths Registry — March 2026**