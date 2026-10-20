# EMPIRICAL CHALLENGER REPORT: RED TEAM STRESS-TESTING & LIFECYCLE AUDIT

**Agent:** `teamwork_preview_challenger` (`challenger_perf_1`)  
**Parent / Orchestrator:** `47f9f488-23df-448d-9d14-106c107b506b`  
**Milestone:** Performance, Invariants & Empirical Stress Validation  
**Date:** 2026-10-20  
**Verdict:** `DETECTED_DEFECTS` (1 actionable lifecycle vulnerability in `viewer3d.html` teardown event bindings; 3 other target domains CONFIRMED robust)

---

## 1. Observation

### A. WebGL Lifecycle & Iframe Unmount Events (`apps/web/public/viewer3d.html`)
1. **Teardown Listener in `viewer3d.html` (lines 319–336):**
   ```javascript
   window.addEventListener('beforeunload', () => {
     if (rafId !== null) {
       cancelAnimationFrame(rafId);
       rafId = null;
     }
     if (activeBlobUrl) {
       URL.revokeObjectURL(activeBlobUrl);
       activeBlobUrl = null;
     }
     if (currentMesh) {
       scene.remove(currentMesh);
       disposeMesh(currentMesh);
       currentMesh = null;
     }
     if (renderer && typeof renderer.dispose === 'function') {
       renderer.dispose();
     }
   });
   ```
2. **Iframe Modal Mounting in `apps/web/src/components/radiology/IntraoralScan3DViewerModal.tsx` (lines 104, 253–263):**
   - When the user closes the modal (`onClose`), `isOpen` becomes `false`.
   - Line 104: `if (!isOpen) return null;` removes the entire dialog, disconnecting `<iframe src={iframeSrc} />` from the DOM tree.
3. **Empirical Playwright Chromium Test Output (`scratch/test-real-viewer3d-teardown.mjs` and `scratch/test-cleanup-events.mjs`):**
   - Attached event listeners for `beforeunload`, `pagehide`, and `unload` inside the iframe.
   - Removed the iframe from the DOM via `iframe.remove()`.
   - Logged console outputs:
     ```json
     ["IFRAME EVENT: pagehide", "IFRAME EVENT: unload"]
     ```
   - **Verbatim Result:** `beforeunload` **DID NOT FIRE AT ALL**. Only `pagehide` and `unload` were triggered.
4. **100-Cycle Model Switching Test Output (`scratch/test-100-cycle-mesh-switch.mjs`):**
   - Executed 100 sequential cycles alternating STL (ASCII cube) and OBJ (polygon face) models with material preset rotation (`tooth`, `gum`, `metal`, `zirconia`, `wireframe`).
   - Command result:
     ```text
     100-cycle test completed successfully: {
       "success": true,
       "totalCycles": 100
     }
     Exit Code: 0
     ```

---

### B. Notes Typing & ScheduleView Re-render Isolation (`AppViewRouter.tsx`, `ScheduleView.tsx`)
1. **`apps/web/src/components/appLayout/AppViewRouter.tsx` (lines 284–290):**
   - The former blanket prop spread `<ScheduleView {...(appLogicValue as any)} />` is completely eliminated.
   - Replaced by strictly 5 explicit, bounded props:
     ```tsx
     <ScheduleView
         dashboard={dashboard}
         patientName={appLogicValue?.patientName}
         loadDashboard={appLogicValue?.loadDashboard}
         lockScheduleAdminSession={lockScheduleAdminSession}
         unlockScheduleAdminSession={unlockScheduleAdminSession}
     />
     ```
   - `patientName` is the static helper function `patientNameHelper` from `AppHelpers`.
   - `lockScheduleAdminSession` and `unlockScheduleAdminSession` are stabilized with `React.useCallback`.
2. **`apps/web/src/ScheduleView.tsx` (lines 1, 49):**
   - Component is wrapped in `export const ScheduleView = memo(ScheduleViewComponent);`.
3. **Store Segregation in `useVisitNotes.ts` (lines 48–49):**
   - Visit notes form state is bound to atomic selector `useVisitStore((s) => s.visitNoteForm)`.
   - Neither `App.tsx`, `AppViewRouter.tsx`, nor `ScheduleView.tsx` subscribe to `useVisitStore`.
4. **Debounced Local Input in `PatientCoreEditorForm.tsx` (lines 28, 56–62):**
   - Keystrokes mutate local state `localDraft`. Parent store update is debounced by 300ms, with flush on `onBlur` and unmount.
