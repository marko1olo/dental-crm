# Dispatch: Worker M1 (UI & Ergonomics Polish - Requirement R1)

## Mission
Implement all UI defect fixes identified in the survey report `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_ui\handoff.md` and `C:\Clinic_MVP\dental-crm\.agents\orchestrator_r9\PROJECT.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks to Implement
1. **Linter Leak Elimination**:
   - In `apps/web/src/VisitView.tsx` (around lines 2706-2707), remove the plain rendered text string `biome-ignore lint/suspicious/noExplicitAny: automated suppression` from inside the Tooth Warning Dialog. Ensure the valid JSX comment stays if needed or is properly formatted inside curly braces `{/* ... */}`.
   - Replace hardcoded light inline CSS variables (`"--ab": "#f0fdf4"`, `"--ab": "#fffbeb"`) in `VisitView.tsx` (around lines 2721, 2778) with semantic theme variables / dark-mode friendly tokens so they do not produce blinding patches in dark mode.

2. **Dark Mode Whiteout Elimination**:
   - In `apps/web/src/styles/main.css`:
     - Update `.smart-field:focus-within` and `.smart-field:focus-within textarea:not(:placeholder-shown) ~ label` (around lines 16938, 16977) to use `background: var(--paper-strong, #fff);` or theme-adaptive background instead of hardcoded `#fff`.
     - Add `[data-theme="dark"]`, `[data-theme="night"]`, and `.dark` overrides for `.smart-details` (around line 16996) and `.smart-details[open] > summary` (around line 17033) using `var(--paper-soft)` and `var(--slate-800)` borders.
     - Add dark mode override for `.drawer-content` (around line 16327): `[data-theme="dark"] .drawer-content, [data-theme="night"] .drawer-content, .dark .drawer-content { background: var(--bg-surface, #0f172a); color: var(--text-primary, #f8fafc); }`.
     - Add dark mode support to `._ccm-btn` (around lines 17216-17270) so it does not override `VisitView.css` dark mode styling with `#fff`.
     - In `apps/web/src/styles/shadow-analyst.css`, ensure `.shadow-badge.ok`, `.shadow-badge.bad`, `.shadow-slider-handle` adapt properly to dark theme tokens without glaring white boxes.

3. **4-State Visual Layout in DICOM / Imaging**:
   - In `apps/web/src/components/dicom/Cornerstone3DViewer.tsx` (around lines 997-1005), add `flexWrap: "wrap"` (or `maxWidth: "100%", overflowX: "auto"`) to the MPR toolbar container so buttons wrap/scroll fluidly on 390px mobile viewports without horizontal clipping.
   - In `apps/web/src/components/dicom/PanoramicRendererWindow.tsx` (around line 166), ensure `minWidth` is responsive (e.g. `Math.min(400, typeof window !== "undefined" ? window.innerWidth - 16 : 400)`) and initial bounds fit mobile screens gracefully.

4. **Silence Intrusive Background & Mount Error Toasts**:
   - Remove intrusive `showToast(..., "error")` calls from mount/background effects in:
     - `apps/web/src/components/schedule/UrgentScheduleRequestsWidget.tsx`
     - `apps/web/src/components/schedule/NewAppointmentForm.tsx` (blacklist background check)
     - `apps/web/src/components/visit/EgiszMultipleDiagnosesWidget.tsx`
     - `apps/web/src/components/patients/PatientNoShowRisk.tsx`
     - `apps/web/src/components/patients/PatientFamilyCard.tsx`
     - `apps/web/src/components/workspace/RecentPatientHistoryWidget.tsx`
     - `apps/web/src/useAppLogic.tsx` (background recent patients sync)
   - Preserve inline error state and console logging so failed operations remain visible in their respective UI widgets without firing global toast popups on initial mount or offline.

5. **Mobile Touch Target Compliance (Minimum 44x44px)**:
   - In `apps/web/src/styles/touch-targets.css`, upgrade `min-height: 36px` and `min-height: 40px` rules to `min-height: 44px` and `min-width: 44px` for touch devices (`@media (pointer: coarse)` and mobile breakpoints).
   - In `apps/web/src/components/schedule/ScheduleSubNavTabs.tsx` and `apps/web/src/components/schedule/NewAppointmentForm.tsx`, remove inline `minHeight: "30px"` overrides or make them `minHeight: "44px"` on touch devices.
   - Ensure micro-buttons in `CallPlayer.tsx`, `BoneQualityPanel.tsx`, `WaitlistDrawer.tsx`, `LabOrdersPanel.tsx`, and `EgiszMultipleDiagnosesWidget.tsx` have `min-h-[44px] min-w-[44px]` touch targets on mobile viewports.

6. **Financial Cards Neutral Empty State**:
   - In `apps/web/src/FinancePlanning.tsx` (around lines 121-162), when `billingSummary` is `null` (no patient selected), render neutral dashes `"—"` or empty state indicators instead of `money(null)` which displays 5x `"не определено"`.

## Verification Instructions
- Verify using `replace_file_content` directly on the files.
- Run `npm run check:encoding` and `npm run typecheck` to confirm 0 compilation errors and 0 mojibake.
- Run frontend tests: `npx vitest run apps/web/src/tests/themeContrastGuard.test.ts apps/web/src/tests/themeClasses.test.ts`.
- Write your handoff report to `C:\Clinic_MVP\dental-crm\.agents\worker_m1_ui\handoff.md`.

## 2026-08-14T15:54:44Z
<USER_REQUEST>
You are Worker M1 for DENTE CRM.
Working directory: C:\Clinic_MVP\dental-crm\.agents\worker_m1_ui
Read the dispatch file at C:\Clinic_MVP\dental-crm\.agents\worker_m1_ui\DISPATCH.md, and authority files C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md, C:\Clinic_MVP\dental-crm\.agents\AGENTS.md, and C:\Clinic_MVP\dental-crm\.agents\orchestrator_r9\PROJECT.md.

Mandatory Integrity Warning:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Implement all UI defect fixes described in DISPATCH.md across:
1. Linter leak elimination and theme variable fix in apps/web/src/VisitView.tsx
2. Dark mode whiteout elimination in apps/web/src/styles/main.css and shadow-analyst.css
3. 4-state visual layout in apps/web/src/components/dicom/Cornerstone3DViewer.tsx and PanoramicRendererWindow.tsx
4. Silencing intrusive background error toasts in UrgentScheduleRequestsWidget, NewAppointmentForm, EgiszMultipleDiagnosesWidget, PatientNoShowRisk, PatientFamilyCard, RecentPatientHistoryWidget, and useAppLogic
5. Enforcing minimum 44x44px touch targets in touch-targets.css and component overrides
6. Neutral empty state in apps/web/src/FinancePlanning.tsx

Verify your work with `npm run check:encoding`, `npm run typecheck`, and unit tests.
Write your detailed report to C:\Clinic_MVP\dental-crm\.agents\worker_m1_ui\handoff.md and send a message back to parent when complete.
</USER_REQUEST>
