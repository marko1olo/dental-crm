import type React from "react";

export interface TouchGestureState {
	x: number;
	y: number;
	panX: number;
	panY: number;
	dist: number;
	initialZoom: number;
	lastTapTime: number;
}

export interface UseMobileGestureEventsProps {
	viewportRef: React.RefObject<HTMLDivElement | null>;
	touchStartRef: React.MutableRefObject<TouchGestureState>;
	zoom: number;
	pan: { x: number; y: number };
	isRulerActive: boolean;
	rulerStart: { x: number; y: number } | null;
	rulerCurrent: { x: number; y: number } | null;
	pixelSpacingMm: number;
	setZoom: React.Dispatch<React.SetStateAction<number>>;
	setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
	setRulerStart: (pt: { x: number; y: number } | null) => void;
	setRulerCurrent: (pt: { x: number; y: number } | null) => void;
	setSavedRulerDistanceMm: (dist: number | null) => void;
	triggerHaptic: () => void;
}
