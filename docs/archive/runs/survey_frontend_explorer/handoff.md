# Frontend Architecture & Integration Survey Report
**HEAD**: `1fe09669735f475cfb1a0a9e77472a63e8272d6a`
**Working Directory**: `C:/Clinic_MVP/dental-crm/.agents/survey_frontend_explorer`
**Role**: Frontend Integration Explorer
**Date**: 2026-08-18T21:15:30+04:00

---

## 1. Observation

A full-codebase inspection of `apps/web`, `packages/shared`, and associated services was conducted using structural search (`rg`, `fd`) and direct file examination (`view_file`).

### 1.1 Document Signing & Outpatient Documents UI
- **`apps/web/src/DocumentsView.tsx` (6,343 lines)**:
  - Serves as the central interface for document generation, preview, filtering, and issuance.
  - Mounts `DocumentUkepSignButton` (line 6041) within the document issuance panel.
  - Mounts decoupled forms from `apps/web/src/components/documents/forms/`:
    - `PaidServiceContractForm.tsx` (line 1219)
    - `PaymentInvoiceDocumentForm.tsx` (line 1822)
    - `PatientIntakeQuestionnaireForm.tsx` (line 2794)
    - `TaxDeductionApplicationForm.tsx` (line 2800)
    - `InformedConsentForm.tsx` (line 2811)
    - `ProcedureSpecificConsentForm.tsx` (line 2819)
    - `TreatmentPlanDocumentForm.tsx` (line 2830)
    - `AnesthesiaConsentLogForm.tsx` (line 3379)
    - `PhotoVideoConsentForm.tsx` (line 3582)
    - `PersonalDataProcessingConsentForm.tsx` (line 5055)
    - `MedicalInterventionRefusalForm.tsx` (line 5061)
- **`apps/web/src/components/documents/DocumentUkepSignButton.tsx` (441 lines)**:
  - **Props Interface**:
    ```typescript
    interface DocumentUkepSignButtonProps {
      documentId: string;
      onSuccess?: () => void;
    }
    ```
  - **Workflow**:
    1. Checks plugin via `checkCryptoProPlugin()`.
    2. Loads personal certificates via `getPersonalCertificates()`, parsing Subject, Issuer, Validity dates, Thumbprint, Private Key presence, and Validity flag.
    3. Handles store reading failures distinctly from empty stores (`CertificatesState = "loading" | "failed" | "ready"`).
    4. Downloads issued PDF via `loadIssuedPdfBase64()` (`GET /api/documents/${documentId}/pdf`).
    5. Calls `signBase64WithCertificate(pdf.base64, selectedThumbprint)` producing a detached CAdES-BES PKCS#7 signature.
    6. Sends signature to `POST /api/documents/${documentId}/sign-ukep` with `{ pkcs7Signature: signature }`.

### 1.2 Tooth Chart, FDI ISO 3950, and 5-Surface Selection
- **`apps/web/src/components/odontogram/ToothChart.tsx` (1,410 lines)**:
  - Interactive SVG odontogram supporting adult permanent (quadrants 1-4: 18-11, 21-28, 38-31, 41-48), pediatric deciduous (quadrants 5-8: 55-51, 61-65, 75-71, 81-85), and mixed dentition.
  - Renders custom SVG shader definitions via `DenteToothSvgDefs` (linear and radial gradients for healthy enamel, dentin, caries, pulpitis, periodontitis, zirconia crown, titanium implant).
  - **Props Interface**:
    ```typescript
    export interface ToothChartProps {
      teethData: ToothData[];
      pediatricMode?: boolean;
      mixedDentition?: boolean;
      topTeeth?: number[];
      bottomTeeth?: number[];
      selectedTeeth?: number[];
      onToothClick: (num: number, rect: DOMRect, surface?: string) => void;
      useSurfaces?: boolean | undefined;
      hideHeader?: boolean;
      hideLegend?: boolean;
      className?: string;
    }
    ```
