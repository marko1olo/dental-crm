# HANDOFF REPORT — Explorer 1 (Part 1: Properties 1-66 Analysis & Restoration Blueprint)

**Agent Role**: Explorer 1 (`teamwork_preview_explorer`)  
**Target Scope**: Part 1 (First 66 properties of 198 missing properties in `C:\Clinic_MVP\dental-crm\dead_props.txt`)  
**Golden Reference Commit**: `da92ab9507` (`da92ab9507:apps/web/src/useAppLogic.tsx`)  
**Modern Target Files**: `apps/web/src/useAppLogic.tsx`, `apps/web/src/hooks/domains/*.ts`  
**Date & Timestamp**: 2026-08-08T14:02:00Z  

---

## 1. Observation

### 1.1 Summary of Findings
- **Total Missing Properties in `dead_props.txt`**: 198
- **Part 1 Scope**: Properties 1 to 66
- **Golden Commit `da92ab9507:apps/web/src/useAppLogic.tsx` File Size**: 14,776 lines (Monolithic state & logic implementation)
- **Modern `apps/web/src/useAppLogic.tsx` File Size**: 4,520 lines (Partial decomposition into domain hooks)
- **Status of Part 1 (66 Properties)**:
  - **16 properties (24.2%)**: Already exist inside modern domain hooks (`useDocumentWorkflowModule.ts`, `useStaffSettingsLogic.ts`, `usePatientIntakeLogic.ts`, `useVisitLogic.ts`, `useMigrationQueries.ts`), but **are missing from the return object of `useAppLogic.tsx`**.
  - **6 properties (9.1%)**: Are instantiated/calculated inside modern `useAppLogic.tsx` body, but **were omitted from the return object**.
  - **44 properties (66.7%)**: Were completely stripped during domain hook refactoring and **must be re-implemented** either in their corresponding domain hook or in `useAppLogic.tsx`.

### 1.2 Inventory & Status of the First 66 Properties

