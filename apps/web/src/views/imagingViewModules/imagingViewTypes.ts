import type React from "react";
import type {
	AiProposal,
	ViewerRulerMeasurement,
	ImagingViewerState,
} from "../../components/imaging";
import type { ImagingStudy } from "../../components/imaging/types";
import type { BrowserPickedImagingFolderPreview } from "../../constants/imagingConstants";

export type {
	AiProposal,
	ViewerRulerMeasurement,
	ImagingStudy,
	ImagingViewerState,
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
	onStudyCreated?: ((study: ImagingStudy) => void) | undefined;
	onStudyUpdated?: ((study: ImagingStudy) => void) | undefined;
	selectedImagingStudy?: ImagingStudy | null | undefined;
	activePatient?: { id?: string; name?: string; fullName?: string; cardNumber?: string; medicalCardNumber?: string; [key: string]: unknown } | null | undefined;
	activeAppointment?: { doctorName?: string | null; [key: string]: unknown } | null | undefined;
	activeImagingStudies?: ImagingStudy[] | undefined;
	visibleImagingStudies?: ImagingStudy[] | undefined;
	setSelectedImagingStudyId?: ((id: string) => void) | undefined;
	setImagingKindFilter?: ((kind: string) => void) | undefined;
	setImagingToothFilter?: ((tooth: string) => void) | undefined;
	imagingKindFilter?: string | undefined;
	imagingToothFilter?: string | undefined;
	imagingKindLabels?: Record<string, string> | undefined;
	imagingKindOptions?: Array<{ value: string; label: string; [key: string]: unknown }> | string[] | undefined;
	imagingSourceLabels?: Record<string, string> | undefined;
	imagingPreviewSource?: ((study: ImagingStudy) => string | undefined) | undefined;
	imagingViewerHref?: ((study: ImagingStudy) => string) | undefined;
	formatShortDate?: ((date: string | number | Date | null | undefined) => string) | undefined;
	pickBrowserImagingFiles?: (() => void) | undefined;
	pickBrowserImagingFolder?: (() => void | Promise<void>) | undefined;
	isBrowserImagingFolderPicking?: boolean | undefined;
	browserImagingFilesInputRef?: React.RefObject<HTMLInputElement | null> | undefined;
	attachBrowserDirectoryInputRef?: React.RefObject<HTMLInputElement | null> | undefined;
	cameraCaptureInputRef?: React.RefObject<HTMLInputElement | null> | undefined;
	browserImagingFileInputAccept?: string | undefined;
	handleBrowserDirectoryInputChange?: ((files: FileList | null) => void) | undefined;
	handleCameraPhotoCapture?: ((event: React.ChangeEvent<HTMLInputElement>) => void) | undefined;
	selectedImagingViewerPlan?: unknown;
	imagingViewerState?: ImagingViewerState | undefined;
	defaultImagingViewerState?: ImagingViewerState | undefined;
	setImagingViewerState?: React.Dispatch<React.SetStateAction<ImagingViewerState>> | undefined;
	imagingViewerImageStyle?: React.CSSProperties | undefined;
	browserPickedImagingFolder?: BrowserPickedImagingFolderPreview | null | undefined;
	currentView?: string | undefined;
	dashboard?: { imagingStudies?: ImagingStudy[] | undefined } | undefined;
	[key: string]: unknown;
};

export interface ImagingStudyThumbnailProps {
	study: ImagingStudy;
	previewSrc?: string | undefined;
}

export interface ImagingSeriesGalleryProps {
	visibleImagingStudies?: ImagingStudy[] | undefined;
	activeImagingStudies?: ImagingStudy[] | undefined;
	selectedImagingStudy?: ImagingStudy | null | undefined;
	activePatient?: { id?: string; name?: string; fullName?: string; [key: string]: unknown } | null | undefined;
	imagingKindFilter?: string | undefined;
	setImagingKindFilter?: ((kind: string) => void) | undefined;
	imagingToothFilter?: string | undefined;
	setImagingToothFilter?: ((tooth: string) => void) | undefined;
	imagingKindLabels?: Record<string, string> | undefined;
	imagingSourceLabels?: Record<string, string> | undefined;
	imagingPreviewSource?: ((study: ImagingStudy) => string | undefined) | undefined;
	imagingViewerHref?: ((study: ImagingStudy) => string) | undefined;
	onSelectStudy?: ((id: string) => void) | undefined;
	formatShortDate?: ((date: string | number | Date | null | undefined) => string) | undefined;
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
