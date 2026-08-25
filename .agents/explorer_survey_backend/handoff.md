# 📋 Handoff Report: Backend Architecture Survey (R1 / TASK-1.3 & R2 / TASK-2.1–2.3)

**Author:** teamwork_preview_explorer  
**Working Directory:** `C:/Clinic_MVP/dental-crm/.agents/explorer_survey_backend`  
**Date:** 2026-08-16  
**Status:** Complete (Hard Handoff)  
**Target Milestone:** Backend Architecture & Decomposition Roadmap  

---

## 1. Observation

Direct observations and evidence gathered during the codebase investigation:

1. **Monolithic Schema Complexity (`apps/api/src/db/schema.ts`):**
   - Total lines: **6,346 lines** (measured via `powershell (Get-Content apps/api/src/db/schema.ts).Length`).
   - Entities count: **150** `pgTable` definitions (lines 379 to 6305), **47** `pgEnum` definitions (lines 42 to 4939), and **7** `relations` definitions (lines 5343 to 5423).
   - Database client in `apps/api/src/db/client.ts` line 96: `export const dbRaw = drizzle(pool, { schema });`.

2. **Fiscal Receipt & Payment Flow (`apps/api/src/routes/sbpQr.ts`, `apps/api/src/routes/billing.ts`, `apps/api/src/db/billingQuery.ts`):**
   - `sbpQr.ts` lines 232–564 (`POST /api/billing/fiscalize-receipt`): Performs synchronous in-memory calculation of fiscal tags (1054, 1055, 1008, 1021, 1031, 1081, 1215, items with 1212, 1214, 1199, 2108), executes a single `db.transaction` inserting `payments` (lines 387–440) and updating `generatedDocuments` (lines 469–479).
   - Currently, there is no `fiscal_receipt_queue` table in the database; physical KKT timeouts or hardware disconnects have no fallback persistence layer.
   - Migrations ledger: Highest migration index in `apps/api/drizzle/` is `0170_schedule_4d_exclusion_hardening.sql`. Next sequential migration index is `0171`.

3. **Fat Routes & Embedded Business Logic:**
   - `apps/api/src/routes/imaging.ts`: **9,598 lines** (340 KB). Route definitions (`registerImagingRoutes`) start only at line 8,717. Lines 1–8,716 contain DICOM binary stream parsing, tag decoding, MPR coordinate transforms, render cache planning, 3D surface model loading, and local folder file watchers.
   - `apps/api/src/routes/smartImports.ts`: **8,512 lines** (312 KB). Route definitions start only at line 7,930. Lines 1–7,929 contain parsing engines for D4W, IDENT, InfoDent, 1C Dental, Cyrillic encoding repair, and multi-tenant reconciliation logic.
   - `apps/api/src/routes/diary.ts`: **2,317 lines** (99 KB). Route definitions start at line 924. Lines 1–923 contain SOAP protocol validation, deterministic SHA-256 canonical digest builder for UKEP / PEP signatures, revision diffing, and inventory auto-deduction calculators.

4. **Background Workers & Scheduling:**
   - `apps/api/src/services/backupWorker.ts` lines 685–716: Uses Node.js `setInterval` (24h default) with an unref'd timer.
   - `apps/api/src/services/biAnalyticsWorker.ts` lines 625–635: Uses `setInterval` (1h) and `setTimeout(5000)`.
   - `apps/api/src/services/recallScheduler.ts` line 103: Contains `RecallScheduler.processOsteointegrationRecalls` which is only invoked in unit tests and has no running daemon in `server.ts`.

---

## 2. Logic Chain

1. **Fiscal Print Buffer (TASK-1.3):**
   - *Premise:* Financial integrity requires that money collection is never cancelled due to peripheral printer failure.
   - *Inference:* The creation of `payments` and insertion into `fiscal_receipt_queue` (`status: 'pending_print'`) must occur within the same ACID transaction.
   - *Inference:* Physical dispatch to the KKT printer must occur asynchronously outside the transaction lock. A hardware timeout or paper jam will update `fiscal_receipt_queue.status` to `'hardware_offline'` without rolling back the payment record.
   - *Inference:* Adding `GET /api/billing/fiscal-queue/pending` and `POST /api/billing/fiscal-queue/:id/retry` allows cashiers to inspect and retry failed print jobs immediately once the hardware issue is resolved.