- **`apps/web/src/components/odontogram/OdontogramModule.tsx` (1,310 lines)**:
  - Contains `SurfaceSelector` (lines 109-280) rendering an SVG cross-polygon for 5 anatomical tooth surfaces:
    - `B` (Top polygon): Buccal / Vestibular (`points="0,0 100,0 70,30 30,30"`)
    - `L` (Bottom polygon): Lingual / Palatal (`points="30,70 70,70 100,100 0,100"`)
    - `M` (Left polygon): Mesial (`points="0,0 30,30 30,70 0,100"`)
    - `D` (Right polygon): Distal (`points="100,0 70,30 70,70 100,100"`)
    - `O` (Center polygon): Occlusal / Incisal (`points="30,30 70,30 70,70 30,70"`)
  - Interacts with backend via `/api/patients/:patientId/tooth-states/batch` persisting tooth statuses and surface arrays (`surfaces?: string[]`).

### 1.3 Browser-Side CryptoPro Plugin & Detached CAdES-BES Signatures
- **`apps/web/src/utils/cryptoPro.ts` (187 lines)**:
  - Communicates directly with browser-injected `window.cadesplugin`.
  - Instantiates `CAdESCOM.Store`, `CAdESCOM.CPSigner`, and `CAdESCOM.CadesSignedData`.
  - Sets encoding `CADESCOM_BASE64_TO_BINARY` and generates detached signature with `SignCades(oSigner, cades.CADESCOM_CADES_BES, true)`.
- **`apps/web/src/lib/cryptopro.ts` (183 lines)**:
  - Provides unified `DigitalSignatureService` handling both CryptoPro and Rutoken hardware keys.
  - Implements asynchronous `ready: Promise<void>` property preventing premature certificate queries on mount.
- **`apps/web/src/components/egisz/EgiszCdaExportModal.tsx` (1,522 lines)**:
  - Full modal for generating, validating, and signing Minzdrav SEMD CDA R2 XML.
  - Binds doctor UKEP signatures (`GOST R 34.10-2012 / 34.11-2012`, OID `1.2.643.7.1.1.1.1`) to canonicalized XML (`canonicalizeXml()`) and forwards to `/api/egisz/packages`.

### 1.4 WebSocket Client & Real-time Status Updates
- **`apps/web/src/hooks/useWebsocket.ts` (128 lines)**:
  - Generic WebSocket client with reconnect exponential backoff (1s to 30s) and 30s PING/PONG heartbeats.
  - Passes authentication in the initial message frame (`{ type: "AUTH", payload: { clinicToken, staffToken } }`) rather than query parameters, preventing secret exposure in web server logs.
- **`apps/web/src/hooks/useScheduleRealtime.ts` (59 lines)**:
  - Subscribes to `/api/ws/schedule` listening for `APPOINTMENT_CREATED` and `APPOINTMENT_UPDATED`.
- **`apps/web/src/components/EgiszMonitor.tsx` (333 lines)**:
  - Displays EGISZ transmission state for visits. Currently queries HTTP endpoints `/api/clinical/egisz/integration-status` and `/api/egisz/logs/:patientId` on mount or manual button click ("Проверить снова").
  - *Gap*: Lacks active WebSocket subscription for real-time transitions (`QUEUED` -> `VALIDATING` -> `REGISTERED_IN_REMD` -> `DELIVERED_TO_EPGU`).

### 1.5 Legal Consents, Tax Deduction, MIAC & Speech Scripts
- **FNS Tax Deduction (Form KND 1151156, Format 5.01)**:
  - `NdflCalculatorModal.tsx` (213 lines): fetches `/api/documents/ndfl-calculator`, evaluates patient debt blockers under Art. 219 Tax Code, and displays Code 1 (standard, 150k limit) vs Code 2 (expensive treatment, unlimited) totals.
  - `TaxDeductionApplicationForm.tsx` (337 lines): captures applicant details, INN, birth date, identity document, relationship, delivery channel, and format selection (`knd_1151156` vs legacy).
  - `useDocumentMutations.ts:296`: `downloadTaxDocumentXml(documentId)` fetches `/api/documents/${documentId}/tax-xml` and triggers browser file download.
- **Specialty Informed Consent (IDS) Templates**:
  - `packages/shared/src/index.ts:5163` (`procedureSpecificConsentProcedureSchema`):
    - `therapy_endo_restoration` (Therapy / Endo / Restorations)
    - `surgery_extraction` & `implantation_bone_graft` (Surgery / Extractions / Implants / Bone Graft)
    - `prosthetics` (Prosthetics / Crowns / Orthopedics)
    - `orthodontics` (Orthodontics / Braces / Aligners)
    - `local_anesthesia`, `hygiene_whitening`, `periodontology`, `other`.
  - `ProcedureSpecificConsentForm.tsx` (318 lines): renders tooth row matrix, patient risk factors, procedure risks, alternatives, and aftercare instructions.
