import type {
	AiRecognitionJob,
	Dashboard,
	DentalModelWorkbenchManifest,
	DicomFirstFramePreviewResponse,
	DicomFolderSeriesPreviewResponse,
	DicomFolderWorkupPlanResponse,
	DicomLocalFolderDiscoveryResponse,
	DicomMprTool,
	DicomRenderCachePlanResponse,
	DicomSeriesPreviewGroup,
	DicomViewerToolStateBundleResponse,
	DicomViewerWorkbenchManifestResponse,
	DicomWorkstationReadinessResponse,
	ImagingFolderScanResponse,
	ImagingImportPreviewResponse,
	ImagingSourceKind,
	ImagingViewerImplantPlan,
	ImagingViewerTool,
	IntegrationPreset,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePlansResponse,
	LocalImagingOrganizerResponse,
	SpeechProvider,
	SpeechRecordingRecoveryList,
} from "@dental/shared";
import type { KeyboardEvent } from "react";
import type { CtImplantLibraryItem, CtPlanningQuickAction } from "../../ctPlanningTools";
import {
	type MprClinicalPreset,
	type MprProjection,
	mprClinicalPresets,
	mprProjectionOrientationLabels,
} from "../../imagingUiLabels";
import {
	buildMprClinicalChecklist,
	buildMprOperatorSummary,
	buildMprWorkbenchSummary,
	findNearestMprClinicalPreset,
	mprClinicalNextAction,
	resolveMprClinicalPresetProjection,
} from "../../mprClinicalStatus";
import type {
	ImagingConnectorCard,
	ImagingViewerCapability,
	RecognitionPreset,
} from "../../settingsStaticData";
import {
	buildMprAxisGuidance,
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
	formatMprAxisAngleBadge,
	formatMprAxisDirectionLabel,
	formatMprAxisRangeValue,
	formatMprAxisVisualizerLabel,
	formatMprSlabBadge,
	formatMprSlabRangeValue,
	formatMprSliceBadge,
	formatMprSliceRangeValue,
	mprProjectionCompassLabels,
	mprSliceFraction,
	mprSliceIndexFromFraction,
	resolveMprKeyboardAdjustment,
} from "../../utils/math/mprMath";
import type {
	BrowserContinuityCheck,
	DicomFirstFrameViewerState,
	InputChangeEvent,
	MprAxisVisualizerStyle,
	PersistenceIntegrityReport,
} from "./types";

export function formatBrowserImagingScanElapsed(
	elapsedMs: number | null | undefined,
): string {
	const safeMs =
		typeof elapsedMs === "number" && Number.isFinite(elapsedMs)
			? Math.max(0, Math.round(elapsedMs))
			: 0;
	if (safeMs < 1000) return `${safeMs} ms`;
	const totalSeconds = Math.floor(safeMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes <= 0) return `${seconds} s`;
	return `${minutes} m ${String(seconds).padStart(2, "0")} s`;
}

