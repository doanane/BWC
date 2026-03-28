# 14 — AI Automation Architecture

AI-powered features using Anthropic Claude and Google Gemini with automatic provider fallback.

## Provider Fallback Logic

```mermaid
flowchart TD
    REQUEST["AI endpoint called\nPOST /api/ai/..."] --> AI_SVC["ai_service.ai_call(prompt)"]
    AI_SVC --> TRY_ANTHROPIC["Try Anthropic Claude\nclaude-haiku-4-5-20251001"]
    TRY_ANTHROPIC --> ANTHR_OK{Response\nOK?}
    ANTHR_OK -->|Yes| RETURN_A["Return answer\npowered_by='Anthropic'"]
    ANTHR_OK -->|No — error or low credit| TRY_GEMINI["Fallback: Google Gemini\ngemini-flash-lite-latest"]
    TRY_GEMINI --> GEMINI_OK{Response\nOK?}
    GEMINI_OK -->|Yes| RETURN_G["Return answer\npowered_by='Gemini'"]
    GEMINI_OK -->|No| RETURN_ERR["Return None\nLog both failures"]
```

---

## AI Endpoints by Role

```mermaid
graph LR
    subgraph CITIZEN_AI["Citizen-Facing AI"]
        CHATBOT_EP["POST /api/chatbot/ask\nGemini conversation\nMulti-language support\nEn, Twi, Ga, Ewe, Hausa, Fante, Dagbani"]
        FORM_FILL["POST /api/ai/form-fill\nExtract form fields\nfrom free-text description"]
        STATUS_SUM["POST /api/ai/status-summary\nPlain-language explanation\nof application status"]
    end

    subgraph STAFF_AI["Staff AI Tools"]
        DOC_SCREEN["POST /api/ai/document-screen\nGhana Card quality check\nAuthenticity indicators"]
        REVIEW["POST /api/ai/review-application/{id}\nFull application audit\nFlags + strengths + recommendation"]
        FRAUD["POST /api/ai/fraud-check/{id}\nDuplicate detection\nImpossible dates, inconsistent ages\nCross-reference suspicious patterns"]
        DRAFT["POST /api/ai/draft-response/{id}\nFormal response letter\nApproval or rejection notice\nOfficial BDR letterhead language"]
        DOC_VISION["POST /api/ai/document-vision\nOCR + analysis\nof uploaded documents"]
        CITIZEN_GUIDE["POST /api/ai/ask (staff context)\nCitizen guidance generation\nSend-to-applicant feature"]
    end

    subgraph ADMIN_AI["Admin / Super Admin AI"]
        WORKLOAD["POST /api/ai/workload-suggestion\nOptimal staff assignment\nbased on workload & skills"]
        BRIEFING["POST /api/ai/daily-briefing\nOperations summary\nPending applications, bottlenecks"]
        HEALTH["GET /api/ai/health\nAI provider status\ntoken usage, availability"]
        TRANSLATE["POST /api/ai/translate\nMulti-language translation\nfor official documents"]
        PH_SNAPSHOT["POST /api/ai/public-health-snapshot\nBirth/death trend insights\nPublic health briefing for admin"]
    end

    CHATBOT_EP --> GEMINI
    FORM_FILL --> ANTHROPIC
    STATUS_SUM --> ANTHROPIC
    DOC_SCREEN --> ANTHROPIC
    REVIEW --> ANTHROPIC
    FRAUD --> ANTHROPIC
    DRAFT --> ANTHROPIC
    DOC_VISION --> ANTHROPIC
    CITIZEN_GUIDE --> ANTHROPIC
    WORKLOAD --> ANTHROPIC
    BRIEFING --> ANTHROPIC
    TRANSLATE --> ANTHROPIC
    PH_SNAPSHOT --> ANTHROPIC

    ANTHROPIC["Anthropic Claude\nPrimary provider"] -->|fallback| GEMINI["Google Gemini\nFallback provider"]
```

---

## AI Review Application — Internal Logic

```mermaid
sequenceDiagram
    participant STAFF as Staff User
    participant API as /api/ai/review-application/{id}
    participant DB as PostgreSQL
    participant CLAUDE as Anthropic Claude

    STAFF->>API: POST with application_id
    API->>DB: SELECT application + documents + payments + penalty
    DB-->>API: Full application data
    API->>API: Build structured prompt\n- Application type, dates, names\n- Documents present/missing\n- Payment status\n- Late registration flag\n- Penalty amount

    API->>CLAUDE: Send prompt with full context
    Note over CLAUDE: Analyzes:\n1. Completeness\n2. Consistency (dates, names)\n3. Document quality indicators\n4. Fraud risk signals\n5. Recommendation (approve/reject/request-info)

    CLAUDE-->>API: Structured JSON response
    API-->>STAFF: {flags, strengths, recommendation, confidence_score, notes}
    STAFF->>STAFF: Review AI findings + make final decision
```

---

## Chatbot System Prompt

The BDR Chatbot (ChatbotWidget.jsx) uses a system prompt with these constraints:

- Answers in the language selected by the user (English, Twi, Ga, Ewe, Hausa, Fante, Dagbani)
- Covers: registration requirements, fees, timelines, document checklists, office locations
- Plain prose only — no markdown symbols (CRITICAL FORMATTING RULE enforced in backend prompt)
- Conversation history limited to last 10 messages for context window efficiency
