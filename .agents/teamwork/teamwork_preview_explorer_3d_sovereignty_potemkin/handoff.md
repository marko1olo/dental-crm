# RED TEAM INQUISITION REPORT: 3D WEBGL LIFECYCLE, CLINICAL SOVEREIGNTY & POTEMKIN PURGE

**Target Monorepo**: `C:\Clinic_MVP\dental-crm`  
**Agent Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_3d_sovereignty_potemkin`  
**Parent Agent**: `47f9f488-23df-448d-9d14-106c107b506b`  
**Date**: 2026-10-20  
**Status**: 100% Complete (Read-Only Inquisition)

---

## 1. Observation

### 1.1 Three.js & WebGL Memory Lifecycle
- **Odontogram Chart Architecture**: `apps/web/src/components/dental-chart/*` **does not exist**. The dental chart in DENTE CRM is implemented using **2.5D SVG Vector paths** (`apps/web/src/components/odontogram/Tooth46Container.tsx`, `ToothSvg.tsx`, `gate0/`, `gate1/`), carrying zero WebGL overhead.
- **Single WebGL Subsystem**: The only Three.js WebGL engine in the entire codebase is `apps/web/public/viewer3d.html` (470 lines), embedded via `<iframe>` in `apps/web/src/components/radiology/IntraoralScan3DViewerModal.tsx`:
  - **Memory Leak 1 (Mesh Replacement without Disposal)**: In `apps/web/public/viewer3d.html:341-354`:
    ```javascript
    const onLoad = (result) => {
      if (currentMesh) scene.remove(currentMesh);
      if (normalizedExt === 'obj') {
        currentMesh = result;
      } else {
        result.computeVertexNormals();
        currentMesh = new THREE.Mesh(result);
      }
      applyMaterial(currentPreset);
      scene.add(currentMesh);
      fitCamera(currentMesh);
      showInfo(currentMesh);
      document.getElementById('loading').style.display = 'none';
    };
    ```
    When switching between STL/OBJ models, `scene.remove(currentMesh)` removes the node from the scene graph but does **NOT** invoke `currentMesh.geometry.dispose()` or `currentMesh.material.dispose()`. BufferAttributes and GPU VRAM allocations remain leaked in the WebGL context.
  - **Memory Leak 2 (Material Preset Overwrite)**: In `apps/web/public/viewer3d.html:298-312`:
    ```javascript
    function applyMaterial(preset) {
      if (!currentMesh) return;
      currentPreset = preset;
      const m = MATERIALS[preset];
      const mat = new THREE.MeshStandardMaterial({
        color: m.color,
        metalness: m.metalness,
        roughness: m.roughness,
        wireframe: m.wireframe,
        side: THREE.DoubleSide,
      });
      currentMesh.traverse((child) => {
        if (child.isMesh) child.material = mat;
      });
    }
    ```
    Every time a doctor clicks a material preset (`window.setMaterial('ceramic')`), a brand new `MeshStandardMaterial` is instantiated, and previous materials are discarded without calling `material.dispose()`.
  - **Memory Leak 3 (Zombie rAF Loop)**: In `apps/web/public/viewer3d.html:274-278`:
    ```javascript
    (function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    })();
    ```
    The animation loop runs anonymously without saving the `rafId` or handling `cancelAnimationFrame`.
  - **Memory Leak 4 (Object URL Retention)**: In `apps/web/public/viewer3d.html:413-417`:
    ```javascript
    function handleFile(file) {
      const ext = file.name.split('.').pop() || '';
      const url = URL.createObjectURL(file);
      window.loadModel(url, ext);
    }
    ```
    `URL.createObjectURL(file)` is called on file drag-and-drop or selection, but `URL.revokeObjectURL(url)` is never invoked after loading completes or fails.
  - **Context Loss Handling**: `renderer.domElement` has no event listener for `webglcontextlost` or `webglcontextrestored`. On GPU driver reset or mobile memory pressure, the canvas turns permanently black.

### 1.2 Clinical Sovereignty (Mandates 8e & 8n)
- **Primary Doctor Action Buttons**: In `apps/web/src/components/visit/view/VisitActionFooter.tsx:164-172`:
  ```tsx
  <button
    className="primary-button visit-primary-action min-h-[44px] px-3 py-2"
    type="button"
    onClick={safeVisitPrimaryAction.onClick}
    disabled={false}
    data-testid="visit-primary-action"
  >
    {safeVisitPrimaryAction.label}
  </button>
  ```
  Doctor action buttons in EHR are explicitly non-disabled (`disabled={false}`). Submitting states are guarded by spinner overlays or `disabled={isSubmitting}`, satisfying Mandate 8e.
- **54-FZ Fiscal Cashier INN Requirement**: In `apps/web/src/components/payments/checkout/fastCheckoutEngine.ts:199-215`:
  ```typescript
  if (clientType === "physical_person") {
    // Физическое лицо — ИНН строго опционален. Пустое поле 100% валидно.
    // В соответствии со ст. 4.7 № 54-ФЗ и Мандатом 8e чек физлица КАТЕГОРИЧЕСКИ НЕ БЛОКИРУЕТСЯ из-за ИНН (isValid: true).
    const cleanInn = (params.buyerInn ?? "").replace(/\D/g, "");
    if (!cleanInn) {
      return { isValid: true, isRequired: false };
    }
    return {
      isValid: true,
      isRequired: false,
      errorRu:
        cleanInn.length !== 12 && cleanInn.length !== 10
          ? "ИНН физического лица содержит 12 цифр (для чека поле опционально и не блокирует оплату)"
          : undefined,
    };
  }
  ```
  Physical persons are never blocked by an empty INN; `isValid` is unconditionally `true`.
- **Soft Negative Stock (Warehouse Accounting)**: In `apps/web/src/components/inventory/ProcedureMaterialDeductionModal.tsx:145-148`:
  ```tsx
  {summary.hasDeficit
    ? `Мягкий овердрафт активен (дефицит: ${summary.criticalCount} поз.). Прием не блокируется, фоновая заявка поставщику сформирована в бэкофисе.`
    : `Внимание: ${summary.warningCount} поз. достигли критического неснижаемого остатка.`}
  ```
  In `apps/web/src/components/treatment-plans/__tests__/softWarehouseOverdraft.test.ts`, all 6 test suites pass cleanly (`npm run test`), confirming that deficit does not halt procedure completion or billing.

### 1.3 Potemkin Sandboxes & Fake Mock Fallbacks
- **HTML Sandboxes**: Zero standalone `*_preview.html` files exist in `apps/web/public/` (only `index.html`, `viewer3d.html`, `gallery.html`, and `offline.html`).
- **Clean Root Entry Point**: `apps/web/src/main.tsx` routes strictly to valid sub-apps (Public Portal, Second Monitor Popouts, Hall Displays, or `<AppShell />`).
- **Relocation of Sandboxes to `StandaloneLaunchers.tsx`**: The query-param bypass branches were moved into `apps/web/src/components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx`:
  - `SpecializedClinicalLaunchers.tsx:123-152`: `?implant_passport=1` injects synthetic patient "Ковалёв Роман Станиславович", `patientId="PAT-2026-088"`.
  - `SpecializedClinicalLaunchers.tsx:174-177`: `?hygiene=1` injects "Смирнова Анна Сергеевна".
  - `SpecializedClinicalLaunchers.tsx:246-255`: `?recalls=1` injects 4 hardcoded synthetic candidates ("Иванов Иван Иванович", "Смирнова Анна Сергеевна", "Кузнецов Дмитрий Павлович", "Федорова Елена Николаевна").
  - `SpecializedClinicalLaunchers.tsx:327-346`: `?cbct=demo` loads "Захаров Иван Дмитриевич (312 срезов КЛКТ)".
  - `SpecializedClinicalLaunchers.tsx:397-402`: `?consent=demo` injects "Ковалёв Роман Станиславович", address "г. Москва, ул. Арбат, д. 24, кв. 12".
  - `SpecializedClinicalLaunchers.tsx:479-483`: `?emergency=1` injects "Захаров Иван Дмитриевич".
  - `SpecializedClinicalLaunchers.tsx:507-509`: `?photo-protocol=demo` injects "Ковалев Дмитрий Сергеевич".
  - `SpecializedClinicalLaunchers.tsx:535-545`: `?fast_checkout=1` injects "Иванова Мария Сергеевна", order "ORD-2026-88".
  - `SpecializedAdministrativeLaunchers.tsx:159`: `?smart_slot=demo` injects "Алексеев Владимир Сергеевич".
  - `SpecializedAdministrativeLaunchers.tsx:192`: `?dms=letter` injects "Соколова Анна Викторовна", policy "СГЗ-2026-998811".
  - `SpecializedAdministrativeLaunchers.tsx:307`: `?treatment-plans=1` injects "Волков Дмитрий Андреевич".
  - `SpecializedAdministrativeLaunchers.tsx:329`: `?family_billing=1` injects "Михайлов Артем Евгеньевич".
  - `PayrollStandaloneLauncher.tsx:24-60`: `?payroll=1` injects 5 hardcoded `demoServices` ("Смирнова Екатерина Васильевна").
- **Production Fallback Audit**:
  - `apps/web/src/components/visit/view/fastPrintModules/fastPrintDiaryBuilder.ts:77-83`:
    ```typescript
    export function extractClinicRequisites(dashboard: any) {
      const clinicName = dashboard?.organization?.name || dashboard?.organizationName || "Стоматологическая клиника DENTE";
      const clinicAddress = dashboard?.organization?.address || "г. Москва, Клинический проезд, д. 4";
      const clinicPhone = dashboard?.organization?.phone || "+7 (495) 000-00-00";
      const clinicOgrn = dashboard?.organization?.ogrn || "1027700000000";
      const clinicInn = dashboard?.organization?.inn || "7701000000";
      const license = dashboard?.organization?.licenseNumber || "ЛО-77-01-020000 от 12.04.2021";
    ```
    Hardcoded Moscow requisites are used as defaults in print forms instead of pulling from tenant branding settings.
  - `apps/web/src/components/treatment/TreatmentPipeline.tsx`: Verified clean. Uses `branding.clinicInn || "—"`.
  - `apps/web/src/components/payroll/DoctorPayoutDashboard.tsx`: Verified clean. Displays empty-state banner when no doctor is selected without injecting fake ruble payouts.
  - `apps/web/src/services/labScanDirectUpload.ts`: Local file store paths `/api/portal/mock-storage/upload` are backed by real disk storage in `.data/lab_scans/`, but use confusing "mock" naming.

---

## 2. Logic Chain

1. **Premise 1 (Three.js WebGL Scope)**:
   - Initial hypothesis assumed dental chart components used Three.js. Direct file inspection confirmed `apps/web/src/components/dental-chart/` is nonexistent; the odontogram is 100% SVG.
   - The actual Three.js footprint is concentrated in `apps/web/public/viewer3d.html`.
2. **Premise 2 (VRAM Accumulation)**:
   - In WebGL, removing an object from `scene` via `scene.remove(mesh)` only detaches it from the scene graph. The WebGL context retains the GPU buffers and shaders until `geometry.dispose()` and `material.dispose()` are called.
   - In `viewer3d.html:342`, replacing `currentMesh` without disposal leaks GPU memory on every model load. In `applyMaterial:310`, changing presets instantiates new materials without disposing old ones. This causes progressive VRAM degradation during extended intraoral scan review sessions.
3. **Premise 3 (Mandate 8e & 8n Compliance)**:
   - Clinical sovereignty requires that software never paralyzes doctor decisions.
   - Code inspection in `VisitActionFooter.tsx:168` and `fastCheckoutEngine.ts:200-215` confirms that neither EHR actions nor 54-FZ cashier checkouts are blocked by missing peripheral fields (such as patient INN).
   - In `ProcedureMaterialDeductionModal.tsx` and `softWarehouseOverdraft.test.ts`, warehouse deficits enter soft negative overdraft rather than stopping care.
4. **Premise 4 (Potemkin Relocation Mechanism)**:
   - Rather than eliminating query-param mock entry points from the codebase, previous refactoring moved them from `apps/web/src/main.tsx` into `apps/web/src/components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx`.
   - In production builds, accessing URLs like `?consent=demo` or `?implant_passport=1` mounts modals with synthetic Russian names and fake IDs instead of reading from PostgreSQL 18.
   - In `fastPrintDiaryBuilder.ts:78-82`, fallback requisites provide synthetic data ("Клинический проезд, д. 4", INN 7701000000) when clinic metadata is absent.

---

## 3. Caveats

- **Static Analysis of WebGL**: GPU memory consumption was deduced from Three.js source semantics rather than live Chrome DevTools Heap Snapshots.
- **Standalone Launchers Utility**: Standalone launchers serve as developer harnesses and UI test fixtures during local design work. Complete removal would require moving them into dedicated test suites or guarding them strictly behind `isDemoShowcaseMode() || import.meta.env.DEV`.
- **Portal Mock Storage**: The endpoint names containing `/mock-storage/` in `labScanDirectUpload.ts` do write real binary files to disk; the issue is semantic naming rather than non-functional fake behavior.

---

## 4. Conclusion & Remediation Roadmap

### 4.1 Summary of Assessment
1. **Three.js WebGL Engine**: Exhibits 4 memory leaks (lack of geometry/material disposal, orphan rAF loop, leaked Object URLs, and unhandled WebGL context loss). Requires surgical hardening in `viewer3d.html`.
2. **Clinical Sovereignty (Mandates 8e & 8n)**: Fully preserved and compliant. Doctors are never blocked, 54-FZ checkout works with zero INN friction for physical persons, and warehouse stock enters soft overdraft without halting clinical workflows.
3. **Potemkin Sandboxes & Mock Elimination**: Root entry point `main.tsx` is clean, but secondary launchers in `StandaloneLaunchers.tsx` retain synthetic patient data bypasses. `fastPrintDiaryBuilder.ts` retains hardcoded Moscow requisites.

### 4.2 Concrete Remediation Steps for Worker Agents
1. **Patch `apps/web/public/viewer3d.html`**:
   - Add explicit cleanup function `disposeMesh(mesh)` calling `traverse(child => { child.geometry?.dispose(); child.material?.dispose(); })`.
   - Call `disposeMesh(currentMesh)` inside `window.loadModel` before reassigning `currentMesh`.
   - In `applyMaterial()`, dispose previous materials before assigning new ones.
   - Save animation frame ID (`rafId = requestAnimationFrame(animate)`) and attach `window.addEventListener('beforeunload', () => cancelAnimationFrame(rafId))`.
   - Add `renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); showError('Потерян контекст WebGL...'); })`.
   - Call `URL.revokeObjectURL(url)` in `onLoad` and `onError` callbacks.
2. **Sanitize `fastPrintDiaryBuilder.ts`**:
   - Replace synthetic Moscow requisites (lines 78-82) with empty string / placeholder defaults (`clinicInn: dashboard?.organization?.inn || "—"`), matching `TreatmentPipeline.tsx`.
3. **Guard `StandaloneLaunchers.tsx`**:
   - Wrap demo patient bypasses in `isDemoShowcaseMode()` or `import.meta.env.DEV` checks so that production instances cannot accidentally display synthetic patient records.

---

## 5. Verification Method

### 5.1 Independent Test Verification
Run the existing unit tests to verify clinical sovereignty and cashier invariants:
```bash
# 1. Verify Soft Negative Stock & Overdraft
npx tsx --test apps/web/src/components/treatment-plans/__tests__/softWarehouseOverdraft.test.ts

# 2. Verify 54-FZ Cashier INN Exemption & Autonomy
npx tsx --test apps/web/src/components/payments/checkout/fastCheckoutInvariants.test.ts
```
Expected output: Both test suites pass with Exit Code 0 (6 passing in warehouse test, 8 passing in checkout test).

### 5.2 File Inspection Checkpoints
- `apps/web/public/viewer3d.html`: Check lines 341-354 (`window.loadModel`), lines 298-312 (`applyMaterial`), and line 415 (`URL.createObjectURL`).
- `apps/web/src/components/visit/view/VisitActionFooter.tsx`: Check line 168 (`disabled={false}`).
- `apps/web/src/components/payments/checkout/fastCheckoutEngine.ts`: Check lines 200-215 (`validateBuyerInn`).
- `apps/web/src/components/appLayout/modalsContainerModules/standalone/SpecializedClinicalLaunchers.tsx`: Check lines 123-550 for query params and hardcoded names.
- `apps/web/src/components/visit/view/fastPrintModules/fastPrintDiaryBuilder.ts`: Check lines 77-83 (`extractClinicRequisites`).

### 5.3 Invalidation Conditions
- If `apps/web/src/components/dental-chart/` is added with raw Three.js canvases, a new WebGL audit is required.
- If physical persons are blocked from paying cash or cards in `fastCheckoutEngine.ts` when INN is empty, Mandate 8e/8n is violated.
