# BRIEFING — 2026-10-20T05:50:00Z

## Mission
Eradicate synthetic dummy data, fake fallbacks, hardcoded names and requisites in production components (TreatmentPipeline, DoctorPayoutDashboard/DoctorPayrollModal, HeaderGlobalSearch, TreatmentPlanPriceValidatorModal, fastPrintConsentAndMemoBuilder, MobileChairsideEHR) according to Milestone 3 / R3 requirements.

## 🔒 My Identity
- Archetype: Worker Milestone 3 (teamwork_preview_worker_m3_data_purity)
- Roles: implementer, qa
- Working directory: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m3_data_purity
- Original parent: 1dba1dd3-1b54-431d-9253-a722303ba51f
- Milestone: Milestone 3 (Data Purity & Eradication of Hardcoded Fallbacks)

## 🔒 Key Constraints
- Mandate 8f & 8am: 100% honesty, zero-fabrication, no synthetic fallbacks pretending to be real data.
- Mandate 8wy: Strict dual-mode separation: Production vs Demo Showcase (isDemoShowcaseMode). Production must never serve fake mockups.
- Mandate 8e: Doctor autonomy, do not block clinician workflows unnecessarily.
- Safe rendering: zero runtime crashes on undefined/null data; use clean EmptyStates, warning badges, or explicit validation.
- Non-destructive git discipline: atomic per-file git add, no hard resets.

## Current Parent
- Conversation ID: 1dba1dd3-1b54-431d-9253-a722303ba51f
- Updated: 2026-10-20T05:50:00Z

## Task Summary
- **What to build**: Eradicate fake hardcoded names, mock requisites, and silent fallbacks across 6 core areas:
  1. `apps/web/src/pages/coordinator/TreatmentPipeline.tsx`: clinic requisites from org profile, doctor assignment warning/empty state.
  2. `apps/web/src/pages/DoctorPayoutDashboard.tsx` & `DoctorPayrollModal.tsx`: dynamic clinic name from org context, honest EmptyState when doctor is not selected.
  3. `apps/web/src/components/headerModules/HeaderGlobalSearch.tsx`: replace `SAMPLE_PATIENTS` with real debounced `/api/patients?search=...` API call and genuine empty state.
  4. `apps/web/src/components/treatment-plans/validation/TreatmentPlanPriceValidatorModal.tsx`: replace silent [21] fallback with [] and clear clinical validation errors.
  5. `apps/web/src/components/visit/view/fastPrintModules/fastPrintConsentAndMemoBuilder.ts` & `fastPrintDiaryBuilder.ts`: eliminate synthetic prices (1500, 4500, etc.) and fallback to empty table.
  6. `apps/web/src/components/mobile/MobileChairsideEHR.tsx`: clean empty initial diagnosis and plan without rogue fallbacks.
- **Success criteria**: All synthetic fallbacks removed, genuine data and honest EmptyStates hooked up, unit/component tests pass (50 passing).
- **Interface contracts**: PROJECT.md / AGENTS.md
- **Code layout**: apps/web/src/

## Key Decisions Made
- `TreatmentPipeline.tsx`: connected live branding store (`branding.clinicName`) and dashboard organization. Added top warning banner if requisites are unpopulated in settings, and staff selector if doctor is unassigned.
- `DoctorPayrollModal.tsx` & submodules: removed hardcoded `"ООО «Денте Стоматология»"`, resolved dynamically from branding/org. Added honest `EmptyState` («Выберите врача для формирования расчетного листа») with zero synthetic figures and doctor dropdown.
- `HeaderGlobalSearch.tsx`: eradicated `SAMPLE_PATIENTS`. Integrated debounced live search `/api/patients?search=...` with spinner and honest empty state.
- `TreatmentPlanPriceValidatorModal.tsx`: replaced rogue `[21]` fallback with `[]`. Added clinical validation checks before generating lab work orders or acts.
- `fastPrintConsentAndMemoBuilder.ts`: eliminated synthetic mock prices (1500, 4500, 5500, 4800, 12500 ₽). Renders clean empty table when items are absent.
- `MobileChairsideEHR.tsx`: initialized diagnosis and treatment plan as `""`, allowing optional prop override and template clicks without rogue pre-fills.

## Artifact Index
- DISPATCH.md — assignment dispatch
- BRIEFING.md — persistent memory
- progress.md — liveness heartbeat
- handoff.md — final handoff report
- `apps/web/src/tests/milestone3DataPurityInquisition.test.ts` — test verification suite (6/6 passing)

## Change Tracker
- **Files modified**:
  - `apps/web/src/pages/coordinator/TreatmentPipeline.tsx` (dynamic requisites, warning banner, doctor selection)
  - `apps/web/src/components/payroll/useDoctorPayrollModalState.ts` (honest null doctor handling, 0 kop totals)
  - `apps/web/src/components/payroll/DoctorPayrollModalContent.tsx` (honest EmptyState when no doctor)
  - `apps/web/src/components/payroll/DoctorPayrollModal.tsx` (dynamic clinic name from branding/org)
  - `apps/web/src/components/payroll/payrollModules/PayrollHeaderDoctorPicker.tsx` (unselected doctor option)
  - `apps/web/src/components/payroll/payrollModules/PayrollHeaderTopBar.tsx` (clean clinic name prefix)
  - `apps/web/src/pages/DoctorPayoutDashboard.tsx` (isPayrollModalOpen, allReportDoctors, resolvedClinicName)
  - `apps/web/src/components/appLayout/modalsContainerModules/standalone/PayrollStandaloneLauncher.tsx` (demo showcase restriction)
  - `apps/web/src/components/headerModules/HeaderGlobalSearch.tsx` (live debounced search, eradicated SAMPLE_PATIENTS)
  - `apps/web/src/components/treatment-plans/validation/TreatmentPlanPriceValidatorModal.tsx` (eradicated [21], added validation)
  - `apps/web/src/components/visit/view/fastPrintModules/fastPrintConsentAndMemoBuilder.ts` (eradicated synthetic prices, empty table fallback)
  - `apps/web/src/components/visit/view/fastPrintModules/fastPrintDiaryBuilder.ts` (clinicSettings in requisites)
  - `apps/web/src/components/mobile/MobileChairsideEHR.tsx` (clean initial empty diagnosis/plan)
  - `apps/web/src/tests/mobileHigPrimitivesAndChairside.test.tsx` (added clean state test)
  - `apps/web/src/tests/milestone3DataPurityInquisition.test.ts` (created inquisitor suite)
- **Build status**: Pass (Exit Code 0 across 50 unit and component tests)
- **Pending issues**: None

## Quality Status
- **Build/test result**: 50 passing, 0 failing across 11 test suites
- **Lint status**: 0 violations in modified code
- **Tests added/modified**: 7 new test assertions covering data purity, zero mocks, and clean states
