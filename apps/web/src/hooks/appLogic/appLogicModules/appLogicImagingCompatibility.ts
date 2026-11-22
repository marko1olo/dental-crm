import type {
	Dashboard,
	ImagingSourceKind,
	ImagingStudyKind,
	DicomMprTool,
	ImagingViewerTool,
} from "@dental/shared";
import type { OfflineSyncLogicSlice, SettingsAndIntegrationsLogicSlice } from "../types.js";
import type { MprProjection } from "../../../imagingUiLabels";
import type { DicomFirstFrameViewerState } from "../../settingsDerivations/types";
import {
	type ImagingViewerSaveState,
	defaultDicomFirstFrameViewerState,
	defaultImagingViewerState,
	dicomFirstFrameStatusLabels,
	imagingSourceChoices,
	xrayPregnancyStatusOptions,
	xrayStudyTypeOptions,
} from "../../../AppHelpers";
import { describeMprClinicalPresetProjectionFallback } from "../../../mprClinicalStatus";
import {
	imagingConnectorCards,
	imagingViewerCapabilities,
} from "../../../settingsStaticData";
import {
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
	formatSignedMprStep,
	mprAxisBounds,
	mprAxisNudgeDeg,
	mprSlabBounds,
	mprSlabNudgeMm,
	mprSliceIndexFromFraction,
	mprSliceNudgeSteps,
	mprSlicePresetFractions,
} from "../../../utils/math/mprMath";
import { dicomFolderWorkupPathLabels } from "../../../workspaceUiLabels";

export interface AppLogicImagingCompatibilityParams {
	offlineSync?: OfflineSyncLogicSlice | (Record<string, unknown> & { isOnline?: boolean | undefined }) | Record<string, unknown> | null | undefined;
	settingsAndIntegrations?:
		| SettingsAndIntegrationsLogicSlice
		| (Record<string, unknown> & {
				visibleImagingStudies?: Dashboard["imagingStudies"] | undefined;
				dicomWorkbenchModule?: { selectedImagingStudy?: Dashboard["imagingStudies"][number] | null | undefined } | null | undefined;
				mprAxisDeg?: number;
				mprAxisGuidance?: unknown;
				mprCrosshairEnabled?: boolean;
				mprLinkedPlanesEnabled?: boolean;
				mprProjection?: "axial" | "coronal" | "sagittal" | "panoramic" | "3d_reconstruction" | "oblique" | "panoramic_reconstruction" | "three_d_volume" | "mip";
				mprProjectionCompass?: unknown;
				mprSlabMm?: number;
				mprSliceIndex?: number;
				mprWindowPreset?: string;
				setMprAxisDeg?: (deg: number) => void;
				setMprCrosshairEnabled?: (enabled: boolean) => void;
				setMprLinkedPlanesEnabled?: (enabled: boolean) => void;
				setMprProjection?: (projection: "axial" | "coronal" | "sagittal" | "panoramic" | "3d_reconstruction" | "oblique" | "panoramic_reconstruction" | "three_d_volume" | "mip") => void;
				setMprSlabMm?: (mm: number) => void;
				setMprSliceIndex?: (index: number) => void;
				setMprWindowPreset?: (preset: string) => void;
		  })
		| Record<string, unknown>
		| null
		| undefined;
	appLogicBag: Record<string, unknown>;
}

