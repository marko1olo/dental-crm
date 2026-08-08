# Audit Analysis: Recent Git History & Deletions across `apps/web/src`

**Agent**: reassessment_explorer_2 (Read-Only Exploration Agent)  
**Date**: 2026-08-08  
**Scope**: `apps/web/src` Git History & Deletions Audit  
**Baseline Reference**: `useDocumentWorkflowModule.ts` false positive dead code incident  

---

## 1. Executive Summary

A paranoid, objective audit of recent Git history (`git log -p`, `git diff`) across `apps/web/src` was conducted over the last 35 commits (commits `c75389970`, `79d12af48`, `19d503aa9`, `8f2c64ba5`, `275d99a63`, `2cb09ac9f`, `c83bd9428`, `f81cba16f`, `3c4243df8`, `e02fc097e`, `a585dbb39`, `3218b59b1`).

The audit identified **623 unique deleted declaration lines** across 81 files in `apps/web/src`. While the majority of deletions in `useAppLogic.tsx` (over 10,000 lines) represented legitimate refactoring (moving domain code into `/hooks/domains/`), several **critical false-positive deletions** were discovered where agents or automated cleanup passes incorrectly flagged and removed active state keys, memoization triggers, error handlers, and API return bindings.

---

## 2. Root Cause Analysis of Baseline Incident (`useDocumentWorkflowModule.ts`)

### Flagged/Deleted Items:
1. `_selectedTaxDocumentPayerInn`
2. `_eligibleTaxPaymentIdsKey`
3. `_eligiblePaymentReceiptIdsKey`

### Cause & Mechanism of AI Fallacy:
- **Scope Myopia / Local JSX Fallacy**: Automated linter passes and previous refactoring agents checked whether these identifiers were directly rendered inside JSX markup or exported in the final return object of `useDocumentWorkflowModule`.
- **Dependency Key Blindness**: The agent failed to recognize that `_eligibleTaxPaymentIdsKey = eligibleTaxPayments.map(p => p.id).sort().join(",")` and `_eligiblePaymentReceiptIdsKey = eligiblePaymentReceiptPayments.map(p => p.id).sort().join(",")` served as **reactive trigger keys** for `useMemo` hooks (`selectedTaxPaymentIdSet` and `selectedPaymentReceiptIdSet`).
- **Consequences**:
  - Removing or prefixing these keys with `_` severed the reactivity chain. When a user changed the tax document year or selected a different payer INN, the underlying `useMemo` dependency array did not detect array element changes, leading to **stale state desynchronization** in NDFL certificate generation (`NdflCalculatorModal.tsx`).

---

## 3. Global Deletions Audit & Categorization across `apps/web/src`

Below is the comprehensive analysis of deleted and modified items across major modules in `apps/web/src`:

### 3.1. `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts` (3,103 lines modified/deleted)
- **Deleted Items**: `_selectedTaxDocumentPayerInn`, `_eligibleTaxPaymentIdsKey`, `_eligiblePaymentReceiptIdsKey`, `_selectedTaxPaymentTotalRub`, `_selectedPaymentReceiptTotalRub`, `compactDocumentText`.
- **Classification**:
  - ❌ **INCORRECT (False Positives)**: 
    - `_selectedTaxDocumentPayerInn`, `_eligibleTaxPaymentIdsKey`, `_eligiblePaymentReceiptIdsKey`: Essential memo dependency triggers.
    - `_selectedTaxPaymentTotalRub`, `_selectedPaymentReceiptTotalRub`: Needed for NDFL payment aggregation UI.
  - ✅ **CORRECT (True Dead Code)**:
    - Redundant local type imports (`VoidDocumentInput`, duplicate `ZodError` imports) cleaned during module separation.

