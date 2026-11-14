import type {
	AiProposal,
	ViewerRulerMeasurement,
} from "../../components/imaging";
import type { ImagingStudy } from "../../components/imaging/types";

export type {
	AiProposal,
	ViewerRulerMeasurement,
	ImagingStudy,
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

export type ImagingViewProps = {
	onStudyCreated?: (study: ImagingStudy) => void;
	onStudyUpdated?: (study: ImagingStudy) => void;
	selectedImagingStudy?: ImagingStudy | null;
	activePatient?: { id?: string; name?: string; fullName?: string; cardNumber?: string; medicalCardNumber?: string; [key: string]: unknown } | null;
	activeAppointment?: unknown;
	activeImagingStudies?: ImagingStudy[];
	visibleImagingStudies?: ImagingStudy[];
	setSelectedImagingStudyId?: (id: string) => void;
	setImagingKindFilter?: (kind: string) => void;
	[key: string]: unknown;
};

export interface ImagingStudyThumbnailProps {
	study: ImagingStudy;
	previewSrc?: string | undefined;
}

export interface ImagingSeriesGalleryProps {
	visibleImagingStudies?: ImagingStudy[];
	activeImagingStudies?: ImagingStudy[];
	selectedImagingStudy?: ImagingStudy | null;
	activePatient?: { id?: string; name?: string; fullName?: string; [key: string]: unknown } | null;
	imagingKindFilter?: string;
	setImagingKindFilter?: (kind: string) => void;
	imagingToothFilter?: string;
	setImagingToothFilter?: (tooth: string) => void;
	imagingKindLabels?: Record<string, string>;
	imagingSourceLabels?: Record<string, string>;
	imagingPreviewSource?: ((study: ImagingStudy) => string | undefined) | undefined;
	imagingViewerHref?: ((study: ImagingStudy) => string) | undefined;
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