export function buildAppLogicImagingCompatibility(params: AppLogicImagingCompatibilityParams) {
	const {
		offlineSync,
		settingsAndIntegrations,
		appLogicBag,
	} = params;

	const isOnline = Boolean(offlineSync && "isOnline" in offlineSync ? offlineSync.isOnline : false);
	const settingsRec = (settingsAndIntegrations ?? {}) as Record<string, unknown>;
	const visibleImagingStudies = (settingsRec.visibleImagingStudies as Dashboard["imagingStudies"] | undefined) ?? [];
	const dicomWorkbenchModule = (settingsRec.dicomWorkbenchModule as Record<string, unknown> | null | undefined) ?? {};

	const activeImagingStudies = visibleImagingStudies;
	const canRetryImagingViewerSave = false;

	const imagingViewerSaveTitle: Record<ImagingViewerSaveState, string> = {
		idle: "Сессия просмотра",
		local: "Локальный черновик сохранен",
		saving: "Сохраняю просмотр",
		saved: "Просмотр сохранен",
		queued: isOnline
			? "Повтор серверного сохранения в очереди"
			: "Офлайн-черновик сохранен",
		error: "Сохранение требует проверки",
	};

	const imagingPreviewSource = (
		study: Dashboard["imagingStudies"][number],
	) => {
		if (!study) return undefined;
		return (
			study.previewUrl ||
			(study as { imageUrl?: string }).imageUrl ||
			`/api/imaging/studies/${study.id}/preview.svg`
		);
	};

	const imagingViewerHref = (_study: Dashboard["imagingStudies"][number]) => "";
	const imagingViewerNoteReady = false;
	const imagingViewerNoteMissingId = "imaging-viewer-note-missing";
	const imagingViewerRetryMissingId = "imaging-viewer-retry-missing";

	const createImagingStudy = async (_kind: ImagingStudyKind) => {};

	const setDicomSeriesPreview = (
		typeof appLogicBag.setDicomSeriesPreview === "function"
			? (appLogicBag.setDicomSeriesPreview as (preview: unknown) => void)
			: (_preview: unknown): void => {}
	);
	const setDicomViewerLaunchManifest = (
		typeof appLogicBag.setDicomViewerLaunchManifest === "function"
			? (appLogicBag.setDicomViewerLaunchManifest as (manifest: unknown) => void)
			: (_manifest: unknown): void => {}
	);
	const setDicomViewerToolStateBundle = (
		typeof appLogicBag.setDicomViewerToolStateBundle === "function"
			? (appLogicBag.setDicomViewerToolStateBundle as (bundle: unknown) => void)
			: (_bundle: unknown): void => {}
	);
	const setDicomViewerWorkbenchManifest = (
		typeof appLogicBag.setDicomViewerWorkbenchManifest === "function"
			? (appLogicBag.setDicomViewerWorkbenchManifest as (manifest: unknown) => void)
			: (_manifest: unknown): void => {}
	);
	const setDicomWebCheck = (
		typeof appLogicBag.setDicomWebCheck === "function"
			? (appLogicBag.setDicomWebCheck as (check: unknown) => void)
			: (_check: unknown): void => {}
	);
	const setDicomWebEndpointUrl = (
		typeof appLogicBag.setDicomWebEndpointUrl === "function"
			? (appLogicBag.setDicomWebEndpointUrl as (url: string) => void)
			: (_url: string): void => {}
	);
	const setImagingImportCommit = (
		typeof appLogicBag.setImagingImportCommit === "function"
			? (appLogicBag.setImagingImportCommit as (commit: unknown) => void)
			: (_commit: unknown): void => {}
	);
	const setImagingImportPreview = (
		typeof appLogicBag.setImagingImportPreview === "function"
			? (appLogicBag.setImagingImportPreview as (preview: unknown) => void)
			: (_preview: unknown): void => {}
	);
	const setImagingImportSourceKind = (
		typeof appLogicBag.setImagingImportSourceKind === "function"
			? (appLogicBag.setImagingImportSourceKind as (kind: ImagingSourceKind) => void)
			: (_kind: ImagingSourceKind): void => {}
	);

	return {
		activeImagingStudies,
		canRetryImagingViewerSave,
		imagingViewerSaveTitle,
		imagingPreviewSource,
		imagingViewerHref,
		imagingViewerNoteReady,
		imagingViewerNoteMissingId,
		imagingViewerRetryMissingId,
		createImagingStudy,
		cbctWorkbenchPlanes: null,
		cbctWorkbenchProjections: (appLogicBag.cbctWorkbenchProjections as MprProjection[] | undefined) ?? ["axial", "coronal", "sagittal"],
		cbctWorkbenchTools: (appLogicBag.cbctWorkbenchTools as DicomMprTool[] | undefined) ?? [],
		createCtPlanningArtifact: null,
		ctPlanningActiveQuickActionId: appLogicBag.ctPlanningActiveQuickActionId ?? null,
		ctPlanningAnnotationRefs: [],
		ctPlanningImplantPlan: appLogicBag.ctPlanningImplantPlan ?? null,
		dicomDiagnosticPixelPolicyLabels: appLogicBag.dicomDiagnosticPixelPolicyLabels ?? {},
		dicomExecutionLaneLabels: appLogicBag.dicomExecutionLaneLabels ?? {},
		dicomFirstFramePreview: appLogicBag.dicomFirstFramePreview ?? null,
		dicomFirstFrameStatusLabels,
		dicomFirstFrameViewerState: appLogicBag.dicomFirstFrameViewerState ?? null,
		dicomFolderSeriesScan: appLogicBag.dicomFolderSeriesScan ?? null,
		dicomFolderWorkupPathLabels,
		dicomFolderWorkupPlan: appLogicBag.dicomFolderWorkupPlan ?? null,
		dicomGpuClassLabels: appLogicBag.dicomGpuClassLabels ?? {},
		dicomLabel: appLogicBag.dicomLabel ?? (() => ""),
		dicomLocalFolderDiscovery: appLogicBag.dicomLocalFolderDiscovery ?? null,
		dicomQualityModeLabels: appLogicBag.dicomQualityModeLabels ?? {},
		dicomReadinessCheckLabels: appLogicBag.dicomReadinessCheckLabels ?? {},
		dicomRenderCachePlan: appLogicBag.dicomRenderCachePlan ?? null,
		dicomRenderMemoryBudgetClassLabels: appLogicBag.dicomRenderMemoryBudgetClassLabels ?? {},
		dicomRuntimeTierLabels: appLogicBag.dicomRuntimeTierLabels ?? {},
		dicomSeriesPreview: appLogicBag.dicomSeriesPreview ?? null,
		dicomSeriesViewerLabels: appLogicBag.dicomSeriesViewerLabels ?? {},
		dicomTextureStrategyLabels: appLogicBag.dicomTextureStrategyLabels ?? {},
		dicomViewerLaunchManifest: appLogicBag.dicomViewerLaunchManifest ?? null,
		dicomViewerLaunchModeLabels: appLogicBag.dicomViewerLaunchModeLabels ?? {},
		dicomViewerToolStateBundle: appLogicBag.dicomViewerToolStateBundle ?? null,
		dicomViewerWorkbenchManifest: appLogicBag.dicomViewerWorkbenchManifest ?? null,
		dicomWebCheck: appLogicBag.dicomWebCheck ?? null,
		dicomWebEndpointUrl: typeof appLogicBag.dicomWebEndpointUrl === "string" ? appLogicBag.dicomWebEndpointUrl : "",
		dicomWebStatusLabels: appLogicBag.dicomWebStatusLabels ?? {},
		dicomWorkbenchLocalSavedAt: appLogicBag.dicomWorkbenchLocalSavedAt ?? null,
		dicomWorkbenchServerBundle: appLogicBag.dicomWorkbenchServerBundle ?? null,
		dicomWorkstationReadiness: appLogicBag.dicomWorkstationReadiness ?? null,
		imagingConnectorCards,
		imagingCreateSavingKind: appLogicBag.imagingCreateSavingKind ?? null,
		imagingFolderPath: typeof appLogicBag.imagingFolderPath === "string" ? appLogicBag.imagingFolderPath : "",
		imagingFolderScan: appLogicBag.imagingFolderScan ?? null,
		imagingImportCommit: appLogicBag.imagingImportCommit ?? null,
		imagingImportPreview: appLogicBag.imagingImportPreview ?? null,
		imagingImportSourceKind: (appLogicBag.imagingImportSourceKind as ImagingSourceKind | undefined) ?? "manual_upload",
		imagingImportText: typeof appLogicBag.imagingImportText === "string" ? appLogicBag.imagingImportText : "",
		imagingKindFilter: appLogicBag.imagingKindFilter ?? "all",
		imagingToothFilter: appLogicBag.imagingToothFilter ?? "all",
		imagingKindLabels: appLogicBag.imagingKindLabels ?? {},
		imagingKindOptions: appLogicBag.imagingKindOptions ?? [],
		imagingSourceChoices,
		imagingSourceDetails: appLogicBag.imagingSourceDetails ?? {},
		imagingSourceLabels: (appLogicBag.imagingSourceLabels as Record<ImagingSourceKind, string> | undefined) ?? ({} as Record<ImagingSourceKind, string>),
		imagingViewerActiveTool: appLogicBag.imagingViewerActiveTool ?? "select",
		imagingViewerAnnotations: appLogicBag.imagingViewerAnnotations ?? [],
		imagingViewerCapabilities,
		imagingViewerImageStyle: null,
		imagingViewerNote: appLogicBag.imagingViewerNote ?? "",
		imagingViewerSaveDetail: appLogicBag.imagingViewerSaveDetail ?? null,
		imagingViewerSaveState: appLogicBag.imagingViewerSaveState ?? "idle",
		imagingViewerSessionReady: appLogicBag.imagingViewerSessionReady ?? false,
		imagingViewerState: appLogicBag.imagingViewerState ?? null,
		imagingViewerToolLabels: appLogicBag.imagingViewerToolLabels ?? {},
		isBrowserImagingFolderPicking: appLogicBag.isBrowserImagingFolderPicking ?? false,
		isDicomFirstFramePreviewing: typeof appLogicBag.isDicomFirstFramePreviewing === "boolean" ? appLogicBag.isDicomFirstFramePreviewing : false,
		isDicomFolderWorkupPlanning: appLogicBag.isDicomFolderWorkupPlanning ?? false,
		isDicomLocalDiscovering: appLogicBag.isDicomLocalDiscovering ?? false,
		isDicomManifestBuilding: appLogicBag.isDicomManifestBuilding ?? false,
		isDicomRenderCachePlanning: appLogicBag.isDicomRenderCachePlanning ?? false,
		isDicomSeriesPreviewLoading: appLogicBag.isDicomSeriesPreviewLoading ?? false,
		isDicomToolStateBuilding: appLogicBag.isDicomToolStateBuilding ?? false,
		isDicomWebChecking: appLogicBag.isDicomWebChecking ?? false,
		isDicomWorkbenchBuilding: appLogicBag.isDicomWorkbenchBuilding ?? false,
		isDicomWorkbenchReconnecting: appLogicBag.isDicomWorkbenchReconnecting ?? false,
		isDicomWorkbenchServerSaving: appLogicBag.isDicomWorkbenchServerSaving ?? false,
		isDicomWorkstationChecking: appLogicBag.isDicomWorkstationChecking ?? false,
		isImagingFolderScanning: appLogicBag.isImagingFolderScanning ?? false,
		isImagingImportCommitting: appLogicBag.isImagingImportCommitting ?? false,
		isImagingImportLoading: appLogicBag.isImagingImportLoading ?? false,
		isLocalDicomOperationActive: appLogicBag.isLocalDicomOperationActive ?? false,
		isLocalImagingOrganizing: appLogicBag.isLocalImagingOrganizing ?? false,
		localImagingFolderDraft: appLogicBag.localImagingFolderDraft ?? null,
		localImagingModelRoleLabels: appLogicBag.localImagingModelRoleLabels ?? {},
		localImagingOrganizer: appLogicBag.localImagingOrganizer ?? null,
		localImagingOrganizerActionLabels: appLogicBag.localImagingOrganizerActionLabels ?? {},
		mprActiveProjectionLabel: null,
		mprActiveProjectionOrientation: null,
		mprAxisAngleBadge: null,
		mprAxisBounds,
		mprAxisDeg: (settingsRec.mprAxisDeg as number | undefined) ?? 0,
		mprAxisDirectionLabel: null,
		mprAxisGuidance: settingsRec.mprAxisGuidance,
		mprAxisNudgeDeg,
		mprAxisPresetDeg: Array.isArray(appLogicBag.mprAxisPresetDeg) ? appLogicBag.mprAxisPresetDeg : [-30, -15, 0, 15, 30],
		mprAxisRangeValue: null,
		mprAxisVisualizerLabel: null,
		mprAxisVisualizerStyle: null,
		mprCacheModeLabels: appLogicBag.mprCacheModeLabels ?? {},
		mprClinicalChecklist: null,
		mprClinicalNextStep: null,
		mprClinicalPresetButtonClass: null,
		mprClinicalPresets: appLogicBag.mprClinicalPresets ?? [],
		mprControlsAutoOpen: null,
		mprControlsReady: null,
		mprCrosshairEnabled: Boolean(settingsRec.mprCrosshairEnabled),
		mprLinkedPlanesEnabled: Boolean(settingsRec.mprLinkedPlanesEnabled),
		mprLoadStrategyLabels: appLogicBag.mprLoadStrategyLabels ?? {},
		mprNearestClinicalPreset: null,
		mprOperatorSummaryCards: [],
		mprProjection: (settingsRec.mprProjection as "axial" | "coronal" | "sagittal" | "panoramic" | "3d_reconstruction" | "oblique" | "panoramic_reconstruction" | "three_d_volume" | "mip" | undefined) ?? "axial",
		mprProjectionCompass: settingsRec.mprProjectionCompass,
		mprProjectionLabels: (appLogicBag.mprProjectionLabels as Record<string, string> | undefined) ?? ({} as Record<string, string>),
		mprResourceTierLabels: appLogicBag.mprResourceTierLabels ?? {},
		mprSeriesRequiredProjectionLabel: appLogicBag.mprSeriesRequiredProjectionLabel ?? (() => ""),
		mprSlabBadge: null,
		mprSlabBounds,
		mprSlabMm: (settingsRec.mprSlabMm as number | undefined) ?? 1,
		mprSlabNudgeMm,
		mprSlabPresetMm: Array.isArray(appLogicBag.mprSlabPresetMm) ? appLogicBag.mprSlabPresetMm : [1, 2, 3, 5, 10, 20],
		mprSlabRangeValue: null,
		mprSliceBadge: null,
		mprSliceIndex: (settingsRec.mprSliceIndex as number | undefined) ?? 0,
		mprSliceIndexFromFraction,
		mprSliceLabel: null,
		mprSliceNudgeSteps,
		mprSlicePresetFractions,
		mprSliceRangeValue: null,
		mprToolLabels: appLogicBag.mprToolLabels ?? {},
		mprUnavailableProjectionLabel: appLogicBag.mprUnavailableProjectionLabel ?? (() => ""),
		mprWindowPreset: (settingsRec.mprWindowPreset as string | undefined) ?? "bone",
		mprWindowPresetLabels: (appLogicBag.mprWindowPresetLabels as Record<string, string> | undefined) ?? {},
		mprWorkbenchDraftRestored: appLogicBag.mprWorkbenchDraftRestored ?? false,
		mprWorkbenchLocalSavedAt: appLogicBag.mprWorkbenchLocalSavedAt ?? null,
		mprWorkbenchSummaryText: null,
		resetMprControls: null,
		selectedImagingStudy: (dicomWorkbenchModule as { selectedImagingStudy?: unknown })?.selectedImagingStudy as Dashboard["imagingStudies"][number] | null | undefined,
		visibleImagingStudies,
		applyCtPlanningQuickAction: null,
		applyMprClinicalPreset: null,
		applyNearestMprClinicalPreset: null,
		browserImagingFileInputAccept: ".dcm,.dicom,.zip,.png,.jpg,.jpeg,.stl,.obj",
		browserImagingFilesInputRef: { current: null },
		cancelBrowserImagingFolderScan: false,
		clearBrowserPickedImagingFolderPreview: null,
		clearLocalImagingFolderRecovery: null,
		defaultDicomFirstFrameViewerState,
		defaultImagingViewerState,
		describeMprClinicalPresetProjectionFallback,
		handleMprKeyboardNavigation: async (..._args: unknown[]) => {},
		imagingComparisonCandidates: [],
		setCtPlanningActiveQuickActionId: (appLogicBag.setCtPlanningActiveQuickActionId as ((id: string | null) => void) | undefined) ?? (() => {}),
		setCtPlanningImplantPlan: appLogicBag.setCtPlanningImplantPlan ?? (() => {}),
		setDicomFirstFramePreview: appLogicBag.setDicomFirstFramePreview ?? (() => {}),
		setDicomFirstFrameViewerState: (appLogicBag.setDicomFirstFrameViewerState as ((updater: (state: DicomFirstFrameViewerState) => DicomFirstFrameViewerState) => void) | undefined) ?? (() => {}),
		setDicomFolderSeriesScan: appLogicBag.setDicomFolderSeriesScan ?? (() => {}),
		setDicomFolderWorkupPlan: appLogicBag.setDicomFolderWorkupPlan ?? (() => {}),
		setDicomLocalFolderDiscovery: appLogicBag.setDicomLocalFolderDiscovery ?? (() => {}),
		setDicomRenderCachePlan: appLogicBag.setDicomRenderCachePlan ?? (() => {}),
		setDicomSeriesPreview,
		setDicomViewerLaunchManifest,
		setDicomViewerToolStateBundle,
		setDicomViewerWorkbenchManifest,
		setDicomWebCheck,
		setDicomWebEndpointUrl,
		setDicomWorkbenchLocalSavedAt: appLogicBag.setDicomWorkbenchLocalSavedAt ?? (() => {}),
		setDicomWorkstationReadiness: appLogicBag.setDicomWorkstationReadiness ?? (() => {}),
		setImagingFolderPath: appLogicBag.setImagingFolderPath ?? (() => {}),
		setImagingFolderScan: appLogicBag.setImagingFolderScan ?? (() => {}),
		setImagingImportCommit,
		setImagingImportPreview,
		setImagingImportSourceKind,
		setImagingImportText: appLogicBag.setImagingImportText ?? (() => {}),
		setImagingKindFilter: appLogicBag.setImagingKindFilter ?? (() => {}),
		setImagingToothFilter: appLogicBag.setImagingToothFilter ?? (() => {}),
		setImagingViewerActiveTool: (appLogicBag.setImagingViewerActiveTool as ((tool: ImagingViewerTool) => void) | undefined) ?? (() => {}),
		setImagingViewerNote: appLogicBag.setImagingViewerNote ?? (() => {}),
		setImagingViewerState: appLogicBag.setImagingViewerState ?? (() => {}),
		setLocalImagingOrganizer: appLogicBag.setLocalImagingOrganizer ?? (() => {}),
		setMprAxisDeg: typeof settingsRec.setMprAxisDeg === "function" ? (settingsRec.setMprAxisDeg as (deg: number) => void) : (() => {}),
		setMprCrosshairEnabled: typeof settingsRec.setMprCrosshairEnabled === "function" ? (settingsRec.setMprCrosshairEnabled as (enabled: boolean) => void) : (() => {}),
		setMprLinkedPlanesEnabled: typeof settingsRec.setMprLinkedPlanesEnabled === "function" ? (settingsRec.setMprLinkedPlanesEnabled as (enabled: boolean) => void) : (() => {}),
		setMprProjection: typeof settingsRec.setMprProjection === "function" ? (settingsRec.setMprProjection as (projection: "axial" | "coronal" | "sagittal" | "panoramic" | "3d_reconstruction" | "oblique" | "panoramic_reconstruction" | "three_d_volume" | "mip") => void) : (() => {}),
		setMprSlabMm: typeof settingsRec.setMprSlabMm === "function" ? (settingsRec.setMprSlabMm as (mm: number) => void) : (() => {}),
		setMprSliceIndex: typeof settingsRec.setMprSliceIndex === "function" ? (settingsRec.setMprSliceIndex as (index: number) => void) : (() => {}),
		setMprWindowPreset: typeof settingsRec.setMprWindowPreset === "function" ? (settingsRec.setMprWindowPreset as (preset: string) => void) : (() => {}),
		setSelectedImagingStudyId: appLogicBag.setSelectedImagingStudyId ?? (() => {}),
		xrayPregnancyStatusOptions,
		xrayStudyTypeOptions,
		clampMprAxisDeg,
		clampMprSlabMm,
		clampMprSliceIndex,
		formatSignedMprStep,
	};
}

export type AppLogicImagingCompatibilitySlice = ReturnType<typeof buildAppLogicImagingCompatibility>;
