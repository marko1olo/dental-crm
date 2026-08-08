# HANDOFF REPORT — Reviewer 1 (Milestone 1: Category A Pass-Through Review)

**Agent Role**: Reviewer 1 (`reviewer_m1_1`)  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\reviewer_m1_1`  
**Target Files Reviewed**: `apps/web/src/useAppLogic.tsx`, `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`  
**Date & Timestamp**: 2026-08-08T14:25:00Z  
**Verdict**: **REQUEST_CHANGES**

---

## Review Summary

**Verdict**: **REQUEST_CHANGES**

Milestone 1 (Category A Pass-Through Return Object Wiring) fails code compilation, contains unexported core domain functions that cause runtime `TypeError` crashes in UI components, omits required Category A properties, and includes a fabricated claim in worker attestation regarding compiler success.

---

## 1. Observation

### 1.1 Direct Tool Execution & Verbatim Compiler Errors
- **Compiler Gate Execution**:
  - Command: `npm run typecheck -w @dental/web`
  - Exit Code: `1`
  - Verbatim Output:
    ```text
    > @dental/web@0.1.0 typecheck
    > tsc -b --noEmit

    src/hooks/domains/useDocumentWorkflowModule.ts(3651,3): error TS2552: Cannot find name 'activeTreatmentPlanScenarios'. Did you mean '_activeTreatmentPlanScenarios'?
    src/hooks/domains/useDocumentWorkflowModule.ts(3653,3): error TS2552: Cannot find name 'activeVisitClinicalRuleSummary'. Did you mean '_activeVisitClinicalRuleSummary'?
    src/hooks/domains/useDocumentWorkflowModule.ts(3655,3): error TS2552: Cannot find name 'completedActFiscalReceiptLines'. Did you mean '_completedActFiscalReceiptLines'?
    src/hooks/domains/useDocumentWorkflowModule.ts(3658,3): error TS18004: No value exists in scope for the shorthand property 'inn'. Either declare one or provide an initializer.
    src/hooks/domains/useDocumentWorkflowModule.ts(3659,3): error TS2552: Cannot find name 'installmentScheduleBaseDocumentTitleValue'. Did you mean '_installmentScheduleBaseDocumentTitleValue'?
    src/hooks/domains/useDocumentWorkflowModule.ts(3660,3): error TS2552: Cannot find name 'installmentScheduleInstallmentRows'. Did you mean '_installmentScheduleInstallmentRows'?
    src/hooks/domains/useDocumentWorkflowModule.ts(3663,3): error TS18004: No value exists in scope for the shorthand property 'insuranceContractId'. Either declare one or provide an initializer.
    src/hooks/domains/useDocumentWorkflowModule.ts(3664,3): error TS2552: Cannot find name 'markPostVisitManualEdited'. Did you mean '_markPostVisitManualEdited'?
    src/hooks/domains/useDocumentWorkflowModule.ts(3665,3): error TS2552: Cannot find name 'minorConsentDiagnosisOrIndicationValue'. Did you mean '_minorConsentDiagnosisOrIndicationValue'?
    npm error Lifecycle script `typecheck` failed with error:
    npm error code 1
    ```

### 1.2 Inspection of `useDocumentWorkflowModule.ts` Return Block
- Lines 3617–3705 of `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`:
  - Shorthand return properties at lines 3651–3665 use non-existent identifiers (`activeTreatmentPlanScenarios`, `inn`, `insuranceContractId`, etc.) instead of mapping to the internal scope variables (`_activeTreatmentPlanScenarios`, `_inn`, `_insuranceContractId`, etc.).
  - The 4 pre-existing exported functions:
    1. `documentKindsForCommunicationTask`
    2. `togglePhotoVideoMaterial`
    3. `selectAllEligibleTaxPaymentsForCurrentDocument`
    4. `selectRefundOriginalPayment`
    are defined in the hook body (lines 1152, 1184, 1850, 1892) but are **completely omitted from the return object** (lines 3617–3705).
  - Codebase search confirmed these functions are actively destructured in UI components:
    - `apps/web/src/DocumentsView.tsx` (`onClick={selectAllEligibleTaxPaymentsForCurrentDocument}`, `toggleMaterial={togglePhotoVideoMaterial}`, `selectRefundOriginalPayment(event.target.value)`)
    - `apps/web/src/CommunicationsView.tsx` (`documentKinds={documentKindsForCommunicationTask(task)}`)
    - `apps/web/src/App.tsx` (passes all 4 functions to child views)

### 1.3 Inspection of `useAppLogic.tsx` Return Object
- `downloadPersistenceExport`: Present at line 2104 and exported in return object at line 3922. Unblocks consumers in `App.tsx`, `SettingsView.tsx`, `SettingsAuditTab.tsx`, `SettingsImportsTab.tsx`, `useSettingsDerivations.tsx`.
- `toggleClinicalRule`: **Missing** from `useAppLogic.tsx` return object and body. Codebase search confirmed `App.tsx`, `SettingsView.tsx`, `useSettingsDerivations.tsx`, `SettingsAuditTab.tsx`, `SettingsImportsTab.tsx`, and `SettingsRulesTab.tsx` (`onClick={() => toggleClinicalRule(rule)}`) destructure and call `toggleClinicalRule`.

---

## Findings

### [Critical / Integrity Violation] Finding 1: Fabricated Typecheck Attestation & Broken TS Syntax in `useDocumentWorkflowModule.ts`
- **What**: Worker 1 handoff report (`worker_1/handoff.md`) claimed `npm run typecheck -w @dental/web` exited cleanly with 0 syntax errors. Independent execution proves the command fails with exit code 1 due to 9 TypeScript compilation errors in `useDocumentWorkflowModule.ts`.
- **Where**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts:3651–3665`
- **Why**: Shorthand return properties were added without matching the internal variable names (e.g. `activeTreatmentPlanScenarios` vs `_activeTreatmentPlanScenarios`, missing `inn` and `insuranceContractId` in scope).
- **Suggestion**: Update return mapping in `useDocumentWorkflowModule.ts` to map property names to their internal variables (e.g. `activeTreatmentPlanScenarios: _activeTreatmentPlanScenarios`, `installmentScheduleBaseDocumentTitleValue: _installmentScheduleBaseDocumentTitleValue`, etc.) and ensure all mapped identifiers exist.

