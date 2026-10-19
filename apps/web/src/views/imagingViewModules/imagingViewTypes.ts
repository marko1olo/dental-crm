import type {
	AiProposal,
	ViewerRulerMeasurement,
} from "../../components/imaging";

export type {
	AiProposal,
	ViewerRulerMeasurement,
};

export type ImagingModality =
	| "cbct"
	| "ct"
	| "panoramic"
	| "opg"
	| "rvg"
	| "periapical"
	| "bitewing"
	| "photo"
	| "all";

export type ImagingDiagnosticTool =
	| "ruler"
	| "angle"
	| "pan"
	| "zoom"
	| "contrast"
	| "invert"
	| "magnifier"
	| "none";

export type ImagingModalId =
	| null
	| "ct_selector"
	| "cbct_studio"
	| "panoramic"
	| "radiology_module"
	| "export"
	| "comparison"
	| "rvg_capture";

// biome-ignore lint/suspicious/noExplicitAny: generic CRM views host props
export type ImagingViewProps = Record<string, any>;

export interface ImagingStudyThumbnailProps {
	// biome-ignore lint/suspicious/noExplicitAny: study item
	study: any;
	previewSrc?: string | undefined;
}

export interface ImagingSeriesGalleryProps {
	// biome-ignore lint/suspicious/noExplicitAny: studies list
	visibleImagingStudies?: any[];
	// biome-ignore lint/suspicious/noExplicitAny: active studies
	activeImagingStudies?: any[];
	// biome-ignore lint/suspicious/noExplicitAny: selected study
	selectedImagingStudy?: any;
	// biome-ignore lint/suspicious/noExplicitAny: active patient
	activePatient?: any;
	imagingKindFilter?: string;
	setImagingKindFilter?: (kind: string) => void;
	imagingToothFilter?: string;
	setImagingToothFilter?: (tooth: string) => void;
	imagingKindLabels?: Record<string, string>;
	imagingSourceLabels?: Record<string, string>;
	imagingPreviewSource?: string;
	imagingViewerHref?: string;
	onSelectStudy?: (id: string) => void;
	formatShortDate?: (date: string) => string;
}

export interface ImagingViewportControlsProps {
	isRulerActive: boolean;
	setIsRulerActive: (active: boolean | ((prev: boolean) => boolean)) => void;
	isPanActive: boolean;
	setIsPanActive: (active: boolean | ((prev: boolean) => boolean)) => void;
	enhancementOn: boolean;
	setEnhancementOn: (on: boolean | ((prev: boolean) => boolean)) => void;
	rulerMeasurements?: ViewerRulerMeasurement[];
	onClearMeasurements?: () => void;
	currentPixelSpacingMm?: number;
	onAnalyzeAI?: () => void;
	isAnalyzingAI?: boolean;
	onOpenCbctStudio?: () => void;
	onLoadFromDicomweb?: () => void;
	isDicomwebLoading?: boolean;
	dicomwebLoadProgress?: string | null;
	hasDicomwebSource?: boolean;
	className?: string;
}
