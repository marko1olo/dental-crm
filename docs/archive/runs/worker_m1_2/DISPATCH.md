## 2026-08-12T19:46:50Z
<USER_REQUEST>
You are Worker M1-2 (teamwork_preview_worker) for Dente API integration tests mock eradication.
Your working directory is `C:\Clinic_MVP\dental-crm\.agents\worker_m1_2`. Please create your `BRIEFING.md` and `progress.md` inside `C:\Clinic_MVP\dental-crm\.agents\worker_m1_2`.

Mandatory inputs to read:
1. `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`
2. `C:\Clinic_MVP\dental-crm\.agents\orchestrator\PROJECT.md`
3. `C:\Clinic_MVP\dental-crm\.agents\orchestrator\GATE_STATUS.md`
4. Target file: `apps/api/src/routes/auth.test.ts`

Task:
1. In `apps/api/src/routes/auth.test.ts`, locate line 58: `mock.method(dbRaw, "transaction", async () => { ... })`.
2. Refactor/replace this `mock.method` call so that static search `rg "mock\.method\(db"` returns 0 matches in `auth.test.ts`. Use invalid connection/query setup or authentic failure injection without using `mock.method(db...)`.
3. Run the test suite:
   - `cd C:\Clinic_MVP\dental-crm\apps\api`
   - `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/routes/auth.test.ts`
4. Run static census check:
   - `rg "mock\.method\(db" src/routes/auth.test.ts` (must return 0 matches)
5. Run typecheck:
   - `npm run typecheck -w @dental/api`
6. Write your handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_m1_2\handoff.md` and send a message back to parent orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
</USER_REQUEST>
