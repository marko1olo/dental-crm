# Comprehensive Survey Report: UI Standards (R5) & Test / Quality Gate Infrastructure

**Date**: 2026-08-15  
**Investigator**: UI Standards & Test Suite Explorer  
**Workspace**: `C:/Clinic_MVP/dental-crm`  
**Working Directory**: `.agents/survey_explorer_3/`  
**Git HEAD Reference**: Live Worktree Analysis  

---

## 1. Executive Summary & Verification Matrix

| Area | Current Status | Passing / Total | Defect / Blocker Count | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **R5: Theme Token Purity** | **FAIL** | N/A | 10+ purple/violet violations, undeclared CSS tokens (`--ink-soft`, `--warn-line`) | **P0** |
| **R5: 4-State Visual Matrix** | **PARTIAL** | 4/4 States Defined | Theme contrast comment drift in `themeContrastGuard.test.ts` | **P1** |
| **R5: Touch Ergonomics (>=44px)** | **PASS with gaps** | 252+ elements covered | Isolated inline buttons lacking explicit min-size | **P2** |
| **Test Suite: `@dental/shared`** | **PASS** | 185 / 185 tests (100%) | 0 failures | **OK** |
| **Test Suite: `@dental/api`** | **PASS** | 925 / 925 tests (100%) | 0 failures | **OK** |
| **Test Suite: `@dental/web`** | **FAIL (2 broken)** | 1,317 / 1,319 tests (99.85%) | 2 failures in `themeContrastGuard.test.ts` | **P0** |
| **Iron Gate: `check:encoding`** | **PASS** | 2,388 files clean | 0 mojibake, 0 BOM, 0 U+FFFD | **OK** |
| **Iron Gate: `check:stub-overrides`** | **PASS** | 819 props / 24 modules | 0 stub overrides | **OK** |
| **Iron Gate: `check:fetch-response`** | **PASS** | 682 files | 0 unguarded responses | **OK** |
| **Iron Gate: `check:dynamic-imports`**| **PASS** | 1,050 files / 112 imports | 0 missing dynamic imports | **OK** |
| **Iron Gate: `check:env-contract`** | **PASS** | 8 required env vars | 0 missing env declarations | **OK** |
| **Iron Gate: `check:guarded-headers`**| **FAIL** | 231 / 232 calls | 1 unguarded PATCH call in `UrgentScheduleRequestsWidget.tsx:48` | **P0** |
| **Iron Gate: `check-css-tokens`** | **FAIL** | 169 tokens | 2 undeclared tokens with light fallbacks (`--ink-soft`, `--warn-line`) | **P0** |
| **Compiler Gate: `typecheck`** | **PASS** | 6 / 6 chained stages | 0 TypeScript compile errors | **OK** |

---

## 2. Deep Dive: Requirement R5 — Theme Tokens & Visual Verification

### 2.1 CSS Semantic Theme Tokens Architecture
The theme system is built around three cascade layers defined across `apps/web/src/styles/`:
1. `apps/web/src/styles/main.css`: Core root tokens for Light and Dark themes (`:root[data-theme="light"]`, `:root[data-theme="dark"]`).
2. `apps/web/src/styles/dente-redesign.css`: Drop-in design layer defining canonical Light, Dark (`[data-theme="dark"]`), and Night/Warm (`[data-theme="night"]`) palettes.
3. `apps/web/src/styles/token-aliases.css`: Semantic alias bindings resolving legacy variables and surface mappings to core theme variables.

#### Canonical Palette Mapping
- **Light Theme (`data-theme="light"`)**:
  - Surface: `--paper: #ffffff`, `--paper-strong: #ffffff`, `--paper-soft: #f6faf8` / `#f8fafc`, `--bg: #f0f5f3`
  - Typography: `--ink: #0f1e1b` / `#111827`, `--ink-2: #3f544f`, `--muted: #5d746f` / `#64748b`
  - Accent / Borders: `--teal: #0d9488`, `--teal-dark: #0f766e`, `--line: #e2eae7` / `#e2e8f0`
