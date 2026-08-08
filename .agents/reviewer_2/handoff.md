# HANDOFF REPORT — Reviewer 2 (Category A Pass-Through Review & Regression Audit)

**Agent Role**: Reviewer 2 (`teamwork_preview_reviewer`)  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\reviewer_2`  
**Target Files Reviewed**: `apps/web/src/useAppLogic.tsx`, `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`  
**Date & Timestamp**: 2026-08-08T14:10:00Z  

---

## 1. Review Summary

**Verdict**: **REQUEST_CHANGES**

Worker 1's Category A pass-through wiring successfully exported many internal properties, but introduced **critical regressions and missing exports** by accidentally deleting 4 existing exported functions from `useDocumentWorkflowModule.ts` and renaming a core exported function `downloadPersistenceExport` in `useAppLogic.tsx` without maintaining backward compatibility for 5 UI consumers.

---

## 2. Findings

### [Critical] Finding 1: Accidental deletion of 4 exported functions in `useDocumentWorkflowModule.ts`
- **What**: 4 functions present in the body of `useDocumentWorkflowModule.ts` were deleted from its `return { ... }` object during Worker 1's return block edit.
- **Where**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`, lines 3647–3705.
- **Deleted Properties**:
  1. `documentKindsForCommunicationTask`
  2. `togglePhotoVideoMaterial`
  3. `selectAllEligibleTaxPaymentsForCurrentDocument`
  4. `selectRefundOriginalPayment`
- **Why this is a problem**: These 4 functions are consumed directly by key UI modules:
  - `CommunicationsView.tsx` consumes `documentKindsForCommunicationTask`
  - `DocumentsView.tsx` consumes `selectAllEligibleTaxPaymentsForCurrentDocument`, `selectRefundOriginalPayment`, `togglePhotoVideoMaterial`
  - `App.tsx` destructures and passes all 4 functions to sub-views.
  Because `useAppLogic.tsx` spreads `...documentWorkflow`, removing them from `useDocumentWorkflowModule.ts` causes them to be `undefined` in `useAppLogicContext()`. Calling them in UI views will throw runtime `TypeError: ... is not a function`.
- **Required Fix**: Re-add `documentKindsForCommunicationTask`, `togglePhotoVideoMaterial`, `selectAllEligibleTaxPaymentsForCurrentDocument`, and `selectRefundOriginalPayment` to the `return { ... }` object of `useDocumentWorkflowModule.ts`.

### [Major] Finding 2: Renaming `downloadPersistenceExport` to `exportPersistenceBackup` breaks 5 UI consumers
- **What**: Worker 1 renamed `downloadPersistenceExport` to `exportPersistenceBackup` in `useAppLogic.tsx` without preserving `downloadPersistenceExport` as an export or alias.
- **Where**: `apps/web/src/useAppLogic.tsx`, lines 2076 & 3994.
- **Why this is a problem**: 5 downstream files destructure `downloadPersistenceExport` from `useAppLogicContext()`:
  1. `apps/web/src/App.tsx`
  2. `apps/web/src/SettingsView.tsx`
  3. `apps/web/src/useSettingsDerivations.tsx`
  4. `apps/web/src/components/settings/SettingsAuditTab.tsx`
  5. `apps/web/src/components/settings/SettingsImportsTab.tsx`
  When users click export actions in Settings, `downloadPersistenceExport` is `undefined`, causing runtime `TypeError: downloadPersistenceExport is not a function`.
- **Required Fix**: Export `downloadPersistenceExport: exportPersistenceBackup` (or preserve `downloadPersistenceExport` name) in `useAppLogic.tsx` return object.

---

## 3. Observation

1. **Direct Inspection of `git diff apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`**:
   Line 3647–3654 diff showed:
   ```diff
   -		documentKindsForCommunicationTask,
   -		togglePhotoVideoMaterial,
   -		selectAllEligibleTaxPaymentsForCurrentDocument,
   -		selectRefundOriginalPayment,
   ```
   Checking ripgrep for usage in `apps/web/src/` showed active call sites in `App.tsx`, `CommunicationsView.tsx`, and `DocumentsView.tsx`.

2. **Direct Inspection of `git diff apps/web/src/useAppLogic.tsx`**:
   Line 3994 diff showed:
   ```diff
   -		downloadPersistenceExport,
   +		exportPersistenceBackup,
   ```
   Checking ripgrep for `downloadPersistenceExport` showed active call sites in `App.tsx`, `SettingsView.tsx`, `useSettingsDerivations.tsx`, `SettingsAuditTab.tsx`, and `SettingsImportsTab.tsx`.

