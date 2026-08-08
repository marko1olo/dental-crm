# Handoff Report: `useDocumentWorkflowModule.ts` False Positives Analysis

**Agent**: `reassessment_explorer_1`  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\reassessment_explorer_1`  
**Target File**: `C:\Clinic_MVP\dental-crm\apps\web\src\hooks\domains\useDocumentWorkflowModule.ts`  
**Date**: 2026-08-08  

---

## 1. Observation

1. **Exact File Path**: `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`.
2. **Git Commit History**:
   - In commit `19d503aa9` (lines 1454, 1476, 1524, 2672, 2695, 2727, 2755):
     ```ts
     const selectedTaxDocumentPayerInn = selectedTaxDocumentPayerOption?.inn ?? "";
     const eligibleTaxPaymentIdsKey = eligibleTaxPayments.map((payment) => payment.id).join("|");
     const eligiblePaymentReceiptIdsKey = eligiblePaymentReceiptPayments.map((payment) => payment.id).join("|");
     ```
     `eligibleTaxPaymentIdsKey` and `eligiblePaymentReceiptIdsKey` were used directly in `useEffect` dependency arrays:
     ```ts
     useEffect(() => { ... }, [documentLocalPersistenceOrganizationId, eligibleTaxPaymentIdsKey, selectedDocumentUsesTaxPaymentSelection, taxPaymentSelectionPersistenceKey]);
     useEffect(() => { ... }, [documentLocalPersistenceOrganizationId, eligiblePaymentReceiptIdsKey, selectedDocumentUsesPaymentReceiptSelection, paymentReceiptSelectionPersistenceKey]);
     ```
   - In commit `67bfb44b7` ("fix(web): restore tsc exit 0..."):
     The `useEffect` dependency arrays were changed from `eligibleTaxPaymentIdsKey` to `eligibleTaxPayments.map` and `eligiblePaymentReceiptPayments.map`. The keys were renamed with leading underscores: `_selectedTaxDocumentPayerInn`, `_eligibleTaxPaymentIdsKey`, `_eligiblePaymentReceiptIdsKey`.
   - In commit `c75389970` ("refactor(arch): format, remove unused variables..."):
     ```diff
     - const _selectedTaxDocumentPayerInn = selectedTaxDocumentPayerOption?.inn ?? "";
     - const _eligibleTaxPaymentIdsKey = eligibleTaxPayments.map((payment) => payment.id).join("|");
     - const _eligiblePaymentReceiptIdsKey = eligiblePaymentReceiptPayments.map((payment) => payment.id).join("|");
     ```
     All three variables were removed from `useDocumentWorkflowModule.ts`.
3. **Current Code State**:
   - Lines 1959 and 2014 of `useDocumentWorkflowModule.ts` currently contain invalid dependency entries `eligibleTaxPayments.map` and `eligiblePaymentReceiptPayments.map` in React `useEffect` hooks.

---

## 2. Logic Chain

1. **Observation 2** shows that `eligibleTaxPaymentIdsKey` and `eligiblePaymentReceiptIdsKey` were originally created to provide serialized primitive string dependencies (`"id1|id2|id3"`) for `useEffect` hooks.
2. In React, array object references recreated on re-render cause `useEffect` hooks to re-trigger endlessly or fail equality checks. Serializing IDs into a string key guarantees hook execution occurs **only when the payment selection contents actually change**.
3. **Observation 2** shows that in commit `67bfb44b7`, an agent accidentally replaced `eligibleTaxPaymentIdsKey` in `useEffect` dependency arrays with `eligibleTaxPayments.map`. This broke the hook dependency and made the string key variables appear unused to simple static analysis.
4. The agent added leading underscores `_` to suppress unused variable warnings.
5. In commit `c75389970`, a second agent performed a naive unused variable removal pass and deleted `_selectedTaxDocumentPayerInn`, `_eligibleTaxPaymentIdsKey`, and `_eligiblePaymentReceiptIdsKey` without tracing why they existed or how the `useEffect` hooks were corrupted.
6. Therefore, the false positive dead code classification was caused by a compound failure: **React hook dependency array corruption followed by naive `_`-prefixed variable deletion**.

---

## 3. Caveats

- We conducted a read-only investigation per task mandates. No code changes were applied to `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`.
- Additional variables across `apps/web/src` may have suffered from the same pattern of `_` prefixing during commit `67bfb44b7` followed by deletion in `c75389970`.

---

## 4. Conclusion

The deletion of `_selectedTaxDocumentPayerInn`, `_eligibleTaxPaymentIdsKey`, and `_eligiblePaymentReceiptIdsKey` in `useDocumentWorkflowModule.ts` was a **false positive failure**. 
- `selectedTaxDocumentPayerInn` is required for tax document payer INN resolution.
- `eligibleTaxPaymentIdsKey` and `eligiblePaymentReceiptIdsKey` are essential primitive string serialization keys required for stable React `useEffect` payment selection hydration/persistence.
- They must be restored, stripped of leading underscores, and wired back into their respective `useEffect` dependency arrays in place of `eligibleTaxPayments.map` and `eligiblePaymentReceiptPayments.map`.

Detailed technical documentation has been recorded in `C:\Clinic_MVP\dental-crm\.agents\reassessment_explorer_1\analysis.md`.

---

## 5. Verification Method

To independently verify these findings:

1. **Git Commit Comparison**:
   Run:
   ```powershell
   git show c75389970 -- apps/web/src/hooks/domains/useDocumentWorkflowModule.ts
   git show 67bfb44b7~1:apps/web/src/hooks/domains/useDocumentWorkflowModule.ts
   ```
2. **Inspect Current Dependency Array Anomaly**:
   Check lines 1955-1961 and 2010-2016 in `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`. Verify that `eligibleTaxPayments.map` is present in the `useEffect` dependency array.
3. **Typecheck Validation**:
   Run `npm run typecheck -w @dental/web` in `C:\Clinic_MVP\dental-crm` to verify current build status.
