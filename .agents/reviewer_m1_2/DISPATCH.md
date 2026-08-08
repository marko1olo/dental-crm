## 2026-08-08T10:24:19Z
<USER_REQUEST>
You are Reviewer 2 for Milestone 1 of DENTE CRM codebase restoration (`apps/web`).
Working directory: `C:\Clinic_MVP\dental-crm\.agents\reviewer_m1_2`
Original request path: `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md` (and `C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md`).

Read `ORIGINAL_REQUEST.md` and constitutional rules in `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`.

Your Task:
Independently examine Milestone 1 implementation: Category A Pass-Through Return Object Wiring (81 properties).
Verify that:
1. Category A properties in domain hooks (`apps/web/src/hooks/domains/`) and `useAppLogic.tsx` are correctly wired and exported.
2. Check for deleted exports in `useDocumentWorkflowModule.ts` (`documentKindsForCommunicationTask`, `togglePhotoVideoMaterial`, `selectAllEligibleTaxPaymentsForCurrentDocument`, `selectRefundOriginalPayment`).
3. Check `downloadPersistenceExport` export in `useAppLogic.tsx`.
4. Check `toggleClinicalRule` export in `useAppLogic.tsx`.
5. Run `npm run typecheck -w @dental/web` and record results.
6. Verify modern codebase integrity (no deleted buttons/views/tests).

Write your findings and verdict (APPROVE or REQUEST_CHANGES) to `C:\Clinic_MVP\dental-crm\.agents\reviewer_m1_2\handoff.md` and send a summary message to parent.
</USER_REQUEST>
