import type {
	DicomRenderCachePlanResponse,
	DicomSeriesPreviewGroup,
	DicomSeriesPreviewResponse,
	DicomViewerLaunchManifestResponse,
	DicomViewerWorkbenchManifestResponse,
	DicomWebConnectorCheckResponse,
	DicomWorkstationReadinessResponse,
	MprWindowPreset,
} from "@dental/shared";
import type { ChangeEvent, CSSProperties, KeyboardEvent, ReactNode } from "react";

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
	mprControlsReady: boolean;
	mprAxisVisualizerStyle: CSSProperties;
	mprAxisVisualizerLabel: string;
	handleMprKeyboardNavigation: (event: KeyboardEvent<HTMLDivElement>) => void;
	mprProjectionCompass: {
		top: string;
		right: string;
		bottom: string;
		left: string;
		summary: string;
	};
	mprCrosshairEnabled: boolean;
	mprAxisAngleBadge: string | number;
	mprSlabBadge: string | number;
	mprSliceBadge: string | number;
	mprActiveProjectionLabel: string;
	mprActiveProjectionOrientation: string;
	mprAxisDirectionLabel: string;
	mprSlabMm: number;
	mprSliceLabel: string;
	mprAxisGuidance: {
		tiltLabel: string;
		slabLabel: string;
		sliceLabel: string;
	};
	mprWorkbenchSummaryText: string;
	mprLinkedPlanesEnabled: boolean;
	mprNearestClinicalPreset: {
		exact?: boolean;
		label: string;
		deltas: unknown[];
		title?: string;
	};
	applyNearestMprClinicalPreset: () => void;
}

export interface DicomMprControlPanelProps {
	mprControlsReady: boolean;
	cbctWorkbenchProjections: string[];
	mprProjection: string;
	setMprProjection: (projection: string) => void;
	mprProjectionLabels: Record<string, string>;
	mprAxisDeg: number;
	mprAxisRangeValue: string;
	mprAxisBounds: { min: number; max: number };
	setMprAxisDeg: (deg: number) => void;
	clampMprAxisDeg: (deg: number) => number;
	mprAxisNudgeDeg: number[];
	formatSignedMprStep: (delta: number, suffix: string) => string;
	mprAxisPresetDeg: number[];
	mprSlabMm: number;
	mprSlabRangeValue: string;
	mprSlabBounds: { min: number; max: number };
	setMprSlabMm: (slab: number) => void;
	clampMprSlabMm: (slab: number) => number;
	mprSlabNudgeMm: number[];
	mprSlabPresetMm: number[];
	mprSliceLabel: string;
	mprSliceMaxIndex: number;
	mprSafeSliceIndex: number;
	mprSliceRangeValue: string;
	setMprSliceIndex: (index: number) => void;
	clampMprSliceIndex: (index: number, max: number) => number;
	mprSliceNudgeSteps: number[];
	mprSlicePresetFractions: Array<{
		id: string;
		fraction: number;
		label: string;
	}>;
	mprSliceIndexFromFraction: (fraction: number, max: number) => number;
	resetMprControls: () => void;
	mprWorkbenchLocalSavedAt: string | null;
	formatTime: (time: string | null) => string;
	mprWorkbenchDraftRestored: boolean;
	restoreMprWorkbenchLocalDraft: () => void;
	mprClinicalPresets: Array<{
		id: string;
		title: string;
		detail?: string | undefined;
		projection: string;
		[key: string]: unknown;
	}>;
	describeMprClinicalPresetProjectionFallback: (
		projection: string,
		projections: string[],
		labels: Record<string, string>,
	) => string | null;
	mprClinicalPresetButtonClass: (preset: { id?: string; [key: string]: unknown }) => string;
	applyMprClinicalPreset: (preset: { id?: string; [key: string]: unknown }) => void;
	mprNearestClinicalPreset: {
		exact?: boolean;
		title?: string;
	};
	mprWindowPresetLabels: Record<string, string>;
	mprWindowPreset: MprWindowPreset;
	setMprWindowPreset: (preset: MprWindowPreset) => void;
	mprCrosshairEnabled: boolean;
	setMprCrosshairEnabled: (enabled: boolean) => void;
	mprLinkedPlanesEnabled: boolean;
	setMprLinkedPlanesEnabled: (enabled: boolean) => void;
}

