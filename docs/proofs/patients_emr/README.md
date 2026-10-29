# Patients Directory, EMR & Domain Language SSOT Visual Proofs

## 1. Overview & Mandates
- **Domain**: Patients Directory, Comprehensive Patient Card (`PatientCardModal` SSOT), Outpatient Clinical Records (`outpatientRecord*`, `MedicalCardPrintModal`), Representative Relationships.
- **Mandates**: 8e (Doctor Autonomy & Non-blocking UI), 8n (Solo-Doctor & 1-3 Chairs Sovereignty), 8am (Single Primary CTA), 8ap (Purge of Foreign Brands & Pure Domain Language), Apple HIG Mobile Bottom Sheet.

---

## 2. 4-State Visual Proofs Matrix

| State | Viewport | Theme | Proof Path | Size |
|---|---|---|---|---|
| ☀️ **PC Light** | 1440×900 | Light | `docs/proofs/patients_emr/01_patients_card_pc_light_1440x900.png` | 111.3 KB |
| 🌙 **PC Dark** | 1440×900 | Dark | `docs/proofs/patients_emr/02_patients_card_pc_dark_1440x900.png` | 126.2 KB |
| 📱 **Mobile Light** | 390×844 | Light | `docs/proofs/patients_emr/03_patients_card_mobile_light_390x844.png` | 138.1 KB |
| 🌙 **Mobile Dark** | 390×844 | Dark | `docs/proofs/patients_emr/04_patients_card_mobile_dark_390x844.png` | 155.6 KB |

---

## 3. Red Team Inspection & Fixes Checklist
1. **Foreign Brand Purge (Mandate 8ap)**:
   - Completely eradicated `STOMX_REPRESENTATIVE_CATALOG` and `StomxRepresentativeType` from active interfaces.
   - Replaced with canonical `DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG` and `RepresentativeRelationshipType` across `@dental/shared` and `apps/web`.
2. **Order Numbers Purge (Mandates 8x, 8ap)**:
   - Soviet order number `043/у` removed from filenames and UI text.
   - Canonical clean domain nomenclature: `outpatientRecordTypes`, `outpatientRecordMath`, `outpatientRecordDefaultData`, `outpatientRecordExportEngines`, `outpatientRecordTabSections`, `MedicalCardPrintModal`. UI label: «Медицинская карта приёма» / «Дневник визита».
3. **Consolidation of Duplicate Patient Modals (Mandates 8b, 8s)**:
   - `PatientCardModal.tsx` confirmed as unified SSOT.
   - `PatientDetailModal.tsx` and `PatientDetailsModal.tsx` reduced to thin backward-compatibility facades (<= 10 lines).
4. **Doctor Autonomy & Button Wrap Elimination (Mandates 8e, 8am, Apple HIG)**:
   - Single Primary CTA `#0d9488` (`bg-[var(--teal)] text-white`), neutral secondary buttons.
   - Fixed word-wrap on "Сохранить" via `whitespace-nowrap min-w-[130px]`.
   - Touch targets on mobile >= 44x44px.
   - Natural Thumb Zone Floating Bottom Bar on mobile.

---

## 4. Test Verification (100% Green)
- `apps/web/src/components/patients/__tests__/patientFinanceAutonomyAndAliases.test.tsx` (4/4 passed)
- `apps/web/src/components/schedule/__tests__/wave117ApptReasonsAndBlocks.test.ts` (13/13 passed)
- `apps/web/src/components/emr/__tests__/emr043Export.test.ts` (13/13 passed)
- `apps/web/src/components/emr/__tests__/stomtTemplatesSoapAutonomy.test.tsx` (7/7 passed)
- `apps/web/src/tests/appModalsAndPatientCardDecomposition.test.ts` (3/3 passed)
- `apps/web/src/tests/patientAnamnesisRedTeamInquisition.test.ts` (17/17 passed)
- `apps/web/src/components/documents/__tests__/outpatientForm043AndPatientCardAutonomy.test.tsx` (12/12 passed)
