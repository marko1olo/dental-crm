## 2026-08-08T14:09:03Z

<USER_REQUEST>
You are Worker 6 (teamwork_preview_worker).
Your working directory is `C:\Clinic_MVP\dental-crm\.agents\worker_6`.

You MUST read:
1. `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md` (Constitutional rules)
2. `C:\Clinic_MVP\dental-crm\.agents\orchestrator\GATE_STATUS.md` (Gate failure reason)
3. `C:\Clinic_MVP\dental-crm\.agents\reviewer_2\handoff.md` (Reviewer 2 regression report)

OBJECTIVE:
Perform surgical fixes for Milestone 1 regressions:
1. In `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts`: Restore the 4 accidentally deleted exported functions in its return object:
   - `documentKindsForCommunicationTask`
   - `togglePhotoVideoMaterial`
   - `selectAllEligibleTaxPaymentsForCurrentDocument`
   - `selectRefundOriginalPayment`
2. In `apps/web/src/useAppLogic.tsx`: Export `downloadPersistenceExport: exportPersistenceBackup` (or export `downloadPersistenceExport` alongside `exportPersistenceBackup`) in the `return { ... }` object so all 5 UI consumers (`App.tsx`, `SettingsView.tsx`, `useSettingsDerivations.tsx`, `SettingsAuditTab.tsx`, `SettingsImportsTab.tsx`) can invoke it cleanly.
3. Run `npm run typecheck -w @dental/web` to confirm that all exports pass cleanly without compilation or runtime errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your report to `C:\Clinic_MVP\dental-crm\.agents\worker_6\handoff.md` and send a completion message to the parent orchestrator.
</USER_REQUEST>

## 2026-08-08T14:09:14Z

<MESSAGE sender=97680c8e-d12a-4f18-a4a3-2582b645c6ac priority=MESSAGE_PRIORITY_HIGH>
**Context**: Milestone 1 Regression Remediation (Worker 6)
**Content**: Reviewer 1 also identified a 3rd item that requires fixing alongside Reviewer 2's findings:
3. `toggleClinicalRule` is destructured in `useSettingsDerivations.tsx(1215,3)` and used in `SettingsRulesTab.tsx`, but was omitted from the `useAppLogic.tsx` return object.
**Action**: Please ensure `toggleClinicalRule` (from clinical rules/visit logic) is also exported in the `useAppLogic.tsx` return object during your surgical fix.
</MESSAGE>
