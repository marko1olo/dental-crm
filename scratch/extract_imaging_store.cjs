const fs = require('fs');

const appPath = 'C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx';
let appCode = fs.readFileSync(appPath, 'utf8');

const stateVars = [
  'imagingImportText',
  'imagingImportSourceKind',
  'localImagingFolderDraft',
  'imagingFolderPath',
  'browserPickedImagingFolder',
  'browserImagingScanProgress',
  'browserDirectoryPickerAvailable',
  'imagingImportPreview',
  'imagingImportCommit',
  'imagingFolderScan',
  'dicomLocalFolderDiscovery',
  'localImagingOrganizer',
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
  'selectedImagingStudyId',
  'imagingKindFilter',
  'imagingViewerState',
  'imagingViewerActiveTool',
  'ctPlanningActiveQuickActionId',
  'ctPlanningImplantPlan',
  'imagingViewerAnnotations',
  'imagingViewerNote',
  'imagingViewerSession',
  'imagingViewerSaveState',
  'imagingViewerLocalSavedAt',
  'imagingViewerSaveError',
  'imagingViewerSessionReady',
  'mprProjection',
  'mprAxisDeg',
  'mprSlabMm',
  'mprSliceIndex',
  'mprWindowPreset',
  'mprCrosshairEnabled',
  'mprLinkedPlanesEnabled',
  'mprWorkbenchLocalSavedAt',
  'mprWorkbenchDraftRestored',
  'isImagingImportLoading',
  'isImagingImportCommitting',
  'imagingCreateSavingKind',
  'isImagingFolderScanning',
  'isDicomLocalDiscovering',
  'isLocalImagingOrganizing',
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
  'isBrowserImagingFolderPicking',
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
        if (init.includes('loadUiPreferences().imagingKindFilter')) {
            init = 'loadUiPreferences().imagingKindFilter ?? "all"';
            type = 'ImagingStudyKind | "all"';
        } else if (init.includes('localImagingFolderDraft?.folderPath')) {
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
import { loadUiPreferences, defaultImagingViewerState } from "../AppHelpers";
import type { 
  ImagingSourceKind, LocalImagingFolderDraft, BrowserPickedImagingFolderPreview, BrowserImagingScanProgress,
  ImagingImportPreviewResponse, ImagingImportCommitResponse, ImagingFolderScanResponse, DicomLocalFolderDiscoveryResponse,
  LocalImagingOrganizerResponse, DicomSeriesPreviewResponse, DicomFolderSeriesPreviewResponse, DicomFolderWorkupPlanResponse,
  DicomFirstFramePreviewResponse, ImagingViewerState, DicomWebConnectorCheckResponse, DicomViewerLaunchManifestResponse,
  DicomViewerToolStateBundleResponse, DicomViewerWorkbenchManifestResponse, DicomWorkbenchBundle, DicomWorkstationReadinessResponse,
  DicomRenderCachePlanResponse, ImagingStudyKind, ImagingViewerTool, ImagingViewerImplantPlan, ImagingViewerAnnotation,
  ImagingViewerSaveState, MprProjection, MprWindowPreset
} from "@dental/shared";

export interface ImagingStore {
${storeInterface.join('\n')}
}

export const useImagingStore = create<ImagingStore>((set) => ({
${storeState.join('\n')}
${storeSetters.join('\n')}
}));
`;

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/store/imagingStore.ts', storeCode);

// Inject useImagingStore into App.tsx
const importStatement = 'import { useImagingStore } from "./store/imagingStore";\n';
if (!appCode.includes('useImagingStore')) {
  appCode = appCode.replace('import { useSettingsStore }', importStatement + 'import { useSettingsStore }');
}

const destructureList = stateVars.flatMap(v => [v, `set${v.charAt(0).toUpperCase() + v.slice(1)}`]).join(',\n    ');
const destructureStatement = `  const {
    ${destructureList}
  } = useImagingStore();\n\n`;

appCode = appCode.replace('const {', destructureStatement + '  const {');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx', appCode);
console.log('Done!');
