/**
 * types.ts — Типы для секции 2D просмотрщика снимков
 * Mandate 8b: строго <= 120 строк.
 */

import type React from "react";
import type { ViewerRulerMeasurement, AiProposal } from "../types.js";

export interface Imaging2dViewerSectionProps {
	selectedImagingStudy: any;
	localImageIds: string[];
	setLocalImageIds: (ids: string[]) => void;
	browserPickedImagingFolder?: any;
	imagingViewerState?: any;
	setImagingViewerState: (state: any) => void;
	defaultImagingViewerState?: any;
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
	setEnhancementOn: (on: boolean) => void;
	isRulerActive: boolean;
	setIsRulerActive: (active: boolean) => void;
	currentPixelSpacingMm: number;
	rulerMeasurements: ViewerRulerMeasurement[];
	setRulerMeasurements: (m: ViewerRulerMeasurement[]) => void;
	isPanActive: boolean;
	setIsPanActive: (active: boolean) => void;
	pickBrowserImagingFiles: () => void;
	isAnalyzingAI: boolean;
	onAnalyzeAI: () => void;
	selectedStudySummary: string | null;
	selectedStudyToothUpdates?: unknown[] | undefined;
	pendingAiProposal: AiProposal | null;
	setPendingAiProposal: (p: AiProposal | null) => void;
	setImagingViewerActiveTool?: ((tool: string) => void) | undefined;
	setCtPlanningActiveQuickActionId?: ((id: string | null) => void) | undefined;
	setCtPlanningImplantPlan?: ((plan: any) => void) | undefined;
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
	imagingViewerAnnotations?: any[] | undefined;
	formatShortDate?: ((date: any) => string) | undefined;
	isOnline?: boolean | undefined;
	activeAppointment?: any;
	activePatient?: any;
	onAttachToTooth?: (toothCode: string) => Promise<void> | void;
	onAttachToVisit?: (visitId: string) => Promise<void> | void;
	onPickFolder?: () => void;
	onCaptureCamera?: () => void;
	onOpenRvgCapture?: () => void;
	onStudyUploaded?: (study: any) => void;
}
