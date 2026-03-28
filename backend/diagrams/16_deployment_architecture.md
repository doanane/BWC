# 16 — Deployment Architecture

Infrastructure and hosting configuration for the Ghana BDR platform.

```mermaid
graph TB
    subgraph DEV["Developer Machine"]
        CODE["Source Code\ngit push → GitHub"]
    end

    subgraph GITHUB["GitHub Repository"]
        REPO["Main Branch\n/frontend + /backend + /diagrams"]
    end

    subgraph FRONTEND_HOSTING["Frontend Hosting"]
        VERCEL["Vercel\nAuto-deploy on push to main\nvercel.json config"]
        VITE_BUILD["Vite Production Build\nnpm run build → /dist\nCode splitting + lazy loading"]
        VERCEL_CDN["Vercel Edge CDN\nGlobal distribution"]
    end

    subgraph BACKEND_HOSTING["Backend Hosting"]
        RENDER["Render / Railway\nFastAPI ASGI server\nuvicorn main:app"]
        ENV_VARS["Environment Variables\nDB_URL, JWT_SECRET\nPAYSTACK_KEY, AI keys\nCLOUDINARY_URL"]
    end

    subgraph DB_LAYER["Database Layer"]
        NEON["Neon PostgreSQL (Primary)\nneon.tech cloud\nServerless autoscaling"]
        LOCAL_PG["Local PostgreSQL (Fallback)\nAuto-failover in core/database.py"]
        ALEMBIC_MIGRATE["Alembic Migrations\nalembic upgrade head"]
    end

    subgraph EXTERNAL_SERVICES["External Services"]
        CLOUDINARY_EXT["Cloudinary\ndocuments, certificates, photos\nbdr/ folder namespace"]
        PAYSTACK_EXT["Paystack\nPayment processing\nGhana mobile money + cards"]
        GMAIL_EXT["Gmail SMTP\nanane365221@gmail.com\nApp password auth"]
        TWILIO_EXT["Twilio\nSMS Ghana +233 numbers"]
        GEMINI_EXT["Google Gemini API\ngemini-flash-lite-latest\n1M tokens/month free"]
        ANTHROPIC_EXT["Anthropic Claude API\nclaude-haiku-4-5-20251001\nPrimary AI provider"]
    end

    CODE --> REPO
    REPO --> VERCEL
    REPO --> RENDER

    VERCEL --> VITE_BUILD
    VITE_BUILD --> VERCEL_CDN
    VERCEL_CDN -->|"VITE_API_URL"| RENDER

    RENDER --> NEON
    NEON -->|"connection error"| LOCAL_PG
    ALEMBIC_MIGRATE --> NEON

    RENDER --> CLOUDINARY_EXT
    RENDER --> PAYSTACK_EXT
    RENDER --> GMAIL_EXT
    RENDER --> TWILIO_EXT
    RENDER --> GEMINI_EXT
    RENDER --> ANTHROPIC_EXT

    style NEON fill:#00a86b,color:#fff
    style VERCEL fill:#000,color:#fff
    style RENDER fill:#1a1a2e,color:#fff
```

---

## Environment Variables

### Backend (.env)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `FALLBACK_DATABASE_URL` | Local PostgreSQL fallback |
| `JWT_SECRET_KEY` | JWT signing secret |
| `JWT_ALGORITHM` | HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 30 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `ANTHROPIC_API_KEY` | Claude API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `SMTP_HOST` | smtp.gmail.com |
| `SMTP_PORT` | 587 |
| `SMTP_USERNAME` | Gmail address |
| `SMTP_PASSWORD` | Gmail app password |
| `TWILIO_ACCOUNT_SID` | Twilio SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Sender phone |
| `FERNET_KEY` | AES encryption key for PII |

### Frontend (.env)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend base URL |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `VITE_NIA_API_URL` | NIA Ghana Card API |
| `VITE_NIA_API_KEY` | NIA API key |
| `VITE_FACE_API_ENABLED` | Enable client-side face matching |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