- **Medical Refusal & Speech Scripts**:
  - `MedicalInterventionRefusalForm.tsx` (344 lines): embeds quick chips for reasons, risks, alternatives, and urgent warning signs, with voice recognition (`SmartMicrophoneButton`).
  - *Gap*: Administrator/Doctor speech scripts drawer explaining legal repercussions (323-FZ Art. 20, 152-FZ Art. 9, KoAP 14.1 pt 4) is currently only partially represented in inline text and needs a dedicated guidance modal/drawer.
- **MIAC Form 039/u & Order 804n UET Reporting**:
  - `ManagerReportsPanel.tsx` (1,659 lines) currently handles managerial reports (revenue, doctor metrics, chair utilization, debt). Form 039/u and UET metrics (`uet_adult`, `uet_child`) require a dedicated Chief Medical Officer reporting tab.

### 1.6 Verification Gates
- `npm run check:encoding`: **PASSED** (2,666 files checked, 0 errors).
- `npm run typecheck`: **PASSED** (0 errors across `@dental/shared`, `@dental/api`, and `@dental/web`).

---

## 2. Logic Chain

1. **Document Issuance & Crypto Signing**:
   - `DocumentsView.tsx` creates document records in `draft` state.
   - When finalized and issued, backend compiles HTML to print-ready PDF using headless MS Edge/Chrome (`child_process.spawn`) and locks the snapshot with SHA-256 (`issuedSnapshotSha256`).
   - `DocumentUkepSignButton.tsx` fetches this issued PDF via `GET /api/documents/:id/pdf`, reads the binary stream, converts to Base64, invokes `signBase64WithCertificate()` via CryptoPro CAdES-BES detached mode, and submits the raw PKCS#7 signature to `POST /api/documents/:id/sign-ukep`.
2. **Dental Status & SEMD 108 Generation**:
   - `ToothChart.tsx` and `OdontogramModule.tsx` capture FDI ISO 3950 tooth numbers (11-48, 51-85) and 5 anatomical surfaces (`B`, `L`, `M`, `D`, `O`).
   - `EgiszCdaExportModal.tsx` consumes `toothStates` and `toothSurfaces`, transforming them through `buildCdaXml()` into HL7 CDA R2 XML according to Minzdrav Template 1.2.643.5.1.13.13.11.108.
   - The doctor signs the canonical XML in-browser via `DigitalSignatureService`, creating a detached CAdES-BES signature that accompanies the package sent to the REMD gateway outbox.
3. **Tax & Legal Integrity**:
   - FNS Tax Deduction (KND 1151156) uses `NdflCalculatorModal.tsx` to ensure payments comply with 54-FZ fiscal records before generating XML valid against `UT_SVOPLMEDUSL_1_278_00_05_01_02.xsd`.
   - 4 IDS templates provide required legal coverage for therapy, surgery, prosthetics, and orthodontics, maintaining exact tooth rows and patient confirmations.

---

## 3. Caveats

1. **WebSocket Status Updates in UI**: While the backend Outbox processor tracks `QUEUED` -> `VALIDATING` -> `REGISTERED_IN_REMD` -> `DELIVERED_TO_EPGU`, frontend components (`DocumentsView.tsx` and `EgiszMonitor.tsx`) currently poll or fetch on-demand. A dedicated `useDocumentRealtime` hook connecting to `/api/ws/documents` is required.
2. **Chief Medical Officer Reporting Tab**: `ManagerReportsPanel.tsx` contains commercial reports. The clinical/regulatory Form 039/u and UET metrics need a dedicated view or tab accessible to staff with Chief Medical Officer role.
3. **Staff Speech Scripts Drawer**: Currently, `MedicalInterventionRefusalForm.tsx` provides quick chips and voice input. A dedicated slide-over drawer with full script dialogs for 323-FZ / 152-FZ / KoAP refusal handling should be connected directly to the refusal workflow.

---

## 4. Conclusion & Integration Plan

### Component Architecture & Wiring Matrix

