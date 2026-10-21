## 2026-08-12T19:46:50Z
<USER_REQUEST>
You are Worker M4-1 (teamwork_preview_worker) for Dente API integration tests mock eradication (Milestone M4: Background Workers & Triggers).
Your working directory is `C:\Clinic_MVP\dental-crm\.agents\worker_m4_1`. Please create your `BRIEFING.md` and `progress.md` inside `C:\Clinic_MVP\dental-crm\.agents\worker_m4_1`.

Mandatory inputs to read:
1. `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`
2. `C:\Clinic_MVP\dental-crm\.agents\orchestrator\PROJECT.md`
3. Explorer M4 Blueprint: `C:\Clinic_MVP\dental-crm\.agents\explorer_m4_1\analysis.md` and `handoff.md`

Target files for Milestone M4:
1. `apps/api/src/services/notificationWorker.test.ts`
2. `apps/api/src/services/tests/biAnalyticsWorker.test.ts`
3. `apps/api/src/services/tests/postOpCareTrigger.test.ts`

Task:
1. Execute the refactoring blueprint in `explorer_m4_1/analysis.md`. Eradicate all `mock.method(db, ...)` calls in worker and trigger test files.
2. Refactor tests to seed real PostgreSQL 18 entity records (organizations, appointments, care plans, notifications, bi analytics) using `withFixtureTenant`, `withSuperuserBypass`, and `fixtureUuid("m4.<filename>", slot)`.
3. Execute test files:
   - `cd C:\Clinic_MVP\dental-crm\apps\api`
   - `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/services/notificationWorker.test.ts src/services/tests/biAnalyticsWorker.test.ts src/services/tests/postOpCareTrigger.test.ts`
4. Verify static mock census:
   - `rg "mock\.method\(db" src/services/notificationWorker.test.ts src/services/tests/biAnalyticsWorker.test.ts src/services/tests/postOpCareTrigger.test.ts` (0 matches)
5. Run typecheck:
   - `npm run typecheck -w @dental/api`
6. Write your handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_m4_1\handoff.md` and send a message back to parent orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
</USER_REQUEST>
