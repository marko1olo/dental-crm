/**
 * crossSectionMouseUpAndWheelLogic.ts — Завершение драга и масштабирование колесиком мыши (Мандат 8b).
 */

import type React from "react";
import type { UseCbctCurvedViewportHandlersParams } from "../types";
import { applyZoomClick } from "../viewportInteractionHandlers";
import { finalizeCrossSectionRuler } from "./crossSectionHitTesting";

export function executeCrossSectionMouseUp(params: UseCbctCurvedViewportHandlersParams): void {
	const {
		setIsDraggingWL, setIsPanning, isDraggingZoom, setIsDraggingZoom, hasDraggedZoomRef,
		activeTool, setTransforms, activeRuler, setActiveRuler, setRulers, setSelectedMeasurement,
		setDraggingMeasurementHandle, setDragImplantPart, setCrossSectionDragStart,
	} = params;

	setIsDraggingWL(false);
	setIsPanning(false);
	if (isDraggingZoom) {
		setIsDraggingZoom(false);
		if (activeTool === "zoom" && !hasDraggedZoomRef.current) {
			applyZoomClick(1.25, "cross_section", setTransforms);
		}
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
		const curr = prev.cross_section;
		return {
			...prev,
			cross_section: {
				...curr,
				scale: Math.max(0.2, Math.min(10.0, curr.scale * factor)),
			},
		};
	});
}
