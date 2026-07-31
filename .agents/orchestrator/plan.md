# Execution Plan — DENTE Dental CRM Clinical Mounting Sprint

## Phase 1: Reconnaissance (Milestone 1)
- Dispatch Explorer agent (`teamwork_preview_explorer`) to:
  1. Inspect `lostPatientsFiltersQuery.ts`, `patientNoShowRiskQuery.ts`, and how they can be mounted in `AnalyticsDashboardView.tsx`, `PatientsView.tsx`, and `ScheduleView.tsx`.
  2. Inspect `apps/api/.data/dental-crm-state.json` and `seedOpsScreenshotDemo.ts` structure for patients, EMK visits, tooth formula (11-48), acts, 54-FZ receipts, NDFL КНД 1151156 XML, EGISZ CDA XML.
  3. Inspect `scripts/ops-panels-shots.mjs` and theme toggle/session token re-hydration mechanisms in `apps/web/src/`.
  4. Verify encoding and typecheck baseline script commands.

## Phase 2: R1 UI Feature Mounting (Milestone 2)
- Dispatch Worker agent (`teamwork_preview_worker`) to:
  1. Mount Lost Patients Filter in `AnalyticsDashboardView.tsx` and `PatientsView.tsx`.
  2. Mount No-Show Risk Indicator badges on appointment cards in `ScheduleView.tsx`.
  3. Audit and fix any broken/unmounted routes or dead-end buttons.
- Dispatch Reviewer (`teamwork_preview_reviewer`) to verify R1 implementation.

## Phase 3: R2 Clinical Seed Expansion (Milestone 3)
- Dispatch Worker agent (`teamwork_preview_worker`) to:
  1. Update `apps/api/.data/dental-crm-state.json` and `seedOpsScreenshotDemo.ts`.
  2. Ensure >=15 patients have complete Passport, SNILS, OMS/DMS profiles.
  3. Ensure completed EMK visits with objective findings and full tooth formula 11-48 statuses.
  4. Ensure works acts, 54-FZ receipts, NDFL certificates (КНД 1151156 XML), and EGISZ CDA XML snapshots are fully populated.
- Dispatch Reviewer (`teamwork_preview_reviewer`) to verify seed data integrity and format.

## Phase 4: R3 & R4 Verification, 4-State Proof & Quality Gates (Milestone 4)
- Dispatch Worker agent (`teamwork_preview_worker`) to:
  1. Fix session token re-hydration on theme changes in web app.
  2. Run `scripts/ops-panels-shots.mjs` to capture 4-state visual proof matrix (PC Light, PC Dark, Mobile Light, Mobile Dark).
  3. Run `npm run check:encoding` (0 errors) and `npm run typecheck` (0 errors across `@dental/shared`, `@dental/api`, `@dental/web`).
  4. Perform per-file git commits for all modified files.
- Dispatch Forensic Auditor (`teamwork_preview_auditor`) to verify zero integrity violations / zero cheating / zero hardcoding.