- **Dark Theme (`data-theme="dark"`)**:
  - Surface: `--paper: #101a19` / `#0f172a`, `--paper-strong: #15211f` / `#1e293b`, `--paper-soft: #0d1615` / `#020617`, `--bg: #0a1211`
  - Typography: `--ink: #e9f2ef` / `#f8fafc`, `--ink-2: #b9c9c4`, `--muted: #7e948e` / `#94a3b8`
  - Accent / Borders: `--teal: #2dd4bf`, `--teal-dark: #14b8a6`, `--line: rgba(150, 180, 172, 0.14)`
- **Night / Warm Theme (`data-theme="night"`)**:
  - Surface: `--paper: #1c1714`, `--paper-strong: #231d19`, `--paper-soft: #171310`, `--bg: #141110`
  - Typography: `--ink: #f1e8dd`, `--ink-2: #cdbfae`, `--muted: #98897a`
  - Accent / Borders: `--teal: #e0a458`, `--teal-dark: #cf9146`, `--line: rgba(220, 195, 160, 0.13)`

### 2.2 Violet / Purple Violations Audit (Zero Purple Mandate)
Empirical grep analysis across `apps/web/src/` revealed **10 distinct files** containing hardcoded purple/violet/indigo styles that directly violate the DENTE semantic theme palette:

1. **`apps/web/src/VisitNoteDraftPanel.tsx`** (Lines 241, 247, 256, 279, 289, 304):
   - `border border-violet-500/25 bg-zinc-950/80`
   - `shadow-[0_0_40px_-18px_rgba(139,92,246,0.35)]`
   - `text-violet-200`, `bg-violet-500/10`
   - `focus:ring-violet-500/50`
   - `bg-violet-600/90 hover:bg-violet-500`
   - *Fix*: Replace with semantic tokens `border-[var(--line)] bg-[var(--paper)] text-[var(--teal)] focus:ring-[var(--teal)] bg-[var(--teal)] hover:bg-[var(--teal-dark)]`.

2. **`apps/web/src/SmartParsePreview.tsx`** (Lines 416, 612):
   - `bg-purple-100 text-purple-800`
   - `bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/80 dark:hover:bg-purple-900 dark:text-purple-300 text-purple-700`
   - *Fix*: Replace with `var(--teal-surface)` / `var(--teal-dark)` in light mode and `var(--teal-soft)` / `var(--teal)` in dark mode.

3. **`apps/web/src/components/odontogram/TreatmentEstimator.tsx`** (Lines 468, 513, 532):
   - `text-indigo-500 dark:text-indigo-400`
   - `bg-indigo-600 border border-indigo-500 shadow-indigo-500/20 hover:bg-indigo-700`
   - `bg-indigo-500/5 dark:bg-indigo-500/10 shadow-[0_0_30px_5px_rgba(99,102,241,0.1)]`
   - *Fix*: Transition to `var(--teal)`, `var(--teal-dark)`, `var(--teal-glow)`.

4. **`apps/web/src/components/odontogram/PeriodontalChartModule.tsx`** (Lines 347, 362):
   - `"bg-purple-600 text-white"`
   - *Fix*: Replace with `bg-[var(--teal)] text-[var(--on-teal)]`.

5. **`apps/web/src/components/odontogram/ToothChart.tsx`** (Line 389):
   - `fill: "#a855f7", stroke: "#7e22ce"`
   - *Fix*: Replace with semantic tooth state colors.

6. **`apps/web/src/components/odontogram/OdontogramModule.tsx`** (Lines 293, 312):
   - `text-indigo-600 dark:text-indigo-400`
   - `bg-indigo-500/10 text-indigo-400 border-indigo-500/20`
   - *Fix*: Replace with `var(--teal-dark)` / `var(--teal)`.

7. **`apps/web/src/components/PatientPortal.css`** (Lines 142, 178, 203):
   - `border-color: #6366f1; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #6366f1;`
   - *Fix*: Replace with `var(--teal)` / `var(--teal-dark)`.

