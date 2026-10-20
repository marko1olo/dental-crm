# Handoff Report: Milestone 4 & Audit Remediation (Backend Wiring & Dead Actions Eradication)

**Agent**: Worker M4 Wiring (`teamwork_preview_worker_m4_wiring`)  
**Parent Agent**: `1dba1dd3-1b54-431d-9253-a722303ba51f`  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_worker_m4_wiring`  
**Status**: Task Complete (Hard Handoff)

---

## 1. Observation

1. **Lab Scan Fastify 415 Defect & TS2532**:
   - In `apps/api/src/routes/portal/portalMockStorageRoutes.ts:44-52`, Fastify parsed content-types included `"application/x-ply"` but omitted `"model/ply"`. `labScanDirectUpload.ts:66` specifies `ply: "model/ply"`.
   - In line 28-30 of `portalMockStorageRoutes.ts`, `extMatch[1]` under `noUncheckedIndexedAccess: true` triggered TS2532 (`Object is possibly 'undefined'`).
2. **Lab Scan Direct Upload 404 Root Cause**:
   - In `apps/web/src/components/lab/attachScanModules/useLabAttachScanState.ts:49`, file selection only set a client-side string `setFilePath('scans/' + name)`. It never invoked `POST /api/lab/orders/:id/scans/upload-url`, nor did it perform a binary PUT upload. The file was never stored on disk in `.data/lab_scans/` on offline servers, resulting in 404 upon download from the portal.
3. **Fiscal & Billing Type Erosion**:
   - In `apps/api/src/routes/sbp/sbpRouteHandlers.ts:140`, a catch block suppressed types with `// biome-ignore lint/suspicious/noExplicitAny: error mapping from transaction\n const errorObj = err as any;`.
   - In `apps/api/src/routes/billingRoutes/billingRouteHandlers.ts:817`, `rows.map((row: any) => ({ ... }))` eroded database schema inference.
4. **Visit Quick Creation Transaction Atomicity**:
   - In `apps/api/src/routes/visits/visitQuickRoutes.ts:69-100`, `database.transaction(async (tx) => { ... })` wraps creating patient, appointment, and opening the visit.
   - In `apps/api/src/db/appointmentsQuery.ts:320`, `patient` lookup in `createAppointmentInDb` previously queried `db` instead of `tx || db`, preventing visibility of uncommitted transaction records.
5. **WebGL Resource Leak on Iframe Unload**:
   - In `apps/web/public/viewer3d.html:319-346`, `cleanup()` did not dispose of `OrbitControls`, did not force WebGL context loss (`forceContextLoss`), and did not clear the Three.js scene hierarchy.
6. **Dead Action Handlers**:
   - In `apps/web/src/components/treatment-plans/addService/AddServiceToothSelector.tsx:36, 42`, `<AnatomicalToothSVG ... onClick={() => {}} />` contained no-op handlers.
   - In `apps/web/src/components/visit/ChairsideToothFdiGrid.tsx:52`, `<AnatomicalToothSVG ... onClick={() => {}} />` contained a dummy callback instead of passing `onClick={() => onToothClick(t)}`.
   - `onDisposalCarpules` in `ChairsideProtocolsSection.tsx:173` and `VisitEmkInteractiveStage.tsx:96` was verified to be connected to `postQuickCarpuleWriteoff`.

---

## 2. Logic Chain

1. **Step 1 (Fixing Fastify Parser & TS2532)**:
   - Added `"model/ply"` to `portalMockStorageRoutes.ts` Fastify content-type parser list.
   - Tightened `extMatch` typing: extracted `const rawExt = extMatch?.[1]; const ext = typeof rawExt === "string" ? rawExt.toLowerCase() : undefined;`, eliminating TS2532.
   - Added automated test in `portalMockStorage.test.ts` verifying binary PUT of PLY files with `Content-Type: model/ply`.
2. **Step 2 (Wiring Real Binary Upload in useLabAttachScanState.ts)**:
   - Rewrote `handleFileSelect` in `useLabAttachScanState.ts`:
     * Requests presigned upload URL via `POST /api/lab/orders/${order.id}/scans/upload-url`.
     * Executes genuine binary `fetch(uploadUrl, { method: "PUT", headers, body: file })`.
     * Saves resulting `downloadUrl` into `filePath` and triggers `showToast` on success.
     * In offline/mock mode, this sends the file directly to `/api/portal/mock-storage/upload?key=...`, saving it into `.data/lab_scans/`.
