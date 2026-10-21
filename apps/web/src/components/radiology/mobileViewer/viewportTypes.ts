import type React from "react";
import type { TouchGestureState } from "./gestureTypes.js";
import type { MobileChairsideStudyItem } from "./types.js";

export interface MobileGestureViewportProps {
	selectedImagingStudy?: MobileChairsideStudyItem | null | undefined;
	effectivePreviewUrl?: string | null | undefined;
	previewLoadError?: boolean | undefined;
	selectedStudyHasFile?: boolean | undefined;
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
	isAnalyzingAI?: boolean | undefined;
	viewportRef: React.RefObject<HTMLDivElement | null>;
	touchStartRef: React.MutableRefObject<TouchGestureState>;
	setZoom: React.Dispatch<React.SetStateAction<number>>;
	setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
	setRulerStart: (pt: { x: number; y: number } | null) => void;
	setRulerCurrent: (pt: { x: number; y: number } | null) => void;
	setSavedRulerDistanceMm: (dist: number | null) => void;
	triggerHaptic: () => void;
	onPickFiles?: (() => void) | undefined;
}
