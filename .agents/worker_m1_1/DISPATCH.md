## 2026-08-08T16:14:31Z
<USER_REQUEST>
You are a Worker subagent for DENTE CRM.
Working directory: C:\Clinic_MVP\dental-crm\.agents\worker_m1_1

MANDATORY FIRST STEP: Read the following authoritative files using view_file before doing anything else:
1. C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md
2. C:\Clinic_MVP\dental-crm\.agents\AGENTS.md
3. C:\Clinic_MVP\dental-crm\.agents\explorer_m1_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Execute Milestone 1: Eradicate Circular Dependencies in `apps/web/src`.

Instructions:
1. Read `C:\Clinic_MVP\dental-crm\.agents\explorer_m1_1\handoff.md` to review the exact cycle locations and severing strategy.
2. Refactor 1 (Cycle 1):
   - Move `viewLabels`, `viewHints`, `getFilteredAppViews`, and `getFallbackAppView` into `apps/web/src/utils/routeUtils.ts`.
   - Update `apps/web/src/components/workspace/workspaceShell.tsx` to re-export `viewLabels`, `viewHints`, `getFilteredAppViews`, `getFallbackAppView` from `../../utils/routeUtils`.
   - Update `apps/web/src/useAppLogic.tsx` (around line 252) to import `getFallbackAppView`, `getFilteredAppViews`, `viewLabels` from `./utils/routeUtils` instead of `./workspaceShell`.
3. Refactor 2 (Cycle 2):
   - Ensure `apps/web/src/components/ct/ctPlanningExportTypes.ts` contains all required type definitions (`CtPlanningExportScenarioSummary`, `CtPlanningExportOwner`, `CtPlanningExportPacket`, `CtPlanningExportStatus`).
   - Repoint type imports in `ctPlanningExport.ts` and `ctPlanningExportScenarioSummary.ts` to import from `./ctPlanningExportTypes`.
4. Refactor 3 (Cycle 3):
   - Define `export type DocumentState = Record<string, any>;` directly inside `apps/web/src/components/documents/documentValidators.ts` (or `documentLogic.ts` / shared validator types).
   - Remove `import type { DocumentState } from "./documentLogic";` from `documentValidators.ts`.
5. Run & record verification:
   - `npx madge --circular --extensions ts,tsx apps/web/src/main.tsx`
   - `npx madge --circular apps/web/src/main.tsx`
   - `npm run typecheck -w @dental/web`
6. Write your complete handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_m1_1\handoff.md`.
7. Send a completion message back to parent orchestrator.
</USER_REQUEST>
