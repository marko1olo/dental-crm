
import { create } from "zustand";
import { loadUiPreferences, defaultImagingViewerState, initialUiPreferences, defaultDicomFirstFrameViewerState } from "../AppHelpers";
import type { ImagingViewerSessionResponse, 
  ImagingSourceKind, LocalImagingFolderDraft, BrowserPickedImagingFolderPreview, BrowserImagingScanProgress,
  ImagingImportPreviewResponse, ImagingImportCommitResponse, ImagingFolderScanResponse, DicomLocalFolderDiscoveryResponse,
  LocalImagingOrganizerResponse, DicomSeriesPreviewResponse, DicomFolderSeriesPreviewResponse, DicomFolderWorkupPlanResponse,
  DicomFirstFramePreviewResponse, ImagingViewerState, DicomWebConnectorCheckResponse, DicomViewerLaunchManifestResponse,
  DicomViewerToolStateBundleResponse, DicomViewerWorkbenchManifestResponse, DicomWorkbenchBundle, DicomWorkstationReadinessResponse,
  DicomRenderCachePlanResponse, ImagingStudyKind, ImagingViewerTool, ImagingViewerImplantPlan, ImagingViewerAnnotation,
  ImagingViewerSaveState, MprProjection, MprWindowPreset
} from "@dental/shared";

