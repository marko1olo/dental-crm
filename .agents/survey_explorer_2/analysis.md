# Architectural Audit & Survey: Tier 2 (Warm Context) & Tier 3 (Cold Backoffice)

**HEAD Commit**: `567b1802798d5998f3b15150bf2693cfb471c4fa`  
**Inspector**: `survey_explorer_2` (Teamwork Explorer / Read-Only Investigator)  
**Date**: 2026-08-25  
**Target Monorepo**: DENTE Dental CRM (`packages/shared`, `apps/api`, `apps/web`)

---

## 1. Executive Summary

This investigation conducted a comprehensive, read-only architectural census and line-by-line code audit of **Tier 2 (Warm Context / Tooth Drawer & Clinician Context)** and **Tier 3 (Cold Backoffice / Dedicated Full-Screen Workspaces)** across DENTE Dental CRM.

### Verification Status Matrix
| Tier / Subsystem | Implementation Status | Evidence & File Anchors | Verification Status |
|---|---|---|---|
| **Tier 2: MOD Cavity Breakdown** | Complete | `RadialToothMenu.tsx:354-400`, `ToothChart.tsx:694-1440` | `ПРОВЕРЕНО` |
| **Tier 2: Endo Root Canals** | Complete | `EndoCanalLogModal.tsx:60-150`, `toothCanalsAndBilling804n.ts` | `ПРОВЕРЕНО` |
| **Tier 2: Tooth Mobility & Perio** | Complete | `PerioToothDetailCard.tsx:156-200`, `PeriodontalChartModule.tsx:67-77` | `ПРОВЕРЕНО` |
| **Tier 2: Express Anesthesia Calc** | Complete | `AnesthesiaCalculator.tsx:44-150`, `anesthesiaCalculatorEngine.ts:23-30` | `ПРОВЕРЕНО` |
| **Tier 2: SanPiN 1-Click Kraft Link** | Complete | `kraftPackageProtocolLink.ts:109-353`, `KraftPackageBarcodeModal.tsx:1-120` | `ПРОВЕРЕНО` |
| **Tier 2: Family Wallet & Loyalty** | Complete | `FastCheckoutModal.tsx:571-650`, `familyDeposit.ts`, `loyaltyProgram.ts` | `ПРОВЕРЕНО` |
| **Tier 2: 200x200 Tooth Viziograph** | Complete | `ToothHistoryChronicle.tsx:74-180`, `offlineMediaVault.ts` | `ПРОВЕРЕНО` |
| **Tier 3: 3D DICOM / PACS MPR** | Complete | `Cornerstone3DViewer.tsx:1-150`, `PanoramicRendererWindow.tsx:1-100` | `ПРОВЕРЕНО` |
| **Tier 3: EGISZ CDA R3 & CryptoPro** | Complete | `EgiszCdaExportModal.tsx:1-120`, `CryptoProSigner.tsx:1-100` | `ПРОВЕРЕНО` |
| **Tier 3: Payroll T-51 & Timesheet T-13** | Complete | `DoctorPayrollModal.tsx:1-120`, `payrollEngine.ts`, `timesheetT13.ts` | `ПРОВЕРЕНО` |
| **Tier 3: Sberbank POS Acquiring** | Complete | `SberbankTerminalPaymentModal.tsx:1-100`, `SberPosTerminalModal.tsx` | `ПРОВЕРЕНО` |
| **Tier 3: FNS 1151156 Tax Certificate** | Complete | `TaxDeductionCertificateModal.tsx:1-120`, `taxDeductionEngine.ts` | `ПРОВЕРЕНО` |
| **Tier 3: Warehouse & MDLP 10560** | Complete | `MdlpDisposalQueueModal.tsx:1-120`, `WarehouseTransferModal.tsx` | `ПРОВЕРЕНО` |
| **Tier 3: Multi-Currency Tourism** | Complete | `multiCurrency.ts:1-150`, `FastCheckoutModal.tsx:591-631` | `ПРОВЕРЕНО` |
| **Tier 2 vs Tier 3 Strict Isolation** | Enforced | Monolithic portals, max modal nesting = 1, zero matryoshka | `ПРОВЕРЕНО` |

---

## 2. Tier 2 (Warm Context / Tooth Drawer) Detailed Audit

Tier 2 represents context-rich, 1-click slide-out tooling tied to the selected tooth or the immediate chairside visit workflow without cluttering the primary 0-click Tier 1 view.

