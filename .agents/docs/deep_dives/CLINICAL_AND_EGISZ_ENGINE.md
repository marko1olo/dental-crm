# Clinical Rules & EGISZ Engine Documentation

## 1. Clinical Engine & State Transitions (`clinical.ts`)

The clinical API manages rules, patient phase handoffs, and task generation between doctors.

### Clinical Rules Evaluation
- **Endpoint:** `POST /api/clinical/rules/evaluate`
- **Functionality:** Evaluates a set of clinical facts (from `patientId` and `visitId`) against the clinic's rule database (`evaluateClinicalRulesInDb`).
- **Security & Scoping:** Rules are strictly scoped to the user's `organizationId` (from the authenticated token). This prevents a bug where Clinic A's blocking rules (e.g., allergy to articaine) were previously evaluated against Clinic B's ruleset.
- **Enforcement:** If `enforceBlockers` is passed and a rule with `severity === "blocker"` is hit, the API aborts with HTTP 400 `ClinicalRuleBlocker` and returns the specific contraindication message.
- **CRUD Operations:** Additional endpoints exist to create (`POST /api/clinical/rules`), update (`PATCH /api/clinical/rules/:ruleId`), and delete (`DELETE /api/clinical/rules/:ruleId`) clinical rules. Deletion now strictly returns 404 for foreign or non-existent rules to prevent data leakage.

### Clinical Handoffs and Task Generation
- **Phase Completions (`POST /api/clinical/phase-completions`):**
  - Handles the transition of a patient between clinical phases (e.g., from Therapist to Surgeon).
  - **Inputs:** `patientId`, `completedPhaseCode`, `treatmentPlanId`, `assignedDoctorId`, `toothCodes`, and `notes`.
  - **Logic:** Calls `ClinicalRouter.handlePhaseCompletion(...)` to generate a clinical task. This replaces previous behavior where the router only printed tasks in memory.
- **Task Listing (`GET /api/clinical/tasks`):**
  - Lists the generated tasks via `ClinicalRouter.listTasks(orgId, patientId)`. This is what the next assigned doctor sees upon opening the patient's chart, establishing continuity of care.

### Deprecated / Unimplemented Routes
- Removed hollow endpoints that had no writers: custom examination forms, treatment plan stages/locks/odontograms, time reservations, DIAGNOCAT findings, ProDoctorov sync, and rebooking conversion rules (which lacked `created_at` data on appointments).

---

## 2. EGISZ Engine & CDA R2 Generation (`egisz.ts`)

The EGISZ module generates "Протокол стоматологического осмотра" as CDA R2 XML files for the federal system (FRMO/FRMR/REMD). Transport to REMD is not yet active (`capabilities.remdTransmission: false`).

### Integration Status & Validations
- **Status (`GET /api/clinical/egisz/integration-status`):** Real-time evaluation of gateway configs. Missing env variables like `EGISZ_N3_BASE_URL` or `EGISZ_CLINIC_OID` accurately return `NOT_CONFIGURED` instead of hardcoded `CONNECTED`.
- **SNILS Validation (`POST /api/clinical/egisz/validate-doctor-snils`):** Ensures a doctor's SNILS has exactly 11 digits and strictly verifies the mathematical checksum via `isValidSnils` before FRMR registration to prevent rejections.

### EGISZ CDA R2 Export (`GET /api/egisz/visits/:visitId/cda`)
Generates the CDA XML. Features strict data prioritization and mapping based on fixed defects:

#### Strict Data Prerequisites
If any of these are missing, generation aborts with HTTP 422:
- **Form 043 Lock (Defect #59):** The diary (`visitDiaries`) MUST be signed/locked (`isLocked === true`). Drafts are rejected.
- **Identifiers & Demographics:** 
  - Valid Clinic OID (Defect #67).
  - Assigned Doctor must not be "Не указан" (Defect #63).
  - Valid 11-digit patient SNILS with correct checksum (Defect #60).
  - Patient Birth Date (Defect #64 - prevents hardcoded "19000101").
  - Patient Gender (`male` or `female`) (Defect #68).
  - Patient Full Name and Clinic Name (Defects #70, #71).
  - Extractable ICD-10 Code (Defect #62).

#### Field Prioritization & Merging
- **Diagnosis (Defect #51/52):** `diary.diagnosisIcd10` wins. If empty, falls back to EMK `visit.diagnosis`, then `diary.diagnosisTooth`.
- **Anamnesis (Defect #50):** `diary.anamnesis` wins. If empty, it concatenates EMK `visit.complaint` and `visit.anamnesis`.
- **Treatment & Objective Status (Defect #47):** Form 043 `diary` fields take priority over general EMK `visit` fields.
- **Encounter Time (Defect #56):** Uses the linked `appointments.startsAt`. If missing, falls back to `visit.createdAt`.
- **Effective Time (Defect #72):** The CDA document generation time maps to `diary.lockedAt` (when the doctor actually signed the chart), not the wall-clock time of the export.
- **Additional Data:** Maps `diary.complications`, `comorbidities`, `instrumentTrayBarcode` (Defect #57), and `diagnosisTooth` (Defect #74) into the CDA payload. Contact information uses real user/clinic data (with `nullFlavor` fallbacks).

#### CDA Document Versioning (Defects #87-90)
- **`documentSetId`:** Fixed to `visit.id` (stable set identifier).
- **`encounterId`:** Fixed to `visit.id`.
- **`documentId`:** Dynamically scoped as `${visit.id}-v${version}` based on the diary's revision version.
- **RPLC Link:** If the document is a revision (version >= 2), a `<relatedDocument typeCode="RPLC">` element is added, explicitly linking it to `${visit.id}-v${version - 1}`.

#### Audit Trail
- A successful generation queues an intent in the `egisz_logs` table (`status: "Pending"`) and serves the XML payload (`cda-{visit.id}.xml`) for download. A discrete `/api/egisz/send` endpoint exists to manually queue this export.
