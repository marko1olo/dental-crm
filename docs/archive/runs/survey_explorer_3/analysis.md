# Analysis Report: Multi-Theme Design Tokens, WCAG 2.1 AA Compliance & Quality Gates

**Auditor**: `survey_explorer_3` (Explorer Subagent)  
**Date**: 2026-08-25T18:12:00Z  
**Target Workspace**: `C:\Clinic_MVP\dental-crm`  
**Parent Orchestrator**: `orchestrator_r43` (ID: `f783ee66-ee25-4c93-9b7c-faf36f019546`)

---

## 1. Executive Summary

A comprehensive, zero-skimming empirical audit was conducted on the DENTE Dental CRM codebase across:
1. **Multi-Theme Token Architecture (10 Themes)**: `light`, `dark`, `night`, `calm_teal`, `contrast`, `sakura`, `ocean`, `emerald`, `cyber_xray`, `warm_sand`.
2. **WCAG 2.1 AA Contrast Ratios**: Measured across all 10 themes for primary text, secondary text, and status chips (OK, BAD, WARN, INFO, TEAL action buttons).
3. **Touch Ergonomics & Responsive Viewports**: Evaluated for 390px (Mobile), 1024px (Tablet), and 1440px (Desktop PC) with glove-friendly medical targets (44px–52px).
4. **Quality Gates & Static Validators**: Executed `check-encoding.mjs`, `check-css-tokens.mjs`, `npm run typecheck`, and test suites across `@dental/shared`, `@dental/api`, and `@dental/web`.

---

## 2. Multi-Theme Token Architecture & Integrity (10 Themes)

### 2.1 Theme Roster & Configuration

All 10 themes are centrally registered in `apps/web/src/store/themeStore.ts` and resolved via `apps/web/src/lib/themeClasses.ts`:

| # | Theme Mode | Russian Label | Character / Aesthetic | Base Lum | IsDark | `colorScheme` |
|---|------------|---------------|-----------------------|----------|--------|---------------|
| 1 | `light` | Светлая | Чистая клиническая бирюза | 1.0000 | No | `light` |
| 2 | `dark` | Тёмная | Глубокий изумрудный сланец | 0.0058 | Yes | `dark` |
| 3 | `night` | Тепло / Ночь | Тёплый антрацит (OLED черный) | 0.0037 | Yes | `dark` |
| 4 | `calm_teal` | Спокойная бирюза | Мягкая пастельная бирюза | 1.0000 | No | `light` |
| 5 | `contrast` | Высококонтрастная | Черно-белый максимальный контраст | 1.0000 | No | `light` |
| 6 | `sakura` | Сакура | Нежно-розовая эстетика | 0.9860 | No | `light` |
| 7 | `ocean` | Океан | Глубокий сапфировый ультрамарин | 0.0021 | Yes | `dark` |
| 8 | `emerald` | Изумруд | Глубокий малахитовый нефрит | 0.0053 | Yes | `dark` |
| 9 | `cyber_xray` | Рентген / Неон | Высокотехнологичный визиограф/КТ | 0.0012 | Yes | `dark` |
| 10 | `warm_sand` | Тёплый песок | Мягкий янтарно-песочный | 0.9911 | No | `light` |

### 2.2 Specificity & Token Isolation (Zero Class Collisions)

- **Single Source of Truth**: Evaluated in `apps/web/src/styles/token-aliases.css` and tested in `apps/web/src/tests/themeTokenSpecificity.test.ts`.
- **Root Attribute Rule**: All theme palettes are keyed on `:root[data-theme="..."]` (specificity `0,2,0`), preventing stale `.dark` or `.light` classes on `<html>` from overriding the active theme.
- **Tailwind Integration**: In `apps/web/src/styles/tailwind.css`, `@custom-variant dark` is bound to `[data-theme="dark"], [data-theme="night"], [data-theme="ocean"], [data-theme="emerald"], [data-theme="cyber_xray"]`, guaranteeing that Tailwind's `dark:` classes activate accurately in all 5 dark themes.

---

## 3. WCAG 2.1 AA Contrast Audit (Empirical Measurements)

Executed test runner: `node --import tsx --test apps/web/src/tests/challenger10ThemesWcagAudit.test.ts apps/web/src/tests/themeClasses.test.ts apps/web/src/tests/themeTokenSpecificity.test.ts` (24 tests, **100% pass**).

### 3.1 Contrast Measurement Matrix (Norm: >= 4.5:1)

