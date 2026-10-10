import {
	defaultDicomFirstFrameViewerState,
	defaultImagingViewerState,
} from "../../utils/draftDefaults";
import {
	defaultUiPreferences,
	loadUiPreferences,
} from "../../utils/preferencesUtils";
import type {
	DicomWorkstationSlice,
	FilterSettingsSlice,
	MeasurementsSlice,
	SliceNavigationSlice,
} from "./types";

const initialUiPreferences = loadUiPreferences() ?? defaultUiPreferences;

export type SliceNavigationStateValues = Omit<
	SliceNavigationSlice,
	| "setMprProjection"
	| "setMprAxisDeg"
	| "setMprSlabMm"
	| "setMprSliceIndex"
	| "setMprCrosshairEnabled"
	| "setMprLinkedPlanesEnabled"
	| "setMprWorkbenchLocalSavedAt"
	| "setMprWorkbenchDraftRestored"
>;

export type MeasurementsStateValues = Omit<
	MeasurementsSlice,
	| "setCtPlanningActiveQuickActionId"
	| "setCtPlanningImplantPlan"
	| "setImagingViewerAnnotations"
	| "setImagingViewerActiveTool"
	| "setImagingViewerNote"
	| "setImagingViewerSession"
	| "setImagingViewerSaveState"
	| "setImagingViewerLocalSavedAt"
	| "setImagingViewerSaveError"
	| "setImagingViewerSessionReady"
>;

export type FilterSettingsStateValues = Omit<
	FilterSettingsSlice,
	| "setMprWindowPreset"
	| "setImagingViewerState"
	| "setSelectedImagingStudyId"
	| "setImagingKindFilter"
	| "setImagingCreateSavingKind"
>;

export type DicomWorkstationStateValues = Omit<
	DicomWorkstationSlice,
	| "setImagingImportText"
	| "setImagingImportSourceKind"
	| "setLocalImagingFolderDraft"
	| "setImagingFolderPath"
	| "setBrowserPickedImagingFolder"
	| "setBrowserImagingScanProgress"
	| "setBrowserDirectoryPickerAvailable"
	| "setImagingImportPreview"
	| "setImagingImportCommit"
	| "setImagingFolderScan"
	| "setDicomLocalFolderDiscovery"
	| "setLocalImagingOrganizer"
	| "setDicomSeriesPreview"
	| "setDicomFolderSeriesScan"
	| "setDicomFolderWorkupPlan"
	| "setDicomFirstFramePreview"
	| "setDicomFirstFrameViewerState"
	| "setDicomWebEndpointUrl"
	| "setDicomWebCheck"
	| "setDicomViewerLaunchManifest"
	| "setDicomViewerToolStateBundle"
	| "setDicomViewerWorkbenchManifest"
	| "setDicomWorkbenchLocalSavedAt"
	| "setDicomWorkbenchServerBundle"
	| "setDicomWorkbenchServerBundles"
	| "setDicomWorkstationReadiness"
	| "setDicomRenderCachePlan"
	| "setIsImagingImportLoading"
	| "setIsImagingImportCommitting"
	| "setIsImagingFolderScanning"
	| "setIsDicomLocalDiscovering"
	| "setIsLocalImagingOrganizing"
	| "setIsDicomSeriesPreviewLoading"
	| "setIsDicomWebChecking"
	| "setIsDicomManifestBuilding"
	| "setIsDicomToolStateBuilding"
	| "setIsDicomWorkbenchBuilding"
	| "setIsDicomWorkbenchServerSaving"
	| "setIsDicomWorkbenchReconnecting"
	| "setIsDicomWorkstationChecking"
	| "setIsDicomRenderCachePlanning"
	| "setIsDicomFolderWorkupPlanning"
	| "setIsDicomFirstFramePreviewing"
	| "setIsBrowserImagingFolderPicking"
	| "setIsLocalDicomOperationActive"
>;

export const initialSliceNavigationState: SliceNavigationStateValues = {
	mprProjection: "axial",
	mprAxisDeg: 0,
	mprSlabMm: 1,
	mprSliceIndex: 0,
	mprCrosshairEnabled: true,
	mprLinkedPlanesEnabled: true,
	mprWorkbenchLocalSavedAt: null,
	mprWorkbenchDraftRestored: false,
};

export const initialMeasurementsState: MeasurementsStateValues = {
	ctPlanningActiveQuickActionId: null,
	ctPlanningImplantPlan: null,
	imagingViewerAnnotations: [],
	imagingViewerActiveTool: "window_level",
	imagingViewerNote: "",
	imagingViewerSession: null,
	imagingViewerSaveState: "idle",
	imagingViewerLocalSavedAt: null,
	imagingViewerSaveError: null,
	imagingViewerSessionReady: false,
};

export const initialFilterSettingsState: FilterSettingsStateValues = {
	mprWindowPreset: "bone",
	imagingViewerState: defaultImagingViewerState,
	selectedImagingStudyId: null,
	imagingKindFilter: initialUiPreferences.imagingKindFilter,
	imagingCreateSavingKind: null,
};

export const initialDicomWorkstationState: DicomWorkstationStateValues = {
	imagingImportText:
		"ФИО;Телефон;Тип;Зуб;Дата;Файл;Источник\nИванова Марина Сергеевна;+7 927 111-22-33;RVG;36;12.05.2026;C:\\Images\\ivanova_36.dcm;локальный RVG-датчик\nИванова Марина Сергеевна;+7 927 111-22-33;ТРГ;;10.05.2026;C:\\Images\\ivanova_ceph.ima;экспорт Sidexis\nПетров Алексей Николаевич;+7 927 555-19-40;ОПТГ;;10.05.2026;C:\\Images\\petrov_opg.jpg;экспорт ОПТГ",
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
	isImagingImportLoading: false,
	isImagingImportCommitting: false,
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
};

export const initialImagingResetState = {
	imagingImportPreview: null,
	imagingImportCommit: null,
	imagingFolderScan: null,
	dicomLocalFolderDiscovery: null,
	localImagingOrganizer: null,
	dicomSeriesPreview: null,
	dicomFolderSeriesScan: null,
	dicomFolderWorkupPlan: null,
	dicomFirstFramePreview: null,
	selectedImagingStudyId: null,
	imagingViewerState: defaultImagingViewerState,
	dicomFirstFrameViewerState: defaultDicomFirstFrameViewerState,
	imagingViewerAnnotations: [],
	imagingViewerSession: null,
	ctPlanningImplantPlan: null,
};
