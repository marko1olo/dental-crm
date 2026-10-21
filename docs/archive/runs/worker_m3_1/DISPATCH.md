## 2026-08-12T23:46:50Z

You are Worker M3-1 (teamwork_preview_worker) for Dente API integration tests mock eradication (Milestone M3: Billing & Finance Queries).
Your working directory is `C:\Clinic_MVP\dental-crm\.agents\worker_m3_1`. Please create your `BRIEFING.md` and `progress.md` inside `C:\Clinic_MVP\dental-crm\.agents\worker_m3_1`.

Mandatory inputs to read:
1. `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`
2. `C:\Clinic_MVP\dental-crm\.agents\orchestrator\PROJECT.md`
3. Explorer M3 Blueprint: `C:\Clinic_MVP\dental-crm\.agents\explorer_m3_1\analysis.md` and `handoff.md`

Target file for Milestone M3:
- `apps/api/src/db/tests/billingQuery.test.ts`

Task:
1. Execute the refactoring blueprint in `explorer_m3_1/analysis.md`. Eradicate `stubTransaction()` and `mock.method(db, ...)` transaction stubs.
2. Refactor tests to seed real PostgreSQL 18 data using `withFixtureTenant`, `withSuperuserBypass`, and `fixtureUuid("m3.billingQuery.test.ts", slot)`.
3. Test billing queries (pessimistic locks, visits, generated documents, payments) against live PostgreSQL 18.
4. Execute test file:
   - `cd C:\Clinic_MVP\dental-crm\apps\api`
   - `node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/db/tests/billingQuery.test.ts`
5. Verify static mock census:
   - `rg "mock\.method\(db" src/db/tests/billingQuery.test.ts` (0 matches)
6. Run typecheck:
   - `npm run typecheck -w @dental/api`
7. Write your handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_m3_1\handoff.md` and send a message back to parent orchestrator.