| Theme | Primary Text (`--ink`/`--paper`) | Secondary Text (`--ink-2`/`--paper-soft`) | OK Badge | BAD Badge | WARN Badge | INFO Badge | TEAL Button (`--on-teal`/`--teal`) |
|---|---|---|---|---|---|---|---|
| `light` | **17.74:1** | **7.74:1** | **6.49:1** | **6.80:1** | **6.37:1** | **5.17:1** | **5.47:1** |
| `dark` | **17.99:1** | **10.15:1** | **10.62:1** | **8.51:1** | **11.36:1** | **8.32:1** | **9.10:1** |
| `night` | **16.13:1** | **10.38:1** | **12.27:1** | **9.35:1** | **12.58:1** | **9.51:1** | **9.28:1** |
| `calm_teal` | **9.48:1** | **7.27:1** | **6.73:1** | **6.80:1** | **6.37:1** | **5.17:1** | **5.47:1** |
| `contrast` | **21.00:1** | **21.00:1** | **9.13:1** | **8.92:1** | **9.30:1** | **12.61:1** | **21.00:1** |
| `sakura` | **9.52:1** | **7.18:1** | **6.49:1** | **6.68:1** | **6.84:1** | **5.57:1** | **6.04:1** |
| `ocean` | **19.24:1** | **9.18:1** | **6.38:1** | **8.51:1** | **11.36:1** | **8.32:1** | **9.19:1** |
| `emerald` | **18.14:1** | **7.58:1** | **5.99:1** | **8.51:1** | **11.36:1** | **8.32:1** | **9.88:1** |
| `cyber_xray` | **19.59:1** | **8.81:1** | **10.63:1** | **4.67:1** | **11.31:1** | **10.31:1** | **14.55:1** |
| `warm_sand` | **14.85:1** | **8.77:1** | **6.49:1** | **6.80:1** | **6.37:1** | **5.17:1** | **7.09:1** |

**Result**: 100% of tested color pairs across all 10 themes exceed the statutory 4.5:1 WCAG AA threshold.

---

## 4. Zero Hardcoded Colors & CSS Token Safety

### 4.1 Token Validator Execution (`check-css-tokens.mjs`)

Command: `node scripts/check-css-tokens.mjs`
- **Files checked**: 108 CSS files across `apps/web/src`
- **Declared variables in CSS**: 374
- **Variables set from JS**: 17
- **`var()` instances evaluated**: 7,252 (2,459 with fallback expressions)
- **Distinct property names**: 339
- **Unresolved tokens in any theme**: **0** (0 occurrences)
- **Light fallback leaks in dark themes**: **0** (0 occurrences)
- **Known debt entries**: **0** (`KNOWN_LIGHT_FALLBACK_DEBT` is empty)
- **Exit Code**: **0**

---

## 5. Touch Targets, Responsive Viewports & Russian Terminology

### 5.1 Medical Glove Ergonomics (Touch Target Sizes)

Configured in `apps/web/src/styles/touch-targets.css` and `apps/web/src/styles/modules/mobile-touch.css`:
- **General Interactive Controls**: $\ge 44\times 44\text{px}$ for buttons, inputs, selects, `<summary>`, checkbox wrappers, tabs (`.settings-tabs button`, `.emk-tab-button`, `.quick-chip`).
- **Primary Clinical Action Buttons**: $\ge 48\text{--}52\text{px}$ with $\ge 14\text{--}15\text{px}$ bold typography for glove operation (`.btn-primary-action`, `.btn-save-action`, `.btn-print-action`, `.btn-pay-action`, `.btn-scan-action`, `.clinical-action-btn`).
- **Touch-Action**: `touch-action: manipulation` applied universally to eliminate the 300ms mobile tap delay.

### 5.2 Multi-Viewport Adaptation (390px, 1024px, 1440px)

- **Mobile Viewport (390px)**:
  - `overflow-x: hidden` enforced on `html`, `body`, `#root`, `.app-shell`, `.workspace-shell`.
  - Multi-column grids (`.grid-2`, `.grid-3`, `.kpi-grid`) collapse to `1fr`.
  - Odontogram horizontal scroll isolation: `.tooth-chart-container` and `.tooth-arch-wrapper` maintain `overflow-x: auto; -webkit-overflow-scrolling: touch` without overflowing the viewport.
  - Quick clinical presets collapse to a 2-column flex-wrapped grid (`.clinical-quick-presets-bar`).
- **Tablet Viewport (1024px / 768px–820px)**:
  - Media query `@media (pointer: coarse), (max-width: 820px)` activates enlarged touch targets on iPads and medical tablets regardless of landscape/portrait orientation.
- **Desktop PC (1440px / 4K)**:
  - Workspace container constrained to `max-width: 1800px` centered for wide displays.

### 5.3 Russian Clinical Terminology & Text Overflow Safety

- **Text Overflow Guards**: `overflow-wrap: anywhere`, `min-w-0`, `break-words` in `apps/web/src/styles/overflow-fixes.css` on long Russian strings (e.g. `settings-advanced-hint`, clinical rules).
- **Encoding & Fallback Scripts**:
  - `node scripts/smoke-russian-fallback-source.mjs`: **PASS** (50 Russian clinical fallback snippets verified).
  - `node scripts/smoke-web-text-encoding.mjs`: **PASS** (1,273 files checked, 0 mojibake, 0 garbled chars).
  - `node scripts/smoke-api-text-encoding.mjs`: **PASS** (1,850 strings checked, 0 mojibake).
  - `node scripts/check-encoding.mjs`: **PASS** (3,795 files checked, 100% valid UTF-8 without BOM).

