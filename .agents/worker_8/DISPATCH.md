## 2026-08-08T14:30:00Z

<USER_REQUEST>
You are Worker 8 for Milestone 1 of DENTE CRM codebase restoration (`apps/web`).
Working directory: `C:\Clinic_MVP\dental-crm\.agents\worker_8`
Original request path: `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md` (and `C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md`).

Read `ORIGINAL_REQUEST.md` and constitutional rules in `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`.

You own these files exclusively:
- `apps/web/src/useAppLogic.tsx`
- `apps/web/src/hooks/domains/` files

Your Task:
Perform critical fixes for Milestone 1 (Category A Pass-Through Return Object Wiring):

1. **Instantiate and Spread 5 Missing Domain Hooks in `useAppLogic.tsx`**:
   In `apps/web/src/useAppLogic.tsx`:
   - Import and instantiate all 5 un-instantiated domain hooks:
     - `useStaffSettingsLogic`
     - `usePatientIntakeLogic`
     - `useMigrationQueries`
     - `useImagingQueries`
     - `useCommunicationsQueries`
   - Spread their return objects into `useAppLogic.tsx`'s return object so all 198 properties (including `addStaffMember`, `addChair`, `activePayments`, `activeCommunicationTasks`, `activeImagingStudies`, `activeTreatmentPlanItems`, `activeTreatmentPlanScenarios`, `analyzePricelist`, `applyProtocolTemplate`, `runMigrationAutopilot`, `commitSmartImport`, `runRecognitionJob`, `saveTelegramSettings`) are authentically exported and available to `App.tsx` and `SettingsView.tsx`.

2. **Remove `: any` Type Bypass from `useAppLogic`**:
   In `apps/web/src/useAppLogic.tsx`, remove the explicit `: any` return type on `useAppLogic()` function signature so TypeScript compiler (`tsc`) performs full type checking on all destructured properties returned by `useAppLogic()`.

3. **Eradicate Dummy Empty Fallbacks**:
   Scan and replace any default dummy `() => {}` empty functions in component prop defaults across `apps/web/src/` with authentic handlers or state bindings.

4. **Verify Compiler Gate**:
   Execute `npm run typecheck -w @dental/web` in terminal and verify it exits cleanly with code 0! Record exact command and output.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your report and results to `C:\Clinic_MVP\dental-crm\.agents\worker_8\handoff.md` and notify parent.
</USER_REQUEST>
