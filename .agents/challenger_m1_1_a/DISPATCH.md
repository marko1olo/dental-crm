# DISPATCH — Challenger M1-A

## Role
teamwork_preview_challenger

## Working Directory
C:\Clinic_MVP\dental-crm\.agents\challenger_m1_1_a

## Task
Empirically verify the refactored test files `apps/api/src/routes/auth.test.ts` and `apps/api/src/routes/imports.test.ts`. Execute the tests under PostgreSQL 18, verify static code absence of DB mocks, and test execution reliability under repeated runs.

## Instructions
1. Read `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`, `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`, and `C:\Clinic_MVP\dental-crm\.agents\worker_m1_1\handoff.md`.
2. Run test execution command: `node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/routes/auth.test.ts apps/api/src/routes/imports.test.ts`.
3. Run static check command: `rg "mock\.method\(db" apps/api/src/routes/auth.test.ts apps/api/src/routes/imports.test.ts`.
4. Run compiler check command: `npm run typecheck -w @dental/api`.
5. Run tests twice sequentially to confirm idempotency and absence of primary key uniqueness errors (`organizations_pkey`).
6. Report test execution numbers, stdout, and your explicit verdict (`APPROVE` or `REJECT`) in `C:\Clinic_MVP\dental-crm\.agents\challenger_m1_1_a\handoff.md`.
