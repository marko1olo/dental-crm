# Project: DENTE CRM Visual Remediation & Full Quality Hardening (Session R5)

## Architecture
- React / TypeScript frontend in `apps/web/src`
- Component structure under `apps/web/src/components/` (`settings/`, `communications/`, `schedule/`)
- E2E 4-State Visual Audit script: `e2e_4state_audit.cjs` at project root
- Biome Linter configuration: `biome.json` at project root

## Feature Inventory
| # | Feature / Defect | Description | Target Component(s) / Files | Milestone | Status |
|---|------------------|-------------|-----------------------------|-----------|--------|
| 1 | Mobile Dark Tab Overlap | Fix overlap between "НАСТРОЙКИ" and "МОЙ АККАУНТ" | `SettingsView.tsx` / `main.css` | M1/M2 | DONE |
| 2 | PC Light Form Squashing | Fix vertically squashed inputs under "ПОСТАВИТЬ В ОЧЕРЕДЬ" | `MessageDeliveryConsole.tsx` / `dente-operations.css` | M1/M2 | DONE |
| 3 | PC Dark Button Alignment | Fix `Все записи` button vertical misalignment | `ScheduleFilterStrip.tsx` / `main.css` | M1/M2 | DONE |
| 4 | Biome Linter Hardening | Fix `biome.json` ignore syntax & resolve all 123 linter errors across workspace | `biome.json`, `apps/web/src` | M5 | IN_PROGRESS |
| 5 | Web Unit Tests Fixes | Resolve assertion failures in 4 failing web unit tests | `paymentComposerReset.test.ts`, `priceEntryKeepsKopecks.test.ts`, `themeClasses.test.ts`, `visiographFindings.test.ts` | M6 | IN_PROGRESS |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Investigation | Deep code exploration of target visual components | None | DONE |
| M2 | Implementation | Apply CSS/React fixes for target visual defects | M1 | DONE |
| M3 | Initial Verification | Playwright 4-state audit & initial typecheck | M2 | DONE |
| M4 | Initial Audit | Forensic audit of modified files | M3 | DONE |
| M5 | Biome Configuration & Linter Remediation | Fix `biome.json` syntax & resolve all 123 linter errors for 0 errors/0 warnings | None | IN_PROGRESS |
| M6 | Web Unit Tests Remediation | Fix 4 failing unit tests in `@dental/web` for 100% test pass rate | None | IN_PROGRESS |
| M7 | Final Victory Verification & Audit | Re-run typecheck, biome check, unit tests, and victory auditor | M5, M6 | PLANNED |

## Code Layout
- `biome.json`
- `apps/web/src/tests/paymentComposerReset.test.ts`
- `apps/web/src/tests/priceEntryKeepsKopecks.test.ts`
- `apps/web/src/tests/themeClasses.test.ts`
- `apps/web/src/tests/visiographFindings.test.ts`
- `apps/web/src/components/settings/SettingsView.tsx`
- `apps/web/src/components/communications/MessageDeliveryConsole.tsx`
- `apps/web/src/components/schedule/ScheduleFilterStrip.tsx`
