# 09 — Document Upload & Verification Flow

Document lifecycle from upload by citizen to staff verification.

```mermaid
flowchart TD
    USER(["Citizen / Informant"]) --> SELECT["Select file\nGhana Card, birth notification,\nmedical certificate, etc."]
    SELECT --> VALIDATE{Client-side\nvalidation}
    VALIDATE -->|"File > 10 MB"| SIZE_ERR["Error: File too large\nMax 10 MB"]
    VALIDATE -->|"Invalid type"| TYPE_ERR["Error: JPEG, PNG, PDF only"]
    SIZE_ERR --> SELECT
    TYPE_ERR --> SELECT

    VALIDATE -->|Valid| API_CALL["POST /api/documents\nMultipart form data\nAuthorization: Bearer JWT"]

    API_CALL --> SERVER_VALIDATE{Server-side\nvalidation}
    SERVER_VALIDATE -->|Fail| SERVER_ERR["400 Bad Request\nError message to user"]
    SERVER_VALIDATE -->|Pass| CLOUDINARY["Upload to Cloudinary CDN\ncloudinary.uploader.upload()"]

    CLOUDINARY --> CDN_RESULT["Secure URL + public_id\nCDN edge-cached globally"]
    CDN_RESULT --> DB_RECORD["INSERT document record\n{application_id, file_url,\ncloudinary_public_id, is_verified=false}"]

    DB_RECORD --> LINK_APP["Link to application\nin form_data or documents relation"]
    LINK_APP --> NOTIFY_STAFF["Notification to assigned staff\nNew document uploaded"]

    NOTIFY_STAFF --> STAFF_VIEW["Staff opens document\nvia secure Cloudinary URL"]
    STAFF_VIEW --> AI_SCREEN["Optional: Run AI Document Screen\nPOST /api/ai/document-screen\nChecks quality, authenticity indicators"]
    AI_SCREEN --> STAFF_DECISION{Staff decision}

    STAFF_DECISION -->|Authentic| VERIFY["PUT /api/documents/{id}/verify\nis_verified=true\nverification_notes saved"]
    STAFF_DECISION -->|Suspect| FLAG["Flag document\nMark is_verified=false\nAdd rejection note"]
    FLAG --> NOTIFY_CITIZEN["Notify citizen:\nDocument rejected — please resubmit"]
    NOTIFY_CITIZEN --> USER

    VERIFY --> PROCEED["Document accepted\nApplication moves forward"]

    subgraph CLOUDINARY_DETAIL["Cloudinary Storage Details"]
        CDN1["Storage folder: bdr/documents/"]
        CDN2["Transformation: auto format, auto quality"]
        CDN3["Access: signed URLs for private docs"]
        CDN4["Backup: redundant geo-distributed CDN"]
    end
```

---

## Document Types

| Document | Required For | Accepted Formats |
|----------|-------------|-----------------|
| Ghana Card (parent/informant) | Birth & Death | JPEG, PNG, PDF |
| Birth Notification Letter | Birth | PDF, JPEG, PNG |
| Hospital / Midwife Letter | Birth | PDF |
| Death Notification / Burial Permit | Death | PDF, JPEG, PNG |
| Medical Certificate of Death | Death | PDF |
| Coroner's Report | Death (unnatural) | PDF |
| Passport Photo | Both | JPEG, PNG |
