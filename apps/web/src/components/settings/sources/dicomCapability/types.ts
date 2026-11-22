import type {
	DicomRenderCachePlanResponse,
	DicomSeriesPreviewGroup,
	DicomSeriesPreviewResponse,
	DicomViewerLaunchManifestResponse,
	DicomViewerToolStateBundleResponse,
	DicomViewerWorkbenchManifestResponse,
	DicomWebConnectorCheckResponse,
	DicomWorkstationReadinessResponse,
	ImagingViewerImplantPlan,
	ImagingViewerTool,
	LocalBridgeReadinessResponse,
	MprWindowPreset,
} from "@dental/shared";
export type { DicomSeriesPreviewGroup };
import type { ChangeEvent, CSSProperties, KeyboardEvent, ReactNode } from "react";
import type { CtPlanningQuickAction } from "../../../../ctPlanningCatalog";
import type { MprClinicalChecklistItem, MprOperatorSummaryCardItem } from "./DicomMprRoadmapPanel";

export type CbctWorkbenchPlane = { key: string; title: string; detail: string };
export type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
export type InputChangeEvent = ChangeEvent<HTMLInputElement>;

export interface DicomCapabilityHeaderProps {
	capabilities: Array<{
		icon: React.ComponentType<{ className?: string; size?: number | string; "aria-hidden"?: boolean | "true" | "false" }> | ReactNode;
		title: string;
		detail: string;
		state: string;
	}>;
}

export interface DicomSeriesLabPanelProps {
	previewDicomSeries: () => void | Promise<void>;
	isDicomSeriesPreviewLoading: boolean;
	dicomSeriesPreview: DicomSeriesPreviewResponse | null | undefined;
	seriesList: DicomSeriesPreviewGroup[];
	parserNotes: string[];
	imagingKindLabels: Record<string, string>;
	dicomSeriesViewerLabels: Record<string, string>;
	mprLoadStrategyLabels: Record<string, string>;
	mprResourceTierLabels: Record<string, string>;
}

export interface DicomMprVisualizerPanelProps {
	mprControlsReady?: boolean | undefined;
	mprAxisVisualizerStyle?: CSSProperties | undefined;
	mprAxisVisualizerLabel?: string | undefined;
	handleMprKeyboardNavigation?: ((event: KeyboardEvent<HTMLDivElement>) => void) | undefined;
	mprProjectionCompass?: {
		top: string;
		right: string;
		bottom: string;
		left: string;
		summary: string;
	} | undefined;
	mprCrosshairEnabled?: boolean | undefined;
	mprAxisAngleBadge?: string | number | undefined;
	mprSlabBadge?: string | number | undefined;
	mprSliceBadge?: string | number | undefined;
	mprActiveProjectionLabel?: string | undefined;
	mprActiveProjectionOrientation?: string | undefined;
	mprAxisDirectionLabel?: string | undefined;
	mprSlabMm?: number | undefined;
	mprSliceLabel?: string | undefined;
	mprAxisGuidance?: {
		tiltLabel: string;
		slabLabel: string;
		sliceLabel: string;
	} | undefined;
	mprWorkbenchSummaryText?: string | undefined;
	mprLinkedPlanesEnabled?: boolean | undefined;
	mprNearestClinicalPreset?: {
		exact?: boolean | undefined;
		label: string;
		deltas: unknown[];
		title?: string | undefined;
	} | undefined;
	applyNearestMprClinicalPreset?: (() => void) | undefined;
}