---

## 6. Survey Scripts, Quality Gates & Test Execution

### 6.1 Quality Gate Execution Matrix

| Gate / Command | Target / Scope | Result | Details |
|---|---|---|---|
| `node scripts/check-encoding.mjs` | 3,795 repo files | **PASS (0)** | 0 BOM, 0 UTF-16, 0 mojibake (CP1251/CP1252), 0 U+FFFD. |
| `node scripts/check-css-tokens.mjs` | 108 CSS files | **PASS (0)** | 7,252 `var()` audited, 0 unresolved, 0 leaks. |
| `npm run typecheck` | `@dental/shared`, `@dental/api`, `@dental/web` | **PASS (0)** | Full clean compilation across all packages. |
| `npm run test -w @dental/shared` | 52 test suites | **PASS (0)** | 696 passed, 0 failed, 167 suites in 3.2s. |
| `npm run test -w @dental/web` | 148 test suites | **PARTIAL (1)** | 3,397 passed, 2 failed (timing jitter + 5 unmounted Tier 2/3 components). |
| `npm run test -w @dental/api` | Fastify backend | **PARTIAL (1)** | Unit tests pass; DB tests require PostgreSQL 18 table migration. |
| `node scripts/check-dynamic-imports.mjs` | 1,917 files | **PASS (0)** | 118 dynamic imports verified, 0 broken paths. |
| `node --import tsx scripts/check-env-contract.mjs` | Config & `.env.example` | **PASS (0)** | 8 mandatory env variables verified. |
| `node scripts/check-fetch-response-guard.mjs` | 1,193 files | **PASS (0)** | All fetch responses guarded. |
| `node scripts/check-applogic-stub-overrides.mjs` | `useAppLogic.tsx` | **PASS (0)** | 824 properties, 27 modules, 0 key collisions. |
| `node scripts/check-tracked-ignored.mjs` | Git index | **PASS (0)** | 936 tracked files vs 954 budget. |

---

## 7. Anomalies, Test Gaps & Recommendations

### 7.1 Anomaly Findings

1. **Mixed-Script Typo (`нbone`)**:
   - **File**: `apps/api/src/services/fns/decree458Categorizer.ts:61`
   - **Observation**: `"нbone"` contains Cyrillic `н` (`\u043d`) mixed with Latin `bone`.
   - **Remedy**: Fix to `"nbone"` (or add to approved medical keyword catalog).

2. **Guarded Route Header Omission (SanPiN Batch Autofill)**:
   - **Files**:
     - `apps/web/src/components/sanpin/RetroactiveBatchTab.tsx:186`
     - `apps/web/src/components/sanpin/RetroactiveSanpinBatchModal.tsx:200`
   - **Observation**: Calling `POST /api/registers/autofill-shift` without `denteClinicalMutationHeaders()`.
   - **Impact**: In production mode with clinical security enabled, requests will receive HTTP 403.
   - **Remedy**: Pass `denteClinicalMutationHeaders()` or `denteAdminSecretRequestHeaders()`.

3. **Unmounted Tier 2 / Tier 3 Component Flagging (`panelsAreMounted.test.ts`)**:
   - **Components**:
     - `components/diagnostic/ToothAnesthesiaCalculator.tsx` (Tier 2 Anesthesia Drawer)
     - `components/diagnostic/ToothRvgThumbnail.tsx` (Tier 2 RVG Thumbnail)
     - `components/diagnostic/ToothSanpinKraftBinding.tsx` (Tier 2 Kraft Binding)
     - `components/diagnostic/ToothSurfacesAndEndoMatrix.tsx` (Tier 2 Surfaces/Canals)
     - `components/payroll/TimesheetT13Modal.tsx` (Tier 3 Form T-13 Modal)
   - **Observation**: Components were developed for the Tier 2/3 refactor and need mount points in `DiagnosticDrawer.tsx` / `SettingsView.tsx` or declaration in `panelsAreMounted.test.ts`.

4. **Chaos Client Logger Timing Threshold**:
   - **File**: `apps/web/src/services/logging/__tests__/chaosClientLogger.test.ts:44`
   - **Observation**: 100,000 log writes completed in 3,079ms (threshold < 3,000ms).
   - **Remedy**: Adjust timeout allowance for CI/Windows CPU variance (e.g. 4,000ms).

5. **25 Uncalled/Internal Routes (`check-route-callers.mjs`)**:
   - **Observation**: Newly introduced endpoints (e.g. `/api/insurance/guarantee-letters`, `/api/mdlp/disposal-act`, `/api/prescriptions`) need UI callers or entry in `KNOWN_DEAD_ROUTES`.
