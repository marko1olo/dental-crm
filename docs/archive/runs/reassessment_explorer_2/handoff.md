# Handoff Report: Audit of Git History & Deletions across `apps/web/src`

**Agent**: reassessment_explorer_2 (Read-Only Exploration Agent)  
**Target Path**: `C:\Clinic_MVP\dental-crm\.agents\reassessment_explorer_2\handoff.md`  
**Date**: 2026-08-08  

---

## 1. Observation

### Exact Commands Executed:
- `git status`
- `git log --oneline -n 30 -- apps/web/src`
- `git log -p -n 35 -- apps/web/src`
- `git show --stat c75389970`
- `git show 3c4243df8 --stat`
- Custom Node.js AST/tokenizer indexing scripts scanning all 479 files in `apps/web/src`.

### Verbatim Git Log Findings:
- Commit `c75389970ae6` (`refactor(arch): format, remove unused variables, and fix structural prop bypassing`) modified 224 files with 17,210 insertions and 2,705 deletions.
- In `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`:
  - Line 3614 deleted: `const _selectedTaxDocumentPayerInn = selectedTaxDocumentPayerOption?.inn ?? "";`
  - Line 3618 deleted: `const _eligibleTaxPaymentIdsKey = eligibleTaxPayments.map((payment) => payment.id).sort().join(",");`
  - Line 3622 deleted: `const _eligiblePaymentReceiptIdsKey = eligiblePaymentReceiptPayments.map((payment) => payment.id).sort().join(",");`
- In `apps/web/src/components/odontogram/OdontogramModule.tsx` (commit `c75389970ae6` & `e02fc097e97b`):
  - Batch tooth state failure toast `Отметка «${TOOTH_STATE_LABELS[state]}» на ... не сохранена` was stripped during `.catch(() => {})` elimination pass.
- In `apps/web/src/components/finance/FamilyWalletPanel.tsx` (commit `3f3288113dcd`):
  - Error JSON parsing `const err = await res.json().catch(() => ({}) as { message?: string });` was deleted during cleanup.

---

## 2. Logic Chain

1. **Observation**: In `useDocumentWorkflowModule.ts`, `_eligibleTaxPaymentIdsKey` was defined as `eligibleTaxPayments.map(p => p.id).sort().join(",")` and used inside `useMemo` dependency arrays: `useMemo(() => ..., [eligibleTaxPayments, _eligibleTaxPaymentIdsKey])`.
2. **Reasoning**: Standard JS reference equality in React `useMemo` checks array reference identity (`eligibleTaxPayments`). If `eligibleTaxPayments` array contents change in-place or are re-filtered without reference change, `useMemo` will NOT recompute unless a primitive string key like `_eligibleTaxPaymentIdsKey` is included in the dependency array.
3. **Observation**: Automated refactoring agents/linters scanned `useDocumentWorkflowModule.ts`, saw that `_eligibleTaxPaymentIdsKey` was not rendered in JSX or exported in the return object, and flagged it as an "unused variable".
4. **Conclusion**: Removing or prefixing `_eligibleTaxPaymentIdsKey` was an **INCORRECT (false positive)** deletion because it broke the reactive update mechanism of `selectedTaxPaymentIdSet`.
5. **Observation**: Similar false positive removals were identified in `OdontogramModule.tsx` (error handling stripped) and `FamilyWalletPanel.tsx` (error message extraction removed).

---

## 3. Caveats

- **Unexplored Areas**: Non-web directories (e.g. `apps/api`) were outside the scope of this `apps/web/src` audit.
- **Assumptions**: Presumed that runtime behavioral tests (`smoke.spec.ts`, Playwright E2E) reflect full user interaction flows.
- **Alternative Interpretations**: Some variable removals (such as legacy `money()` in `AppHelpers.tsx`) were replaced by central `utils/financeUtils.ts` (`formatRubles`), making the helper function deletion correct, provided all call sites were updated.

---

## 4. Conclusion

- Automated and agent-led "dead code" cleanups suffered from **Local JSX Scope Myopia**: variables serving as reactive triggers or error-parsing layers were incorrectly deleted because they were not directly rendered in JSX markup.
- **Key Restoration Candidates**:
  1. `_eligibleTaxPaymentIdsKey` & `_eligiblePaymentReceiptIdsKey` in `useDocumentWorkflowModule.ts` (Reactive dependency keys for tax/receipt selection).
  2. `selectedTaxPaymentTotalRub` & `selectedPaymentReceiptTotalRub` exported values in `useDocumentWorkflowModule.ts`.
  3. Batch tooth state error toast & state rollback in `OdontogramModule.tsx`.
  4. Error JSON payload extraction in `FamilyWalletPanel.tsx`.

---

## 5. Verification Method

### 1. Programmatic Typecheck:
Run terminal command:
```bash
npm run typecheck -w @dental/web
```
Verify exit code is 0 and 0 type errors are reported.

### 2. Git History Inspection:
Run git log commands to inspect tax document module changes:
```bash
git log -p -n 5 -- apps/web/src/hooks/domains/useDocumentWorkflowModule.ts
```
Verify `_eligibleTaxPaymentIdsKey` and `_eligiblePaymentReceiptIdsKey` are present in `selectedTaxPaymentIdSet` and `selectedPaymentReceiptIdSet` dependency arrays.

### 3. Invalidation Conditions:
- If `npm run typecheck -w @dental/web` fails with missing export errors.
- If toggling tax payment checkboxes in NDFL certificate modal fails to update total tax payment ruble sums.
