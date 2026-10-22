# EGISZ REMD & FNS Tax Deduction Modules Architectural Decomposition Report

> **Standard:** Mandate 8b ($\le 120$ lines per file), Mandate 8e (Doctor Autonomy & Non-blocking Outbox Queue), Mandate 8x & 8ap (Clinical Terminology, Zero Regulatory Slang in UI), Apple HIG Touch Ergonomics (390×844 Mobile Sheet, Natural Thumb Zone).

---

## 1. Executive Summary & Verification Gates

- **Total Files in `apps/web/src/components/egisz/`:** 105 files.
- **Files Exceeding 120 Lines:** **0 files** (100% compliant with Mandate 8b).
- **Test Suite Results:** **82 passing tests, 0 failing, 0 skipped** (`node --max-old-space-size=2048 --import tsx --import ./apps/web/testCssStub.mjs --test "apps/web/src/components/egisz/__tests__/*.test.ts" "apps/web/src/components/egisz/__tests__/*.test.tsx"`).
- **TypeScript Compilation:** Zero errors in `apps/web/src/components/egisz/`.
- **4-State Visual Proof Inspected via `read_file`:**
  - ☀️ PC Light (1440×900)
  - 🌙 PC Dark (1440×900)
  - 📱 Mobile Light (390×844)
  - 📱 Mobile Dark (390×844)

---

## 2. Decomposed Subsystem Architecture

### 2.1 CDA R2 XML Builder & Legal Standards (`cdaR2/`)
- `cdaHeaderBuilder.ts` (87 lines): Clinical CDA header, Custodian OID, Author/LegalAuthenticator blocks.
- `cdaTypes.ts` (99 lines): Strongly-typed interfaces for CDA R2 schemas.
- `dentalCdaSections.ts` (104 lines): Structured dental sections (Complaints, Anamnesis, Diagnoses, Procedures).
- `dentalCdaXmlGenerator.ts` (93 lines): Root XML assembly for SEMD 101, 102, 105, 302, 303.
- `dentalFormulaCdaSection.ts` (51 lines): FDI tooth formula XML section.
- `fnsTaxCertificateXmlGenerator.ts` (87 lines): FNS КНД 1151156 XML generator.
- `fnsTaxTypes.ts` (50 lines): FNS Tax Deduction types and validation rules.
- `gostSignatures.ts` (112 lines): ГОСТ Р 34.10-2012 signature containers and ГОСТ Р 7.0.97-2016 visual stamps.
- `kopeckMath.ts` (27 lines): Float-free integer kopeck calculations.
- `xmlStructureValidator.ts` (98 lines): Tag balancing and canonical W3C C14N validation.
- `cdaR2XmlBuilder.ts` (45 lines): Thin facade preserving 100% backward-compatible exports.

### 2.2 Semantic CDA Validator Engine (`cdaValidator/`)
- `cdaXmlHeaderParticipant.ts` (107 lines)
- `cdaXmlProceduresAndFormula.ts` (67 lines)
- `semanticRulesEngine.ts` (35 lines)
- `semanticRulesHeaderMo.ts` (57 lines)
- `semanticRulesPatientClinical.ts` (81 lines)
- `validatorDocTypes.ts` (71 lines)
- `validatorTypes.ts` (79 lines)
- `validatorXmlGenerator.ts` (106 lines)
- `egiszCdaValidator.ts` (20 lines): Thin facade.

### 2.3 Preflight Engine (`engine/`)
- `clinicalPreflightClinicalSig.ts` (74 lines)
- `clinicalPreflightEngine.ts` (33 lines)
- `clinicalPreflightMoDocPat.ts` (111 lines)
- `egiszFilenames.ts` (23 lines)
- `engineTypes.ts` (33 lines)
- `fnsTaxPreflightEngine.ts` (100 lines)
- `egiszRemdEngine.ts` (83 lines): Thin facade.

### 2.4 REMD Presets & Dictionaries (`remdXml/`)
- `remdDefaultPresets.ts` (43 lines)
- `remdDentalDictionaries.ts` (92 lines)
- `remdOidsAndTypes.ts` (118 lines)
- `remdStatutoryValidators.ts` (79 lines)
- `egiszRemdPresets.ts` (37 lines): Thin facade.

