# BRIEFING — 2026-08-16T16:08:00Z

## Mission
Investigate frontend architecture for Dental CRM (DENTE): God-hook decomposition (useAppLogic.tsx -> 8 domain hooks), App.tsx & 7 Zustand stores collision audit, and CSS modularization of main.css.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis, architectural survey
- Working directory: C:/Clinic_MVP/dental-crm/.agents/explorer_survey_frontend
- Original parent: 4721ef65-aeae-4f84-b316-20d734471246
- Milestone: R3 Frontend Architecture Audit & Decomposition Plan

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify project source code.
- Produce comprehensive analysis.md and handoff.md in working directory.
- Send message to parent agent when completed.

## Current Parent
- Conversation ID: 4721ef65-aeae-4f84-b316-20d734471246
- Updated: 2026-08-16T16:08:00Z

## Investigation State
- **Explored paths**:
  - `apps/web/src/useAppLogic.tsx` (5,158 lines, 823 returned properties, 11 spreads, 812 direct properties)
  - `scripts/check-applogic-stub-overrides.mjs` (AST validation logic)
  - `apps/web/src/App.tsx` (5,625 lines, inline Onboarding Wizard, prop-drilling)
  - `apps/web/src/store/` (7 Zustand stores + `visitStore.ts`)
  - `apps/web/src/styles/main.css` (18,146 lines, 1,223 classes)
  - `scripts/check-css-tokens.mjs` (Token validation logic)
  - `apps/web/src/contexts/AppLogicContext.tsx`
  - `apps/web/src/hooks/domains/` (37 existing domain hooks)
- **Key findings**:
  - `useAppLogic.tsx` can be cleanly decomposed into 8 domain hooks (`useModalOrchestrator`, `useScheduleFilterState`, `useNavigationRouter`, `usePatientWorkspaceState`, `useClinicalVisitWorkflow`, `useBillingCashDeskState`, `useImagingWorkbenchState`, `useStaffSettingsState`).
  - State collisions identified across `selectedPatientId`, `scheduleDoctorFilterId`, `activeVisit`, `currentView`, and `documentPatient`.
  - `App.tsx` contains ~2,300 lines of inline Onboarding Wizard that can be extracted to `components/onboarding/OnboardingWizard.tsx`.
  - `main.css` contains ~10,000 lines of component-specific rules ready for extraction to scoped `.css` modules.
- **Unexplored areas**: None for this survey scope.

## Key Decisions Made
- Fully documented architecture and decomposition blueprints in `analysis.md` and `handoff.md`.

## Artifact Index
- `analysis.md` — Full frontend architectural survey and decomposition design
- `handoff.md` — 5-component handoff report for parent agent
- `DISPATCH.md` — Log of received dispatches
- `progress.md` — Heartbeat and status log