export interface DicomMprControlPanelProps {
	mprControlsReady?: boolean | undefined;
	cbctWorkbenchProjections?: string[] | undefined;
	mprProjection?: string | undefined;
	setMprProjection?: ((projection: string) => void) | undefined;
	mprProjectionLabels?: Record<string, string> | undefined;
	mprAxisDeg?: number | undefined;
	mprAxisRangeValue?: string | undefined;
	mprAxisBounds?: { min: number; max: number } | undefined;
	setMprAxisDeg?: ((deg: number) => void) | undefined;
	clampMprAxisDeg?: ((deg: number) => number) | undefined;
	mprAxisNudgeDeg?: number[] | undefined;
	formatSignedMprStep?: ((delta: number, suffix: string) => string) | undefined;
	mprAxisPresetDeg?: number[] | undefined;
	mprSlabMm?: number | undefined;
	mprSlabRangeValue?: string | undefined;
	mprSlabBounds?: { min: number; max: number } | undefined;
	setMprSlabMm?: ((slab: number) => void) | undefined;
	clampMprSlabMm?: ((slab: number) => number) | undefined;
	mprSlabNudgeMm?: number[] | undefined;
	mprSlabPresetMm?: number[] | undefined;
	mprSliceLabel?: string | undefined;
	mprSliceMaxIndex?: number | undefined;
	mprSafeSliceIndex?: number | undefined;
	mprSliceRangeValue?: string | undefined;
	setMprSliceIndex?: ((index: number) => void) | undefined;
	clampMprSliceIndex?: ((index: number, max: number) => number) | undefined;
	mprSliceNudgeSteps?: number[] | undefined;
	mprSlicePresetFractions?: Array<{
		id: string;
		fraction: number;
		label: string;
	}> | undefined;
	mprSliceIndexFromFraction?: ((fraction: number, max: number) => number) | undefined;
	resetMprControls?: (() => void) | undefined;
	mprWorkbenchLocalSavedAt?: string | null | undefined;
	formatTime?: ((time: string | null) => string) | undefined;
	mprWorkbenchDraftRestored?: boolean | undefined;
	restoreMprWorkbenchLocalDraft?: (() => void) | undefined;
	mprClinicalPresets?: Array<{
		id: string;
		title: string;
		detail?: string | undefined;
		projection: string;
		[key: string]: unknown;
	}> | undefined;
	describeMprClinicalPresetProjectionFallback?: (
		(projection: string,
		projections: string[],
		labels: Record<string, string>,
	) => string | null) | undefined;
	mprClinicalPresetButtonClass?: ((preset: { id?: string; [key: string]: unknown }) => string) | undefined;
	applyMprClinicalPreset?: ((preset: { id?: string; [key: string]: unknown }) => void) | undefined;
	mprNearestClinicalPreset?: {
		exact?: boolean | undefined;
		title?: string | undefined;
	} | undefined;
	mprWindowPresetLabels?: Record<string, string> | undefined;
	mprWindowPreset?: MprWindowPreset | undefined;
	setMprWindowPreset?: ((preset: MprWindowPreset) => void) | undefined;
	mprCrosshairEnabled?: boolean | undefined;
	setMprCrosshairEnabled?: ((enabled: boolean) => void) | undefined;
	mprLinkedPlanesEnabled?: boolean | undefined;
	setMprLinkedPlanesEnabled?: ((enabled: boolean) => void) | undefined;
}

export interface DicomOhifBridgePanelProps {
	dicomViewerLaunchManifest?: DicomViewerLaunchManifestResponse | null | undefined;
	dicomViewerLaunchModeLabels?: Record<string, string> | undefined;
	dicomWebEndpointUrl?: string | undefined;
	setDicomWebEndpointUrl?: ((url: string) => void) | undefined;
	ohifBaseUrl?: string | undefined;
	setOhifBaseUrl?: ((url: string) => void) | undefined;
	onResetEndpointState?: (() => void) | undefined;
	onResetOhifState?: (() => void) | undefined;
	cbctWorkbenchSeries?: DicomSeriesPreviewGroup | null | undefined;
	isDicomWorkbenchBuilding?: boolean | undefined;
	buildDicomViewerWorkbenchManifest?: (() => void | Promise<void>) | undefined;
	dicomWorkbenchSeriesGuidanceId?: string | undefined;
	isDicomWorkstationChecking?: boolean | undefined;
	checkDicomWorkstationReadiness?: (() => void | Promise<void>) | undefined;
	isDicomManifestBuilding?: boolean | undefined;
	buildDicomViewerLaunchManifest?: (() => void | Promise<void>) | undefined;
	dicomArchiveAddressReady?: boolean | undefined;
	isDicomWebChecking?: boolean | undefined;
	checkDicomWebConnector?: (() => void | Promise<void>) | undefined;
	dicomArchiveAddressGuidanceId?: string | undefined;
	buildDicomViewerToolStateBundle?: (() => void | Promise<void>) | undefined;
	isDicomToolStateBuilding?: boolean | undefined;
	dicomExecutionLaneLabels?: Record<string, string> | undefined;
	typedDicomWorkstationReadiness?: DicomWorkstationReadinessResponse | null | undefined;
	buildDicomRenderCachePlan?: (() => void | Promise<void>) | undefined;
	isDicomRenderCachePlanning?: boolean | undefined;
	dicomWorkstationGuidanceId?: string | undefined;
	dicomWorkstationReadiness?: DicomWorkstationReadinessResponse | unknown;
	dicomWebCheck?: DicomWebConnectorCheckResponse | null | undefined;
	dicomWebStatusLabels?: Record<string, string> | undefined;
	dicomLabel?: ((dict?: Record<string, string> | null | undefined, value?: unknown, fallback?: string) => string) | undefined;
}

