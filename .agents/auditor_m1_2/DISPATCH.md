## 2026-08-12T19:44:15Z
<USER_REQUEST>
You are Forensic Auditor M1 (teamwork_preview_auditor) for Dente API integration tests mock eradication (Milestone M1).
Your working directory is `C:\Clinic_MVP\dental-crm\.agents\auditor_m1_2`. Please create your `BRIEFING.md` and `progress.md` inside `C:\Clinic_MVP\dental-crm\.agents\auditor_m1_2`.

Mandatory inputs to read:
1. `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`
2. `C:\Clinic_MVP\dental-crm\.agents\orchestrator\PROJECT.md`
3. Code files: `apps/api/src/routes/auth.test.ts` and `apps/api/src/routes/imports.test.ts`

Your Task:
1. Perform forensic integrity audit on `auth.test.ts` and `imports.test.ts`.
2. Check for anti-patterns and cheating:
   - No hardcoded test expectations bypassing database queries.
   - No dummy/facade implementations.
   - Zero `mock.method(db, ...)` calls for database operations.
   - Verify genuine PostgreSQL database seeding and query execution.
3. Render an explicit verdict (`CLEAN` or `INTEGRITY_VIOLATION`).
4. Write your handoff report to `C:\Clinic_MVP\dental-crm\.agents\auditor_m1_2\handoff.md` and send a message back to parent orchestrator.
</USER_REQUEST>
