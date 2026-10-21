# Task Assignment: Milestone M1 & M4 UI Design System & Gate Fixes

## Working Directory
`C:/Clinic_MVP/dental-crm/.agents/worker_m1_ui_gates`

## References to Read
1. `C:/Clinic_MVP/dental-crm/.agents/ORIGINAL_REQUEST.md`
2. `C:/Clinic_MVP/dental-crm/.agents/AGENTS.md`
3. `C:/Clinic_MVP/dental-crm/PROJECT.md`
4. `C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md`

## Objectives
1. **Token Parity & Night Theme Parity**:
   - `apps/web/src/styles/token-aliases.css`: Add complete definitions for `--violet-50`, `--violet-200`, `--violet-700` across `:root`, `[data-theme="dark"]`, and `[data-theme="night"]`.
   - `apps/web/src/styles/main.css`: Ensure all `[data-theme="dark"]` selectors have matching `[data-theme="night"]` coverage to prevent light fallback in night mode.

2. **Clichés Removal & Hardcoded Colors**:
   - Eliminate all pulsing animations (`pulse`, `animate-pulse`, etc.) and neon glowing borders/shadows in CSS files.
   - Replace purple-on-dark styles with tokenized elevation & static badges.
   - Replace hardcoded hex colors in `apps/web/src/components/LabOrdersPanel.tsx` and milky translucent overlays in `apps/web/src/styles/main.css` with semantic tokens (`var(--paper)`, `var(--ink)`, `var(--line)`, etc.).

3. **Touch Targets (>= 44x44px)**:
   - Ensure all mobile interactive buttons, chips, tabs, inputs, and close icons have >= 44x44px touch targets in:
     * `apps/web/src/components/ScheduleFilterStrip.tsx`
     * `apps/web/src/components/AppointmentCard.tsx`
     * `apps/web/src/components/WaitlistMatchesBlock.tsx`
     * `apps/web/src/components/ShiftView.tsx`
     * `apps/web/src/components/PatientsView.tsx`
     * `apps/web/src/components/ImagingView.tsx`
     * `apps/web/src/components/SmartMicrophoneButton.tsx`
     * `apps/web/src/components/InsuranceContractsPanel.tsx`
     * `apps/web/src/styles/workspaceActions.css`
     * `apps/web/src/styles/touch-targets.css`

4. **Guarded Route Headers Gate Fix**:
   - Fix `apps/web/src/components/UrgentScheduleRequestsWidget.tsx` to include required CSRF / auth headers so `node scripts/check-guarded-route-headers.mjs` passes.

5. **Repository Verification & Zero Mocks**:
   - Run:
     * `node scripts/check-css-tokens.mjs` (must report 0 undefined variables)
     * `node scripts/check-encoding.mjs` (0 errors)
     * `node scripts/check-dynamic-imports.mjs` (0 errors)
     * `node scripts/check-env-contract.mjs` (0 errors)
     * `npm run typecheck` (0 errors across @dental/shared, @dental/api, @dental/web)
   - Ensure Absolute Zero Mocks: no `// TODO`, no mock interfaces in production paths.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Output Requirements
- Write your progress in `C:/Clinic_MVP/dental-crm/.agents/worker_m1_ui_gates/progress.md`
- When complete, write a detailed handoff report to `C:/Clinic_MVP/dental-crm/.agents/worker_m1_ui_gates/handoff.md`
- Report back with passing verification command outputs via `send_message`.
