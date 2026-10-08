import {
	WL_DRAG_SENSITIVITY,
	WL_MAX_LIMIT,
	WL_MIN_LIMIT,
	WW_DRAG_SENSITIVITY,
	WW_MAX_LIMIT,
	WW_MIN_LIMIT,
} from "./constants";

/**
 * Layer 1: Window Width / Window Level calculations.
 * Pure mathematical functions for contrast and brightness adjustments.
 */

export interface WindowLevelDragState {
	startX: number;
	startY: number;
	startWW: number;
	startWL: number;
}

export interface WindowLevelValues {
	nextWW: number;
	nextWL: number;
}

/**
 * Calculates updated window width and window level based on drag delta.
 * Horizontal drag adjusts Window Width (contrast), vertical drag adjusts Window Level (brightness).
 */
export function calculateWindowLevelDrag(
	dragState: WindowLevelDragState,
	clientX: number,
	clientY: number,
): WindowLevelValues {
	const dx = clientX - dragState.startX;
	const dy = clientY - dragState.startY;

	const nextWW = Math.max(
		WW_MIN_LIMIT,
		Math.min(
			WW_MAX_LIMIT,
			Math.round(dragState.startWW + dx * WW_DRAG_SENSITIVITY),
		),
	);

	const nextWL = Math.max(
		WL_MIN_LIMIT,
		Math.min(
			WL_MAX_LIMIT,
			Math.round(dragState.startWL - dy * WL_DRAG_SENSITIVITY),
		),
	);

	return { nextWW, nextWL };
}
