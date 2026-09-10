# 🗄️ DENTE Dental CRM — Database Engine & Schema

> ⚠️ **ВЫСШАЯ КОНСТИТУЦИЯ (THE SUPREME LAW):** [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и [`.agents/AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md).
>
> 🎯 **СТРАТЕГИЧЕСКИЙ ПРИОРИТЕТ №1 И ГЛАВНЫЙ АКЦЕНТ СИСТЕМЫ:**
> **Соло-врач (1–2 кресла, субаренда, ИП/самозанятый) и небольшая клиника (1–3 кресла)**.
> До сетевых холдингов нам ещё расти и расти! Схема БД и клиентский слой спроектированы так, чтобы соло-врач не спотыкался о сетевую бюрократию: дефолтные значения тенанта, 1-клик сохранение без обязательных ассистентов, мягкий овердрафт склада.
>
> 🛑 **ЗАКОН ОТСУТСТВИЯ ТУПИКОВ (ZERO DEAD-ENDS — МАНДАТ 8n):**
> База данных обеспечивает масштабирование от 1 кресла до сети без архитектурных тупиков. Таблицы поддерживают мультитенантность (`organization_id`), касса 54-ФЗ не требует ИНН с физлиц, склад допускает мягкий овердрафт.

This document details the database architecture, migration mechanism, and table directory.

---

## 🧭 Documentation Navigation & Authority Links

* 📋 **[AGENTS.md](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)** — Core Identity, Standards, Mojibake Prevention Rules, and General Constraints.
* 🗺️ **[INDEX.md](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Central Documentation Index.
* 📚 **[docs/README.md](file:///C:/Clinic_MVP/dental-crm/docs/README.md)** — Documentation Knowledge Hub & Specifications Gateway.
* 🏗️ **[ARCHITECTURE.md](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Monorepo layout, Fastify API structure, Vite Frontend, and Real-time WebSocket architecture.
* 🛣️ **[API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** — Comprehensive Fastify API Routes Catalog (771 endpoints, 14 domains, Zod validation, RBAC, DB tables).
* 💳 **[BILLING_AND_FINANCE.md](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — 54-FZ fiscal receipts, cashboxes, family shared balances, and payment idempotency.
* ⚕️ **[CLINICAL_RULES.md](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Clinical rules engine, triggers matching, prerequisite checks, and warning/blocking actions.
* 📞 **[TELEPHONY_AND_PORTAL.md](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — Mango/Zadarma/UIS Telephony webhooks, WebSocket broadcasts, Patient Portal OTP auth, and PWA setup.
* 📄 **[DOCUMENTS_LIFECYCLE.md](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — HTML-to-PDF rendering, Edge/Chrome headless spawning, and SHA-256 integrity document signing.
* 💬 **[MESSENGERS.md](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** — Config schemas, API routes, hooks, UI panels, and setup rules for WhatsApp Cloud API & VK MAX bots.

---

> **Re-measured 2026-08-06. Read this block before you trust any number below it.**
> Every count in this document is a measurement with a date, not a standing fact. The counts as of
> **2026-08-06** are stated inline below and were taken by running `fd`/`jq`/`wc` and by querying the
> live server. The tree is under concurrent edit by several agents, so re-measure before you quote.
>
> What the 2026-08-06 pass found wrong in the previous revision, and corrected in place: the migration
> count and ordinal range, the claim that the drizzle journal matches zero files, the claim that
> `db:reset-seed` is gated by an environment variable, the claim that `drizzle.config.ts` still declares
> `driver: "pglite"`, the schema size and table count, and the claim that no hardcoded connection string
> survives in the repo. Six statements, all of them load-bearing, all of them stale.

> **On "verified 2026-07-27" — do not inherit that stamp.** Root `AGENTS.md:9` and
> `.claude/rules/dente-database.md` both carry it. What was actually verified on 2026-07-27 was narrow:
> that the engine is native PostgreSQL 18 reached over TCP on `127.0.0.1:5432` and that
> `@electric-sql/pglite` is not installed. **Both of those still hold on 2026-08-06.** What was NOT
> verified then, and what those documents got wrong anyway, is *which directory on disk* is the server's
> data directory — see "The `dente-db` directory is not the data directory" below. Treat the 2026-07-27
> stamp as covering the engine question only, and as covering nothing about counts, migrations, RLS, or
> the ability to stand the database up from scratch.

> **Corrected 2026-07-28 (kept as history).** Everything above the table registry previously described
> **PGlite** — an in-process, file-based engine with "no network ports (e.g. 5432)". That was wrong, and
> it was wrong in the most damaging way: an agent ordered to read this document complete was told not to
> look for a port that the application in fact requires. That correction was verified by reading
> `apps/api/src/db/client.ts` and `apps/api/src/scripts/migrate.ts` on disk, not recalled, and it still
> holds. The note that `.agents/AGENTS.md:7` "still carries the stale PGlite claim" is itself now stale:
> that line reads `PGlite is NOT installed` as of 2026-08-06.

---

## ⚙️ Core Engine: native PostgreSQL

DENTE runs against a **normal, network-connected PostgreSQL server** (PostgreSQL **18.4** on this host,
measured 2026-08-06 with `postgres.exe --version` and confirmed by `select version()` against the live
server), reached over TCP at `127.0.0.1:5432`.

*   **Client setup (`apps/api/src/db/client.ts`, 58 lines as of 2026-08-06) — the actual code:**
    ```typescript
    import { drizzle } from "drizzle-orm/node-postgres";
    import pg from "pg";
    export const pool = new pg.Pool({ connectionString: requireDatabaseUrl() });
    export const dbRaw = drizzle(pool, { schema });
    export const db = new Proxy(dbRaw, { /* redirects to the ALS transaction if one is open */ });
    ```
*   **`db` is a Proxy, not the drizzle instance.** `dbRaw` is the plain drizzle handle; the exported `db`
    is a `Proxy` that, when an `AsyncLocalStorage` transaction is open in `transactionStorage`, forwards
    every property access to that transaction instead. This is how per-request tenant context reaches the
    same connection the RLS policies read. Import `db`, not `dbRaw`, unless you specifically need to
    escape the request's transaction — and if you think you need that, you almost certainly have a bug.
*   **`DATABASE_URL` is required and has NO default *in `client.ts`*.** `requireDatabaseUrl()` throws at
    boot if it is unset or blank. This is deliberate: a hardcoded fallback connection string used to live
    here, which violated the anti-hardcode rule and made a misconfigured app fail late, on the first
    query, with a confusing "relation does not exist" instead of failing immediately with the real cause.
*   **The second hardcoded fallback is gone too, as of 2026-08-06.** It used to live at
    `apps/api/src/scripts/migrateStateToDb.ts:16` as
    `process.env.DATABASE_URL ?? "postgres://dental:dental@…/dental_crm"`, credentials inline — worse
    there than in `client.ts`, because that script is the destructive seeder (below) and with
    `DATABASE_URL` unset it silently targeted a local database and wiped it. The seeder no longer builds
    its own pool at all: it imports `pool` from `db/client.ts` and therefore inherits
    `requireDatabaseUrl()`. One place raises the error, one place defines the target. What survives in
    that file is the clinic password, admin PIN and staff PIN defaulting to published literals — those
    are kept on purpose because the demo login, the screenshot scripts and test fixtures depend on the
    exact values, and they are now announced by a warning on every run and refused outright under
    `NODE_ENV=production`. Do not copy that pattern into new code.
*   **Env loading is not `dotenv/config`.** `loadAdditionalServerEnv()` walks up to the repo root,
    because `DATABASE_URL` lives in the ROOT `.env`, not `apps/api/.env`. `db:migrate` uses the same
    loader, so the app and the migrator always agree on the target database.
*   **`registerMoneyTypeParsers()` runs BEFORE the pool is created.** Without it, `numeric` columns
    arrive as JavaScript strings: sums concatenate instead of adding, comparisons run as text, and
    `z.number()` schemas reject valid data. See `apps/api/src/db/moneyTypeParsers.ts`. Do not remove or
    reorder that call.

### 🚫 PGlite is NOT used and NOT installed
*   `@electric-sql/pglite` appears in **no `package.json`** in this monorepo (verified 2026-07-28,
    re-verified 2026-08-06). `node_modules/@electric-sql/` exists as an **empty directory — 0 files
    recursively**. An empty scope directory is not an installation; do not read it as one.
*   `apps/api/drizzle.config.ts` **no longer declares `driver: "pglite"`** — corrected 2026-08-06. It now
    declares `dialect: "postgresql"`, calls `loadAdditionalServerEnv()`, reads `DATABASE_URL` and
    `throw`s when it is unset or blank. The previous revision of this document said the opposite and used
    it as the reason to distrust `db:generate`. That reason is gone; a different reason remains, see
    "Migrations" below.
*   `apps/api/src/services/syncEngine.ts` **was deleted from disk 2026-08-06** and no longer exists. It
    imported `@electric-sql/pglite` and `@electric-sql/pglite-sync`, neither of which is installed, so it
    could never execute (`ERR_MODULE_NOT_FOUND` on line 1). It started ElectricSQL CRDT replication of 11
    tenant tables and required a live `PGlite` handle as its argument — an argument no caller in this
    repository can construct, because the engine is native PostgreSQL 18.4. Verified before deletion: zero
    importers repo-wide, zero entries across all four `package.json` (the only `package-lock.json` mention
    is drizzle-orm's **optional** peer dependency), not matched by the test mask `src/**/*.test.ts`, and
    named in no document as a planned feature — every surviving mention describes it as dead. Three more
    files of that era — `src/scripts/patch-owner-credentials.ts`, `src/scripts/seedPglite.ts` and
    `src/scripts/setup-fresh-db.ts` — were deleted the same day on the same evidence.
*   **`apps/api/tsconfig.json` now carries no by-name exclusions at all**; only the test globs remain. All
    four PGlite-era files are gone from disk and their exclude entries went with them, because an
    exclusion naming a file that does not exist is a dangling record that sends the next agent hunting a
    phantom. `apps/api/tsconfig.tests.json` keeps `"exclude": []` — the empty array is load-bearing:
    `extends` inherits the parent's `exclude` when the child omits the key, so deleting that line would
    silently drop all 204 test files out of the types gate.

### 📁 The `dente-db` directory is NOT the data directory — it is a PGlite corpse
Root `AGENTS.md:9` and `.claude/rules/dente-database.md` describe `apps/api/dente-db` as "that server's
DATA DIRECTORY (`PG_VERSION` 18, live `postmaster.pid`)". **That is wrong**, and it is wrong in a way
that survives a casual check, because the directory really does contain a `PG_VERSION` file reading `18`.
Measured 2026-08-06:

*   `apps/api/dente-db/postmaster.pid` contains PID **`-42`** and data directory **`/pglite/data`**. Both
    are literal PGlite constants. No PostgreSQL server ever writes a negative PID or a POSIX path on
    Windows. This is a PGlite sentinel file, not a PostgreSQL pid file.
*   `apps/api/dente-db/base/` contains only OIDs `1`, `4`, `5` — `template1`, `template0`, `postgres`.
    A database named `dental_crm` has **never** existed in that directory.
*   **The real data directory is `.data/pg18`** at the repo root. Its `postmaster.pid` holds PID `13112`,
    which is the same PID `netstat` shows `LISTENING` on `127.0.0.1:5432`, and its `base/` contains OID
    `16389` in addition to the three templates. That extra OID is `dental_crm`.

So: `dente-db` is a leftover, `.data/pg18` is live. Do not cite `dente-db/postmaster.pid` as evidence of
anything, and do not point a tool at `dente-db` expecting to find data.

### 🧨 The server binaries are NOT declared anywhere — `npm ci` destroys the ability to start the database
This is an undocumented onboarding blocker and it is the single most expensive thing in this file.
Measured 2026-08-06:

*   PostgreSQL **18.4** server binaries are present locally at
    `node_modules/@embedded-postgres/windows-x64/native/bin/` — `postgres.exe`, `initdb.exe`, `pg_ctl.exe`.
    **`psql.exe` is NOT in that package.** Only the localized `psql-18.mo` message catalogs ship there, so
    a `fd psql` hit is not a client binary. To run SQL by hand, go through `node` + the `pg` package that
    the API already depends on; there is no CLI client on this host.
*   The package providing them, `embedded-postgres@18.4.0-beta.17`, is **declared in no `package.json` in
    the monorepo and does not appear in `package-lock.json`.** `npm ls embedded-postgres` reports it as
    **`extraneous`**.
*   Consequence: **`npm ci` deletes it.** `npm ci` reconstructs `node_modules` from the lockfile alone, so
    an unlocked, undeclared package does not come back. After a routine `npm ci` there is no
    `postgres.exe` on this machine and no documented way to obtain one — the database becomes
    unstartable, and nothing in the repository explains why.
*   Until someone decides whether to declare the dependency or to document an external PostgreSQL 18
    install, **do not run `npm ci` on this host** without first confirming you can restore the server.
    `npm install` is the safe form; it leaves extraneous packages alone.

---

## 🚀 Migrations

**The real migration runner is custom: `apps/api/src/scripts/migrate.ts`.** It reads `apps/api/drizzle/*.sql`
in numeric order, applies each in **its own transaction**, and records the filename plus a **sha256
checksum** in the ledger table **`_dente_migrations`**.

```bash
npm run db:migrate                  # apply pending migrations
npm run db:migrate:check            # dry run — show what WOULD be applied, change nothing
npm run db:migrate:baseline         # mark all files as applied (for an already-provisioned database)
npm run db:migrate -- --strict      # treat a changed checksum on an applied migration as an error
```

*   **Still hand-write migration SQL, but not for the reason this document used to give.** The old reason
    — "`drizzle.config.ts` still targets the PGlite driver" — is obsolete; the config is correct now.
    The reason that survives is that the drizzle journal does not describe this repo's migration set and
    the runner does not read it (see next bullet).
*   **`apps/api/drizzle/meta/_journal.json` is partially, not totally, out of sync — the old "matches
    ZERO filenames" claim was wrong.** Measured 2026-08-06: the journal holds **34 entries**, of which
    **17 match a real `.sql` file by name** — including every RLS migration (`0157`, `0158`, `0159`) and
    the newest, `0160`. The remaining **17 tags have no file**, and **113 `.sql` files are absent from the
    journal**. So it is a stale minority index, not a dead file. Two practical consequences: do not
    "clean up" the journal on the assumption that nothing in it is real, and do not treat presence in the
    journal as proof a migration exists. **The runner ignores the journal entirely** — it globs
    `apps/api/drizzle/*.sql` and sorts on the leading ordinal. The `.sql` file on disk is the source of
    truth.
*   **Current state, measured 2026-08-06 and moving:** **130 `.sql` files**, highest ordinal **`0160`**,
    **123 distinct ordinals**, and **seven duplicated ordinals** — `0011`, `0012`, `0013`, `0119`, `0120`,
    `0124`, `0128`. The ordinal space is not contiguous (there are gaps from `0015` onward). The previous
    revision said "90 files, `0000`–`0013` then `0061`–`0132`, four duplicates"; every one of those four
    numbers is now wrong. **Check the real maximum with `fd` before choosing a new number, and do not
    assume the count equals the highest ordinal.** This line rots faster than any other in the document:
    `0160` landed while this revision was being written.
*   **The SQL splitter is the thing that used to break a clean rollout.** `statementsOf()` in
    `apps/api/src/scripts/migrate.ts` once cut files on bare `;`, ignoring comments and dollar quoting,
    which detonated on any migration containing a `DO $$ … $$` block or a semicolon inside a comment.
    As of 2026-08-06 the splitting logic lives in `apps/api/src/scripts/sqlStatements.ts` (239 lines,
    comment-aware and dollar-quote-aware, deliberately kept out of `migrate.ts` because that module runs
    `main()` at import time). Transactional migrations are split on drizzle's `statement-breakpoint`
    marker; only the `--no-transaction` path goes through the general splitter. **This file was being
    edited by another agent on 2026-08-06 — read it before quoting its behaviour.**
*   **A migration is complete only as `.sql` + ledger entry + proof against the database**
    (`.agents/AGENTS.md` §8b). Run `db:migrate:check` before `db:migrate`, and quote both.
*   **Ledger state 2026-08-06:** `_dente_migrations` holds **130 rows** against **130 `.sql` files** — the
    full chain is applied to the live `dental_crm`. An earlier reading the same day showed the ledger
    stuck at 103 of 129 with `db:migrate` exiting 1 on `0134`; that was the splitter defect above, and it
    is resolved. If you see a partial ledger, suspect the splitter before suspecting the SQL.

### Seeding / reset
```bash
npm run db:reset-seed               # npx tsx apps/api/src/scripts/migrateStateToDb.ts
```

> **🚨 THE SAFETY GATE NOW EXISTS. Implemented 2026-08-06, and this block replaces the "no gate"
> correction written earlier the same day.** That earlier correction was accurate when written: the
> documented `DENTAL_ALLOW_DESTRUCTIVE_DB_RESET` variable was read by nothing, and `clearDatabase()`
> issued 21 unconditional `db.delete()` calls at `migrateStateToDb.ts:63`. The gate is now real code.
>
> **What guards the command today** (`apps/api/src/scripts/migrateStateToDb.ts`):
> * The whole seed runs inside ONE transaction with `app.current_tenant` set to the organization from
>   the state file, so the clear is **scoped to that tenant** — measured: `DELETE FROM patients` removes
>   2 rows of 2 under `app.superuser_bypass`, 1 of 2 under a tenant context, 0 of 2 with no context at
>   all. Other clinics' rows are outside what the seeder can see or delete.
> * Row counts of every affected table are printed **before** anything is deleted.
> * **Empty tenant → no gate.** Nothing is destroyed, so a first deployment on a clean machine needs no
>   extra variable. Zero friction there is deliberate.
> * **Non-empty tenant → `DENTAL_ALLOW_DESTRUCTIVE_DB_RESET="YES"` is required.** Without it the script
>   exits 1, prints the counts and rolls back; verified — 22 rows counted, 22 rows still present after
>   the refusal.
> * **`NODE_ENV=production` → refused unconditionally**, flag or no flag, both when the tenant holds
>   rows and when any of `CLINIC_LOGIN` / `CLINIC_PASSWORD` / `ADMIN_PIN` / `STAFF_PIN` falls back to
>   its published default.
>
> **What is still true and still load-bearing:** the command is destructive by design. It deletes 22
> tables' worth of one tenant's rows — telegram receipts, webhook events, chat links, link codes, bot
> configs, communication events/tasks/templates, payments, generated documents, clinical rules,
> treatment scenarios, treatment items, service catalog, visits, appointments, patient consents,
> patients, chairs, users, clinics, organizations. The hardcoded `DATABASE_URL` fallback at line 16 is
> gone: the script now takes its pool from `db/client.ts`, which throws when `DATABASE_URL` is unset, so
> an unset environment no longer silently targets a local database. **Still: do not point it at a
> database you care about.**

---

## 📋 Core Table Registry & Modular Domain Schema (`apps/api/src/db/schema/`)

> **Re-measured 2026-09-10 (Wave 93):**  
> `apps/api/src/db/schema.ts` is a **7-line proxy** re-exporting `apps/api/src/db/schema/index.ts`.
> The schema is organized into **20 domain-driven modules** in `apps/api/src/db/schema/`, declaring **209 `pgTable`** definitions (measured 2026-09-10 with ripgrep across all schema files; including Wave 93 clinical additions: `periodontogram.ts`, `treatmentConsumables.ts`, and `patientRelationships`).
>
> For the complete HTTP endpoint mapping to these tables, see **[API_ROUTES_CATALOG.md](file:///C:/Clinic_MVP/dental-crm/.agents/API_ROUTES_CATALOG.md)** (771+ endpoints with RBAC, Zod schemas, and DB table lineage).

### 🧩 Domain Schema Modules (`apps/api/src/db/schema/*.ts`)
1. **`auth.ts`** (6 tables): `organizations`, `clinics`, `users`, `userInvitations`, `portalOtpCodes`, `clinicWorkflows`.
2. **`patients.ts`** (20 tables): `patients`, `patientConsents`, `recentPatientHistory`, `patientServiceLineages`, `lostPatientsFilters`, `familyGroups`, `familyRecommendationSources`, `patientDuplicateMergeQueues`, `patientTaskTickets`, `patientReclamations`, `patientArchiveReasons`, `patientArchiveReasonsAndBlacklists`, `loyaltyPrograms`, `patientBonusBalances`, `bonusTransactions`, `referralCampaigns`, `patientReferralCodes`, `patientReferrals`, `patientDrugAllergies`, `patientRelationships`.
3. **`schedule.ts`** (16 tables): `chairs`, `appointments`, `cancellationReasonsTwoLevel`, `quickAppointmentConfirmations`, `urgentScheduleRequests`, `confirmationPerformanceReports`, `scheduleClipboardItems`, `scheduleTimeReservations`, `rebookingConversionRules`, `singleSessionEnforcements`, `appointmentWaitlists`, `clinicChairs`, `appointmentChannelInheritances`, `externalScheduleActionLogs`, `yandexCalendarSyncs`, `doctorShiftRosters`.
4. **`billing.ts`** (13 tables): `payments`, `patientInvoices`, `invoiceItems`, `cashLedger`, `cashShifts`, `shiftDiscrepancyReports`, `sbpQrTransactions`, `fiscalReceiptQueue`, `paymentInstallments`, `installmentTranches`, etc.
5. **`clinical.ts`** (47 tables): `diagnoses`, `clinicalRules`, `treatmentPlans`, `treatmentPlanStages`, `treatmentPlanItems`, `visitDiaries`, `signedOutpatientCards`, `anesthesiaLogs`, `implantPassports`, `dentalLabOrders`, `pharmacologyCatalog`, `prescriptions`, `orthodonticCases`, etc.
6. **`imaging.ts`** (13 tables): `attachments`, `imagingStudies`, `aiJobs`, `imagingSeries`, `imagingInstances`, `imagingAnnotations`, `xrayScans`, `imagingViewerSessions`, `dicomWorkbenchBundles`, `patientCtPlannings`, `bulkImageOperationLogs`, `diagnocatAiFindings`, `diagnocatReports`.
7. **`inventory.ts`** (13 tables): `inventoryItems`, `warehouses`, `stockBatches`, `inventoryTransactions`, `procedureMaterialRules`, `procedureTechCards`, `procedureTechCardItems`, `sterilizationLogs`, `preSterilizationCleaningLogs`, `autoclaveDailyTests`, `inventoryTransfers`, `inventoryTransferItems`, `mdlpItems`.
8. **`sanpin.ts`** (8 tables): `sterilizerEquipments`, `bactericidalEquipments`, `bactericidalIrradiatorLogs`, `generalCleaningLogs`, `medicalWasteLogs`, `emergencyBiohazardLogs`, `temperatureHumidityEquipments`, `temperatureHumidityLogs`.
9. **`finance_v2.ts`** (8 tables): `cashBoxes`, `cashBoxShifts`, `cashExpenseReasons`, `cashOperations`, `installmentContracts`, `installmentTranches`, `doctorPaymentRewards`, `doctorPayrollStatements`.
10. **`documents_v2.ts`** (3 tables): `documentTemplateCategories`, `documentTemplates`, `documentTemplateVariables`.
11. **`outpatientCore.ts`** (7 tables): `clinicalTeethCatalog`, `toothDefectsCatalog`, `mkbCategories`, `patientToothDefects`, `outpatientTemplateCategories`, `outpatientTemplates`, `outpatientVerifications`.
12. **`communications.ts`** (28 tables): `communicationEvents`, `communicationTasks`, `messageTemplates`, `outboundMessageQueue`, `smsGateways`, `chatDialogs`, `chatMessages`, `telegramLinkCodes`, `telegramBotConfigs`, etc.
13. **`crm_leak_detector.ts`** (1 table): `crmLeakDetectorConfigs`.
14. **`sync.ts`** (2 tables): `syncIdempotencyRecords`, `syncEntityVectors`.
15. **`copilot.ts`** (4 tables): `copilotSessions`, `copilotMessages`, `copilotAlerts`, `copilotFeedback`.
16. **`rag.ts`** (1 table): `clinicalKnowledgeEmbeddings`.
17. **`aiTelemetry.ts`** (1 table): `aiPromptLogs`.
18. **`system.ts`** (12 tables): `auditEvents`, `systemSettings`, `backgroundJobs`, `featureFlags`, `branchOffices`, `backupLedger`, etc.
19. **`periodontogram.ts`** (3 tables): `periodontogram_snapshots`, `periodontogram_teeth`, `periodontogram_sites` (ADR 0013, реляционная пародонтограмма).
20. **`treatmentConsumables.ts`** (2 tables): `treatment_consumables`, `treatment_consumable_logs` (автосписание расходников по 804н).

### 🧭 Core Orientation Tables
| Table Name | Description | Key Fields / Relations |
| :--- | :--- | :--- |
| `organizations` | Tenant organizations (clinics group) | `id`, `name`, `loginId`, `passwordHash` |
| `clinics` | Individual physical clinic addresses | `id`, `organizationId` (ref `organizations`) |
| `users` | Staff members (doctors, admins, owners) | `id`, `role`, `pinCodeHash` (auth by pin code) |
| `patients` | Patient directory | `id`, `phone`, `firstName`, `lastName`, `status` |
| `appointments` | Scheduled patient visits on chairs | `id`, `patientId`, `clinicId`, `status` |
| `visit_diaries` | Medical diaries written by doctors | `id`, `patientId`, `visitStatus` (`draft` \| `signed`) |
| `payments` | Financial transactions recorded | `id`, `patientId`, `amount`, `paymentMethod` |
| `patient_invoices` | Patient bills generated for services | `id`, `patientId`, `totalAmount`, `status` |
| `treatment_plans` | Global dental treatment plans | `id`, `patientId`, `title` |
| `inventory_items` | Warehouse material stock catalog | `id`, `name`, `stockQuantity`, `category` |
| `sterilization_logs`| SanPiN sterilization pouch records | `id`, `barcode`, `cycleNumber`, `result` |
| `imaging_studies` | DICOM/imaging metadata linked to patients | `id`, `patientId`, `studyInstanceUid` |
| `crm_leads` | Marketing / incoming request funnel leads | `id`, `phone`, `status`, `organizationId` |

---

## 🔒 Row-Level Security — live, enforced, and load-bearing (measured 2026-08-06)

RLS is not a plan in this repo; it is deployed and it is doing work. Inventory taken by querying
`dental_crm` directly on 2026-08-06:

| Measure | Value |
| :--- | :--- |
| Tables in `public` | 148 |
| With `rowsecurity` | 147 |
| With `relforcerowsecurity` | 147 |
| Policies in `public` | 147 (all named `tenant_isolation`, all `FOR ALL`, all `TO public`) |
| Policies with a NULL `WITH CHECK` | **0** |
| Only table outside the perimeter | `_dente_migrations` (the runner's own ledger — correct, it has no tenant) |

**Why `FORCE ROW LEVEL SECURITY` is the whole ballgame here.** The application connects as role `dental`.
That role is **not** a superuser and does **not** hold `BYPASSRLS` — but it **owns all 148 tables**. In
PostgreSQL a table owner is exempt from that table's policies unless `FORCE ROW LEVEL SECURITY` is set.
So on this deployment, `ENABLE ROW LEVEL SECURITY` alone would have been decorative: the one role that
ever connects would have bypassed every policy. `FORCE` is what makes the policies apply to it. If you
add a table, `ENABLE` without `FORCE` gives you nothing. Migration `0159` exists for exactly this.

**How the tenant reaches the policy.** `apps/api/src/db/rls.ts` opens a transaction and issues
`set_config('app.current_tenant', <organizationId>, …)` on entry, on the same connection, so every
subsequent statement in that transaction is filtered. The exported `db` Proxy in `client.ts` is what
routes ORM calls onto that transaction. A query issued outside a tenant context sees
`current_setting('app.current_tenant', true) = ''`, which `NULLIF` turns into `NULL`, and the comparison
yields no rows — fail-closed, not fail-open.

**The read and write rules are deliberately asymmetric — read this before you use the bypass.** The
`USING` clause accepts an escape hatch: `current_setting('app.superuser_bypass', true) = 'on'` disables
the row filter for reads. The `WITH CHECK` clause has **no such escape**. Consequence: even with the
bypass enabled, an `INSERT` or `UPDATE` must still land inside the current tenant. You can read across
tenants with the bypass; you cannot write across them. Do not "fix" that asymmetry — it is the design.

**Perimeter history, so nobody re-litigates it.** Migrations `0157` (enable + policies), `0158`
(superuser bypass) and `0159` (force + write check) established the perimeter. Seven tables were left
outside it and a cross-tenant read leak was reproduced against them: `patient_anamnesis`,
`signed_outpatient_cards`, `cash_ledger`, `payment_installments`, `ztl_lab_orders`, `doctor_assistants`,
`ingested_patients_mapping`. Migration `0160_rls_perimeter_orphan_tables.sql` closed them; all seven now
report `rowsecurity=true`, `forcerowsecurity=true` and one policy each. Note that tables without their own
`organization_id` are covered by a subquery through their parent — `cash_ledger` joins to
`patient_invoices`, for example — so "no `organization_id` column" is not a reason to skip a table.

> **НЕ ПРОВЕРЕНО в этой ревизии:** an 11-scenario cross-tenant isolation run reported 11/11 passing, and
> a control showing an owner reading 2 of 2 rows without `FORCE` and 1 of 2 with it. Those были measured
> by another agent; this revision re-verified the *inventory* above and the role/ownership facts, not
> that experiment. The PostgreSQL owner-exemption semantics it relies on are documented behaviour, but
> the run itself is not reproduced here.

**When you add a table, RLS is part of the migration, not a follow-up.** `ENABLE ROW LEVEL SECURITY`,
`FORCE ROW LEVEL SECURITY`, and a `tenant_isolation` policy with both `USING` and `WITH CHECK`. A table
that ships without them is a tenant leak, and 0160 is the receipt for what that costs.

---

## 🚨 Database Rules for Agents

1.  **Drizzle types:** use `eq`, `and`, `or`, `ilike` from `drizzle-orm` rather than raw SQL strings
    wherever possible. Never build a `WHERE` clause by string-interpolating ids.
2.  **Explicit organization gating:** every query MUST filter by `organizationId` (except global tenant
    authentication), or data leaks between clinics. This rule survived the engine correction unchanged
    and is the most frequently violated rule in this repo. **RLS is a second line of defence, not a
    replacement for it** (see the RLS section above): the policies only bind inside a transaction that
    has set `app.current_tenant`, and `USING` still honours `app.superuser_bypass`. Write the
    `organizationId` filter anyway.
3.  **Money:** amounts are exact to the kopeck (`.agents/AGENTS.md` §8b). Check the column type before
    writing money code — the repo has been migrating integer-rouble columns toward kopeck precision
    (`apps/api/drizzle/0131_payments_amount_kopecks.sql`), so different tables may not agree yet.
    Confirm the live column type instead of assuming either representation.
4.  **Read-only tables are a known defect class, not a feature.** A number of `db/*Query.ts` modules are
    one-function SELECTs against tables that **nothing ever writes to**, so they return empty forever
    and the widgets above them render empty forever. Before building on such a module, grep for
    `db.insert(` on its table. If there is no writer, the honest options are to make it real or to
    delete it — never to ship a panel that cannot ever have data.
    *The previous revision said "roughly 65 modules". Measured 2026-08-06: `fd -g '*Query.ts'` finds
    **26 files** under `apps/api/src`, five of which are `.test.ts` — about 21 modules. Either the 65 was
    counting exported functions rather than files, or it was never measured. The defect class is real;
    the number was not re-derivable, so do not quote it. Count before you cite.*
5.  **Never run `db:reset-seed` against a database you care about.** It is destructive by design. Since
    2026-08-06 it does have real protection — the clear is scoped to one tenant, a non-empty tenant
    requires `DENTAL_ALLOW_DESTRUCTIVE_DB_RESET="YES"`, and `NODE_ENV=production` is refused
    unconditionally — but protection is not permission. See "Seeding / reset" above.
