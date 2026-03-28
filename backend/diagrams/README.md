# Ghana Births & Deaths Registry — Architecture Diagrams

> All diagrams are written in [Mermaid](https://mermaid.js.org/) syntax and render natively on GitHub, GitLab, and Notion.

---

## Index

| # | Diagram | Description |
|---|---------|-------------|
| 01 | [System Architecture](01_system_architecture.md) | Full-stack overview — frontend, API, services, external APIs, data layer |
| 02 | [Database ERD](02_database_erd.md) | Entity Relationship Diagram — all 16 tables and relationships |
| 03 | [User Roles & Permissions](03_user_roles_permissions.md) | RBAC matrix for 4 user roles |
| 04 | [Birth Registration Flow](04_birth_registration_flow.md) | End-to-end birth registration user journey |
| 05 | [Death Registration Flow](05_death_registration_flow.md) | End-to-end death registration user journey |
| 06 | [Authentication & Token Lifecycle](06_authentication_flow.md) | JWT login, auto-refresh, idle logout sequence |
| 07 | [Payment Integration Flow](07_payment_flow.md) | Paystack payment initiation, webhook, verification |
| 08 | [Notification System](08_notification_system.md) | Multi-channel notifications — in-app, email, SMS, WebSocket |
| 09 | [Document Upload & Verification](09_document_upload_flow.md) | Cloudinary upload, staff verification workflow |
| 10 | [WebSocket Real-Time Architecture](10_websocket_architecture.md) | WebSocket connection lifecycle and broadcasting |
| 11 | [Ghana Card Verification](11_ghana_card_verification.md) | Identity verification — format check, face match, manual review |
| 12 | [Certificate Generation](12_certificate_generation.md) | PDF + QR certificate generation and public verification |
| 13 | [Staff Task Assignment & Collaboration](13_staff_workflow.md) | Assignment, claiming, AI-assisted review workflow |
| 14 | [AI Automation Architecture](14_ai_automation.md) | AI endpoints, provider fallback, role-based access |
| 15 | [Super Admin Control Flow](15_super_admin_flow.md) | System administration — users, analytics, audit |
| 16 | [Deployment Architecture](16_deployment_architecture.md) | Infrastructure — cloud DB, CDN, email, hosting |
| 17 | [Frontend Component Tree](17_frontend_component_tree.md) | React component hierarchy and routing |
| 18 | [API Request Lifecycle](18_api_request_lifecycle.md) | Request pipeline — auth, middleware, service, response |
| 19 | [Use Case Diagram](19_use_case_diagram.md) | UML use cases for all 4 actors |
| 20 | [Data Flow Diagram](20_data_flow_diagram.md) | Level-0 and Level-1 DFD for the full system |

---

## How to View

- **GitHub / GitLab**: Diagrams render automatically — just open any `.md` file
- **VS Code**: Install the [Mermaid Preview](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension
- **Live editor**: Paste any diagram block into [mermaid.live](https://mermaid.live)
