# Dente Integration Test DB Mock Eradication & Refactoring Plan

## Overview
Perform an automated audit and refactoring of Dente API integration tests in `apps/api/src/**/*.test.ts` to completely eradicate database mocks (`t.mock.method(db, ...)` or `global.fetch` DB mocks) and replace them with real PostgreSQL 18 database fixtures (`withFixtureTenant`, `withSuperuserBypass`). Ensure strict organization ID isolation (`fixtureUuid("audit", testIndex++)`) for audit logging tests to avoid `organizations_pkey` primary key collisions.

## Stages & Milestones

### Stage 1: Codebase Survey & Mock Census (M0)
- **Goal**: Identify all test files in `apps/api/src/**/*.test.ts` containing database query mocks or network mocks.
- **Completed**: Identified 13 test files grouped into 4 milestone clusters (M1-M4).

### Stage 2: Implementation & Refactoring (M1-M4)
- **M1 (Auth & Tenant Routes)**: `routes/auth.test.ts`, `routes/imports.test.ts` — DONE (38/38 tests pass).
- **M2 (Clinical, Imaging & Patient Suites)**: `dicomweb.test.ts`, `imaging.test.ts`, `clinical.test.ts`, `clinicalRuleDelete.test.ts`, `clinicalQuery.test.ts` (x2), `patientsQuery.test.ts` — DONE (56/56 tests pass).
- **M3 (Billing & Finance Queries)**: `billingQuery.test.ts` — DONE (8/8 tests pass).
- **M4 (Background Workers & Triggers)**: `notificationWorker.test.ts`, `biAnalyticsWorker.test.ts`, `postOpCareTrigger.test.ts` — DONE (10/10 tests pass).

### Stage 3: Milestone M5 Final Gate Verification
- **Goal**: Multi-agent verification gate to independently verify:
  1. Full API test suite execution: `npm run test -w @dental/api` (or running all 13 test files with poolTeardown).
  2. Static DB mock census check: `rg "mock\.method\(db"` returns 0 database query mock occurrences across `apps/api/src`.
  3. TypeScript compilation: `npm run typecheck -w @dental/api` returns 0 errors.
  4. Forensic audit (`teamwork_preview_auditor`): verify 100% genuine PostgreSQL database interactions, zero facade/hardcode cheating, and proper unique UUID fixture isolation under FORCE RLS.
- **Subagents to Dispatch**:
  - 2 Reviewers (`teamwork_preview_reviewer`): `reviewer_m5_1`, `reviewer_m5_2`
  - 2 Challengers (`teamwork_preview_challenger`): `challenger_m5_1`, `challenger_m5_2`
  - 1 Forensic Auditor (`teamwork_preview_auditor`): `auditor_m5_1`

### Stage 4: Synthesis & Final Reporting
- **Goal**: Collect verdicts, verify all Reviewers APPROVE, all Challengers APPROVE, Auditor CLEAN. Compile final project report and notify parent/Sentinel via `send_message`.