export interface HardwareDerivationsParams {
	dashboard?: Dashboard | null;
	dicomWebEndpointUrl?: string;
	recognitionText?: string;
	imagingImportText?: string;
	importText?: string;
	imagingFolderPath?: string;
	imagingConnectorCards?: ImagingConnectorCard[];
	imagingViewerCapabilities?: ImagingViewerCapability[];
	ctPlanningImplantPlan?: unknown;
	ctPlanningActiveQuickActionId?: unknown;
	imagingViewerActiveTool?: unknown;
	recognitionPresets?: RecognitionPreset[];
	recognitionJob?: unknown;
	speechRecordingRecovery?: unknown;
	imagingSourceChoices?: ImagingSourceKind[];
	imagingImportPreview?: unknown;
	browserContinuityChecks?: BrowserContinuityCheck[];
	localBridgeReadiness?: unknown;
	localBridgeUsePlans?: unknown;
	persistenceIntegrity?: unknown;
	dicomFirstFramePreview?: unknown;
	dicomFirstFrameViewerState?: unknown;
	defaultDicomFirstFrameViewerState?: unknown;
	isDicomFirstFramePreviewing?: boolean;
	dicomSeriesPreview?: {
		series?: DicomSeriesPreviewGroup[];
		parserNotes?: string[];
	} | null;
	cbctWorkbenchSeries?: unknown;
	dicomViewerWorkbenchManifest?: unknown;
	dicomWorkstationReadiness?: unknown;
	dicomRenderCachePlan?: unknown;
	dicomViewerToolStateBundle?: unknown;
	dicomLocalFolderDiscovery?: unknown;
	localImagingOrganizer?: unknown;
	localImagingFolderDraft?: { folderFingerprint?: string } | null;
	imagingFolderScan?: unknown;
	dicomFolderSeriesScan?: unknown;
	dicomFolderWorkupPlan?: unknown;
	cbctWorkbenchTools?: DicomMprTool[];
	cbctWorkbenchProjections?: MprProjection[];
	mprSliceIndex: number;
	mprAxisDeg: number;
	mprSlabMm: number;
	mprProjection: string;
	mprWindowPreset: string;
	mprCrosshairEnabled: boolean;
	mprLinkedPlanesEnabled: boolean;
	mprProjectionLabels: Record<string, string>;
	mprWindowPresetLabels: Record<string, string>;
	setDicomFirstFrameViewerState: (
		updater: (state: DicomFirstFrameViewerState) => DicomFirstFrameViewerState,
	) => void;
	setMprProjection: (projection: MprProjection) => void;
	setMprAxisDeg: (deg: number) => void;
	setMprSlabMm: (mm: number) => void;
	setMprSliceIndex: (index: number) => void;
	setMprWindowPreset: (preset: string) => void;
	setMprCrosshairEnabled: (enabled: boolean) => void;
	setMprLinkedPlanesEnabled: (enabled: boolean) => void;
	setCtPlanningActiveQuickActionId?: (id: string | null) => void;
	setImagingViewerActiveTool: (tool: ImagingViewerTool) => void;
	selectCtPlanningImplant: (implant: CtImplantLibraryItem) => void;
}

