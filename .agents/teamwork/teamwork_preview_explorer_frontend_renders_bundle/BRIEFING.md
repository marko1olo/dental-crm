# BRIEFING — 2026-10-20T02:30:00Z

## Mission
Deep-research investigation and architectural plan for React 19 cascading re-renders elimination in `useAppLogic.tsx`, state co-location for notes/schedule isolation, and bundle optimization via React.lazy code splitting (3D odontogram, DICOM PACS, PDF, Crypto, Charts) with 0px CLS.

## 🔒 My Identity
- Archetype: Explorer (Red Team Inquisitor)
- Roles: Frontend Performance Auditor, React 19 Re-render Analyst, Bundle & Code Splitting Architect
- Working directory: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_frontend_renders_bundle
- Original parent: 47f9f488-23df-448d-9d14-106c107b506b
- Milestone: Investigation and Architectural Blueprint for Frontend Renders & Bundle Optimization

## 🔒 Key Constraints
- Read-only investigation — do NOT modify production code or run heavy build tasks
- 100% presumption of defect: assume re-render storms and bloated bundle until instrumentally proven
- Zero-skimming of mandatory constitutional files
- Full backward compatibility for `useAppLogic` facade: 0 broken call-sites
- State Co-location without stale state or broken callbacks
- 0px CLS for React.lazy Suspense fallbacks

## Current Parent
- Conversation ID: 47f9f488-23df-448d-9d14-106c107b506b
- Updated: 2026-10-20T02:30:00Z

## Investigation State
- **Explored paths**: `apps/web/src/useAppLogic.tsx`, `apps/web/src/hooks/appLogic/*`, `apps/web/src/App.tsx`, `apps/web/src/AppShell.tsx`, `apps/web/src/components/appLayout/AppViewRouter.tsx`, `apps/web/src/components/schedule/*`, `apps/web/src/hooks/domains/visit/useVisitNotes.ts`, `apps/web/src/hooks/domains/visit/useVisitLogic.ts`, `apps/web/src/components/patients/PatientCoreEditorForm.tsx`, `apps/web/src/components/dicom/*`, `apps/web/src/components/visit/VisitOdontogramTab.tsx`, `apps/web/src/pages/analyticsDashboard/AnalyticsRevenueCharts.tsx`, `apps/web/src/components/documents/*`, `scripts/smoke-web-code-split-source.mjs`.
- **Key findings**:
  1. Keystroke re-render storm: `useVisitNotes` & `useVisitLogic` use `useVisitStore()` without selectors; `PatientCoreEditorForm` updates draft without debounce. Monolithic `appLogicBag` object reference changes on every keystroke. Context consumer `<AppViewRouter>` passes `{...appLogicValue}` into `<ScheduleView />` (not memoized), re-rendering schedule grid & timeline on every character typed.
  2. Broken code-splitting regression: `AppShell.tsx:11` reverted `DentalWorkspace` from dynamic `lazy()` import to synchronous `import { App as DentalWorkspace } from "./App"`, breaking `scripts/smoke-web-code-split-source.mjs` and pulling entire app graph into initial chunk.
  3. Heavy modules: DICOM `@cornerstonejs/*` (>3.5 MB) imported statically; Odontogram vector module synchronously loaded; Recharts / D3 (~850 KB) statically loaded; CryptoPro and PDF modals loaded eagerly.
  4. Architectural solution designed: Local state buffering + 300ms debouncing; fine-grained Zustand selectors; decoupling `<ScheduleView>` props and applying `React.memo`; restoring `AppShell.tsx` dynamic lazy import; lazy-loading heavy domain modules with dedicated 0px CLS skeleton fallbacks.
- **Unexplored areas**: None for read-only investigation scope.

## Key Decisions Made
- Confined all investigation work strictly to read-only exploration and analysis artifacts in `.agents/teamwork/teamwork_preview_explorer_frontend_renders_bundle`.
- Prepared comprehensive 5-component handoff report in `handoff.md` with explicit action steps and verification gates for implementers.

## Artifact Index
- `DISPATCH.md` — incoming instructions
- `progress.md` — liveness and progress tracking
- `BRIEFING.md` — persistent situational awareness
- `handoff.md` — final 5-component report
