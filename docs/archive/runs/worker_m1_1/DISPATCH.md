# DISPATCH — Worker Milestone M1 (Auth & Tenant Routes Refactoring)

## Role
teamwork_preview_worker

## Working Directory
C:\Clinic_MVP\dental-crm\.agents\worker_m1_1

## Task
Refactor `apps/api/src/routes/auth.test.ts` and `apps/api/src/routes/imports.test.ts` to completely eradicate all database mocks (`mock.method(db, ...)`, `t.mock.method(db, ...)`) and replace them with real PostgreSQL 18 fixture data using `withFixtureTenant`, `withSuperuserBypass`, `fixtureUuid`, and `purgeFixtureOrganizations`.

## File Ownership
- `apps/api/src/routes/auth.test.ts` (EXCLUSIVE WRITE ACCESS)
- `apps/api/src/routes/imports.test.ts` (EXCLUSIVE WRITE ACCESS)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Instructions
1. Read `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`, `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`, `C:\Clinic_MVP\dental-crm\.agents\orchestrator\PROJECT.md`, and `C:\Clinic_MVP\dental-crm\.agents\explorer_m1_1\handoff.md`.

2. Refactor `apps/api/src/routes/imports.test.ts`:
   - Replace hardcoded static UUID `123e4567-e89b-12d3-a456-4266141740ff` with `fixtureUuid("imports.test.ts", 1)`.
   - Remove `mock.method(db, "select", ...)` in `beforeEach`.
   - Seed test organization using `withSuperuserBypass`.
   - Ensure `beforeEach` and `afterEach` call `purgeFixtureOrganizations([ORG_ID])`.

3. Refactor `apps/api/src/routes/auth.test.ts`:
   - Remove all `mock.method(db, ...)` database stubs.
   - For all auth flows (clinic login, staff unlock, direct user login, user profile `/me`, password/PIN updates), seed real organizations and users in PostgreSQL 18 using `withSuperuserBypass`.
   - Generate unique organization UUIDs per test case (`fixtureUuid("auth.test.ts", testIndex++)`) to prevent primary key conflicts (`organizations_pkey`) from append-only `audit_events`.
   - Ensure helper functions `allowDatabaseWrites()` and `forbidDatabaseAccess()` are refactored to seed real DB fixture records instead of mocking `db.select`/`db.insert`/`db.update`.

4. Execute verification commands:
   - `node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/routes/auth.test.ts`
   - `node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/routes/imports.test.ts`
   - `npx biome check apps/api/src/routes/auth.test.ts apps/api/src/routes/imports.test.ts` (or `npm run typecheck -w @dental/api`)

5. Write your handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_m1_1\handoff.md`.
