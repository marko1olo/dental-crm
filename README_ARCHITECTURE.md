# Clinic MVP (DENTE) — Project Architecture Index

> 🧭 **Навигация:** [🗺️ Главный Индекс Документации (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md)

Welcome to the canonical architecture guide for the **DENTE Clinical Dental CRM** project.

The system is an enterprise-grade full-stack clinical platform built with **React 19**, **Zustand**, and **Tailwind CSS** on the frontend (`@dental/web`), powered by a **Fastify 5** API service and native **PostgreSQL 18.4** (`.data/pg18`, port 5432) via **Drizzle ORM** (`@dental/api`). A strictly typed core domain package (`@dental/shared`) enforces medical, financial, and statutory invariants across the stack.

---

## 🏛️ Core Architecture Documents (`.agents/`)

To navigate the codebase, consult the canonical authority documents indexed below:

### 1. [Master Documentation Index & Navigation Matrix](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) (`.agents/INDEX.md`)
Central intertextual navigation hub and task routing matrix for AI agents and human engineers. Indexes the entire documentation hierarchy, cross-linking highways, and critical system invariants.

### 2. [Monorepo & System Architecture](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md) (`.agents/ARCHITECTURE.md`)
Comprehensive overview of the monorepo layout (`apps/api`, `apps/web`, `packages/shared`), Fastify 5 API gateway, React 19 single-page application, real-time WebSocket broker, and multi-tenant isolation via AsyncLocalStorage (`withTenantCtx`).

### 3. [Database Engine & Schema Registry](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md) (`.agents/DATABASE.md`)
Drizzle ORM over native PostgreSQL 18.4 connected over TCP on `127.0.0.1:5432` (`.data/pg18`, `pg.Pool`). Details the 203 database tables across 18 schema modules, Row-Level Security (RLS) isolation, migration procedures, connection pooling, and baseline seeding safety gates.

### 4. [Fastify API Routes Catalog](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md) (`.agents/API_ROUTES_CATALOG.md`)
Comprehensive catalog of all 771 Fastify API routes across 14 functional domains: query/body Zod validations, role-based access control (RBAC), database transaction boundaries, and HTTP response codes.

### 5. [Frontend Views, Drawers & Modals Map](file:///C:/Clinic_MVP/dental-crm/.agents/FRONTEND_VIEWS_MAP.md) (`.agents/FRONTEND_VIEWS_MAP.md`)
Complete inventory of client screens (14 views), slide-out context drawers (Drawers), and modal interfaces in `@dental/web`. Covers hash-based routing, view preloading, and dynamic code splitting.

### 6. [UI Standards & Ergonomics (3-Tier & Apple HIG)](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md) (`.agents/UI_STANDARDS.md`)
Ergonomic guidelines implementing the Universal 3-Tier Interaction Doctrine (Tier 1 Hot Path, Tier 2 Warm Context, Tier 3 Cold Backoffice), Studio Clinical macOS/iOS HIG, 10 WCAG 2.1 AA design themes, touch targets ($\ge 44\times 44\text{px}$), and God Context constraints (`useAppLogic.tsx`).

### 7. [Clinical Protocols & Statutory EMR Registry](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_PROTOCOLS_REGISTRY.md) (`.agents/CLINICAL_PROTOCOLS_REGISTRY.md`)
Clinical registry for Form 043/u outpatient records, ICD-10 stomatological coding (K02–K08), Order 804n turnkey service packages, SanPiN 3.3686-21 sterilization Kraft-package tracking, and maximum recommended anesthesia dosage limits.

### 8. [Billing & Financial Operations](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md) (`.agents/BILLING_AND_FINANCE.md`)
Financial domain rules: Federal Law 54-FZ fiscal receipt generation (FFD 1.2), integer-exact arithmetic in kopecks (`BIGINT`), payment idempotency via `clientMutationId` / `Idempotency-Key`, shared family balances, and FNS Form 1151156 tax deduction certificates.

---

## 🛠️ Specialized Subsystem Guides (`.agents/`)

For specialized modules and operational procedures, refer to:

- **[Database Setup & Recovery](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE_SETUP.md)** (`.agents/DATABASE_SETUP.md`) — Portable PostgreSQL setup, `uuidv7()` PL/pgSQL polyfill, and schema push bypass.
- **[Clinical Rules Engine](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** (`.agents/CLINICAL_RULES.md`) — Prerequisite matching, contraindication checks, and Mandate 8e doctor autonomy enforcement.
- **[Outpatient Documents & PDF Lifecycle](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** (`.agents/DOCUMENTS_LIFECYCLE.md`) — Headless Edge/Chrome PDF export, SHA-256 document integrity signing, and draft watermarks.
- **[Telephony & Patient Portal](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** (`.agents/TELEPHONY_AND_PORTAL.md`) — Mango/Zadarma/UIS PBX webhooks, silent doctor mode, and PWA patient self-service portal.
- **[Warehouse & Supply Management](file:///C:/Clinic_MVP/dental-crm/.agents/WAREHOUSE_AND_SUPPLY.md)** (`.agents/WAREHOUSE_AND_SUPPLY.md`) — Stock tracking, procedure bill-of-materials (BOM), 1-click empty carpule write-offs, and soft overdraft rules.
- **[Messengers Integration](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** (`.agents/MESSENGERS.md`) — WhatsApp Cloud API (WABA), VK MAX bot, Telegram webhooks, and event brokers.
- **[CLI Commands & Test Suite](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)** (`.agents/COMMANDS_AND_TESTS.md`) — Workspace scripts, 5-stage typecheck, Biome formatting, and smoke tests.
- **[Documentation Knowledge Hub](file:///C:/Clinic_MVP/dental-crm/docs/README.md)** (`docs/README.md`) — Gateway to architectural specifications and the 63-feature competitive audit suite (`docs/competitive-audit/`).

---

*This architecture index is strictly synchronized with the live codebase and canonical documentation of DENTE Dental CRM.*
