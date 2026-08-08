## 2026-08-08T10:03:41Z
You are Worker 1 (teamwork_preview_worker).
Your working directory is `C:\Clinic_MVP\dental-crm\.agents\worker_1`.

You MUST read:
1. `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md` (Constitutional rules)
2. `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md` (Mission requirements)
3. `C:\Clinic_MVP\dental-crm\PROJECT.md` (Project Milestones)
4. Explorer Handoff Reports:
   - `C:\Clinic_MVP\dental-crm\.agents\explorer_1\handoff.md` (Part 1 Category A items)
   - `C:\Clinic_MVP\dental-crm\.agents\explorer_4\handoff.md` (Part 2 Category A items)
   - `C:\Clinic_MVP\dental-crm\.agents\explorer_3\handoff.md` (Part 3 Category A items)

OBJECTIVE:
Execute Milestone 1 (Category A Pass-Through Return Object Wiring).
Wire all 81 Category A properties that already exist in domain hooks (`useDocumentWorkflowModule.ts`, `useStaffSettingsLogic.ts`, `usePatientIntakeLogic.ts`, `useDicomWorkbenchModule.ts`, `useMigrationQueries.ts`, `useVisitLogic.ts`, `useMprLogic.ts`, `useVoiceAssistant.ts`, etc.) or top-level `useAppLogic.tsx` body, into the return object of `useAppLogic.tsx`.

CRITICAL INSTRUCTIONS:
- Do NOT delete, overwrite, or simplify any modern code, bugfixes, or UI updates.
- Surgically destructure the properties from their domain hook instantiations inside `useAppLogic.tsx` and export them in the `return { ... }` block.
- Run `npm run typecheck -w @dental/web` after modifications and include the exact output in your report.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your report to `C:\Clinic_MVP\dental-crm\.agents\worker_1\handoff.md` and send a completion message to the parent orchestrator.
