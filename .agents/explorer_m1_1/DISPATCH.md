# DISPATCH — Explorer Milestone M1 (Auth & Tenant Routes)

## Role
teamwork_preview_explorer

## Working Directory
C:\Clinic_MVP\dental-crm\.agents\explorer_m1_1

## Task
Investigate `apps/api/src/routes/auth.test.ts` and `apps/api/src/routes/imports.test.ts` to produce a step-by-step refactoring strategy to eradicate all database mocks (`mock.method(db, ...)`, `t.mock.method(db, ...)`) and replace them with real PostgreSQL 18 fixture data (`withFixtureTenant`, `withSuperuserBypass`, `fixtureUuid`).

## Instructions
1. Read `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`, `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`, and `C:\Clinic_MVP\dental-crm\.agents\orchestrator\PROJECT.md`.
2. Inspect `apps/api/src/routes/auth.test.ts`:
   - Identify every mocked DB call (`db.select`, `db.insert`, `db.update`).
   - Detail how to replace each mock with real DB fixture seeding using `withSuperuserBypass` and `withFixtureTenant`.
   - Ensure unique organization UUID generation per test case (`fixtureUuid("auth-test", index++)`) because auth flows write append-only records to `audit_events`.
   - Ensure JWT authentication headers use real seeded tenant/user identities.
3. Inspect `apps/api/src/routes/imports.test.ts`:
   - Identify every mocked DB call (`db.select`).
   - Detail how to replace each mock with real DB fixture seeding.
4. Produce a clear, concrete refactoring plan for the Worker agent.
5. Write your findings and recommended strategy to `C:\Clinic_MVP\dental-crm\.agents\explorer_m1_1\handoff.md`.

## 2026-08-12T23:34:51Z
You are an Explorer agent. Your working directory is C:\Clinic_MVP\dental-crm\.agents\explorer_m1_1. Read C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md, C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, C:\Clinic_MVP\dental-crm\.agents\orchestrator\PROJECT.md, and C:\Clinic_MVP\dental-crm\.agents\explorer_m1_1\DISPATCH.md. Perform your investigation of apps/api/src/routes/auth.test.ts and apps/api/src/routes/imports.test.ts, and write a detailed refactoring strategy to C:\Clinic_MVP\dental-crm\.agents\explorer_m1_1\handoff.md. Report back when done.

