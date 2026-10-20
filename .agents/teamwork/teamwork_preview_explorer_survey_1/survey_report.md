# Red Team Inquisitor Survey Report: R1 — Complete Purge of Standalone Fake Preview Sandboxes, HTML Gateways & main.tsx Bypass Branches

**Milestone**: Wave 1 — Reconnaissance & Pre-Purge Architecture Audit  
**Requirement**: R1 (Complete Purge of Standalone Fake Preview Sandboxes & HTML Gateways & main.tsx Bypass Purge)  
**Agent**: Survey Explorer 1 (`teamwork_preview_explorer_survey_1`)  
**Timestamp**: 2026-10-20T02:30:00Z  
**Parent Orchestrator ID**: `1dba1dd3-1b54-431d-9253-a722303ba51f`  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_1`  
**Investigation Mode**: Strict Read-Only Audit (Presumption of Defect 100%)  

---

## 1. Executive Summary

This investigation delivers an exhaustive, zero-skimming architectural census of all Potemkin sandboxes, standalone preview HTML pages, isolated React entrypoints, and unauthenticated query-param bypass branches across `apps/web/` and the repository root.

### Core Discoveries:
1. **Total Preview & Test HTML Files Identified (13 files)**:
   - **6 Staged for Deletion in Git Index**: `cashbox_checkout_preview.html`, `clinical_hygiene_ortho_preview.html`, `endo_modal_preview.html`, `odontogram_popover_preview.html`, `ortho_warranty_preview.html`, `prescription_modal_preview.html`. (All located in `apps/web/`).
   - *Note on `patient_registration_preview.html`*: Mentioned in the initial dispatch prompt, verified via `git log` and file-search as already pruned in earlier commits.
   - **5 Unstaged Deleted CBCT Static Test Benches**: `cbct_interpolation_10_methods.html`, `cbct_interpolation_gallery_512.html`, `cbct_interpolation_interactive.html`, `cbct_resolution_interpolation_inquisition.html`, `cbct_slice_512_hud.html` in `apps/web/`.
   - **2 Untracked Stray HTML Files in Repo Root**: `tournament_arena.html` (409 KB, massive standalone test harness) and `test_curl.html` (11.6 KB, manual curl test fixture).
2. **Total Preview Entrypoints Identified (6 files)**:
   - All 6 corresponding `*_preview_main.tsx` files are located in `apps/web/src/` and are currently staged for deletion in the git index:
     `cashbox_checkout_preview_main.tsx`, `clinical_hygiene_ortho_preview_main.tsx`, `endo_modal_preview_main.tsx`, `odontogram_popover_preview_main.tsx`, `ortho_warranty_preview_main.tsx`, and `prescription_modal_preview_main.tsx`.
   - Each entrypoint mounted production UI components with synthetic, hardcoded patient data (e.g., "Смирнов", "Иванов И.И.", "Захаров", tooth 16), bypassing all auth and PostgreSQL data providers.
3. **`apps/web/src/main.tsx` Bypass Audit**:
   - In git `HEAD` (994 lines), `main.tsx` contained **13 separate query-parameter branches** (lines 417–887) that short-circuited the entire CRM, mounting raw standalone components outside `<AppShell />`.
   - The current working tree file `apps/web/src/main.tsx` has already been pruned to 490 lines by a workspace collaborator, removing all 13 bypass branches while preserving legitimate public portals and multi-monitor display studios.
4. **Vite Bundler Build Safety**:
   - `apps/web/vite.config.ts` has **NO `rollupOptions.input`** configured. Vite defaults exclusively to `index.html`.
   - Removing all 13 HTML files will **NOT** break `npm run build` or Vite dev-server hot reloading.
5. **Tooling Blind Spot in `scripts/sandbox_hunter.cjs`**:
   - The project's automated audit script `scripts/sandbox_hunter.cjs` searches only for files containing `preview` or starting with `test-`.
   - Consequently, it missed `tournament_arena.html` and `test_curl.html`. Recommendations to update this script are detailed in Section 6.
6. **Secondary Layer: In-App Potemkin Launchers**:
   - Inside `apps/web/src/components/appLayout/modalsContainerModules/`, we discovered three secondary standalone launchers (`SpecializedClinicalLaunchers.tsx`, `SpecializedAdministrativeLaunchers.tsx`, `PayrollStandaloneLauncher.tsx`) that still listen to URL query parameters (`?implant_passport`, `?anesthesia`, `?payroll`, etc.) inside the mounted `AppShell`.

---

## 2. Complete Catalog of Standalone HTML Preview Sandboxes

The following table catalogs every standalone HTML preview and test file across the workspace:

| # | File Path | File Size | Title / Purpose | Script Entrypoint Mounted | Git Status |
|---|---|---|---|---|---|
| 1 | `apps/web/cashbox_checkout_preview.html` | 1,228 B | Standalone Cashbox Checkout Preview | `/src/cashbox_checkout_preview_main.tsx` | Staged deletion (`D`) |
| 2 | `apps/web/clinical_hygiene_ortho_preview.html` | 1,385 B | Clinical Hygiene & Orthopedics Chairside Preview | `/src/clinical_hygiene_ortho_preview_main.tsx` | Staged deletion (`D`) |
| 3 | `apps/web/endo_modal_preview.html` | 1,202 B | Endodontics Canal Modal Standalone Preview | `/src/endo_modal_preview_main.tsx` | Staged deletion (`D`) |
| 4 | `apps/web/odontogram_popover_preview.html` | 1,288 B | Odontogram Radial Popover Standalone Preview | `/src/odontogram_popover_preview_main.tsx` | Staged deletion (`D`) |
| 5 | `apps/web/ortho_warranty_preview.html` | 1,244 B | Orthopedics Warranty Standalone Preview | `/src/ortho_warranty_preview_main.tsx` | Staged deletion (`D`) |
| 6 | `apps/web/prescription_modal_preview.html` | 1,218 B | Prescription Modal Standalone Preview | `/src/prescription_modal_preview_main.tsx` | Staged deletion (`D`) |
| 7 | `apps/web/cbct_interpolation_10_methods.html` | 27,249 B | CBCT 10 Interpolation Methods Benchmark | Inline Vanilla JS / WebGL test harness | Deleted in worktree (unstaged) |
| 8 | `apps/web/cbct_interpolation_gallery_512.html` | 31,412 B | CBCT 512x512 Interpolation Comparison Gallery | Inline Vanilla JS / Canvas test harness | Deleted in worktree (unstaged) |
| 9 | `apps/web/cbct_interpolation_interactive.html` | 38,981 B | CBCT Interactive Interpolation Inspector | Inline Vanilla JS / WebGL test harness | Deleted in worktree (unstaged) |
| 10 | `apps/web/cbct_resolution_interpolation_inquisition.html` | 42,110 B | CBCT Resolution & Interpolation Red Team Stand | Inline Vanilla JS / WebGL test harness | Deleted in worktree (unstaged) |
| 11 | `apps/web/cbct_slice_512_hud.html` | 21,805 B | CBCT 512 HUD Axial/Coronal/Sagittal Viewer | Inline Vanilla JS / WebGL test harness | Deleted in worktree (unstaged) |
| 12 | `tournament_arena.html` (Repo Root) | 409,102 B | Offline Tournament Arena & Red Team Simulator | Massive bundle with inline scripts and styles | Untracked stray (`??`) |
| 13 | `test_curl.html` (Repo Root) | 11,620 B | Curl Diagnostic HTML Output Dump | Static cURL raw response | Untracked stray (`??`) |

### Verification of `patient_registration_preview.html`:
A dedicated git inspection (`git log --all --full-history -- "**/patient_registration_preview.html"`) confirmed that `patient_registration_preview.html` was completely purged in earlier development and is no longer present anywhere in the worktree or index.

---

## 3. Catalog of Standalone Entrypoints (`*_preview_main.tsx`)

Each of the 6 staged preview entrypoints in `apps/web/src/` established an isolated React root directly mounting modal or panel components with fabricated mock state:

### 3.1 `cashbox_checkout_preview_main.tsx` (1,848 bytes)
- **Path**: `apps/web/src/cashbox_checkout_preview_main.tsx`
- **Mounted Components**:
  - `PaymentModal` (`apps/web/src/components/cashbox/PaymentModal.tsx`)
  - `FastCheckoutModal` (`apps/web/src/components/cashbox/FastCheckoutModal.tsx`)
- **Fabricated Props**:
  - Hardcoded patient: `patientId: "pat-preview-1"`, `patientName: "Смирнов Алексей Владимирович"`, `initialAmountRub: 25000`.
  - Fake visit: `visitId: "vis-preview-101"`, `organizationId: "org-showcase-1"`.
- **Verdict**: Purge. The real `PaymentModal` and `FastCheckoutModal` are already used within `CashboxView.tsx` and chairside appointment completion flows.

### 3.2 `clinical_hygiene_ortho_preview_main.tsx` (4,342 bytes)
- **Path**: `apps/web/src/clinical_hygiene_ortho_preview_main.tsx`
- **Mounted Components**:
  - `HygieneExpressPresetsStrip` (`apps/web/src/components/clinical/hygiene/HygieneExpressPresetsStrip.tsx`)
  - `OrthopedicsChairsideLabOrderBanner` (`apps/web/src/components/clinical/ortho/OrthopedicsChairsideLabOrderBanner.tsx`)
  - `OrthopedicsProtocolsGrid` (`apps/web/src/components/clinical/ortho/OrthopedicsProtocolsGrid.tsx`)
- **Fabricated Props**:
  - Dummy patient: `patientName: "Смирнова Анна Сергеевна"`, `toothNumber: 16`.
  - Mock handlers: `onSelectPreset={(p) => console.log("Preset:", p)}`.
- **Verdict**: Purge. These three components must be integrated into the authentic Chairside Clinical Protocol (`ChairsideVisitView.tsx` or `EhrRecordView.tsx`).

### 3.3 `endo_modal_preview_main.tsx` (1,931 bytes)
- **Path**: `apps/web/src/endo_modal_preview_main.tsx`
- **Mounted Component**:
  - `EndoCanalLogModal` (`apps/web/src/components/clinical/endo/EndoCanalLogModal.tsx`)
- **Fabricated Props**:
  - Dummy tooth: `toothFdi: 16`, `toothName: "1.6 Верхний правый первый моляр"`.
  - Fake patient: `patientId: "pat-test-101"`, `patientName: "Захаров М. В."`.
  - Hardcoded canals: `MB1 (21mm), MB2 (20mm), DB (21mm), P (22mm)`.
- **Verdict**: Purge. `EndoCanalLogModal` must be triggered directly from the interactive Odontogram (`OdontogramGrid.tsx` / `ToothDetailsModal.tsx`) when treating endodontic diagnoses.

### 3.4 `odontogram_popover_preview_main.tsx` (3,674 bytes)
- **Path**: `apps/web/src/odontogram_popover_preview_main.tsx`
- **Mounted Component**:
  - `ToothRadialMenu` (`apps/web/src/components/clinical/odontogram/ToothRadialMenu.tsx`)
- **Fabricated Props**:
  - Mock tooth state: `toothFdi: 36`, `existingDiagnoses: ["K02.1"]`.
  - Mock position: `anchorPosition: { x: 500, y: 350 }`.
- **Verdict**: Purge. The radial menu is already triggered by clicking on individual tooth crowns inside the clinical dental chart.

### 3.5 `ortho_warranty_preview_main.tsx` (2,752 bytes)
- **Path**: `apps/web/src/ortho_warranty_preview_main.tsx`
- **Mounted Component**:
  - `OrthopedicsChairsidePanel` (`apps/web/src/components/clinical/ortho/OrthopedicsChairsidePanel.tsx`)
- **Fabricated Props**:
  - Hardcoded patient: `patientId: "pat-1"`, `patientName: "Иванов И.И."`.
  - Static dental work: `workType: "Zirconia Crown"`, `warrantyMonths: 24`.
- **Verdict**: Purge. Belongs directly in the Orthopedics & Laboratory Orders section of the patient treatment history.

### 3.6 `prescription_modal_preview_main.tsx` (3,694 bytes)
- **Path**: `apps/web/src/prescription_modal_preview_main.tsx`
- **Mounted Component**:
  - `PrescriptionModal` (`apps/web/src/components/clinical/prescriptions/PrescriptionModal.tsx`)
- **Fabricated Props**:
  - Hardcoded patient: `patientId: "pat-mock-42"`, `patientName: "Иванов Иван Иванович"`, `birthDate: "1988-03-15"`.
  - Hardcoded doctor: `doctorName: "Д-р Смирнов А. В."`.
- **Verdict**: Purge. `PrescriptionModal` is already hooked into `ChairsideVisitView.tsx` and `PatientCardModal.tsx` ("Рецепты" tab).

---

## 4. Deep Inspection of `apps/web/src/main.tsx` (HEAD vs Working Tree)

In `git HEAD` (commit `69e98e8`, 994 lines), `apps/web/src/main.tsx` was contaminated with 13 unauthenticated bypass branches that inspected `window.location.search`. If any matched, it completely skipped rendering `<AppShell />`, mounted a single component in an empty `<div>`, and returned early.

### 4.1 Inventory of All 13 Bypass Branches in `HEAD:apps/web/src/main.tsx`

| Branch # | Query Param Trigger | Lines in HEAD | Component Mounted | Mock Fixtures / Props Injected |
|---|---|---|---|---|
| 1 | `params.has("hygiene")` | 417–458 | `<HygieneIndicesPanel />` | `patientName="Смирнова Анна Сергеевна"`, `doctorName="Д-р Воронов А. В."`, dummy tooth 16 |
| 2 | `params.has("anesthesia")` | 459–485 | `<AnesthesiaStandaloneWorkspace />` | `organizationId="org-showcase-1"`, `doctorId="doc-showcase-1"` |
| 3 | `params.has("telephony")` | 486–508 | `<TelephonyStandaloneWorkspace />` | Hardcoded mock call events and softphone simulator |
| 4 | `params.has("perio")` | 509–536 | `<PerioStandaloneWorkspace />` | Synthetic 6-point periodontal pocket depths for 32 teeth |
| 5 | `params.has("prescriptions")` \|\| `params.has("rx")` | 537–564 | `<PrescriptionsStandaloneWorkspace />` | Standalone prescription catalog with fake templates |
| 6 | `params.has("implant_passport")` \|\| `params.has("implants")` | 565–610 | `<ImplantPassportModal />` | `initialTooth={46}`, `patientId="pat-showcase-1"` |
| 7 | `params.has("tasks")` \|\| `params.has("clinical_tasks")` | 611–638 | `<ClinicalTasksStandaloneWorkspace />` | Isolated task board bypassing role-based permissions |
| 8 | `params.has("tax")` \|\| `params.has("tax_deduction")` | 639–717 | `<TaxDeductionCertificateModal />` | `selectedYear={2025}`, hardcoded payments: 15,000 руб & 45,000 руб, patient "Иванов И.И." |
| 9 | `params.has("orthopedics")` \|\| `standaloneParam === "orthopedics"` | 718–768 | `<OrthopedicsChairsidePanel />` | `patientId="pat-showcase-1"`, `activeToothFdi={16}` |
| 10 | `params.has("communications")` \|\| `params.has("comms")` | 769–808 | `<CommunicationsView />` | Rendered completely outside `<AppShell />` without sidebar or global navigation |
| 11 | `params.has("tournament")` | 809–832 | `<TournamentArena />` | Red Team benchmark harness outside production shell |
| 12 | `standParam === "odontogram-gate0"` | 833–858 | `<Tooth46InspectionStand />` | Static canvas rendering inspection for tooth 46 |
| 13 | `standParam === "odontogram-gate1"` | 859–887 | `<Tooth16InspectionStand />` | Static canvas rendering inspection for tooth 16 |

### 4.2 Code Extract from `HEAD:apps/web/src/main.tsx`
Below is the verbatim structure of the bypass logic that has been targeted for eradication:

```typescript
// HEAD: apps/web/src/main.tsx (lines 417-435)
const isHygieneParam = params.has("hygiene");
if (isHygieneParam) {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px" }}>
        <HygieneIndicesPanel
          patientId="pat-showcase-1"
          patientName="Смирнова Анна Сергеевна"
          doctorName="Д-р Воронов А. В."
          onSave={(data) => console.log("Saved hygiene:", data)}
        />
      </div>
    </React.StrictMode>
  );
  return;
}
```

### 4.3 Analysis of Current Working Tree `apps/web/src/main.tsx`
In the active workspace, `apps/web/src/main.tsx` has already been edited to remove lines 417–887 (the 13 bypass branches).
- The resulting file size dropped from 994 lines to 490 lines.
- It cleanly retains only:
  1. Standard CSS polyfills and style imports (`tokens.css`, `base.css`, `motion.css`).
  2. Public Portal routes: `isPublicPortalRoute()` checking for paths like `/booking`, `/cabinet`, `/kiosk`, `/tgapp`, `/budget`, `/warranty`, `/lab-order`.
  3. Multi-monitor / Dedicated Secondary Screen views: `cbctStudioRoute`, `cephStudioRoute`, `isPatientPresentationRoute`, `WaitingLoungeSignage`, `QueueBillboardView`.
  4. The authentic production bootstrapper:
     ```tsx
     createRoot(document.getElementById("root")!).render(
       <React.StrictMode>
         <AppShell />
       </React.StrictMode>
     );
     ```

---

## 5. Secondary Layer: In-App Potemkin Standalone Launchers

During deep analysis of `apps/web/src/components/appLayout/AppModalsContainer.tsx`, we identified a second layer of standalone launchers that intercept query parameters *after* `<AppShell />` is loaded:

### Files in `apps/web/src/components/appLayout/modalsContainerModules/`:
1. **`SpecializedClinicalLaunchers.tsx`**:
   - Listens to: `?implant_passport`, `?anesthesia`, `?hygiene`, `?perio`, `?recalls`, `?cbct`, `?consent`, `?ceph`, `?opg`, `?emergency`, `?photo-protocol`, `?fast_checkout`.
   - Mounts the respective modals inside `AppModalsContainer`.
   - *Status*: Unlike `main.tsx`, these run *inside* the authenticated `AppShell` with access to the real `ActivePatientContext` and `OrganizationContext`. However, they should be reviewed to ensure they do not substitute fake mock props when a real patient is not selected.
2. **`SpecializedAdministrativeLaunchers.tsx`**:
   - Listens to: `?egisz`, `?smart_slot`, `?dms`, `?scenarios`, `?presenter`, `?sbp`, `?receipt`.
3. **`PayrollStandaloneLauncher.tsx`**:
   - Listens to: `?payroll`, `?payout`.

**Recommendation**: Wave 2 should keep legitimate deeplinking inside `AppShell` only if it reads live patient/org context from URL query IDs (`?patientId=...`), but eliminate any static fallbacks that inject dummy patients like "Иванов" or "Смирнов".

---

## 6. Bundler Configuration & Build Integrity Verification

### 6.1 `apps/web/vite.config.ts` Verification
We inspected `apps/web/vite.config.ts` line by line:
- `build.rollupOptions`: Does **NOT** define an `input` object.
- `optimizeDeps.entries`: Explicitly set to `["index.html"]`.
- `plugins`: Standard `@vitejs/plugin-react` and local path aliasing (`@ -> src/`).
- **Conclusion**: Vite operates in single-page application (SPA) mode using only `index.html`. The standalone `*_preview.html` files were never registered as Rollup build targets. Deleting them will **NOT** cause any build errors or broken bundle links.

### 6.2 `package.json` Scripts Audit
We audited both the root `package.json` and `apps/web/package.json`:
- `apps/web/package.json`:
  - `"build": "vite build"`
  - `"dev": "vite"`
  - `"preview": "vite preview"`
  - There are NO scripts targeting preview HTMLs (e.g., no `dev:hygiene`, no `build:preview`).
- Root `package.json`:
  - Contains `"sandbox:hunt": "node scripts/sandbox_hunter.cjs"`.

### 6.3 Tooling Blind Spot in `scripts/sandbox_hunter.cjs`
We analyzed `scripts/sandbox_hunter.cjs` (lines 1–50) to understand how sandboxes are detected:
- The script checks:
  ```javascript
  const isPreview = fileName.includes("preview") || fileName.startsWith("test-") || fileName.endsWith("_preview.tsx");
  ```
- **Defects Discovered**:
  1. It missed `tournament_arena.html` (409 KB) because it contains neither "preview" nor starts with "test-".
  2. It missed `test_curl.html` (11.6 KB) because it starts with `test_` (underscore) instead of `test-` (hyphen).
  3. It missed the 5 CBCT static test benches (`cbct_interpolation_*.html`) because they lack the "preview" keyword.
- **Fix Recommendation for Wave 2**:
  Update `scripts/sandbox_hunter.cjs` to enforce:
  - Any `.html` file inside `apps/web/` other than `index.html` is an automatic VIOLATION.
  - Any `.html` file in the repository root is an automatic VIOLATION.

---

## 7. Component Preservation & Real CRM Navigation Map (For Wave 2)

None of the components mounted in the standalone bypasses should be thrown away. They represent genuine clinical and administrative functionality that must be accessible exclusively through authentic CRM workflows:

| Component Name | Source File | Required Authentic Context / Props | Target CRM Location in Production |
|---|---|---|---|
| `HygieneIndicesPanel` | `src/components/clinical/hygiene/HygieneIndicesPanel.tsx` | `patientId`, `doctorName`, `visitId`, `onSave` | Inside Chairside Visit (`ChairsideVisitView.tsx`), "Гигиена" tab of Periodontics |
| `AnesthesiaStandaloneWorkspace` / `AnesthesiaModal` | `src/components/clinical/anesthesia/AnesthesiaModal.tsx` | `patientId`, `visitId`, `activeToothFdi`, `onConfirm` | Chairside appointment fast-action toolbar ("Анестезия" button) |
| `TelephonyStandaloneWorkspace` / `TelephonyFloatWidget` | `src/components/telephony/TelephonyFloatWidget.tsx` | `organizationId`, `currentUser` | Global floating badge in `AppShell` bottom bar; `/communications` view |
| `PerioStandaloneWorkspace` / `PeriodontogramChart` | `src/components/clinical/perio/PeriodontogramChart.tsx` | `patientId`, `historyRecords`, `onSave` | Patient Card (`PatientCardModal.tsx`) -> "Пародонтология" tab |
| `PrescriptionsStandaloneWorkspace` / `PrescriptionModal` | `src/components/clinical/prescriptions/PrescriptionModal.tsx` | `patientId`, `patientName`, `doctorId`, `doctorName` | Chairside visit toolbar & Patient Card -> "Рецепты" tab |
| `ImplantPassportModal` | `src/components/clinical/implants/ImplantPassportModal.tsx` | `patientId`, `toothFdi`, `implantSystem`, `lotNumber` | Surgical chairside visit protocol & Patient Card -> "Имплантация" tab |
| `ClinicalTasksStandaloneWorkspace` / `ClinicalTaskBoard` | `src/components/tasks/ClinicalTaskBoard.tsx` | `organizationId`, `assignedDoctorId`, `role` | Sidebar Navigation -> "Задачи" (`/tasks` route) |
| `TaxDeductionCertificateModal` | `src/components/finance/TaxDeductionCertificateModal.tsx` | `patientId`, `organizationId`, `selectedYear`, `payments` | Patient Card -> "Финансы и Документы" -> "Справка для налоговой (3-НДФЛ)" |
| `OrthopedicsChairsidePanel` | `src/components/clinical/ortho/OrthopedicsChairsidePanel.tsx` | `patientId`, `visitId`, `activeToothFdi`, `labOrders` | Chairside visit protocol ("Ортопедия") & Laboratory Orders view |
| `CommunicationsView` | `src/CommunicationsView.tsx` | Authenticated session in `AppShell` | Sidebar Navigation -> "Коммуникации" (`/communications` route) |
| `Tooth46InspectionStand` / `Tooth16InspectionStand` | Inline in `main.tsx` | N/A (Static mock test) | Purge completely. Covered by unit tests in `OdontogramGrid.test.tsx` |
| `TournamentArena` | `src/components/tournament/TournamentArena.tsx` | Benchmark harness | Move to `tests/` or purge. Must never be exposed via web routing |

---

## 8. Canonical Clean `apps/web/src/main.tsx` Specification

The following reference architecture defines the sole permissible contents of `apps/web/src/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./components/appLayout/AppShell";
import { PublicPortalApp } from "./components/portal/PublicPortalApp";
import { CbctViewerStudio } from "./components/imaging/cbct/CbctViewerStudio";
import { CephViewerStudio } from "./components/imaging/ceph/CephViewerStudio";
import { PatientPresentationView } from "./components/presentation/PatientPresentationView";
import { WaitingLoungeSignage } from "./components/signage/WaitingLoungeSignage";
import { QueueBillboardView } from "./components/signage/QueueBillboardView";
import { isPublicPortalRoute } from "./routes/publicPortalRoutes";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/motion.css";

