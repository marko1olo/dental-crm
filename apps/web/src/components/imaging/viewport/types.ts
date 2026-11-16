/**
 * types.ts — Типы для рабочей области рентгеновских снимков и КЛКТ (Мандат 8b <= 120 строк).
 */

import type React from "react";
import type {
	AiProposal,
	ImagingStudy,
	ImagingViewerState,
	ViewerRulerMeasurement,
} from "../types.js";
import type { BrowserPickedImagingFolderPreview } from "../../../AppConstants.js";

export interface ImagingViewportProps {
	selectedImagingStudy?: ImagingStudy | null | undefined;
	localImageIds: string[];
	setLocalImageIds: (ids: string[]) => void;
	browserPickedImagingFolder?: BrowserPickedImagingFolderPreview | null | undefined;
	imagingViewerState: ImagingViewerState;
	setImagingViewerState:
		| React.Dispatch<React.SetStateAction<ImagingViewerState>>
		| ((updater: ((prevState: ImagingViewerState) => ImagingViewerState) | ImagingViewerState) => void);
	computedViewerImageStyle: React.CSSProperties;
	effectivePreviewUrl: string | null;
	isPreviewLoading: boolean;
	previewLoadError: boolean;
	selectedStudyHasFile: boolean;
	imagingKindLabels: Record<string, string>;
	isDicomwebLoading: boolean;
	dicomwebLoadProgress: string | null;
	onOpenCbctStudio: () => void;
	onLoadFromDicomweb: () => void;
	enhancementOn: boolean;
	isRulerActive: boolean;
	currentPixelSpacingMm: number;
	rulerMeasurements: ViewerRulerMeasurement[];
	setRulerMeasurements: (measurements: ViewerRulerMeasurement[]) => void;
	isPanActive: boolean;
	onAttachFile: () => void;
	isAnalyzingAI: boolean;
	onAnalyzeAI: () => void;
	selectedStudySummary: string | null | undefined;
	pendingAiProposal: AiProposal | null;
	setPendingAiProposal: (proposal: AiProposal | null) => void;
	onStudyUploaded?: ((study: ImagingStudy) => void) | undefined;
}
