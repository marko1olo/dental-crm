/**
 * crossSectionMouseUpAndWheelLogic.ts — Завершение драга и масштабирование колесиком мыши (Мандат 8b).
 */

import type React from "react";
import { DEFAULT_VIEWPORT_TRANSFORM } from "../../../cbctMprMath";
import type { UseCbctCurvedViewportHandlersParams } from "../types";
import { applyZoomClick } from "../viewportInteractionHandlers";
import { finalizeCrossSectionRuler } from "./crossSectionHitTesting";

export function executeCrossSectionMouseUp(params: UseCbctCurvedViewportHandlersParams): void {
	const {
		setIsDraggingWL, setIsPanning, isDraggingZoom, setIsDraggingZoom, hasDraggedZoomRef,
		activeTool, setTransforms, activeRuler, setActiveRuler, setRulers, setSelectedMeasurement,
		setDraggingMeasurementHandle, setDragImplantPart, setCrossSectionDragStart, transforms,
	} = params;

	setIsDraggingWL(null);
	setIsPanning(null);
	if (isDraggingZoom) {
		if (activeTool === "zoom" && !hasDraggedZoomRef.current) {
			applyZoomClick(isDraggingZoom, hasDraggedZoomRef, "cross_section", transforms, setTransforms);
		}
		setIsDraggingZoom(null);
		hasDraggedZoomRef.current = false;
	}

	if (activeRuler && activeRuler.plane === "cross_section") {
		const finalized = finalizeCrossSectionRuler(activeRuler);
		if (finalized) {
			setRulers((prev) => [...prev, finalized]);
			setSelectedMeasurement(finalized);
		}
		setActiveRuler(null);
	}

	setDraggingMeasurementHandle(null);
	setDragImplantPart(null);
	setCrossSectionDragStart(null);
}

export function executeCrossSectionWheel(
	e: React.WheelEvent<HTMLCanvasElement>,
	params: UseCbctCurvedViewportHandlersParams,
): void {
	e.preventDefault();
	const delta = Math.sign(e.deltaY);
	const factor = delta > 0 ? 0.9 : 1.1;
	params.setTransforms((prev) => {
		const curr = prev.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
		return {
			...prev,
			cross_section: {
				...curr,
				zoom: Math.max(0.2, Math.min(10.0, curr.zoom * factor)),
			},
		};
	});
}
