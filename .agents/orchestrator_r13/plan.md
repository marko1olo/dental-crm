# Engineering Plan: Autonomous Dental CRM Roadmap Execution

## Phase 0: Survey & Codebase Census
- [x] Create orchestrator metadata directory and briefing/plan files.
- [ ] Dispatch 3 Explorers / Spec Miners:
  - `explorer_survey_1`: Survey Backend Architecture & Schema (Examine `apps/api/src/db/schema.ts`, `apps/api/src/db/schema/`, routes `sbpQr.ts`, `billing.ts`, `imaging.ts`, `smartImports.ts`, `diary.ts`, workers `backupWorker.ts`, `biAnalyticsWorker.ts`, `recallScheduler.ts`, migrations status, and PostgreSQL background jobs queue design).
  - `explorer_survey_2`: Survey Frontend Monoliths & Styles (Examine `apps/web/src/useAppLogic.tsx`, `apps/web/src/hooks/domains/`, `apps/web/src/App.tsx`, `apps/web/src/styles/main.css`, CSS tokens scripts, stub override scripts, and Zustand stores).
  - `explorer_survey_3`: Survey Specifications & Test Infrastructure (Examine `docs/architecture/SYSTEM_AUDIT_AND_DEBT_SPEC.md`, `docs/AgentTasks/TASK_BACKLOG_AND_SPECIFICATIONS.md`, `docs/architecture/DICOM_3D_MPR_SPEC.md`, and the 4-tier test suites).
- [ ] Synthesize Survey findings into `PROJECT.md`.

## Phase 1: Milestone 1 — Offline 54-FZ KKT Fiscal Print Buffer (TASK-1.3)
- [ ] Dispatch Worker to implement `fiscal_receipt_queue` table in Drizzle schema, migration, `sbpQr.ts` / `billing.ts` integration, timeout handling (`hardware_offline`), and `GET /api/billing/fiscal-queue/pending` endpoint.
- [ ] Run Reviewers (2) + Challengers (2) + Forensic Auditor (1).
- [ ] Verify gates & individual git commit per Mandate 8b.

## Phase 2: Milestone 2 — Backend Drizzle Schema Modularization & Jobs Queue (TASK-2.1, TASK-2.3)
- [ ] Dispatch Worker to decompose `schema.ts` into 10 domain files in `apps/api/src/db/schema/` with 100% backward-compatible root re-exports in `index.ts`.
- [ ] Implement `system_background_jobs` with `SELECT ... FOR UPDATE SKIP LOCKED` single-runner guarantees in `backupWorker.ts`, `biAnalyticsWorker.ts`, `recallScheduler.ts`.
- [ ] Gate verification: typecheck, review, challenger, auditor. Commit per Mandate 8b.

## Phase 3: Milestone 3 — Backend Fat Route Service Extraction (TASK-2.2)
- [ ] Extract clean domain service classes from `imaging.ts`, `smartImports.ts`, `diary.ts` under `apps/api/src/services/`.
- [ ] Gate verification: typecheck, review, challenger, auditor. Commit per Mandate 8b.

## Phase 4: Milestone 4 — Frontend God-Hook & App.tsx De-monolithization (TASK-3.1, TASK-3.2)
- [ ] Extract 8 domain hooks under `apps/web/src/hooks/domains/` from `useAppLogic.tsx` (preserving all returned properties and avoiding conflicts with `check-applogic-stub-overrides.mjs`).
- [ ] Refactor `App.tsx` and eliminate state collisions across the 7 Zustand stores.
- [ ] Gate verification: typecheck, tests, check-applogic-stub-overrides.

## Phase 5: Milestone 5 — CSS Modularization & DICOM 3D MPR Spec (TASK-3.3, TASK-3.4)
- [ ] Decompose monolithic rules from `apps/web/src/styles/main.css` into component-scoped `.css` modules.
- [ ] Verify 0 unresolved CSS tokens via `node scripts/check-css-tokens.mjs`.
- [ ] Finalize `docs/architecture/DICOM_3D_MPR_SPEC.md`.
- [ ] Gate verification: encoding, css tokens, review, challenger, auditor.

## Phase 6: Milestone 6 — Complete E2E 4-Tier Verification & Monorepo Hardening
- [ ] Run and verify 4-tier E2E test suites (115/115 tests passing).
- [ ] Verify zero mocks, zero mojibake (`npm run check:encoding`), full typecheck across all workspaces.
- [ ] Commit all modified files per Mandate 8b and push to `origin/main`.
- [ ] Final comprehensive report.