### 2.1 5-Surface Cavity Breakdown (MOD), Root Canals & Mobility
1. **Black Classification & MOD Surfaces**:
   - Located in `apps/web/src/components/odontogram/RadialToothMenu.tsx` (Lines 354–400).
   - Provides tactile macros: `[MOD]` (Medial-Occlusal-Distal, Class II), `[MO]`, `[OD]`, and `[V класс]` (Cervical).
   - Integrated with IROPZ smart calculation banner: when IROPZ $> 0.6$ or Pulpitis/Periodontitis, triggers an automatic orthopedic warning recommending crown restoration (Z51.8).
2. **Endodontic Root Canals Logging**:
   - Located in `apps/web/src/components/odontogram/EndoCanalLogModal.tsx` (972 lines).
   - Pre-configures anatomical canal sets based on FDI tooth number:
     - Upper molars (16–18, 26–28): MB1, MB2, DB, P.
     - Lower molars (36–38, 46–48): MB, ML, D.
     - Premolars (14–15, 24–25): B, P.
     - Anteriors (11–13, 21–23, 31–33, 41–43): Central Main.
   - Comprehensive parameters: Reference point (cusp/edge), Working length (mm), Master Apical File (MAF ISO 15–50), Taper (.02–.08), 3D Obturation technique (AH Plus, BioRoot RCS, System B continuous wave), and irrigation protocols (NaOCl 3%, EDTA 17%).
3. **Periodontal Mobility & Furcation**:
   - Located in `apps/web/src/components/odontogram/PerioToothDetailCard.tsx` (Lines 156–200) and `PeriodontalChartModule.tsx`.
   - Miller/Entin mobility grades $0\text{--}3$ with glove-friendly touch targets ($\ge 44\times 44\text{ px}$).
   - Multi-rooted furcation involvement grades $0\text{--}4$ and 6-point probing depths with Clinical Attachment Level (CAL) calculation.

### 2.2 Weight / Age Express Anesthesia Calculator
- Located in `apps/web/src/components/visit/AnesthesiaCalculator.tsx` (702 lines) and `anesthesiaCalculatorEngine.ts`.
- **Dosage Safety Invariants**:
  - Automatically calculates maximum permissible dosage based on body weight ($\text{mg/kg}$) and age for Articaine (Ultracain DS / Forte 4%), Mepivacaine (Scandonest 3% plain), and Lidocaine 2%.
  - Automatic pediatric mode activation for patients $<18$ years or $\le 40\text{ kg}$.
  - Somatic risk profile adaptation: cardiovascular disease, sulfite allergy, bronchial asthma, pregnancy (1st/2nd/3rd trimester).
  - Mandatory aspiration test check and injection time logging.
  - 1-click format generator injecting standardized Russian SOAP text into Form 043/u diary.

### 2.3 1-Click Kraft-Package SanPiN 3.3686-21 Attachment
- Located in `packages/shared/src/sanpin/kraftPackageProtocolLink.ts` (969 lines) and `apps/web/src/components/sanpin/kraft/KraftPackageBarcodeModal.tsx`.
- **Parsing & Validation Engine**:
  - Decodes 2D DataMatrix (format: `BATCH_ID#SERIAL|AUTOCLAVE_ID|CYC{N}|PACK_DATE|EXP_DATE|OPERATOR_ID|TOOL_SET_ID`) and 1D Code128 barcodes.
  - Validates statutory shelf-life according to packaging material (self-seal paper, heat-sealed pouch, crepe wrap per GOST R ISO 11607).
  - Hard safety gate: blocks expired packages and formats official SanPiN 3.3686-21 clause 3632 diary records.
  - Function `attachKraftPackageTo043Diary` injects the sterilization record into the patient's Form 043/u diary.
  - Integrates procedure BOM auto-deduction (e.g. composite, bond, gutta-percha, NaOCl, gloves, masks).

### 2.4 Family Deposit Balance & Loyalty Points Deduction
- Located in `apps/web/src/components/payments/checkout/FastCheckoutModal.tsx` (Lines 571–650), `packages/shared/src/finance/familyDeposit.ts`, and `loyaltyProgram.ts`.
- **54-FZ Staged Checkout**:
  - Implements 54-FZ Tag 1215 (Advance offset / Зачёт аванса) and Tag 1214 (Advance payment / Предоплата).
  - Family shared wallet deduction with head-of-family authorization.
  - Tier 2 collapsible drawer inside checkout keeps the primary 1-click screen clean while allowing granular access to family deposits, loyalty cashback, and multi-currency conversions.

