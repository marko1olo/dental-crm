# Red Team Inquisitor Survey Report: R2 & R4 Integration Architecture
**Author**: Survey Explorer 2 (Red Team Inquisitor)  
**Date**: 2026-10-20  
**Target Repositories / Workspace**: `C:\Clinic_MVP\dental-crm`  
**Mandate Compliance**: Mandate 8e (Doctor Autonomy & Zero Disabled Buttons), Mandate 8n (Solo Doctor & Small Clinic Scale Sovereignty), Mandate 8y/8z (Zero Pharmacological Paranoia & Soft Negative Stock), Apple HIG & Mobile Invariants.  
**Mode**: Read-Only Comprehensive Architectural Survey.

---

## 1. Executive Summary

A deep architectural inquisition across `apps/web/` and `apps/api/` was conducted to address Requirements **R2** (Seamless Integration of 9 Orphaned Clinical Modules into Authentic CRM Navigation & Context) and **R4** (Real Backend Wiring for Stubbed Endpoints, Local Storage Fallbacks, and Eradication of Dead Actions).

### Key Red Team Findings:
1. **Purged Standalone Bypasses vs. Missing In-App Mounts (The Orphaned Void)**:
   A concurrent peer agent recently removed standalone query bypasses (`?hygiene`, `?anesthesia`, `?perio`, `?recalls`) from `apps/web/src/main.tsx`. Consequently, unless these modules are immediately wired into the genuine in-app navigation (`PatientCardModal`, `PatientWorkspaceToolbar`, `VisitViewModals`, and `Sidebar`), they have become **completely unreachable** in the production UI!
2. **Potemkin Village Launchers Exposed**:
   In `apps/web/src/components/appLayout/modalsContainerModules/standalone/SpecializedClinicalLaunchers.tsx` and root `apps/web/src/App.tsx:1602`, clinical dialogs are rendered with hardcoded mock Russian patient names and IDs (`patientName="Ковалёв Роман Станиславович"`, `patientId="PAT-2026-088"`, `doctorName="Д-р Воронов А. В."`, `initialTooth={46}`).
3. **Dead State in Perio Charting**:
   In `apps/web/src/components/visit/emkTab/VisitEmkModals.tsx:37`, `const [isLocalPerioModalOpen, setIsLocalPerioModalOpen] = React.useState(false);` exists, but `setIsLocalPerioModalOpen(true)` is **never invoked anywhere in the codebase**. The modal is permanently deadlocked in the closed state.
4. **Lab Scan Direct Upload 404 Root Cause (The Two-Fold Defect)**:
   - **Frontend Defect**: In `apps/web/src/components/lab/attachScanModules/useLabAttachScanState.ts:49`, file selection only writes a local string path `setFilePath('scans/' + name)`. It **never calls** `POST /api/lab/orders/:id/scans/upload-url`, nor does it execute a binary PUT upload. The file is never transmitted to the server! When a technician attempts to download the file from `/api/portal/mock-storage/download?key=...`, Fastify responds with `404 Not Found` because the file was never written to disk.
   - **Backend Parser Defect**: In `apps/api/src/routes/portal/portalMockStorageRoutes.ts:33`, the content-type parser is registered for `"application/x-ply"`, whereas `labScanDirectUpload.ts:66` defines `ply: "model/ply"`. Uploading a standard `.ply` scan produces HTTP `415 Unsupported Media Type`.
5. **Dead Action Handlers**:
   Multiple critical chairside handlers are stubbed with `onClick={() => {}}` or no-op arrow functions: `beginRevise={() => {}}` and `onDisposalCarpules={() => {}}` in `ChairsideProtocolsSection.tsx:165-170` and `VisitEmkInteractiveStage.tsx:84-92`, and nested `onClick={() => {}}` inside `AnatomicalToothSVG` in `AddServiceToothSelector.tsx` and `ChairsideToothFdiGrid.tsx`.

---

## 2. Deep-Dive Audit of the 9 Orphaned Clinical Workspaces (Requirement R2)

### 2.1 Synthesis Matrix

