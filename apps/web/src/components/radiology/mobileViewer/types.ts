import type { Patient } from "@dental/shared";
import type { ImagingStudy } from "../../imaging/types.js";

export * from "./gestureTypes.js";
export * from "./viewportTypes.js";

export type MobileChairsideStudyItem = ImagingStudy;

export interface MobileChairsideRadiologyViewerProps {
	selectedImagingStudy?: ImagingStudy | null | undefined;
	activeImagingStudies: ImagingStudy[];
	activePatient?: Partial<Patient> | null | undefined;
	onSelectStudy: (studyId: string) => void;
	effectivePreviewUrl?: string | null | undefined;
	isPreviewLoading?: boolean | undefined;
	previewLoadError?: boolean | undefined;
	selectedStudyHasFile?: boolean | undefined;
	imagingKindLabels?: Record<string, string> | undefined;
	onCaptureCamera?: (() => void) | undefined;
	onPickFiles?: (() => void) | undefined;
	onAnalyzeAI?: (() => void) | undefined;
	isAnalyzingAI?: boolean | undefined;
	onOpenCbctStudio?: (() => void) | undefined;
	onOpenPanoramic?: (() => void) | undefined;
	onOpenRadiologyModule?: (() => void) | undefined;
	onClose?: (() => void) | undefined;
}

export interface MobileRadiologyFilterToolbarProps {
	inverted: boolean;
	contrast: number;
	brightness: number;
	enhancementClahe: boolean;
	zoom: number;
	rotationDeg: number;
	isRulerActive: boolean;
	isFilterPopoverOpen: boolean;
	onToggleInvert: () => void;
	onCycleContrast: () => void;
	onToggleRuler: () => void;
	onCycleZoom: () => void;
	onRotate: () => void;
	onToggleFilterPopover: () => void;
	onChangeBrightness: (val: number) => void;
	onChangeContrast: (val: number) => void;
	onToggleClahe: () => void;
	onResetFilters: () => void;
	onCloseFilterPopover: () => void;
}

export interface MobileStudiesDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	studies: ImagingStudy[];
	selectedStudyId?: string | undefined;
	activePatient?: Partial<Patient> | null | undefined;
	imagingKindLabels?: Record<string, string> | undefined;
	onSelectStudy: (studyId: string) => void;
	onCaptureCamera?: (() => void) | undefined;
	onPickFiles?: (() => void) | undefined;
	triggerHaptic: () => void;
}

export interface MobilePatientShowcaseOverlayProps {
	isOpen: boolean;
	onClose: () => void;
	selectedStudy?: ImagingStudy | null | undefined;
	activePatient?: Partial<Patient> | null | undefined;
	effectivePreviewUrl?: string | null | undefined;
	computedFilter: string;
	modalityTitle: string;
	toothBadge: string;
	studyDateStr: string;
	comparisonStudy?: ImagingStudy | null | undefined;
	allStudies?: ImagingStudy[] | undefined;
	onSelectComparisonStudy?: ((studyId: string) => void) | undefined;
	isProtocol043Attached?: boolean | undefined;
	onToggleProtocol043Attach?: (() => void) | undefined;
	triggerHaptic: () => void;
}
