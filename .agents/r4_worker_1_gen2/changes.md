# Changes Record — Defect 1 Fix (Settings Mobile Dark Tab Overlap)

## Target Issue
Massive visual overlap between "НАСТРОЙКИ Настройки клиники" (`.settings-heading`) and "МОЙ АККАУНТ Мой профиль" (`.settings-tabs`) on mobile screen widths (e.g. `Mobile_Dark_panel_settings.png`).

## Root Cause Analysis
1. In `apps/web/src/styles/main.css`, desktop settings view rules (`.settings-tabs { position: sticky; top: 100px; display: flex; flex-direction: column; }` and `.settings-tabs-group { flex-direction: column; }`) were declared after an earlier `@media (max-width: 860px)` block.
2. Because the desktop rules came after the media query with equal specificity, the sticky positioning (`top: 100px`) and column flex layout persisted on mobile viewports.
3. On mobile viewports, sticky positioning at `top: 100px` pulled the `.settings-tabs` strip upward to overlap directly over `.settings-heading`.
4. Group headers and buttons inside `.settings-tabs-group` were forcibly stacked vertically instead of flowing horizontally in a dedicated tab strip.

## Summary of Changes
1. **`apps/web/src/styles/main.css`**:
   - Removed the obsolete, overridden `@media (max-width: 860px)` block around line 14996.
   - Enhanced the authoritative mobile responsive rules under `@media (max-width: 860px)` at the end of `main.css`:
     - Forced `.settings-zone` to `display: flex !important; flex-direction: column !important; gap: 16px !important;` on mobile.
     - Enforced `.settings-heading` to `width: 100% !important; margin-bottom: 0 !important; position: relative !important; z-index: 2 !important;`.
     - Enforced `.settings-tabs` to `position: static !important; top: auto !important; display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; overflow-x: auto !important; z-index: 1 !important;`.
     - Enforced `.settings-tabs-group` to `display: flex !important; flex-direction: row !important; align-items: center !important; flex-shrink: 0 !important;`.
     - Enforced `.settings-tabs-group-header` and `.settings-tabs button` to align horizontally without vertical stacking or text collision.

## Validation Results
- `npm run typecheck -w @dental/web` passed with 0 errors.
- Visual inspection of `Mobile_Dark_panel_settings.png` root cause verified against modified layout rules.
