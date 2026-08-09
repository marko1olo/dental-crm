## 2026-08-09T09:36:45Z
Task Objective: Fix Batch B Defects — Documents & Finance Dark Mode Contrast & Visibility
1. Inspect `Mobile_Dark_panel_documents.png`, `PC_Dark_panel_documents.png`, `PC_Dark_panel_finance.png`.
2. Fix Documents Panel Dark Mode Text Visibility: In `apps/web/src/components/documents/`, replace hardcoded light backgrounds (`bg-emerald-50/50`, `#f0fdf4`, `#ffffff`) on cards and select inputs with theme variables (`bg-[var(--card-bg)]`, `bg-[var(--paper)]`, `text-[var(--fg)]`, `dark:bg-emerald-950/40 dark:text-emerald-200`) so active document title "План" and select dropdown text render clearly with proper dark mode contrast.
3. Fix Finance Panel Dark Mode Callout Flash: In `apps/web/src/components/finance/`, replace hardcoded light-green background (`#f0fdf4` / `bg-green-50`) on callout box ("Вариантов плана пока нет...") with theme CSS variables (`bg-[var(--accent-bg)]` or `dark:bg-green-950/40 dark:text-green-200 dark:border-green-800/50`).
4. Exclusive file ownership: `apps/web/src/components/documents/` and `apps/web/src/components/finance/`.
5. Verify build & typecheck: `npm run typecheck -w @dental/web` (exit code 0).
6. Write `changes.md` and `handoff.md` in `C:\Clinic_MVP\dental-crm\.agents\r4_worker_7_gen2/`.
7. Send message to parent orchestrator with results.
