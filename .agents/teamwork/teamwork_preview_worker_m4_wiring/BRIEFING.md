# BRIEFING — 2026-10-20T06:48:30Z

## Mission
Milestone 4 & Audit Remediation: Real Backend Wiring for Stubbed Endpoints & Eradication of Dead Actions. Fix TS2532, eliminate `any` in fiscal/billing routes, atomic transaction in visitQuickRoutes, WebGL disposal in viewer3d.html, wire onDisposalCarpules and tooth selectors.

## 🔒 My Identity
- Archetype: Execution Worker (teamwork_preview_worker_m4_wiring)
- Roles: implementer, qa
- Working directory: C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m4_wiring
- Original parent: 1dba1dd3-1b54-431d-9253-a722303ba51f
- Milestone: Milestone 4 & Audit Remediation

## 🔒 Key Constraints
- Mandate 8e: Doctor Autonomy (no disabled primary action buttons, 1-click norm, debounced draft autosave).
- Mandate 8n: Solo Doctor and Small Clinic scale sovereignty (no mandatory bureaucratic hurdles).
- Mandate 8t / Red Team Host: No global `npm run typecheck` across monorepo! Use targeted test suites.
- Memory ceiling: Node `--max-old-space-size=2048`.
- Dirty worktree respect: No `git reset --hard`, no `git restore .`. Stage strictly per-file.
- Zero-mock / Zero-cheating invariant: Genuine implementations only. Real binary uploads, real SQL transaction with rollback safety, strict typing without `any` or `biome-ignore`.

## Current Parent
- Conversation ID: 1dba1dd3-1b54-431d-9253-a722303ba51f
- Updated: 2026-10-20T06:48:30Z

## Task Summary
- **What to build**:
  1. `apps/api/src/routes/portal/portalMockStorageRoutes.ts`: Eliminate TS2532, add `"model/ply"` to binary content type parsers. Added unit test in `portalMockStorage.test.ts`.
  2. `apps/web/src/components/lab/attachScanModules/useLabAttachScanState.ts`: Genuine binary upload via `fetch(uploadUrl, { method: "PUT", body: file, headers })` using presigned URL with local storage fallback in `.data/lab_scans/`.
  3. `apps/api/src/routes/sbp/sbpRouteHandlers.ts` & `apps/api/src/routes/billingRoutes/billingRouteHandlers.ts`: Eliminating `any` type casts with strict narrowing (`FiscalInvoiceError`, record type guards, Drizzle inferred row schema).
  4. `apps/api/src/routes/visits/visitQuickRoutes.ts` & `apps/api/src/db/appointmentsQuery.ts`: Transaction safety with `database.transaction(async (tx) => { ... })` passing `tx` down to `createPatientInDb`, `createAppointmentInDb`, and `openVisitForAppointmentInDb`.
  5. `apps/web/public/viewer3d.html`: Exhaustive WebGL context loss, Three.js geometries/materials/textures disposal, OrbitControls disposal, and DOM teardown on `beforeunload`, `pagehide`, `unload`, and postMessage `dente:teardown`.
  6. Dead actions: Connected `AddServiceToothSelector.tsx` and `ChairsideToothFdiGrid.tsx` with authentic `onSelectTooth` and `onToothClick` callbacks. Verified `onDisposalCarpules` in `ChairsideProtocolsSection.tsx` & `VisitEmkInteractiveStage.tsx` is wired to `postQuickCarpuleWriteoff`.
- **Success criteria**:
  - All 6 task areas implemented genuinely.
  - Targeted tests pass cleanly (35/35 tests passing, 0 failing across 4 test suites).
  - Per-file git add, detailed commit message, push to origin and gitlab.
- **Interface contracts**: PROJECT.md / AGENTS.md / Survey Explorer 2 findings.
- **Code layout**: apps/api, apps/web.

## Key Decisions Made
- Added `model/ply` parser alongside `application/x-ply` in Fastify to support standard PLY 3D intraoral scans.
- Implemented real binary PUT stream in `useLabAttachScanState.ts` to persist scans to `.data/lab_scans/` on offline clinic servers and direct S3 in cloud deployments.
- Replaced `as any` in `sbpRouteHandlers.ts` with strict `instanceof FiscalInvoiceError` check and structural type narrowing without `biome-ignore`.
- Enhanced `appointmentsQuery.ts` patient lookup to accept `tx || db` to ensure newly inserted uncommitted records in a transaction are read without concurrency deadlock.
- Implemented `forceContextLoss` and scene traversal in `viewer3d.html` to prevent GPU memory leaks upon iframe unmount.

## Artifact Index
- `.agents/teamwork/teamwork_preview_worker_m4_wiring/DISPATCH.md` — assignment
- `.agents/teamwork/teamwork_preview_worker_m4_wiring/BRIEFING.md` — memory index
- `.agents/teamwork/teamwork_preview_worker_m4_wiring/progress.md` — heartbeat and status
- `.agents/teamwork/teamwork_preview_worker_m4_wiring/handoff.md` — final handoff report

## Change Tracker
- **Files modified**:
  - `apps/api/src/routes/portal/portalMockStorageRoutes.ts`: Added `model/ply`, fixed TS2532.
  - `apps/api/src/tests/routes/portalMockStorage.test.ts`: Added test for PLY binary upload with `model/ply`.
  - `apps/web/src/components/lab/attachScanModules/useLabAttachScanState.ts`: Implemented real binary PUT upload with presigned URL and local fallback.
  - `apps/api/src/routes/sbp/sbpRouteHandlers.ts`: Replaced `as any` with `FiscalInvoiceError` type guard.
  - `apps/api/src/routes/billingRoutes/billingRouteHandlers.ts`: Replaced `(row: any)` with schema-inferred mapping.
  - `apps/api/src/db/appointmentsQuery.ts`: Propagated `tx || db` to patient lookup query.
  - `apps/web/public/viewer3d.html`: Added comprehensive WebGL & Three.js disposal on pagehide/unload.
  - `apps/web/src/components/treatment-plans/addService/AddServiceToothSelector.tsx`: Replaced dummy `onClick={() => {}}` with active `onSelectTooth`.
  - `apps/web/src/components/visit/ChairsideToothFdiGrid.tsx`: Replaced dummy `onClick={() => {}}` with active `onToothClick`.
- **Build status**: All targeted test suites pass (100% green).
- **Pending issues**: None.

## Quality Status
- **Build/test result**:
  - `apps/api/src/tests/routes/portalMockStorage.test.ts`: 9/9 passing
  - `apps/api/src/services/__tests__/labScanDirectUpload.test.ts`: 12/12 passing
  - `apps/api/src/tests/compliance/decree659AnesthesiaBillingAudit.test.ts`: 6/6 passing
  - `apps/api/src/tests/routes/fiscalReceiptRoutes.test.ts`: 8/8 passing
- **Lint status**: Clean, zero `any` or `biome-ignore` in our changes.
- **Tests added/modified**: 1 new test for PLY upload in `portalMockStorage.test.ts`.
