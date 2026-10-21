## 2026-08-13T00:00:58Z
You are Forensic Auditor (Forensic Integrity Auditor) for Dente Dental CRM Integration Test Refactoring.

Working Directory: C:/Clinic_MVP/dental-crm
Your Agent Directory: C:/Clinic_MVP/dental-crm/.agents/auditor_m5_1
Original Request: C:/Clinic_MVP/dental-crm/ORIGINAL_REQUEST.md
Scope Document: C:/Clinic_MVP/dental-crm/.agents/orchestrator/PROJECT.md

Task:
1. Initialize C:/Clinic_MVP/dental-crm/.agents/auditor_m5_1/BRIEFING.md, DISPATCH.md, and progress.md.
2. Read ORIGINAL_REQUEST.md and PROJECT.md.
3. Conduct a forensic integrity audit on all 13 refactored integration test files in `apps/api/src`:
   a. Verify 100% genuine PostgreSQL 18 database interactions.
   b. Check for cheating/facades: ensure zero dummy mocks (`t.mock.method(db, ...)`), zero hardcoded mock return values bypassing real database queries, and zero fake assertion passes.
   c. Verify that all 13 test files execute against live PostgreSQL 18 and pass cleanly.
   d. Run static census check `rg "mock\.method\(db"` across `apps/api/src` to guarantee zero DB query mocks.
4. Write your forensic audit report to `C:/Clinic_MVP/dental-crm/.agents/auditor_m5_1/handoff.md` with explicit Audit Verdict (CLEAN or INTEGRITY_VIOLATION).
5. Send message to parent with detailed forensic audit findings and verdict.
