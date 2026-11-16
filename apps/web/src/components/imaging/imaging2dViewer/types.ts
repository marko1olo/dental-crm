/**
 * types.ts — Типы для секции 2D просмотрщика снимков
 * Mandate 8b: строго <= 120 строк.
 */

import type React from "react";
import type {
	ImagingViewerAnnotation,
	ImagingViewerImplantPlan,
} from "@dental/shared";
import type {
	ImagingStudy,
	ImagingViewerState,
	ViewerRulerMeasurement,
	AiProposal,
} from "../types.js";
import type { ToothUpdate } from "../xrayProtocol/types.js";
import type { BrowserPickedImagingFolderPreview } from "../../../AppConstants";

export interface Imaging2dViewerSectionProps {
	[key: string]: unknown;
	selectedImagingStudy: ImagingStudy | null | undefined;
	localImageIds: string[];
	setLocalImageIds: (ids: string[]) => void;
	browserPickedImagingFolder?: BrowserPickedImagingFolderPreview | null | undefined;
	imagingViewerState?: ImagingViewerState | undefined;
	setImagingViewerState: React.Dispatch<React.SetStateAction<ImagingViewerState>>;
	defaultImagingViewerState?: ImagingViewerState | undefined;
	computedViewerImageStyle: React.CSSProperties;
	effectivePreviewUrl?: string | null | undefined;
	isPreviewLoading: boolean;
	previewLoadError: boolean;
	selectedStudyHasFile: boolean;
	imagingKindLabels: Record<string, string>;
	isDicomwebLoading: boolean;
	dicomwebLoadProgress: string | null;
	onOpenCbctStudio: () => void;
	onLoadFromDicomweb: () => void;
	enhancementOn: boolean;
	setEnhancementOn:
		| React.Dispatch<React.SetStateAction<boolean>>
		| ((on: boolean) => void);
	isRulerActive: boolean;
	setIsRulerActive:
		| React.Dispatch<React.SetStateAction<boolean>>
		| ((active: boolean) => void);
	currentPixelSpacingMm: number;
	rulerMeasurements: ViewerRulerMeasurement[];
	setRulerMeasurements: (m: ViewerRulerMeasurement[]) => void;
	isPanActive: boolean;
	setIsPanActive:
		| React.Dispatch<React.SetStateAction<boolean>>
		| ((active: boolean) => void);
	pickBrowserImagingFiles: () => void;
	isAnalyzingAI: boolean;
	onAnalyzeAI: () => void;
	selectedStudySummary: string | null;
	selectedStudyToothUpdates?: ToothUpdate[] | undefined;
	pendingAiProposal: AiProposal | null;
	setPendingAiProposal: (p: AiProposal | null) => void;
	setImagingViewerActiveTool?: ((tool: string) => void) | undefined;
	setCtPlanningActiveQuickActionId?: ((id: string | null) => void) | undefined;
	setCtPlanningImplantPlan?: ((plan: ImagingViewerImplantPlan | null) => void) | undefined;
	imagingViewerNote?: string | undefined;
	setImagingViewerNote?: ((note: string) => void) | undefined;
	imagingViewerSaveState?: string | undefined;
	imagingViewerSaveTitle?: Record<string, string> | undefined;
	imagingViewerSaveDetail?: string | undefined;
	imagingViewerNoteReady?: boolean | undefined;
	imagingViewerSessionReady?: boolean | undefined;
	imagingViewerNoteMissingId?: string | undefined;
	imagingViewerRetryMissingId?: string | undefined;
	canRetryImagingViewerSave?: boolean | undefined;
	retryImagingViewerSessionSave?: (() => void) | undefined;
	addImagingViewerNoteAnnotation?: (() => void) | undefined;
	imagingViewerAnnotations?: ImagingViewerAnnotation[] | undefined;
	formatShortDate?: ((date: string | number | Date | null | undefined) => string) | undefined;
	isOnline?: boolean | undefined;
	activeAppointment?:
		| { id: string; date?: string; patientName?: string }
		| null
		| undefined;
	activePatient?:
		| { readonly id?: string | undefined; readonly fullName?: string | undefined; readonly name?: string | undefined }
		| null
		| undefined;
	onAttachToTooth?: (toothCode: string) => Promise<void> | void;
	onAttachToVisit?: (visitId: string) => Promise<void> | void;
	onPickFolder?: () => void;
	onCaptureCamera?: () => void;
	onOpenRvgCapture?: () => void;
	onStudyUploaded?: (study: ImagingStudy) => void;
}
