## 2026-07-31T12:24:47Z
<USER_REQUEST>
You are a Worker subagent assigned to Milestone 2 - Requirement R1 (UI Feature Mounting & Workflow Integration).
Your working directory is: `C:\Clinic_MVP\dental-crm\.agents\worker_m2`.

Read the Explorer reconnaissance report at `C:\Clinic_MVP\dental-crm\.agents\explorer_m1_r1\analysis.md` before making changes.

Your tasks:
1. `apps/web/src/views/PatientsView.tsx`:
   - Add a "Потерянные пациенты" toggle button to the Patients view toolbar using `showLostPatientsOnly` and `toggleLostPatients()`.
   - Fix line 451 (or patient grid rendering loop) to iterate over `displayPatients` instead of `filteredPatients` so active filters (including lost patients filter) apply properly.
2. `apps/web/src/views/AnalyticsDashboardView.tsx`:
   - Mount a "Потерянные пациенты" (Lost Patients) summary card/widget fetching data from `/api/analytics/lost-patients-filters`.
   - Display key metrics (lost patients count, high-value lost patients, average inactive days) and provide a direct action button navigating to `PatientsView` with lost patients filter activated.
3. `apps/web/src/views/ScheduleView.tsx` / `AppointmentCard.tsx`:
   - Mount No-Show Risk Indicator badges ("Риск неявки") on appointment cards.
   - Display a risk chip (`high` -> red badge "Высокий риск неявки", `medium` -> amber badge "Средний риск неявки", `low` -> green badge "Низкий риск неявки").
4. Workflow & Route Integrity:
   - Audit all buttons and navigation actions in modified views to ensure zero broken routes, missing handlers, or dead-end actions.
5. Verification:
   - Test and verify that code compiles cleanly and typechecks without errors.
   - Commit every modified file individually using `git commit` per Clinic MVP Constitution with conventional commit messages and NO AI tool attributions.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your changes report to `C:\Clinic_MVP\dental-crm\.agents\worker_m2\changes.md` and handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_m2\handoff.md`.
Reply with a summary citing your handoff report when complete.
</USER_REQUEST>
