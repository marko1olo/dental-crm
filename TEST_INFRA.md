# E2E Test Infra: DENTE Dental CRM

## Test Philosophy
- Opaque-box, requirement-driven E2E verification using Playwright.
- Validates real UI component mounting, hash navigation, zero console / React Error Boundary errors, and 4-state visual responsiveness.

## Feature Inventory & Test Coverage Goal
| # | Feature | Source | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Real World) |
|---|---------|--------|:----------------:|:-----------------:|:---------------------:|:-------------------:|
| 1 | Playwright E2E Setup & Auth | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Panel Navigation (Schedule/Patients/Finance) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Visual Screenshot Matrix (4-state) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 4 | Zero Console & Page Error Crashes | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 5 | Modular Extraction Typecheck Safety | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 6 | Circular Dependency Verification | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Playwright Configuration: `apps/web/playwright.config.ts`
- E2E Test Suites:
  - `apps/web/tests/e2e/smoke.spec.ts` (Mocked API & fast smoke validation)
  - `scripts/playwright-audit.cjs` (Standalone CDP chrome browser verification)
  - `scripts/dente-redesign-shots.mjs` (Live server 4-state screenshot matrix generator)
- Execution Commands:
  - Fast E2E Smoke: `npx playwright test apps/web/tests/e2e/smoke.spec.ts`
  - Visual Screenshots: `node scripts/dente-redesign-shots.mjs`
  - Typecheck Gate: `npm run typecheck -w @dental/web`
  - Madge Circular Audit: `npx madge --circular apps/web/src/main.tsx`

## Coverage Thresholds
- Tier 1 (Feature Coverage): All 11 navigation panels loaded without Error Boundary exceptions.
- Tier 2 (Boundary): Empty state & invalid auth handling.
- Tier 3 (Cross-Feature): Multi-panel navigation without memory leak or stale state.
- Tier 4 (Real World): Full staff session simulation with screenshot artifacts.