export interface DicomDiagnosticsPanelProps {
	typedDicomViewerWorkbenchManifest?: DicomViewerWorkbenchManifestResponse | null | undefined;
	dicomQualityModeLabels?: Record<string, string> | undefined;
	dicomViewerLaunchModeLabels?: Record<string, string> | undefined;
	dicomTextureStrategyLabels?: Record<string, string> | undefined;
	dicomRenderMemoryBudgetClassLabels?: Record<string, string> | undefined;
	dicomDiagnosticPixelPolicyLabels?: Record<string, string> | undefined;
	dicomWorkbenchLocalSavedAt?: string | null | undefined;
	formatTime?: ((time: string | null) => string) | undefined;
	dicomWorkbenchServerBundle?: {
		serverSavedAt?: string | null | undefined;
		[key: string]: unknown;
	} | null | undefined;
	dicomWorkbenchSourceIsRedacted?: boolean | undefined;
	saveDicomWorkbenchBundleToServer?: (() => void | Promise<void>) | undefined;
	isDicomWorkbenchServerSaving?: boolean | undefined;
	reconnectDicomWorkbenchFromCurrentFolder?: (() => void | Promise<void>) | undefined;
	imagingFolderPath?: string | undefined;
	isDicomWorkbenchReconnecting?: boolean | undefined;
	restoreDicomWorkbenchServerBundle?: ((bundle: unknown) => void) | undefined;
	downloadDicomWorkbenchManifest?: (() => void) | undefined;
	clearDicomWorkbenchRecovery?: (() => void) | undefined;
	typedDicomWorkstationReadiness?: DicomWorkstationReadinessResponse | null | undefined;
	dicomRuntimeTierLabels?: Record<string, string> | undefined;
	mprLoadStrategyLabels?: Record<string, string> | undefined;
	dicomGpuClassLabels?: Record<string, string> | undefined;
	dicomExecutionLaneLabels?: Record<string, string> | undefined;
	dicomReadinessCheckLabels?: Record<string, string> | undefined;
	typedDicomRenderCachePlan?: DicomRenderCachePlanResponse | null | undefined;
	dicomLabel?: ((dict?: Record<string, string> | null | undefined, value?: unknown, fallback?: string) => string) | undefined;
}

export interface DicomServerConfigPreset {
	id: string;
	vendor: string;
	model: string;
	defaultPort: number;
	defaultAeTitle: string;
	wadoSupported: boolean;
	recommendedTransferSyntax: string;
}

export interface DicomHotFolderConfig {
	enabled: boolean;
	folderPath: string;
	scanIntervalSec: number;
	autoGroupSeries: boolean;
	quarantineOnError: boolean;
}