8. **`apps/web/src/components/settings/SettingsBpmnTab.tsx`** (Line 245):
   - `bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60`
   - *Fix*: Replace with `var(--teal-surface)` / `var(--teal-dark)`.

9. **`apps/web/src/lib/icd10.ts`** (Line 42):
   - `Пародонт: "bg-purple-500/10 text-purple-400 border-purple-500/25"`
   - *Fix*: Replace with `var(--teal-soft)` / `var(--teal)` / `var(--line)`.

10. **`apps/web/src/styles/visit-diary-043.css` & `components/VisitDiaryEditor.tsx`**:
    - `color: #7c3aed`
    - *Fix*: Replace with `var(--teal-dark)`.

### 2.3 CSS Token Validator Gate Failure (`scripts/check-css-tokens.mjs`)
Running `node scripts/check-css-tokens.mjs` exits with code 1 due to:
- **Light Fallback Debt**:
  - `--ink-soft` (3x): `apps/web/src/components/finance/FamilyWalletPanel.css:219` (fallback `#e2e8f0`), `apps/web/src/components/visit/VisitFlowProgress.css:131` (`#cbd5e1`), `VisitFlowProgress.css:278` (`#cbd5e1`).
  - `--warn-line` (2x): `apps/web/src/components/visit/VisitFlowProgress.css:170` (`#fde68a`), `VisitFlowProgress.css:207` (`#fde68a`).
- **Dark Fallback Unregistered Tokens**:
  - `--ink-soft` (5x)
  - `--bad`, `--bad-soft` (5x in `ScannerView.css`)
  - `--warn-line` (2x in `VisitFlowProgress.css`)
  - `--good`, `--good-soft` (2x in `ScannerView.css`)
  - `--good-fg` (1x in `AnalyticsDashboardView.css`)
  - `--ink-muted` (1x in `odontogram.css`)
- **Resolution**: Add these tokens to `apps/web/src/styles/token-aliases.css` mapped to `--ink-2`, `--warn-fg`, `--bad-fg`, `--ok-fg`.

### 2.4 Touch Ergonomics (>= 44x44px) Verification
`apps/web/src/styles/touch-targets.css` enforces touch sizing under `@media (pointer: coarse), (max-width: 700px)`:
- `.primary-button`, `.secondary-button`, `.text-button`, `.icon-button`: `min-height: 44px`.
- `.settings-tabs button`: `min-height: 44px !important`.
- `.emk-tab-button`, `.visit-sub-nav-tabs button`: `min-height: 44px`.
- `.quick-chip`, `.quick-chip--sm`, `.dictation-quick-row button`: `min-height: 44px`.
- `select`, `.select-phase`, `input[type="date"]`, `input[type="time"]`: `min-height: 44px`.
- `.btn-remove-item`, `.btn-icon`, `button[aria-label]`: `min-height: 44px; min-width: 44px;`.
- `label:has(> input[type="checkbox"])`, `label:has(> input[type="radio"])`: `min-height: 44px`.
- `summary`: `min-height: 44px`.

**Gap Analysis**:
- Inline `<button>` elements in newer panels (e.g. `VisitNoteDraftPanel.tsx`, `SmartParsePreview.tsx`) that do not use `.primary-button` / `.secondary-button` or `aria-label` rely on Tailwind utility classes `py-2 px-3` (yielding ~36px height).
- *Recommendation*: Ensure all mobile interactive buttons either use the semantic classes or have explicit Tailwind `min-h-[44px]` on mobile breakpoints.

---

## 3. Deep Dive: Test & Quality Gate Infrastructure

### 3.1 Test Suite Structure & Execution Baseline