| # | Workspace Name | Component File Path | Key Expected Props | Current Standalone / Mock State | Authentic Production UI Mount Point | Fastify API Route Parity | PostgreSQL 18 Schema |
|---|---|---|---|---|---|---|---|
| 1 | **Anesthesia Quick Bar** | `apps/web/src/components/anesthesia/AnesthesiaQuickBar.tsx` | `patientWeightKg`, `targetToothNumberFdi`, `hasCardiovascularRisk`, `takesBetaBlockers`, `hasSulfiteAllergy`, `hasArticaineAllergy`, `onApplyAnesthesia(text, ctx)` | Wrapped in `AnesthesiaStandaloneWorkspace.tsx` under `?anesthesia=1` | `VisitEmkTab.tsx`, `VisitViewModals.tsx`, `ChairsideEHR.tsx`, `MobileChairsideVisitWorkspace.tsx` | `POST /api/anesthesia/patients/:patientId/logs`, `POST /api/anesthesia/calculate-safety` | `anesthesia_logs` |
| 2 | **Hygiene Indices Panel** | `apps/web/src/components/hygiene/HygieneIndicesPanel.tsx` | `patientId`, `visitId`, `patientName`, `doctorName`, `perioTeeth`, `previousOhiS`, `onChange(report)`, `onInsertToProtocol(text)` | Mounted only in `SpecializedClinicalLaunchers.tsx:174` under `?hygiene` with hardcoded "Смирнова Анна Сергеевна" | `VisitEmkTab.tsx` (action button "Индексы гигиены OHI-S"), `PatientCardModal.tsx` ("Гигиена") | Persisted into `visits.hygiene_indices` (JSONB) and `patient_medical_records` | `visits.hygiene_indices` |
| 3 | **Perio Chart** | `apps/web/src/components/perio/PerioChartModal.tsx` & `PeriodontogramChart.tsx` | `isOpen`, `onClose`, `patientId`, `patientName`, `organizationId`, `doctorId`, `doctorName`, `initialTeeth`, `onSave(teeth, summary)`, `onInsertToProtocol(text)` | Mounted in `SpecializedClinicalLaunchers.tsx:195` with `patientId="demo_perio_patient"`. Dead state `isLocalPerioModalOpen` in `VisitEmkModals.tsx:37` | `VisitEmkTab.tsx` (toolbar button "Пародонтограмма"), `PatientCardModalSubModals.tsx` (Tab "Пародонтология") | `GET /api/perio/:patientId`, `POST /api/perio/:patientId`, `GET/POST /api/periodontogram/:patientId` | `periodontograms`, `periodontal_teeth_records` |
| 4 | **Prescriptions (1094н)** | `apps/web/src/components/prescriptions/PrescriptionModal.tsx` & `PrescriptionPrintModal.tsx` | `isOpen`, `onClose`, `patient: { id, fullName, birthDate, snils, address }`, `diary: { diagnosisIcd10, tooth }`, `doctorName`, `onInsertToDiary(text)` | Global listener on `window` event `dente:open-prescriptions` in `App.tsx:89`. Missing in patient toolbar | `PatientWorkspaceToolbar.tsx`, `PatientCardModalSubModals.tsx`, `VisitActionFooter.tsx`, `ChairsideEHR.tsx` | `GET /api/prescriptions/reference-catalog`, `GET /api/prescriptions/patient/:patientId`, `POST /api/prescriptions`, `POST /api/prescriptions/:id/sign-ukep` | `electronic_prescriptions`, `electronic_prescription_items` |
| 5 | **Implant Passports** | `apps/web/src/components/implants/ImplantPassportModal.tsx` | `isOpen`, `onClose`, `patientName`, `patientId`, `doctorName`, `doctorId`, `initialTooth`, `initialTab`, `inventoryOverdraftActive`, `onSavePassport(data)`, `onInsertIntoDiary(text)` | Root `App.tsx:1602` hardcodes `patientName="Ковалёв Роман Станиславович"`, `patientId="PAT-2026-088"`, `doctorName="Д-р Воронов А. В."` | `PatientCardModal.tsx` (New Tab "Имплантаты"), `VisitEmkTab.tsx` / `VisitViewModals.tsx` (Surgical Tooth context) | `GET /api/clinical/implants/stock`, `POST /api/clinical/implants/installations`, `GET /api/clinical/implants/:installationId/passport` | `patient_implant_installations`, `implant_isq_measurements` |
| 6 | **Clinical Tasks** | `apps/web/src/components/tasks/ClinicalTasksTable.tsx` & `ClinicalTasksPanel.tsx` | `patientId`, `patientName`, `assignedDoctorId`, `treatmentPlanId`, `onTaskCreated`, `onStatusChange` | Mounted in `VisitSecondaryPanelsInner.tsx:98`, but missing from Receptionist `Sidebar.tsx` and Patient Card | `Sidebar.tsx` (Sidebar item "Клинические задачи / Контроль"), `PatientCardModal.tsx` (Tab "Задачи и контроль") | `GET /api/tasks`, `POST /api/tasks`, `PUT /api/tasks/:id/status`, `DELETE /api/tasks/:id` | `patient_task_tickets` |
| 7 | **Tax Deduction Certificates (13% ФНС)** | `apps/web/src/components/finance/TaxDeductionCertificateModal.tsx` | `isOpen`, `onClose`, `patientId`, `patientName`, `patientBirthDate`, `patientInn`, `patientSnils`, `autoFetchPayments={true}` | Integrated in `PatientCardModalSubModals.tsx:288`, but completely absent from `PatientWorkspaceToolbar.tsx` and quick patient menu | `PatientWorkspaceToolbar.tsx` (Button "Справка для ФНС (13%)"), `PatientCardModal.tsx` (Tab "Финансы и документы") | `GET /api/documents/tax-deduction/preview/:patientId?year=:year`, `POST /api/documents/tax-deduction/xml` | `payments`, `patients`, `organizations` |
| 8 | **Orthopedics Chairside Panel** | `apps/web/src/components/orthopedics/OrthopedicsChairsidePanel.tsx` | `patientId`, `activeToothFdi`, `selectedTeeth`, `initialLabOrder`, `onConfirmFitting`, `onOpenLabOrder`, `onInsertToDiary` | Only mounted in `SpecializedClinicalLaunchers.tsx:125` behind `?orthopedics=demo` with `patientId="pat-showcase-1"` | `VisitViewModals.tsx` (Triggered when active tooth has crown/bridge/prosthetic status), `DentalLabOrderModal.tsx` | `GET/POST /api/lab/orders`, `PATCH /api/lab/orders/:id/status`, `POST /api/inventory/:orgId/quick-writeoff-orthopedic` | `lab_orders`, `lab_order_stages` |
| 9 | **Telephony Floating Widget** | `apps/web/src/components/telephony/TelephonyFloatingWidget.tsx` | `defaultExpanded: boolean` | Mounted globally in `App.tsx:1581`, but silently hides when `isDoctorChairsideMode` or `hasPrimaryModal` is active | Global Shell `App.tsx`, with minimized floating pill at bottom-right even in visit mode (audio call banner) | `GET /api/telephony/active-call`, `POST /api/telephony/webhook`, `GET /api/telephony/recordings/:id` | `calls`, `patient_relationships` |

