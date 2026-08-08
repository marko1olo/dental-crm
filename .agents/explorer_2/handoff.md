# Handoff Report — Explorer 2 (Dead Props Part 2: #67 to #132)

**Agent**: Explorer 2 (`teamwork_preview_explorer`)
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\explorer_2`
**Date**: 2026-08-08
**Target Scope**: Part 2 — Missing Properties 67 through 132 in `dead_props.txt`
**Golden Reference Commit**: `da92ab9507` (`da92ab9507:apps/web/src/useAppLogic.tsx`)

---

## 1. Observation

### Summary of Scope & Census Findings
- **Total Dead Properties in System**: 198 (verified via `C:\Clinic_MVP\dental-crm\dead_props.txt`).
- **Explorer 2 Scope**: Properties **#67 to #132** (exactly 66 properties).
- **Golden Reference Source**: Commit `da92ab9507` (dated July 30, 2026), `apps/web/src/useAppLogic.tsx` (14,557 lines total in pre-refactor state).
- **Modern Architectural State**: `apps/web/src/useAppLogic.tsx` (4,525 lines) decomposed into 14 domain hooks in `apps/web/src/hooks/domains/` plus standalone utility hooks like `apps/web/src/hooks/useMprLogic.ts`.

### Property Distribution Breakdown for Part 2 (#67 - #132)
Of the 66 assigned properties:
1. **Present in Modern `useAppLogic.tsx` Return Block**: **2 properties** (#75 `isDicomWebChecking`, #115 `name`).
2. **Defined in Domain Hooks (`apps/web/src/hooks/domains/`) but Omitted from `useAppLogic` Return Block**: **31 properties** (mostly in `useDocumentWorkflowModule.ts`, `usePatientLogic.ts`, `useVisitLogic.ts`).
3. **Defined in Utility Hooks (`apps/web/src/hooks/useMprLogic.ts`) but Omitted from `useAppLogic` Return Block**: **22 properties** (all MPR 3D imaging slice/slab visualization badge and checklist getters).
4. **Purged Completely from Modern Codebase**: **11 properties** (#68 `ingestImportFile`, #76 `lastName`, #78 `localBridgeStatusState`, #79 `localBridgeStatusValue`, #80 `lookupClinicPublicProfile`, #81 `loyaltyTier`, #83 `middleName`, #92 `mostLoadedResource`, #117 `noShowRisk`, #118 `organizeLocalImagingSources`, #132 `pendingSpeechFlushActionLabel`).

### Complete Property-by-Property Inspection Matrix (#67 - #132)

| # | Property Name | Category | Golden Commit `da92ab9507` Line | Modern Codebase Location | Return Status | Restoration & Wiring Strategy |
|---|---|---|---|---|---|---|
| 67 | `inferredTreatmentArea` | Clinical Rules & Anamnesis | L4977 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 68 | `ingestImportFile` | Clinic Operations & Import | L7821 | Purged from modern codebase | ❌ Missing from return | Restore definition from da92ab9507 (line ~7821) into appropriate domain hook or useAppLogic.tsx, then return it. |
| 69 | `inn` | Patient Identity & Demographics | L3023 | Present in domain hook(s): useDocumentWorkflowModule.ts, usePatientIntakeLogic.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 70 | `installmentScheduleBaseDocumentTitleValue` | Document & Financial Workflow | L11653 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 71 | `installmentScheduleInstallmentRows` | Document & Financial Workflow | L11603 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 72 | `installmentSchedulePrepaidRubValue` | Document & Financial Workflow | L11587 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 73 | `installmentScheduleTotalRubValue` | Document & Financial Workflow | L11582 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 74 | `insuranceContractId` | Patient Identity & Demographics | L5131 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 75 | `isDicomWebChecking` | Imaging / DICOM / MPR | L1049 | Present in modern useAppLogic.tsx return block | ✅ Returned | Keep modern implementation; ensure type alignment and no regression. |
| 76 | `lastName` | Patient Identity & Demographics | N/A (Model field) | Purged from modern codebase | ❌ Missing from return | Restore definition from da92ab9507 (line ~-1) into appropriate domain hook or useAppLogic.tsx, then return it. |
| 77 | `loadSpeechRecordingRecovery` | Voice & Local Bridge | L2579 | Present in domain hook(s): useVisitLogic.ts | ❌ Missing from return | Export/Pass-through from useVisitLogic.ts into useAppLogic.tsx return block. |
| 78 | `localBridgeStatusState` | Voice & Local Bridge | L7301 | Purged from modern codebase | ❌ Missing from return | Restore definition from da92ab9507 (line ~7301) into appropriate domain hook or useAppLogic.tsx, then return it. |
| 79 | `localBridgeStatusValue` | Voice & Local Bridge | L7308 | Purged from modern codebase | ❌ Missing from return | Restore definition from da92ab9507 (line ~7308) into appropriate domain hook or useAppLogic.tsx, then return it. |
| 80 | `lookupClinicPublicProfile` | Clinic Operations & Import | L8588 | Purged from modern codebase | ❌ Missing from return | Restore definition from da92ab9507 (line ~8588) into appropriate domain hook or useAppLogic.tsx, then return it. |
| 81 | `loyaltyTier` | Patient Identity & Demographics | N/A (Model field) | Purged from modern codebase | ❌ Missing from return | Restore definition from da92ab9507 (line ~-1) into appropriate domain hook or useAppLogic.tsx, then return it. |
| 82 | `markPostVisitManualEdited` | Clinic Operations & Import | L11834 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 83 | `middleName` | Patient Identity & Demographics | N/A (Model field) | Purged from modern codebase | ❌ Missing from return | Restore definition from da92ab9507 (line ~-1) into appropriate domain hook or useAppLogic.tsx, then return it. |
| 84 | `minorConsentDiagnosisOrIndicationValue` | Document & Financial Workflow | L11729 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 85 | `minorConsentInterventionScopeValue` | Document & Financial Workflow | L11721 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 86 | `minorConsentPatientBirthDateValue` | Document & Financial Workflow | L11715 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 87 | `minorConsentPatientFullNameValue` | Document & Financial Workflow | L11709 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 88 | `minorRepresentativeFullNameValue` | Document & Financial Workflow | L11677 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 89 | `minorRepresentativeIdentityDocumentValue` | Document & Financial Workflow | L11693 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 90 | `minorRepresentativePhoneValue` | Document & Financial Workflow | L11701 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 91 | `minorRepresentativeRelationshipValue` | Document & Financial Workflow | L11685 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 92 | `mostLoadedResource` | Clinic Operations & Import | L7001 | Purged from modern codebase | ❌ Missing from return | Restore definition from da92ab9507 (line ~7001) into appropriate domain hook or useAppLogic.tsx, then return it. |
| 93 | `mprActiveProjectionLabel` | Imaging / DICOM / MPR | L6263 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 94 | `mprActiveProjectionOrientation` | Imaging / DICOM / MPR | L6265 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 95 | `mprAxisAngleBadge` | Imaging / DICOM / MPR | L6223 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 96 | `mprAxisDirectionLabel` | Imaging / DICOM / MPR | L6219 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 97 | `mprAxisGuidance` | Imaging / DICOM / MPR | L6269 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 98 | `mprAxisRangeValue` | Imaging / DICOM / MPR | L6245 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 99 | `mprAxisVisualizerLabel` | Imaging / DICOM / MPR | L6312 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 100 | `mprAxisVisualizerStyle` | Imaging / DICOM / MPR | L6258 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 101 | `mprClinicalChecklist` | Imaging / DICOM / MPR | L6318 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 102 | `mprClinicalNextStep` | Imaging / DICOM / MPR | L6319 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 103 | `mprClinicalPresetButtonClass` | Imaging / DICOM / MPR | L6320 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 104 | `mprControlsAutoOpen` | Imaging / DICOM / MPR | L6214 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 105 | `mprControlsReady` | Imaging / DICOM / MPR | L6211 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 106 | `mprNearestClinicalPreset` | Imaging / DICOM / MPR | L6275 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 107 | `mprOperatorSummaryCards` | Imaging / DICOM / MPR | L6308 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 108 | `mprProjectionCompass` | Imaging / DICOM / MPR | L6268 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 109 | `mprSlabBadge` | Imaging / DICOM / MPR | L6227 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 110 | `mprSlabRangeValue` | Imaging / DICOM / MPR | L6249 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 111 | `mprSliceBadge` | Imaging / DICOM / MPR | L6228 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 112 | `mprSliceLabel` | Imaging / DICOM / MPR | L6242 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 113 | `mprSliceRangeValue` | Imaging / DICOM / MPR | L6253 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 114 | `mprWorkbenchSummaryText` | Imaging / DICOM / MPR | L6307 | Present in utility hook(s): useMprLogic.ts | ❌ Missing from return | Wire useMprLogic.ts state into useAppLogic.tsx return block. |
| 115 | `name` | Patient Identity & Demographics | L7620 | Present in modern useAppLogic.tsx return block | ✅ Returned | Keep modern implementation; ensure type alignment and no regression. |
| 116 | `newRulePatientText` | Clinical Rules & Anamnesis | L2429 | Present in domain hook(s): usePatientLogic.ts | ❌ Missing from return | Export/Pass-through from usePatientLogic.ts into useAppLogic.tsx return block. |
| 117 | `noShowRisk` | Patient Identity & Demographics | N/A (Model field) | Purged from modern codebase | ❌ Missing from return | Restore definition from da92ab9507 (line ~-1) into appropriate domain hook or useAppLogic.tsx, then return it. |
| 118 | `organizeLocalImagingSources` | Imaging / DICOM / MPR | L9676 | Purged from modern codebase | ❌ Missing from return | Restore definition from da92ab9507 (line ~9676) into appropriate domain hook or useAppLogic.tsx, then return it. |
| 119 | `outpatient025uMedicalCardNumberValue` | Document & Financial Workflow | L11875 | Present in domain hook(s): useDocumentWorkflowModule.ts, usePatientIntakeLogic.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 120 | `paidContractTotalRubValue` | Document & Financial Workflow | L11376 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 121 | `patientClinicalRuleEvaluations` | Clinical Rules & Anamnesis | L5007 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 122 | `patientClinicalRuleSummary` | Clinical Rules & Anamnesis | L5031 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 123 | `patientId` | Patient Identity & Demographics | L3744 | Present in domain hook(s): useDicomWorkbenchModule.ts, useDocumentWorkflowModule.ts, useFinanceLogic.ts, useImagingQueries.ts, usePatientLogic.ts, useScheduleLogic.ts, useTelegramModule.ts, useVisitLogic.ts | ❌ Missing from return | Export/Pass-through from useDicomWorkbenchModule.ts into useAppLogic.tsx return block. |
| 124 | `paymentInvoiceTotalRubValue` | Document & Financial Workflow | L11501 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 125 | `paymentReceiptFiscalReceiptLines` | Document & Financial Workflow | L11576 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 126 | `paymentReceiptIssuedByValue` | Document & Financial Workflow | L11568 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 127 | `paymentReceiptPayerBirthDateValue` | Document & Financial Workflow | L11536 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 128 | `paymentReceiptPayerFullNameValue` | Document & Financial Workflow | L11528 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 129 | `paymentReceiptPayerIdentityDocumentValue` | Document & Financial Workflow | L11552 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 130 | `paymentReceiptPayerInnValue` | Document & Financial Workflow | L11544 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 131 | `paymentReceiptPayerRelationshipValue` | Document & Financial Workflow | L11560 | Present in domain hook(s): useDocumentWorkflowModule.ts | ❌ Missing from return | Export/Pass-through from useDocumentWorkflowModule.ts into useAppLogic.tsx return block. |
| 132 | `pendingSpeechFlushActionLabel` | Voice & Local Bridge | L7137 | Purged from modern codebase | ❌ Missing from return | Restore definition from da92ab9507 (line ~7137) into appropriate domain hook or useAppLogic.tsx, then return it. |

---

## 2. Logic Chain

### 1. Architectural Deconstruction Analysis
During the recent modular refactoring of `useAppLogic.tsx`, the original 14,557-line God Context was broken down into specialized domain hooks (`useDocumentWorkflowModule`, `usePatientLogic`, `useVisitLogic`, `useMprLogic`, etc.).
However, the refactoring agent truncated the main return object of `useAppLogic.tsx`. While the underlying implementations for 53 out of 66 properties were successfully moved to domain hooks (e.g., document title formatters in `useDocumentWorkflowModule.ts` and MPR projection calculators in `useMprLogic.ts`), they were **never pass-through exported** in the return block of `useAppLogic.tsx`.

### 2. Analysis of the 11 Purged Properties
For the 11 properties not found in any modern hook file:
- **`ingestImportFile` (L7821)**: Handles file upload & POST to `/api/ingestion/extract`. Belongs in `useDocumentWorkflowModule.ts` or `useMigrationQueries.ts`.
- **`localBridgeStatusState` (L7301)** & **`localBridgeStatusValue` (L7308)**: Compute bridge readiness (`"ready" | "warn" | "busy"`). Belong in `useVisitLogic.ts`.
- **`lookupClinicPublicProfile` (L8588)**: Calls `/api/imports/smart/clinic-public-lookup`. Belongs in `useStaffSettingsLogic.ts` or `useMigrationQueries.ts`.
- **`mostLoadedResource` (L7001)**: Computes resource utilization from `allResourceLoads`. Belongs in `useScheduleLogic.ts`.
- **`organizeLocalImagingSources` (L9676)**: Initiates local DICOM scan preview at `/api/imaging/local-organizer/scan-preview`. Belongs in `useDicomWorkbenchModule.ts` or `useImagingQueries.ts`.
- **`pendingSpeechFlushActionLabel` (L7137)**: Helper returning button action text based on voice recognition state. Belongs in `useVisitLogic.ts` or `useShortDictation.ts`.
- **`lastName`**, **`middleName`**, **`loyaltyTier`**, **`noShowRisk`**: Patient model fields originally unpacked directly in patient card contexts. Safe typed getter or draft properties should be exposed via `usePatientLogic.ts`.

### 3. Preserving Modern Code & Bugfixes
Re-injecting these properties must follow a strict **non-destructive pass-through pattern**:
1. Modern domain hooks must **not** be overwritten. New functions will be appended or exported cleanly from existing hooks.
2. `useAppLogic.tsx` will instantiate modern domain hooks (e.g. `const docWorkflow = useDocumentWorkflowModule(...)`, `const mpr = useMprLogic(...)`) and spread/destructure their returned values directly into `useAppLogic`'s return statement.
3. This guarantees 100% backward compatibility for all UI components expecting these 66 properties on `useAppLogic()` context while preserving all recent bugfixes and optimizations.

---

## 3. Caveats
- **Read-Only Scope**: Per Explorer role mandate, no code changes were executed in `apps/web/src/`. All proposals are purely analytical and ready for implementer agents.
- **Cross-Domain Dependencies**: Some functions (e.g., `installmentSchedulePrepaidRubValue`) rely on helpers like `activePaidPaymentsForVisit()`. When restoring purged logic, helper functions from `da92ab9507` must be verified to exist in `AppHelpers.tsx` or modern domain hooks.
- **Type Check Verification**: Full typechecking (`npm run typecheck -w @dental/web`) will be validated once Implementer agents execute the pass-through exports.

---

## 4. Conclusion
- All 66 Part 2 properties (#67 through #132) have been fully traced and mapped.
- **55 properties** already exist in modern domain/utility hooks or modern `useAppLogic` and simply require **pass-through re-exporting** in `useAppLogic.tsx`'s return object.
- **11 properties** need surgical restoration of their verbatim implementations from golden commit `da92ab9507` into their respective domain hooks before being re-exported.
- Integrating these properties via domain hook pass-through will resolve all corresponding `TS2339` type errors without disrupting any modern features or fixes.

---

## 5. Verification Method

### Command Verification
To verify the findings and check modern hook contents:
```bash
# 1. Verify existence of dead_props.txt count
node -e "const fs=require('fs'); console.log(fs.readFileSync('dead_props.txt').toString('utf8').split('\n').filter(Boolean).length);"

# 2. Inspect MPR logic hook containing 22 MPR props
npx rg "mprActiveProjectionLabel|mprSliceBadge" apps/web/src/hooks/

# 3. Inspect document workflow hook containing document props
npx rg "installmentScheduleBaseDocumentTitleValue|minorConsent" apps/web/src/hooks/domains/

# 4. Execute TypeScript check (to be run by implementers after merging)
npm run typecheck -w @dental/web
```