export function deriveHardwareSettings(params: HardwareDerivationsParams) {
	const {
		dashboard,
		dicomWebEndpointUrl,
		recognitionText,
		imagingImportText,
		importText,
		imagingFolderPath,
		imagingConnectorCards,
		imagingViewerCapabilities,
		ctPlanningImplantPlan,
		ctPlanningActiveQuickActionId,
		imagingViewerActiveTool,
		recognitionPresets,
		recognitionJob,
		speechRecordingRecovery,
		imagingSourceChoices,
		imagingImportPreview,
		browserContinuityChecks,
		localBridgeReadiness,
		localBridgeUsePlans,
		persistenceIntegrity,
		dicomFirstFramePreview,
		dicomFirstFrameViewerState,
		defaultDicomFirstFrameViewerState,
		isDicomFirstFramePreviewing,
		dicomSeriesPreview,
		cbctWorkbenchSeries,
		dicomViewerWorkbenchManifest,
		dicomWorkstationReadiness,
		dicomRenderCachePlan,
		dicomViewerToolStateBundle,
		dicomLocalFolderDiscovery,
		localImagingOrganizer,
		localImagingFolderDraft,
		imagingFolderScan,
		dicomFolderSeriesScan,
		dicomFolderWorkupPlan,
		cbctWorkbenchTools,
		cbctWorkbenchProjections,
		mprSliceIndex,
		mprAxisDeg,
		mprSlabMm,
		mprProjection,
		mprWindowPreset,
		mprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		mprProjectionLabels,
		mprWindowPresetLabels,
		setDicomFirstFrameViewerState,
		setMprProjection,
		setMprAxisDeg,
		setMprSlabMm,
		setMprSliceIndex,
		setMprWindowPreset,
		setMprCrosshairEnabled,
		setMprLinkedPlanesEnabled,
		setCtPlanningActiveQuickActionId,
		setImagingViewerActiveTool,
		selectCtPlanningImplant,
	} = params;

	const _recognitionInputReady = (recognitionText || "").trim().length > 0;
	const _imagingImportInputReady = (imagingImportText || "").trim().length > 0;
	const _patientImportInputReady = (importText || "").trim().length > 0;
	const _localImagingFolderReady = (imagingFolderPath || "").trim().length > 0;

	const _typedImagingConnectorCards = (imagingConnectorCards ??
		[]) as ImagingConnectorCard[];
	const _typedImagingViewerCapabilities = (imagingViewerCapabilities ??
		[]) as ImagingViewerCapability[];
	const _typedCtPlanningImplantPlan =
		ctPlanningImplantPlan as ImagingViewerImplantPlan | null;
	const _typedCtPlanningActiveQuickActionId =
		typeof ctPlanningActiveQuickActionId === "string"
			? ctPlanningActiveQuickActionId
			: null;
	const _typedImagingViewerActiveTool =
		imagingViewerActiveTool as ImagingViewerTool;
	const _typedIntegrationPresets = (dashboard?.clinicSettings
		?.integrationPresets ?? []) as IntegrationPreset[];
	const _typedSpeechProviders = (dashboard?.speechProviders ??
		[]) as SpeechProvider[];
	const _typedRecognitionPresets = (recognitionPresets ??
		[]) as RecognitionPreset[];
	const _typedRecognitionJob = recognitionJob as AiRecognitionJob | null;
	const _typedSpeechRecordingRecovery =
		speechRecordingRecovery as SpeechRecordingRecoveryList | null;
	const _typedImagingSourceChoices = (imagingSourceChoices ??
		[]) as ImagingSourceKind[];
	const _typedImagingImportPreview =
		imagingImportPreview as ImagingImportPreviewResponse | null;
	const _typedBrowserContinuityChecks = (browserContinuityChecks ??
		[]) as BrowserContinuityCheck[];
	const _typedLocalBridgeReadiness =
		localBridgeReadiness as LocalBridgeReadinessResponse | null;
	const _typedLocalBridgeUsePlans =
		localBridgeUsePlans as LocalBridgeUsePlansResponse | null;
	const _typedPersistenceIntegrity =
		persistenceIntegrity as PersistenceIntegrityReport | null;

	const dicomArchiveAddressGuidanceId = "dicom-archive-address-guidance";
	const localDicomFolderGuidanceId = "local-dicom-folder-guidance";
	const dicomArchiveAddressReady =
		(dicomWebEndpointUrl || "").trim().length > 0;

	const typedDicomFirstFramePreview =
		dicomFirstFramePreview as DicomFirstFramePreviewResponse | null;
	const typedDicomFirstFrameViewerState =
		dicomFirstFrameViewerState as DicomFirstFrameViewerState;
	const typedDefaultDicomFirstFrameViewerState =
		defaultDicomFirstFrameViewerState as DicomFirstFrameViewerState;
	const dicomFirstFrameSelectableCount =
		typedDicomFirstFramePreview?.selectableFileCount ?? 0;
	const dicomFirstFrameCurrentIndex =
		typedDicomFirstFramePreview?.sourceFileIndex ?? null;
	const dicomFirstFrameSliceMaxIndex = Math.max(
		0,
		dicomFirstFrameSelectableCount - 1,
	);
	const dicomFirstFrameLandmarkSlices =
		dicomFirstFrameSelectableCount > 3
			? [
					{
						label: "25%",
						targetIndex: Math.round(dicomFirstFrameSliceMaxIndex * 0.25),
					},
					{
						label: "Центр",
						targetIndex: Math.round(dicomFirstFrameSliceMaxIndex * 0.5),
					},
					{
						label: "75%",
						targetIndex: Math.round(dicomFirstFrameSliceMaxIndex * 0.75),
					},
				].filter(
					(item, index, items) =>
						items.findIndex(
							(candidate) => candidate.targetIndex === item.targetIndex,
						) === index,
				)
			: [];
	const dicomFirstFrameCanSelectPrevious =
		typeof dicomFirstFrameCurrentIndex === "number" &&
		dicomFirstFrameCurrentIndex > 0 &&
		!isDicomFirstFramePreviewing;
	const dicomFirstFrameCanSelectNext =
		typeof dicomFirstFrameCurrentIndex === "number" &&
		dicomFirstFrameSelectableCount > 0 &&
		dicomFirstFrameCurrentIndex < dicomFirstFrameSelectableCount - 1 &&
		!isDicomFirstFramePreviewing;
	const typedDicomSeriesPreviewSeries = (dicomSeriesPreview?.series ??
		[]) as DicomSeriesPreviewGroup[];
	const typedDicomSeriesPreviewParserNotes = (dicomSeriesPreview?.parserNotes ??
		[]) as string[];
	const typedCbctWorkbenchSeries =
		cbctWorkbenchSeries as DicomSeriesPreviewGroup | null;
	const typedDicomViewerWorkbenchManifest =
		dicomViewerWorkbenchManifest as DicomViewerWorkbenchManifestResponse | null;
	const typedDicomWorkstationReadiness =
		dicomWorkstationReadiness as DicomWorkstationReadinessResponse | null;
	const typedDicomRenderCachePlan =
		dicomRenderCachePlan as DicomRenderCachePlanResponse | null;
	const typedDicomViewerToolStateBundle =
		dicomViewerToolStateBundle as DicomViewerToolStateBundleResponse | null;
	const typedDicomLocalFolderDiscovery =
		dicomLocalFolderDiscovery as DicomLocalFolderDiscoveryResponse | null;
	const typedLocalImagingOrganizer =
		localImagingOrganizer as LocalImagingOrganizerResponse | null;
	const _activeDentalModelWorkbenchManifest: DentalModelWorkbenchManifest | null =
		typedLocalImagingOrganizer?.cases.find(
			(caseItem) =>
				localImagingFolderDraft?.folderFingerprint &&
				caseItem.folderFingerprint.toUpperCase() ===
					String(localImagingFolderDraft.folderFingerprint).toUpperCase() &&
				caseItem.modelWorkbenchManifest.totalModels > 0,
		)?.modelWorkbenchManifest ??
		typedLocalImagingOrganizer?.cases.find(
			(caseItem) => caseItem.modelWorkbenchManifest.ctSurfaceModels > 0,
		)?.modelWorkbenchManifest ??
		typedLocalImagingOrganizer?.cases.find(
			(caseItem) => caseItem.modelWorkbenchManifest.totalModels > 0,
		)?.modelWorkbenchManifest ??
		null;
	const typedImagingFolderScan =
		imagingFolderScan as ImagingFolderScanResponse | null;
	const typedDicomFolderSeriesScan =
		dicomFolderSeriesScan as DicomFolderSeriesPreviewResponse | null;
	const typedDicomFolderWorkupPlan =
		dicomFolderWorkupPlan as DicomFolderWorkupPlanResponse | null;
	const typedCbctWorkbenchTools = (
		typedCbctWorkbenchSeries?.mprReadiness?.tools?.length
			? cbctWorkbenchTools
			: ["window_level", "pan", "zoom", "external_open"]
	) as DicomMprTool[];
	const typedCbctMprBlockers =
		typedCbctWorkbenchSeries?.mprReadiness?.blockers ?? [];
	const typedCbctMprWarnings =
		typedCbctWorkbenchSeries?.mprReadiness?.warnings ?? [];
	const typedCbctResourceSafetyCaps =
		typedCbctWorkbenchSeries?.mprReadiness?.resourcePolicy?.safetyCaps ?? [];
	const mprControlsReady = Boolean(
		typedCbctWorkbenchSeries?.mprReadiness?.canOpenMpr,
	);
	const mprSliceMaxIndex = Math.max(
		0,
		(typedCbctWorkbenchSeries?.fileCount ?? 1) - 1,
	);
	const mprCenterSliceIndex = Math.floor(mprSliceMaxIndex / 2);
	const typedCbctWorkbenchProjections =
		cbctWorkbenchProjections as MprProjection[];
	const mprSafeSliceIndex = clampMprSliceIndex(mprSliceIndex, mprSliceMaxIndex);
	const updateDicomFirstFrameViewerState = (
		updater: (state: DicomFirstFrameViewerState) => DicomFirstFrameViewerState,
	) =>
		setDicomFirstFrameViewerState((state: DicomFirstFrameViewerState) =>
			updater(state),
		);
	const updateDicomFirstFrameViewerNumber = (
		key: "brightness" | "contrast",
		event: InputChangeEvent,
	) => {
		const value = Number(event.target.value);
		updateDicomFirstFrameViewerState((state) => ({ ...state, [key]: value }));
	};
	const typedMprProjection = mprProjection as MprProjection;
	const mprAxisDirectionLabel = formatMprAxisDirectionLabel({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const mprAxisAngleBadge = formatMprAxisAngleBadge(
		mprAxisDeg,
		mprControlsReady,
	);
	const mprSlabBadge = formatMprSlabBadge(mprSlabMm, mprControlsReady);
	const mprSliceBadge = formatMprSliceBadge({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprSlabVisualWidth = `${Math.min(86, Math.max(18, 14 + mprSlabMm * 2.2))}%`;
	const mprSlicePositionPercent =
		mprSliceMaxIndex > 0
			? `${(mprSafeSliceIndex / mprSliceMaxIndex) * 100}%`
			: "50%";
	const mprCurrentSliceFraction = mprSliceFraction(
		mprSafeSliceIndex,
		mprSliceMaxIndex,
	);
	const mprSliceLabel = mprControlsReady
		? `срез ${mprSafeSliceIndex + 1} из ${mprSliceMaxIndex + 1}`
		: "срез включится после КЛКТ/КТ-серии";
	const mprAxisRangeValue = formatMprAxisRangeValue({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const mprSlabRangeValue = formatMprSlabRangeValue({
		canOpenMpr: mprControlsReady,
		slabMm: mprSlabMm,
	});
	const mprSliceRangeValue = formatMprSliceRangeValue({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const _mprAxisVisualizerStyle: MprAxisVisualizerStyle = {
		"--mpr-axis-deg": `${mprAxisDeg}deg`,
		"--mpr-slab-width": mprSlabVisualWidth,
		"--mpr-slice-position": mprSlicePositionPercent,
	};
	const mprActiveProjectionLabel =
		mprProjectionLabels[typedMprProjection] ?? typedMprProjection;
	const mprActiveProjectionOrientation =
		mprProjectionOrientationLabels[typedMprProjection] ?? "плоскость просмотра";
	const mprProjectionCompass = mprProjectionCompassLabels(typedMprProjection);
	const mprAxisGuidance = buildMprAxisGuidance({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
		slabMm: mprSlabMm,
		sliceFraction: mprCurrentSliceFraction,
	});
	const mprNearestClinicalPreset = findNearestMprClinicalPreset(
		{
			canOpenMpr: mprControlsReady,
			projection: typedMprProjection,
			availableProjections: typedCbctWorkbenchProjections,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceFraction: mprCurrentSliceFraction,
			windowPreset: mprWindowPreset,
			crosshair: mprCrosshairEnabled,
			linkedPlanes: mprLinkedPlanesEnabled,
		},
		mprClinicalPresets,
	);
	const mprClinicalInput = {
		hasSeries: Boolean(typedCbctWorkbenchSeries),
		canOpenMpr: mprControlsReady,
		hasWorkbenchManifest: Boolean(typedDicomViewerWorkbenchManifest),
		hasWorkstationReadiness: Boolean(typedDicomWorkstationReadiness),
		protocolExact: mprNearestClinicalPreset.exact,
		protocolCanApply: mprNearestClinicalPreset.deltas.length > 0,
		protocolLabel: mprNearestClinicalPreset.label,
		projectionLabel: mprActiveProjectionLabel,
		axisLabel: mprAxisDirectionLabel,
		slabMm: mprSlabMm,
		sliceLabel: mprSliceLabel,
		windowLabel: mprWindowPresetLabels[mprWindowPreset] ?? mprWindowPreset,
		crosshair: mprCrosshairEnabled,
		linkedPlanes: mprLinkedPlanesEnabled,
	};
	const mprWorkbenchSummaryText = buildMprWorkbenchSummary(mprClinicalInput);
	const mprOperatorSummaryCards = buildMprOperatorSummary({
		...mprClinicalInput,
		protocolDeltas: mprNearestClinicalPreset.deltas,
	});
	const mprAxisVisualizerLabel = formatMprAxisVisualizerLabel({
		canOpenMpr: mprControlsReady,
		workbenchSummary: mprWorkbenchSummaryText,
		compassSummary: mprProjectionCompass.summary,
		guidanceSummary: mprAxisGuidance.summary,
	});
	const mprClinicalChecklist = buildMprClinicalChecklist(mprClinicalInput);
	const mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);
	const mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
		[
			"mpr-clinical-preset",
			mprNearestClinicalPreset.title === preset.title ? "nearest" : "",
			mprNearestClinicalPreset.exact &&
			mprNearestClinicalPreset.title === preset.title
				? "active"
				: "",
		]
			.filter(Boolean)
			.join(" ");
	const resetMprControls = () => {
		const defaultProjection =
			typedCbctWorkbenchSeries?.mprReadiness.projections.includes("axial")
				? "axial"
				: (typedCbctWorkbenchSeries?.mprReadiness.projections[0] ?? "axial");
		setMprProjection(defaultProjection);
		setMprAxisDeg(0);
		setMprSlabMm(1);
		setMprSliceIndex(mprCenterSliceIndex);
		setMprWindowPreset("bone");
		setMprCrosshairEnabled(true);
		setMprLinkedPlanesEnabled(true);
	};
	const applyMprClinicalPreset = (preset: MprClinicalPreset) => {
		const projection = resolveMprClinicalPresetProjection(
			preset.projection,
			typedCbctWorkbenchProjections,
		);
		setMprProjection(projection);
		setMprAxisDeg(clampMprAxisDeg(preset.axisDeg));
		setMprSlabMm(clampMprSlabMm(preset.slabMm));
		setMprSliceIndex(
			mprSliceIndexFromFraction(preset.sliceFraction, mprSliceMaxIndex),
		);
		setMprWindowPreset(preset.windowPreset);
		setMprCrosshairEnabled(preset.crosshair);
		setMprLinkedPlanesEnabled(preset.linkedPlanes);
	};
	const applyCtPlanningQuickAction = (action: CtPlanningQuickAction) => {
		if (action.requiresVolume && !mprControlsReady) return;
		const projection = resolveMprClinicalPresetProjection(
			action.projection,
			typedCbctWorkbenchProjections,
		);
		setCtPlanningActiveQuickActionId?.(action.id);
		setImagingViewerActiveTool(action.tool);
		setMprProjection(projection);
		setMprAxisDeg(clampMprAxisDeg(action.axisDeg));
		setMprSlabMm(clampMprSlabMm(action.slabMm));
		setMprSliceIndex(
			mprSliceIndexFromFraction(action.sliceFraction, mprSliceMaxIndex),
		);
		setMprWindowPreset(action.windowPreset);
		setMprCrosshairEnabled(true);
		setMprLinkedPlanesEnabled(true);
	};
	const selectCtPlanningImplantFromSettings = (
		implant: CtImplantLibraryItem,
	) => {
		setCtPlanningActiveQuickActionId?.("implant_library");
		selectCtPlanningImplant(implant);
	};
	const applyNearestMprClinicalPreset = () => {
		const preset = mprClinicalPresets.find(
			(candidate) => candidate.title === mprNearestClinicalPreset.title,
		);
		if (preset) applyMprClinicalPreset(preset);
	};
	const handleMprKeyboardNavigation = (
		event: KeyboardEvent<HTMLDivElement>,
	) => {
		if (!mprControlsReady) return;
		const adjustment = resolveMprKeyboardAdjustment({
			key: event.key,
			shiftKey: event.shiftKey,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceIndex: mprSafeSliceIndex,
			maxIndex: mprSliceMaxIndex,
		});
		if (!adjustment) return;
		event.preventDefault();
		if (adjustment.kind === "axis") setMprAxisDeg(adjustment.value);
		if (adjustment.kind === "slab") setMprSlabMm(adjustment.value);
		if (adjustment.kind === "slice") setMprSliceIndex(adjustment.value);
	};

	return {
		dicomArchiveAddressGuidanceId,
		localDicomFolderGuidanceId,
		dicomArchiveAddressReady,
		typedDicomFirstFramePreview,
		typedDicomFirstFrameViewerState,
		typedDefaultDicomFirstFrameViewerState,
		dicomFirstFrameSelectableCount,
		dicomFirstFrameCurrentIndex,
		dicomFirstFrameSliceMaxIndex,
		dicomFirstFrameLandmarkSlices,
		dicomFirstFrameCanSelectPrevious,
		dicomFirstFrameCanSelectNext,
		typedDicomSeriesPreviewSeries,
		typedDicomSeriesPreviewParserNotes,
		typedCbctWorkbenchSeries,
		typedDicomViewerWorkbenchManifest,
		typedDicomWorkstationReadiness,
		typedDicomRenderCachePlan,
		typedDicomViewerToolStateBundle,
		typedDicomLocalFolderDiscovery,
		typedLocalImagingOrganizer,
		typedImagingFolderScan,
		typedDicomFolderSeriesScan,
		typedDicomFolderWorkupPlan,
		typedCbctWorkbenchTools,
		typedCbctMprBlockers,
		typedCbctMprWarnings,
		typedCbctResourceSafetyCaps,
		mprControlsReady,
		mprSliceMaxIndex,
		mprCenterSliceIndex,
		typedCbctWorkbenchProjections,
		mprSafeSliceIndex,
		updateDicomFirstFrameViewerState,
		updateDicomFirstFrameViewerNumber,
		typedMprProjection,
		mprAxisDirectionLabel,
		mprAxisAngleBadge,
		mprSlabBadge,
		mprSliceBadge,
		mprSlabVisualWidth,
		mprSlicePositionPercent,
		mprCurrentSliceFraction,
		mprSliceLabel,
		mprAxisRangeValue,
		mprSlabRangeValue,
		mprSliceRangeValue,
		mprActiveProjectionLabel,
		mprActiveProjectionOrientation,
		mprProjectionCompass,
		mprAxisGuidance,
		mprNearestClinicalPreset,
		mprClinicalInput,
		mprWorkbenchSummaryText,
		mprOperatorSummaryCards,
		mprAxisVisualizerLabel,
		mprClinicalChecklist,
		mprClinicalNextStep,
		mprClinicalPresetButtonClass,
		resetMprControls,
		applyMprClinicalPreset,
		applyCtPlanningQuickAction,
		selectCtPlanningImplantFromSettings,
		applyNearestMprClinicalPreset,
		handleMprKeyboardNavigation,
		_activeDentalModelWorkbenchManifest,
		_typedImagingConnectorCards,
		_typedImagingViewerCapabilities,
		_typedCtPlanningImplantPlan,
		_typedCtPlanningActiveQuickActionId,
		_typedImagingViewerActiveTool,
		_typedIntegrationPresets,
		_typedSpeechProviders,
		_typedRecognitionPresets,
		_typedRecognitionJob,
		_typedSpeechRecordingRecovery,
		_typedImagingSourceChoices,
		_typedImagingImportPreview,
		_typedBrowserContinuityChecks,
		_typedLocalBridgeReadiness,
		_typedLocalBridgeUsePlans,
		_typedPersistenceIntegrity,
		_recognitionInputReady,
		_imagingImportInputReady,
		_patientImportInputReady,
		_localImagingFolderReady,
		_mprAxisVisualizerStyle,
	};
}
