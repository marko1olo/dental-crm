# Requirements & Acceptance Criteria Specification Report

**Workspace Target**: `C:\Clinic_MVP\dental-crm`  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork_preview_spec_miner_survey_3`  
**Specification Source**: `ORIGINAL_REQUEST.md` (Entry `2026-08-08T20:51:53Z`), `AGENTS.md`, and system mandate files.  
**Integrity Mode**: `benchmark`  

---

## 1. Executive Summary & Core Mission

The objective of this specification mining survey is to detail the precise functional, architectural, and verification requirements for the deep architectural audit, Playwright E2E verification, and God-Object dismantling of `apps/web/src/AppHelpers.tsx` (8,078 lines, 260 KB) in the DENTE Dental CRM codebase.

All work is governed by **Zero AI Optimism** (T.A.R.S. Mode) and strict physical verification gates. No code refactoring or symbol deletion is permitted without preceding paranoid codebase search (`ripgrep`, `ast-grep`) and subsequent clean programmatic checks.

---

## 2. Granular Requirements Breakdown

### R1. Browser UI & E2E Verification
- **Execution Mechanism**: Launch Playwright headless browser testing (via `npx playwright test` / `apps/web/tests/e2e/smoke.spec.ts`).
- **Authentication & Navigation**: Populate `dente_clinic_token` and `dente_staff_token` in `localStorage` and navigate across all major workspace panels (`#schedule`, `#patients`, `#finance`, `#visit`, `#settings`, `#imaging`).
- **Error Boundary & Crash Proofing**: Guarantee zero React Error Boundary exceptions (e.g. "Something went wrong", "Что-то пошло не так") and zero uncaught JavaScript page errors.
- **Console Log Monitoring**: Intercept and inspect browser console output (`console.error`, `console.warn`) to confirm that all UI controls, forms, buttons, and fields render and operate properly without throwing exceptions.
- **4-State Visual Proof Matrix**: Capture visual proof across 4 layout and theme combinations:
  1. **Mobile Light**: 390 x 844 px
  2. **Mobile Dark**: 390 x 844 px
  3. **PC Light**: 1440 x 900 px
  4. **PC Dark**: 1440 x 900 px

### R2. Paranoid Global Codebase Search
- **Reconnaissance Tools**: Utilize `ripgrep` (`rg`) and `ast-grep` (`sg`) to map the entire execution chain before modifying or extracting code from `AppHelpers.tsx`.
- **Exported Symbol Census**: Cross-reference every exported function, type definition, helper constant, or utility in `AppHelpers.tsx` against the entire `apps/web/src` tree.
- **Dependency & Call-Stack Verification**: Verify who instantiates each component, who invokes each helper, and whether any symbol is orphaned or actively wired into active UI views.
- **No Unverified Deletions**: Never assume code is unused based on a single file context. High alarm and deep multi-vectored audit required prior to removing any logic.

### R3. God-Object Dismantling (`AppHelpers.tsx`)
- **Monolithic Context**: `apps/web/src/AppHelpers.tsx` currently spans 8,078 lines and 259,887 bytes, violating modular architecture standards.
- **Surgical Domain Extraction**: Modularize `AppHelpers.tsx` into domain-specific utility modules under `apps/web/src/utils/`:
  1. **Finance Domain (`utils/financeUtils.ts`)**: Extract integer kopeck arithmetic helpers, pricing calculators, balance ledgers, NDFL tax deduction form helpers.
  2. **Telegram Domain (`utils/telegramUtils.ts`)**: Extract outbox status helpers, link code generators, message preview formatters, privacy mode filters, staff escalation channel logic.
  3. **Date/Time Domain (`utils/dateTimeUtils.ts`)**: Extract ISO local datetime input converters (`currentLocalDateTimeInputValue`), date math, schedule slot interval calculations.
  4. **Clinic Profile Domain (`utils/clinicProfileUtils.ts`)**: Extract clinic profile update validation, working hours formatters, specialty & feature flags.
- **Incremental Verification**: Run `npm run typecheck -w @dental/web` after **every single file move** to guarantee zero broken imports or type mismatches.

### R4. Zero AI Optimism & Circular Dependency Audit
- **Strict Verification Stance**: Prohibit unverified claims ("it should work now"). All architectural rewrites must be backed by stdout logs and clean tool execution.
- **Zero Circular Dependencies**: Run `npx madge --circular apps/web/src/main.tsx` and enforce an output of **exactly 0 circular dependencies**.
- **Clean Typecheck**: Run `npm run typecheck -w @dental/web` and require an exit code of `0`.
- **Grounded Engineering Decisions**: Ground all refactoring patterns and architectural decisions in industry best practices.

