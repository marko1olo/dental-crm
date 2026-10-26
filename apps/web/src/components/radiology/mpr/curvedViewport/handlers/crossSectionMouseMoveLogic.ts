/**
 * crossSectionMouseMoveLogic.ts — Логика события MouseMove в кросс-секции (Мандат 8b).
 */

import type React from "react";
import type { Point3D } from "../../../cbctMprMath";
import { DEFAULT_VIEWPORT_TRANSFORM, getCanvasPointerPos } from "../../../cbctMprMath";
import { calculateImplantDragDelta, hitTestImplantPart } from "../curveSplineMath";
import type { UseCbctCurvedViewportHandlersParams } from "../types";
import { applyPanDrag, applyWindowLevelDrag, applyZoomDrag } from "../viewportInteractionHandlers";
import { hitTestCrossSectionHandles, updateCrossSectionMeasurementDrag } from "./crossSectionHitTesting";

export function executeCrossSectionMouseMove(
	e: React.MouseEvent<HTMLCanvasElement>,
	params: UseCbctCurvedViewportHandlersParams,
	getCrossPointerMm: (pos: { readonly x: number; readonly y: number }, w: number) => Point3D,
): void {
	const {
		isDraggingWL, windowWidth, setWindowWidth, windowLevel, setWindowLevel, isPanning,
		setTransforms, isDraggingZoom, hasDraggedZoomRef, crossSectionCanvasRef, activeCrossSection,
		activeRuler, setActiveRuler, draggingMeasurementHandle, setRulers, setAngles,
		transforms, rulers, angles, setHoveredMeasurementHandle, studioMode, dragImplantPart,
		crossSectionDragStart, setCrossSectionDragStart, currentImplantSpec, setImplantEntryXOffsetMm,
		setImplantEntryDepthMm, setImplantAngulationDeg, setHoveredImplantPart,
	} = params;

	if (isDraggingWL) { applyWindowLevelDrag(e, windowWidth, windowLevel, setWindowWidth, setWindowLevel); return; }
	if (isPanning) { applyPanDrag(e, "cross_section", setTransforms); return; }
	if (isDraggingZoom) { applyZoomDrag(e, "cross_section", hasDraggedZoomRef, setTransforms); return; }

	if (!activeCrossSection || !crossSectionCanvasRef.current) return;
	const canvas = crossSectionCanvasRef.current;
	const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
	const pt = getCrossPointerMm(pointerPx, canvas.width);

	if (activeRuler && activeRuler.plane === "cross_section") {
		setActiveRuler((prev) => (prev ? { ...prev, currentMm: pt } : null));
		return;
	}
	if (draggingMeasurementHandle && draggingMeasurementHandle.plane === "cross_section") {
		updateCrossSectionMeasurementDrag(draggingMeasurementHandle, pt, setRulers, setAngles);
		return;
	}

	const currentTransform = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
	const hHit = hitTestCrossSectionHandles(pointerPx, rulers, angles, activeCrossSection, currentTransform, canvas.width);
	setHoveredMeasurementHandle(hHit ? { plane: "cross_section", id: hHit.id, handleIndex: hHit.handleIndex } : null);

	if (studioMode === "implant") {
		if (dragImplantPart && crossSectionDragStart) {
			const deltaPx = { x: pointerPx.x - crossSectionDragStart.x, y: pointerPx.y - crossSectionDragStart.y };
			calculateImplantDragDelta(dragImplantPart, deltaPx, currentImplantSpec, setImplantEntryXOffsetMm, setImplantEntryDepthMm, setImplantAngulationDeg);
			setCrossSectionDragStart(pointerPx);
		} else {
			const hovered = hitTestImplantPart(pointerPx, currentImplantSpec, canvas.width, canvas.height);
			setHoveredImplantPart(hovered);
		}
	}
}