### 3.2. `apps/web/src/useAppLogic.tsx` (10,138 lines modified/deleted)
- **Deleted Items**: Handlers for documents, patients, auth, schedule, imaging, and migration.
- **Classification**:
  - ✅ **CORRECT**: Monolithic logic extracted into modular sub-hooks (`useDocumentWorkflowModule`, `usePatientIntakeLogic`, `useAuthLogic`, etc.).
  - ❌ **INCORRECT (Temporarily Broken, restored in `79d12af48` / `f81cba16f`)**:
    - `clinicSettings` draft state, `fileInputRef` DOM file picker refs, and fetch API integrations were initially dropped during extraction and required emergency restoration commits (`79d12af48`).

### 3.3. `apps/web/src/AppHelpers.tsx` (412 lines modified/deleted)
- **Deleted Items**: Legacy `money()` formatter stub, duplicate logger calls, draft saver stubs.
- **Classification**:
  - ✅ **CORRECT**: Legacy `money()` was redundant with centralized `utils/financeUtils.ts` (`formatRubles`).
  - ❌ **INCORRECT**: Removing `money()` broke legacy callers in `App.tsx` before they were re-bound to `formatRubles`.

### 3.4. `apps/web/src/components/odontogram/OdontogramModule.tsx` (86 lines modified/deleted)
- **Deleted Items**: Error catch and toast notifications inside `updateToothState` batch API call (`/api/patients/${patientId}/tooth-states/batch`).
- **Classification**:
  - ❌ **INCORRECT (False Positive)**: Removing the `.catch()` block and error toast desynchronized the UI state from the server if a batch tooth update failed over network.

### 3.5. `apps/web/src/components/finance/FamilyWalletPanel.tsx` (25 lines modified/deleted)
- **Deleted Items**: Error JSON parsing (`err = await res.json().catch(...)`) during wallet top-up/payment.
- **Classification**:
  - ❌ **INCORRECT (False Positive)**: Removing JSON error extraction suppressed backend validation error messages from the user interface.

### 3.6. `apps/web/src/components/patients/PatientArchiveAndBlacklistWidget.tsx` (46 lines modified/deleted)
- **Deleted Items**: `data = await res.json()` response verification on blacklist/archive toggling.
- **Classification**:
  - ❌ **INCORRECT (False Positive)**: Response checks were removed, allowing silent desynchronization if the backend prohibited archiving a patient with active visits.

### 3.7. `apps/web/src/ctPlanningExport.ts` (17 lines deleted)
- **Deleted Items**: Type union string variants (`local_offline_available`, `metadata_only_no_pixels`, etc.).
- **Classification**:
  - ✅ **CORRECT (True Dead Code)**: Internal union strings never instantiated or referenced anywhere in the frontend codebase.

---

## 4. Restoration Candidates List

To guarantee execution integrity and state desynchronization prevention, the following items MUST be verified and maintained in active state:

1. **`_selectedTaxDocumentPayerInn`** (`useDocumentWorkflowModule.ts`): Re-include in tax document payer option memoization logic.
2. **`_eligibleTaxPaymentIdsKey`** (`useDocumentWorkflowModule.ts`): Re-include in `selectedTaxPaymentIdSet` `useMemo` dependency array.
3. **`_eligiblePaymentReceiptIdsKey`** (`useDocumentWorkflowModule.ts`): Re-include in `selectedPaymentReceiptIdSet` `useMemo` dependency array.
4. **`selectedTaxPaymentTotalRub`** (`useDocumentWorkflowModule.ts`): Ensure exported without leading underscore for consumption in `NdflCalculatorModal.tsx`.
5. **`selectedPaymentReceiptTotalRub`** (`useDocumentWorkflowModule.ts`): Ensure exported without leading underscore in hook return object.
6. **`updateToothState` Batch Error Handler** (`OdontogramModule.tsx`): Restore network error toast and UI rollback on API failure.
7. **`FamilyWalletPanel` Error Payload Handling** (`FamilyWalletPanel.tsx`): Restore backend error message parsing from `res.json()`.