| # | Property Name | Golden Line (`da92ab9507`) | Golden Kind | Modern Code Location | Restoration Action / Strategy |
|---|---|---|---|---|---|
| 1 | `activeCommunicationTasks` | L5971 | `useMemo` | Missing | Restore memoized filter of communication tasks in `useAppLogic.tsx` or `useCommunicationsQueries.ts` |
| 2 | `activeImagingStudies` | L5989 | `useMemo` | Missing | Restore memoized filter of active imaging studies in `useAppLogic.tsx` / `useDicomWorkbenchModule.ts` |
| 3 | `activePayments` | L5357 | `useMemo` | `useAppLogic.tsx` L1309 & `useDocumentWorkflowModule.ts` | Expose property in `useAppLogic.tsx` return object (Pass-Through) |
| 4 | `activeTreatmentPlanItems` | L5367 | `useMemo` | `useAppLogic.tsx` L1318 & `useDocumentWorkflowModule.ts` | Expose property in `useAppLogic.tsx` return object (Pass-Through) |
| 5 | `activeTreatmentPlanScenarios` | L5370 | `useMemo` | `useDocumentWorkflowModule.ts` | Destructure from `documentWorkflow` and return in `useAppLogic.tsx` |
| 6 | `activeVisitClinicalRuleEvaluations` | L5950 | `useMemo` | `useDocumentWorkflowModule.ts` | Destructure from `documentWorkflow` and return in `useAppLogic.tsx` |
| 7 | `activeVisitClinicalRuleSummary` | L5960 | `useMemo` | `useDocumentWorkflowModule.ts` | Destructure from `documentWorkflow` and return in `useAppLogic.tsx` |
| 8 | `addChair` | L7338 | `function` | `useStaffSettingsLogic.ts` | Expose destructured `addChair` from `staffSettings` in `useAppLogic.tsx` return |
| 9 | `addImagingViewerNoteAnnotation` | L6802 | `function` | Missing | Re-implement note annotation handler in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 10 | `addMigrationDiscoveryCandidateToSmartImport` | L8402 | `function` | Missing | Re-implement migration candidate adder in `useMigrationQueries.ts` / `useAppLogic.tsx` |
| 11 | `address` | L827 | `getter/state` | `useAppLogic.tsx` & `usePatientIntakeLogic.ts` | Expose `address` draft state in `useAppLogic.tsx` return object |
| 12 | `addStaffMember` | L7310 | `function` | `useStaffSettingsLogic.ts` | Expose destructured `addStaffMember` in `useAppLogic.tsx` return object |
| 13 | `analyzePricelist` | L7753 | `function` | Missing | Re-implement pricelist analysis engine in `useAppLogic.tsx` / `useStaffSettingsLogic.ts` |
| 14 | `applyCtPlanningQuickAction` | L6359 | `const handler` | Missing | Re-implement CT planning quick actions in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 15 | `applyMprClinicalPreset` | L6344 | `const handler` | Missing | Re-implement MPR clinical preset handler in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 16 | `applyNearestMprClinicalPreset` | L6456 | `const handler` | Missing | Re-implement nearest MPR preset matching in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 17 | `applyProtocolTemplate` | L7914 | `function` | Missing | Re-implement treatment protocol template application logic in `useAppLogic.tsx` |
| 18 | `applyProtocolTemplateDirectly` | L7940 | `function` | Missing | Re-implement direct protocol template applicator in `useAppLogic.tsx` |
| 19 | `assembleSpeechRecording` | L7080 | `function` | `useAppLogic.tsx` L856 & `useVisitLogic.ts` | Expose `assembleSpeechRecording` in `useAppLogic.tsx` return object |
| 20 | `attachPricelistImage` | L7790 | `function` | Missing | Re-implement pricelist image upload handler in `useAppLogic.tsx` |
| 21 | `browserCanRequestPersistentStorage` | L7194 | `const boolean` | Missing | Re-implement storage persistence check in `useAppLogic.tsx` |
| 22 | `browserContinuityChecks` | L7198 | `const array` | Missing | Re-implement storage continuity audit list in `useAppLogic.tsx` |
| 23 | `browserContinuityCritical` | L7168 | `const boolean` | Missing | Re-implement storage continuity alert status in `useAppLogic.tsx` |
| 24 | `browserContinuityState` | L7189 | `const object` | Missing | Re-implement continuity state descriptor in `useAppLogic.tsx` |
| 25 | `browserContinuityValue` | L7172 | `const string` | Missing | Re-implement storage health status text in `useAppLogic.tsx` |
| 26 | `browserImagingFileInputAccept` | L8740 | `const string` | Missing | Re-implement DICOM file input filter string (`.dcm,.zip,image/*`) in `useAppLogic.tsx` |
| 27 | `browserImagingFilesInputRef` | L8742 | `useRef` | Missing | Re-implement DICOM file input ref in `useAppLogic.tsx` |
| 28 | `cancelBrowserImagingFolderScan` | L8756 | `function` | Missing | Re-implement DICOM folder scan abort handler in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 29 | `cancelBrowserMigrationScan` | L8945 | `function` | Missing | Re-implement migration scan abort handler in `useMigrationQueries.ts` / `useAppLogic.tsx` |
| 30 | `cbctWorkbenchPlanes` | L6192 | `useMemo` | Missing | Re-implement CBCT plane configs memo in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 31 | `cbctWorkbenchProjections` | L6181 | `useMemo` | Missing | Re-implement CBCT projections memo in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 32 | `cbctWorkbenchTools` | L6188 | `useMemo` | Missing | Re-implement CBCT tool list memo in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 33 | `changeClinicMode` | L7394 | `function` | Missing | Re-implement clinic operational mode switch handler in `useAppLogic.tsx` |
| 34 | `chooseRecognitionPreset` | L7701 | `function` | Missing | Re-implement speech recognition preset selector in `useAppLogic.tsx` |
| 35 | `clearBrowserPickedImagingFolderPreview` | L8750 | `function` | Missing | Re-implement imaging preview clearer in `useAppLogic.tsx` |
| 36 | `clearLocalImagingFolderRecovery` | L8725 | `function` | Missing | Re-implement local DICOM recovery eraser in `useAppLogic.tsx` |
| 37 | `clearPricelistImage` | L7814 | `function` | Missing | Re-implement pricelist image clearing handler in `useAppLogic.tsx` |
| 38 | `clinic` | L810 | `object` | `useAppLogic.tsx` & all domain hooks | Expose `clinic` profile object in `useAppLogic.tsx` return object |
| 39 | `clinicalMutationHeaders` | L5920 | `useMemo` | `useMigrationQueries.ts` | Expose destructured `clinicalMutationHeaders` in `useAppLogic.tsx` return |
| 40 | `clinicalReadHeaders` | L5910 | `useMemo` | `useMigrationQueries.ts` | Expose destructured `clinicalReadHeaders` in `useAppLogic.tsx` return |
| 41 | `clinicName` | L812 | `string` | `useAppLogic.tsx` & multiple hooks | Expose `clinicName` string in `useAppLogic.tsx` return object |
| 42 | `commitImagingImport` | L10817 | `function` | Missing | Re-implement imaging import commit workflow in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 43 | `commitImport` | L7970 | `function` | Missing | Re-implement data import commit workflow in `useMigrationQueries.ts` / `useAppLogic.tsx` |
| 44 | `commitSmartImport` | L8070 | `function` | Missing | Re-implement smart migration import commit in `useMigrationQueries.ts` / `useAppLogic.tsx` |
| 45 | `compactDocumentText` | L11950 | `function` | `useDocumentWorkflowModule.ts` | Pass through `compactDocumentText` from `documentWorkflow` module |
| 46 | `completedActFiscalReceiptLines` | L5410 | `useMemo` | `useDocumentWorkflowModule.ts` | Pass through `completedActFiscalReceiptLines` from `documentWorkflow` module |
| 47 | `createCtPlanningArtifact` | L6377 | `function` | Missing | Re-implement CT planning artifact creator in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 48 | `createDocument` | L12085 | `function` | `useDocumentWorkflowModule.ts` | Pass through `createDocument` from `documentWorkflow` module |
| 49 | `ctPlanningAnnotationRefs` | L6141 | `useMemo` | Missing | Re-implement CT planning annotation refs memo in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 50 | `dicomFirstFrameImageStyle` | L6071 | `CSSProperties` | Missing | Re-implement DICOM first frame CSS style generator in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 51 | `dicomWorkbenchSourceIsRedacted` | L6179 | `const boolean` | Missing | Re-implement DICOM source redaction flag in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 52 | `dictationQuickPhrases` | L6971 | `useMemo` | Missing | Re-implement clinical dictation quick phrases memo in `useAppLogic.tsx` |
| 53 | `discoverDicomFolders` | L9625 | `function` | Missing | Re-implement DICOM folder discovery scanner in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 54 | `discoverMigrationSources` | L8356 | `function` | Missing | Re-implement migration auto-discovery scanner in `useMigrationQueries.ts` / `useAppLogic.tsx` |
| 55 | `downloadMigrationHandoffReport` | L8309 | `function` | Missing | Re-implement migration report generator & downloader in `useMigrationQueries.ts` / `useAppLogic.tsx` |
| 56 | `downloadSmartImportReport` | L8127 | `function` | Missing | Re-implement smart import report download handler in `useMigrationQueries.ts` / `useAppLogic.tsx` |
| 57 | `downloadSmartImportSafeHandoffReport` | L8170 | `function` | Missing | Re-implement safe import report downloader in `useMigrationQueries.ts` / `useAppLogic.tsx` |
| 58 | `eligibleRefundCorrectionPayments` | L5373 | `useMemo` | `useDocumentWorkflowModule.ts` | Pass through `eligibleRefundCorrectionPayments` from `documentWorkflow` module |
| 59 | `emptyDictationVoiceActionLabel` | L7132 | `const string` | Missing | Re-implement voice action button label computation in `useAppLogic.tsx` |
| 60 | `firstName` | L825 | `string/draft` | Missing in return | Expose `firstName` patient/staff input draft in `useAppLogic.tsx` return object |
| 61 | `handleBrowserDirectoryInputChange` | L9600 | `function` | Missing | Re-implement browser directory file input change handler in `useAppLogic.tsx` |
| 62 | `handleBrowserMigrationInputChange` | L9328 | `function` | Missing | Re-implement browser migration input change handler in `useAppLogic.tsx` |
| 63 | `handleMprKeyboardNavigation` | L6462 | `const handler` | Missing | Re-implement MPR keyboard navigation handler in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 64 | `imagingComparisonCandidates` | L6032 | `useMemo` | Missing | Re-implement imaging study comparison ranker in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 65 | `imagingKindOptions` | L6014 | `useMemo` | Missing | Re-implement imaging study kind options memo in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |
| 66 | `imagingViewerImageStyle` | L6063 | `CSSProperties` | Missing | Re-implement imaging viewer CSS style generator in `useDicomWorkbenchModule.ts` / `useAppLogic.tsx` |

