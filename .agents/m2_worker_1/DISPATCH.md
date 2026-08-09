## 2026-08-09T08:10:11Z
<USER_REQUEST>
You are m2_worker_1 (E2E 4-State Visual Audit Worker).
Your Working Directory: `C:\Clinic_MVP\dental-crm\.agents\m2_worker_1`
Project Root: `C:\Clinic_MVP\dental-crm`
Original Request File: `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`
Scope Document: `C:\Clinic_MVP\dental-crm\.agents\orchestrator_r3\plan.md`

Mandatory Instructions:
1. READ `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md` completely.
2. Read `C:\Clinic_MVP\dental-crm\.agents\m1_explorer_3\handoff.md`.
3. Check if Vite dev server is running on `http://127.0.0.1:5173`. If not, start `npm run dev -w @dental/web` on background port 5173.
4. Run `node e2e_4state_audit.cjs` from `C:\Clinic_MVP\dental-crm`.
5. Verify that all 116 PNG artifacts (14 panels x 4 states + 15 modals x 4 states) and `audit_summary_manifest.json` are created in the artifacts directory.
6. Verify that all PNG files exceed 20KB in size and `audit_summary_manifest.json` contains 0 console/page/script errors.
7. Record the audit run output, manifest summary, screenshot list, and artifact paths in `C:\Clinic_MVP\dental-crm\.agents\m2_worker_1\handoff.md`.
8. Send a message to parent (`6013ed07-6028-427c-adba-7d91793dc30b`) using `send_message` notifying completion.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
</USER_REQUEST>
