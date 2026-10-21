# Execution Plan: Ultimate Dental Clinical Ergonomics & High-Speed Workflow Overhaul

## Objective
Implement end-to-end clinical ergonomics, 1-click clinical workflows, fast schedule interactions, dynamic treatment planning, and strict visual/type quality standards.

## Milestones

### Milestone 1: Baseline Verification & Exploration
- Run `npm run typecheck -w @dental/web`, `npm test -w @dental/web`, and `node scripts/check-css-tokens.mjs`.
- Audit existing components in:
  * `apps/web/src/components/visit/`
  * `apps/web/src/components/schedule/`
  * `apps/web/src/components/treatment-plans/` & `OdontogramLiveInvoice.tsx`
  * `apps/web/src/styles/`

### Milestone 2: R1 - Visit Diary & Clinical Card (SOAP / 043/u) 1-Click Ergonomics
- Build/enhance 1-click clinical diary presets & templates (Терапия, Хирургия, Ортопедия, Профгигиена).
- Connect Odontogram findings auto-population to SOAP notes with ICD-10 codes (K02.1, K04.0, K05.3, K00-K08).
- Implement Anesthesia Calculator & dose logging with 1-click presets (Ультракаин Д-С форте 1:100000, Септанест, Скандонест 3%, Лидокаин 2%).
- Inline expandable diary sections with 300ms auto-save debounce and zero modal blockers.

### Milestone 3: R2 - Reception Schedule & Fast Booking Ergonomics
- 1-Click fast appointment creation from timeline drag / click with smart chair/doctor resolution.
- Status quick toggles (Подтвержден, Пришел, В кресле, Завершен, Не пришел, Отменен) directly on appointment cards with 1-click execution.
- Keyboard navigation (Arrow keys for timeline slot navigation, N for new appointment, Space for quick popover preview, Esc to close).
- Fast patient search with phone/birthdate auto-completion & instant selector.

### Milestone 4: R3 - Treatment Plans & Live Financial Estimation
- 1-Click treatment plan generator from odontogram pathologies mapped to Order 804n nomenclature.
- Alternative plan comparison (Оптимальный, Стандартный, Эконом) with patient & doctor views.
- Multi-stage clinical phase group toggles (1. Терапевтическая санация, 2. Хирургический этап, 3. Ортопедия / Имплантация).
- Instant discount/bonus calculation, margin estimator, and PDF export for patient signature.

### Milestone 5: R4 - Universal Theme Harmonization & Strict Quality Gates
- Verify all CSS variables and colors resolve cleanly across all 10 themes with 0 hardcoded colors.
- Touch target minimum >= 44x44px.
- Run `npm run typecheck -w @dental/web` (0 errors), `npm test -w @dental/web` (100% pass), and `node scripts/check-css-tokens.mjs` (0 unresolved tokens).
- Comprehensive unit tests covering all new ergonomics and calculators.
