# DISPATCH

## 2026-08-12T23:32:47Z

Task Objective:
Automatic audit and refactoring of Dente integration tests to completely eradicate all database mocks (e.g., t.mock.method(db, ...) or global.fetch DB mocks) in `apps/api/src/**/*.test.ts` and ensure full interaction with real PostgreSQL database.

Key Requirements:
R1. Eradicate database mocks in `apps/api/src/**/*.test.ts` and replace them with real data insertions via `withFixtureTenant` and `withSuperuserBypass`.
R2. Unique ID Management: Tests writing to audit logs (`audit_events`, `clinical_audit_logs`) must generate unique organization IDs per test case (e.g. `fixtureUuid("audit", testIndex++)`) to avoid primary key conflicts (`organizations_pkey`).
R3. Automated Refactoring: Modify test files to create real dependent entities (patients, payments, visits) as required by tested functions.

Acceptance Criteria:
- All refactored test files pass when executed with `node --import tsx --import ./src/tests/support/poolTeardown.ts --test <path_to_file>`.
- Full test suite run (`npm run test`) completes without primary key uniqueness errors or fixture-related timeouts.
- Codebase check (`rg "t.mock.method\(db"`) returns zero database mocks.

## 2026-08-12T23:54:12Z

Task Objective:
Execute Milestone M5 (Final Verification & Gate Audit):
1. Implementation Milestones M1, M2, M3, M4 are 100% complete (112 tests passing against PostgreSQL 18, 0 DB query mocks across 13 test files).
2. Dispatch 2 Reviewers (teamwork_preview_reviewer), 2 Challengers (teamwork_preview_challenger), and 1 Forensic Auditor (teamwork_preview_auditor).
3. Require verification team to run `npm run test -w @dental/api` (or execute all 13 test files), static census check `rg "mock\.method\(db"` (verify 0 DB query mocks), and `npm run typecheck -w @dental/api` (0 errors).
4. Upon receiving gate verdicts (all Reviewers APPROVE, all Challengers APPROVE, Auditor CLEAN), report victory/completion to parent (804a9dfc-0ecb-4aba-b808-30d18581f366).

## 2026-08-13T00:00:40Z

Task Objective:
Resume Project Orchestration for Dente integration test refactoring.
The project milestones M1-M4 are completed by workers.
Next Step: Re-dispatch Milestone M5 Final Gate Verification team (2 Reviewers, 2 Challengers, 1 Forensic Auditor) to verify test suite passing, static mock eradication (0 DB query mocks), typecheck (0 errors), and integrity audit (CLEAN).

## 2026-08-13T13:16:14Z

Task Objective:
Resume project orchestration for DB Mock Eradication in Dente integration tests (`apps/api/src/**/*.test.ts`) as Project Orchestrator (Gen 3).
Notice `apps/api/src/tests/db/patientsQuery.test.ts` has been updated with `/invalid input syntax|неверный синтаксис.*uuid/i`.
Execute Milestone M5 final verification gate:
1. Run all 13 integration test files (`node --import tsx --import ./src/tests/support/poolTeardown.ts --test <path>`).
2. Run static DB mock census check: `rg "mock\.method\(db"` across `apps/api/src/**/*.test.ts` (must return 0 matches for DB query mocks).
3. Run TypeScript typecheck: `npm run typecheck -w @dental/api` (0 errors).
4. When all 13 test files pass cleanly with 0 DB mocks, report project completion to Sentinel so Victory Auditor can be dispatched.



