# 06 — Authentication & Token Lifecycle

JWT-based authentication with automatic token refresh and idle session logout.

## Registration & Email Verification

```mermaid
sequenceDiagram
    participant U as User Browser
    participant FE as React Frontend
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant EMAIL as Gmail SMTP

    U->>FE: Fill registration form
    FE->>API: POST /api/auth/register\n{first_name, last_name, email, password, phone}
    API->>API: Hash password (sha256_crypt)
    API->>DB: INSERT user (status=pending_verification)
    API->>DB: INSERT email_verification_token
    API->>EMAIL: Send verification email\n"Dear John, please verify..."
    EMAIL-->>U: Verification email received
    API-->>FE: 201 Created {message: "Check your email"}

    U->>FE: Click verification link
    FE->>API: POST /api/auth/verify-email {token}
    API->>DB: Validate token (not expired, not used)
    API->>DB: UPDATE user SET email_verified=true
    API->>DB: UPDATE token SET is_used=true
    API-->>FE: 200 OK {message: "Email verified"}
    FE->>U: Redirect to /signin
```

---

## Login & Token Issuance

```mermaid
sequenceDiagram
    participant U as User Browser
    participant FE as React Frontend
    participant API as FastAPI Backend
    participant DB as PostgreSQL

    U->>FE: Enter email + password
    FE->>API: POST /api/auth/login {email, password}
    API->>DB: SELECT user WHERE email = ?
    DB-->>API: User record
    API->>API: sha256_crypt.verify(password, hashed_password)

    alt Password incorrect
        API-->>FE: 401 Unauthorized
        FE->>U: Show "Invalid credentials"
    else Password correct
        API->>API: Create access_token (JWT, 30 min expiry)
        API->>API: Create refresh_token (JWT, 7 day expiry)
        API->>DB: INSERT refresh_token record
        API->>DB: UPDATE user SET last_login=now()
        API-->>FE: 200 OK {access_token, refresh_token, user}
        FE->>FE: localStorage.setItem('access_token', ...)
        FE->>FE: localStorage.setItem('refresh_token', ...)
        FE->>FE: AuthContext: setUser(user)
        FE->>U: Redirect to /dashboard
    end
```

---

## Authenticated API Call & Auto Token Refresh

```mermaid
sequenceDiagram
    participant U as User Browser
    participant FE as React Frontend (client.js)
    participant API as FastAPI Backend
    participant DB as PostgreSQL

    Note over FE,API: Normal API request
    FE->>API: GET /api/applications/my\nAuthorization: Bearer {access_token}
    API->>API: Decode JWT, check expiry
    API->>DB: Fetch user applications
    API-->>FE: 200 OK {applications: [...]}

    Note over FE,API: 30 minutes later — token expired
    FE->>API: GET /api/chatbot/ask\nAuthorization: Bearer {expired_access_token}
    API->>API: JWT expired check fails
    API-->>FE: 401 Unauthorized

    Note over FE: client.js 401 interceptor activates
    FE->>API: POST /api/auth/refresh\n{refresh_token}
    API->>DB: SELECT refresh_token WHERE token=? AND is_revoked=false
    DB-->>API: Valid token record

    alt Refresh token also expired or revoked
        API-->>FE: 401 Unauthorized
        FE->>FE: logout() — clear localStorage
        FE->>U: Redirect to /signin
    else Refresh token valid
        API->>API: Issue new access_token (30 min)
        API->>API: Issue new refresh_token (7 days)
        API->>DB: Revoke old refresh_token
        API->>DB: INSERT new refresh_token
        API-->>FE: 200 OK {access_token, refresh_token}
        FE->>FE: Update localStorage
        FE->>API: GET /api/chatbot/ask [retry with new token]
        API-->>FE: 200 OK {answer: ...}
    end
```

---

## Idle Session Logout

```mermaid
sequenceDiagram
    participant U as User Browser
    participant FE as React Frontend (AuthContext)
    participant API as FastAPI Backend
    participant DB as PostgreSQL

    Note over FE: User active — mousemove, keydown, click events
    FE->>FE: Reset idle timer (15 min)\nUpdate lastActivity in localStorage

    Note over U,FE: User goes idle for 15+ minutes
    FE->>FE: Idle timer fires\nCheck: now() - lastActivity > 15 min

    FE->>FE: logout()\nClear localStorage tokens
    FE->>API: POST /api/auth/logout {refresh_token}
    API->>DB: UPDATE refresh_token SET is_revoked=true
    API-->>FE: 200 OK

    FE->>U: Redirect to /signin\nShow "Session expired" snackbar

    Note over FE: On page reload after idle
    FE->>FE: AuthContext init: check lastActivity\nIf expired → logout immediately before any API call
```

---

## Password Reset Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant FE as React Frontend
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant EMAIL as Gmail SMTP

    U->>FE: Click "Forgot Password"
    FE->>API: POST /api/auth/forgot-password {email}
    API->>DB: SELECT user WHERE email=?
    API->>DB: INSERT password_reset_token (expires 1 hour)
    API->>EMAIL: Send reset link email\n"Dear John, reset your password..."
    API-->>FE: 200 OK (always, to prevent email enumeration)

    U->>EMAIL: Open email, click reset link
    FE->>U: Show reset password form /reset-password?token=...
    U->>FE: Enter new password
    FE->>API: POST /api/auth/reset-password\n{token, new_password}
    API->>DB: Validate token (not expired, not used)
    API->>API: Hash new password
    API->>DB: UPDATE user SET hashed_password=?
    API->>DB: UPDATE token SET is_used=true
    API->>DB: Revoke all refresh_tokens for user
    API-->>FE: 200 OK
    FE->>U: Redirect to /signin "Password changed successfully"
```
