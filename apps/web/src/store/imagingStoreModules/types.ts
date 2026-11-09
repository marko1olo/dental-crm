import type {
	DicomFirstFramePreviewResponse,
	DicomFolderSeriesPreviewResponse,
	DicomFolderWorkupPlanResponse,
	DicomLocalFolderDiscoveryResponse,
	DicomRenderCachePlanResponse,
	DicomSeriesPreviewResponse,
	DicomViewerLaunchManifestResponse,
	DicomViewerToolStateBundleResponse,
	DicomViewerWorkbenchManifestResponse,
	DicomWebConnectorCheckResponse,
	DicomWorkbenchBundle,
	DicomWorkstationReadinessResponse,
	ImagingFolderScanResponse,
	ImagingImportCommitResponse,
	ImagingImportPreviewResponse,
	ImagingSourceKind,
	ImagingStudyKind,
	ImagingViewerAnnotation,
	ImagingViewerImplantPlan,
	ImagingViewerSessionResponse,
	ImagingViewerState,
	ImagingViewerTool,
	LocalImagingOrganizerResponse,
	MprProjection,
	MprWindowPreset,
} from "@dental/shared";
import type {
	BrowserImagingScanProgress,
	BrowserPickedImagingFolderPreview,
	ImagingViewerSaveState,
	LocalImagingFolderDraft,
} from "../../AppConstants";
import type { RadiologyStudyRecord } from "../../components/visiograph/visiographCatalogData";

export type {
	BrowserImagingScanProgress,
	BrowserPickedImagingFolderPreview,
	DicomFirstFramePreviewResponse,
	DicomFolderSeriesPreviewResponse,
	DicomFolderWorkupPlanResponse,
	DicomLocalFolderDiscoveryResponse,
	DicomRenderCachePlanResponse,
	DicomSeriesPreviewResponse,
	DicomViewerLaunchManifestResponse,
	DicomViewerToolStateBundleResponse,
	DicomViewerWorkbenchManifestResponse,
	DicomWebConnectorCheckResponse,
	DicomWorkbenchBundle,
	DicomWorkstationReadinessResponse,
	ImagingFolderScanResponse,
	ImagingImportCommitResponse,
	ImagingImportPreviewResponse,
	ImagingSourceKind,
	ImagingStudyKind,
	ImagingViewerAnnotation,
	ImagingViewerImplantPlan,
	ImagingViewerSaveState,
	ImagingViewerSessionResponse,
	ImagingViewerState,
	ImagingViewerTool,
	LocalImagingFolderDraft,
	LocalImagingOrganizerResponse,
	MprProjection,
	MprWindowPreset,
	RadiologyStudyRecord,
};

export interface DicomSeriesMetadata {
	readonly seriesInstanceUid: string;
	readonly studyInstanceUid: string;
	readonly seriesNumber?: number;
	readonly modality: string;
	readonly seriesDescription?: string;
	readonly numberOfInstances?: number;
	readonly sliceThicknessMm?: number;
	readonly pixelSpacingMm?: [number, number];
	readonly patientId?: string;
	readonly patientName?: string;
	readonly acquisitionDate?: string;
}

export interface CbctVolumeSlice {
	readonly sliceIndex: number;
	readonly projection: MprProjection;
	readonly zPositionMm: number;
	readonly width: number;
	readonly height: number;
	readonly pixelSpacingMm: number;
	readonly minHounsfield: number;
	readonly maxHounsfield: number;
	readonly windowWidth: number;
	readonly windowCenter: number;
	readonly voxelData?: Int16Array | Uint8Array | Float32Array;
}

export interface DentalVisioPreset {
	readonly id: string;
	readonly label: string;
	readonly windowWidth: number;
	readonly windowCenter: number;
	readonly gamma?: number;
	readonly sharpen?: boolean;
	readonly invert?: boolean;
	readonly description?: string;
}

export interface BoneDensityMeasurement {
	readonly id: string;
	readonly xMm: number;
	readonly yMm: number;
	readonly zMm: number;
	readonly hounsfieldUnit: number;
	readonly boneClass: "D1" | "D2" | "D3" | "D4";
	readonly description: string;
	readonly timestamp: string;
}

