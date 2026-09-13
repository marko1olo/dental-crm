# Handoff Report — Wave 196: Eradication of 6 Micro-Facades & SSOT Consolidation

## Observation
- **Scope**: Wave 196 in DENTE Dental CRM (`apps/web/src/components/`).
- **Target Facades Eradicated**:
  1. `StaffPayrollLedgerModal.tsx` (56 LOC) — duplicate wrapper over `DoctorPayrollModal`.
  2. `StaffCommissionsModal.tsx` (60 LOC) — empty frame wrapping `<StaffCommissionsPanel isModalView={true} />`.
  3. `AccessMatrixModal.tsx` (84 LOC) — empty frame wrapping `<GranularRoleMatrixView />`.
  4. `AnesthesiaProtocolSection.tsx` (103 LOC) — accordion wrapper around `AnesthesiaQuickBar`.
  5. `ExpressFiscalReceiptModal.tsx` (147 LOC) — wrapper mapping items and rendering `FiscalReceipt54FzModal`.
  6. `PatientDetailModal.tsx` (114 LOC) — wrapper around `PatientAnamnesisModal`.
- **SSOT Rewirings**:
  - `BackofficeModalsHost.tsx` rewired directly to `DoctorPayrollModal`, `GranularRoleMatrixView`, `StaffCommissionsPanel`, and `FiscalReceipt54FzModal`.
  - `ClinicalModalsHost.tsx` rewired directly to `PatientAnamnesisModal` and `AnesthesiaQuickBar`.
  - `FiscalReceipt54FzModal.tsx` incorporates `FlexibleFiscalItem` and full prop mapping.
  - `safetyMath.ts` centralizes `DEFAULT_SOMATIC_HEALTHY_NORM`, `createHealthySomaticNormProfile`, and `isSomaticProfilePhysiologicalNorm`.
  - Callers (`PatientCardModal.tsx`, `PatientGeneralInfoTab.tsx`, `SomaticAnamnesisCard.tsx`) and tests rewired to `safetyMath.ts`.
- **Mount Guard Backlog**:
  - `DEMOUNTED_MODAL_SHIRMS_BACKLOG` in `apps/web/src/tests/panelsAreMounted.test.ts` purged of the 6 removed shirms.
  - `DEMOUNTED_MODAL_SHIRMS_CEILING` lowered from 94 down to 88.

## Logic Chain
- In accordance with Supreme Law (`THE_HAMMER_MASTER_PROMPT.md`), Mandate 8s (Universal Anti-Bloat Dogma & Law of the Single Undivided Authority), and Mandate 8e (Doctor Autonomy):
  - Every clinical and backoffice workflow must have strictly one canonical Best-of-Breed SSOT implementation.
  - Intermediate layers, dead facades, and fake test-shirms create cognitive friction, maintenance drag, and test bloat.
  - Moving `FlexibleFiscalItem` to `FiscalReceipt54FzModal` allows `FiscalReceipt54FzModal` to directly serve all express checkout paths without an intermediate forwarding layer.
  - Centralizing somatic norm logic in `safetyMath.ts` ensures complete separation of clinical domain rules from React modal components.

## Caveats
- All 6 facade files were completely purged via `git rm` without backward compatibility wrappers, as all internal callers across `@dental/web` were rewired to SSOT components.
- Subagents were barred from global compilation per Single-Compiler Gate (Mandate 8t); all typechecks and encoding tests were run sequentially.

## Conclusion
- 6 redundant micro-facades and dead shirms eradicated (net -227 LOC).
- `DEMOUNTED_MODAL_SHIRMS_CEILING` successfully lowered from 94 to 88 in `panelsAreMounted.test.ts`.
- All gates pass: `npm run check:encoding` (0 errors), `npm run typecheck -w @dental/web` (Exit Code 0), `npm run typecheck -w @dental/api` (Exit Code 0), `npm run typecheck -w @dental/shared` (Exit Code 0).
- All 11/11 tests pass in `panelsAreMounted.test.ts`.
- Documentation synchronized in `BACKLOG.md` (Section 345), `OUR_CRM_MAP.md` (Section 2.10.279), and `FEATURES_REGISTRY.md`.

## Verification Method
- `node scripts/check-encoding.mjs`: 0 errors across 5,134 files.
- `npm run check:css-tokens`: 0 unresolvable CSS tokens across 167 CSS files.
- `npm run check:dynamic-imports`: 148 dynamic imports verified, 0 broken.
- `npm run check:env-contract`: Contract valid, 8 required vars explained.
- `node --import tsx --import ./apps/web/testCssStub.mjs --test apps/web/src/tests/panelsAreMounted.test.ts`: 11/11 pass.
- `node --import tsx --import ./apps/web/testCssStub.mjs --test apps/web/src/components/payroll/__tests__/advancedPayrollComponents.test.ts`: 5/5 pass.
- `node --import tsx --import ./apps/web/testCssStub.mjs --test apps/web/src/components/finance/__tests__/cashShiftAutonomyAndFiscal54Fz.test.tsx`: 13/13 pass.
- `node --import tsx --import ./apps/web/testCssStub.mjs --test apps/web/src/components/patients/__tests__/outpatientAutonomyWave42.test.tsx`: 13/13 pass.
- `node --import tsx --import ./apps/web/testCssStub.mjs --test apps/web/src/components/clinical/__tests__/clinicalFrictionKillerWave44.test.tsx apps/web/src/components/tasks/__tests__/clinicalTasksAutonomyWave41.test.tsx`: 24/24 pass.
- `npm run typecheck -w @dental/web`: Exit Code 0.
- `npm run typecheck -w @dental/api`: Exit Code 0.
- `npm run typecheck -w @dental/shared`: Exit Code 0.
