## 2026-08-08T21:50:04Z

TASK OBJECTIVE: Restore falsely deleted code in `useDocumentWorkflowModule.ts`, `OdontogramModule.tsx`, and `FamilyWalletPanel.tsx`, and verify clean typecheck.

INSTRUCTIONS:
1. Read `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md` (specifically timestamped 2026-08-08T21:40:35Z).
2. Read the findings in:
   - `C:\Clinic_MVP\dental-crm\.agents\reassessment_explorer_1\analysis.md`
   - `C:\Clinic_MVP\dental-crm\.agents\reassessment_explorer_2\analysis.md`
   - `C:\Clinic_MVP\dental-crm\.agents\reassessment_explorer_3\analysis.md`

3. Modify `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`:
   a. Restore `selectedTaxDocumentPayerInn`:
      ```ts
      const selectedTaxDocumentPayerInn = selectedTaxDocumentPayerOption?.inn ?? "";
      ```
   b. Restore primitive string dependency keys:
      ```ts
      const eligibleTaxPaymentIdsKey = eligibleTaxPayments.map((p) => p.id).join("|");
      const eligiblePaymentReceiptIdsKey = eligiblePaymentReceiptPayments.map((p) => p.id).join("|");
      ```
   c. Fix corrupted `useEffect` dependency arrays for document payment selection loading and saving:
      - Replace invalid `eligibleTaxPayments.map` references in `useEffect` dependency arrays with `eligibleTaxPaymentIdsKey`.
      - Replace invalid `eligiblePaymentReceiptPayments.map` references in `useEffect` dependency arrays with `eligiblePaymentReceiptIdsKey`.
   d. Ensure `selectedTaxPaymentTotalRub` and `selectedPaymentReceiptTotalRub` are properly defined and included in the return object of `useDocumentWorkflowModule`.

4. Modify `apps/web/src/components/odontogram/OdontogramModule.tsx`:
   - Restore the `.catch()` error handler, network error toast message, and state rollback mechanism for batch tooth updates (`updateToothState`).

5. Modify `apps/web/src/components/finance/FamilyWalletPanel.tsx`:
   - Restore backend JSON error payload extraction (`await res.json().catch(() => null)`) for wallet top-up validation error reporting.

6. VERIFICATION:
   - Run `npm run typecheck -w @dental/web` using the terminal and verify that it completes with 0 errors.
   - Run `npx madge --circular apps/web/src/main.tsx` to confirm 0 circular dependencies.
   - Include the raw stdout output of the typecheck and madge commands in your handoff report.

7. Write your handoff report to `C:\Clinic_MVP\dental-crm\.agents\reassessment_worker_1\handoff.md`.
8. Send a message to the caller (parent ID: 4a1c1387-e164-4a84-98d7-6855b66fc410) with the summary of your changes, terminal outputs, and the absolute path to your handoff report.