---

## 3. Explicit Verification Gates

| # | Gate Name | Executable Command | Target / Scope | Success Criteria |
|---|-----------|-------------------|----------------|------------------|
| **VG-1** | Type Safety Gate | `npm run typecheck -w @dental/web` | `@dental/web` package | Exit Code `0`, 0 TypeScript compiler errors. Must pass after every file extraction. |
| **VG-2** | Circular Dependency Gate | `npx madge --circular apps/web/src/main.tsx` | Frontend entry point `apps/web/src/main.tsx` | Exit Code `0`, exactly 0 circular dependencies found. |
| **VG-3** | E2E Browser Test Gate | `npx playwright test apps/web/tests/e2e/smoke.spec.ts` | Playwright E2E suite | All tests pass, 0 page errors, 0 React Error Boundaries triggered. |
| **VG-4** | Browser Console Integrity | Playwright `page.on('pageerror')` & `page.on('console')` | Browser runtime | Zero unhandled exceptions, zero unhandled promise rejections. |
| **VG-5** | 4-State Screenshot Verification | `node scripts/ops-panels-shots.mjs` / Playwright visual capture | 11 UI panels (Schedule, Patients, Finance, etc.) | 4 screenshots per view (Mobile Light/Dark, PC Light/Dark); HTTP 200 OK; distinct MD5 hashes; file size $\ge$ 40 KB; zero `_ПУСТО.png` or 500 error pages. |
| **VG-6** | Encoding Integrity Gate | `npm run check:encoding` | Monorepo source files | Exit Code `0`, 0 UTF-8 / Cyrillic mojibake errors. |

---

## 4. Features Discovered

## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | E2E Testing | Playwright E2E Panel Navigation | Headless Playwright script logging in with localStorage tokens and testing hash routing across Schedule, Patients, Finance, Settings, Imaging | URL hash navigation (`#schedule`, `#patients`, `#finance`, etc.) | Rendered UI, DOM snapshot, screenshot artifact | Fails test if pageerror occurs or `#root` innerText length < 10 | `apps/web/tests/e2e/smoke.spec.ts` & `ORIGINAL_REQUEST.md` |
| 2 | Visual Quality | 4-State Visual Proof Capture | Automated capturing of UI views across Mobile Light (390x844), Mobile Dark (390x844), PC Light (1440x900), and PC Dark (1440x900) | Live HTTP 200 server, route hash, theme state | 4 distinct PNG images saved in artifacts directory | Throws error if server is offline or screen renders blank (< 40 KB) | `AGENTS.md` § Screenshot Proof Law & `ORIGINAL_REQUEST.md` R1 |
| 3 | Reconnaissance | Multi-Vectored Codebase Census | Exhaustive global searching for exported symbols using `rg` and `ast-grep` (`sg`) before deleting or refactoring code | Symbol names, export keywords, AST patterns | File paths, line numbers, call site inventory | Warns/blocks refactoring if symbol is actively referenced | `ORIGINAL_REQUEST.md` R2 & `AGENTS.md` |
| 4 | Architecture | AppHelpers Dismantling: Finance Utils | Extracting kopeck integer math, pricing helpers, balance ledgers, NDFL tax deduction form logic into `utils/financeUtils.ts` | Currency amounts in kopecks, price lists, patient ledgers | Typed financial calculation utilities | Throws TypeError on invalid inputs, zero float rounding errors | `apps/web/src/AppHelpers.tsx` & `ORIGINAL_REQUEST.md` R3 |
| 5 | Architecture | AppHelpers Dismantling: Telegram Utils | Extracting bot link codes, message previews, privacy modes, staff escalation channel logic into `utils/telegramUtils.ts` | Telegram outbox payload, bot mode flags | Structured preview & outbox status helpers | Returns default fallback state on invalid payload | `apps/web/src/AppHelpers.tsx` & `ORIGINAL_REQUEST.md` R3 |
| 6 | Architecture | AppHelpers Dismantling: Date/Time Utils | Extracting ISO local datetime input converters (`currentLocalDateTimeInputValue`), date formatting, slot interval math into `utils/dateTimeUtils.ts` | Date objects, ISO strings | Formatted datetime strings for `<input type="datetime-local">` | Handles null/undefined date gracefully with fallback | `apps/web/src/AppHelpers.tsx` & `ORIGINAL_REQUEST.md` R3 |
| 7 | Architecture | AppHelpers Dismantling: Clinic Profile Utils | Extracting clinic profile update validators, working hours formatters, specialty & feature flags into `utils/clinicProfileUtils.ts` | Clinic profile input objects | Formatted profile attributes & feature availability | Throws validation error if required fields missing | `apps/web/src/AppHelpers.tsx` & `ORIGINAL_REQUEST.md` R3 |
| 8 | Build Quality | Circular Dependency Guard | Static analysis using `madge` to detect circular import paths originating from `apps/web/src/main.tsx` | Entry file `apps/web/src/main.tsx` | Graph of module dependencies, circular list | Non-zero exit code if circular dependencies exist | `package.json` & `ORIGINAL_REQUEST.md` R4 |
| 9 | Type Safety | TypeScript Workspace Typecheck | Monorepo incremental type checking with `tsc -b --noEmit` across web app | Web workspace source files (`apps/web/src/**/*.ts*`) | Typecheck status, error log | Non-zero exit code on TS errors (TS2339, TS2307, etc.) | `apps/web/package.json` & `ORIGINAL_REQUEST.md` R4 |
| 10 | Encoding | Cyrillic UTF-8 Encoding Guard | Script checking repository files for double-encoded or corrupted Cyrillic strings (mojibake) | Source files (`.ts`, `.tsx`, `.json`, `.md`) | List of clean / broken files | Fails check if char patterns like `РљР°СЂРёРµСЃ` are found | `package.json` (`check:encoding`) & `AGENTS.md` |