export interface SliceNavigationSlice {
	mprProjection: MprProjection;
	setMprProjection: (
		val: MprProjection | ((prev: MprProjection) => MprProjection),
	) => void;
	mprAxisDeg: number;
	setMprAxisDeg: (val: number | ((prev: number) => number)) => void;
	mprSlabMm: number;
	setMprSlabMm: (val: number | ((prev: number) => number)) => void;
	mprSliceIndex: number;
	setMprSliceIndex: (val: number | ((prev: number) => number)) => void;
	mprCrosshairEnabled: boolean;
	setMprCrosshairEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
	mprLinkedPlanesEnabled: boolean;
	setMprLinkedPlanesEnabled: (val: boolean | ((prev: boolean) => boolean)) => void;
	mprWorkbenchLocalSavedAt: string | null;
	setMprWorkbenchLocalSavedAt: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	mprWorkbenchDraftRestored: boolean;
	setMprWorkbenchDraftRestored: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export interface MeasurementsSlice {
	ctPlanningActiveQuickActionId: string | null;
	setCtPlanningActiveQuickActionId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	ctPlanningImplantPlan: ImagingViewerImplantPlan | null;
	setCtPlanningImplantPlan: (
		val:
			| ImagingViewerImplantPlan
			| null
			| ((
					prev: ImagingViewerImplantPlan | null,
			  ) => ImagingViewerImplantPlan | null),
	) => void;
	imagingViewerAnnotations: ImagingViewerAnnotation[];
	setImagingViewerAnnotations: (
		val:
			| ImagingViewerAnnotation[]
			| ((prev: ImagingViewerAnnotation[]) => ImagingViewerAnnotation[]),
	) => void;
	imagingViewerActiveTool: ImagingViewerTool;
	setImagingViewerActiveTool: (
		val: ImagingViewerTool | ((prev: ImagingViewerTool) => ImagingViewerTool),
	) => void;
	imagingViewerNote: string;
	setImagingViewerNote: (val: string | ((prev: string) => string)) => void;
	imagingViewerSession: ImagingViewerSessionResponse["session"] | null;
	setImagingViewerSession: (
		val:
			| ImagingViewerSessionResponse["session"]
			| null
			| ((
					prev: ImagingViewerSessionResponse["session"] | null,
			  ) => ImagingViewerSessionResponse["session"] | null),
	) => void;
	imagingViewerSaveState: ImagingViewerSaveState;
	setImagingViewerSaveState: (
		val:
			| ImagingViewerSaveState
			| ((prev: ImagingViewerSaveState) => ImagingViewerSaveState),
	) => void;
	imagingViewerLocalSavedAt: string | null;
	setImagingViewerLocalSavedAt: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	imagingViewerSaveError: string | null;
	setImagingViewerSaveError: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	imagingViewerSessionReady: boolean;
	setImagingViewerSessionReady: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export interface FilterSettingsSlice {
	mprWindowPreset: MprWindowPreset;
	setMprWindowPreset: (
		val: MprWindowPreset | ((prev: MprWindowPreset) => MprWindowPreset),
	) => void;
	imagingViewerState: ImagingViewerState;
	setImagingViewerState: (
		val:
			| ImagingViewerState
			| ((prev: ImagingViewerState) => ImagingViewerState),
	) => void;
	selectedImagingStudyId: string | null;
	setSelectedImagingStudyId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	imagingKindFilter: ImagingStudyKind | "all";
	setImagingKindFilter: (
		val:
			| ImagingStudyKind
			| "all"
			| ((prev: ImagingStudyKind | "all") => ImagingStudyKind | "all"),
	) => void;
	imagingToothFilter: string | "all";
	setImagingToothFilter: (
		val:
			| string
			| "all"
			| ((prev: string | "all") => string | "all"),
	) => void;
	imagingCreateSavingKind: ImagingStudyKind | null;
	setImagingCreateSavingKind: (
		val:
			| ImagingStudyKind
			| null
			| ((prev: ImagingStudyKind | null) => ImagingStudyKind | null),
	) => void;
}

export interface DicomWorkstationSlice {
	imagingImportText: string;
	setImagingImportText: (val: string | ((prev: string) => string)) => void;
	imagingImportSourceKind: ImagingSourceKind;
	setImagingImportSourceKind: (
		val: ImagingSourceKind | ((prev: ImagingSourceKind) => ImagingSourceKind),
	) => void;
	localImagingFolderDraft: LocalImagingFolderDraft | null;
	setLocalImagingFolderDraft: (
		val:
			| LocalImagingFolderDraft
			| null
			| ((
					prev: LocalImagingFolderDraft | null,
			  ) => LocalImagingFolderDraft | null),
	) => void;
	imagingFolderPath: string;
	setImagingFolderPath: (val: string | ((prev: string) => string)) => void;
	browserPickedImagingFolder: BrowserPickedImagingFolderPreview | null;
	setBrowserPickedImagingFolder: (
		val:
			| BrowserPickedImagingFolderPreview
			| null
			| ((
					prev: BrowserPickedImagingFolderPreview | null,
			  ) => BrowserPickedImagingFolderPreview | null),
	) => void;
	browserImagingScanProgress: BrowserImagingScanProgress | null;
	setBrowserImagingScanProgress: (
		val:
			| BrowserImagingScanProgress
			| null
			| ((
					prev: BrowserImagingScanProgress | null,
			  ) => BrowserImagingScanProgress | null),
	) => void;
	browserDirectoryPickerAvailable: boolean | null;
	setBrowserDirectoryPickerAvailable: (val: boolean | null | ((prev: boolean | null) => boolean | null)) => void;
	imagingImportPreview: ImagingImportPreviewResponse | null;
	setImagingImportPreview: (
		val:
			| ImagingImportPreviewResponse
			| null
			| ((
					prev: ImagingImportPreviewResponse | null,
			  ) => ImagingImportPreviewResponse | null),
	) => void;
	imagingImportCommit: ImagingImportCommitResponse | null;
	setImagingImportCommit: (
		val:
			| ImagingImportCommitResponse
			| null
			| ((
					prev: ImagingImportCommitResponse | null,
			  ) => ImagingImportCommitResponse | null),
	) => void;
	imagingFolderScan: ImagingFolderScanResponse | null;
	setImagingFolderScan: (
		val:
			| ImagingFolderScanResponse
			| null
			| ((
					prev: ImagingFolderScanResponse | null,
			  ) => ImagingFolderScanResponse | null),
	) => void;
	dicomLocalFolderDiscovery: DicomLocalFolderDiscoveryResponse | null;
	setDicomLocalFolderDiscovery: (
		val:
			| DicomLocalFolderDiscoveryResponse
			| null
			| ((
					prev: DicomLocalFolderDiscoveryResponse | null,
			  ) => DicomLocalFolderDiscoveryResponse | null),
	) => void;
	localImagingOrganizer: LocalImagingOrganizerResponse | null;
	setLocalImagingOrganizer: (
		val:
			| LocalImagingOrganizerResponse
			| null
			| ((
					prev: LocalImagingOrganizerResponse | null,
			  ) => LocalImagingOrganizerResponse | null),
	) => void;
	dicomSeriesPreview: DicomSeriesPreviewResponse | null;
	setDicomSeriesPreview: (
		val:
			| DicomSeriesPreviewResponse
			| null
			| ((
					prev: DicomSeriesPreviewResponse | null,
			  ) => DicomSeriesPreviewResponse | null),
	) => void;
	dicomFolderSeriesScan: DicomFolderSeriesPreviewResponse | null;
	setDicomFolderSeriesScan: (
		val:
			| DicomFolderSeriesPreviewResponse
			| null
			| ((
					prev: DicomFolderSeriesPreviewResponse | null,
			  ) => DicomFolderSeriesPreviewResponse | null),
	) => void;
	dicomFolderWorkupPlan: DicomFolderWorkupPlanResponse | null;
	setDicomFolderWorkupPlan: (
		val:
			| DicomFolderWorkupPlanResponse
			| null
			| ((
					prev: DicomFolderWorkupPlanResponse | null,
			  ) => DicomFolderWorkupPlanResponse | null),
	) => void;
	dicomFirstFramePreview: DicomFirstFramePreviewResponse | null;
	setDicomFirstFramePreview: (
		val:
			| DicomFirstFramePreviewResponse
			| null
			| ((
					prev: DicomFirstFramePreviewResponse | null,
			  ) => DicomFirstFramePreviewResponse | null),
	) => void;
	dicomFirstFrameViewerState: ImagingViewerState;
	setDicomFirstFrameViewerState: (
		val:
			| ImagingViewerState
			| ((prev: ImagingViewerState) => ImagingViewerState),
	) => void;
	dicomWebEndpointUrl: string;
	setDicomWebEndpointUrl: (val: string | ((prev: string) => string)) => void;
	dicomWebCheck: DicomWebConnectorCheckResponse | null;
	setDicomWebCheck: (
		val:
			| DicomWebConnectorCheckResponse
			| null
			| ((
					prev: DicomWebConnectorCheckResponse | null,
			  ) => DicomWebConnectorCheckResponse | null),
	) => void;
	dicomViewerLaunchManifest: DicomViewerLaunchManifestResponse | null;
	setDicomViewerLaunchManifest: (
		val:
			| DicomViewerLaunchManifestResponse
			| null
			| ((
					prev: DicomViewerLaunchManifestResponse | null,
			  ) => DicomViewerLaunchManifestResponse | null),
	) => void;
	dicomViewerToolStateBundle: DicomViewerToolStateBundleResponse | null;
	setDicomViewerToolStateBundle: (
		val:
			| DicomViewerToolStateBundleResponse
			| null
			| ((
					prev: DicomViewerToolStateBundleResponse | null,
			  ) => DicomViewerToolStateBundleResponse | null),
	) => void;
	dicomViewerWorkbenchManifest: DicomViewerWorkbenchManifestResponse | null;
	setDicomViewerWorkbenchManifest: (
		val:
			| DicomViewerWorkbenchManifestResponse
			| null
			| ((
					prev: DicomViewerWorkbenchManifestResponse | null,
			  ) => DicomViewerWorkbenchManifestResponse | null),
	) => void;
	dicomWorkbenchLocalSavedAt: string | null;
	setDicomWorkbenchLocalSavedAt: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	dicomWorkbenchServerBundle: DicomWorkbenchBundle | null;
	setDicomWorkbenchServerBundle: (
		val:
			| DicomWorkbenchBundle
			| null
			| ((prev: DicomWorkbenchBundle | null) => DicomWorkbenchBundle | null),
	) => void;
	dicomWorkbenchServerBundles: DicomWorkbenchBundle[];
	setDicomWorkbenchServerBundles: (
		val:
			| DicomWorkbenchBundle[]
			| ((prev: DicomWorkbenchBundle[]) => DicomWorkbenchBundle[]),
	) => void;
	dicomWorkstationReadiness: DicomWorkstationReadinessResponse | null;
	setDicomWorkstationReadiness: (
		val:
			| DicomWorkstationReadinessResponse
			| null
			| ((
					prev: DicomWorkstationReadinessResponse | null,
			  ) => DicomWorkstationReadinessResponse | null),
	) => void;
	dicomRenderCachePlan: DicomRenderCachePlanResponse | null;
	setDicomRenderCachePlan: (
		val:
			| DicomRenderCachePlanResponse
			| null
			| ((
					prev: DicomRenderCachePlanResponse | null,
			  ) => DicomRenderCachePlanResponse | null),
	) => void;
	isImagingImportLoading: boolean;
	setIsImagingImportLoading: (val: boolean | ((prev: boolean) => boolean)) => void;
	isImagingImportCommitting: boolean;
	setIsImagingImportCommitting: (val: boolean | ((prev: boolean) => boolean)) => void;
	isImagingFolderScanning: boolean;
	setIsImagingFolderScanning: (val: boolean | ((prev: boolean) => boolean)) => void;
	isDicomLocalDiscovering: boolean;
	setIsDicomLocalDiscovering: (val: boolean | ((prev: boolean) => boolean)) => void;
	isLocalImagingOrganizing: boolean;
	setIsLocalImagingOrganizing: (val: boolean | ((prev: boolean) => boolean)) => void;
	isDicomSeriesPreviewLoading: boolean;
	setIsDicomSeriesPreviewLoading: (val: boolean | ((prev: boolean) => boolean)) => void;
	isDicomWebChecking: boolean;
	setIsDicomWebChecking: (val: boolean | ((prev: boolean) => boolean)) => void;
	isDicomManifestBuilding: boolean;
	setIsDicomManifestBuilding: (val: boolean | ((prev: boolean) => boolean)) => void;
	isDicomToolStateBuilding: boolean;
	setIsDicomToolStateBuilding: (val: boolean | ((prev: boolean) => boolean)) => void;
	isDicomWorkbenchBuilding: boolean;
	setIsDicomWorkbenchBuilding: (val: boolean | ((prev: boolean) => boolean)) => void;
	isDicomWorkbenchServerSaving: boolean;
	setIsDicomWorkbenchServerSaving: (val: boolean | ((prev: boolean) => boolean)) => void;
	isDicomWorkbenchReconnecting: boolean;
	setIsDicomWorkbenchReconnecting: (val: boolean | ((prev: boolean) => boolean)) => void;
	isDicomWorkstationChecking: boolean;
	setIsDicomWorkstationChecking: (val: boolean | ((prev: boolean) => boolean)) => void;
	isDicomRenderCachePlanning: boolean;
	setIsDicomRenderCachePlanning: (val: boolean | ((prev: boolean) => boolean)) => void;
	isDicomFolderWorkupPlanning: boolean;
	setIsDicomFolderWorkupPlanning: (val: boolean | ((prev: boolean) => boolean)) => void;
	isDicomFirstFramePreviewing: boolean;
	setIsDicomFirstFramePreviewing: (val: boolean | ((prev: boolean) => boolean)) => void;
	isBrowserImagingFolderPicking: boolean;
	setIsBrowserImagingFolderPicking: (val: boolean | ((prev: boolean) => boolean)) => void;
	isLocalDicomOperationActive: boolean;
	setIsLocalDicomOperationActive: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export interface ResetSlice {
	reset: () => void;
}

export interface ImagingStore
	extends SliceNavigationSlice,
		MeasurementsSlice,
		FilterSettingsSlice,
		DicomWorkstationSlice,
		ResetSlice {}

export type ImagingState = ImagingStore;
