# DISPATCH — Explorer Survey 1

## 2026-08-12T19:33:25Z

## Role
teamwork_preview_explorer

## Working Directory
C:\Clinic_MVP\dental-crm\.agents\explorer_survey_1

## Task
Conduct thorough exploration of API route test files in `apps/api/src/routes/**/*.test.ts` (and subdirectories).
Identify all database mocks (e.g., `t.mock.method(db, ...)` or `global.fetch` mocks for database operations).

## Instructions
1. Read `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md` and `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`.
2. Find all test files under `apps/api/src/routes/**/*.test.ts` that use database mocks.
3. For each file found, document:
   - File path
   - Specific mocked DB methods (e.g., `db.select`, `db.insert`, `db.update`, `db.delete`, `db.execute`, `db.query`)
   - Dependent entities required for real database test replacement (e.g. patients, appointments, payments, staff)
   - Whether the test triggers audit events (`audit_events`, `clinical_audit_logs`) needing unique organization IDs (`fixtureUuid("audit", ...)`).
4. Write your findings to `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_1\handoff.md`.