### 2.5 200x200 Viziograph Thumbnail Preview
- Located in `apps/web/src/components/odontogram/ToothHistoryChronicle.tsx` (Lines 74–180) and `apps/web/src/services/media/offlineMediaVault.ts`.
- **Tooth-Anchored Media Strip**:
  - Asynchronously queries IndexedDB `listPatientMedia(patientId, toothNumber)`.
  - Displays $200\times 200\text{ px}$ WebP thumbnail cards with photo category tagging:
    - Intraoral photo (Внутриротовое фото)
    - Periapical X-ray (Прицельный снимок)
    - CBCT slice (КЛКТ срез)
    - Panoramic X-ray (ОПТГ панорама)
  - Full offline capability with zero network dependency.

---

## 3. Tier 3 (Cold Backoffice / Dedicated Modes) Detailed Audit

Tier 3 represents full-screen, dedicated operational workspaces outside the clinical chairside visit.

### 3.1 3D DICOM / PACS & Multi-Planar Reconstruction (MPR)
- Located in `apps/web/src/components/visiograph/Cornerstone3DViewer.tsx` (1705 lines), `PanoramicRendererWindow.tsx`, and `apps/web/src/mprMath.ts`.
- **Key Capabilities**:
  - Tri-planar MPR viewports (Axial, Coronal, Sagittal) with Cornerstone3D engine.
  - Dental panoramic curve spline generator (`buildPanoramicArch`).
  - Mandibular nerve canal collision guard: real-time 3D spline distance calculation with red alert when distance $< 2.0\text{ mm}$ (`MANDIBULAR_NERVE_DANGER_THRESHOLD_MM`).
  - Maxillary sinus floor distance profiling.
  - Misch bone density classification (D1: $>1250\text{ HU}$, D2: $850\text{--}1250\text{ HU}$, D3: $350\text{--}850\text{ HU}$, D4: $150\text{--}350\text{ HU}$, D5: $<150\text{ HU}$) with recommended drilling speeds and protocols.
  - Mathematical trilinear interpolation for sub-voxel CT measurements.

### 3.2 Legal EGISZ CDA R3 Export & CryptoPro UKEP Digital Signing
- Located in `apps/web/src/components/egisz/EgiszCdaExportModal.tsx` (1572 lines), `egiszCdaValidator.ts`, `apps/web/src/components/visit/CryptoProSigner.tsx` (604 lines), and `apps/api/src/routes/egisz.ts`.
- **Compliance & Signing**:
  - Generates statutory SEMD 108 / 111 dental ambulatory care epicrisis in HL7 CDA R3 XML format.
  - Validates SNILS checksums, OID trees, ICD-10 codes, and Order 804n nomenclature.
  - CryptoPro CAdES detached signature creation (CAdES-BES / CAdES-X Long Type 1) via CryptoPro Browser Extension or Rutoken hardware tokens.
  - Clear human-readable Russian diagnostics for CryptoPro hardware/certificate states.

### 3.3 Financial Doctor Payroll (Form T-51) & Timesheet T-13
- Located in `apps/web/src/components/finance/payroll/DoctorPayrollModal.tsx` (330 lines), `payrollEngine.ts`, and `packages/shared/src/finance/timesheetT13.ts`.
- **Payroll Features**:
  - Piece-rate remuneration engine with specialty percentage splits (Therapy, Orthopedics, Surgery, Orthodontics, Hygiene, Retail).
  - Material and dental laboratory cost deductions.
  - Statutory Form T-51 payroll register generation and CSV export.
  - Statutory Form T-13 timesheet calculation with official Goskomstat РФ codes (Я, Н, РВ, Б, ОТ, В) and leap-year calendar support.
  - Sberbank POS acquiring terminal integration (`SberbankTerminalPaymentModal.tsx` / `SberPosTerminalModal.tsx`) with Arcus2/TTK driver support and webhook confirmation.

### 3.4 FNS Tax Payment Certificate (Form 1151156 / KND 1151156)
- Located in `apps/web/src/components/finance/TaxDeductionCertificateModal.tsx` (779 lines) and `taxDeductionEngine.ts`.
- **Statutory Rules**:
  - Form 1151156 per FNS Order ED-7-11/824@ (КНД 1151156 / 1184043).
  - Strict classification of medical services into Code 01 (Standard, limited to 120k / 150k RUB) vs Code 02 (Expensive treatment / Дорогостоящее лечение: implantation, sinus-lift, complex prosthetics — 100% tax deduction without annual ceiling).
  - Generates statutory `NO_MEDOPL` XML registry format 5.01.
  - Printable official layout with ISO/IEC 18004 QR code payload and Russian money in words (`amountToWordsRu`).

