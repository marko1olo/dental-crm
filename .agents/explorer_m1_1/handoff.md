# Handoff Report — Requirement R1: Circular Dependency Eradication

**Agent**: Explorer (`explorer_m1_1`)  
**Scope**: `apps/web/src` circular dependency analysis and refactoring plan  
**Target Criterion**: `npx madge --circular apps/web/src/main.tsx` outputs exactly 0 circular dependencies.

---

## 1. Observation

### 1.1 Programmatic Tool Output (`madge`)

1. **`npx madge --circular --extensions ts,tsx apps/web/src/main.tsx`**
   - Output:
     ```
     Processed 379 files (5.2s) (2 warnings)
     × Found 2 circular dependencies!

     1) ctPlanningExport.ts > ctPlanningExportScenarioSummary.ts
     2) contexts/AppLogicContext.tsx > useAppLogic.tsx > workspaceShell.tsx > components/workspace/RecentPatientHistoryWidget.tsx
     ```
2. **`npx madge --circular apps/web/src/main.tsx`**
   - Output: Identical (2 circular dependencies found).
3. **`npx madge --circular --extensions ts,tsx apps/web/src`**
   - Output:
     ```
     Processed 514 files (6.1s) (4 warnings)
     × Found 3 circular dependencies!

     1) ctPlanningExport.ts > ctPlanningExportScenarioSummary.ts
     2) contexts/AppLogicContext.tsx > useAppLogic.tsx > workspaceShell.tsx > components/workspace/RecentPatientHistoryWidget.tsx
     3) documentLogic.ts > documentValidators.ts
     ```
4. **`npx madge --circular --extensions ts,tsx apps/web/src/hooks/useWorkspaceProfile.ts`**
   - Output: `√ No circular dependency found!` (0 cycles).

---

### 1.2 Edge-by-Edge Source Code Inspection

#### Cycle 1: `contexts/AppLogicContext.tsx > useAppLogic.tsx > workspaceShell.tsx > components/workspace/RecentPatientHistoryWidget.tsx`
- **Edge 1 (`contexts/AppLogicContext.tsx:3`)**:
  - Code: `import type { useAppLogic } from "../useAppLogic";`
  - Classification: `import type` edge (Type-only import, erased by TS compiler, flagged by madge AST parser).
- **Edge 2 (`useAppLogic.tsx:252-256`)**:
  - Code:
    ```ts
    import {
    	getFallbackAppView,
    	getFilteredAppViews,
    	viewLabels,
    } from "./workspaceShell";
    ```
  - Classification: **Static runtime value import edge**. `useAppLogic` calls `getFilteredAppViews(staffRole)` (line 429) and `getFallbackAppView(staffRole)` (line 431).
- **Edge 3 (`workspaceShell.tsx:29`)**:
  - Code: `import { RecentPatientHistoryWidget } from "./components/workspace/RecentPatientHistoryWidget";`
  - Classification: **Static runtime value import edge** (UI Component render).
- **Edge 4 (`components/workspace/RecentPatientHistoryWidget.tsx:4`)**:
  - Code: `import { useAppLogicContext } from "../../contexts/AppLogicContext";`
  - Classification: **Static runtime value import edge** (React Context hook).

#### Cycle 2: `ctPlanningExport.ts > ctPlanningExportScenarioSummary.ts`
- **Edge 1 (`ctPlanningExport.ts:6`)**:
  - Code: `import type { CtPlanningExportScenarioSummary } from "./ctPlanningExportScenarioSummary";`
  - Classification: `import type` edge.
- **Edge 2 (`ctPlanningExportScenarioSummary.ts:2-6`)**:
  - Code: `import type { CtPlanningExportOwner, CtPlanningExportPacket, CtPlanningExportStatus } from "./ctPlanningExport";`
  - Classification: `import type` edge.
- **Existing Types Module**: `ctPlanningExportTypes.ts` already defines `CtPlanningExportOwner`, `CtPlanningExportStatus`, `CtPlanningExportScenarioArtifact`, etc.

#### Cycle 3: `documentLogic.ts > documentValidators.ts`
- **Edge 1 (`documentLogic.ts:3`)**:
  - Code: `import { documentPayloadValidators } from "./documentValidators";`
  - Classification: **Static runtime value import edge**.
- **Edge 2 (`documentValidators.ts:2`)**:
  - Code: `import type { DocumentState } from "./documentLogic";`
  - Classification: `import type` edge. `DocumentState` is defined in `documentLogic.ts:7` as `export type DocumentState = Record<string, any>;`.

---

## 2. Logic Chain

