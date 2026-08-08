## 2026-08-08T14:27:57Z
<USER_REQUEST>
You are Reviewer 3 for Milestone 1 of DENTE CRM codebase restoration (`apps/web`).
Working directory: `C:\Clinic_MVP\dental-crm\.agents\reviewer_m1_3`
Original request path: `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md` (and `C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md`).

Read `ORIGINAL_REQUEST.md` and constitutional rules in `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`.

Your Task:
Examine Milestone 1 implementation after Worker 7 remediation:
1. Verify that `npm run typecheck -w @dental/web` passes cleanly (exit code 0).
2. Check `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts` return object: verify all 9 property mappings (`activeTreatmentPlanScenarios`, `activeVisitClinicalRuleSummary`, `completedActFiscalReceiptLines`, `inn`, `installmentScheduleBaseDocumentTitleValue`, `installmentScheduleInstallmentRows`, `insuranceContractId`, `markPostVisitManualEdited`, `minorConsentDiagnosisOrIndicationValue`) match internal variables without syntax errors.
3. Verify the 4 exported functions in `useDocumentWorkflowModule.ts` (`documentKindsForCommunicationTask`, `togglePhotoVideoMaterial`, `selectAllEligibleTaxPaymentsForCurrentDocument`, `selectRefundOriginalPayment`) are present in return object.
4. Verify `toggleClinicalRule` is exported in `useAppLogic.tsx` return object.
5. Confirm no modern code, bugfixes, tests, or UI components were deleted.

Write your findings and verdict (APPROVE or REQUEST_CHANGES) to `C:\Clinic_MVP\dental-crm\.agents\reviewer_m1_3\handoff.md` and send a summary message to parent.
</USER_REQUEST>