5. **Autonomy Test Execution (`npx vitest run frontdeskSbpQrAutonomy visitAutosaveAndZeroKeystrokeLoss`):**
   ```text
   ✓ apps/web/src/components/visit/__tests__/visitAutosaveAndZeroKeystrokeLoss.test.tsx (6 tests) 19ms
   ✓ apps/web/src/components/schedule/__tests__/frontdeskSbpQrAutonomy.test.tsx (4 tests) 141ms
   Test Files 2 passed (2)
   Tests 10 passed (10)
   Exit Code: 0
   ```

---

### C. Cashier & Soft Warehouse Overdraft Invariants (Mandates 8e / 8n)
1. **Fast Checkout Suite (`npx tsx --test apps/web/src/components/payments/checkout/fastCheckoutInvariants.test.ts`):**
   ```text
   ▶ 54-FZ Fast Checkout Invariants (Mandates 8e, 8b, 8n)
     ✔ 1. Physical persons NEVER blocked by INN (54-FZ Tag 1228 optional for citizens) (1.3292ms)
     ✔ 2. Additive personal and family deposits in 1-click presets (0.5027ms)
     ✔ 3. Doctor discount autonomy up to 100% (warranty and colleague rework) with zero kopeck drift (21.3014ms)
     ✔ 4. Zero-due warranty checkout validation (targetBillKop === 0) cleanly passes without error (0.6781ms)
     ✔ 5. Exact cash change calculation down to kopecks (0.4944ms)
     ✔ 6. Split 50/50 preserves exact odd kopeck parity (0.4436ms)
     ✔ 7. FFD 1.2 Tag 1215 advance offset calculation (0.5409ms)
     ✔ 8. 54-FZ Fiscal Payload distribution generator (0.4343ms)
   ✔ 54-FZ Fast Checkout Invariants (Mandates 8e, 8b, 8n) (27.457ms)
   ℹ tests 8, suites 1, pass 8, fail 0
   Exit Code: 0
   ```
2. **Soft Warehouse Overdraft Suite (`npx tsx --test apps/web/src/components/treatment-plans/__tests__/softWarehouseOverdraft.test.ts`):**
   ```text
   ▶ Soft Warehouse Overdraft Engine (Mandate 8e Item 10 & Mandate 8n Item 2)
     ✔ 1. Выявление дефицита ТМЦ при недостаточном складском остатке (2.5285ms)
     ✔ 2. Формирование Акта выполненных работ со спецификацией ТМЦ при мягком овердрафте (19.1448ms)
     ✔ 3. Инвариант Мандата 8e п. 10: Списание с овердрафтом не блокируется (0.1967ms)
     ✔ 4. calculateDeductionSummary в ProcedureMaterialDeductionModal фиксирует дефицит без сбоев (0.684ms)
     ✔ 5. calculateClinicalWriteoffTotals в ClinicalWriteoffModal корректно рассчитывает дефицитные позиции (0.3493ms)
     ✔ 6. Автоматическое сторно при отмене услуги восстанавливает остаток и гасит дефицит/овердрафт (0.1831ms)
   ✔ Soft Warehouse Overdraft Engine (Mandate 8e Item 10 & Mandate 8n Item 2) (24.0813ms)
   ℹ tests 6, suites 1, pass 6, fail 0
   Exit Code: 0
   ```
3. **Challenger Adversarial Stress Suite (`npx tsx --test scratch/adversarial_challenger_perf_suite.test.ts`):**
   - 9 adversarial scenarios executed (malformed INNs, negative warehouse stock, warranty recalculation, prop identity checks).
   - All 9 passed cleanly (Exit Code 0).

---

## 2. Logic Chain

1. **Defect in `viewer3d.html` Teardown:**
   - Observation A.1 shows `viewer3d.html` registers teardown handlers exclusively via `window.addEventListener('beforeunload', ...)`.
   - Observation A.2 shows `IntraoralScan3DViewerModal.tsx` unmounts the modal by returning `null`, removing the `<iframe>` DOM element.
   - Observation A.3 proves via empirical Chromium execution that `beforeunload` does **not** fire on iframe removal; only `pagehide` and `unload` fire.
   - *Inference*: When a clinician closes `IntraoralScan3DViewerModal`, the teardown function inside `viewer3d.html` is completely bypassed. `cancelAnimationFrame(rafId)`, `renderer.dispose()`, and `disposeMesh(currentMesh)` do not execute. The GPU context and resources remain orphaned until indeterminate browser garbage collection cleans up the detached iframe window context.
   - *Remediation*: In `viewer3d.html`, extract teardown to a shared function and attach it to `pagehide` and `unload` in addition to `beforeunload`:
     ```javascript
     function cleanup() {
       if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
       if (activeBlobUrl) { URL.revokeObjectURL(activeBlobUrl); activeBlobUrl = null; }
       if (currentMesh) { scene.remove(currentMesh); disposeMesh(currentMesh); currentMesh = null; }
       if (controls && typeof controls.dispose === 'function') { controls.dispose(); }
       if (renderer && typeof renderer.dispose === 'function') { renderer.dispose(); }
     }
     window.addEventListener('beforeunload', cleanup);
     window.addEventListener('pagehide', cleanup);
     window.addEventListener('unload', cleanup);
     ```