```
Monorepo Test Architecture
├── packages/shared/src/tests/     -> Node Test Runner (node --import tsx --test)
│   └── 185 tests (185 pass, 0 fail) ~488ms
├── apps/api/src/                  -> Node Test Runner (node --import tsx --import poolTeardown.ts --test)
│   └── 925 tests (925 pass, 0 fail) ~22.0s
└── apps/web/src/                  -> Node Test Runner (node --import tsx --import testCssStub.mjs --test)
    ├── 1,319 tests (1,317 pass, 2 fail) ~7.4s
    └── tests/e2e/                 -> Playwright Test Runner (playwright test)
```

> **Crucial Discovery**: The unit/integration test runner across the entire monorepo is **Node.js Native Test Runner (`node:test`) executed via `tsx`**, NOT Vitest. Playwright (`@playwright/test` v1.62.1) is used strictly for E2E browser tests and screenshot audits (`apps/web/playwright.config.ts`).

### 3.2 Breakdown of the 2 Failing Web Tests in `themeContrastGuard.test.ts`
Running `npm run test -w @dental/web` executed 1,319 tests across 214 suites:
- **1,317 PASS**
- **2 FAIL**:
  1. `apps/web/src/tests/themeContrastGuard.test.ts:405` (`светлую и тёмную палитру задаёт main.css, а не dente-redesign.css`):
     - **Cause**: `main.css:84` was updated to `--muted: #7e948e` to match canonical dark theme, but the test asserted `#94a3b8` (`assert.equal(winningToken("--muted", "dark"), "#94a3b8")`).
  2. `apps/web/src/tests/themeContrastGuard.test.ts:427` (`каждое отношение из комментариев воспроизводится и держит норму 4.5`):
     - **Cause**: The ratio comment on `.onboarding-compact-strip` expected `14.19` based on the old `#94a3b8` muted color; the actual contrast with `#7e948e` is `13.44` (which still exceeds the 4.5 WCAG AA standard).

### 3.3 Iron Gate Pre-Commit & Verification Scripts Status

| Check Command | Script Path | Pass/Fail | Finding / Details |
| :--- | :--- | :--- | :--- |
| `npm run check:encoding` | `scripts/check-encoding.mjs` | **PASS** | 2,388 files audited. Valid UTF-8, no BOM, no U+FFFD, no CP1251/CP1252 mojibake. |
| `npm run check:stub-overrides` | `scripts/check-applogic-stub-overrides.mjs` | **PASS** | 819 properties in `useAppLogic.tsx` return object across 24 modules without collisions. |
| `npm run check:fetch-response` | `scripts/check-fetch-response-guard.mjs` | **PASS** | 682 files audited for response error checking. |
| `npm run check:dynamic-imports` | `scripts/check-dynamic-imports.mjs` | **PASS** | 1,050 files audited, 112 dynamic `import()` paths verified existing. |
| `npm run check:env-contract` | `scripts/check-env-contract.mjs` | **PASS** | 8 mandatory environment variables documented and verified. |
| `npm run check:tracked-ignored` | `scripts/check-tracked-ignored.mjs` | **PASS** | Tracked vs gitignore parity held within budget (954). |
| `npm run check:guarded-headers` | `scripts/check-guarded-route-headers.mjs` | **FAIL** | 1 unguarded PATCH endpoint: `apps/web/src/components/schedule/UrgentScheduleRequestsWidget.tsx:48` (`/api/schedule/urgent-schedule-requests/:id/resolve`). |
| `node scripts/check-css-tokens.mjs` | `scripts/check-css-tokens.mjs` | **FAIL** | Undeclared tokens `--ink-soft` and `--warn-line` causing light fallback leakage. |
| `node scripts/check-route-callers.mjs` | `scripts/check-route-callers.mjs` | **WARN** | 43 uncalled routes and 8 closed routes needing ledger synchronization in `KNOWN_DEAD_ROUTES`. |
| `gitleaks` | CLI Tool (v8.30.1) | **PASS** | Integrated into `scripts/hooks/pre-commit` step 1/5. |
| `npm run typecheck` | Root Package Script | **PASS** | 6/6 stages exit code 0 (`shared` build + typecheck + tests, `api` typecheck + tests, `web` typecheck). |
| `npx @biomejs/biome check` | Root Biome Config | **PASS** | Schema 2.5.4, strict formatting and lint rules. |

