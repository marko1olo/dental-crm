# Project: Dente API Integration Test Database Mock Eradication

## Architecture
- Target directory: `apps/api/src/**/*.test.ts`
- Test runner command: `node --import tsx --import ./src/tests/support/poolTeardown.ts --test <path_to_file>`
- Full test suite command: `npm run test -w @dental/api`
- Database setup: Native PostgreSQL 18 at `127.0.0.1:5432` with FORCE RLS
- Test fixture utilities (`apps/api/src/tests/support/fixtureOrganizations.ts`):
  - `withFixtureTenant(orgId, seedFn)`: executes within RLS tenant context (`app.current_tenant`)
  - `withSuperuserBypass(fn)`: bypasses RLS (`app.superuser_bypass = 'on'`) to insert root org / admin rows
  - `fixtureUuid(namespace, testIndex)`: generates deterministic unique UUIDv4s (`dce70000-` prefix) per test case
  - `purgeFixtureOrganizations([orgId])`: safely purges tenant data while preserving append-only audit tables

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Auth Route Test Refactor | Eradicate DB mocks in `apps/api/src/routes/auth.test.ts` using real DB fixtures | M1 | survey |
| 2 | Imports Route Test Refactor | Eradicate DB mocks in `apps/api/src/routes/imports.test.ts` using real DB fixtures | M1 | survey |
| 3 | DICOMWeb Route Test Refactor | Eradicate DB mocks in `apps/api/src/routes/dicomweb.test.ts` using real DB fixtures | M2 | survey |
| 4 | Imaging Route Test Refactor | Eradicate DB mocks in `apps/api/src/routes/tests/imaging.test.ts` using real DB fixtures | M2 | survey |
| 5 | Clinical Route Test Refactor | Eradicate DB mocks in `apps/api/src/tests/routes/clinical.test.ts` using real DB fixtures | M2 | survey |
| 6 | Clinical Rule Delete Test Refactor | Eradicate DB mocks in `apps/api/src/tests/routes/clinicalRuleDelete.test.ts` using real DB fixtures | M2 | survey |
| 7 | Clinical DB Query Test Refactor (db/tests) | Eradicate DB mocks in `apps/api/src/db/tests/clinicalQuery.test.ts` using real DB fixtures | M2 | survey |
| 8 | Clinical DB Query Test Refactor (tests/db) | Eradicate DB mocks in `apps/api/src/tests/db/clinicalQuery.test.ts` using real DB fixtures | M2 | survey |
| 9 | Patients DB Query Test Refactor | Eradicate DB mocks in `apps/api/src/tests/db/patientsQuery.test.ts` using real DB fixtures | M2 | survey |
| 10 | Billing DB Query Test Refactor | Eradicate DB mocks in `apps/api/src/db/tests/billingQuery.test.ts` using real DB fixtures | M3 | survey |
| 11 | Notification Worker Test Refactor | Eradicate DB mocks in `apps/api/src/services/notificationWorker.test.ts` using real DB fixtures | M4 | survey |
| 12 | BI Analytics Worker Test Refactor | Eradicate DB mocks in `apps/api/src/services/tests/biAnalyticsWorker.test.ts` using real DB fixtures | M4 | survey |
| 13 | Post-Op Care Trigger Test Refactor | Eradicate DB mocks in `apps/api/src/services/tests/postOpCareTrigger.test.ts` using real DB fixtures | M4 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Auth & Tenant Routes | `apps/api/src/routes/auth.test.ts`, `apps/api/src/routes/imports.test.ts` | none | DONE |
| M2 | Clinical, Imaging & Patient Suites | `dicomweb.test.ts`, `imaging.test.ts`, `clinical.test.ts`, `clinicalRuleDelete.test.ts`, `clinicalQuery.test.ts` (x2), `patientsQuery.test.ts` | none | DONE |
| M3 | Billing & Finance Queries | `apps/api/src/db/tests/billingQuery.test.ts` | none | DONE |
| M4 | Background Workers & Triggers | `notificationWorker.test.ts`, `biAnalyticsWorker.test.ts`, `postOpCareTrigger.test.ts` | none | DONE |
| M5 | Final Verification & Suite Run | Full suite `npm run test -w @dental/api` + `rg "mock\.method\(db"` census check | M1, M2, M3, M4 | IN_PROGRESS |

## Code Layout
- `apps/api/src/routes/` - Fastify API routes
- `apps/api/src/db/` - Drizzle ORM DB schema & query helpers
- `apps/api/src/services/` - Background workers and triggers
- `apps/api/src/tests/support/` - Test fixtures (`fixtureOrganizations.ts`, `tenantTestApp.ts`, `poolTeardown.ts`)
