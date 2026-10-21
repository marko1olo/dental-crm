# Scope: Milestone M1 (Compiler Gate & Core Hydration/Toast Remediation)

## Architecture
Targeting web application frontend state management, logger imports, error toast suppression on 401s, and diagnostic toast muting in `@dental/web`.

## Target Files & Ownership
1. `apps/web/src/hooks/domains/useOnboardingLogic.ts`
   - Scope: Add missing `logger` import (`import { logger } from "../../utils/logger";`).
2. `apps/web/src/hooks/usePatientResource.ts`
   - Scope: Add `_reloadToken` to `useEffect` dependency list (`[patientId, _reloadToken]`) so calling `reload()` re-fetches patient data.
3. `apps/web/src/hooks/domains/useDashboardLoaderLogic.ts`
   - Scope: Suppress red error toast for expected 401 unauthenticated errors when transitioning to unlock screen.
4. `apps/web/src/browserContinuity.ts`
   - Scope: Remove user-facing `showToast` from `browserIndexedDbWritable()`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Onboarding logger import | Fix missing logger symbol causing compile failure | M1 | spec_miner_gates |
| 2 | Patient resource reload dependency | Fix reload token ignored in useEffect deps | M1 | spec_miner_gates |
| 3 | Dashboard 401 toast suppression | Avoid alarming unauthenticated toast on cold start unlock | M1 | spec_miner_gates |
| 4 | IndexedDB diagnostic toast muting | Prevent low-level storage diagnostic toast on boot | M1 | spec_miner_gates |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Compiler Gate & Core Hydration/Toast Remediation | 4 file fixes, typecheck & test suite verification | none | IN_PROGRESS |

## Verification Criteria
1. `npm run typecheck` passes cleanly across the monorepo with 0 errors.
2. `npm test -w @dental/web` passes all tests.
3. Code changes conform strictly to zero-mock, no regression standards.
