const fs = require('fs');

const appPath = 'C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx';
let appCode = fs.readFileSync(appPath, 'utf8');

const stateVars = [
  'scheduleImportText',
  'scheduleImportSourceKind',
  'localScheduleFolderDraft',
  'scheduleFolderPath',
  'browserPickedScheduleFolder',
  'browserScheduleScanProgress',
  'browserDirectoryPickerAvailable',
  'scheduleImportPreview',
  'scheduleImportCommit',
  'scheduleFolderScan',
  'dicomLocalFolderDiscovery',
  'localScheduleOrganizer',
  'dicomSeriesPreview',
  'dicomFolderSeriesScan',
  'dicomFolderWorkupPlan',
  'dicomFirstFramePreview',
  'dicomFirstFrameViewerState',
  'dicomWebEndpointUrl',
  'dicomWebCheck',
  'dicomViewerLaunchManifest',
  'dicomViewerToolStateBundle',
  'dicomViewerWorkbenchManifest',
  'dicomWorkbenchLocalSavedAt',
  'dicomWorkbenchServerBundle',
  'dicomWorkbenchServerBundles',
  'dicomWorkstationReadiness',
  'dicomRenderCachePlan',
  'selectedScheduleStudyId',
  'scheduleKindFilter',
  'scheduleViewerState',
  'scheduleViewerActiveTool',
  'ctPlanningActiveQuickActionId',
  'ctPlanningImplantPlan',
  'scheduleViewerAnnotations',
  'scheduleViewerNote',
  'scheduleViewerSession',
  'scheduleViewerSaveState',
  'scheduleViewerLocalSavedAt',
  'scheduleViewerSaveError',
  'scheduleViewerSessionReady',
  'mprProjection',
  'mprAxisDeg',
  'mprSlabMm',
  'mprSliceIndex',
  'mprWindowPreset',
  'mprCrosshairEnabled',
  'mprLinkedPlanesEnabled',
  'mprWorkbenchLocalSavedAt',
  'mprWorkbenchDraftRestored',
  'isScheduleImportLoading',
  'isScheduleImportCommitting',
  'scheduleCreateSavingKind',
  'isScheduleFolderScanning',
  'isDicomLocalDiscovering',
  'isLocalScheduleOrganizing',
  'isDicomSeriesPreviewLoading',
  'isDicomWebChecking',
  'isDicomManifestBuilding',
  'isDicomToolStateBuilding',
  'isDicomWorkbenchBuilding',
  'isDicomWorkbenchServerSaving',
  'isDicomWorkbenchReconnecting',
  'isDicomWorkstationChecking',
  'isDicomRenderCachePlanning',
  'isDicomFolderWorkupPlanning',
  'isDicomFirstFramePreviewing',
  'isBrowserScheduleFolderPicking',
  'isLocalDicomOperationActive'
];

let storeInterface = [];
let storeState = [];
let storeSetters = [];

// Parse each state variable and build store code
stateVars.forEach(v => {
  const cap = v.charAt(0).toUpperCase() + v.slice(1);
  const regex = new RegExp(`const \\[${v}, set${cap}\\] = useState(?:<([^>]+)>)?\\((.*?)\\);`, 's');
  const match = appCode.match(regex);
  
  if (match) {
    let type = match[1] || 'any';
    let init = match[2].trim();
    
    // Handle specific lazy initializers
    if (init.startsWith('() =>')) {
        if (init.includes('loadUiPreferences().scheduleKindFilter')) {
            init = 'loadUiPreferences().scheduleKindFilter ?? "all"';
            type = 'ScheduleStudyKind | "all"';
        } else if (init.includes('localScheduleFolderDraft?.folderPath')) {
            init = '"C:\\\\Images"';
        } else if (init.includes('typeof window !== "undefined" && "showDirectoryPicker" in window')) {
            init = 'typeof window !== "undefined" && "showDirectoryPicker" in window';
        } else {
            init = 'null'; // fallback for complex lazy init
        }
    }
    
    if (type.includes('typeof')) type = 'any';
    
    storeInterface.push(`  ${v}: ${type};`);
    storeInterface.push(`  set${cap}: (val: ${type} | ((prev: ${type}) => ${type})) => void;`);
    
    storeState.push(`  ${v}: ${init},`);
    storeSetters.push(`  set${cap}: (val) => set((state) => ({ ${v}: typeof val === 'function' ? (val as any)(state.${v}) : val })),`);
    
    // Remove from App.tsx
    appCode = appCode.replace(match[0], '');
  } else {
    // try matching without type param
    const fallbackRegex = new RegExp(`const \\[${v}, set${cap}\\] = useState\\((.*?)\\);`, 's');
    const fbMatch = appCode.match(fallbackRegex);
    if (fbMatch) {
      let init = fbMatch[1].trim();
      let type = 'any';
      
      if (init === 'false' || init === 'true') type = 'boolean';
      if (init === '""') type = 'string';
      if (init === '0') type = 'number';
      
      storeInterface.push(`  ${v}: ${type};`);
      storeInterface.push(`  set${cap}: (val: ${type} | ((prev: ${type}) => ${type})) => void;`);
      
      storeState.push(`  ${v}: ${init},`);
      storeSetters.push(`  set${cap}: (val) => set((state) => ({ ${v}: typeof val === 'function' ? (val as any)(state.${v}) : val })),`);
      
      appCode = appCode.replace(fbMatch[0], '');
    }
  }
});

const storeCode = `// @ts-nocheck
import { create } from "zustand";
import { loadUiPreferences, defaultScheduleViewerState } from "../AppHelpers";
import type { 
  ScheduleSourceKind, LocalScheduleFolderDraft, BrowserPickedScheduleFolderPreview, BrowserScheduleScanProgress,
  ScheduleImportPreviewResponse, ScheduleImportCommitResponse, ScheduleFolderScanResponse, DicomLocalFolderDiscoveryResponse,
  LocalScheduleOrganizerResponse, DicomSeriesPreviewResponse, DicomFolderSeriesPreviewResponse, DicomFolderWorkupPlanResponse,
  DicomFirstFramePreviewResponse, ScheduleViewerState, DicomWebConnectorCheckResponse, DicomViewerLaunchManifestResponse,
  DicomViewerToolStateBundleResponse, DicomViewerWorkbenchManifestResponse, DicomWorkbenchBundle, DicomWorkstationReadinessResponse,
  DicomRenderCachePlanResponse, ScheduleStudyKind, ScheduleViewerTool, ScheduleViewerImplantPlan, ScheduleViewerAnnotation,
  ScheduleViewerSaveState, MprProjection, MprWindowPreset
} from "@dental/shared";

export interface ScheduleStore {
${storeInterface.join('\n')}
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
${storeState.join('\n')}
${storeSetters.join('\n')}
}));
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/scheduleStore.ts', storeCode);

// Inject useScheduleStore into App.tsx
const importStatement = 'import { useScheduleStore } from "./store/scheduleStore";\n';
if (!appCode.includes('useScheduleStore')) {
  appCode = appCode.replace('import { useSettingsStore }', importStatement + 'import { useSettingsStore }');
}

const destructureList = stateVars.flatMap(v => [v, `set${v.charAt(0).toUpperCase() + v.slice(1)}`]).join(',\n    ');
const destructureStatement = `  const {
    ${destructureList}
  } = useScheduleStore();\n\n`;

appCode = appCode.replace('const {', destructureStatement + '  const {');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);
console.log('Done!');