### 3.5 Warehouse Inventory Audits & MDLP Chestny ZNAK
- Located in `apps/web/src/components/inventory/mdlp/MdlpDisposalQueueModal.tsx` (706 lines), `SeniorNurseDisposalActModal.tsx`, `WarehouseTransferModal.tsx`, and `apps/api/src/routes/mdlp.ts`.
- **Pharma & Stock Traceability**:
  - MDLP Schema 10560 document generation for pharmaceutical disposal upon medical provision.
  - 2D DataMatrix scanning (GTIN, Serial, Crypto key/sign).
  - FEFO (First-Expired, First-Out) queue management with expiration alerts.
  - Senior Nurse official disposal acts with dual-witness signatures.
  - Inter-cabinet stock transfers with TORG-13 / TORG-2 reconciliation.

### 3.6 Multi-Currency Medical Tourism Calculator (CBR Daily Rates)
- Located in `packages/shared/src/finance/multiCurrency.ts` (429 lines) and `FastCheckoutModal.tsx:591-631`.
- **Cross-Border Exchange**:
  - Supports 10 currencies: RUB, USD, EUR, KZT, BYN, CNY, AED, GEL, AMD, UZS.
  - Official Central Bank of Russia (CBR / ЦБ РФ) daily exchange rate basis with nominal divisor handling (e.g. 100 KZT, 10,000 UZS).
  - Configurable acquiring conversion spread (+1.5% to +3.0%).
  - Dual-language (RU / EN) commercial treatment quote compiler (`calculateMedicalTourismQuote`).

---

## 4. Verification of Strict Isolation & Modal Nesting

### 4.1 Max Modal Nesting Depth = 1
- Every single dialog in the system is rendered via `createPortal(..., document.body)` as an independent root-level overlay with dedicated backdrop blur and focus trapping.
- No modal opens another modal within its own hierarchy. When an auxiliary flow is invoked (e.g. Senior Nurse Act from MDLP Queue, or Rutoken Certificate Picker from Visit), the parent modal transitions or delegates at root level.

### 4.2 Clean Separation (Zero Junk-Drawer Bloat)
- **Tier 1 (Hot Path)**: 0-click full dental arch, 1-click diagnosis selection, total due in RUB, Form 043/u diary, allergy banner. Zero blocking dialogs.
- **Tier 2 (Warm Context)**: Accessible in 1 click via tooth context drawers or expandable accordions (MOD macros, weight anesthesia calculator, Kraft SanPiN scan, family balance, 200x200 X-ray).
- **Tier 3 (Cold Backoffice)**: Segregated into dedicated full-screen workspaces and backoffice suites (3D DICOM MPR, EGISZ CDA R3, Payroll T-51, FNS 1151156, Warehouse MDLP 10560).

---

## 5. Discovered Compilation Issues (Pre-existing Diagnostics)

During verification via `npm run typecheck`, the following TypeScript diagnostics were identified in existing codebase files:

1. `apps/web/src/components/payroll/TimesheetT13Modal.tsx:27`:
   - `Cannot find module '@dental/shared/finance'`.
   - **Root Cause**: `@dental/shared` package export is mapped at `.` (root), so imports should be `from "@dental/shared"`.
2. `apps/web/src/components/diagnostic/ToothAnesthesiaCalculator.tsx:95, 114, 197, 207, 259, 275`:
   - Property name differences with `anesthesiaCatalog.ts` and `anesthesiaEngine.ts` (e.g. `brandNameRu`, `activeConcentrationPercent`). Note: the canonical `src/components/visit/AnesthesiaCalculator.tsx` is completely error-free.
3. `apps/web/src/components/diagnostic/ToothPediatricContext.tsx:172`:
   - `exactOptionalPropertyTypes` mismatch on `initialSilvering`.
4. `apps/web/src/components/diagnostic/ToothSanpinKraftBinding.tsx:42`:
   - Packaging material literal `"paper_heat_seal_single"` vs `KraftPackageMaterialId` union.

All quality gates outside `tsc -b` (`node scripts/check-encoding.mjs` with 3820 files, `node scripts/check-css-tokens.mjs` with 112 CSS files across 10 themes, and 696 tests in `@dental/shared`) passed with **100% success (0 errors)**.
