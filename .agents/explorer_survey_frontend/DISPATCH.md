## 2026-08-16T15:53:50Z
<USER_REQUEST>
You are teamwork_preview_explorer surveying the frontend architecture for Dental CRM (DENTE).
Your working directory is: C:/Clinic_MVP/dental-crm/.agents/explorer_survey_frontend

Read the following documents and source files thoroughly:
- C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md
- C:/Clinic_MVP/dental-crm/.agents/AGENTS.md
- docs/architecture/SYSTEM_AUDIT_AND_DEBT_SPEC.md
- docs/AgentTasks/TASK_BACKLOG_AND_SPECIFICATIONS.md
- apps/web/src/useAppLogic.tsx
- apps/web/src/App.tsx
- apps/web/src/store/ (all 7 Zustand stores)
- apps/web/src/styles/main.css
- scripts/check-applogic-stub-overrides.mjs
- scripts/check-css-tokens.mjs

Your investigation objectives:
1. R3 / TASK-3.1 (useAppLogic.tsx God-Hook Decomposition):
   - Survey `apps/web/src/useAppLogic.tsx` (total lines, returned properties count and groupings).
   - Detail the 8 domain hooks to extract under `apps/web/src/hooks/domains/`:
     (`useModalOrchestrator`, `useScheduleFilterState`, `useNavigationRouter`, `usePatientWorkspaceState`, `useClinicalVisitWorkflow`, `useBillingCashDeskState`, `useImagingWorkbenchState`, `useStaffSettingsState`).
   - Check how `scripts/check-applogic-stub-overrides.mjs` validates return properties to ensure zero conflicts.
2. R3 / TASK-3.2 (App.tsx and Store Collision Elimination):
   - Survey `apps/web/src/App.tsx` and interactions with the 7 Zustand stores.
   - Identify state duplication or race conditions between stores and URL parameters / navigation.
3. R3 / TASK-3.3 (CSS Modularization):
   - Survey `apps/web/src/styles/main.css`.
   - Identify monolithic component blocks that should be extracted into component-scoped `.css` modules without breaking tokens or triggering `scripts/check-css-tokens.mjs` failures.

Write your findings to `C:/Clinic_MVP/dental-crm/.agents/explorer_survey_frontend/analysis.md` and `C:/Clinic_MVP/dental-crm/.agents/explorer_survey_frontend/handoff.md`.
Send a message when done with summary and path.
Do not modify any source code.
</USER_REQUEST>