1. **Root Cause Analysis for Cycle 1**:
   `workspaceShell.tsx` is a top-level React layout component, but it currently hosts non-UI route logic functions (`getFallbackAppView`, `getFilteredAppViews`) and label definitions (`viewLabels`, `viewHints`). `useAppLogic.tsx` imports these functions from `workspaceShell.tsx`. Since `workspaceShell.tsx` renders `RecentPatientHistoryWidget.tsx`, which consumes `AppLogicContext.tsx`, which references `useAppLogic.tsx`, a complete 4-node cycle is formed.
2. **Severing Strategy for Cycle 1**:
   `utils/routeUtils.ts` already defines `appViews` and `AppView` with 0 UI dependencies. Moving `viewLabels`, `viewHints`, `getFilteredAppViews`, and `getFallbackAppView` into `utils/routeUtils.ts` (and re-exporting them from `workspaceShell.tsx` for UI backwards compatibility) allows `useAppLogic.tsx` to import them directly from `./utils/routeUtils`. This completely removes the import of `workspaceShell.tsx` from `useAppLogic.tsx`, severing Edge 2 and breaking Cycle 1.
3. **Severing Strategy for Cycle 2**:
   Both edges in Cycle 2 are type-only imports between `ctPlanningExport.ts` and `ctPlanningExportScenarioSummary.ts`. Repointing both files to import their type declarations from `ctPlanningExportTypes.ts` removes all cross-imports between `ctPlanningExport.ts` and `ctPlanningExportScenarioSummary.ts`, breaking Cycle 2.
4. **Severing Strategy for Cycle 3**:
   `documentValidators.ts` imports `DocumentState` type from `documentLogic.ts`. Defining `export type DocumentState = Record<string, any>;` directly inside `documentValidators.ts` (or exporting it from `documentValidators.ts` and type-importing it in `documentLogic.ts`) removes the dependency of `documentValidators.ts` on `documentLogic.ts`, breaking Cycle 3.

---

## 3. Caveats

- **`madge` Parser Limitations**: `madge` parses AST imports without erasing `import type` declarations in TypeScript unless type imports are routed through dedicated types files (`*Types.ts`). Severing both value imports and type-only cross-module imports ensures `madge` reports 0 cycles.
- **Backwards Compatibility**: When moving `getFilteredAppViews`, `getFallbackAppView`, `viewLabels`, and `viewHints` to `utils/routeUtils.ts`, they must be re-exported from `workspaceShell.tsx` (`export { getFilteredAppViews, getFallbackAppView, viewLabels, viewHints } from "./utils/routeUtils";`) so no other UI module imports are broken.

---

## 4. Conclusion

All 3 circular dependency chains across `apps/web/src` (including the 2 reachable from `main.tsx`) are fully mapped and have surgical, risk-free refactoring plans:

1. **Refactor 1 (`useAppLogic.tsx` / `workspaceShell.tsx` / `utils/routeUtils.ts`)**: Move `viewLabels`, `viewHints`, `getFilteredAppViews`, `getFallbackAppView` from `workspaceShell.tsx` to `utils/routeUtils.ts`. Update `useAppLogic.tsx` import line 252.
2. **Refactor 2 (`ctPlanningExport.ts` / `ctPlanningExportScenarioSummary.ts` / `ctPlanningExportTypes.ts`)**: Repoint type imports in `ctPlanningExport.ts` and `ctPlanningExportScenarioSummary.ts` to `ctPlanningExportTypes.ts`.
3. **Refactor 3 (`documentValidators.ts` / `documentLogic.ts`)**: Define `DocumentState` in `documentValidators.ts` and remove `import type { DocumentState } from "./documentLogic"`.

These 3 surgical edits will achieve `npx madge --circular apps/web/src/main.tsx` = **0 circular dependencies**.

---

## 5. Verification Method

### 5.1 Commands to Verify
Run the following commands from `C:\Clinic_MVP\dental-crm`:

1. `npx madge --circular --extensions ts,tsx apps/web/src/main.tsx`
   - Expected result: `√ No circular dependency found!` (0 cycles).
2. `npx madge --circular apps/web/src/main.tsx`
   - Expected result: `√ No circular dependency found!` (0 cycles).
3. `npx madge --circular --extensions ts,tsx apps/web/src`
   - Expected result: `√ No circular dependency found!` (0 cycles).
4. `npm run typecheck -w @dental/web`
   - Expected result: Passes with 0 errors.

### 5.2 Status Split
- `ПРОВЕРЕНО`: Full cycle identification, exact line numbers, AST classification of edges, and `madge` output verification.
- `НЕ ПРОВЕРЕНО`: Physical implementation of source code changes (reserved for Implementer agent per read-only Explorer role).