export interface DicomMprWorkbenchPropsBag {
	cbctWorkbenchSeries?: DicomSeriesPreviewGroup | null | undefined;
	mprLoadStrategyLabels?: Record<string, string> | undefined;
	mprResourceTierLabels?: Record<string, string> | undefined;
	mprClinicalNextStep?: string | undefined;
	mprClinicalChecklist?: Array<MprClinicalChecklistItem> | undefined;
	mprOperatorSummaryCards?: Array<MprOperatorSummaryCardItem> | undefined;
	mprControlsReady?: boolean | undefined;
	imagingViewerActiveTool?: ImagingViewerTool | null | undefined;
	ctPlanningActiveQuickActionId?: string | null | undefined;
	applyCtPlanningQuickAction?: ((action: CtPlanningQuickAction | string) => void) | undefined;
	ctPlanningImplantPlan?: ImagingViewerImplantPlan | null | undefined;
	selectCtPlanningImplantFromSettings?: ((implantId: string) => void) | undefined;
	dicomViewerWorkbenchManifest?: DicomViewerWorkbenchManifestResponse | null | undefined;
	dicomViewerToolStateBundle?: DicomViewerToolStateBundleResponse | null | undefined;
	activeDentalModelWorkbenchManifest?: unknown;
	localBridgeReadiness?: LocalBridgeReadinessResponse | null | undefined;
	cbctWorkbenchPlanes?: CbctWorkbenchPlane[] | undefined;
	cbctWorkbenchProjections?: string[] | undefined;
	mprSeriesRequiredProjectionLabel?: string | undefined;
	mprUnavailableProjectionLabel?: string | undefined;
	mprProjection?: string | undefined;
	setMprProjection?: ((projection: string) => void) | undefined;
	mprAxisVisualizerStyle?: CSSProperties | undefined;
	mprAxisVisualizerLabel?: string | undefined;
	handleMprKeyboardNavigation?: ((event: KeyboardEvent<HTMLDivElement>) => void) | undefined;
	mprProjectionCompass?: { top: string; right: string; bottom: string; left: string; summary: string } | undefined;
	mprCrosshairEnabled?: boolean | undefined;
	mprAxisAngleBadge?: string | number | undefined;
	mprSlabBadge?: string | number | undefined;
	mprSliceBadge?: string | number | undefined;
	mprActiveProjectionLabel?: string | undefined;
	mprActiveProjectionOrientation?: string | undefined;
	mprAxisDirectionLabel?: string | undefined;
	mprSlabMm?: number | undefined;
	mprSliceLabel?: string | undefined;
	mprAxisGuidance?: { tiltLabel: string; slabLabel: string; sliceLabel: string } | undefined;
	mprWorkbenchSummaryText?: string | undefined;
	mprLinkedPlanesEnabled?: boolean | undefined;
	mprNearestClinicalPreset?: { exact?: boolean; label: string; deltas: unknown[]; title?: string } | undefined;
	applyNearestMprClinicalPreset?: (() => void) | undefined;
	mprProjectionLabels?: Record<string, string> | undefined;
	mprAxisDeg?: number | undefined;
	mprAxisRangeValue?: string | undefined;
	mprAxisBounds?: { min: number; max: number } | undefined;
	setMprAxisDeg?: ((deg: number) => void) | undefined;
	clampMprAxisDeg?: ((deg: number) => number) | undefined;
	mprAxisNudgeDeg?: number[] | undefined;
	formatSignedMprStep?: ((delta: number, suffix: string) => string) | undefined;
	mprAxisPresetDeg?: number[] | undefined;
	mprSlabRangeValue?: string | undefined;
	mprSlabBounds?: { min: number; max: number } | undefined;
	setMprSlabMm?: ((slab: number) => void) | undefined;
	clampMprSlabMm?: ((slab: number) => number) | undefined;
	mprSlabNudgeMm?: number[] | undefined;
	mprSlabPresetMm?: number[] | undefined;
	mprSliceMaxIndex?: number | undefined;
	mprSafeSliceIndex?: number | undefined;
	mprSliceRangeValue?: string | undefined;
	setMprSliceIndex?: ((index: number) => void) | undefined;
	clampMprSliceIndex?: ((index: number, max: number) => number) | undefined;
	mprSliceNudgeSteps?: number[] | undefined;
	mprSlicePresetFractions?: Array<{ id: string; fraction: number; label: string }> | undefined;
	mprSliceIndexFromFraction?: ((fraction: number, max: number) => number) | undefined;
	resetMprControls?: (() => void) | undefined;
	mprWorkbenchLocalSavedAt?: string | null | undefined;
	formatTime?: ((time: string | null) => string) | undefined;
	mprWorkbenchDraftRestored?: boolean | undefined;
	restoreMprWorkbenchLocalDraft?: (() => void) | undefined;
	mprClinicalPresets?: Array<{ id: string; title: string; detail?: string | undefined; projection: string; [key: string]: unknown }> | undefined;
	describeMprClinicalPresetProjectionFallback?: ((projection: string, projections: string[], labels: Record<string, string>) => string | null) | undefined;
	mprClinicalPresetButtonClass?: ((preset: { id?: string; [key: string]: unknown }) => string) | undefined;
	applyMprClinicalPreset?: ((preset: { id?: string; [key: string]: unknown }) => void) | undefined;
	mprWindowPresetLabels?: Record<string, string> | undefined;
	mprWindowPreset?: MprWindowPreset | undefined;
	setMprWindowPreset?: ((preset: MprWindowPreset) => void) | undefined;
	setMprCrosshairEnabled?: ((enabled: boolean) => void) | undefined;
	setMprLinkedPlanesEnabled?: ((enabled: boolean) => void) | undefined;
	cbctWorkbenchTools?: string[] | undefined;
	cbctMprBlockers?: string[] | undefined;
	cbctMprWarnings?: string[] | undefined;
	mprCacheModeLabels?: Record<string, string> | undefined;
	cbctResourceSafetyCaps?: string[] | undefined;
	dicomWorkstationReadiness?: DicomWorkstationReadinessResponse | unknown;
	dicomLabel?: ((dict?: Record<string, string> | null | undefined, value?: unknown, fallback?: string) => string) | undefined;
	dicomExecutionLaneLabels?: Record<string, string> | undefined;
	dicomRuntimeTierLabels?: Record<string, string> | undefined;
	dicomGpuClassLabels?: Record<string, string> | undefined;
	dicomQualityModeLabels?: Record<string, string> | undefined;
	dicomTextureStrategyLabels?: Record<string, string> | undefined;
	dicomRenderMemoryBudgetClassLabels?: Record<string, string> | undefined;
	dicomDiagnosticPixelPolicyLabels?: Record<string, string> | undefined;
	isDicomToolStateBuilding?: boolean | undefined;
	isDicomRenderCachePlanning?: boolean | undefined;
	dicomWorkstationGuidanceId?: string | undefined;
	buildDicomRenderCachePlan?: (() => void | Promise<void>) | undefined;
	buildDicomViewerToolStateBundle?: (() => void | Promise<void>) | undefined;
	isDicomWebChecking?: boolean | undefined;
	dicomArchiveAddressGuidanceId?: string | undefined;
	dicomArchiveAddressReady?: boolean | undefined;
	checkDicomWebConnector?: (() => void | Promise<void>) | undefined;
	isDicomManifestBuilding?: boolean | undefined;
	buildDicomViewerLaunchManifest?: (() => void | Promise<void>) | undefined;
	isDicomWorkstationChecking?: boolean | undefined;
	checkDicomWorkstationReadiness?: (() => void | Promise<void>) | undefined;
	isDicomWorkbenchBuilding?: boolean | undefined;
	dicomWorkbenchSeriesGuidanceId?: string | undefined;
	buildDicomViewerWorkbenchManifest?: (() => void | Promise<void>) | undefined;
	setOhifBaseUrl?: ((url: string) => void) | undefined;
	ohifBaseUrl?: string | undefined;
	setDicomRenderCachePlan?: ((plan: unknown) => void) | undefined;
	setDicomWorkstationReadiness?: ((readiness: unknown) => void) | undefined;
	setDicomWorkbenchLocalSavedAt?: ((savedAt: string | null) => void) | undefined;
	setDicomViewerWorkbenchManifest?: ((manifest: unknown) => void) | undefined;
	setDicomViewerToolStateBundle?: ((bundle: unknown) => void) | undefined;
	setDicomViewerLaunchManifest?: ((manifest: unknown) => void) | undefined;
	setDicomWebCheck?: ((check: unknown) => void) | undefined;
	setDicomWebEndpointUrl?: ((url: string) => void) | undefined;
	dicomWebEndpointUrl?: string | undefined;
	dicomViewerLaunchManifest?: DicomViewerLaunchManifestResponse | null | undefined;
	dicomReadinessCheckLabels?: Record<string, string> | undefined;
	clearDicomWorkbenchRecovery?: (() => void) | undefined;
	downloadDicomWorkbenchManifest?: (() => void) | undefined;
	restoreDicomWorkbenchServerBundle?: ((bundle: unknown) => void) | undefined;
	isDicomWorkbenchReconnecting?: boolean | undefined;
	imagingFolderPath?: string | undefined;
	reconnectDicomWorkbenchFromCurrentFolder?: (() => void | Promise<void>) | undefined;
	isDicomWorkbenchServerSaving?: boolean | undefined;
	saveDicomWorkbenchBundleToServer?: (() => void | Promise<void>) | undefined;
	dicomWorkbenchSourceIsRedacted?: boolean | undefined;
	dicomWorkbenchServerBundle?: { serverSavedAt?: string | null | undefined; [key: string]: unknown } | null | undefined;
	dicomWorkbenchLocalSavedAt?: string | null | undefined;
	dicomViewerLaunchModeLabels?: Record<string, string> | undefined;
	dicomWebStatusLabels?: Record<string, string> | undefined;
	dicomWebCheck?: DicomWebConnectorCheckResponse | null | undefined;
	mprToolLabels?: Record<string, string> | undefined;
	dicomRenderCachePlan?: DicomRenderCachePlanResponse | null | undefined;
	[key: string]: unknown;
}
