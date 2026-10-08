import type React from "react";
import type { CbctToolMode } from "../../CbctLeftToolDock";
import type {
	CbctViewportType,
	MprPlane,
	ViewportTransform,
} from "../../cbctMprMath";
import { DEFAULT_VIEWPORT_TRANSFORM } from "../../cbctMprMath";
import {
	ZOOM_ALT_CLICK_STEP,
	ZOOM_CLICK_STEP,
	ZOOM_FACTOR_EXP,
	ZOOM_MAX_LIMIT,
	ZOOM_MIN_LIMIT,
} from "./constants";
import type { DraggingZoomState, PanningState } from "./types";

/**
 * Layer 2: Pan & Zoom Interaction Handlers.
 * Pure mathematical functions and state manipulators for pan offsets and zoom scaling.
 */

export interface PanDragState {
	startX: number;
	startY: number;
	startPanX: number;
	startPanY: number;
}

export interface ZoomDragState {
	startY: number;
	startZoom: number;
}

/**
 * Calculates updated pan offsets based on mouse drag delta.
 */
export function calculatePanDrag(
	dragState: PanDragState,
	clientX: number,
	clientY: number,
): { panX: number; panY: number } {
	const dx = clientX - dragState.startX;
	const dy = clientY - dragState.startY;
	return {
		panX: dragState.startPanX + dx,
		panY: dragState.startPanY + dy,
	};
}

/**
 * Calculates exponential zoom level based on vertical mouse drag.
 */
export function calculateDragZoom(
	dragState: ZoomDragState,
	clientY: number,
): number {
	const dy = dragState.startY - clientY;
	const zoomFactor = Math.exp(dy * ZOOM_FACTOR_EXP);
	return Math.max(
		ZOOM_MIN_LIMIT,
		Math.min(
			ZOOM_MAX_LIMIT,
			Number((dragState.startZoom * zoomFactor).toFixed(2)),
		),
	);
}

/**
 * Calculates zoom level for single click (zoom in or Alt-zoom out).
 */
export function calculateClickZoom(
	currentZoom: number,
	isAltKey: boolean,
): number {
	if (isAltKey) {
		return Math.max(
			ZOOM_MIN_LIMIT,
			Number((currentZoom * ZOOM_ALT_CLICK_STEP).toFixed(2)),
		);
	}
	return Math.min(
		ZOOM_MAX_LIMIT,
		Number((currentZoom * ZOOM_CLICK_STEP).toFixed(2)),
	);
}

/**
 * Handles mouse down event when panning or zooming is initiated.
 */
export function handlePanZoomMouseDown(params: {
	plane: MprPlane;
	e: React.MouseEvent<HTMLCanvasElement>;
	activeTool: CbctToolMode;
	currentTransform: ViewportTransform;
	setIsPanning: (state: PanningState | null) => void;
	setIsDraggingZoom: (state: DraggingZoomState | null) => void;
	setTransforms: React.Dispatch<
		React.SetStateAction<Record<CbctViewportType, ViewportTransform>>
	>;
	hasDraggedZoomRef: React.MutableRefObject<boolean>;
}): boolean {
	const {
		plane,
		e,
		activeTool,
		currentTransform,
		setIsPanning,
		setIsDraggingZoom,
		setTransforms,
		hasDraggedZoomRef,
	} = params;

	if (activeTool === "pan" || e.button === 1) {
		setIsPanning({
			plane,
			startX: e.clientX,
			startY: e.clientY,
			startPanX: currentTransform.panX,
			startPanY: currentTransform.panY,
		});
		return true;
	}

	if (activeTool === "zoom") {
		if (e.altKey) {
			const nextZoom = calculateClickZoom(currentTransform.zoom, true);
			setTransforms((prev) => ({
				...prev,
				[plane]: {
					...(prev[plane] ?? DEFAULT_VIEWPORT_TRANSFORM),
					zoom: nextZoom,
				},
			}));
			return true;
		}
		hasDraggedZoomRef.current = false;
		setIsDraggingZoom({
			plane,
			startY: e.clientY,
			startZoom: currentTransform.zoom,
		});
		return true;
	}

	return false;
}

/**
 * Handles mouse move updates when panning or zooming is active.
 */
export function handlePanZoomMouseMove(params: {
	plane: MprPlane;
	clientX: number;
	clientY: number;
	isPanning: PanningState | null;
	isDraggingZoom: DraggingZoomState | null;
	setTransforms: React.Dispatch<
		React.SetStateAction<Record<CbctViewportType, ViewportTransform>>
	>;
	hasDraggedZoomRef: React.MutableRefObject<boolean>;
}): boolean {
	const {
		plane,
		clientX,
		clientY,
		isPanning,
		isDraggingZoom,
		setTransforms,
		hasDraggedZoomRef,
	} = params;

	if (isPanning && isPanning.plane === plane) {
		const { panX, panY } = calculatePanDrag(isPanning, clientX, clientY);
		setTransforms((prev) => ({
			...prev,
			[plane]: {
				...(prev[plane] ?? DEFAULT_VIEWPORT_TRANSFORM),
				panX,
				panY,
			},
		}));
		return true;
	}

	if (isDraggingZoom && isDraggingZoom.plane === plane) {
		hasDraggedZoomRef.current = true;
		const nextZoom = calculateDragZoom(isDraggingZoom, clientY);
		setTransforms((prev) => ({
			...prev,
			[plane]: {
				...(prev[plane] ?? DEFAULT_VIEWPORT_TRANSFORM),
				zoom: nextZoom,
			},
		}));
		return true;
	}

	return false;
}

/**
 * Handles zoom level increment on mouse up if zoom was clicked without dragging.
 */
export function handleZoomSingleClickMouseUp(params: {
	isDraggingZoom: DraggingZoomState | null;
	hasDraggedZoom: boolean;
	transforms: Record<CbctViewportType, ViewportTransform>;
	setTransforms: React.Dispatch<
		React.SetStateAction<Record<CbctViewportType, ViewportTransform>>
	>;
}): void {
	const { isDraggingZoom, hasDraggedZoom, transforms, setTransforms } = params;
	if (isDraggingZoom && !hasDraggedZoom) {
		const targetPlane = isDraggingZoom.plane;
		if (
			targetPlane === "axial" ||
			targetPlane === "coronal" ||
			targetPlane === "sagittal"
		) {
			const currentTransform =
				transforms[targetPlane] ?? DEFAULT_VIEWPORT_TRANSFORM;
			const nextZoom = calculateClickZoom(currentTransform.zoom, false);
			setTransforms((prev) => ({
				...prev,
				[targetPlane]: {
					...(prev[targetPlane] ?? DEFAULT_VIEWPORT_TRANSFORM),
					zoom: nextZoom,
				},
			}));
		}
	}
}
