/**
 * DENTE CRM — Panoramic Viewport Mouse Navigation Handlers
 * Standards: Mandate 8b (Sweet Spot 100-140 lines), DICOM Part 3 Pan/Zoom/W&L.
 */

import type React from "react";
import type { UseCbctCurvedViewportHandlersParams } from "../types";
import {
	applyPanDrag,
	applyWindowLevelDrag,
	applyZoomClick,
	applyZoomDrag,
	handleCommonNavigationMouseDown,
} from "../viewportInteractionHandlers";

/**
 * Handles mouse down event for navigation tools (pan, zoom, window/level).
 * Returns true if the event was captured and handled as a navigation action.
 */
export function handlePanoramicNavMouseDown(
	e: React.MouseEvent<HTMLCanvasElement>,
	params: UseCbctCurvedViewportHandlersParams,
): boolean {
	return handleCommonNavigationMouseDown(
		e,
		params.activeTool,
		"panoramic",
		params.windowWidth,
		params.windowLevel,
		params.transforms,
		params.setIsDraggingWL,
		params.setIsPanning,
		params.setIsDraggingZoom,
		params.hasDraggedZoomRef,
		params.setTransforms,
	);
}

/**
 * Handles active drag interactions for Window/Level, Pan, and Zoom.
 * Returns true if any navigation dragging was active and handled.
 */
export function handlePanoramicNavMouseMove(
	e: React.MouseEvent<HTMLCanvasElement>,
	params: UseCbctCurvedViewportHandlersParams,
): boolean {
	if (params.isDraggingWL) {
		applyWindowLevelDrag(
			e.clientX,
			e.clientY,
			params.isDraggingWL,
			params.setWindowWidth,
			params.setWindowLevel,
		);
		return true;
	}

	if (params.isPanning && params.isPanning.plane === "panoramic") {
		applyPanDrag(
			e.clientX,
			e.clientY,
			params.isPanning,
			"panoramic",
			params.setTransforms,
		);
		return true;
	}

	if (params.isDraggingZoom && params.isDraggingZoom.plane === "panoramic") {
		applyZoomDrag(
			e.clientY,
			params.isDraggingZoom,
			"panoramic",
			params.hasDraggedZoomRef,
			params.setTransforms,
		);
		return true;
	}

	return false;
}

/**
 * Finalizes navigation drag interactions, applies clicks for zoom tool, and resets drag flags.
 */
export function handlePanoramicNavMouseUp(
	params: UseCbctCurvedViewportHandlersParams,
): void {
	applyZoomClick(
		params.isDraggingZoom,
		params.hasDraggedZoomRef,
		"panoramic",
		params.transforms,
		params.setTransforms,
	);
	params.setIsPanning(null);
	params.setIsDraggingZoom(null);
	params.setIsDraggingWL(null);
	params.hasDraggedZoomRef.current = false;
}
