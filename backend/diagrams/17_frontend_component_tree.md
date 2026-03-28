# 17 — Frontend Component Tree

React component hierarchy, routing structure, and context providers.

## App Bootstrap & Context Providers

```mermaid
graph TD
    MAIN["main.jsx\nReactDOM.createRoot"] --> BROWSER_ROUTER["BrowserRouter\nReact Router v6"]
    BROWSER_ROUTER --> THEME_CTX["ThemeContext.Provider\ndark/light/system"]
    THEME_CTX --> LANG_CTX["LanguageContext.Provider\ni18n — en/tw/ga/ee"]
    LANG_CTX --> AUTH_CTX["AuthContext.Provider\nJWT, user, idle logout"]
    AUTH_CTX --> SNACK_CTX["SnackbarContext.Provider\ntoast state"]
    SNACK_CTX --> APP_SHELL["App Shell"]

    APP_SHELL --> REALTIME["RealtimeNotifications\nWebSocket connection"]
    APP_SHELL --> HEADER["Header.jsx\nsticky nav, bell, user menu"]
    APP_SHELL --> ROUTER_OUTLET["Route Outlet\nLazy-loaded pages"]
    APP_SHELL --> FOOTER["Footer.jsx"]
    APP_SHELL --> CHATBOT["ChatbotWidget.jsx\nGemini AI floating widget"]
    APP_SHELL --> A11Y["AccessibilityWidget.jsx\nWCAG 2.1 panel"]
    APP_SHELL --> SNACK_TOAST["Snackbar.jsx\ntoast notifications"]
```

---

## Route Tree

```mermaid
graph LR
    ROUTES["React Router v6 Routes"] --> PUBLIC["Public Routes"]
    ROUTES --> PROTECTED["Protected Routes\nRequires authentication"]
    ROUTES --> STAFF_ROUTE["Staff/Admin Routes\nRequires staff role"]
    ROUTES --> ADMIN_ROUTE["Admin/Super Admin Routes"]

    PUBLIC --> HOME["/home — LandingPage"]
    PUBLIC --> ABOUT["/about — About"]
    PUBLIC --> FAQ["/faq — FAQ"]
    PUBLIC --> CONTACT["/contact — Contact"]
    PUBLIC --> OFFICES["/offices — Offices"]
    PUBLIC --> TRACK["/track — TrackApplication"]
    PUBLIC --> SIGNIN["/signin — SignIn"]
    PUBLIC --> REGISTER["/register — SignUp"]
    PUBLIC --> FORGOT["/forgot-password"]
    PUBLIC --> RESET["/reset-password"]
    PUBLIC --> CERT_VERIFY["/certificates/verify/:certNo"]
    PUBLIC --> MEDIA["/media/news|charter|downloads|gallery"]
    PUBLIC --> SERVICES_PUB["/services/extracts|adoptions"]

    PROTECTED --> DASH["/dashboard — Dashboard"]
    PROTECTED --> PROFILE["/profile — UserProfile"]
    PROTECTED --> BIRTH_REG["/register/birth — BirthRegistration"]
    PROTECTED --> DEATH_REG["/register/death — DeathRegistration"]
    PROTECTED --> PAYMENT["/payment — Payment"]
    PROTECTED --> SERVICES_AUTH["/services/verification|statistics"]

    STAFF_ROUTE --> STAFF_DASH["/staff — StaffDashboard"]
    ADMIN_ROUTE --> ADMIN_DASH["/admin — SuperAdminDashboard"]
```

---

## Shared Components

```mermaid
graph TB
    subgraph LAYOUT["Layout Components"]
        HEADER2["Header.jsx\n- Logo + nav\n- Bell + notifications\n- User avatar dropdown\n- Mobile hamburger\n- Language switcher\n- Theme toggle"]
        FOOTER2["Footer.jsx\n- Navigation links\n- Social media\n- Go-to-top button"]
    end

    subgraph UTILITY["Utility Components"]
        PROTECTED2["ProtectedRoute.jsx\nRedirects if not authenticated"]
        ERROR_B["ErrorBoundary.jsx\nGraceful error fallback"]
        SKELETON["Skeleton.jsx\nLoading placeholder"]
        RADIO["RadioGroup.jsx\nReusable radio buttons"]
        BACK_ICON["BackIcon.jsx\nNavigation back button"]
        MARKDOWN["MarkdownText.jsx\nAI response renderer\nbold, bullets, headings"]
    end

    subgraph FEATURE["Feature Components"]
        CAROUSEL["Carousel.jsx\nHero image slider\ndark-only overlay"]
        GHANA_KYC["GhanaCardVerification.jsx\n2-step: card format + selfie\noptional face-api.js match"]
        CHATBOT2["ChatbotWidget.jsx\nGemini AI chat\nMulti-language voice input"]
        A11Y2["AccessibilityWidget.jsx\nText size, contrast modes\ncolor-blind, dyslexia font\nTTS, reading guide"]
        REALTIME2["RealtimeNotifications.jsx\nWebSocket client\ntoast + badge updates"]
        METAMAP["MetaMapButton.jsx\nKYC verification button"]
        FEEDBACK["FeedbackWidget.jsx\nIn-app feedback form"]
        LANG_SW["LanguageSwitcher.jsx\nLanguage dropdown"]
    end
```

---

## Page Components by Feature Area

| Area | Page | Route | Auth Required |
|------|------|-------|---------------|
| Public | LandingPage | /home | No |
| Auth | SignIn, SignUp, ForgotPassword, ResetPassword | /signin, /register, ... | No |
| Registration | BirthRegistration, DeathRegistration | /register/birth, /register/death | Yes |
| Tracking | TrackApplication | /track | No (own data requires auth) |
| Payments | Payment | /payment | Yes |
| Dashboard | Dashboard (citizen) | /dashboard | Yes |
| Dashboard | StaffDashboard | /staff | Staff+ |
| Dashboard | SuperAdminDashboard | /admin | Super Admin |
| Profile | UserProfile | /profile | Yes |
| Certificates | CertificateVerify | /certificates/verify/:certNo | No (public) |
| Info | About, FAQ, Contact, Offices | /about, /faq, ... | No |
| Media | MediaNews, MediaCharter, MediaDownloads, MediaGallery | /media/... | No |
| Services | ServiceExtracts, ServiceAdoptions, ServiceVerification, ServiceStatistics | /services/... | Mixed |
