# DISPATCH — Explorer Survey 2

## Role
teamwork_preview_explorer

## Working Directory
C:\Clinic_MVP\dental-crm\.agents\explorer_survey_2

## Task
Conduct exploration of test infrastructure, fixtures, and non-route test files under `apps/api/src/`.
Examine test support files (e.g. `apps/api/src/tests/support/`, `poolTeardown.ts`, `fixtures`, etc.) to understand how real database testing works in Dente.

## Instructions
1. Read `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md` and `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`.
2. Inspect `apps/api/src/tests/support/` (or equivalent test helpers) to detail how `withFixtureTenant`, `withSuperuserBypass`, `fixtureUuid`, and PostgreSQL setup/teardown operate.
3. Search for non-route test files (e.g. in `apps/api/src/services/`, `apps/api/src/middleware/`, `apps/api/src/utils/`, `apps/api/src/db/`) that contain database mocks (`t.mock.method(db, ...)`).
4. For each file found, document:
   - File path
   - Mock patterns used
   - Prerequisites/helpers needed for real DB interaction
   - Any audit log involvement
5. Write your findings to `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_2\handoff.md`.