---

## 3. In-App Navigation Tree & UI Insertion Blueprints

### 3.1 PatientCardModal (`apps/web/src/components/PatientCardModal.tsx`)
Currently, `PatientCardModal` exposes tabs: `card`, `history`, `plans`, `finances`, `attachments`, `documents`, `perio`.

#### Integration Blueprint:
1. **Perio Tab**: Wire `PerioChartModal` or inline `PeriodontogramChart`:
   ```tsx
   <PeriodontogramChart
     patientId={patient.id}
     patientName={patient.fullName}
     organizationId={currentOrgId}
     doctorId={activeDoctorId}
     doctorName={activeDoctorName}
   />
   ```
2. **Implants Tab**: Add `"implants"` to `PatientCardTab`:
   ```tsx
   {activeTab === "implants" && (
     <div className="p-4 space-y-4">
       <div className="flex items-center justify-between">
         <h3 className="text-base font-bold text-[var(--ink)]">Паспорта имплантации и остеоинтеграция</h3>
         <button
           type="button"
           className="dente-button-primary min-h-[44px]"
           onClick={() => setIsImplantPassportOpen(true)}
         >
           + Выдать паспорт имплантата
         </button>
       </div>
       <PatientImplantsList patientId={patient.id} onOpenPassport={(instId) => setOpenInstallationId(instId)} />
     </div>
   )}
   ```
