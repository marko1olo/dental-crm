import type React from "react";

/**
 * Mobile chairside study item representation.
 */
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

/**
 * Props for the master MobileChairsideRadiologyViewer component.
 */
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

/**
 * Touch coordinates and gestures state.
 */
export interface TouchGestureState {
	x: number;
	y: number;
	panX: number;
	panY: number;
	dist: number;
	initialZoom: number;
	lastTapTime: number;
}

/**
 * Props for MobileGestureViewport presentation layer.
 */
export interface MobileGestureViewportProps {
	selectedImagingStudy: MobileChairsideStudyItem | null;
	effectivePreviewUrl: string | null;
	previewLoadError: boolean;
	selectedStudyHasFile: boolean;
	zoom: number;
	pan: { x: number; y: number };
	rotationDeg: number;
	computedFilter: string;
	computedTransform: string;
	isRulerActive: boolean;
	rulerStart: { x: number; y: number } | null;
	rulerCurrent: { x: number; y: number } | null;
	savedRulerDistanceMm: number | null;
	pixelSpacingMm: number;
	isAnalyzingAI: boolean;
	viewportRef: React.RefObject<HTMLDivElement | null>;
	touchStartRef: React.MutableRefObject<TouchGestureState>;
	setZoom: React.Dispatch<React.SetStateAction<number>>;
	setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
	setRulerStart: (pt: { x: number; y: number } | null) => void;
	setRulerCurrent: (pt: { x: number; y: number } | null) => void;
	setSavedRulerDistanceMm: (dist: number | null) => void;
	triggerHaptic: () => void;
	onPickFiles: () => void;
}

/**
 * Props for MobileRadiologyFilterToolbar thumb actions.
 */
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

/**
 * Props for MobileStudiesDrawer bottom sheet.
 */
export interface MobileStudiesDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	studies: MobileChairsideStudyItem[];
	selectedStudyId: string | null | undefined;
	activePatient: {
		id?: string | null;
		fullName?: string | null;
		name?: string | null;
	} | null;
	imagingKindLabels: Record<string, string>;
	onSelectStudy: (id: string) => void;
	onCaptureCamera: () => void;
	onPickFiles: () => void;
	triggerHaptic: () => void;
}

/**
 * Props for MobilePatientShowcaseOverlay (1-click patient demonstration).
 */
export interface MobilePatientShowcaseOverlayProps {
	isOpen: boolean;
	onClose: () => void;
	selectedStudy: MobileChairsideStudyItem | null;
	activePatient: {
		fullName?: string | null;
		name?: string | null;
	} | null;
	effectivePreviewUrl: string | null;
	computedFilter: string;
	modalityTitle: string;
	toothBadge: string;
	studyDateStr: string;
	comparisonStudy?: MobileChairsideStudyItem | null;
	allStudies?: MobileChairsideStudyItem[];
	onSelectComparisonStudy?: (studyId: string) => void;
	isProtocol043Attached?: boolean;
	onToggleProtocol043Attach?: () => void;
	triggerHaptic: () => void;
}