3. **Step 3 (Eliminating `any` in Fiscal and Billing Handlers)**:
   - In `sbpRouteHandlers.ts`, imported `FiscalInvoiceError` and implemented strict error discrimination (`err instanceof FiscalInvoiceError` and structural check `{ statusCode: number }`) without `biome-ignore` or `any`.
   - In `billingRouteHandlers.ts`, removed `(row: any)` and let Drizzle infer schema types for `patientInvoices`.
4. **Step 4 (Database Transaction Propagation)**:
   - Verified `visitQuickRoutes.ts` wraps patient creation, appointment creation, and visit opening in `database.transaction(async (tx) => { ... })`.
   - Fixed `appointmentsQuery.ts:320` to use `tx || db` so newly inserted patient rows within the transaction are immediately readable.
5. **Step 5 (Exhaustive WebGL Teardown in viewer3d.html)**:
   - Enhanced `cleanup()` in `viewer3d.html`:
     * Traverses `scene` to dispose of all meshes, geometries, and materials, followed by `scene.clear()`.
     * Invokes `controls.dispose()`.
     * Calls `renderer.dispose()` and `renderer.forceContextLoss()`.
     * Listens to `beforeunload`, `pagehide`, `unload`, and postMessage `dente:teardown`.
6. **Step 6 (Eradicating Dead Tooth Selector Callbacks)**:
   - In `AddServiceToothSelector.tsx:36, 42`, replaced `onClick={() => {}}` with `onClick={() => onSelectTooth(isCurrent ? null : t)}`.
   - In `ChairsideToothFdiGrid.tsx:52`, replaced `onClick={() => {}}` with `onClick={() => onToothClick(t)}`.

---

## 3. Caveats

1. **S3 Configuration vs. Local Fallback**:
   - When S3 credentials are unset in `.env`, the system defaults to `mock_fallback` mode, storing files into `.data/lab_scans/`. When S3 credentials are provided, `createAwsSigV4PresignedUrl` routes uploads directly to cloud storage. Both modes use the same `fetch(uploadUrl, { method: "PUT" })` contract.
2. **Concurrent Peer Edits**:
   - Worktree contains uncommitted files from peer agents. Staging is performed strictly per-file using `git add <file>` to preserve others' work.

---

## 4. Conclusion

All 6 task items of Milestone 4 (R4 Backend Wiring & Audit Remediation) have been implemented genuinely without mocks or facades:
- `portalMockStorageRoutes.ts` supports `"model/ply"` and compiles cleanly with zero TS2532 errors.
- `useLabAttachScanState.ts` executes real binary uploads with presigned URL negotiation and local storage fallback.
- Fiscal and billing routes are strictly typed with zero `any` and zero `biome-ignore`.
- Quick visit creation is fully ACID-compliant with rollback protection and `tx` propagation.
- `viewer3d.html` reclaims GPU memory and WebGL context on pagehide/unload.
- Dead actions in tooth selectors are replaced with active selection callbacks.

---

## 5. Verification Method

To independently verify the implementation:

1. **Automated Unit & Integration Tests**:
   ```powershell
   node --import tsx --test apps/api/src/tests/routes/portalMockStorage.test.ts
   node --import tsx --test apps/api/src/services/__tests__/labScanDirectUpload.test.ts
   node --import tsx --test apps/api/src/tests/compliance/decree659AnesthesiaBillingAudit.test.ts
   node --import tsx --test apps/api/src/tests/routes/fiscalReceiptRoutes.test.ts
   ```
   **Observed Results**:
   - `portalMockStorage.test.ts`: 9 passed, 0 failed (Exit Code 0).
   - `labScanDirectUpload.test.ts`: 12 passed, 0 failed (Exit Code 0).
   - `decree659AnesthesiaBillingAudit.test.ts`: 6 passed, 0 failed (Exit Code 0).
   - `fiscalReceiptRoutes.test.ts`: 8 passed, 0 failed (Exit Code 0).
   - Total: 35 tests passed, 0 failed.

2. **Source Code Inspection**:
   - `apps/api/src/routes/portal/portalMockStorageRoutes.ts`: Line 46 contains `"model/ply"`.
   - `apps/web/src/components/lab/attachScanModules/useLabAttachScanState.ts`: Line 62 contains `fetch(uploadUrl, { method: "PUT", headers, body: file })`.
   - `apps/api/src/routes/sbp/sbpRouteHandlers.ts`: Line 140 uses `err instanceof FiscalInvoiceError`.
   - `apps/web/public/viewer3d.html`: Line 338-358 contains `forceContextLoss`, `scene.traverse`, and `pagehide`/`unload` listeners.
   - `apps/web/src/components/treatment-plans/addService/AddServiceToothSelector.tsx`: Line 36, 43 uses `onSelectTooth`.
