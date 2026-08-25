# Progress: Milestone M1 (UI Design System & Gate Fixes)

Last visited: 2026-08-15T03:03:40+04:00

## Phase 1: Investigation & Baseline Checks [IN PROGRESS]
- [x] Read DISPATCH.md, ORIGINAL_REQUEST.md, AGENTS.md, UI_STANDARDS.md, and upstream surveys
- [ ] Run baseline verification gates to observe exact failures and status
- [ ] Plan exact file modifications

## Phase 2: Token Parity & Night Theme Parity [PENDING]
- [ ] 1. Update `apps/web/src/styles/token-aliases.css` for `--violet-50`, `--violet-200`, `--violet-700`
- [ ] 2. Update `apps/web/src/styles/main.css` for `[data-theme="night"]` parity

## Phase 3: Clichés Removal & Hardcoded Colors [PENDING]
- [ ] 3. Remove pulsing animations & neon glows across CSS files
- [ ] 4. Clean up purple-on-dark in TSX/TS files
- [ ] 5. Replace hardcoded colors and milky overlays in main.css and LabOrdersPanel.tsx

## Phase 4: Touch Target Fixes (>=44px) [PENDING]
- [ ] 6. Fix mobile touch targets in ScheduleFilterStrip.tsx, AppointmentCard.tsx, WaitlistMatchesBlock.tsx, ShiftView.tsx, PatientsView.tsx, ImagingView.tsx, SmartMicrophoneButton.tsx, InsuranceContractsPanel.tsx, workspaceActions.css, touch-targets.css

## Phase 5: Guarded Route Headers Gate Fix [PENDING]
- [ ] 7. Fix `UrgentScheduleRequestsWidget.tsx` fetch headers

## Phase 6: Full Gate Verification & Handoff [PENDING]
- [ ] Run all verification scripts
- [ ] Run typecheck
- [ ] Write handoff.md and send message to parent
