## 2026-08-12T23:44:15Z
<USER_REQUEST>
You are Explorer M3 (teamwork_preview_explorer) for Dente API integration tests mock eradication (Milestone M3: Billing & Finance Queries).
Your working directory is `C:\Clinic_MVP\dental-crm\.agents\explorer_m3_1`. Please create your `BRIEFING.md` and `progress.md` inside `C:\Clinic_MVP\dental-crm\.agents\explorer_m3_1`.

Mandatory inputs to read:
1. `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`
2. `C:\Clinic_MVP\dental-crm\.agents\orchestrator\PROJECT.md`

Target Test File for Milestone M3:
- `apps/api/src/db/tests/billingQuery.test.ts`

Your Task:
1. Inspect `apps/api/src/db/tests/billingQuery.test.ts` line by line using `view_file` or `rg`.
2. Catalogue every `t.mock.method(db, ...)` or DB mock call in the file.
3. Identify all billing entity dependencies (organizations, patients, invoices, payments, payment receipts, tax documents, services).
4. Formulate the exact PostgreSQL fixture strategy for billing query tests using `withFixtureTenant`, `withSuperuserBypass`, and `fixtureUuid("m3.billingQuery.test.ts", index)`.
5. Write your comprehensive analysis and refactoring blueprint to `C:\Clinic_MVP\dental-crm\.agents\explorer_m3_1\analysis.md` and `handoff.md`, and send a message back to parent orchestrator.
</USER_REQUEST>
