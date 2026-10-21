# Project: DENTE Dental CRM Autonomous Visual & Clinical Hardening

## Architecture
DENTE Dental CRM is a modular TypeScript monorepo consisting of:
- `packages/shared`: Domain contracts, integer kopecks arithmetic, FDI tooth nomenclature, MDLP GS1 DataMatrix parsing, and speech normalization.
- `apps/api`: Fastify backend with native PostgreSQL 18, Drizzle ORM, row-level pessimistic locking, and 54-FZ cashier fiscal receipt generation.
- `apps/web`: React 19 SPA with Vite, Tailwind v4 + custom theme tokens (10 palettes), Zustand state management (12 stores), Cornerstone3D/DICOM 3D MPR CT volumetric viewer, FDI odontogram, and Form 043/u clinical diary.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | TypeScript Compiler Gate | Fix missing `logger` import in `useOnboardingLogic.ts:301` so `npm run typecheck` passes 100% | M1 | Survey |
| 2 | Patient Resource Hydration | Add `_reloadToken` to `usePatientResource.ts` `useEffect` dependencies so child widget `reload()` triggers data refetch | M1 | Survey |
| 3 | Cold Start Auth Toast Muting | Suppress spurious 401 red error toast in `useDashboardLoaderLogic.ts` when displaying unlock/login prompt | M1 | Survey |
| 4 | Passive Diagnostic Toast Muting | Remove `showToast` from `browserIndexedDbWritable()` in `browserContinuity.ts` to prevent false alarm toasts on tab visibility changes | M1 | Survey |
| 5 | Modal Portals SSR & Body Mount | Fix inline modals (`CephalometricAnalysisModal`, `WaitlistQuickFillModal`, `SberbankTerminalPaymentModal`, `NdflCalculatorModal`, `InventoryConfirmDialog`, `CommandPalette`, `CryptoProSigner`) to portal to `document.body` with SSR checks | M2 | Survey |
| 6 | SSR Safe Portal Guards | Add `typeof document !== "undefined"` checks to `EndoCanalLogModal`, `WaitlistDrawer`, `OdontogramModule`, `Omnibar`, `VisitDiaryEditor`, `VisitView` | M2 | Survey |
| 7 | Multi-Theme Premium CSS Tokens | Add theme property blocks in `premium.css` for `sakura`, `ocean`, `emerald`, `cyber_xray`, `warm_sand` | M3 | Survey |
| 8 | Hex Background Bleed Elimination | Replace hardcoded `#fdf2f8` in `VisitView.tsx:2963` with semantic CSS variables | M3 | Survey |
| 9 | 10-Theme Test Coverage | Expand `themeClasses.test.ts` and `themeTokenSpecificity.test.ts` to explicitly verify all 10 theme palettes | M3 | Survey |
| 10 | 10-Theme Live Capture Matrix | Update `scripts/capture-all-views-live.mjs` to capture all 10 themes across desktop and mobile viewports | M3 | Survey |
| 11 | Quality Gates & Monorepo Tests | Verify 100% pass on encoding (2638+ files), typecheck, `@dental/shared` (211/211), and `@dental/web` (1463/1463) | M4 | Survey |
| 12 | Git Tracking & Mandate 8b | Track `useScheduleSettingsLogic.ts`, verify `check-imports-in-git.mjs`, run gitleaks staged scan, commit per-file, and push to origin/main | M4 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Compiler Gate & Core Hydration/Toast Remediation | `useOnboardingLogic.ts`, `usePatientResource.ts`, `useDashboardLoaderLogic.ts`, `browserContinuity.ts` | None | DONE |
| M2 | Modal Portals & SSR Safety Hardening | Modal components & portals across schedule, finance, orthodontics, odontogram, documents, and visit | M1 | IN_PROGRESS |
| M3 | Multi-Theme Design System & CSS Token Consistency | `premium.css`, `VisitView.tsx`, `themeClasses.test.ts`, `themeTokenSpecificity.test.ts`, `capture-all-views-live.mjs` | M1 | PLANNED |
| M4 | Comprehensive Verification, Adversarial Hardening & Mandate 8b Push | Run all quality gates, test suites, Challenger stress tests, Forensic Auditor integrity verification, atomic commits & push | M2, M3 | PLANNED |

## Interface Contracts
### `usePatientResource` ↔ Child Widgets (`PatientTaskTicketsWidget`, `PatientReclamationsWidget`)
- Contract: Calling `reload()` MUST increment `_reloadToken` and trigger a fresh `fetchPatientData(patientId)` call without page reload.
- Guard: Abort in-flight requests on `patientId` change or unmount.

### Modal Portals ↔ DOM Root
- Contract: Fullscreen dialogs MUST mount via `createPortal(jsx, document.body)` when `typeof document !== "undefined"`.
- Guard: Fallback to `null` if `typeof document === "undefined"` (SSR safe).

### Theme Resolution ↔ HTML Root
- Contract: `resolveTheme(mode, prefersDark)` supports all 10 modes and sets `[data-theme]` + `.dark`/`.light` classes.

## Code Layout
- `apps/web/src/hooks/domains/`: Domain logic hooks (`useOnboardingLogic.ts`, `useDashboardLoaderLogic.ts`, `useScheduleSettingsLogic.ts`).
- `apps/web/src/hooks/`: Resource & state hooks (`usePatientResource.ts`).
- `apps/web/src/components/`: Clinical and administrative UI components & modals.
- `apps/web/src/styles/`: Theme definitions (`main.css`, `token-aliases.css`, `premium.css`, `dente-redesign.css`).
- `apps/web/src/tests/`: Vitest / Node test suites.
- `scripts/`: Quality gate and AST verification scripts.
