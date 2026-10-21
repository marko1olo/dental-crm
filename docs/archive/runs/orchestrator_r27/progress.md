# Progress Log — Round 27 (Odontogram Multi-Surface Morphology & Multi-Canal Order 804n Billing)

## Tasks & Milestones
- [x] Baseline Verification
  - `npm run typecheck -w @dental/web` -> Exit 0
  - `npm test -w @dental/web` -> Exit 0 (1,714 tests pass)
  - `node scripts/check-css-tokens.mjs` -> Exit 0 (0 missing vars)
  - `node scripts/check-encoding.mjs` -> Exit 0 (2,943 files clean)
- [x] R2: Root-Canal Count Accurate Minzdrav Order 804n Infrastructure
  - Created `packages/shared/src/toothCanalsAndBilling804n.ts` with `getAnatomicalRootCanalCount` and Order 804n procedures (`A16.07.030.001..004`, `A16.07.008.001..004`).
  - Exported in `packages/shared/src/index.ts`.
  - Built `@dental/shared` (`npm run build -w @dental/shared`).
  - Created and passed unit tests in `packages/shared/src/tests/toothCanalsAndBilling804n.test.ts`.
  - Connected and tested in `OdontogramLiveInvoice.tsx` and `odontogramLiveInvoice.test.ts`.
- [x] R1: Anatomical Crown Multi-Surface Caries Mapping (MOD / MO / DO / Class V)
  - Added `"C"` to `AnatomicalSurfaceKey` in `anatomicalToothGeometries.ts`.
  - Mapped `C` paths in all 10 templates (Upper/Lower Molars, Premolars, Canines, Incisors, Pediatric Molars).
  - Implemented `ANATOMICAL_SURFACE_NAMES_RU`, `normalizeAnatomicalSurfaces()`, and `isSurfaceActive()`.
  - Added comprehensive tests in `anatomicalOdontogram.test.ts`.
- [x] R3: Quality & Verification Gates
  - `npm run typecheck -w @dental/web` -> Exit 0 (0 errors).
  - `npm test -w @dental/web` -> Exit 0 (1,723 / 1,723 tests pass).
  - `node scripts/check-css-tokens.mjs` -> Exit 0 (0 unresolved vars).
  - `node scripts/check-encoding.mjs` -> Exit 0 (2,945 files clean).
  - Multi-theme visual screenshot capture executed and audited across 4 states (Mobile Light, Mobile Dark, PC Light, PC Dark).