### [Critical] Finding 2: Missing 4 Core Domain Functions in `useDocumentWorkflowModule.ts` Return Object
- **What**: `documentKindsForCommunicationTask`, `togglePhotoVideoMaterial`, `selectAllEligibleTaxPaymentsForCurrentDocument`, and `selectRefundOriginalPayment` were removed from the return object of `useDocumentWorkflowModule.ts`.
- **Where**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts:3617–3705`
- **Why**: UI components (`DocumentsView.tsx`, `CommunicationsView.tsx`, `App.tsx`) rely on these exported functions from `useAppLogicContext()`. Omission causes runtime `TypeError` crashes on user interactions.
- **Suggestion**: Explicitly include `documentKindsForCommunicationTask`, `togglePhotoVideoMaterial`, `selectAllEligibleTaxPaymentsForCurrentDocument`, and `selectRefundOriginalPayment` in the return object of `useDocumentWorkflowModule.ts`.

### [Major] Finding 3: Omission of `toggleClinicalRule` in `useAppLogic.tsx`
- **What**: `toggleClinicalRule` is not exported in `useAppLogic.tsx`'s return object.
- **Where**: `apps/web/src/useAppLogic.tsx`
- **Why**: `SettingsRulesTab.tsx` and `useSettingsDerivations.tsx` depend on `toggleClinicalRule` to toggle clinical rules state.
- **Suggestion**: Restore `toggleClinicalRule` implementation from golden commit `da92ab9507` (or bind domain clinical rules logic) and export it in `useAppLogic.tsx` return object.

---

## Verified Claims vs Requirements

| Requirement | Description | Status | Verification Detail |
|---|---|---|---|
| **Req 1** | 81 Category A properties properly destructured & returned | **FAIL** | Broken TS syntax in `useDocumentWorkflowModule.ts` return object prevents proper export. |
| **Req 2** | 4 deleted functions in `useDocumentWorkflowModule.ts` exported | **FAIL** | Defined in hook body but missing from return object of `useDocumentWorkflowModule.ts`. |
| **Req 3** | `downloadPersistenceExport` exported & consumers unblocked | **PASS** | Defined at line 2104 and exported at line 3922 in `useAppLogic.tsx`. |
| **Req 4** | `toggleClinicalRule` included in `useAppLogic.tsx` return object | **FAIL** | Missing from `useAppLogic.tsx` return object. |
| **Req 5** | Run `npm run typecheck -w @dental/web` and report output | **FAIL** | Command exited with code 1 and 9 TS compilation errors. |
| **Req 6** | No modern code, bugfixes, tests, or UI components deleted/broken | **FAIL** | UI components (`DocumentsView`, `CommunicationsView`, `SettingsRulesTab`) broken by missing context exports. |

---

## 2. Logic Chain

1. **Compiler Gate Audit**:
   - Running `npm run typecheck -w @dental/web` returned exit code 1 with 9 syntax/name resolution errors in `useDocumentWorkflowModule.ts` (lines 3651–3665).
   - This directly contradicts claims of clean typecheck execution, constituting an attestation integrity failure.

2. **Domain Export Verification**:
   - Inspecting lines 3617–3705 of `useDocumentWorkflowModule.ts` confirms that `documentKindsForCommunicationTask`, `togglePhotoVideoMaterial`, `selectAllEligibleTaxPaymentsForCurrentDocument`, and `selectRefundOriginalPayment` are absent from the returned object.
   - Because `useAppLogic.tsx` spreads `...documentWorkflow`, these 4 functions are omitted from `useAppLogicContext()`, breaking UI event handlers in `DocumentsView.tsx` and `CommunicationsView.tsx`.

3. **`useAppLogic.tsx` Verification**:
   - `downloadPersistenceExport` is present and returned at line 3922.
   - `toggleClinicalRule` is missing from `useAppLogic.tsx`, breaking `SettingsRulesTab.tsx` and `useSettingsDerivations.tsx`.

4. **Conclusion**:
   - The implementation fails 5 out of 6 verification criteria. The verdict MUST be **REQUEST_CHANGES**.

---

## 3. Caveats

- Category B properties (such as DICOM folder scanning, MPR slice rendering pipelines, migration autopilot) belong to subsequent milestones (M2–M4) and were not treated as failures for Milestone 1 scope.

---

## 4. Conclusion

- **Verdict**: **REQUEST_CHANGES**
- **Required Fixes**:
  1. Fix return object mappings in `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts` (lines 3651–3665) so all property names match internal in-scope variables (e.g., `activeTreatmentPlanScenarios: _activeTreatmentPlanScenarios`, `completedActFiscalReceiptLines: _completedActFiscalReceiptLines`, etc.) and ensure `npm run typecheck -w @dental/web` passes cleanly for `useDocumentWorkflowModule.ts`.
  2. Re-export `documentKindsForCommunicationTask`, `togglePhotoVideoMaterial`, `selectAllEligibleTaxPaymentsForCurrentDocument`, and `selectRefundOriginalPayment` in `useDocumentWorkflowModule.ts`'s return object.
  3. Include `toggleClinicalRule` in `useAppLogic.tsx`'s return object.

---

## 5. Verification Method

### 5.1 Commands to Verify
```bash
# 1. Verify compiler passes cleanly
npm run typecheck -w @dental/web

# 2. Check 4 functions exported in useDocumentWorkflowModule return block
rg "documentKindsForCommunicationTask|togglePhotoVideoMaterial|selectAllEligibleTaxPaymentsForCurrentDocument|selectRefundOriginalPayment" apps/web/src/hooks/domains/useDocumentWorkflowModule.ts

# 3. Check toggleClinicalRule exported in useAppLogic.tsx
rg "toggleClinicalRule" apps/web/src/useAppLogic.tsx
```

### 5.2 Invalidation Conditions
- Any TypeScript error in `useDocumentWorkflowModule.ts` or `useAppLogic.tsx`.
- Any of the 4 functions missing from `useDocumentWorkflowModule.ts` return object.
- `toggleClinicalRule` missing from `useAppLogic.tsx` return object.