| Epic / Feature | Frontend Component | Target Route / WebSocket | Props & Interface |
|---|---|---|---|
| **R1. SEMD 108 CDA R2** | `apps/web/src/components/egisz/EgiszCdaExportModal.tsx` | `POST /api/egisz/packages` | `EgiszCdaExportModalProps` (`toothStates`, `toothSurfaces`, `doctorSnils`, `clinicOid`) |
| **R2. Detached UKEP Signing** | `apps/web/src/components/documents/DocumentUkepSignButton.tsx` | `POST /api/documents/:id/sign-ukep` | `DocumentUkepSignButtonProps` (`documentId`, `onSuccess`) |
| **R3. Real-time Outbox Status** | `apps/web/src/hooks/useDocumentRealtime.ts` (To create) & `EgiszMonitor.tsx` | `WSS /api/ws/documents` & `GET /api/egisz/logs/:id` | `EGISZ_STATUS_UPDATED` event payload (`documentId`, `status: OutboxStatus`) |
| **R4. FNS Tax Certificate** | `apps/web/src/components/documents/NdflCalculatorModal.tsx` & `TaxDeductionApplicationForm.tsx` | `GET /api/documents/ndfl-calculator`, `GET /api/documents/:id/tax-xml` | `NdflCalculatorModalProps`, `TaxDeductionApplicationFormProps` |
| **R5. MIAC Form 039/u & UET** | `apps/web/src/components/reports/MiacForm039Panel.tsx` (To integrate) | `GET /api/reports/miac-039` | `{ periodFrom: string, periodTo: string, doctorId?: string }` |
| **R6. SHA-256 Audit Trail** | `apps/web/src/AuditLogsPanel.tsx` & `DocumentsView.tsx` | `GET /api/audit-logs`, `GET /api/documents/:id/audit-facts` | `{ documentId: string, issuedSnapshotSha256: string }` |
| **R7. 4 IDS Templates & Scripts** | `ProcedureSpecificConsentForm.tsx` & `RefusalSpeechScriptsDrawer.tsx` | `POST /api/documents` (kind: `procedure_specific_consent_packet`) | `ProcedureSpecificConsentFormProps` (8 specialty procedures, tooth row matrix) |

---

## 5. Verification Method

To independently verify the frontend integration and compliance:

1. **Verify UTF-8 Encoding & Zero Mojibake**:
   ```bash
   npm run check:encoding
   ```
   *Expected*: `Кодировка в порядке: проверено 2666 файлов, замечаний нет.`

2. **Verify TypeScript Compilation**:
   ```bash
   npm run typecheck
   ```
   *Expected*: Exit code 0 across `@dental/shared`, `@dental/api`, and `@dental/web`.

3. **Verify CryptoPro Browser Plugin Signing**:
   - Inspect `apps/web/src/utils/cryptoPro.ts` and `DocumentUkepSignButton.tsx`.
   - Verify `checkCryptoProPlugin`, `getPersonalCertificates`, and `signBase64WithCertificate`.

4. **Verify Tooth Chart 5-Surface FDI ISO 3950 System**:
   - Inspect `apps/web/src/components/odontogram/ToothChart.tsx` and `OdontogramModule.tsx:109-280` (`SurfaceSelector`).

5. **Verify Design System & Semantic Theming**:
   - Inspect `apps/web/src/styles/tailwind.css` and `token-aliases.css` to confirm `@custom-variant dark` coverage across all themes (`dark`, `night`, `ocean`, `emerald`, `cyber_xray`).

---
### 🔒 Status Summary:
- **`ПРОВЕРЕНО`**:
  - Full codebase survey of `apps/web` documents, signing UI, odontogram, cryptopro, websockets, and reports.
  - `DocumentUkepSignButton.tsx` and `cryptoPro.ts` detached CAdES-BES architecture.
  - FDI ISO 3950 5-surface selector (`SurfaceSelector` B, L, M, D, O) and adult/pediatric/mixed tooth charts.
  - FNS Tax KND 1151156 calculator and XML export mechanics.
  - 4 IDS templates mapped to `procedureSpecificConsentProcedureSchema`.
  - Machine gates: `check:encoding` and `typecheck` 100% passing.
- **`НЕ ПРОВЕРЕНО`** (Pending Milestone Implementation):
  - Live WebSocket broadcast hook for SEMD outbox status transitions.
  - Form 039/u Chief Medical Officer UI tab.
  - Standalone speech scripts slide-over drawer component.
