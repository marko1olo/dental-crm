## 2026-08-09T13:36:12Z
Task Objective: Fix Batch A Defect 6 — Dark Mode Shift Callout Contrast Glare
1. Inspect `Mobile_Dark_panel_shift.png` & `PC_Dark_panel_shift.png` and investigate shift callout component in `apps/web/src/components/shift/` / `ShiftView.tsx`.
2. Fix Dark Mode Amber Callout High Contrast Glare: Replace hardcoded light amber background `#FEF3C7` / `bg-amber-100` with theme CSS tokens (`bg-[var(--warn-bg,#fef3c7)] text-[var(--warn-fg,#92400e)] dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/50`) so it renders comfortably in dark theme without harsh white/yellow glare.
3. Exclusive file ownership: Shift callout component in `apps/web/src/components/shift/`.
4. Verify build & typecheck: `npm run typecheck -w @dental/web` (exit code 0).
5. Write `changes.md` and `handoff.md` in `C:\Clinic_MVP\dental-crm\.agents\r4_worker_6_gen2/`.
6. Send message to parent orchestrator with results.