export interface ImagingStore {
  imagingImportText: any;
  setImagingImportText: (val: any | ((prev: any) => any)) => void;
  imagingImportSourceKind: ImagingSourceKind;
  setImagingImportSourceKind: (val: ImagingSourceKind | ((prev: ImagingSourceKind) => ImagingSourceKind)) => void;
  localImagingFolderDraft: LocalImagingFolderDraft | null;
  setLocalImagingFolderDraft: (val: LocalImagingFolderDraft | null | ((prev: LocalImagingFolderDraft | null) => LocalImagingFolderDraft | null)) => void;
  imagingFolderPath: any;
  setImagingFolderPath: (val: any | ((prev: any) => any)) => void;
  browserPickedImagingFolder: BrowserPickedImagingFolderPreview | null;
  setBrowserPickedImagingFolder: (val: BrowserPickedImagingFolderPreview | null | ((prev: BrowserPickedImagingFolderPreview | null) => BrowserPickedImagingFolderPreview | null)) => void;
  browserImagingScanProgress: BrowserImagingScanProgress | null;
  setBrowserImagingScanProgress: (val: BrowserImagingScanProgress | null | ((prev: BrowserImagingScanProgress | null) => BrowserImagingScanProgress | null)) => void;
  browserDirectoryPickerAvailable: any;
  setBrowserDirectoryPickerAvailable: (val: any | ((prev: any) => any)) => void;
  imagingImportPreview: ImagingImportPreviewResponse | null;
  setImagingImportPreview: (val: ImagingImportPreviewResponse | null | ((prev: ImagingImportPreviewResponse | null) => ImagingImportPreviewResponse | null)) => void;
  imagingImportCommit: ImagingImportCommitResponse | null;
  setImagingImportCommit: (val: ImagingImportCommitResponse | null | ((prev: ImagingImportCommitResponse | null) => ImagingImportCommitResponse | null)) => void;
  imagingFolderScan: ImagingFolderScanResponse | null;
  setImagingFolderScan: (val: ImagingFolderScanResponse | null | ((prev: ImagingFolderScanResponse | null) => ImagingFolderScanResponse | null)) => void;
  dicomLocalFolderDiscovery: DicomLocalFolderDiscoveryResponse | null;
  setDicomLocalFolderDiscovery: (val: DicomLocalFolderDiscoveryResponse | null | ((prev: DicomLocalFolderDiscoveryResponse | null) => DicomLocalFolderDiscoveryResponse | null)) => void;
  localImagingOrganizer: LocalImagingOrganizerResponse | null;
  setLocalImagingOrganizer: (val: LocalImagingOrganizerResponse | null | ((prev: LocalImagingOrganizerResponse | null) => LocalImagingOrganizerResponse | null)) => void;
  dicomSeriesPreview: DicomSeriesPreviewResponse | null;
  setDicomSeriesPreview: (val: DicomSeriesPreviewResponse | null | ((prev: DicomSeriesPreviewResponse | null) => DicomSeriesPreviewResponse | null)) => void;
  dicomFolderSeriesScan: DicomFolderSeriesPreviewResponse | null;
  setDicomFolderSeriesScan: (val: DicomFolderSeriesPreviewResponse | null | ((prev: DicomFolderSeriesPreviewResponse | null) => DicomFolderSeriesPreviewResponse | null)) => void;
  dicomFolderWorkupPlan: DicomFolderWorkupPlanResponse | null;
  setDicomFolderWorkupPlan: (val: DicomFolderWorkupPlanResponse | null | ((prev: DicomFolderWorkupPlanResponse | null) => DicomFolderWorkupPlanResponse | null)) => void;
  dicomFirstFramePreview: DicomFirstFramePreviewResponse | null;
  setDicomFirstFramePreview: (val: DicomFirstFramePreviewResponse | null | ((prev: DicomFirstFramePreviewResponse | null) => DicomFirstFramePreviewResponse | null)) => void;
  dicomFirstFrameViewerState: ImagingViewerState;
  setDicomFirstFrameViewerState: (val: ImagingViewerState | ((prev: ImagingViewerState) => ImagingViewerState)) => void;
  dicomWebEndpointUrl: any;
  setDicomWebEndpointUrl: (val: any | ((prev: any) => any)) => void;
  dicomWebCheck: DicomWebConnectorCheckResponse | null;
  setDicomWebCheck: (val: DicomWebConnectorCheckResponse | null | ((prev: DicomWebConnectorCheckResponse | null) => DicomWebConnectorCheckResponse | null)) => void;
  dicomViewerLaunchManifest: DicomViewerLaunchManifestResponse | null;
  setDicomViewerLaunchManifest: (val: DicomViewerLaunchManifestResponse | null | ((prev: DicomViewerLaunchManifestResponse | null) => DicomViewerLaunchManifestResponse | null)) => void;
  dicomViewerToolStateBundle: DicomViewerToolStateBundleResponse | null;
  setDicomViewerToolStateBundle: (val: DicomViewerToolStateBundleResponse | null | ((prev: DicomViewerToolStateBundleResponse | null) => DicomViewerToolStateBundleResponse | null)) => void;
  dicomViewerWorkbenchManifest: DicomViewerWorkbenchManifestResponse | null;
  setDicomViewerWorkbenchManifest: (val: DicomViewerWorkbenchManifestResponse | null | ((prev: DicomViewerWorkbenchManifestResponse | null) => DicomViewerWorkbenchManifestResponse | null)) => void;
  dicomWorkbenchLocalSavedAt: string | null;
  setDicomWorkbenchLocalSavedAt: (val: string | null | ((prev: string | null) => string | null)) => void;
  dicomWorkbenchServerBundle: DicomWorkbenchBundle | null;
  setDicomWorkbenchServerBundle: (val: DicomWorkbenchBundle | null | ((prev: DicomWorkbenchBundle | null) => DicomWorkbenchBundle | null)) => void;
  dicomWorkbenchServerBundles: DicomWorkbenchBundle[];
  setDicomWorkbenchServerBundles: (val: DicomWorkbenchBundle[] | ((prev: DicomWorkbenchBundle[]) => DicomWorkbenchBundle[])) => void;
  dicomWorkstationReadiness: DicomWorkstationReadinessResponse | null;
  setDicomWorkstationReadiness: (val: DicomWorkstationReadinessResponse | null | ((prev: DicomWorkstationReadinessResponse | null) => DicomWorkstationReadinessResponse | null)) => void;
  dicomRenderCachePlan: DicomRenderCachePlanResponse | null;
  setDicomRenderCachePlan: (val: DicomRenderCachePlanResponse | null | ((prev: DicomRenderCachePlanResponse | null) => DicomRenderCachePlanResponse | null)) => void;
  selectedImagingStudyId: string | null;
  setSelectedImagingStudyId: (val: string | null | ((prev: string | null) => string | null)) => void;
  imagingKindFilter: ImagingStudyKind | "all";
  setImagingKindFilter: (val: ImagingStudyKind | "all" | ((prev: ImagingStudyKind | "all") => ImagingStudyKind | "all")) => void;
  imagingViewerState: ImagingViewerState;
  setImagingViewerState: (val: ImagingViewerState | ((prev: ImagingViewerState) => ImagingViewerState)) => void;
  imagingViewerActiveTool: ImagingViewerTool;
  setImagingViewerActiveTool: (val: ImagingViewerTool | ((prev: ImagingViewerTool) => ImagingViewerTool)) => void;
  ctPlanningActiveQuickActionId: string | null;
  setCtPlanningActiveQuickActionId: (val: string | null | ((prev: string | null) => string | null)) => void;
  ctPlanningImplantPlan: ImagingViewerImplantPlan | null;
  setCtPlanningImplantPlan: (val: ImagingViewerImplantPlan | null | ((prev: ImagingViewerImplantPlan | null) => ImagingViewerImplantPlan | null)) => void;
  imagingViewerAnnotations: ImagingViewerAnnotation[];
  setImagingViewerAnnotations: (val: ImagingViewerAnnotation[] | ((prev: ImagingViewerAnnotation[]) => ImagingViewerAnnotation[])) => void;
  imagingViewerNote: any;
  setImagingViewerNote: (val: any | ((prev: any) => any)) => void;
  imagingViewerSession: ImagingViewerSessionResponse["session"] | null;
  setImagingViewerSession: (val: ImagingViewerSessionResponse["session"] | null | ((prev: ImagingViewerSessionResponse["session"] | null) => ImagingViewerSessionResponse["session"] | null)) => void;
  imagingViewerSaveState: ImagingViewerSaveState;
  setImagingViewerSaveState: (val: ImagingViewerSaveState | ((prev: ImagingViewerSaveState) => ImagingViewerSaveState)) => void;
  imagingViewerLocalSavedAt: string | null;
  setImagingViewerLocalSavedAt: (val: string | null | ((prev: string | null) => string | null)) => void;
  imagingViewerSaveError: string | null;
  setImagingViewerSaveError: (val: string | null | ((prev: string | null) => string | null)) => void;
  imagingViewerSessionReady: any;
  setImagingViewerSessionReady: (val: any | ((prev: any) => any)) => void;
  mprProjection: MprProjection;
  setMprProjection: (val: MprProjection | ((prev: MprProjection) => MprProjection)) => void;
  mprAxisDeg: any;
  setMprAxisDeg: (val: any | ((prev: any) => any)) => void;
  mprSlabMm: any;
  setMprSlabMm: (val: any | ((prev: any) => any)) => void;
  mprSliceIndex: any;
  setMprSliceIndex: (val: any | ((prev: any) => any)) => void;
  mprWindowPreset: MprWindowPreset;
  setMprWindowPreset: (val: MprWindowPreset | ((prev: MprWindowPreset) => MprWindowPreset)) => void;
  mprCrosshairEnabled: any;
  setMprCrosshairEnabled: (val: any | ((prev: any) => any)) => void;
  mprLinkedPlanesEnabled: any;
  setMprLinkedPlanesEnabled: (val: any | ((prev: any) => any)) => void;
  mprWorkbenchLocalSavedAt: string | null;
  setMprWorkbenchLocalSavedAt: (val: string | null | ((prev: string | null) => string | null)) => void;
  mprWorkbenchDraftRestored: any;
  setMprWorkbenchDraftRestored: (val: any | ((prev: any) => any)) => void;
  isImagingImportLoading: any;
  setIsImagingImportLoading: (val: any | ((prev: any) => any)) => void;
  isImagingImportCommitting: any;
  setIsImagingImportCommitting: (val: any | ((prev: any) => any)) => void;
  imagingCreateSavingKind: ImagingStudyKind | null;
  setImagingCreateSavingKind: (val: ImagingStudyKind | null | ((prev: ImagingStudyKind | null) => ImagingStudyKind | null)) => void;
  isImagingFolderScanning: any;
  setIsImagingFolderScanning: (val: any | ((prev: any) => any)) => void;
  isDicomLocalDiscovering: any;
  setIsDicomLocalDiscovering: (val: any | ((prev: any) => any)) => void;
  isLocalImagingOrganizing: any;
  setIsLocalImagingOrganizing: (val: any | ((prev: any) => any)) => void;
  isDicomSeriesPreviewLoading: any;
  setIsDicomSeriesPreviewLoading: (val: any | ((prev: any) => any)) => void;
  isDicomWebChecking: any;
  setIsDicomWebChecking: (val: any | ((prev: any) => any)) => void;
  isDicomManifestBuilding: any;
  setIsDicomManifestBuilding: (val: any | ((prev: any) => any)) => void;
  isDicomToolStateBuilding: any;
  setIsDicomToolStateBuilding: (val: any | ((prev: any) => any)) => void;
  isDicomWorkbenchBuilding: any;
  setIsDicomWorkbenchBuilding: (val: any | ((prev: any) => any)) => void;
  isDicomWorkbenchServerSaving: any;
  setIsDicomWorkbenchServerSaving: (val: any | ((prev: any) => any)) => void;
  isDicomWorkbenchReconnecting: any;
  setIsDicomWorkbenchReconnecting: (val: any | ((prev: any) => any)) => void;
  isDicomWorkstationChecking: any;
  setIsDicomWorkstationChecking: (val: any | ((prev: any) => any)) => void;
  isDicomRenderCachePlanning: any;
  setIsDicomRenderCachePlanning: (val: any | ((prev: any) => any)) => void;
  isDicomFolderWorkupPlanning: any;
  setIsDicomFolderWorkupPlanning: (val: any | ((prev: any) => any)) => void;
  isDicomFirstFramePreviewing: any;
  setIsDicomFirstFramePreviewing: (val: any | ((prev: any) => any)) => void;
  isBrowserImagingFolderPicking: any;
  setIsBrowserImagingFolderPicking: (val: any | ((prev: any) => any)) => void;
  isLocalDicomOperationActive: any;
  setIsLocalDicomOperationActive: (val: any | ((prev: any) => any)) => void;
}