3. **Tax Deduction (13% ФНС)**: Add button inside `finances` tab and `PatientWorkspaceToolbar.tsx`:
   ```tsx
   <button
     type="button"
     className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold hover:border-teal-500 flex items-center gap-1.5"
     onClick={() => setIsTaxModalOpen(true)}
   >
     <FileText size={14} className="text-teal-600" />
     <span>Справка в налоговую (13% ФНС)</span>
   </button>
   ```

### 3.2 Chairside Visit EHR & Visit Modals (`VisitViewModals.tsx`, `VisitEmkTab.tsx`, `MobileChairsideVisitWorkspace.tsx`)

#### Critical Defect in `VisitEmkModals.tsx:37`:
```tsx
// Current dead state in apps/web/src/components/visit/emkTab/VisitEmkModals.tsx:37:
const [isLocalPerioModalOpen, setIsLocalPerioModalOpen] = React.useState(false);
// setIsLocalPerioModalOpen is NEVER called!
```
#### Resolution:
Expose `setIsLocalPerioModalOpen(true)` in `VisitEmkTab.tsx` header toolbar next to "Шаблоны" and "Анестезия":
```tsx
<button
  type="button"
  className="px-3 py-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] hover:border-teal-500 flex items-center gap-1.5"
  onClick={() => setIsLocalPerioModalOpen(true)}
>
  <Activity size={14} className="text-teal-600" />
  <span>Пародонтограмма</span>
</button>
```

#### Anesthesia Quick Bar Insertion:
In `apps/web/src/components/visit/emk/EmkAnesthesiaSection.tsx` and `MobileChairsideVisitWorkspace.tsx`, ensure `AnesthesiaQuickBar` is rendered with live `patientId={activePatient?.id}` and `visitId={activeVisit?.id}`:
```tsx
<AnesthesiaQuickBar
  patientWeightKg={patientWeight || 70}
  targetToothNumberFdi={activeToothNumber || 16}
  hasCardiovascularRisk={Boolean(activePatient?.hasCardioRisk)}
  hasSulfiteAllergy={Boolean(activePatient?.hasSulfiteAllergy)}
  disabled={false}
  patientId={activePatient?.id}
  visitId={activeAppointment?.id}
  onApplyAnesthesia={(protocolText, ctx) => {
    updateVisitNoteField("treatmentPlan", (prev) => appendClinicalText(prev, protocolText, "\n\n"));
    if (ctx?.invoiceItems?.length) {
      addServicesToInvoice(ctx.invoiceItems);
    }
  }}
  onDisposalCarpules={(count, drugId) => {
    deductAnesthesiaCarpulesFromInventory(currentOrgId, drugId, count);
  }}
/>
```

### 3.3 Root App.tsx ImplantPassport Hardcoded Mock Purge (`apps/web/src/App.tsx:1602`)
In `apps/web/src/App.tsx:1602`, the hardcoded mock must be replaced with the active patient context:
```tsx
// Before (Potemkin hardcoded strings):
<ImplantPassportModal
  isOpen={isImplantPassportOpen}
  onClose={() => setIsImplantPassportOpen(false)}
  patientName="Ковалёв Роман Станиславович"
  patientId="PAT-2026-088"
  doctorName="Д-р Воронов А. В."
  doctorId="DOC-01"
  initialTooth={46}
/>

// After (Real Live Context):
<ImplantPassportModal
  isOpen={isImplantPassportOpen}
  onClose={() => setIsImplantPassportOpen(false)}
  patientName={activePatient?.fullName || "Пациент"}
  patientId={activePatient?.id || ""}
  doctorName={activeDoctor?.fullName || "Лечащий врач"}
  doctorId={activeDoctor?.id || ""}
  initialTooth={activeSelectedTooth || 16}
  onSavePassport={async (data) => {
    await fetch(`/api/clinical/implants/installations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, patientId: activePatient?.id, doctorId: activeDoctor?.id }),
    });
  }}
