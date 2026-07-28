# W1-hollow-query-census — state

STATUS: DEFECT CONFIRMED / EDIT WRITTEN (census tool)
Time: 2026-07-28 (cycle 7)
Agent: implementer under [ARCHON]

## HEAD at start
e75df11857f4e2e7202bb4e7ffa557c487147720

## THE TRUE NUMBER: 24, not 45
42 modules `apps/api/src/db/*Query.ts`.
  ПУСТОТЕЛЫХ (hollow)      24
  СМЕШАННЫХ                 2   lostPatientsFiltersQuery, patientCommunicationTimelinesQuery
  ЖИВЫХ                    15   incl. auditQuery (the naive census called it hollow — it is not)
  БЕЗ ТАБЛИЦ                1   dashboardQuery (composes from other modules)
All 24 hollow tables: 0 runtime writers, 0 migration seeds, **0 rows in live PostgreSQL 18**.

## Tool
scripts/census-hollow-query-modules.mjs
- ast-grep NOT INSTALLED on this host: `npx --yes @ast-grep/cli --version` => exit 1
  "could not determine executable to run". AGENTS.md §8/§8a are wrong about it.
  Used the TypeScript 5.9.3 compiler API instead (real AST, resolves `as` aliases and
  `import * as schema`).
- Found and fixed a real bug in my own first version: it only walked STATIC imports and
  therefore reported 24/24 hollow modules as "imported by NOBODY". 19 of them are wired to
  live routes via `await import("../db/xQuery.js")` in routes/clinical.ts. Deleting on that
  first reading would have broken HEAD exactly like VisitDictation.tsx did.

## Deletion plan (claim-safe)
SAFE, no web consumer at all (backend dead weight):
  alternativeTreatmentPlansQuery, crmEmailDispatchLogsQuery, prodoctorovSyncExportsQuery,
  quickAppointmentConfirmationsQuery, scheduleClipboardItemsQuery, uisOmniMessengerQueuesQuery
  + 5 modules with zero importers anywhere: bulkImageOperationLogsQuery,
  egiszMultipleDiagnosesQuery, familyRecommendationSourcesQuery,
  uisCallSpeechTranscriptsQuery, visitExaminationPhotoLinksQuery
SAFE, widget in files the second author is NOT in:
  treatmentPlanStagesAutoArchiveQuery / treatmentPlanLockTokensQuery /
  treatmentPlanPrintOdontogramsQuery  -> DocumentsView.tsx
  scheduleTimeReservationsQuery / cancellationReasonsTwoLevelQuery /
  urgentScheduleRequestsQuery         -> ScheduleView.tsx, ShiftView.tsx
  patientServiceLineagesQuery         -> PatientsView.tsx, components/patients/PatientOverviewTab.tsx
  confirmationPerformanceReportsQuery -> CommunicationsView.tsx, ShiftView.tsx, AnalyticsDashboardView.tsx
SKIPPED — widget lives in the second author's zone, reported as coordination debt:
  singleSessionEnforcementsQuery (components/settings/**, SettingsView.tsx)
  dadataGeocodedAddressesQuery   (SettingsView.tsx)
  landingFieldMappingsQuery      (MarketingView.tsx)
  rebookingConversionRulesQuery  (MarketingView.tsx)
  customCrmTaskTypesQuery        (MarketingView.tsx, components/settings/SettingsRulesTab.tsx)
NOT TOUCHED by design: lostPatientsFiltersQuery (already restored once this campaign).

## Dirty and not mine
 M .agents/AGENTS.md, apps/web/src/lib/clinicCapabilities.ts,
   apps/api/.data/*.json, apps/web/tsconfig.tsbuildinfo, packages/shared/dist/*,
   scratch/audit-settings-props.mjs

## Log
- STARTED
- AUTHORITY READ
- DEFECT CONFIRMED — 24 hollow, DB row counts all 0
- EDIT WRITTEN — census tool + about to write its test, then COMMIT the tool first
