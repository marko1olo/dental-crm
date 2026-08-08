## 2026-08-08T10:25:22Z
<USER_REQUEST>
You are Worker 7 for Milestone 1 of DENTE CRM codebase restoration (`apps/web`).
Working directory: `C:\Clinic_MVP\dental-crm\.agents\worker_7`
Original request path: `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md` (and `C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md`).

Read `ORIGINAL_REQUEST.md` and constitutional rules in `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`.

You own these files exclusively:
- `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`
- `apps/web/src/useAppLogic.tsx`

Your Task:
Perform surgical fixes for Milestone 1 (Category A Pass-Through Return Object Wiring):

1. **Fix Property Name Mismatches in `useDocumentWorkflowModule.ts`**:
   In `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts` around lines 3651–3665, update the return object to map property names to their internal scoped variables:
   - `activeTreatmentPlanScenarios: _activeTreatmentPlanScenarios`
   - `activeVisitClinicalRuleSummary: _activeVisitClinicalRuleSummary`
   - `completedActFiscalReceiptLines: _completedActFiscalReceiptLines`
   - `inn: _inn`
   - `installmentScheduleBaseDocumentTitleValue: _installmentScheduleBaseDocumentTitleValue`
   - `installmentScheduleInstallmentRows: _installmentScheduleInstallmentRows`
   - `insuranceContractId: _insuranceContractId`
   - `markPostVisitManualEdited: _markPostVisitManualEdited`
   - `minorConsentDiagnosisOrIndicationValue: _minorConsentDiagnosisOrIndicationValue`

2. **Re-Export 4 Missing Functions in `useDocumentWorkflowModule.ts`**:
   In `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts` return object (lines 3617–3705), add the 4 functions defined in the hook body:
   - `documentKindsForCommunicationTask`
   - `togglePhotoVideoMaterial`
   - `selectAllEligibleTaxPaymentsForCurrentDocument`
   - `selectRefundOriginalPayment`

3. **Restore `toggleClinicalRule` in `useAppLogic.tsx`**:
   In `apps/web/src/useAppLogic.tsx`, extract the implementation of `toggleClinicalRule` from golden commit `da92ab9507` (`git show da92ab9507:apps/web/src/useAppLogic.tsx`) or restore its state toggle logic, and add `toggleClinicalRule` to `useAppLogic.tsx`'s return object.

4. **Verify Compiler Gate**:
   Execute `npm run typecheck -w @dental/web` in terminal and ensure it exits with code 0! Record the exact command and terminal output.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your report and results to `C:\Clinic_MVP\dental-crm\.agents\worker_7\handoff.md` and notify parent.
</USER_REQUEST>