export const useImagingStore = create<ImagingStore>((set) => ({
  imagingImportText: "ФИО;Телефон;Тип;Зуб;Дата;Файл;Источник\nИванова Марина Сергеевна;+7 927 111-22-33;RVG;36;12.05.2026;C:\\Images\\ivanova_36.dcm;локальный RVG-датчик\nИванова Марина Сергеевна;+7 927 111-22-33;ТРГ;;10.05.2026;C:\\Images\\ivanova_ceph.ima;экспорт Sidexis\nПетров Алексей Николаевич;+7 927 555-19-40;ОПТГ;;10.05.2026;C:\\Images\\petrov_opg.jpg;экспорт ОПТГ",
  imagingImportSourceKind: initialUiPreferences.imagingImportSourceKind,
  localImagingFolderDraft: null,
  imagingFolderPath: "C:\\Images",
  browserPickedImagingFolder: null,
  browserImagingScanProgress: null,
  browserDirectoryPickerAvailable: null,
  imagingImportPreview: null,
  imagingImportCommit: null,
  imagingFolderScan: null,
  dicomLocalFolderDiscovery: null,
  localImagingOrganizer: null,
  dicomSeriesPreview: null,
  dicomFolderSeriesScan: null,
  dicomFolderWorkupPlan: null,
  dicomFirstFramePreview: null,
  dicomFirstFrameViewerState: defaultDicomFirstFrameViewerState,
  dicomWebEndpointUrl: initialUiPreferences.dicomWebEndpointUrl,
  dicomWebCheck: null,
  dicomViewerLaunchManifest: null,
  dicomViewerToolStateBundle: null,
  dicomViewerWorkbenchManifest: null,
  dicomWorkbenchLocalSavedAt: null,
  dicomWorkbenchServerBundle: null,
  dicomWorkbenchServerBundles: [],
  dicomWorkstationReadiness: null,
  dicomRenderCachePlan: null,
  selectedImagingStudyId: null,
  imagingKindFilter: initialUiPreferences.imagingKindFilter,
  imagingViewerState: defaultImagingViewerState,
  imagingViewerActiveTool: "window_level",
  ctPlanningActiveQuickActionId: null,
  ctPlanningImplantPlan: null,
  imagingViewerAnnotations: [],
  imagingViewerNote: "",
  imagingViewerSession: null,
  imagingViewerSaveState: "idle",
  imagingViewerLocalSavedAt: null,
  imagingViewerSaveError: null,
  imagingViewerSessionReady: false,
  mprProjection: "axial",
  mprAxisDeg: 0,
  mprSlabMm: 1,
  mprSliceIndex: 0,
  mprWindowPreset: "bone",
  mprCrosshairEnabled: true,
  mprLinkedPlanesEnabled: true,
  mprWorkbenchLocalSavedAt: null,
  mprWorkbenchDraftRestored: false,
  isImagingImportLoading: false,
  isImagingImportCommitting: false,
  imagingCreateSavingKind: null,
  isImagingFolderScanning: false,
  isDicomLocalDiscovering: false,
  isLocalImagingOrganizing: false,
  isDicomSeriesPreviewLoading: false,
  isDicomWebChecking: false,
  isDicomManifestBuilding: false,
  isDicomToolStateBuilding: false,
  isDicomWorkbenchBuilding: false,
  isDicomWorkbenchServerSaving: false,
  isDicomWorkbenchReconnecting: false,
  isDicomWorkstationChecking: false,
  isDicomRenderCachePlanning: false,
  isDicomFolderWorkupPlanning: false,
  isDicomFirstFramePreviewing: false,
  isBrowserImagingFolderPicking: false,
  isLocalDicomOperationActive: false,
  setImagingImportText: (val) => set((state) => ({ imagingImportText: typeof val === 'function' ? (val as any)(state.imagingImportText) : val })),
  setImagingImportSourceKind: (val) => set((state) => ({ imagingImportSourceKind: typeof val === 'function' ? (val as any)(state.imagingImportSourceKind) : val })),
  setLocalImagingFolderDraft: (val) => set((state) => ({ localImagingFolderDraft: typeof val === 'function' ? (val as any)(state.localImagingFolderDraft) : val })),
  setImagingFolderPath: (val) => set((state) => ({ imagingFolderPath: typeof val === 'function' ? (val as any)(state.imagingFolderPath) : val })),
  setBrowserPickedImagingFolder: (val) => set((state) => ({ browserPickedImagingFolder: typeof val === 'function' ? (val as any)(state.browserPickedImagingFolder) : val })),
  setBrowserImagingScanProgress: (val) => set((state) => ({ browserImagingScanProgress: typeof val === 'function' ? (val as any)(state.browserImagingScanProgress) : val })),
  setBrowserDirectoryPickerAvailable: (val) => set((state) => ({ browserDirectoryPickerAvailable: typeof val === 'function' ? (val as any)(state.browserDirectoryPickerAvailable) : val })),
  setImagingImportPreview: (val) => set((state) => ({ imagingImportPreview: typeof val === 'function' ? (val as any)(state.imagingImportPreview) : val })),
  setImagingImportCommit: (val) => set((state) => ({ imagingImportCommit: typeof val === 'function' ? (val as any)(state.imagingImportCommit) : val })),
  setImagingFolderScan: (val) => set((state) => ({ imagingFolderScan: typeof val === 'function' ? (val as any)(state.imagingFolderScan) : val })),
  setDicomLocalFolderDiscovery: (val) => set((state) => ({ dicomLocalFolderDiscovery: typeof val === 'function' ? (val as any)(state.dicomLocalFolderDiscovery) : val })),
  setLocalImagingOrganizer: (val) => set((state) => ({ localImagingOrganizer: typeof val === 'function' ? (val as any)(state.localImagingOrganizer) : val })),
  setDicomSeriesPreview: (val) => set((state) => ({ dicomSeriesPreview: typeof val === 'function' ? (val as any)(state.dicomSeriesPreview) : val })),
  setDicomFolderSeriesScan: (val) => set((state) => ({ dicomFolderSeriesScan: typeof val === 'function' ? (val as any)(state.dicomFolderSeriesScan) : val })),
  setDicomFolderWorkupPlan: (val) => set((state) => ({ dicomFolderWorkupPlan: typeof val === 'function' ? (val as any)(state.dicomFolderWorkupPlan) : val })),
  setDicomFirstFramePreview: (val) => set((state) => ({ dicomFirstFramePreview: typeof val === 'function' ? (val as any)(state.dicomFirstFramePreview) : val })),
  setDicomFirstFrameViewerState: (val) => set((state) => ({ dicomFirstFrameViewerState: typeof val === 'function' ? (val as any)(state.dicomFirstFrameViewerState) : val })),
  setDicomWebEndpointUrl: (val) => set((state) => ({ dicomWebEndpointUrl: typeof val === 'function' ? (val as any)(state.dicomWebEndpointUrl) : val })),
  setDicomWebCheck: (val) => set((state) => ({ dicomWebCheck: typeof val === 'function' ? (val as any)(state.dicomWebCheck) : val })),
  setDicomViewerLaunchManifest: (val) => set((state) => ({ dicomViewerLaunchManifest: typeof val === 'function' ? (val as any)(state.dicomViewerLaunchManifest) : val })),
  setDicomViewerToolStateBundle: (val) => set((state) => ({ dicomViewerToolStateBundle: typeof val === 'function' ? (val as any)(state.dicomViewerToolStateBundle) : val })),
  setDicomViewerWorkbenchManifest: (val) => set((state) => ({ dicomViewerWorkbenchManifest: typeof val === 'function' ? (val as any)(state.dicomViewerWorkbenchManifest) : val })),
  setDicomWorkbenchLocalSavedAt: (val) => set((state) => ({ dicomWorkbenchLocalSavedAt: typeof val === 'function' ? (val as any)(state.dicomWorkbenchLocalSavedAt) : val })),
  setDicomWorkbenchServerBundle: (val) => set((state) => ({ dicomWorkbenchServerBundle: typeof val === 'function' ? (val as any)(state.dicomWorkbenchServerBundle) : val })),
  setDicomWorkbenchServerBundles: (val) => set((state) => ({ dicomWorkbenchServerBundles: typeof val === 'function' ? (val as any)(state.dicomWorkbenchServerBundles) : val })),
  setDicomWorkstationReadiness: (val) => set((state) => ({ dicomWorkstationReadiness: typeof val === 'function' ? (val as any)(state.dicomWorkstationReadiness) : val })),
  setDicomRenderCachePlan: (val) => set((state) => ({ dicomRenderCachePlan: typeof val === 'function' ? (val as any)(state.dicomRenderCachePlan) : val })),
  setSelectedImagingStudyId: (val) => set((state) => ({ selectedImagingStudyId: typeof val === 'function' ? (val as any)(state.selectedImagingStudyId) : val })),
  setImagingKindFilter: (val) => set((state) => ({ imagingKindFilter: typeof val === 'function' ? (val as any)(state.imagingKindFilter) : val })),
  setImagingViewerState: (val) => set((state) => ({ imagingViewerState: typeof val === 'function' ? (val as any)(state.imagingViewerState) : val })),
  setImagingViewerActiveTool: (val) => set((state) => ({ imagingViewerActiveTool: typeof val === 'function' ? (val as any)(state.imagingViewerActiveTool) : val })),
  setCtPlanningActiveQuickActionId: (val) => set((state) => ({ ctPlanningActiveQuickActionId: typeof val === 'function' ? (val as any)(state.ctPlanningActiveQuickActionId) : val })),
  setCtPlanningImplantPlan: (val) => set((state) => ({ ctPlanningImplantPlan: typeof val === 'function' ? (val as any)(state.ctPlanningImplantPlan) : val })),
  setImagingViewerAnnotations: (val) => set((state) => ({ imagingViewerAnnotations: typeof val === 'function' ? (val as any)(state.imagingViewerAnnotations) : val })),
  setImagingViewerNote: (val) => set((state) => ({ imagingViewerNote: typeof val === 'function' ? (val as any)(state.imagingViewerNote) : val })),
  setImagingViewerSession: (val) => set((state) => ({ imagingViewerSession: typeof val === 'function' ? (val as any)(state.imagingViewerSession) : val })),
  setImagingViewerSaveState: (val) => set((state) => ({ imagingViewerSaveState: typeof val === 'function' ? (val as any)(state.imagingViewerSaveState) : val })),
  setImagingViewerLocalSavedAt: (val) => set((state) => ({ imagingViewerLocalSavedAt: typeof val === 'function' ? (val as any)(state.imagingViewerLocalSavedAt) : val })),
  setImagingViewerSaveError: (val) => set((state) => ({ imagingViewerSaveError: typeof val === 'function' ? (val as any)(state.imagingViewerSaveError) : val })),
  setImagingViewerSessionReady: (val) => set((state) => ({ imagingViewerSessionReady: typeof val === 'function' ? (val as any)(state.imagingViewerSessionReady) : val })),
  setMprProjection: (val) => set((state) => ({ mprProjection: typeof val === 'function' ? (val as any)(state.mprProjection) : val })),
  setMprAxisDeg: (val) => set((state) => ({ mprAxisDeg: typeof val === 'function' ? (val as any)(state.mprAxisDeg) : val })),
  setMprSlabMm: (val) => set((state) => ({ mprSlabMm: typeof val === 'function' ? (val as any)(state.mprSlabMm) : val })),
  setMprSliceIndex: (val) => set((state) => ({ mprSliceIndex: typeof val === 'function' ? (val as any)(state.mprSliceIndex) : val })),
  setMprWindowPreset: (val) => set((state) => ({ mprWindowPreset: typeof val === 'function' ? (val as any)(state.mprWindowPreset) : val })),
  setMprCrosshairEnabled: (val) => set((state) => ({ mprCrosshairEnabled: typeof val === 'function' ? (val as any)(state.mprCrosshairEnabled) : val })),
  setMprLinkedPlanesEnabled: (val) => set((state) => ({ mprLinkedPlanesEnabled: typeof val === 'function' ? (val as any)(state.mprLinkedPlanesEnabled) : val })),
  setMprWorkbenchLocalSavedAt: (val) => set((state) => ({ mprWorkbenchLocalSavedAt: typeof val === 'function' ? (val as any)(state.mprWorkbenchLocalSavedAt) : val })),
  setMprWorkbenchDraftRestored: (val) => set((state) => ({ mprWorkbenchDraftRestored: typeof val === 'function' ? (val as any)(state.mprWorkbenchDraftRestored) : val })),
  setIsImagingImportLoading: (val) => set((state) => ({ isImagingImportLoading: typeof val === 'function' ? (val as any)(state.isImagingImportLoading) : val })),
  setIsImagingImportCommitting: (val) => set((state) => ({ isImagingImportCommitting: typeof val === 'function' ? (val as any)(state.isImagingImportCommitting) : val })),
  setImagingCreateSavingKind: (val) => set((state) => ({ imagingCreateSavingKind: typeof val === 'function' ? (val as any)(state.imagingCreateSavingKind) : val })),
  setIsImagingFolderScanning: (val) => set((state) => ({ isImagingFolderScanning: typeof val === 'function' ? (val as any)(state.isImagingFolderScanning) : val })),
  setIsDicomLocalDiscovering: (val) => set((state) => ({ isDicomLocalDiscovering: typeof val === 'function' ? (val as any)(state.isDicomLocalDiscovering) : val })),
  setIsLocalImagingOrganizing: (val) => set((state) => ({ isLocalImagingOrganizing: typeof val === 'function' ? (val as any)(state.isLocalImagingOrganizing) : val })),
  setIsDicomSeriesPreviewLoading: (val) => set((state) => ({ isDicomSeriesPreviewLoading: typeof val === 'function' ? (val as any)(state.isDicomSeriesPreviewLoading) : val })),
  setIsDicomWebChecking: (val) => set((state) => ({ isDicomWebChecking: typeof val === 'function' ? (val as any)(state.isDicomWebChecking) : val })),
  setIsDicomManifestBuilding: (val) => set((state) => ({ isDicomManifestBuilding: typeof val === 'function' ? (val as any)(state.isDicomManifestBuilding) : val })),
  setIsDicomToolStateBuilding: (val) => set((state) => ({ isDicomToolStateBuilding: typeof val === 'function' ? (val as any)(state.isDicomToolStateBuilding) : val })),
  setIsDicomWorkbenchBuilding: (val) => set((state) => ({ isDicomWorkbenchBuilding: typeof val === 'function' ? (val as any)(state.isDicomWorkbenchBuilding) : val })),
  setIsDicomWorkbenchServerSaving: (val) => set((state) => ({ isDicomWorkbenchServerSaving: typeof val === 'function' ? (val as any)(state.isDicomWorkbenchServerSaving) : val })),
  setIsDicomWorkbenchReconnecting: (val) => set((state) => ({ isDicomWorkbenchReconnecting: typeof val === 'function' ? (val as any)(state.isDicomWorkbenchReconnecting) : val })),
  setIsDicomWorkstationChecking: (val) => set((state) => ({ isDicomWorkstationChecking: typeof val === 'function' ? (val as any)(state.isDicomWorkstationChecking) : val })),
  setIsDicomRenderCachePlanning: (val) => set((state) => ({ isDicomRenderCachePlanning: typeof val === 'function' ? (val as any)(state.isDicomRenderCachePlanning) : val })),
  setIsDicomFolderWorkupPlanning: (val) => set((state) => ({ isDicomFolderWorkupPlanning: typeof val === 'function' ? (val as any)(state.isDicomFolderWorkupPlanning) : val })),
  setIsDicomFirstFramePreviewing: (val) => set((state) => ({ isDicomFirstFramePreviewing: typeof val === 'function' ? (val as any)(state.isDicomFirstFramePreviewing) : val })),
  setIsBrowserImagingFolderPicking: (val) => set((state) => ({ isBrowserImagingFolderPicking: typeof val === 'function' ? (val as any)(state.isBrowserImagingFolderPicking) : val })),
  setIsLocalDicomOperationActive: (val) => set((state) => ({ isLocalDicomOperationActive: typeof val === 'function' ? (val as any)(state.isLocalDicomOperationActive) : val })),
}));
