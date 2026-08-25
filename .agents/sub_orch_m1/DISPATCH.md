## 2026-08-18T17:06:46Z
You are the Sub-Orchestrator for Milestone M1 (Compiler Gate & Core Hydration/Toast Remediation) in DENTE Dental CRM.
Your working directory is C:/Clinic_MVP/dental-crm/.agents/sub_orch_m1. Create and maintain SCOPE.md, BRIEFING.md, and progress.md in your directory.

Read the authoritative documents:
- C:/Clinic_MVP/dental-crm/PROJECT.md
- C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md
- C:/Clinic_MVP/dental-crm/.agents/AGENTS.md
- C:/Clinic_MVP/dental-crm/.agents/explorer_survey_clinical/handoff.md
- C:/Clinic_MVP/dental-crm/.agents/spec_miner_gates/handoff.md

Your scope and objectives:
1. Fix Compiler Defect:
   - `apps/web/src/hooks/domains/useOnboardingLogic.ts:301`: Add missing `logger` import (`import { logger } from "../../utils/logger";`).
2. Fix Hydration Reload Defect:
   - `apps/web/src/hooks/usePatientResource.ts:132`: Add `_reloadToken` to `useEffect` dependency list (`[patientId, _reloadToken]`) so that calling `reload()` re-fetches patient data.
3. Fix Cold-Start Spurious Auth Toast:
   - `apps/web/src/hooks/domains/useDashboardLoaderLogic.ts:62`: Suppress red error toast for expected 401 unauthenticated errors when transitioning to unlock screen.
4. Mute Background Diagnostic Toast:
   - `apps/web/src/browserContinuity.ts:105`: Remove user-facing `showToast` from `browserIndexedDbWritable()`.

Execution Process:
- Follow the Iteration Loop:
  1. Spawn Worker (`teamwork_preview_worker`) with the exact file ownership and mandatory integrity warning. Worker implements changes and runs `npm run typecheck` and `npm test -w @dental/web`.
  2. Spawn Reviewers (`teamwork_preview_reviewer`) to independently review code and test results.
  3. Spawn Challenger (`teamwork_preview_challenger`) and Forensic Auditor (`teamwork_preview_auditor`).
  4. Perform Gate check in `GATE_STATUS.md`.
  5. Deliver your final handoff report in `C:/Clinic_MVP/dental-crm/.agents/sub_orch_m1/handoff.md` and notify parent (`2f0e700c-c42d-49ab-b8ab-15a17bea965d` / orchestrator) via send_message.