2. **Stability of In-Flight Model Swapping in `viewer3d.html`:**
   - Observation A.4 confirms that during normal page lifecycle, 100 sequential cycles of switching between STL and OBJ models with preset material swaps run without runtime errors or resource exhaustion.
   - `disposeMesh(mesh)` safely frees `child.geometry` and `child.material` (including material arrays).

3. **ScheduleView Re-render Isolation:**
   - Observation B.1 shows `{...appLogicValue}` was removed from `<ScheduleView />` in `AppViewRouter.tsx`.
   - Observation B.2 shows `ScheduleView` is wrapped in `React.memo`.
   - Observation B.3 & B.4 show that notes typing updates `useVisitStore`, which is isolated from `AppViewRouter` and `ScheduleView`.
   - *Inference*: Typing in visit notes or patient editor does not re-create props passed to `ScheduleView`, preventing cascading re-renders.

4. **Cashier and Warehouse Sovereignty:**
   - Observations C.1 & C.2 confirm that physical persons are never blocked by INN (optional Tag 1228), 100% doctor discount passes without kopeck drift, and warehouse deficit / negative stock never disables the write-off action button.

---

## 3. Caveats

1. **Popout vs. Modal Teardown:**
   - When `viewer3d.html` is opened as a standalone popout window on a 2nd monitor (`openScan3dPopoutWindow`), `window.close()` does fire `beforeunload`. The defect is specific to the in-app modal (`<iframe>` DOM unmount).
2. **WebGL Context GC:**
   - Modern Chromium engines eventually reclaim WebGL contexts when detached iframes are garbage-collected; however, explicit `renderer.dispose()` and `cancelAnimationFrame` are required by Mandate 8wx and rule `frontend.md` §4 to prevent memory pressure on constrained clinic hardware.
3. **No Production Code Edits by Challenger:**
   - Per Challenger mandate, this agent is review-only. The defect is documented with empirical proof for resolution by the implementer or orchestrator.

---

## 4. Conclusion

**Verdict: DETECTED_DEFECTS**

- **Confirmed Defect (HIGH)**: `apps/web/public/viewer3d.html` listens solely to `beforeunload` for resource disposal. Because `IntraoralScan3DViewerModal` unmounts the `<iframe>` DOM element upon closing, `beforeunload` never fires in Chromium. Teardown logic (`cancelAnimationFrame`, `renderer.dispose()`, `disposeMesh`, `URL.revokeObjectURL`) is skipped on modal close.
  - *Fix required*: Bind cleanup to `pagehide` and `unload` alongside `beforeunload`.
- **Confirmed Robust (PASSED)**:
  - 100-cycle STL/OBJ model replacement in `viewer3d.html` properly releases meshes and materials via `disposeMesh`.
  - Re-render cascading on `ScheduleView` is eliminated: `{...appLogicValue}` spread removed, `React.memo` active, props stable during note typing.
  - Mandate 8e / 8n cashier & warehouse overdraft invariants 100% verified (no INN blocking for citizens, negative stock non-blocking).

---

## 5. Verification Method

To independently verify all findings and reproduce the defect:

```powershell
# 1. Run empirical iframe unload event reproduction:
node scratch/test-cleanup-events.mjs
# Output proves: Cleanup is triggered by "pagehide", while "beforeunload" never fires on iframe removal.

# 2. Run the 100-cycle WebGL switching stress test:
node scratch/test-100-cycle-mesh-switch.mjs

# 3. Run the comprehensive adversarial challenger test suite:
npx tsx --test scratch/adversarial_challenger_perf_suite.test.ts

# 4. Run existing project test suites for checkout, overdraft, and visit autonomy:
npx tsx --test apps/web/src/components/payments/checkout/fastCheckoutInvariants.test.ts
npx tsx --test apps/web/src/components/treatment-plans/__tests__/softWarehouseOverdraft.test.ts
npx vitest run frontdeskSbpQrAutonomy visitAutosaveAndZeroKeystrokeLoss
```
