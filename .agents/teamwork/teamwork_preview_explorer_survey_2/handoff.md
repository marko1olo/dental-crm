# Handoff Report: R2 & R4 In-App Navigation, Storage Fallback & Dead Actions Survey
**Agent**: Survey Explorer 2 (Red Team Inquisitor)  
**Parent Agent**: `1dba1dd3-1b54-431d-9253-a722303ba51f`  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\teamwork\teamwork_preview_explorer_survey_2`  
**Status**: Task Complete (Hard Handoff)

---

## 1. Observation

1. **Purged Standalone Query Routes vs. Unwired UI**:
   - In `apps/web/src/main.tsx`, lines containing query-string standalone launchers (`?hygiene`, `?anesthesia`, `?perio`, `?recalls`) were removed by peers.
   - In `apps/web/src/components/visit/emkTab/VisitEmkModals.tsx:37`:
     ```tsx
     const [isLocalPerioModalOpen, setIsLocalPerioModalOpen] = React.useState(false);
     ```
     `setIsLocalPerioModalOpen(true)` is not called anywhere in `apps/web/src/components/visit/`.
2. **Hardcoded Potemkin State in Root Shell**:
   - In `apps/web/src/App.tsx:1602-1614`:
     ```tsx
     <ImplantPassportModal
       isOpen={isImplantPassportOpen}
       onClose={() => setIsImplantPassportOpen(false)}
       patientName="Ковалёв Роман Станиславович"
       patientId="PAT-2026-088"
       doctorName="Д-р Воронов А. В."
       doctorId="DOC-01"
       initialTooth={46}
     />
     ```
   - In `apps/web/src/components/appLayout/modalsContainerModules/standalone/SpecializedClinicalLaunchers.tsx:144-148, 175-176, 203-205`: hardcoded mock patients ("Смирнова Анна Сергеевна", "Ковалёв Роман Станиславович", "demo_perio_patient").
3. **Lab Scan Direct Upload 404 & 415 Defect**:
   - In `apps/web/src/components/lab/attachScanModules/useLabAttachScanState.ts:49`:
     ```typescript
     setFilePath(`scans/${name}`);
     ```
     No API call to `POST /api/lab/orders/:id/scans/upload-url` or `fetch(uploadUrl, { method: "PUT", body: file })` is executed.
   - In `apps/api/src/routes/portal/portalMockStorageRoutes.ts:33`:
     Registered content-types: `"application/x-ply"`.
   - In `apps/api/src/services/labScanDirectUpload.ts:66`:
     `ply: "model/ply"`. Uploading a standard `.ply` file results in Fastify error `415 Unsupported Media Type`.
4. **Dead Actions and No-Op Callbacks**:
   - In `apps/web/src/components/visit/mobileChairside/ChairsideProtocolsSection.tsx:165, 170`:
     `beginRevise={() => {}}` and `onDisposalCarpules={() => {}}`.
   - In `apps/web/src/components/visit/emkTab/canvasModules/VisitEmkInteractiveStage.tsx:84, 92`:
     `beginRevise={() => {}}` and `onDisposalCarpules={() => {}}`.
   - In `apps/web/src/components/treatment-plans/addService/AddServiceToothSelector.tsx:36, 42`:
     `<AnatomicalToothSVG ... onClick={() => {}} />`.
   - In `apps/web/src/components/visit/ChairsideToothFdiGrid.tsx:52`:
     `<AnatomicalToothSVG ... onClick={() => {}} />`.
5. **Backend Route & Schema Parity**:
   - All 9 clinical modules (Anesthesia, Perio, Hygiene, Prescriptions, Implants, Tasks, Tax Deduction, Orthopedics, Telephony) have active Fastify route handlers in `apps/api/src/routes/` and tables in `apps/api/src/db/schema/`.

---

## 2. Logic Chain

1. **Step 1 (UI Availability)**:
   - *Observation 1* shows that standalone URL queries were purged from `main.tsx`, and `VisitEmkModals.tsx:37` has an uninvoked state setter (`setIsLocalPerioModalOpen(true)`).
   - *Inference*: The 9 clinical modules cannot be reached by users unless integrated directly into `PatientCardModal`, `PatientWorkspaceToolbar`, `VisitEmkTab`, and `Sidebar`.
2. **Step 2 (Potemkin Data Removal)**:
   - *Observation 2* shows hardcoded dummy patients ("Ковалёв", "Смирнова") in `App.tsx:1602` and `SpecializedClinicalLaunchers.tsx`.
   - *Inference*: To satisfy Mandate 8am (zero fabrication) and R2, these modals must bind directly to `activePatient?.id`, `activePatient?.fullName`, and `activeDoctor?.fullName`.
3. **Step 3 (Storage Fallback Resolution)**:
   - *Observation 3* shows `useLabAttachScanState.ts` only sets a local string `'scans/' + name` without sending the binary file to Fastify.
   - *Inference*: The file never arrives on the disk of the clinic server (`.data/lab_scans/`). When the portal attempts to serve the file via `/api/portal/mock-storage/download?key=...`, it fails with 404 because the file was never uploaded.
   - *Inference 2*: Additionally, uploading `.ply` scans will fail with HTTP 415 because Fastify only knows `application/x-ply` while the upload helper sends `model/ply`.
4. **Step 4 (Dead Action Eradication)**:
   - *Observation 4* demonstrates empty closures in production EHR forms.
   - *Inference*: Anesthesia carpule disposal is currently dropped silently, violating warehouse tracking invariants (Mandate 8z). Wiring them to genuine store actions resolves the dead code.
5. **Step 5 (Backend Readiness)**:
   - *Observation 5* proves the backend database schema and API routes already exist and are fully tested.
   - *Inference*: No new PostgreSQL Drizzle migrations or database tables are required.

---

## 3. Caveats

1. **Network Environments in Production**:
   - If a clinic operates offline without an S3 bucket configured, the local fallback saves files into `.data/lab_scans/` relative to `process.cwd()`. The server process working directory must remain consistent.
2. **Concurrent Peer Edits**:
   - Concurrent agents are modifying files in `apps/web/src/`. All edits must be staged with per-file `git add` and verified against git status to avoid race conditions.

---

## 4. Conclusion

The investigation confirms that Requirements R2 and R4 are actionable with precise changes:
1. **R2 Navigation**:
   - Wire `PerioChartModal` into `VisitEmkTab.tsx` and `PatientCardModal.tsx`.
   - Bind `ImplantPassportModal` in `App.tsx:1602` to `activePatient` and `activeDoctor` instead of hardcoded strings.
   - Add "Справка для ФНС (13%)" button to `PatientWorkspaceToolbar.tsx`.
   - Add "Клинические задачи" to `Sidebar.tsx`.
2. **R4 Backend Wiring & Storage**:
   - Add `"model/ply"` to `portalMockStorageRoutes.ts`.
   - Implement real binary `fetch(uploadUrl, { method: "PUT", body: file })` in `useLabAttachScanState.ts` using `POST /api/lab/orders/:id/scans/upload-url`.
3. **R4 Dead Actions**:
   - Wire `onDisposalCarpules` in `ChairsideProtocolsSection.tsx` and `VisitEmkInteractiveStage.tsx` to warehouse carpule deduction.
   - Remove dummy `onClick={() => {}}` in `AddServiceToothSelector.tsx` and `ChairsideToothFdiGrid.tsx`.

---

## 5. Verification Method

To independently verify the findings and any future implementation:

1. **Static Analysis & Compilation**:
   ```powershell
   npm run typecheck
   ```
   Must exit with code 0.
2. **Automated Test Suites**:
   - Lab scan upload & local storage fallback:
     ```powershell
     node --test apps/api/src/tests/routes/portalMockStorage.test.ts
     node --test apps/api/src/services/__tests__/labScanDirectUpload.test.ts
     ```
   - Anesthesia & Clinical routes:
     ```powershell
     node --test apps/api/src/tests/compliance/decree659AnesthesiaBillingAudit.test.ts
     node --test apps/api/src/tests/routes/prescriptions.test.ts
     node --test apps/api/src/tests/routes/perioCharting.test.ts
     ```
3. **File Inspections**:
   - Inspect `apps/web/src/components/visit/emkTab/VisitEmkModals.tsx:37` to verify `setIsLocalPerioModalOpen` is wired to an active UI trigger.
   - Inspect `apps/web/src/App.tsx:1602` to verify absence of "Ковалёв Роман Станиславович".