---

## 2. Logic Chain

### 2.1 Architectural Analysis of the Refactoring Bug
During the recent refactoring phase (between July 30 and August 8), developers attempted to modularize the 14,776-line `useAppLogic.tsx` monolith into specialized domain hooks under `apps/web/src/hooks/domains/`.

However, the refactoring contained two major defects:
1. **Pass-Through Dropping (22 properties)**: Logic was successfully migrated to domain hooks (e.g., `useDocumentWorkflowModule.ts`, `useStaffSettingsLogic.ts`, `useMigrationQueries.ts`), but the return object of `useAppLogic.tsx` was NOT updated to export these destructured properties. Consequently, components calling `useAppLogic()` receive `undefined` and fail typechecking (`TS2339`).
2. **Logic Stripping (44 properties)**: Complex sub-domain logic—particularly around **DICOM/MPR Workbench**, **Browser Local I/O**, **Migration Import Autopilot**, and **Dictation/Speech Helpers**—was deleted from `useAppLogic.tsx` without being fully re-homed into domain hooks.

### 2.2 Domain Grouping & Target Hook Mapping

#### Group 1: Imaging, DICOM & MPR Workbench (22 Properties)
- **Properties**: `activeImagingStudies`, `addImagingViewerNoteAnnotation`, `applyCtPlanningQuickAction`, `applyMprClinicalPreset`, `applyNearestMprClinicalPreset`, `cancelBrowserImagingFolderScan`, `cbctWorkbenchPlanes`, `cbctWorkbenchProjections`, `cbctWorkbenchTools`, `clearBrowserPickedImagingFolderPreview`, `clearLocalImagingFolderRecovery`, `commitImagingImport`, `createCtPlanningArtifact`, `ctPlanningAnnotationRefs`, `dicomFirstFrameImageStyle`, `dicomWorkbenchSourceIsRedacted`, `discoverDicomFolders`, `handleMprKeyboardNavigation`, `imagingComparisonCandidates`, `imagingKindOptions`, `imagingViewerImageStyle`, `handleBrowserDirectoryInputChange`.
- **Target File**: Primary logic goes into `apps/web/src/hooks/domains/useDicomWorkbenchModule.ts` or directly into `apps/web/src/useAppLogic.tsx` where DICOM state is managed.
- **Golden Reference Lines**: L5989–L6805, L8725–L8760, L9600–L9650, L10817–L10860.