---

## 5. Edge Cases Matrix

## Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | E2E Screenshot Capture | Dev server offline (`HTTP 500` or connection refused) | Screenshot script MUST throw an explicit error immediately. Catching/suppressing errors to output blank/error screens (`_ПУСТО.png`) is forbidden by Screenshot Proof Law. |
| 2 | AppHelpers Dismantling | Re-exporting extracted symbols from `AppHelpers.tsx` during transition | If consumer files still import from `AppHelpers.tsx`, barrel re-exports (`export * from './utils/financeUtils'`) must be maintained until all import paths are updated, verified by `npm run typecheck -w @dental/web`. |
| 3 | Circular Dependency Audit | Module A imports Module B while Module B imports Module A via `AppHelpers.tsx` | `npx madge --circular apps/web/src/main.tsx` will fail. Dependencies must be decoupled into pure utility functions or extracted to dedicated standalone contracts in `packages/shared` or `utils/`. |
| 4 | Playwright Auth Injection | Missing `dente_clinic_token` or `dente_staff_token` in `localStorage` | App triggers auth gate and redirects to Login Screen. E2E tests for authenticated panels must pre-inject valid tokens via `page.addInitScript()`. |
| 5 | Mobile Theme Verification | 390px viewport width (Mobile view) in Dark Mode | UI layouts must scale cleanly using relative units (rem, em, %) without horizontal scrolling, overlapping buttons, or unreadable low-contrast text. |
| 6 | Financial Integer Calculations | Currency amounts passed as floating point numbers (e.g. `1500.50`) | Integer kopeck arithmetic mandate (1 RUB = 100 kopecks) requires explicit conversion (`Math.round(rub * 100)`) to prevent float precision drift in PostgreSQL. |
| 7 | Cyrillic Input & Encoding | Russian text edited via PowerShell or non-UTF8 tools | String corruption (mojibake like `РљР°СЂРёРµСЃ`). Files MUST be created/modified using explicit UTF-8 writers (`write_to_file`) and verified via `npm run check:encoding`. |
| 8 | Async Action Button Double-Click | User rapidly clicks submit button while promise resolves | Loading guard (`isSubmitting` / `disabled={isSubmitting}`) must lock UI synchronously before async yield to prevent duplicate backend mutations. |

---

## 6. Conclusion & Implementation Guidance

1. **Phase 1: Pre-Refactor Reconnaissance**
   - Run `rg` and `ast-grep` on all exported symbols of `AppHelpers.tsx`.
   - Run baseline `npm run typecheck -w @dental/web` and `npx madge --circular apps/web/src/main.tsx`.

2. **Phase 2: Surgical Domain Extraction**
   - Extract `financeUtils.ts`, `telegramUtils.ts`, `dateTimeUtils.ts`, `clinicProfileUtils.ts`.
   - Re-export from `AppHelpers.tsx` if needed for backwards compatibility during migration.
   - Run `npm run typecheck -w @dental/web` after each domain module extraction.

3. **Phase 3: Circular Dependency & Build Verification**
   - Confirm `npx madge --circular apps/web/src/main.tsx` outputs 0 circular dependencies.
   - Confirm clean `npm run typecheck -w @dental/web` (0 errors).

4. **Phase 4: Physical E2E & Visual Verification**
   - Execute Playwright smoke tests (`npx playwright test apps/web/tests/e2e/smoke.spec.ts`).
   - Audit 4-state screenshots (Mobile Light/Dark, PC Light/Dark) across primary panels.