---

## 4. Exact Technical Recommendations for Implementation Phase

### 4.1 Requirement R5: Palette & Theme Fixes
1. **Fix `token-aliases.css`**:
   Add missing alias mappings to resolve `check-css-tokens.mjs`:
   ```css
   /* Surface & Status token fallbacks */
   --ink-soft: var(--ink-2);
   --ink-muted: var(--muted);
   --warn-line: var(--warn-border);
   --good: var(--ok-fg);
   --good-fg: var(--ok-fg);
   --good-soft: var(--ok-bg);
   --bad: var(--bad-fg);
   --bad-soft: var(--bad-bg);
   ```
2. **Purge Violet/Purple from Dark Theme**:
   - Refactor `VisitNoteDraftPanel.tsx` from `violet-*` / `zinc-*` to semantic DENTE classes and variables (`var(--teal)`, `var(--paper)`, `var(--ink)`, `var(--line)`).
   - Refactor `SmartParsePreview.tsx` from `purple-*` / `blue-*` to `var(--teal-surface)`, `var(--teal-dark)`, and semantic buttons.
   - Refactor `OdontogramModule.tsx`, `ToothChart.tsx`, `PeriodontalChartModule.tsx`, and `TreatmentEstimator.tsx` from `indigo-*` / `purple-*` to `var(--teal)` and clinic status tokens.

3. **Align `themeContrastGuard.test.ts`**:
   Update `apps/web/src/tests/themeContrastGuard.test.ts` line 415 and the corresponding measured ratio comment for `--muted` (`#7e948e`) to achieve 100% test pass rate across `@dental/web` (1,319/1,319).

### 4.2 Quality Gate & Route Guard Fixes
1. **Secure `UrgentScheduleRequestsWidget.tsx`**:
   At line 48, pass `denteClinicalMutationHeaders()` or `auth.denteClinicalMutationHeaders()` to `fetch()` for `PATCH /api/schedule/urgent-schedule-requests/${id}/resolve` so `check:guarded-headers` passes with 0 violations.
2. **Update Route Caller Ledger**:
   Update `KNOWN_DEAD_ROUTES` in `scripts/check-route-callers.mjs` to synchronize the 8 newly connected routes and 43 newly declared routes.

---

## 5. Architectural Map & File Index

| File Path | Role / Content | Status |
| :--- | :--- | :--- |
| `apps/web/src/styles/main.css` | Core theme token declarations & global rules | Active / Needs token cleanup |
| `apps/web/src/styles/dente-redesign.css` | 3-theme canonical palette & components | Active / Gold Standard |
| `apps/web/src/styles/token-aliases.css` | Undeclared token fallbacks & alias bridges | Needs `--ink-soft` & `--warn-line` additions |
| `apps/web/src/styles/touch-targets.css` | 44px touch target overrides for mobile/coarse pointer | Active / Compliant |
| `apps/web/src/tests/themeContrastGuard.test.ts` | Automated WCAG 1.4.3 contrast ratio validator | 2 assertions require palette sync |
| `apps/web/src/VisitNoteDraftPanel.tsx` | AI dictation SOAP draft panel | Requires purple-to-teal conversion |
| `apps/web/src/SmartParsePreview.tsx` | Voice/dictation parser preview popup | Requires purple-to-teal conversion |
| `apps/web/src/components/schedule/UrgentScheduleRequestsWidget.tsx` | Urgent schedule request resolver | Requires clinical mutation headers |
| `scripts/check-encoding.mjs` | UTF-8, BOM, mojibake gate | Active / 100% Pass |
| `scripts/check-css-tokens.mjs` | CSS token usage & light fallback validator | Active / Blocks on 2 tokens |
| `scripts/check-guarded-route-headers.mjs` | Fastify endpoint auth header guard | Active / Blocks on 1 widget |
| `scripts/hooks/pre-commit` | Iron Gate pre-commit hook (5 stages) | Active |
