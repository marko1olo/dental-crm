## 2026-08-16T19:53:13+04:00
Autonomous execution of the Dental CRM (DENTE) engineering roadmap according to the formal architectural specifications and task backlog defined in `docs/architecture/SYSTEM_AUDIT_AND_DEBT_SPEC.md` and `docs/AgentTasks/TASK_BACKLOG_AND_SPECIFICATIONS.md`.

Working directory: `C:/Clinic_MVP/dental-crm`
Orchestrator working directory: `C:/Clinic_MVP/dental-crm/.agents/orchestrator_r13`

### Mission Scope:
1. R1. Offline 54-FZ KKT Fiscal Print Buffer (TASK-1.3)
   - Implement `fiscal_receipt_queue` table in Drizzle schema and database migration.
   - In `apps/api/src/routes/sbpQr.ts` and `apps/api/src/routes/billing.ts`, register all receipts in `pending_print` state before physical printing.
   - Handle physical KKT hardware timeouts gracefully (transitions to `hardware_offline` without rolling back financial transaction).
   - Provide `GET /api/billing/fiscal-queue/pending` and retry dispatch endpoint.

2. R2. Backend Drizzle Schema & Clean Service Modularization (EPIC-2)
   - TASK-2.1: Decompose monolithic `apps/api/src/db/schema.ts` into 10 domain sub-modules under `apps/api/src/db/schema/` with 100% backward-compatible root re-exports in `apps/api/src/db/schema/index.ts`.
   - TASK-2.2: Extract domain services from fat routes (`imaging.ts`, `smartImports.ts`, `diary.ts`) into dedicated service classes under `apps/api/src/services/`.
   - TASK-2.3: Implement PostgreSQL-backed task queue (`system_background_jobs`) with `SELECT ... FOR UPDATE SKIP LOCKED` single-runner guarantees, replacing in-memory `setInterval` loops.

3. R3. Frontend God-Hook & CSS Modular De-monolithization (EPIC-3)
   - TASK-3.1: Decompose `useAppLogic.tsx` into 8 focused domain hooks under `apps/web/src/hooks/domains/`.
   - TASK-3.2: Refactor `App.tsx` and eliminate state collisions across the 7 Zustand stores and URL routing.
   - TASK-3.3: Decompose legacy monolithic rules in `apps/web/src/styles/main.css` into component-scoped `.css` modules.
   - TASK-3.4: Finalize architectural specification for WebGL 3D MPR volumetric CT rendering in `docs/architecture/DICOM_3D_MPR_SPEC.md`.

### Acceptance Criteria & Quality Gates:
- `npm run check:encoding` reports 0 issues (UTF-8 valid).
- `node scripts/check-css-tokens.mjs` reports 0 unresolved CSS tokens.
- `node scripts/check-applogic-stub-overrides.mjs` confirms 0 stub property conflicts.
- `npm run typecheck` passes with 0 errors across `@dental/shared`, `@dental/api`, and `@dental/web`.
- 4-Tier E2E test suite (115/115 tests) passes with exit code 0.
- Every modified file committed individually per Mandate 8b and pushed to `origin/main`.
- Absolute Zero Mocks.
