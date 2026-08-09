## 2026-08-09T09:37:09Z
Task Objective: Fix Batch C Defects — Critical Code Leak in Imaging & Scanner/Imaging Dark Mode Contrast
1. Inspect `PC_Light_panel_imaging.png`, `PC_Dark_panel_imaging.png`, `Mobile_Dark_panel_imaging.png`, `PC_Dark_panel_scanner.png`.
2. Fix CRITICAL RAW CODE LEAK IN DOM: In `apps/web/src/ImagingView.tsx` (around line 791), locate the unescaped comment string `biome-ignore lint/suspicious/noExplicitAny: automated suppression` rendered in JSX children next to the "Все" tab button. Convert it to a proper JSX comment `{/* biome-ignore ... */}` or remove the raw string from rendered output so it no longer appears in the UI.
3. Fix ImagingView Dark Mode Contrast: In `apps/web/src/ImagingView.tsx` (or imaging components), replace hardcoded light backgrounds (`#f8fafc`, `#ffffff`) on summary cards ("Пациент", "Режим") with theme CSS variables (`bg-[var(--card-bg)]`, `text-[var(--fg)]`, `dark:bg-slate-900 dark:text-slate-100`).
4. Fix ScannerView Dark Mode Contrast: In `apps/web/src/ScannerView.tsx` (or scanner components), fix dark header text ("Стерилизация инструментов") and sterilization log box background using theme variables (`text-[var(--fg)]`, `bg-[var(--paper)]`).
5. Exclusive file ownership: `apps/web/src/ImagingView.tsx`, `apps/web/src/ScannerView.tsx`, and imaging/scanner subcomponents.
6. Verify build & typecheck: `npm run typecheck -w @dental/web` (exit code 0).
7. Write `changes.md` and `handoff.md` in `C:\Clinic_MVP\dental-crm\.agents\r4_worker_9_gen2/`.
8. Send message to parent orchestrator with results.
