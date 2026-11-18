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
