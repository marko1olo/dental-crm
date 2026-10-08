import type {
	DicomViewerWorkbenchManifestResponse,
	DicomWorkstationReadinessResponse,
	MprWindowPreset,
} from "@dental/shared";
import type { ChangeEvent, CSSProperties, KeyboardEvent } from "react";

export type CbctWorkbenchPlane = { key: string; title: string; detail: string };
export type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
export type InputChangeEvent = ChangeEvent<HTMLInputElement>;

export interface DicomCapabilityHeaderProps {
	capabilities: Array<{
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		icon: any;
		title: string;
		detail: string;
		state: string;
	}>;
}

export interface DicomSeriesLabPanelProps {
	previewDicomSeries: () => void | Promise<void>;
	isDicomSeriesPreviewLoading: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	dicomSeriesPreview: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	seriesList: Array<any>;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprNearestClinicalPreset: {
		exact?: boolean;
		label: string;
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		deltas: any[];
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprClinicalPresets: Array<any>;
	describeMprClinicalPresetProjectionFallback: (
		projection: string,
		projections: string[],
		labels: Record<string, string>,
	) => string | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	mprClinicalPresetButtonClass: (preset: any) => string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	applyMprClinicalPreset: (preset: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	dicomViewerLaunchManifest: any;
	dicomViewerLaunchModeLabels: Record<string, string>;
	dicomWebEndpointUrl: string;
	setDicomWebEndpointUrl: (url: string) => void;
	ohifBaseUrl: string;
	setOhifBaseUrl: (url: string) => void;
	onResetEndpointState: () => void;
	onResetOhifState: () => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	cbctWorkbenchSeries: any;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	dicomWorkstationReadiness: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	dicomWebCheck: any;
	dicomWebStatusLabels: Record<string, string>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	dicomLabel: (dict: any, value: any, fallback: string) => string;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	dicomWorkbenchServerBundle: any;
	dicomWorkbenchSourceIsRedacted: boolean;
	saveDicomWorkbenchBundleToServer: () => void | Promise<void>;
	isDicomWorkbenchServerSaving: boolean;
	reconnectDicomWorkbenchFromCurrentFolder: () => void | Promise<void>;
	imagingFolderPath: string;
	isDicomWorkbenchReconnecting: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	restoreDicomWorkbenchServerBundle: (bundle: any) => void;
	downloadDicomWorkbenchManifest: () => void;
	clearDicomWorkbenchRecovery: () => void;
	typedDicomWorkstationReadiness: DicomWorkstationReadinessResponse | null;
	dicomRuntimeTierLabels: Record<string, string>;
	mprLoadStrategyLabels: Record<string, string>;
	dicomGpuClassLabels: Record<string, string>;
	dicomExecutionLaneLabels: Record<string, string>;
	dicomReadinessCheckLabels: Record<string, string>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	typedDicomRenderCachePlan: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	dicomLabel: (dict: any, value: any, fallback: string) => string;
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