2. **Schema Decomposition (TASK-2.1):**
   - *Premise:* A 6,346-line schema file increases merge conflicts and compilation overhead.
   - *Inference:* Partitioning 150 tables into 10 domain files (`auth.ts`, `patients.ts`, `schedule.ts`, `billing.ts`, `clinical.ts`, `imaging.ts`, `inventory.ts`, `communications.ts`, `system.ts`, `_common.ts`) matches the domain boundary map in `docs/architecture/SYSTEM_AUDIT_AND_DEBT_SPEC.md`.
   - *Inference:* Re-exporting all domain schemas in `apps/api/src/db/schema/index.ts` preserves 100% backward compatibility for existing query builders across `apps/api`.

3. **Service Layer Extraction (TASK-2.2):**
   - *Premise:* Fastify route handlers exceeding 8,000 lines violate separation of concerns and prevent isolated unit testing.
   - *Inference:* Extracting pure algorithmic logic into dedicated service classes under `apps/api/src/services/` (e.g. `DicomParserService`, `DicomMprPlannerService`, `SmartPricelistImportService`, `DiarySigningCeremonyService`) isolates protocol parsing from HTTP request lifecycle.

4. **PostgreSQL Background Jobs Queue (TASK-2.3):**
   - *Premise:* In-process `setInterval` fails on node restarts and duplicates execution when horizontal replicas are added.
   - *Inference:* Introducing `system_background_jobs` with `SELECT ... FOR UPDATE SKIP LOCKED` guarantees atomic job claiming across $N$ instances with zero lock contention.
   - *Inference:* Transitioning `backupWorker`, `biAnalyticsWorker`, and `recallScheduler` to scheduled jobs ensures fault tolerance and automatic crash recovery.

---

## 3. Caveats

1. **Drizzle Migration Journal Sequencing:**
   - Any new migration (e.g. `0171_fiscal_receipt_queue.sql`) must be sequentially registered in `apps/api/drizzle/meta/_journal.json` to prevent migration journal collisions.
2. **Multi-Tenancy Isolation (`organization_id`):**
   - Every table in `fiscal_receipt_queue` and `system_background_jobs` (except global system tasks) must enforce non-null `organization_id` foreign keys with cascade deletion and indexation.
3. **KKT Hardware Driver Interfaces:**
   - While the queue stores the standard FFD 1.2 payload JSON, physical transmission requires local bridge support (e.g. Atol Web Server / KKT driver wrapper). The queue is agnostic to the transport layer.

---

## 4. Conclusion

- The architectural designs for R1 (TASK-1.3) and R2 (TASK-2.1, TASK-2.2, TASK-2.3) are completely analyzed, specified, and mapped against the existing codebase.
- The 150 tables of `schema.ts` have been categorized into 10 domain sub-modules without data loss or circular dependencies.
- Detailed migration requirements, SQL DDL, Fastify endpoint contracts, and service class blueprints have been recorded in `analysis.md`.
- Implementation teams can proceed with execution following the roadmap in `docs/AgentTasks/TASK_BACKLOG_AND_SPECIFICATIONS.md`.

---

## 5. Verification Method

Independent verification steps to validate these findings:

1. **Verify Line Counts & Schema Complexity:**
   ```powershell
   powershell -Command "(Get-Content apps/api/src/db/schema.ts).Length"
   # Confirms 6,346 lines
   rg "export const \w+ = pgTable" apps/api/src/db/schema.ts | Measure-Object -Line
   # Confirms 150 tables
   ```

2. **Verify Route Sizes:**
   ```powershell
   powershell -Command "(Get-Content apps/api/src/routes/imaging.ts).Length; (Get-Content apps/api/src/routes/smartImports.ts).Length; (Get-Content apps/api/src/routes/diary.ts).Length"
   # Confirms 9,598 lines, 8,512 lines, 2,317 lines
   ```

3. **Verify Existing Migrations:**
   ```powershell
   powershell -Command "Get-ChildItem apps/api/drizzle | Sort-Object Name -Descending | Select-Object -First 5"
   # Confirms 0170 is the latest migration index
   ```

4. **Verify TypeScript & Test Baselines:**
   ```bash
   npm run typecheck
   node --import tsx --test apps/api/src/tests/e2e/tier1-feature-coverage.test.ts
   ```