### 2.5 Tab Panels (`tabs/`)
- `signing/`: `SigningActionButtons.tsx` (58), `SigningAuxActions.tsx` (53), `SigningCertSelector.tsx` (107), `SigningHeader.tsx` (56), `SigningMainActions.tsx` (104), `SigningStampPreview.tsx` (79), `signingTabTypes.ts` (43), `EgiszSigningTab.tsx` (92).
- `journal/`: `JournalHeaderActions.tsx` (75), `JournalRecordsTable.tsx` (90), `JournalRemediationCard.tsx` (43), `JournalStatsRibbon.tsx` (84), `JournalTableRow.tsx` (83), `journalTypes.ts` (41), `EgiszJournalTab.tsx` (67).
- `clinical/`: `clinicalTabTypes.ts` (34), `ClinicalDiagnosesAndProcedures.tsx` (118), `ClinicalMetaAndAnamnesis.tsx` (82), `ClinicalToothFormulaSection.tsx` (82), `EgiszClinicalTab.tsx` (72).
- `xmlPreview/`: `xmlPreviewTabTypes.ts` (33), `XmlClinicalContentSections.tsx` (70), `XmlCodeViewer.tsx` (32), `XmlHeaderParticipantsSections.tsx` (100), `XmlPreviewToolbar.tsx` (104), `XmlStructureSectionsTree.tsx` (61), `EgiszXmlPreviewTab.tsx` (63).
- `fnsTax/`: `fnsTaxTabTypes.ts` (33), `FnsTaxMetaSection.tsx` (66), `FnsTaxpayerPatientSection.tsx` (96), `FnsTaxPaymentsTable.tsx` (118), `EgiszFnsTaxTab.tsx` (81).
- `EgiszPreflightTab.tsx` (98 lines).

### 2.6 Journal Persistence & Data Mappers (`journalData/`)
- `journalDataTypes.ts` (78 lines)
- `journalDataFixtures.ts` (41 lines)
- `outboxRowMapper.ts` (114 lines)
- `egiszJournalData.ts` (16 lines): Thin facade.

### 2.7 Network Transmission & ZIP Export (`packageSender/`)
- `packageSenderTypes.ts` (48 lines)
- `remdZipExporter.ts` (86 lines)
- `deferredRemdRecord.ts` (52 lines)
- `remdApiSubmissions.ts` (96 lines)
- `egiszPackageSender.ts` (24 lines): Thin facade.

### 2.8 CryptoPro CSP & UKEP Hook (`cryptoPro/`)
- `cryptoProTypes.ts` (35 lines)
- `detachedSigParser.ts` (64 lines)
- `certValidator.ts` (47 lines)
- `useCertList.ts` (45 lines)
- `useCryptoProSigning.ts` (98 lines): Thin coordinator.

### 2.9 Domain Payload & Preflight Hook (`remdState/`)
- `remdStateTypes.ts` (19 lines)
- `useClinicalSemdState.ts` (69 lines)
- `useFnsTaxState.ts` (64 lines)
- `useEgiszRemdState.ts` (87 lines): Thin coordinator.

### 2.10 Main Modal HUD (`modal/` and `EgiszRemdHubModal.tsx`)
- `modalTypes.ts` (30 lines)
- `modalBodyTypes.ts` (38 lines)
- `EgiszRemdModalHeader.tsx` (89 lines)
- `EgiszRemdModalNav.tsx` (89 lines)
- `EgiszRemdModalFooter.tsx` (89 lines)
- `EgiszRemdModalBody.tsx` (85 lines)
- `useJournalRecords.ts` (73 lines)
- `useEgiszModalController.ts` (89 lines)
- `EgiszRemdHubModal.tsx` (114 lines): Thin facade with Mandate 8e non-blocking warning banner.

---

## 3. Clinical & Ergonomic Compliance Verification

1. **Mandate 8e (Doctor Autonomy):**
   - No primary buttons ("Отправить в Минздрав", "Отложить отправку", "Печать", "1-Клик Валидация") are disabled by missing CryptoPro or missing UKEP.
   - Non-blocking banner is displayed when CryptoPro is not detected: *"Криптопровайдер не обнаружен, документ сохранен в черновики бэкофиса"*.
   - Async background outbox queue pattern allows the doctor to finish consultations and billing without waiting for state gateways.

2. **Mandate 8x & 8ap (Anti-Jargon):**
   - Elimination of Soviet regulatory codes in UI:
     - "Форма 043/у" $\to$ "Медицинская карта приёма"
     - "Справка об оплате мед. услуг для ИФНС" $\to$ "Справка для налогового вычета"
     - "Касса 54-ФЗ" $\to$ "Касса и чеки"

3. **Apple HIG Touch Ergonomics:**
   - On screens $\le 768\text{px}$, modal renders as native Bottom Sheet with tactile drag handle (`egisz-mobile-drag-handle`).
   - Touch targets $\ge 44\times 44\text{px}$ across all buttons and tabs.
   - Fixed Floating Bottom Bar with primary CTA in the Natural Thumb Zone.
