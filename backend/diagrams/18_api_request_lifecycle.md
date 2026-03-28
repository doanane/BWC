# 18 — API Request Lifecycle

Full journey of an HTTP request from browser to database and back.

```mermaid
sequenceDiagram
    participant BROWSER as Browser
    participant CLIENT as client.js\n(API Wrapper)
    participant CACHE as Response Cache\n(45s TTL)
    participant FASTAPI as FastAPI App
    participant CORS as CORS Middleware
    participant AUDIT_MW as Audit Middleware
    participant AUTH_DEP as Auth Dependency\nget_current_user()
    participant RBAC as RBAC Check\nrequire_staff() etc.
    participant ROUTE as Route Handler
    participant SERVICE as Service Layer
    participant DB as PostgreSQL

    BROWSER->>CLIENT: Call API function\ne.g. applicationsApi.list()

    CLIENT->>CACHE: Check cache key
    alt Cache hit (GET, < 45s old)
        CACHE-->>CLIENT: Cached response
        CLIENT-->>BROWSER: Return data
    else Cache miss or POST/PUT/DELETE
        CLIENT->>CLIENT: Inject Authorization header\nBearer {access_token}
        CLIENT->>FASTAPI: HTTP Request

        FASTAPI->>CORS: Check Origin header
        CORS-->>FASTAPI: Allow (CORS_ORIGINS list)

        FASTAPI->>AUDIT_MW: Log request\n{method, path, ip, user_agent, timestamp}

        FASTAPI->>AUTH_DEP: Decode JWT from header
        alt No token / expired
            AUTH_DEP-->>CLIENT: 401 Unauthorized
            CLIENT->>CLIENT: 401 interceptor\nPOST /auth/refresh
            CLIENT->>FASTAPI: Retry with new token
        else Valid JWT
            AUTH_DEP->>DB: SELECT user WHERE id=?
            DB-->>AUTH_DEP: User record
            AUTH_DEP-->>ROUTE: current_user injected
        end

        ROUTE->>RBAC: Check role requirement
        alt Insufficient role
            RBAC-->>CLIENT: 403 Forbidden
            CLIENT-->>BROWSER: Show error snackbar
        else Role OK
            ROUTE->>SERVICE: Call service method\ne.g. application_service.list_applications()
            SERVICE->>DB: SQL query via SQLAlchemy ORM
            DB-->>SERVICE: Result rows
            SERVICE->>SERVICE: Business logic\nPydantic schema serialization
            SERVICE-->>ROUTE: Response data
            ROUTE-->>FASTAPI: JSONResponse / HTTP 200
        end

        FASTAPI->>AUDIT_MW: Log response\n{status_code, duration_ms}
        FASTAPI-->>CLIENT: HTTP Response

        CLIENT->>CACHE: Store response (GET only)
        CLIENT-->>BROWSER: Return data
    end
```

---

## Error Response Structure

```mermaid
flowchart LR
    EXCEPTION["Exception raised\nin service layer"] --> HANDLER["FastAPI exception handler"]
    HANDLER --> TYPE{Exception type}
    TYPE -->|"HTTPException(400)"| BAD_REQ["400 Bad Request\n{detail: 'Validation message'}"]
    TYPE -->|"HTTPException(401)"| UNAUTH["401 Unauthorized\n{detail: 'Could not validate credentials'}"]
    TYPE -->|"HTTPException(403)"| FORBIDDEN["403 Forbidden\n{detail: 'Insufficient permissions'}"]
    TYPE -->|"HTTPException(404)"| NOT_FOUND["404 Not Found\n{detail: 'Resource not found'}"]
    TYPE -->|"HTTPException(409)"| CONFLICT["409 Conflict\n{detail: 'Already exists / assigned'}"]
    TYPE -->|"ValidationError"| UNPROCESSABLE["422 Unprocessable Entity\n{detail: [{loc, msg, type}]}"]
    TYPE -->|"Exception (uncaught)"| SERVER_ERR["500 Internal Server Error\nLogged to audit trail"]
```

---

## Request Caching Strategy (client.js)

| Method | Cached? | TTL | Invalidation |
|--------|---------|-----|-------------|
| GET | Yes | 45 seconds | Manual `clearApiCache()` |
| POST | No | — | Clears related GET cache |
| PUT | No | — | Clears related GET cache |
| DELETE | No | — | Clears related GET cache |
| WebSocket | N/A | — | Persistent connection |
