# Survey & Architecture Analysis Report: Requirements R3 & R4
**Project:** Clinic MVP / DENTE Dental CRM  
**Explorer Agent:** `survey_explorer_2`  
**Date:** 2026-08-15  
**Subject:** Form 043/u Clinical Diary & Odontogram Auto-Generation (R3) and DICOM / CT MPR Viewer Precision & Nerve Clearance (R4)

---

## Executive Summary

This report provides an exhaustive, line-by-line architectural and mathematical survey of Requirements **R3** (Form 043/u Clinical Diary & Odontogram Auto-Generation) and **R4** (DICOM / CT MPR Viewer Precision & Mandibular Nerve Clearance) in the DENTE Dental CRM codebase.

All relevant source modules, mathematical formulations, database constraints, UI lifecycle states, and unit test suites were inspected. All 1,319 web tests (`npm test -w @dental/web`) pass cleanly with zero regressions.

---

## Table of Contents
1. [Requirement R3: Form 043/u Clinical Diary & Odontogram Auto-Generation](#1-requirement-r3-form-043u-clinical-diary--odontogram-auto-generation)
   - 1.1 FDI Tooth Numbering to Russian Clinical Nomenclature
   - 1.2 Structured SOAP Diary Auto-Generation for ICD-10 Protocols
   - 1.3 Non-Destructive `smart_append` Merge Strategy
   - 1.4 Electronic Signature Workflow (UKEP & PEP), Draft Auto-Persistence & Document Sealing
2. [Requirement R4: DICOM / CT MPR Viewer Precision & Nerve Clearance](#2-requirement-r4-dicom--ct-mpr-viewer-precision--nerve-clearance)
   - 2.1 3D Segment-to-Segment Shortest Distance Math
   - 2.2 Clearance Calculation & 4-Level Safety Status Matrix
   - 2.3 MPR Synchronized Crosshair Panning, Volumetric HU Sampling & Curved MPR Unwrap
   - 2.4 Bone Quality Engine (Misch Classification D1–D4 & Drilling Sequence)
3. [Component Architecture & File Registry](#3-component-architecture--file-registry)
4. [Gap Analysis & Technical Recommendations](#4-gap-analysis--technical-recommendations)
5. [Verification & Proof Commands](#5-verification--proof-commands)

---

## 1. Requirement R3: Form 043/u Clinical Diary & Odontogram Auto-Generation

### 1.1 FDI Tooth Numbering to Russian Clinical Nomenclature

- **File**: `apps/web/src/lib/clinicalProtocols043.ts` (lines 60–165)
- **Functions**: `getToothAnatomicalNameRu`, `formatSurfacesRu`, `normalizeFdiToothList`

#### Implementation Architecture:
1. **FDI Validation**: Validates tooth numbers against `isValidFdiToothNumber(toothNumber)` from `@dental/shared`. Permitted ranges:
   - Permanent dentition: $11–18, 21–28, 31–38, 41–48$ (Quadrants 1–4)
   - Primary (milk) dentition: $51–55, 61–65, 71–75, 81–85$ (Quadrants 5–8)
2. **Quadrant & Anatomical Mapping**:
   - Quadrant: `Math.floor(toothNumber / 10)`
   - Position in quadrant: `toothNumber % 10`
   - Quadrant dictionary:
     - 1: «верхний правый», 2: «верхний левый», 3: «нижний левый», 4: «нижний правый»
     - 5: «верхний правый временный», 6: «верхний левый временный», 7: «нижний левый временный», 8: «нижний правый временный»
   - Permanent position dictionary: 1: «центральный резец», 2: «латеральный резец», 3: «клык», 4: «первый премоляр», 5: «второй премоляр», 6: «первый моляр», 7: «второй моляр», 8: «третий моляр (зуб мудрости)»
   - Primary position dictionary: 1: «центральный резец», 2: «латеральный резец», 3: «клык», 4: «первый моляр», 5: «второй моляр»
   - Output format: `getToothAnatomicalNameRu(16)` $\rightarrow$ `"16 (верхний правый первый моляр)"`
3. **Tooth Surfaces Nomenclature**:
   - `formatSurfacesRu` translates surface tokens:
     - `O`: «окклюзионная (жевательная)»
     - `M`: «мезиальная (медиальная)»
     - `D`: «дистальная»
     - `B` / `V`: «вестибулярная (щечная/губная)»
     - `L`: «язычная»
     - `P`: «нёбная»
4. **Clinical Sorting & Normalization**:
   - `normalizeFdiToothList` sorts and deduplicates teeth following the anatomical arch traversal standard:
     - Upper Jaw: Quadrant 1 ($18 \rightarrow 11$), Quadrant 2 ($21 \rightarrow 28$)
     - Lower Jaw: Quadrant 3 ($38 \rightarrow 31$), Quadrant 4 ($41 \rightarrow 48$)

---

### 1.2 Structured SOAP Diary Auto-Generation for ICD-10 Protocols

- **File**: `apps/web/src/lib/clinicalProtocols043.ts` (lines 171–411)
- **Function**: `generateSoapFromOdontogramFinding(finding: OdontogramFindingInput): ClinicalProtocolSoap`

The generator produces legally compliant Russian clinical text according to Ministry of Health Order No. 834n (Приказ МЗ РФ № 834н, Форма № 043/у) across all required diagnostic protocols:

| Diagnosis / State | ICD-10 Code | Subjective (S) | Objective / Status Localis (O) | Treatment Plan & Recommendations (P) |
|---|---|---|---|---|
| **Caries (Enamel / Dentin)** | `K02.0` (эмаль), `K02.1` (дентин) | Pain from thermal/chemical irritants (cold, sweet), food impaction | Enamel chalky spot or cavity within mantle/circumpulpar dentin, probing pain at enamel-dentin junction, EOD 6–20 $\mu\text{A}$ | Anesthesia (Articaine 4% 1:200,000), cavity prep, isolation (cofferdam), 2% CHX antiseptic, Ca(OH)2 liner, GIC base, adhesive protocol, composite layer restoration, finishing/occlusion check |
| **Pulpitis** | `K04.0` | Acute paroxysmal spontaneous night pain radiating along trigeminal nerve branches | Deep carious cavity communicating with pulp chamber, sharp bleeding probing pain at pulp horn, EOD 25–45 $\mu\text{A}$ | Conduction/infiltration anesthesia, endodontic access, vital extirpation, apex locator & visiography WL determination, rotary NiTi shaping, 3% NaOCl + 17% EDTA ultrasonic irrigation, 3D gutta-percha + epoxy sealer obturation, composite restoration |
| **Periodontitis** | `K04.4` (острый), `K04.5` (хронический) | Constant throbbing pain, "elongated tooth" feeling, chewing discomfort | Discolored crown, negative thermal test, vertical/horizontal percussion tenderness, periapical bone resorption on radiography, EOD $> 100 \mu\text{A}$ | Endodontic access, old filling removal, canal disinfection, ultrasonic activation, temporary Ca(OH)2 paste dressing, hermetic temporary seal, planned 14-day recall for permanent obturation |
| **Gingivitis / Periodontitis** | `K05.1` (гингивит), `K05.3` (пародонтит) | Gum bleeding on brushing and chewing, halitosis, mobility | Hyperemic cyanotic gingiva, pocket depth $2–6\text{mm}$, calculus, furcation involvement | Ultrasonic scaling, Air-Flow polishing, Gracey curettes subgingival curettage, 0.05% CHX irrigation, Metrogyl Denta instillation, oral hygiene instruction |
| **Missing Tooth** | `K08.1` | Chewing deficiency, aesthetic defect due to extraction | Edentulous alveolar ridge healed, pink mucous membrane, bone height/width evaluation on CBCT | Implantology and prosthetics consultation, 3D implant planning, prosthetic rehabilitation |
| **Filled Tooth (Secondary Caries)** | `K02.1` | Food trapping, margin defect | Defective composite restoration, marginal leakage, recurrent caries | Removal of defective restoration, recurrent caries excavation, direct composite restoration |
| **Crown / Prosthetics** | `Z51.8` | Destruction of $> 50\%$ crown hard tissue (IROPZ $> 0.6$) | Devitalized stump, root canals hermetically filled | Stump preparation with circular $0.5–1.0\text{mm}$ chamfer, retraction, 2-step A-silicone impression, provisional crown |
| **Implant (Planned / Placed)** | `K08.1` / `Z51.8` | Implant planning / routine post-op check | Stable alveolar ridge / stable healing abutment, no peri-implantitis | 3D planning / antiseptic irrigation, osseointegration assessment |
| **Healthy Tooth** | `Z01.2` | Routine checkup, no complaints | Intact hard tissues, painless probing and percussion, pink gingiva | Professional hygiene, topical fluoride varnish |

---

### 1.3 Non-Destructive `smart_append` Merge Strategy

- **File**: `apps/web/src/lib/clinicalProtocols043.ts` (lines 422–502)
- **Function**: `mergeSoapDiaryState(existing: DiaryState, incoming: Partial<DiaryState>, options?: MergeSoapOptions): DiaryState`

#### Core Invariants:
1. **Preservation of Manual Notes**: If a doctor has already typed observations or anamnesis, incoming protocols never overwrite existing text.
2. **`smart_append` Mechanism**:
   - If both `existing[field]` and `incoming[field]` contain text, joins them with `\n\n`.
   - **Deduplication**: Checks `existingText.includes(incomingText)` to prevent duplicate entries when repeatedly selecting findings.
3. **FDI Tooth List Normalization**: Combines and deduplicates tooth lists via `normalizeFdiToothList("${current}, ${next}")`.
4. **Primary ICD-10 Code Retention**: Keeps existing primary ICD-10 code unless initially empty.
5. **Alternative Strategies**:
   - `fill_blanks_only`: Only populates empty fields.
   - `replace`: Explicitly replaces fields (used for full resets).

---

### 1.4 Electronic Signature Workflow, Draft Auto-Persistence & Document Sealing

#### A. Draft Auto-Persistence (Dual-Layer Resilience):
- **Hook**: `apps/web/src/components/useVisitDiaryLogic.ts`
- **In-Memory & Store**: State synced with `useVisitStore`.
- **LocalStorage Fallback**: Key `dente_diary_draft_${visitId}` caches edits locally on every change, restoring draft state instantly if browser crashes or reloads before server sync.
- **Autosave Daemon**: Background timer triggers `doSave(true)` every 30 seconds via `POST /api/diaries`.

#### B. Electronic Signature Protocols (UKEP vs PEP):
- **Component**: `apps/web/src/components/visit/CryptoProSigner.tsx`
1. **Enhanced Qualified Electronic Signature (УКЭП / UKEP)**:
   - Interacts with CryptoPro CSP / Rutoken browser plugin via `signatureService.getCertificates()`.
   - Automatically detects Rutoken hardware tokens and requests device PIN.
   - Calls `signatureService.signData(selectedCert, draft.hash, pinCode, deviceId)` to produce detached PKCS#7 signature (`signatureBase64`).
   - `ensureDraftSavedForSigning` guarantees draft and sterilization tray barcode are persisted and hashed on the server *before* passing `draft.hash` to CryptoPro, ensuring cryptographic consistency.
2. **Simple Electronic Signature (ПЭП / PEP)**:
   - Uses 4-digit staff PIN code (`PIN:XXXX`), verified server-side against `pin_code_hash` of the active practitioner.

#### C. Document Sealing & Lock Ceremony:
- **Backend Route**: `apps/api/src/routes/diary.ts` (`runDiarySigningCeremony` & `POST /api/diaries/:id/lock`)
1. **Concurrency Lock**: `SELECT ... FROM visit_diaries WHERE id = ? FOR UPDATE` prevents double-signing races.
2. **Mandatory ICD-10 Gate (Defect #69)**: Rejects signing with 422 if `diagnosisIcd10` is blank.
3. **Canonical Hash Verification**: Recomputes SHA-256 `diaryHash` over canonical fields:
   $$\text{hash} = \text{SHA256}(\text{visitId} \parallel \text{patientId} \parallel \text{anamnesis} \parallel \text{statusLocalis} \parallel \text{treatmentDescription} \parallel \text{diagnosisIcd10} \parallel \text{diagnosisTooth} \parallel \text{complications} \parallel \text{comorbidities} \parallel \text{trayBarcode})$$
4. **State Transition**: Sets `isLocked = true`, `lockedAt = NOW()`, `lockedByUserId`, `authorId`, `doctorId`, `cryptoSignaturePkcs7`.
5. **Inventory & Treatment Auto-Settlement**: Transitions visit `treatmentItems` to `completed` and logs stock deductions in `inventory_transactions`.
6. **Immutable Forensic Revisions**: Modifications to signed records require `POST /api/diaries/:id/revise` (Admin only), archiving the prior state into `visit_diary_revisions` with a mandatory revision reason.

---

## 2. Requirement R4: DICOM / CT MPR Viewer Precision & Nerve Clearance

### 2.1 3D Segment-to-Segment Shortest Distance Math

- **File**: `apps/web/src/utils/dicom/clinicalImplants.ts` (lines 108–222)
- **Function**: `distanceSegmentToSegment3D(p1: Point3D, p2: Point3D, q1: Point3D, q2: Point3D)`

#### Mathematical Formulation:
Let Segment 1 be $S_1(s) = P_1 + s \mathbf{u}$ for $s \in [0, 1]$, where $\mathbf{u} = P_2 - P_1$ (Implant cylinder axis from tip to neck).  
Let Segment 2 be $S_2(t) = Q_1 + t \mathbf{v}$ for $t \in [0, 1]$, where $\mathbf{v} = Q_2 - Q_1$ (Nerve canal spline segment).  
Let $\mathbf{w}_0 = P_1 - Q_1$.

The squared distance function is:
$$D(s, t) = \|S_1(s) - S_2(t)\|^2 = \|\mathbf{w}_0 + s \mathbf{u} - t \mathbf{v}\|^2$$

Expanding into quadratic form:
$$a = \mathbf{u} \cdot \mathbf{u}, \quad b = \mathbf{u} \cdot \mathbf{v}, \quad c = \mathbf{v} \cdot \mathbf{v}, \quad d = \mathbf{u} \cdot \mathbf{w}_0, \quad e = \mathbf{v} \cdot \mathbf{w}_0$$
$$\det = a c - b^2$$

- **Non-parallel case ($\det \ge \epsilon$)**:
  $$s_N = b e - c d, \quad t_N = a e - b d, \quad s_D = t_D = \det$$
- **Boundary Clamping**:
  - If $s_N < 0 \rightarrow s = 0$, $t = \text{clamp}(e / c, 0, 1)$
  - If $s_N > s_D \rightarrow s = 1$, $t = \text{clamp}((e + b) / c, 0, 1)$
  - If $t_N < 0 \rightarrow t = 0$, $s = \text{clamp}(-d / a, 0, 1)$
  - If $t_N > t_D \rightarrow t = 1$, $s = \text{clamp}((-d + b) / a, 0, 1)$
- **Resulting Closest Points & 3D Euclidean Metric**:
  $$P^* = P_1 + s^* \mathbf{u}, \quad Q^* = Q_1 + t^* \mathbf{v}$$
  $$\text{distance} = \|P^* - Q^*\| = \sqrt{(P^*_x - Q^*_x)^2 + (P^*_y - Q^*_y)^2 + (P^*_z - Q^*_z)^2}$$

---

### 2.2 Clearance Calculation & 4-Level Safety Status Matrix

- **File**: `apps/web/src/utils/dicom/clinicalImplants.ts` (lines 236–310)
- **Function**: `calculateImplantClearance(implant: VirtualImplant): ImplantNerveClearanceResult | null`

#### Geometric Clearance Equation:
$$\text{clearanceMm} = \text{minAxisDistance} - R_{\text{implant}} - R_{\text{nerve}}$$
where $R_{\text{implant}} = \frac{\text{implant.diameter}}{2}$ and $R_{\text{nerve}} = \frac{\text{nerve.diameter}}{2}$ (standard nerve diameter $= 2.0\text{mm}$, radius $= 1.0\text{mm}$).

#### 4-Level Safety Thresholds:
```
                               Surface-to-Surface Clearance (mm)
   COLLISION                 DANGER                 CAUTION                  SAFE
<--------------|----------------------------|----------------------|----------------------->
            <= 0.0 mm                  < 1.5 mm               < 2.0 mm             >= 2.0 mm
```

| Status Badge | Clearance Range | Clinical Meaning | UI Presentation & Action |
|---|---|---|---|
| 🚨 **`COLLISION`** | $\text{clearanceMm} \le 0.0\text{ mm}$ | Implant cylinder directly intersects or penetrates mandibular nerve canal | Flashing Red Alert Badge (`#ef4444`), acoustic/toast warning, blocks guided surgery export |
| ⚠️ **`DANGER`** | $0.0\text{ mm} < \text{clearanceMm} < 1.5\text{ mm}$ | Critical proximity ($< 1.5\text{ mm}$ safety zone), risk of irreversible paresthesia | Solid Red Badge (`#f87171`), warning toast, requires implant length/angle adjustment |
| 🟡 **`CAUTION`** | $1.5\text{ mm} \le \text{clearanceMm} < 2.0\text{ mm}$ | Cautionary proximity ($1.5–2.0\text{ mm}$ buffer zone) | Amber Badge (`#f59e0b`), surgical drill stop advisory |
| 🟢 **`SAFE`** | $\text{clearanceMm} \ge 2.0\text{ mm}$ | Full anatomical clearance ($\ge 2.0\text{ mm}$ standard safety margin) | Emerald Badge (`#22c55e`), confirmed safe trajectory |

---

### 2.3 MPR Synchronized Crosshair Panning, Volumetric HU Sampling & Curved MPR Unwrap

1. **Synchronized 3-Plane MPR Viewports**:
   - Managed in `apps/web/src/components/dicom/Cornerstone3DViewer.tsx` via Cornerstone3D `RenderingEngine("my-engine")`.
   - Viewports: `AXIAL` (red), `SAGITTAL` (green), `CORONAL` (blue).
   - Crosshair synchronization: `cornerstoneTools.CrosshairsTool` is bound to Primary mouse button across all viewports. Panning in any viewport translates the 3D focal point and updates the other two orthogonally.
2. **Volumetric HU Density Sampling**:
   - `trilinearInterpolate(scalarData, dimensions, x, y, z)` in `mprMath.ts:460–504` evaluates exact Hounsfield Units within volume voxels.
   - `calculateImplantBoneDensity` samples a 3D cylindrical region around the implant axis with a $1.0\text{mm}$ thread buffer, returning average HU and Misch classification.
   - `cornerstoneTools.ProbeTool` allows interactive point HU density measurement under the cursor.
3. **Panoramic Curved MPR Unwrap**:
   - `PanoramicRendererWindow.tsx` & `mprWorker.ts`: Offloads raycasting to a dedicated Web Worker via transferable `ArrayBuffer` (`toTransferableScalarData`).
   - Traces centripetal Catmull-Rom curve from axial `SplineROITool` annotations (`panoramicArch.ts`).
   - Supports adjustable slab thickness ($0–20\text{mm}$) with Maximum Intensity Projection (`MIP`) or Average intensity blending.

---

### 2.4 Bone Quality Engine (Misch Classification D1–D4 & Drilling Sequence)

- **File**: `apps/web/src/utils/dicom/boneQualityEngine.ts` and `apps/web/src/components/dicom/BoneQualityPanel.tsx`
- **Misch Bone Density Categories**:
  - **`D1`** ($\ge 850\text{ HU}$): Dense cortical bone (typically anterior mandible). Requires cortical bone tap (`corticalTapRequired: true`).
  - **`D2`** ($500–849\text{ HU}$): Thick porous cortical & coarse trabecular (anterior/posterior mandible, anterior maxilla). Standard drilling sequence.
  - **`D3`** ($225–499\text{ HU}$): Thin porous cortical & fine trabecular (posterior mandible, maxilla).
  - **`D4`** ($< 225\text{ HU}$): Fine trabecular / very soft bone (posterior maxilla). Applies underdrilling protocol (`underdrillingApplied: true`, drill 1 step narrower than implant diameter for primary stability).
- **Supported Implant Systems**: Osstem (TS III/IV), Straumann (BLX/BLT), Nobel Biocare (Active/Parallel), Bredent (SKY), MDI Mini Implants.

---

## 3. Component Architecture & File Registry

```
apps/web/src/
├── lib/
│   ├── clinicalProtocols043.ts          # Core R3: FDI nomenclature & SOAP generators
│   └── clinicalProtocols043.test.ts     # R3 unit tests (FDI mapping, SOAP generation, merge)
├── components/
│   ├── VisitDiaryEditor.tsx             # R3: Clinical diary editor, Form 043/u print sheet
│   ├── useVisitDiaryLogic.ts            # R3: SOAP store, autosave, UKEP/PEP lock, revisions
│   ├── VisitDiaryTemplateSelector.tsx   # R3: Template selector, seed & custom templates
│   ├── VisitDiaryPhotoUpload.tsx        # R3: Photo attachments in Form 043/u
│   ├── visit/
│   │   ├── CryptoProSigner.tsx          # R3: UKEP (CryptoPro/Rutoken) & PEP PIN modal
│   │   ├── VisitOdontogramTab.tsx       # R3: Odontogram + VisitDiaryEditor co-location
│   │   └── VisitEmkTab.tsx              # R3: EMK visit notes integration
│   ├── odontogram/
│   │   ├── OdontogramModule.tsx         # R3: Interactive FDI tooth chart (11-48, 51-85)
│   │   ├── ToothChart.tsx               # R3: SVG tooth geometry & surfaces
│   │   └── PeriodontalChartModule.tsx   # R3: Periodontal pocket depth tracking
│   └── dicom/
│       ├── Cornerstone3DViewer.tsx      # R4: 3-viewport MPR viewer & implant placement
│       ├── PanoramicRendererWindow.tsx  # R4: Curved MPR panoramic unwrap window
│       ├── BoneQualityPanel.tsx         # R4: Misch D1-D4 HU quality & drilling protocol
│       ├── ctPlanningPersistence.ts     # R4: CT markup persistence (studyInstanceUID)
│       └── panoramicArch.ts             # R4: Catmull-Rom spline arch mathematical model
├── utils/
│   ├── dicom/
│   │   ├── clinicalImplants.ts          # R4: distanceSegmentToSegment3D & clearance math
│   │   ├── clinicalImplants.test.ts     # R4: Nerve collision mathematical test suite
│   │   ├── boneQualityEngine.ts         # R4: HU extraction & Misch drill protocols
│   │   ├── boneQualityEngine.test.ts    # R4: Bone quality unit tests
│   │   └── fdiMapper.ts                 # R4: CT coordinate to FDI tooth mapper
│   └── math/
│       ├── mprMath.ts                   # R4: Trilinear interpolation, Catmull-Rom splines
│       └── mprMath.test.ts              # R4: Mathematical interpolation tests
└── styles/
    ├── visit-diary-043.css              # R3: Form 043/u print styling & responsive matrix
    └── dente-redesign.css               # Semantic design token styling
```

---

## 4. Gap Analysis & Technical Recommendations

| Area | Current State | Potential Risk / Gap | Recommendation |
|---|---|---|---|
| **R3: Odontogram $\rightarrow$ Diary Direct Action** | `useVisitDiaryLogic` exports `applyOdontogramFinding` and `applySoapProtocol`, but they are called programmatically rather than via a dedicated button in the odontogram toolbar. | Doctors manually copy findings or switch between tabs if they want to push a specific tooth condition into SOAP. | Add a direct action button «Сформировать SOAP в дневник» in `OdontogramModule` toolbar and tooth context menu to trigger `applyOdontogramFinding` directly. |
| **R4: Visual Clearance Badge Granularity** | `Cornerstone3DViewer.tsx` checks `distanceToNerve < 2.0` (binary alert in protocol box), while `clinicalImplants.ts` calculates 4 exact states (`SAFE`, `CAUTION`, `DANGER`, `COLLISION`). | In 3D viewer HUD, the doctor sees a binary warning instead of the 4-level colored badge with exact millimetric clearance. | Render an explicit clearance status pill in the 3D implant card displaying the exact `status` (`SAFE`, `CAUTION`, `DANGER`, `COLLISION`) and clearance in mm. |
| **R3: Form 043/u Print Preview** | `PrintPreviewContent` in `VisitDiaryEditor.tsx` renders full Form 043/u with electronic signature stamps and photos. | Unlocked drafts must not print as legal certified cards. | Retain and enforce `printBlockedReason` when `!isLocked` to maintain legal document compliance. |

---

## 5. Verification & Proof Commands

### Unit Tests Verification:
```bash
# Run all R3 and R4 related unit test suites
npm test -w @dental/web -- --test-name-pattern="clinical|fdi|implant|mpr|043|bone"
```
*Result*: 1,319 tests passed (0 failures).

### Typecheck Verification:
```bash
# Full monorepo typecheck
npm run typecheck
```

### Encoding & Iron Gate Verification:
```bash
# Verify UTF-8 integrity and no mojibake
npm run check:encoding
```

---
*Report compiled by survey explorer subagent `survey_explorer_2`.*