export interface DicomOhifBridgePanelProps {
	dicomViewerLaunchManifest: DicomViewerLaunchManifestResponse | null | undefined;
	dicomViewerLaunchModeLabels: Record<string, string>;
	dicomWebEndpointUrl: string;
	setDicomWebEndpointUrl: (url: string) => void;
	ohifBaseUrl: string;
	setOhifBaseUrl: (url: string) => void;
	onResetEndpointState: () => void;
	onResetOhifState: () => void;
	cbctWorkbenchSeries: DicomSeriesPreviewGroup | null | undefined;
	isDicomWorkbenchBuilding: boolean;
	buildDicomViewerWorkbenchManifest: () => void | Promise<void>;
	dicomWorkbenchSeriesGuidanceId: string;
	isDicomWorkstationChecking: boolean;
	checkDicomWorkstationReadiness: () => void | Promise<void>;
	isDicomManifestBuilding: boolean;
	buildDicomViewerLaunchManifest: () => void | Promise<void>;
	dicomArchiveAddressReady: boolean;
	isDicomWebChecking: boolean;
	checkDicomWebConnector: () => void | Promise<void>;
	dicomArchiveAddressGuidanceId: string;
	buildDicomViewerToolStateBundle: () => void | Promise<void>;
	isDicomToolStateBuilding: boolean;
	dicomExecutionLaneLabels: Record<string, string>;
	typedDicomWorkstationReadiness: DicomWorkstationReadinessResponse | null;
	buildDicomRenderCachePlan: () => void | Promise<void>;
	isDicomRenderCachePlanning: boolean;
	dicomWorkstationGuidanceId: string;
	dicomWorkstationReadiness: DicomWorkstationReadinessResponse | unknown;
	dicomWebCheck: DicomWebConnectorCheckResponse | null | undefined;
	dicomWebStatusLabels: Record<string, string>;
	dicomLabel: (dict?: Record<string, string> | null | undefined, value?: unknown, fallback?: string) => string;
}

export interface DicomDiagnosticsPanelProps {
	typedDicomViewerWorkbenchManifest: DicomViewerWorkbenchManifestResponse | null;
	dicomQualityModeLabels: Record<string, string>;
	dicomViewerLaunchModeLabels: Record<string, string>;
	dicomTextureStrategyLabels: Record<string, string>;
	dicomRenderMemoryBudgetClassLabels: Record<string, string>;
	dicomDiagnosticPixelPolicyLabels: Record<string, string>;
	dicomWorkbenchLocalSavedAt: string | null;
	formatTime: (time: string | null) => string;
	dicomWorkbenchServerBundle: {
		serverSavedAt?: string | null | undefined;
		[key: string]: unknown;
	} | null | undefined;
	dicomWorkbenchSourceIsRedacted: boolean;
	saveDicomWorkbenchBundleToServer: () => void | Promise<void>;
	isDicomWorkbenchServerSaving: boolean;
	reconnectDicomWorkbenchFromCurrentFolder: () => void | Promise<void>;
	imagingFolderPath: string;
	isDicomWorkbenchReconnecting: boolean;
	restoreDicomWorkbenchServerBundle: (bundle: unknown) => void;
	downloadDicomWorkbenchManifest: () => void;
	clearDicomWorkbenchRecovery: () => void;
	typedDicomWorkstationReadiness: DicomWorkstationReadinessResponse | null;
	dicomRuntimeTierLabels: Record<string, string>;
	mprLoadStrategyLabels: Record<string, string>;
	dicomGpuClassLabels: Record<string, string>;
	dicomExecutionLaneLabels: Record<string, string>;
	dicomReadinessCheckLabels: Record<string, string>;
	typedDicomRenderCachePlan: DicomRenderCachePlanResponse | null;
	dicomLabel: (dict?: Record<string, string> | null | undefined, value?: unknown, fallback?: string) => string;
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
	mprClinicalChecklist?: Array<{ id: string; title: string; checked: boolean }> | undefined;
	mprOperatorSummaryCards?: Array<{ id: string; label: string; value: string; detail: string; status: string }> | undefined;
	mprControlsReady?: boolean | undefined;
	imagingViewerActiveTool?: ImagingViewerTool | null | undefined;
	ctPlanningActiveQuickActionId?: string | null | undefined;
	applyCtPlanningQuickAction?: ((actionId: string) => void) | undefined;
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
	dicomViewerLaunchModeLabels?: Record<string, string> | undefined;
	dicomWebStatusLabels?: Record<string, string> | undefined;
	dicomWebCheck?: DicomWebConnectorCheckResponse | null | undefined;
	mprToolLabels?: Record<string, string> | undefined;
	dicomRenderCachePlan?: DicomRenderCachePlanResponse | null | undefined;
	[key: string]: unknown;
}