3. **Compiler Health Gate (`npm run typecheck -w @dental/web`)**:
   Execution confirmed TypeScript compilation ran. No new Category A TS errors were introduced, but the deleted exports cause hidden runtime type mismatches (`undefined` property access on untyped or loosely-typed context consumers).

---

## 4. Logic Chain

1. **Observation**: `useDocumentWorkflowModule.ts` had 4 functions (`documentKindsForCommunicationTask`, `togglePhotoVideoMaterial`, `selectAllEligibleTaxPaymentsForCurrentDocument`, `selectRefundOriginalPayment`) in its return block prior to Worker 1's edit.
2. **Observation**: Worker 1 replaced the return block lines and omitted those 4 functions.
3. **Logic**: `useAppLogic` spreads `...documentWorkflow`. If `documentWorkflow` omits those 4 functions, `useAppLogic` context no longer provides them.
4. **Observation**: `App.tsx`, `CommunicationsView.tsx`, and `DocumentsView.tsx` attempt to destructure and invoke those 4 functions.
5. **Deduction**: At runtime, accessing `useAppLogicContext().selectAllEligibleTaxPaymentsForCurrentDocument` yields `undefined`, leading to runtime crash `TypeError: selectAllEligibleTaxPaymentsForCurrentDocument is not a function` when clicking tax payment selection in Documents View.
6. **Observation**: `useAppLogic.tsx` renamed `downloadPersistenceExport` to `exportPersistenceBackup`.
7. **Observation**: 5 UI files (`App.tsx`, `SettingsView.tsx`, `SettingsAuditTab.tsx`, `SettingsImportsTab.tsx`, `useSettingsDerivations.tsx`) destructure `downloadPersistenceExport`.
8. **Deduction**: At runtime, clicking "Export Persistence" in Settings View yields `undefined` function invocation error.
9. **Conclusion**: Verdict MUST be `REQUEST_CHANGES` to fix these 2 regressions before proceeding to subsequent milestones.

---

## 5. Stress Testing & Attack Surface Analysis

- **Scenario 1**: User opens `DocumentsView.tsx` and clicks "Select All Tax Payments".
  - Expected: `selectAllEligibleTaxPaymentsForCurrentDocument()` executes and checks tax payments.
  - Actual with Worker 1 changes: `selectAllEligibleTaxPaymentsForCurrentDocument` is `undefined`, component crashes with `TypeError`.
- **Scenario 2**: User opens `CommunicationsView.tsx` and views communication task document requirements.
  - Expected: `documentKindsForCommunicationTask(task)` resolves document kinds.
  - Actual with Worker 1 changes: `documentKindsForCommunicationTask` is `undefined`, component crashes.
- **Scenario 3**: Administrator opens `SettingsView` -> Audit tab and clicks "Export Backup".
  - Expected: `downloadPersistenceExport()` executes persistence backup download.
  - Actual with Worker 1 changes: `downloadPersistenceExport` is `undefined`, component crashes with `TypeError`.

---

## 6. Verified Claims & Coverage Gaps

### Verified Claims
- `useDocumentWorkflowModule.ts` exports added 50+ new Category A items: Verified via diff inspection.
- `useAppLogic.tsx` instantiates `staffSettings`, `mprLogic`, `patientIntake`: Verified via diff inspection.

### Coverage Gaps / Regressions
- 4 functions deleted from `useDocumentWorkflowModule.ts` return object: `documentKindsForCommunicationTask`, `togglePhotoVideoMaterial`, `selectAllEligibleTaxPaymentsForCurrentDocument`, `selectRefundOriginalPayment`.
- 1 function renamed in `useAppLogic.tsx` breaking 5 consumers: `downloadPersistenceExport`.

---

## 7. Conclusion

Verdict: **REQUEST_CHANGES**.
Worker 1 must perform a surgical fix to:
1. Restore `documentKindsForCommunicationTask`, `togglePhotoVideoMaterial`, `selectAllEligibleTaxPaymentsForCurrentDocument`, and `selectRefundOriginalPayment` in `useDocumentWorkflowModule.ts` return object.
2. Restore or alias `downloadPersistenceExport: exportPersistenceBackup` in `useAppLogic.tsx` return object.

---

## 8. Verification Method

To verify the requested changes:
1. Inspect `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts` return object to ensure all 4 deleted functions are restored.
2. Inspect `apps/web/src/useAppLogic.tsx` return object to ensure `downloadPersistenceExport` (or `downloadPersistenceExport: exportPersistenceBackup`) is exported.
3. Run `rg "documentKindsForCommunicationTask|togglePhotoVideoMaterial|selectAllEligibleTaxPaymentsForCurrentDocument|selectRefundOriginalPayment|downloadPersistenceExport" apps/web/src/` to ensure zero missing bindings.
4. Run `npm run typecheck -w @dental/web` to confirm compiler health.