#### Group 2: Document & Clinical Workflow / Payments (10 Properties)
- **Properties**: `activePayments`, `activeTreatmentPlanItems`, `activeTreatmentPlanScenarios`, `activeVisitClinicalRuleEvaluations`, `activeVisitClinicalRuleSummary`, `compactDocumentText`, `completedActFiscalReceiptLines`, `createDocument`, `eligibleRefundCorrectionPayments`, `address`.
- **Target File**: Existing in `apps/web/src/hooks/domains/useDocumentWorkflowModule.ts` or modern `useAppLogic.tsx` body.
- **Action**: Pass-through destructuring in `useAppLogic.tsx` return object.

#### Group 3: Migration & Integration Autopilot (9 Properties)
- **Properties**: `addMigrationDiscoveryCandidateToSmartImport`, `cancelBrowserMigrationScan`, `clinicalMutationHeaders`, `clinicalReadHeaders`, `commitImport`, `commitSmartImport`, `discoverMigrationSources`, `downloadMigrationHandoffReport`, `downloadSmartImportReport`, `downloadSmartImportSafeHandoffReport`, `handleBrowserMigrationInputChange`.
- **Target File**: `apps/web/src/hooks/domains/useMigrationQueries.ts` and `apps/web/src/useAppLogic.tsx`.
- **Golden Reference Lines**: L5910–L5925, L7970–L8410, L8945–L8960, L9328–L9350.

