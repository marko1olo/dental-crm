export * from "./gestureTypes.js";
export * from "./viewportTypes.js";

export interface MobileChairsideStudyItem {
	id: string;
	title: string;
	kind: string;
	region?: string | null;
	toothCode?: string | null;
	capturedAt: string;
	previewUrl?: string | null;
	storagePath?: string | null;
	sourceKind?: string | null;
	sourceName?: string | null;
	aiSummary?: string | null;
}

export interface MobileChairsideRadiologyViewerProps {
	selectedImagingStudy: MobileChairsideStudyItem | null;
	activeImagingStudies: MobileChairsideStudyItem[];
	activePatient: {
		id?: string | null;
		fullName?: string | null;
		name?: string | null;
	} | null;
	onSelectStudy: (studyId: string) => void;
	effectivePreviewUrl: string | null;
	isPreviewLoading: boolean;
	previewLoadError: boolean;
	selectedStudyHasFile: boolean;
	imagingKindLabels: Record<string, string>;
	onCaptureCamera: () => void;
	onPickFiles: () => void;
	onAnalyzeAI: () => void;
	isAnalyzingAI: boolean;
	onOpenCbctStudio?: () => void;
	onOpenPanoramic?: () => void;
	onOpenRadiologyModule?: () => void;
	onClose?: () => void;
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
	studies: MobileChairsideStudyItem[];
	selectedStudyId?: string;
	activePatient: {
		id?: string | null;
		fullName?: string | null;
		name?: string | null;
	} | null;
	imagingKindLabels?: Record<string, string>;
	onSelectStudy: (studyId: string) => void;
	onCaptureCamera: () => void;
	onPickFiles: () => void;
	triggerHaptic: () => void;
}

export interface MobilePatientShowcaseOverlayProps {
	isOpen: boolean;
	onClose: () => void;
	selectedStudy?: MobileChairsideStudyItem | null;
	activePatient: {
		id?: string | null;
		fullName?: string | null;
		name?: string | null;
	} | null;
	effectivePreviewUrl: string | null;
	computedFilter: string;
	modalityTitle: string;
	toothBadge: string;
	studyDateStr: string;
	comparisonStudy: MobileChairsideStudyItem | null;
	allStudies?: MobileChairsideStudyItem[];
	onSelectComparisonStudy?: (studyId: string) => void;
	isProtocol043Attached?: boolean;
	onToggleProtocol043Attach?: () => void;
	triggerHaptic: () => void;
}
