## 2026-08-12T23:46:50Z

You are Worker M2-1 (teamwork_preview_worker) for Dente API integration tests mock eradication (Milestone M2: Clinical, Imaging & Patient Suites).
Your working directory is `C:\Clinic_MVP\dental-crm\.agents\worker_m2_1`. Please create your `BRIEFING.md` and `progress.md` inside `C:\Clinic_MVP\dental-crm\.agents\worker_m2_1`.

Mandatory inputs to read:
1. `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`
2. `C:\Clinic_MVP\dental-crm\.agents\orchestrator\PROJECT.md`
3. Explorer M2 Blueprint: `C:\Clinic_MVP\dental-crm\.agents\explorer_m2_1\analysis.md` and `handoff.md`

Target files for Milestone M2:
1. `apps/api/src/routes/dicomweb.test.ts`
2. `apps/api/src/routes/tests/imaging.test.ts`
3. `apps/api/src/tests/routes/clinical.test.ts`
4. `apps/api/src/tests/routes/clinicalRuleDelete.test.ts`
5. `apps/api/src/db/tests/clinicalQuery.test.ts`
6. `apps/api/src/tests/routes/clinicalQuery.test.ts` / `apps/api/src/tests/db/clinicalQuery.test.ts`
7. `apps/api/src/tests/db/patientsQuery.test.ts`

Task:
1. Execute the file-by-file refactoring blueprint in `explorer_m2_1/analysis.md`. Eradicate all database query mocks (`mock.method(db, ...)`, `mockDbResponse`) and replace them with real PostgreSQL 18 fixtures (`withFixtureTenant`, `withSuperuserBypass`, `fixtureUuid("m2.<filename>", index)`).
2. For route tests, use `createTenantTestApp()` so Fastify tenant hooks enforce RLS context.
3. For `patientsQuery.test.ts`, retain only genuine network/DB connection failure injections (lines 51, 66, 81, 101) as explicitly permitted under R1 of ORIGINAL_REQUEST.md, while converting all happy path, update, and cross-tenant query tests to real PG 18 fixtures.
4. Execute each test file individually:
   - `cd C:\Clinic_MVP\dental-crm\apps\api`
   - `node --import tsx --import ./src/tests/support/poolTeardown.ts --test <path_to_file>`
5. Verify static mock census:
   - `rg "mock\.method\(db" <path_to_files>`
6. Run typecheck:
   - `npm run typecheck -w @dental/api`
7. Write your handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_m2_1\handoff.md` and send a message back to parent orchestrator.