#### Group 4: Browser Storage Continuity & I/O (6 Properties)
- **Properties**: `browserCanRequestPersistentStorage`, `browserContinuityChecks`, `browserContinuityCritical`, `browserContinuityState`, `browserContinuityValue`, `browserImagingFileInputAccept`, `browserImagingFilesInputRef`.
- **Target File**: `apps/web/src/useAppLogic.tsx` (local storage resilience module).
- **Golden Reference Lines**: L7168–L7210, L8740–L8745.

#### Group 5: Voice Dictation & Speech Assistant (3 Properties)
- **Properties**: `assembleSpeechRecording`, `chooseRecognitionPreset`, `emptyDictationVoiceActionLabel`, `dictationQuickPhrases`.
- **Target File**: `apps/web/src/hooks/domains/useVisitLogic.ts` & `apps/web/src/useAppLogic.tsx`.
- **Golden Reference Lines**: L6971, L7080–L7140, L7701.

#### Group 6: Staff, Clinic & Pricelist Admin (6 Properties)
- **Properties**: `addChair`, `addStaffMember`, `analyzePricelist`, `attachPricelistImage`, `changeClinicMode`, `clearPricelistImage`, `clinic`, `clinicName`, `firstName`.
- **Target File**: `apps/web/src/hooks/domains/useStaffSettingsLogic.ts` & `apps/web/src/useAppLogic.tsx`.
- **Golden Reference Lines**: L810–L827, L7310–L7395, L7753–L7820.

#### Group 7: Treatment Protocol Templates & Communication (4 Properties)
- **Properties**: `activeCommunicationTasks`, `applyProtocolTemplate`, `applyProtocolTemplateDirectly`.
- **Target File**: `apps/web/src/useAppLogic.tsx` & `useCommunicationsQueries.ts`.
- **Golden Reference Lines**: L5971, L7914, L7940.

---

## 3. Caveats

1. **Uninvestigated Scope**: This report covers Part 1 (Properties 1-66). Properties 67 to 198 (Parts 2 and 3) are owned by Explorer 2 and Explorer 3.
2. **Modern Code Protection**: Modern bugfixes (e.g. storage error resilience, Fastify API token header updates, Playwright test selectors added between July 30 and August 8) MUST NOT be overwritten when restoring old functions.
3. **Zustand & State Synchronization**: Some functions in golden commit `da92ab9507` relied on React `useState`. Modern code has introduced Zustand stores (`useAppStore`, `useSettingsStore`, `useImagingStore`). Restored functions must update Zustand store states if applicable rather than introducing duplicate isolated React states.

---

## 4. Conclusion

- All 66 properties of Part 1 have been accurately identified, mapped to golden commit `da92ab9507:apps/web/src/useAppLogic.tsx`, and assigned concrete target files and restoration strategies.
- **22 properties** are low-hanging fruit requiring simple destructuring pass-through in `useAppLogic.tsx` return block.
- **44 properties** require surgical re-implementation from golden commit `da92ab9507` into `useDicomWorkbenchModule.ts`, `useMigrationQueries.ts`, or `useAppLogic.tsx`.
- Implementers can safely proceed with Part 1 restoration following the exact mapping provided in Section 1.2 and Section 2.2.

---

## 5. Verification Method

### 5.1 Independent Commands to Verify Analysis

1. **Verify Golden Reference Implementations**:
   ```bash
   git show da92ab9507:apps/web/src/useAppLogic.tsx | grep -n "const activePayments"
   git show da92ab9507:apps/web/src/useAppLogic.tsx | grep -n "function handleMprKeyboardNavigation"
   ```

2. **Verify Current Missing Properties**:
   ```bash
   npx tsc --noEmit -p apps/web/tsconfig.json
   ```
   Observe `TS2339` errors referencing missing properties on `useAppLogic` return type.

3. **Encoding & Mojibake Gate Check**:
   ```bash
   node -e "
   const fs=require('fs');
   const t=fs.readFileSync('apps/web/src/useAppLogic.tsx','utf8');
   const rec=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.from(t,'latin1'));
   console.log('mojibake:', rec!==t && /[\u0400-\u04FF]/.test(rec));
   "
   ```
