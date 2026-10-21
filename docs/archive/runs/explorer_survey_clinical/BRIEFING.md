# BRIEFING — 2026-08-18T17:02:00Z

## Mission
Comprehensive survey of all clinical views, perspectives, hydration flows, store initialization, async loading states, race conditions, and toast/notification mechanics in DENTE Dental CRM.

## 🔒 My Identity
- Archetype: explorer
- Roles: clinical views & hydration audit, state & toast lifecycle analysis, risk assessment
- Working directory: C:/Clinic_MVP/dental-crm/.agents/explorer_survey_clinical
- Original parent: 38f38ce3-5ee7-4e3c-a670-421f2ce2e52a
- Milestone: Explorer Survey & Diagnostics Complete

## 🔒 Key Constraints
- Read-only investigation — do NOT modify source code or database schemas.
- Output comprehensive structured reports in handoff.md.
- Adhere strictly to DENTE CRM mandates in `.agents/AGENTS.md`.
- Zero mocks, zero skimming, precise line numbers and empirical evidence.

## Current Parent
- Conversation ID: 38f38ce3-5ee7-4e3c-a670-421f2ce2e52a
- Updated: 2026-08-18T17:02:00Z

## Investigation State
- **Explored paths**:
  - `apps/web/src/App.tsx`, `ShiftView.tsx`, `ScheduleView.tsx`, `PatientsView.tsx`, `VisitView.tsx`, `FinanceView.tsx`, `ImagingView.tsx`, `components/InventoryView.tsx`, `pages/AnalyticsDashboardView.tsx`, `components/leads/LeadsKanbanView.tsx`, `pages/LabOrdersPage.tsx`, `components/lab/DentalLabOrderModal.tsx`, `components/egisz/EgiszCdaExportModal.tsx`.
  - Specialized Perspectives: `ChairsiderPerspectiveView.tsx`, `FrontdeskPerspectiveView.tsx`, `CasePresentationView.tsx`, `OrthodonticPerspectiveView.tsx`, `PediatricPerspectiveView.tsx`.
  - 12 Zustand Stores in `apps/web/src/store/`.
  - Hydration hooks: `usePatientResource.ts`, `useDashboardLoaderLogic.ts`, `useGlobalAppCoordinator.ts`, `useAppLogic.tsx`.
  - Toast & Telemetry systems: `GlobalToast.tsx`, `browserContinuity.ts`, `IncomingCallPopup.tsx`.
- **Key findings**:
  1. Complete mapping of 11 core clinical domains and 5 specialized perspectives.
  2. `usePatientResource.ts` has a missing `_reloadToken` in `useEffect` dependency array, breaking child widget reload after mutations.
  3. `useDashboardLoaderLogic.ts` emits spurious red error toast on unauthenticated 401 cold boot before unlocking screen.
  4. `browserContinuity.ts` emits spurious "Ошибка выполнения операции" toast during passive background visibility checks.
  5. Inconsistent SSR / `typeof document !== "undefined"` checks and unportalled modals identified across 7 components.
- **Unexplored areas**: None within requested scope.

## Key Decisions Made
- Authored complete 5-Component handoff report in `handoff.md`.
- Ready for orchestrator dispatch to remediation workers.

## Artifact Index
- C:/Clinic_MVP/dental-crm/.agents/explorer_survey_clinical/DISPATCH.md
- C:/Clinic_MVP/dental-crm/.agents/explorer_survey_clinical/BRIEFING.md
- C:/Clinic_MVP/dental-crm/.agents/explorer_survey_clinical/progress.md
- C:/Clinic_MVP/dental-crm/.agents/explorer_survey_clinical/handoff.md
