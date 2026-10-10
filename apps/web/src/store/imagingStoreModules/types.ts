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
};

export interface SliceNavigationSlice {
	mprProjection: MprProjection;
	setMprProjection: (
		val: MprProjection | ((prev: MprProjection) => MprProjection),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprAxisDeg: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMprAxisDeg: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprSlabMm: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMprSlabMm: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprSliceIndex: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMprSliceIndex: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprCrosshairEnabled: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMprCrosshairEnabled: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprLinkedPlanesEnabled: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMprLinkedPlanesEnabled: (val: any | ((prev: any) => any)) => void;
	mprWorkbenchLocalSavedAt: string | null;
	setMprWorkbenchLocalSavedAt: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprWorkbenchDraftRestored: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setMprWorkbenchDraftRestored: (val: any | ((prev: any) => any)) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	imagingViewerNote: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImagingViewerNote: (val: any | ((prev: any) => any)) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	imagingViewerSessionReady: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImagingViewerSessionReady: (val: any | ((prev: any) => any)) => void;
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
	imagingCreateSavingKind: ImagingStudyKind | null;
	setImagingCreateSavingKind: (
		val:
			| ImagingStudyKind
			| null
			| ((prev: ImagingStudyKind | null) => ImagingStudyKind | null),
	) => void;
}

export interface DicomWorkstationSlice {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	imagingImportText: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImagingImportText: (val: any | ((prev: any) => any)) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	imagingFolderPath: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setImagingFolderPath: (val: any | ((prev: any) => any)) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	browserDirectoryPickerAvailable: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setBrowserDirectoryPickerAvailable: (val: any | ((prev: any) => any)) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	dicomWebEndpointUrl: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setDicomWebEndpointUrl: (val: any | ((prev: any) => any)) => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isImagingImportLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsImagingImportLoading: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isImagingImportCommitting: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsImagingImportCommitting: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isImagingFolderScanning: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsImagingFolderScanning: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomLocalDiscovering: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomLocalDiscovering: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isLocalImagingOrganizing: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsLocalImagingOrganizing: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomSeriesPreviewLoading: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomSeriesPreviewLoading: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomWebChecking: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomWebChecking: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomManifestBuilding: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomManifestBuilding: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomToolStateBuilding: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomToolStateBuilding: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomWorkbenchBuilding: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomWorkbenchBuilding: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomWorkbenchServerSaving: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomWorkbenchServerSaving: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomWorkbenchReconnecting: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomWorkbenchReconnecting: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomWorkstationChecking: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomWorkstationChecking: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomRenderCachePlanning: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomRenderCachePlanning: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomFolderWorkupPlanning: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomFolderWorkupPlanning: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isDicomFirstFramePreviewing: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsDicomFirstFramePreviewing: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isBrowserImagingFolderPicking: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsBrowserImagingFolderPicking: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	isLocalDicomOperationActive: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setIsLocalDicomOperationActive: (val: any | ((prev: any) => any)) => void;
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
