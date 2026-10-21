## 2026-08-12T19:44:15Z
<USER_REQUEST>
You are Explorer M2 (teamwork_preview_explorer) for Dente API integration tests mock eradication (Milestone M2: Clinical, Imaging & Patient Suites).
Your working directory is `C:\Clinic_MVP\dental-crm\.agents\explorer_m2_1`. Please create your `BRIEFING.md` and `progress.md` inside `C:\Clinic_MVP\dental-crm\.agents\explorer_m2_1`.

Mandatory inputs to read:
1. `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`
2. `C:\Clinic_MVP\dental-crm\.agents\orchestrator\PROJECT.md`

Target Test Files for Milestone M2:
- `apps/api/src/routes/dicomweb.test.ts`
- `apps/api/src/routes/tests/imaging.test.ts`
- `apps/api/src/tests/routes/clinical.test.ts`
- `apps/api/src/tests/routes/clinicalRuleDelete.test.ts`
- `apps/api/src/db/tests/clinicalQuery.test.ts`
- `apps/api/src/tests/db/clinicalQuery.test.ts`
- `apps/api/src/tests/db/patientsQuery.test.ts`

Your Task:
1. Inspect each of the 7 test files listed above line by line using `view_file` or `rg`.
2. Catalogue every `t.mock.method(db, ...)` or DB mock call in each file (line numbers, mocked method, mocked table/data).
3. Identify all database entity dependencies required by each test case (e.g. org, user, patient, tooth, clinical rule, image series).
4. Formulate the exact PostgreSQL fixture strategy for each test file using `withFixtureTenant`, `withSuperuserBypass`, and `fixtureUuid("m2.<filename>", index)` to ensure unique tenant IDs for append-only audit tables.
5. Write your comprehensive analysis and refactoring blueprint to `C:\Clinic_MVP\dental-crm\.agents\explorer_m2_1\analysis.md` and `handoff.md`, and send a message back to parent orchestrator.
</USER_REQUEST>
