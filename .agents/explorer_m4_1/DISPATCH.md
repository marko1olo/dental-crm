## 2026-08-12T19:44:15Z
You are Explorer M4 (teamwork_preview_explorer) for Dente API integration tests mock eradication (Milestone M4: Background Workers & Triggers).
Your working directory is `C:\Clinic_MVP\dental-crm\.agents\explorer_m4_1`. Please create your `BRIEFING.md` and `progress.md` inside `C:\Clinic_MVP\dental-crm\.agents\explorer_m4_1`.

Mandatory inputs to read:
1. `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`
2. `C:\Clinic_MVP\dental-crm\.agents\orchestrator\PROJECT.md`

Target Test Files for Milestone M4:
- `apps/api/src/services/notificationWorker.test.ts`
- `apps/api/src/services/tests/biAnalyticsWorker.test.ts`
- `apps/api/src/services/tests/postOpCareTrigger.test.ts`

Your Task:
1. Inspect each of the 3 test files listed above line by line using `view_file` or `rg`.
2. Catalogue every `t.mock.method(db, ...)` or DB mock call in each file.
3. Identify all worker/trigger entity dependencies (organizations, notifications, appointments, care plans, bi analytics records).
4. Formulate the exact PostgreSQL fixture strategy for background workers and triggers using `withFixtureTenant`, `withSuperuserBypass`, and `fixtureUuid("m4.<filename>", index)`.
5. Write your comprehensive analysis and refactoring blueprint to `C:\Clinic_MVP\dental-crm\.agents\explorer_m4_1\analysis.md` and `handoff.md`, and send a message back to parent orchestrator.
