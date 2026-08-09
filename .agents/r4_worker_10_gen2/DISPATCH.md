## 2026-08-09T09:37:09Z
Task Objective: Fix Batch C Defects — Leads Kanban Search Collision & Inventory Mobile Truncation
1. Inspect `Mobile_Light_panel_leads.png`, `Mobile_Dark_panel_leads.png`, `Mobile_Light_panel_inventory.png`.
2. Fix Leads Kanban Filter Collision: In `apps/web/src/LeadsKanbanView.tsx` (or leads components), update toolbar filter button ("Все источники") and search input layout so that the filter button does not overlay search input on mobile viewports. Change container to `flex flex-col sm:flex-row gap-2` with `w-full` inputs.
3. Fix Inventory Mobile Truncation: In `apps/web/src/components/inventory/`, fix tab buttons ("⚙️ Правила списания"), search bar, and empty state text ("Склад пуст. Добавьте материалы") on mobile viewports. Apply horizontal scrolling (`overflow-x-auto whitespace-nowrap scrollbar-none`) to tabs and adjust text wrapping/margins.
4. Exclusive file ownership: `apps/web/src/LeadsKanbanView.tsx` and `apps/web/src/components/inventory/`.
5. Verify build & typecheck: `npm run typecheck -w @dental/web` (exit code 0).
6. Write `changes.md` and `handoff.md` in `C:\Clinic_MVP\dental-crm\.agents\r4_worker_10_gen2/`.
7. Send message to parent orchestrator with results.