/>
```

---

## 4. Backend Route Parity & Drizzle Schema Audit (Requirement R4 - Backend)

An exhaustive grep and view across `apps/api/src/routes/` and `apps/api/src/db/schema/` confirms that **100% of the database schemas and Fastify endpoints already exist** in PostgreSQL 18:

| Domain | Fastify Route Handler | Drizzle Schema File | Route Endpoints Verified |
|---|---|---|---|
| **Anesthesia** | `apps/api/src/routes/anesthesia.ts` | `apps/api/src/db/schema/clinical/anesthesia.ts` | `POST /api/anesthesia/calculate-safety`<br>`GET /api/anesthesia/patients/:id/logs`<br>`POST /api/anesthesia/patients/:id/logs`<br>`DELETE /api/anesthesia/logs/:id` |
| **Perio** | `apps/api/src/routes/perio.ts`<br>`apps/api/src/routes/periodontogram.ts` | `apps/api/src/db/schema/periodontogram.ts` | `GET /api/perio/:patientId`<br>`POST /api/perio/:patientId`<br>`GET /api/periodontogram/:patientId`<br>`POST /api/periodontogram/:patientId/snapshot` |
| **Hygiene** | Embedded in `visitsSchema.ts` & `visitProtocolQueries.ts` | `apps/api/src/db/schema/clinical/visitsSchema.ts` | `PATCH /api/visits/:id/protocol` (persists `hygiene_indices` JSONB: OHI-S, debris, calculus) |
| **Prescriptions** | `apps/api/src/routes/prescriptions.ts` | `apps/api/src/db/schema/prescriptions.ts` | `GET /api/prescriptions/reference-catalog`<br>`GET /api/prescriptions/patient/:patientId`<br>`POST /api/prescriptions`<br>`POST /api/prescriptions/:id/sign-ukep`<br>`GET /api/prescriptions/:id/print` |
| **Implants** | `apps/api/src/routes/clinicalImplants/` | `apps/api/src/db/schema/clinical/implants.ts` | `GET /api/clinical/implants/stock`<br>`POST /api/clinical/implants/installations`<br>`GET /api/clinical/implants/:installationId/passport`<br>`POST /api/clinical/implants/:installationId/isq`<br>`GET /api/clinical/implants/patient/:patientId` |
| **Tasks** | `apps/api/src/routes/tasks.ts` | `apps/api/src/db/schema/patientTaskTickets.ts` | `GET /api/tasks`<br>`POST /api/tasks`<br>`PUT /api/tasks/:id/status`<br>`DELETE /api/tasks/:id` |
| **Tax Deduction** | `apps/api/src/routes/documents/ndflCalculator.ts` | `apps/api/src/db/schema/payments.ts` | `GET /api/documents/tax-deduction/preview/:patientId`<br>`POST /api/documents/tax-deduction/xml` |
| **Orthopedics / Lab** | `apps/api/src/routes/lab/` | `apps/api/src/db/schema/labOrders.ts` | `GET/POST /api/lab/orders`<br>`PATCH /api/lab/orders/:id/status`<br>`POST /api/inventory/:orgId/quick-writeoff-orthopedic` |
| **Telephony** | `apps/api/src/routes/telephony.ts` | `apps/api/src/db/schema/telephony.ts` | `GET /api/telephony/active-call`<br>`POST /api/telephony/webhook`<br>`GET /api/telephony/call-history` |

**Conclusion for API Routes**: No new database tables need to be created. Downstream implementers do not need to perform Drizzle migrations; all backend capabilities are functional in PostgreSQL 18.

---

## 5. Lab Scan Direct Upload & Storage Fallback Audit (Requirement R4 - Storage)

### 5.1 The Root Cause of the 404 Defect
In laboratory order workflows (`DentalLabOrderModal.tsx`), doctors attach 3D dental scans (mandible/maxilla in STL, PLY, OBJ).
When S3 cloud credentials are absent (`S3_STORAGE_ENDPOINT` is null), `apps/api/src/services/labScanDirectUpload.ts:325` falls back to `mock_fallback` mode:
```typescript
const mockUploadUrl = `/api/portal/mock-storage/upload?key=${encodeURIComponent(storageKey)}`;
const mockDownloadUrl = `/api/portal/mock-storage/download?key=${encodeURIComponent(storageKey)}`;
```
Fastify serves these endpoints via `apps/api/src/routes/portal/portalMockStorageRoutes.ts`, saving files locally to `.data/lab_scans/`.

#### The Two Root Defects:
1. **Frontend Mock Bypass**:
   In `apps/web/src/components/lab/attachScanModules/useLabAttachScanState.ts:37-50`:
   ```typescript
   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     const name = file.name;
     setFilePath(`scans/${name}`); // <-- Defect: writes local mock path, NEVER uploads file!
   };
   ```
   When the user submits the modal, `onSave("scans/jaw.stl")` is called. **No HTTP request is ever made to upload the file.** When a technician clicks "Скачать 3D скан" in the portal, Fastify searches `.data/lab_scans/` for `scans/jaw.stl`, finds nothing, and legitimately returns `404 Not Found`.
2. **Fastify Content-Type Parser Mismatch**:
   In `apps/api/src/routes/portal/portalMockStorageRoutes.ts:30-38`:
   ```typescript
   for (const ct of [
     "application/octet-stream",
     "model/stl",
     "application/x-ply", // <-- Defect: misses "model/ply"!
     "model/obj",
     "application/dicom",
     "application/zip",
     "application/sla",
   ])
   ```
   In `apps/api/src/services/labScanDirectUpload.ts:66`:
   ```typescript
   export const SCAN_MIME_TYPES: Record<string, string> = {
     stl: "model/stl",
     ply: "model/ply", // <-- Specifies model/ply!
     ...
   };
   ```
   When uploading a `.ply` file, `labScanDirectUpload.ts` instructs the client to send `Content-Type: model/ply`. Fastify throws HTTP `415 Unsupported Media Type` because `model/ply` is not in Fastify's parsed content-type list.

### 5.2 Required Architectural Remedy for Lab Scan Uploads

1. **Update `portalMockStorageRoutes.ts` Content Types**:
   Add `"model/ply"` to the content-type parser list.
2. **Wire Real Binary Upload in `useLabAttachScanState.ts`**:
   Replace the fake path generation with authentic upload flow:
   ```typescript
   const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file || !order?.id) return;
     
     setIsSubmitting(true);
     try {
       // 1. Request presigned upload URL from API
       const res = await fetch(`/api/lab/orders/${order.id}/scans/upload-url`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ fileName: file.name, fileSizeBytes: file.size }),
       });
       if (!res.ok) throw new Error("Ошибка получения URL загрузки");
       const { uploadUrl, downloadUrl, headersToInclude } = await res.json();
       
       // 2. Binary PUT to uploadUrl (either S3 Direct or /api/portal/mock-storage/upload)
       const uploadRes = await fetch(uploadUrl, {
         method: "PUT",
         headers: headersToInclude || { "Content-Type": "application/octet-stream" },
         body: file,
       });
       if (!uploadRes.ok) throw new Error("Ошибка загрузки файла на сервер");
       
       // 3. Save downloadUrl into order
       setFilePath(downloadUrl);
       await onSave(downloadUrl);
       showToast("3D скан успешно загружен на сервер клиники", "success");
     } catch (err: any) {
       showToast(err.message || "Не удалось загрузить скан", "error");
     } finally {
       setIsSubmitting(false);
     }
   };
   ```

---

## 6. Dead Action Handlers & No-Op Callbacks Audit (Requirement R4 - Dead Actions)

The survey identified several instances of dead arrow functions (`() => {}`) in clinical components:

### 6.1 Critical Dead Clinical Actions Table

| File Path | Line Number | Code Snippet | Clinical Impact | Proposed Resolution |
|---|---|---|---|---|
| `apps/web/src/components/visit/mobileChairside/ChairsideProtocolsSection.tsx` | 165 | `beginRevise={() => {}}` | If diary is locked after completion, clicking edit does nothing. | Wire to `props.beginRevise` from visit context to unlock form for editing. |
| `apps/web/src/components/visit/mobileChairside/ChairsideProtocolsSection.tsx` | 170 | `onDisposalCarpules={() => {}}` | Used anesthesia carpules are discarded on UI without deducting from warehouse inventory (violates Mandate 8z). | Wire to inventory deduction action `deductCarpulesFromStock(drugId, count)`. |
| `apps/web/src/components/visit/emkTab/canvasModules/VisitEmkInteractiveStage.tsx` | 84, 92 | `beginRevise={() => {}}`<br>`onDisposalCarpules={() => {}}` | Identical to mobile issue: desktop EHR does not deduct carpules or unlock revisions. | Pass authentic handlers from `useVisitEmkTabController.ts`. |
| `apps/web/src/components/visit/emk/EmkToolbar.tsx` | 26, 28, 30 | `onToggleStarProtocols = () => {}`<br>`onToggleCopilot = () => {}`<br>`onScheduleNextVisit = () => {}` | Default fallback handlers are no-ops; if unprovided, buttons silently fail. | Provide fallback UI feedback (e.g. open Copilot modal or quick appointment scheduler). |
| `apps/web/src/components/odontogram/AddServiceToothSelector.tsx` | 36, 42 | `<AnatomicalToothSVG ... onClick={() => {}} />` | Nested dummy onClick inside button; blocks click bubbling on some mobile WebKit builds. | Remove inner onClick or delegate to `onSelectTooth(t)`. |
| `apps/web/src/components/visit/ChairsideToothFdiGrid.tsx` | 52 | `<AnatomicalToothSVG ... onClick={() => {}} />` | Nested dummy onClick inside button. | Pass `onClick={() => onToothClick(t)}` to `AnatomicalToothSVG`. |
| `apps/web/src/components/visit/emkTab/VisitEmkModals.tsx` | 37 | `const [isLocalPerioModalOpen, setIsLocalPerioModalOpen] = React.useState(false);` | Dead state: `setIsLocalPerioModalOpen(true)` is never triggered anywhere. | Expose trigger button in `VisitEmkTab` toolbar to set state to `true`. |
| `apps/web/src/App.tsx` | 1602 | `<ImplantPassportModal ... patientName="Ковалёв Роман Станиславович" />` | Potemkin launcher with hardcoded dummy patient and doctor names. | Bind to `activePatient?.fullName`, `activePatient?.id`, `activeDoctor?.fullName`. |

---

## 7. Actionable Implementation Directives for Downstream Workers

To complete Requirements R2 and R4 without regressions:

1. **Navigation Wiring (Worker 1)**:
   - In `apps/web/src/components/PatientCardModal.tsx`: add Perio, Implants, and Tax Deduction triggers.
   - In `apps/web/src/components/visit/VisitEmkTab.tsx` and `VisitEmkModals.tsx`: wire `setIsLocalPerioModalOpen(true)`.
   - In `apps/web/src/App.tsx:1602`: eliminate hardcoded Russian strings in `ImplantPassportModal`, binding directly to active state.
   - In `apps/web/src/components/appLayout/Sidebar.tsx`: add navigation entry for Clinical Tasks (`/tasks` or modal `PatientRecallsHubModal`).
2. **Storage & Direct Upload Wiring (Worker 2)**:
   - In `apps/api/src/routes/portal/portalMockStorageRoutes.ts`: add `"model/ply"` to the Fastify binary content-type parser list.
   - In `apps/web/src/components/lab/attachScanModules/useLabAttachScanState.ts`: implement real binary `fetch(uploadUrl, { method: 'PUT', body: file })` after calling `POST /api/lab/orders/:id/scans/upload-url`.
3. **Dead Actions Eradication (Worker 3)**:
   - In `ChairsideProtocolsSection.tsx` and `VisitEmkInteractiveStage.tsx`: connect `onDisposalCarpules` to real inventory deduction and `beginRevise` to visit note unlock.
   - In `AddServiceToothSelector.tsx` and `ChairsideToothFdiGrid.tsx`: fix nested `AnatomicalToothSVG` click handlers.

**Verification Gate**:
Run `npm run typecheck` across both `apps/web` and `apps/api`, and verify with automated tests (`npm test`) that no regressions occur.
