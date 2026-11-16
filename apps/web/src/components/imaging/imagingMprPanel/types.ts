import type React from "react";
import type {
	DicomSeriesPreviewGroup,
	DicomViewerToolStateBundleResponse,
	DicomViewerWorkbenchManifestResponse,
	ImagingStudy,
	ImagingViewerAnnotation,
	ImagingViewerImplantPlan,
	ImagingViewerTool,
	MprProjection,
	MprWindowPreset,
} from "@dental/shared";
import type { CbctWorkbenchPlane, ImagingViewerPlan } from "../../../constants/imagingConstants";
import type {
	MprClinicalChecklistItem,
	MprClinicalPresetFit,
	MprOperatorSummaryCard,
} from "../../../mprClinicalStatus";
import type { MprAxisGuidance, MprProjectionCompassLabels } from "../../../mprControlMath";
import type { MprClinicalPreset } from "../../../imagingUiLabels";
import type {
	CtPlanningArtifactAnnotationRef,
	CtPlanningArtifactCommand,
} from "../../../ctPlanningArtifactCommands";
import type { CtPlanningQuickAction } from "../../../ctPlanningTools";

export interface ImagingMprPanelProps {
	[key: string]: unknown;
	selectedImagingStudy?: ImagingStudy | null | undefined;
	imagingViewerHref: (study?: ImagingStudy | null) => string;
	selectedImagingViewerPlan?: ImagingViewerPlan | null | undefined;
	dicomViewerWorkbenchManifest?: DicomViewerWorkbenchManifestResponse | null | undefined;
	dicomLabel?: (
		labels: Record<string, string> | undefined,
		key: string | undefined,
		fallback: string,
	) => string;
	dicomQualityModeLabels?: Record<string, string> | undefined;
	dicomTextureStrategyLabels?: Record<string, string> | undefined;
	imagingViewerSaveTitle: Record<string, string>;
	imagingViewerSaveState: string;
	imagingViewerAnnotations?: ImagingViewerAnnotation[] | undefined;
	mprClinicalNextStep?: string | undefined;
	mprClinicalChecklist?: MprClinicalChecklistItem[] | undefined;
	mprOperatorSummaryCards?: MprOperatorSummaryCard[] | undefined;
	mprControlsReady: boolean;
	imagingViewerActiveTool: ImagingViewerTool | string;
	ctPlanningActiveQuickActionId?: string | null | undefined;
	applyCtPlanningQuickAction: (actionId: string) => void;
	ctPlanningImplantPlan?: ImagingViewerImplantPlan | null | undefined;
	selectCtPlanningImplant: (implantId: string | null) => void;
	ctPlanningAnnotationRefs?: CtPlanningArtifactAnnotationRef[] | undefined;
	createCtPlanningArtifact?: ((command?: CtPlanningArtifactCommand) => void) | undefined;
	dicomViewerToolStateBundle?: DicomViewerToolStateBundleResponse | null | undefined;
	mprControlsAutoOpen?: boolean | undefined;
	setLocalImageIds: (ids: string[]) => void;
	cbctWorkbenchPlanes?: CbctWorkbenchPlane[] | undefined;
	cbctWorkbenchProjections?: string[] | undefined;
	mprProjection?: MprProjection | string | undefined;
	setMprProjection: (proj: MprProjection | string) => void;
	mprSeriesRequiredProjectionLabel?: string | undefined;
	mprUnavailableProjectionLabel?: string | undefined;
	mprAxisVisualizerStyle?: React.CSSProperties | undefined;
	mprAxisVisualizerLabel?: string | undefined;
	handleMprKeyboardNavigation?: ((e: React.KeyboardEvent) => void) | undefined;
	mprProjectionCompass?: MprProjectionCompassLabels | null | undefined;
	mprCrosshairEnabled?: boolean | undefined;
	mprAxisAngleBadge?: string | undefined;
	mprSlabBadge?: string | undefined;
	mprSliceBadge?: string | undefined;
	mprActiveProjectionLabel?: string | undefined;
	mprActiveProjectionOrientation?: string | undefined;
	mprAxisDirectionLabel?: string | undefined;
	mprSlabMm?: number | undefined;
	mprSliceLabel?: string | undefined;
	mprAxisGuidance?: MprAxisGuidance | null | undefined;
	mprWorkbenchSummaryText?: string | undefined;
	mprLinkedPlanesEnabled?: boolean | undefined;
	mprNearestClinicalPreset?: MprClinicalPresetFit | null | undefined;
	applyNearestMprClinicalPreset?: (() => void) | undefined;
	mprProjectionLabels: Record<string, string>;
	mprAxisDeg: number;
	mprAxisRangeValue?: string | undefined;
	mprAxisBounds: { min: number; max: number };
	clampMprAxisDeg: (deg: number) => number;
	setMprAxisDeg: (deg: number) => void;
	mprAxisNudgeDeg?: readonly number[] | number[] | undefined;
	formatSignedMprStep: (val: number, unit: string) => string;
	mprAxisPresetDeg?: readonly number[] | number[] | undefined;
	mprSlabRangeValue?: string | undefined;
	mprSlabBounds: { min: number; max: number };
	clampMprSlabMm: (mm: number) => number;
	setMprSlabMm: (mm: number) => void;
	mprSlabNudgeMm?: readonly number[] | number[] | undefined;
	mprSlabPresetMm?: readonly number[] | number[] | undefined;
	mprSliceMaxIndex: number;
	mprSafeSliceIndex: number;
	mprSliceRangeValue?: string | undefined;
	clampMprSliceIndex: (idx: number, max: number) => number;
	setMprSliceIndex: (idx: number) => void;
	mprSliceNudgeSteps?: readonly number[] | number[] | undefined;
	mprSlicePresetFractions?:
		| readonly { id: string; label: string; fraction: number }[]
		| { id: string; label: string; fraction: number }[]
		| undefined;
	mprSliceIndexFromFraction: (frac: number, max: number) => number;
	resetMprControls: () => void;
	mprWorkbenchLocalSavedAt?: string | number | Date | null | undefined;
	formatTime: (t: string | number | Date | null | undefined) => string;
	mprWorkbenchDraftRestored?: boolean | undefined;
	restoreMprWorkbenchLocalDraft: () => void;
	mprClinicalPresets?: MprClinicalPreset[] | undefined;
	describeMprClinicalPresetProjectionFallback: (
		presetProjection: string,
		supportedProjections: readonly string[] | undefined,
		labels: Record<string, string>,
	) => string | null;
	mprClinicalPresetButtonClass?: ((preset: MprClinicalPreset) => string) | undefined;
	applyMprClinicalPreset?: ((preset: MprClinicalPreset) => void) | undefined;
	mprWindowPresetLabels: Record<string, string>;
	mprWindowPreset: MprWindowPreset | string;
	setMprWindowPreset: (preset: MprWindowPreset | string) => void;
	setMprCrosshairEnabled: (enabled: boolean) => void;
	setMprLinkedPlanesEnabled: (enabled: boolean) => void;
	cbctWorkbenchSeries?: DicomSeriesPreviewGroup | null | undefined;
}