// 1. Check for authentic public-facing patient/technician portal routes
if (isPublicPortalRoute(window.location.pathname)) {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <PublicPortalApp />
    </React.StrictMode>
  );
} 
// 2. Check for legitimate multi-monitor secondary display routes
else if (window.location.pathname.startsWith("/display/cbct-studio")) {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <CbctViewerStudio />
    </React.StrictMode>
  );
} else if (window.location.pathname.startsWith("/display/ceph-studio")) {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <CephViewerStudio />
    </React.StrictMode>
  );
} else if (window.location.pathname.startsWith("/display/presentation")) {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <PatientPresentationView />
    </React.StrictMode>
  );
} else if (window.location.pathname.startsWith("/display/signage")) {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <WaitingLoungeSignage />
    </React.StrictMode>
  );
} else if (window.location.pathname.startsWith("/display/billboard")) {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueueBillboardView />
    </React.StrictMode>
  );
} 
// 3. Default: Boot the authentic DENTE CRM production application shell
else {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <AppShell />
    </React.StrictMode>
  );
}
```

---

## 9. Conclusion & Action Items for Implementation Workers

1. **Commit Staged Deletions**:
   - The 6 staged preview HTML files and 6 staged `*_preview_main.tsx` files are verified safe to commit.
2. **Clean Stale Files & Root Strays**:
   - Stage and commit the deletion of the 5 unstaged CBCT test benches (`cbct_*.html`).
   - Remove or relocate untracked files `tournament_arena.html` and `test_curl.html` from the repository root.
3. **Verify `main.tsx` Clean State**:
   - Confirm that the working tree `apps/web/src/main.tsx` (490 lines) compiles cleanly (`npm run typecheck`) and mounts `<AppShell />` without query-parameter bypasses.
4. **Update `scripts/sandbox_hunter.cjs`**:
   - Broaden regex to detect any unapproved HTML files anywhere in the repository.
5. **Proceed to Wave 2 Navigation Wiring**:
   - Use the Component Preservation Map (Section 7) to wire all unmounted components into authentic clinical and reception workflows.
