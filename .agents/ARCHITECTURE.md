# 🏗️ DENTE Dental CRM — System Architecture

> ⚠️ **ВЫСШАЯ КОНСТИТУЦИЯ (THE SUPREME LAW):** [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и [`.agents/AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md).
>
> 🎯 **СТРАТЕГИЧЕСКИЙ ПРИОРИТЕТ №1 И ГЛАВНЫЙ АКЦЕНТ СИСТЕМЫ:**
> **Соло-врач (1–2 кресла, субаренда, ИП/самозанятый) и небольшая клиника (1–3 кресла)**.
> До сетевых холдингов нам ещё расти и расти! Архитектура оптимизирована под минимальное трение: быстрый запуск, отсутствие промежуточных блокировок, 1-клик сценарии у кресла.
>
> 🛑 **ЗАКОН ОТСУТСТВИЯ ТУПИКОВ (ZERO DEAD-ENDS — МАНДАТ 8n):**
> Система масштабируется от 1 кресла до крупной сети без архитектурных переделок. Сетевые модули (мультитенантность, аудит главврача) заложены без захламления базового интерфейса соло-врача.
>
> 🏛️ **УНИВЕРСАЛЬНАЯ 3-УРОВНЕВАЯ АРХИТЕКТУРА ИНТЕРФЕЙСА (CORE ROUTE §10):**
> - **Tier 1 (Горячий путь / 0 кликов):** Доминантный холст зубной формулы, итоги к оплате, статус визита, экстренные аллерго-алерты.
> - **Tier 2 (Тёплый контекст / 1 клик):** Выдвижные шторки и аккордеоны параметров (поверхности MOD, дозировка анестезии, крафт-пакеты).
> - **Tier 3 (Холодный бэк-офис / Кабинет):** Полноэкранные студии (3D DICOM MPR, выгрузка ЕГИСЗ РЭМД с УКЭП, зарплатная ведомость Т-51).

This document describes the structure, data flows, and architectural conventions of the DENTE Dental CRM project.

---

## 🧭 Documentation Navigation & Authority Links

* 📋 **[AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Core Identity, Standards, Mojibake Prevention Rules, and General Constraints.
* 🗺️ **[INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Central Documentation Index.
* 📚 **[docs/README.md](file:///C:/Clinic_MVP/dental-crm/docs/README.md)** — Documentation Knowledge Hub & Specifications Gateway.
* 🛣️ **[API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** — Comprehensive Fastify API Routes Catalog (771 endpoints, 14 domains, Zod validation, RBAC, DB tables).
* 🗄️ **[DATABASE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — PostgreSQL 18.4 engine, Drizzle ORM schema (203 tables across 18 modules), RLS isolation, and migration pipeline.
* 💳 **[BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — 54-FZ fiscal receipts, cashboxes, family shared balances, and payment idempotency.
* ⚕️ **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Clinical rules engine, triggers matching, prerequisite checks, and warning/blocking actions.
* 📞 **[TELEPHONY_AND_PORTAL.md](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — Mango/Zadarma/UIS Telephony webhooks, WebSocket broadcasts, Patient Portal OTP auth, and PWA setup.
* 📄 **[DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — HTML-to-PDF rendering, Edge/Chrome headless spawning, and SHA-256 integrity document signing.
* 💬 **[MESSENGERS.md](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** — Config schemas, API routes, hooks, UI panels, and setup rules for WhatsApp Cloud API & VK MAX bots.

---

## 📁 Monorepo Layout

The project is structured as an npm workspaces monorepo:
*   `apps/api/` — Backend server (Fastify, TypeScript, tsx execution).
*   `apps/web/` — Web Frontend client (Vite, **React 19**, Tailwind CSS, TypeScript).
*   `packages/shared/` — Common types, schemas, and helper functions shared by both frontend and backend.
*   `scripts/` — Smoke test scenarios, database tooling, and validation scripts.

---

## ⚡ Backend Server (`apps/api`)

The backend is built with **Fastify** and uses **Drizzle ORM** for PostgreSQL interaction.

### 🛣️ API Routes Highway Architecture
All backend endpoints are modularized under `apps/api/src/routes/` and registered in `apps/api/src/server.ts`.
For an exhaustive, machine-verified catalog of all 771 endpoints with method, path, handler, Zod schema, RBAC guards, and DB tables, see **[API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)**.

#### Functional Domains (14 Subsystems):
1.  **Auth & Identity:** Staff credentials, PIN switch, sessions, and guest patient OTP portal (`routes/auth.ts`, `routes/portal.ts`, `routes/staff.ts`).
2.  **Patients & CRM:** Full patient records, relations, duplicate merge queue, CRM leak detector (210-day churn), and loyalty/referral programs (`routes/patients.ts`, `routes/crmLeakDetector.ts`, `routes/loyalty.ts`).
3.  **Schedule & Booking:** Chair calendar, appointments, morning confirmation queue (`routes/dayConfirmations.ts`), waitlist auto-matching (`routes/waitlistMatches.ts`), and public booking widgets.
4.  **Clinical EHR & Odontogram:** 043/у diaries, versioned corrections ("исправленному верить"), pediatric/permanent tooth charts, anesthesia calculators, implant passports, and treatment plan bundles.
5.  **Radiology & DICOM:** Direct RVG sensor capture (<50ms preview), DICOM study ingestion, DICOMweb (WADO-RS / QIDO-RS), 3D implant planning, and Diagnocat AI integration.
6.  **Billing, Cash & 54-FZ:** Idempotent payment processing, 54-FZ fiscal receipt validation and generation, offline KKT retry queue, multi-cashbox shifts, P&L reporting, SBP dynamic QR, and Sber POS terminal webhooks.
7.  **Warehouse & SanPiN:** 1-click nurse carpule disposal (СанПиН 3.3686-21, no 3-person commission), soft overdraft on delayed supplier invoices, sterilization logs, azopyram PSO tests, autoclave Bowie-Dick tests, waste class B/V logs, and Chestny Znak (MDLP).
8.  **Dental Lab (ЗТЛ):** Work orders, status progression, trial fits, "installed" verification, and lab cost deductions from doctor revenue.
9.  **Documents & Legal:** Headless Chrome/Edge PDF rendering, HTML previews, 13% NDFL tax deduction certificates (FNS KND 1151156), CryptoPro UKEP signing, and EGISZ REMD packages.
10. **Telephony & Messaging:** UIS/Comagic, Mango, Zadarma webhooks, top ambient call capsules, softphone dialer, WhatsApp Cloud API (WABA), Telegram bot, VK, and MAX.
11. **AI, Speech & Copilot:** Doctor chairside voice dictation (Yandex / Whisper STT), hallucination filters, clinical Copilot agent, and ambient EMR note synthesis.
12. **Analytics & Reports:** Revenue trends, attendance ratios, doctor workload, accounts receivable, and executive dashboards.
13. **Integrations & Data Sync:** 1C Enterprise CommerceML 2.09, Flexbe landing webhooks, Yandex Calendar sync, offline CRDT sync protocol, and migration engine for competitor CRM imports (IDENT, DentalPRO, iStom).
14. **System, Settings & WebSockets:** Clinic configurations, chairs, branch offices, nomenclature 804n pricelist, audit logs, and real-time WebSocket broker.

### 🛡️ Multi-Tenant Isolation & Identity Guarding
*   **AsyncLocalStorage & RLS Integration:** Every incoming request is encapsulated inside `withTenantCtx` (`apps/api/src/db/rls.ts`), executing `SET LOCAL app.current_tenant = organizationId`. Native PostgreSQL Row Level Security (RLS) automatically isolates data queries at the database kernel level.
*   **Encapsulation Boundaries:** Modules requiring dedicated pre-handlers (such as `registerMaxRoutes`, `registerWhatsappRoutes`, `warehouseRoutes`, `inventoryRoutes`) are registered via `app.register(...)` to prevent local hooks from polluting root Fastify route scopes.
*   **Autonomous Doctor Mandate (Constitution §VII):** Routine clinical and administrative workflows must never be blocked by artificial UI locks. Clinicians have full autonomy over treatment plans, notes editing, discounts up to 100%, and warehouse soft overdrafts.

### 🌐 WebSocket Broker (`apps/api/src/services/websocketBroker.ts`)
The server runs an in-memory client dispatcher for real-time events.
*   Endpoint: `/api/ws/schedule?orgId=<orgId>&patientId=<patientId>`
*   Active client connections are mapped to their specific `organizationId` and `patientId` scopes.
*   **Active Broadcast Messages:**
    *   `TELEPHONY_INCOMING_CALL` — Pushed to reception and registered softphones.
    *   `LAB_ORDER_UPDATED` — Pushed when a dental laboratory updates order statuses.
    *   `SCHEDULE_APPOINTMENT_CHANGE` — Dispatched when appointment cards are created, updated, or moved.
    *   `STERILIZATION_CYCLE_FINISHED` — Pushed when autoclave/sterilization batches complete.
    *   `PATIENT_CARD_UPDATED` — Pushed when patient anamnesis or status changes.

### ⚙️ Background Workers & Daemons
Fastify manages several asynchronous background workers initialized during startup:
*   **Migration Worker (`apps/api/src/migration/worker.ts`):** Processes queued foreign database migrations in background transactions with checkpointing and error quarantine.
*   **EGISZ REMD Worker (`apps/api/src/services/egisz/EgiszQueueWorker.ts`):** Dispatches digitally signed medical records (СЭМД) to the Russian Ministry of Health EGISZ queue without delaying doctor checkout.
*   **Communication Dispatch Worker (`apps/api/src/services/communications/dispatchWorker.ts`):** Manages outbound SMS, WhatsApp, and Telegram reminder queues with rate-limiting and gateway fallback.
*   **Daemon Scheduler (`apps/api/src/services/daemons/index.ts`):** Periodically runs system health maintenance, stale lock clearing, and background telemetry.
*   **LAN Discovery Service (`apps/api/src/services/lanDiscoveryService.ts`):** Broadcasts and discovers local clinic nodes for zero-config offline workstation mesh networking.
*   **Server Watchdog (`apps/api/src/watchdog.ts`):** Monitors heap memory, event loop latency, and zombie connections.

### 🔌 Proxy & SSH Tunnel Gating (`apps/api/src/server.ts`)
To handle secure connections to external AI APIs (like speech-to-text models), the server sets up connection routing:
*   During boot, `setupProxyAndTunnels()` checks for local SSH keys. If found, it establishes an SSH SOCKS5 tunnel on port `1080` using `ensureSshTunnel()`.
*   If the tunnel starts, the server sets `process.env.HTTPS_PROXY = "socks5://127.0.0.1:1080"`.
*   If the proxy is marked offline by `checkProxyPortDirectly()`, the environment variables are automatically removed to force direct fallback connections.

### 🎙️ Speech Gating & AI Gateway (`apps/api/src/speech`)
DENTE integrates automated voice dictation for dental visits. 
*   **Key Pool Rotation (`keyPool.ts`):** Dynamically rotates Groq/OpenAI/Yandex STT API keys upon rate-limiting (429) or transient provider failure.
*   **Hallucination Guardrails (`gateway.ts`):** Whisper-class models frequently generate phantom words during silent pauses. The gateway intercepts STT output and filters out blacklisted phrases ("Продолжение следует", "Спасибо за просмотр", etc.) and repetitive loops (`^(.{1,60})\1{4,}$`).

---

## 🗄️ Database Integration Layer (`apps/api/src/db`)

*   **Native PostgreSQL 18.4 Engine:** Connected over TCP at `127.0.0.1:5432` via `pg.Pool`. Requires valid `DATABASE_URL`.
*   **Modular Drizzle Schema:** `apps/api/src/db/schema.ts` re-exports 18 domain schema modules under `apps/api/src/db/schema/` defining **203 `pgTable`** entities.
*   **ALS Proxy Client:** The exported `db` client from `apps/api/src/db/client.ts` proxies queries directly to the active `AsyncLocalStorage` transaction opened by `withTenantCtx`, guaranteeing tenant RLS enforcement.

---

## 🖥️ Web Frontend (`apps/web`)

The frontend is a Single Page Application (SPA) built with **React 19** and Vite.

### 🧠 App State Management
*   **Zustand Stores:** Dedicated stores for decoupled UI state:
    *   `appStore.ts` — Active view navigation (`currentView`), omnibar, global alerts.
    *   `patientStore.ts` — Selected patient profile, tooth status cache.
    *   `visitStore.ts` — Active visit diary 043/у drafts, auto-save state.
    *   `scheduleStore.ts` — Calendar filter state, active chair views.
    *   `settingsStore.ts` — Clinic preferences and UI configuration.
    *   `imagingStore.ts` — Selected DICOM series, active viewer layout.
*   **God Context (`useAppLogic.tsx`):** Centralized state coordinator binding legacy clinical, schedule, and billing workflows into `AppLogicContext`.

### ⚡ View Preloading (`apps/web/src/workspacePreload.ts`)
To prevent route-change lags in the custom UI shell, all core views (Schedule, Patients, Documents, Finance, Communications, Settings) are imported at app initialization.
