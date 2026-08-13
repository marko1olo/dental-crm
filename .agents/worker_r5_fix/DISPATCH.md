## 2026-08-13T08:16:44Z
<USER_REQUEST>
You are worker_r5_fix. Your working directory is C:/Clinic_MVP/dental-crm/.agents/worker_r5_fix.

Task:
1. Modify `apps/api/src/tests/db/patientsQuery.test.ts` to update all PostgreSQL UUID error message regexes to be locale-agnostic: use `/invalid input syntax|неверный синтаксис.*uuid/i` instead of checking strictly for English or strictly for Russian strings. This ensures tests pass on PostgreSQL 18 installations regardless of system locale settings.
2. Run the tests for `patientsQuery.test.ts`:
   Command: `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/tests/db/patientsQuery.test.ts` inside `apps/api`
3. Run all 13 test files in the integration test suite:
   Command: `npm run test -w @dental/api`
4. Perform the census check for DB query mocks:
   Command: `rg "mock\.method\(db"` across `apps/api/src/**/*.test.ts`
   Confirm 0 matches for DB query mocks remain.
5. Run TypeScript typecheck:
   Command: `npm run typecheck -w @dental/api`
   Confirm 0 errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Handoff instructions:
Write your complete handoff report to `C:/Clinic_MVP/dental-crm/.agents/worker_r5_fix/handoff.md` and send a message back with the summary of all test results, typecheck status, and rg census output.
</USER_REQUEST>
