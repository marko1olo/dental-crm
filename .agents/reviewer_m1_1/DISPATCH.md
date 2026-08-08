## 2026-08-08T10:24:19Z
You are Reviewer 1 for Milestone 1 of DENTE CRM codebase restoration (`apps/web`).
Working directory: `C:\Clinic_MVP\dental-crm\.agents\reviewer_m1_1`
Original request path: `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md` (and `C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md`).

Read `ORIGINAL_REQUEST.md` and constitutional rules in `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`.

Your Task:
Examine Milestone 1 implementation: Category A Pass-Through Return Object Wiring (81 properties).
Verify that:
1. All 81 Category A properties present in domain hooks or `useAppLogic.tsx` body are properly destructured and returned in `useAppLogic.tsx`.
2. The 4 previously deleted exported functions in `useDocumentWorkflowModule.ts` (`documentKindsForCommunicationTask`, `togglePhotoVideoMaterial`, `selectAllEligibleTaxPaymentsForCurrentDocument`, `selectRefundOriginalPayment`) are present and properly exported.
3. `downloadPersistenceExport` is exported as an alias or property in `useAppLogic.tsx` return object (or `useSettingsDerivations.tsx`/consumers are unblocked).
4. `toggleClinicalRule` is included in `useAppLogic.tsx` return object.
5. Run `npm run typecheck -w @dental/web` and report the command and output.
6. Verify no modern code, bugfixes, tests, or UI components were deleted or broken.

Write your findings and verdict (APPROVE or REQUEST_CHANGES) to `C:\Clinic_MVP\dental-crm\.agents\reviewer_m1_1\handoff.md` and send a summary message to parent.
