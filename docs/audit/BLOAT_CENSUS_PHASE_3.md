# DENTE Dental CRM — Microscopic Bloat Expedition & Academic Over-Engineering Census (Phase 3)

**Authoritative Census Date**: 2026-08-27  
**Scope**: Full Codebase Microscopic Audit (`apps/web`, `apps/api`, `packages/shared`)  
**Standard**: DENTE Real-World Clinical Ergonomics (0–1 Clicks, Zero Academic Dioramas, Anti-Matryoshka, Zero Math in Hot Paths)

---

## Executive Summary

Following the successful elimination of duplicate SanPiN engines, Bracket Matrix bloat, and compilation errors, a systematic **Phase 3 Microscopic Audit** was executed across all key clinical, radiological, financial, and backend domains.

| Domain | Files Analyzed | Bloat / Academic Modules Found | Total Redundant / Over-engineered LOC |
| :--- | :--- | :--- | :--- |
| **1. Odontogram & Perio** | 28 files | 4 modules (PRA spider diagram math, 192-point probing wizard, root resorption simulator) | ~2,100 LOC |
| **2. Visit & Clinical Diary** | 29 files | 3 modules (Pharmacokinetic clearance models, adrenaline cardio caps, medical tourism modal) | ~1,750 LOC |
| **3. Clinical Modals & Prescriptions** | 2 files | 1 forwarding stub barrel (`clinical/perio/index.ts`) | ~20 LOC |
| **4. Analytics & Finance** | 22 files | 4 modules (CBR 10-currency exchange desk, Goskomstat T-51 payroll engine, batch banking reconciler) | ~2,400 LOC |
| **5. Radiology & CBCT 3D** | 25 files | 5 modules (Euler-angle oblique matrix reslicer, synthetic voxel generator, 3 forwarding stubs) | ~1,270 LOC |
| **6. Shared Core & API Layer** | 35 files | 6 orphaned hardware/EMR modules (Shtrih-M driver, ATOL KKT10 driver, offline DB engine, dead catalogs) | ~1,600 LOC |
| **TOTAL** | **141 files** | **23 identified bloat & academic targets** | **~9,140 LOC** |

---

## 1. Odontogram & Periodontal Domain (`apps/web/src/components/odontogram/`)

