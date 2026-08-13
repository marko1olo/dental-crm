# DISPATCH — Explorer Survey 3

## Role
teamwork_preview_explorer

## Working Directory
C:\Clinic_MVP\dental-crm\.agents\explorer_survey_3

## Task
Perform a comprehensive census across ALL test files in `apps/api/src/**/*.test.ts` to build a complete inventory of every test file containing DB mocks (`t.mock.method(db`, `global.fetch` mocks).

## Instructions
1. Read `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md` and `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`.
2. Use `ripgrep` (`rg`) to search for `t.mock.method(db`, `t.mock.method`, `global.fetch`, `mock` in `apps/api/src/**/*.test.ts`.
3. Produce a complete list of every single `.test.ts` file in `apps/api/src` that has database mocks.
4. Categorize the test files into logical milestone clusters (e.g. Auth/Tenant routes, Clinical/Patient routes, Billing/Finance routes, Communications/Audit routes, Service/Utility tests).
5. Assess total test file count, total test cases affected, and complexity per cluster.
6. Write your findings to `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_3\handoff.md`.
