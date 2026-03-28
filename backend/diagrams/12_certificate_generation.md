# 12 — Certificate Generation & Verification Flow

PDF certificate generation with QR code and public tamper-proof verification.

```mermaid
flowchart TD
    APPROVED(["Application status → approved\nAdmin or staff approves"]) --> TRIGGER["POST /api/certificates/generate/{application_id}\nTriggered by staff from dashboard"]

    TRIGGER --> CERT_NUM["Generate unique certificate number\nFormat: BDR-YYYY-XXXXXXXX\nExample: BDR-2026-00042517"]

    CERT_NUM --> TAMPER_HASH["Generate tamper-proof hash\nHMAC-SHA256 over cert_number + app_id + issued_date\nStored in DB for verification"]

    TAMPER_HASH --> QR_GEN["Generate QR Code\nqrcode library\nEncodes URL: /certificates/verify/{cert_number}"]

    QR_GEN --> PDF_GEN["Render PDF\nreportlab / WeasyPrint\nContents:\n- Ghana BDR official letterhead\n- Registration office seal\n- Child/deceased full details\n- Parents/informant details\n- Certificate number\n- Date of issue\n- Registrar signature\n- Embedded QR code"]

    PDF_GEN --> UPLOAD_PDF["Upload PDF to Cloudinary\nFolder: bdr/certificates/\nReturns: secure PDF URL"]

    UPLOAD_PDF --> UPLOAD_QR["Upload QR image to Cloudinary\nFolder: bdr/qrcodes/"]

    UPLOAD_QR --> DB_CERT["INSERT certificates\n{application_id, certificate_number,\npdf_url, qr_code_url,\ncertificate_type, issued_by_id,\nregistrar_name, is_valid=true}"]

    DB_CERT --> UPDATE_APP["UPDATE applications\nSET status=ready\nSET certificate_id=?"]

    UPDATE_APP --> NOTIFY["Notify citizen:\nEmail with PDF download link\nSMS with reference\nIn-app notification"]

    NOTIFY --> DOWNLOAD["Citizen downloads PDF\nfrom Dashboard or email link"]
    NOTIFY --> QR_VERIFY["QR scan by anyone\nOpens /certificates/verify/{cert_number}"]

    QR_VERIFY --> VERIFY_PAGE["Public verification page\nNo login required\nShows: name, DOB, date issued,\noffice, valid/invalid status"]
```

---

## Public Certificate Verification

```mermaid
sequenceDiagram
    participant SCANNER as Anyone with QR scanner\nor verification URL
    participant FE as Public Page\n/certificates/verify/:certNo
    participant API as FastAPI\nGET /api/verify/certificate/{number}
    participant DB as PostgreSQL

    SCANNER->>FE: Scan QR code / enter cert number
    FE->>API: GET /api/verify/certificate/BDR-2026-00042517
    API->>DB: SELECT certificates WHERE certificate_number=?
    DB-->>API: Certificate record

    alt Certificate found and valid
        API->>API: Recompute HMAC-SHA256 tamper hash
        API->>API: Compare with stored hash
        alt Hash matches
            API-->>FE: {valid: true, name, dob, type, issued_at, office}
            FE->>SCANNER: Green badge: AUTHENTIC CERTIFICATE\nDisplay registration details
        else Hash mismatch
            API-->>FE: {valid: false, reason: "tampered"}
            FE->>SCANNER: Red badge: CERTIFICATE TAMPERED
        end
    else Certificate not found
        API-->>FE: 404 Not Found
        FE->>SCANNER: Red badge: CERTIFICATE NOT FOUND\nContact BDR office
    else Certificate invalidated
        API-->>FE: {valid: false, reason: "invalidated"}
        FE->>SCANNER: Orange badge: CERTIFICATE INVALIDATED
    end
```

---

## Certificate Number Format

```
BDR - YYYY - XXXXXXXX
 │      │        │
 │      │        └─ 8-digit zero-padded sequential ID
 │      └─ 4-digit year of issue
 └─ Births & Deaths Registry prefix

Birth certificate:  BDR-2026-00042517
Death certificate:  BDR-2026-00042518
```