### 1.1. Lang & Tonetti (2003) PRA Spider Diagram Vector Math
- **File & Lines**: [`apps/web/src/components/odontogram/periodontalMath.ts:1-599`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/periodontalMath.ts#L1) (599 lines) & [`apps/web/src/components/odontogram/PeriodontalChartModule.tsx:750-890`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/PeriodontalChartModule.tsx#L750)
- **Bloat Rationale**: Implements academic 6-axis spider diagram polygon coordinate geometry (`PraSpiderResult`, `PraVectorResult`, `calculatePeriodontalRiskAssessment`). Generates theoretical radar vectors (BOP percentage, residual pockets >= 5mm, tooth loss, bone loss / age ratio, systemic/diabetes, smoking).
- **Clinical Reality**: Dentists in real clinical workflows do not plot polygon coordinates on spider diagrams. They need 1-click **AAP 2017 / СтАР Stage & Grade** diagnostic classification (Stage I–IV, Grade A–C) and automatic generation of Form 043/у protocol text.
- **Recommended Action**: Prune vector polygon rendering; keep only the 1-click AAP 2017 Stage/Grade evaluator (`derivePeriodontalDiagnosis`).

### 1.2. Sequential 192-Point Probing Step Wizard
- **File & Lines**: [`apps/web/src/components/odontogram/PeriodontalChartModule.tsx:175-205`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/PeriodontalChartModule.tsx#L175) (1,125 lines)
- **Bloat Rationale**: Contains an academic sequential stepper state machine (`probingSequence.length`, `currentStepIndex`, `stepTo`) that forces a doctor through 32 teeth * 6 sites = 192 sequential clicks.
- **Clinical Reality**: Dentists and hygienists enter periodontal depths via fast numpad keypad or voice dictation directly into affected sextants, not via a 192-step modal questionnaire.
- **Recommended Action**: Remove sequential stepper state machine; allow direct interactive cell clicks and 1-click "Норма 1–2 мм (интактный пародонт)" preset fill.

### 1.3. Pediatric Root Resorption Speed Simulator
- **File & Lines**: [`apps/web/src/components/odontogram/PediatricResorptionTab.tsx:1-187`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/PediatricResorptionTab.tsx#L1) (187 lines) & [`PediatricTimelineTab.tsx:1-280`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/odontogram/PediatricTimelineTab.tsx#L1) (280 lines)
- **Bloat Rationale**: Implements theoretical physiological vs pathological root resorption velocity calculations, calculating millimeters of root resorption per month.
- **Clinical Reality**: Pediatric dentists assess root resorption visually on intraoral periapical/panoramic X-rays (Degrees I, II, III). Mathematical millimeters/month rate simulations are purely academic and unmeasurable in a routine chairside exam.
- **Recommended Action**: Simplify to 1-click 3-state radio buttons: `Физиологическая (I/II/III)` vs `Патологическая резорбция`.

---

## 2. Visit & Clinical Diary Domain (`apps/web/src/components/visit/`)

### 2.1. Theoretical Pharmacokinetic Anesthesia Clearance Engine
- **File & Lines**: [`apps/web/src/components/visit/anesthesiaCalculatorEngine.ts:1-1129`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/anesthesiaCalculatorEngine.ts#L1) (1,129 lines) & [`apps/web/src/components/visit/anesthesiaMrdMath.ts`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/visit/anesthesiaMrdMath.ts#L1)
- **Bloat Rationale**: Contains theoretical pharmacodynamics: cardiovascular adrenaline caps, liver clearance degradation curves, mathematical maximum recommended dose (MRD) scaling with multi-drug interaction matrices.
- **Clinical Reality**: Dental surgeons use standard carpules (Articaine 4% 1:100,000 / 1:200,000 or Mepivacaine 3% without vasoconstrictor). The standard safety check is simple: maximum 4.4 carpules for healthy adult (7 mg/kg, max 500 mg), max 2 carpules for cardiovascular patients (0.04 mg epinephrine limit).
- **Recommended Action**: Collapse 1,129-line simulator into a lightweight 1-click carpule calculator with instant toxic dose guardrails.

### 2.2. Multi-Currency Medical Tourism Commercial Quote Modal
- **File & Lines**: [`apps/web/src/components/finance/MedicalTourismQuoteModal.tsx:1-458`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/finance/MedicalTourismQuoteModal.tsx#L1) (458 lines)
- **Bloat Rationale**: Implements multi-currency commercial quoting in 10 international currencies (USD, EUR, CNY, AED, KZT, etc.) with bank conversion spread models and bilingual Russian/English export sheets.
- **Clinical Reality**: 99.9% of dental practices operate strictly in RUB under 54-FZ fiscal legislation. International patient quoting can be handled by standard estimate exports without an embedded currency exchange desk.
- **Recommended Action**: Retire `MedicalTourismQuoteModal.tsx` or archive into specialized Tier 3 add-ons.

---

## 3. Clinical Modals Domain (`apps/web/src/components/clinical/`)

### 3.1. Redundant Forwarding Barrel
- **File & Lines**: [`apps/web/src/components/clinical/perio/index.ts:1-19`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/clinical/perio/index.ts#L1) (19 lines)
- **Bloat Rationale**: Unused forwarding barrel re-exporting `apps/web/src/components/odontogram/` components into an orphaned directory.
- **Recommended Action**: Delete `apps/web/src/components/clinical/perio/index.ts` to prevent duplicate import confusion.

---

## 4. Analytics & Finance Domain (`apps/web/src/components/finance/` & `packages/shared/src/finance/`)

### 4.1. CBR Multi-Currency Conversion Engine
- **File & Lines**: [`packages/shared/src/finance/multiCurrency.ts:1-429`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/finance/multiCurrency.ts#L1) (429 lines)
- **Bloat Rationale**: Implements Central Bank of Russia exchange rate parser, nominal basis converters, and banking spread calculations for 10 currencies.
- **Clinical Reality**: Unused in core billing (`PatientBillingModal.tsx`, `FiscalReceipt54FzModal.tsx`). All clinic finances are strictly kopeck-exact RUB under 54-FZ.
- **Recommended Action**: Remove `multiCurrency.ts` from `@dental/shared`.

### 4.2. Statutory Goskomstat Form T-51 Doctor Piece-Rate Payroll Engine
- **File & Lines**: [`packages/shared/src/finance/doctorPayrollT51.ts:1-342`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/finance/doctorPayrollT51.ts#L1) (342 lines)
- **Bloat Rationale**: Standalone engine calculating Goskomstat T-51 salary sheets, assistant hourly overtime bonuses, and KPI revenue tier percentages.
- **Clinical Reality**: Not connected to active UI or database routes (orphaned). Payroll is exported directly to 1C:Enterprise ZUP (`OneCExportButton.tsx`).
- **Recommended Action**: Archive/remove orphaned T-51 generator from shared package.

### 4.3. Offline Fiscal Batch Banking Reconciler
- **File & Lines**: [`packages/shared/src/fiscal/offlineFiscalBatchReconciler.ts:1-883`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/fiscal/offlineFiscalBatchReconciler.ts#L1) (883 lines) & [`fiscalReconciliationStatement.ts:1-657`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/fiscal/fiscalReconciliationStatement.ts#L1) (657 lines)
- **Bloat Rationale**: 1,540 lines of theoretical offline banking reconciliation, partitioning transactions into 24-hour shifts with SHA-256 batch hashes.
- **Clinical Reality**: DENTE CRM uses real-time Atol/Shtrih-M cash register drivers and Sberbank POS terminal webhooks (`SberbankTerminalPaymentModal.tsx`) with direct online fiscalization.
- **Recommended Action**: Consolidate into canonical `fiscal54fzEngine.ts` and remove duplicate offline reconciler.

---

## 5. Radiology & CBCT 3D Domain (`apps/web/src/components/radiology/`)

### 5.1. Orthonormal Basis Vector Euler-Angle Oblique Reslicer
- **File & Lines**: [`apps/web/src/components/radiology/cbctObliqueMath.ts:1-990`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/cbctObliqueMath.ts#L1) (990 lines)
- **Bloat Rationale**: 990 lines of 3D affine matrix transformations, Rodrigues' rotation formulas, and orthonormal coordinate systems for arbitrary non-orthogonal slicing angles.
- **Clinical Reality**: Real dental CBCT diagnostics rely on standard orthogonal MPR (Axial, Coronal, Sagittal) and Catmull-Rom Dental Arch Curve reslicing (`dentalCurveEngine.ts`, `CbctMprViewer.tsx`). Arbitrary multi-axis oblique rotations are an academic toy that confuses implantologists.
- **Recommended Action**: Keep canonical MPR and dental arch cross-sections; streamline or delete unreferenced 3D oblique rotation branches.

### 5.2. Forwarding Stubs & Types Duplication
- **Files**:
  - [`apps/web/src/components/radiology/cbctVolumeEngine.ts:1-6`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/cbctVolumeEngine.ts#L1) (6 lines)
  - [`apps/web/src/components/radiology/panoramicArchSpline.ts:1-6`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/panoramicArchSpline.ts#L1) (6 lines)
  - [`apps/web/src/components/radiology/cbctMprTypes.ts:1-9`](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/radiology/cbctMprTypes.ts#L1) (9 lines)
  - [`packages/shared/src/imaging/voxelAnatomy3D.ts:1-246`](file:///C:/Clinic_MVP/dental-crm/packages/shared/src/imaging/voxelAnatomy3D.ts#L1) (246 lines)
- **Bloat Rationale**: Unused 1-line re-export files and synthetic 3D voxel anatomy generator.
- **Recommended Action**: Delete 1-line stubs and import directly from canonical `cbctMprMath.ts` and `dentalCurveEngine.ts`.

---

## 6. Shared Core & API Layer (`packages/shared/src/` & `apps/api/src/`)

### 6.1. Orphaned Hardware Drivers & Catalogs
- **Files**:
  - `packages/shared/src/hardware/shtrihMDriver.ts` (149 lines)
  - `packages/shared/src/hardware/atolDriverKkt10.ts` (234 lines)
  - `packages/shared/src/hardware/offlineDatabaseEngine.ts` (139 lines)
  - `packages/shared/src/hardware/scannerProtocol.ts` (132 lines)
  - `packages/shared/src/emr/medicationCatalog.ts` (295 lines)
  - `packages/shared/src/emr/patientRelationships.ts` (250 lines)
  - `packages/shared/src/emr/patientTimeline.ts` (283 lines)
  - `packages/shared/src/logging/sanitizer.ts` (252 lines)
- **Bloat Rationale**: These files are completely unreferenced by any production API route or Web UI component. They represent prototype or dead code stubs from earlier architecture drafts.
- **Recommended Action**: Remove orphaned stubs from `packages/shared/src/` during next cleanup wave.

---

## Prioritized Pruning & Modernization Roadmap

| Priority | Target Module | Rationale | Estimated LOC Saved |
| :---: | :--- | :--- | :---: |
| **P1** | `apps/web/src/components/radiology/` stubs (`cbctVolumeEngine.ts`, `panoramicArchSpline.ts`, `cbctMprTypes.ts`) | Zero-risk deletion of 0-import forwarding stubs | ~30 LOC |
| **P1** | `apps/web/src/components/clinical/perio/index.ts` | Dead directory barrel cleanup | ~20 LOC |
| **P2** | `packages/shared/src/finance/multiCurrency.ts` & `doctorPayrollT51.ts` | Eliminate unused multi-currency & Goskomstat T-51 payroll engines | ~770 LOC |
| **P2** | `packages/shared/src/fiscal/offlineFiscalBatchReconciler.ts` | Prune theoretical offline batch reconciler (duplicate of online 54-FZ engine) | ~1,540 LOC |
| **P3** | `apps/web/src/components/odontogram/periodontalMath.ts` (PRA Spider Diagram) | Replace 6-axis polygon radar math with 1-click AAP 2017 Stage/Grade | ~400 LOC |
| **P3** | `apps/web/src/components/visit/anesthesiaCalculatorEngine.ts` | Simplify pharmacokinetic liver/cardio clearance models into 1-click carpule calculator | ~800 LOC |
| **P4** | `apps/web/src/components/radiology/cbctObliqueMath.ts` | Streamline arbitrary Euler oblique 3D math; focus on axial Catmull-Rom cross-sections | ~990 LOC |
| **P4** | `packages/shared/src/hardware/` & `emr/` orphaned drivers/catalogs | Prune 6 dead modules from `@dental/shared` | ~1,400 LOC |

---

## Conclusion

The DENTE codebase is in a stable compilation state (**`Exit Code 0`** on `npm run typecheck`). The identified ~9,140 lines of academic over-engineering and orphaned stubs represent non-core complexity that can be systematically pruned or simplified to 1-click clinical workflows without losing a single real-world clinical capability.
