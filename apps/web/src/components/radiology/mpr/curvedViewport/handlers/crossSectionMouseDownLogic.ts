/**
 * crossSectionMouseDownLogic.ts — Логика события MouseDown в кросс-секции (Мандат 8b).
 */

import type React from "react";
import { showToast } from "../../../../GlobalToast";
import type { CbctAngleMeasurement, CbctMeasurementRuler, Point3D, ViewportTransform } from "../../../cbctMprMath";
import { DEFAULT_VIEWPORT_TRANSFORM, getCanvasPointerPos } from "../../../cbctMprMath";
import type { CrossSectionSliceData } from "../../../dentalCurveEngine";
import { notifyCbctSliceInteraction } from "../../cbctAdaptiveSlicePipeline";
import { calculateCrossSectionNerveWorldPoint, hitTestImplantPart, isImplantResetButtonHit } from "../curveSplineMath";
import type { MeasurementHandleDragDescriptor, UseCbctCurvedViewportHandlersParams } from "../types";
import { handleAngleMeasurementClick, handleCommonNavigationMouseDown, traceMandibularNerveSeedsAsync } from "../viewportInteractionHandlers";
import { hitTestCrossSectionHandles, hitTestCrossSectionObjects } from "./crossSectionHitTesting";

export function executeCrossSectionMouseDown(
	e: React.MouseEvent<HTMLCanvasElement>,
	params: UseCbctCurvedViewportHandlersParams,
	getCrossPointerMm: (pos: { readonly x: number; readonly y: number }, w: number) => Point3D,
): void {
	notifyCbctSliceInteraction();
	const {
		volume, nervePoints, setNervePoints, activeTool, studioMode, windowWidth, windowLevel, transforms,
		setIsDraggingWL, setIsPanning, setIsDraggingZoom, hasDraggedZoomRef, setTransforms, activeCrossSection,
		crossSectionCanvasRef, rulers, setRulers, setActiveRuler, angles, setAngles, activeAngle, setActiveAngle,
		setSelectedMeasurement, setDraggingMeasurementHandle, setDragImplantPart, setCrossSectionDragStart,
		setImplantEntryXOffsetMm, setImplantEntryDepthMm, setImplantAngulationDeg, currentImplantSpec,
	} = params;

	if (handleCommonNavigationMouseDown(e, activeTool, "cross_section", windowWidth, windowLevel, transforms, setIsDraggingWL, setIsPanning, setIsDraggingZoom, hasDraggedZoomRef, setTransforms)) return;

	if (!activeCrossSection || !crossSectionCanvasRef.current) return;
	const canvas = crossSectionCanvasRef.current;
	const pointerPx = getCanvasPointerPos(canvas, e.clientX, e.clientY);
	const pt = getCrossPointerMm(pointerPx, canvas.width);

	if (activeTool === "ruler") {
		setActiveRuler({ id: `ruler-${Date.now()}`, plane: "cross_section", startMm: pt, endMm: pt, currentMm: pt, distanceMm: 0 });
		return;
	}
	if (activeTool === "angle") {
		handleAngleMeasurementClick(activeAngle, pt, "cross_section", setActiveAngle, setAngles, setSelectedMeasurement);
		return;
	}
	if (activeTool === "nerve") {
		const pointMm = calculateCrossSectionNerveWorldPoint(activeCrossSection, pt);
		if (nervePoints.length === 0) {
			setNervePoints([pointMm]);
			showToast("Точка 1 (Кросс-секция): Зафиксирована. Кликните вторую точку для автотрассировки", "info");
			return;
		}
		if (nervePoints.length === 1 && volume) {
			setNervePoints([nervePoints[0]!, pointMm]);
			traceMandibularNerveSeedsAsync(volume, nervePoints[0]!, pointMm, setNervePoints);
			return;
		}
		setNervePoints((prev) => [...prev, pointMm]);
		return;
	}

	const currentTransform = transforms.cross_section ?? DEFAULT_VIEWPORT_TRANSFORM;
	const handleHit = hitTestCrossSectionHandles(pointerPx, rulers, angles, activeCrossSection, currentTransform, canvas.width);
	if (handleHit) {
		setDraggingMeasurementHandle({ type: handleHit.type, id: handleHit.id, handleIndex: handleHit.handleIndex, plane: "cross_section" });
		setSelectedMeasurement({ type: handleHit.type, id: handleHit.id } as unknown as CbctMeasurementRuler);
		return;
	}
	const objectHit = hitTestCrossSectionObjects(pointerPx, rulers, angles, activeCrossSection, currentTransform, canvas.width);
	if (objectHit) {
		if (objectHit.isDeleteButtonHit) {
			if (objectHit.type === "ruler") setRulers((prev) => prev.filter((r) => r.id !== objectHit.id));
			if (objectHit.type === "angle") setAngles((prev) => prev.filter((a) => a.id !== objectHit.id));
			setSelectedMeasurement(null);
			return;
		}
		setSelectedMeasurement({ type: objectHit.type, id: objectHit.id } as unknown as CbctMeasurementRuler);
		return;
	}

	if (studioMode === "implant") {
		if (isImplantResetButtonHit(pointerPx.x, pointerPx.y, canvas.width)) {
			setImplantEntryXOffsetMm(0.0);
			setImplantEntryDepthMm(0.5);
			setImplantAngulationDeg(0.0);
			return;
		}
		const part = hitTestImplantPart(canvas, activeCrossSection, currentImplantSpec, params.implantEntryXOffsetMm, params.implantEntryDepthMm, params.implantAngulationDeg, pointerPx);
		if (part) {
			setDragImplantPart(part);
			setCrossSectionDragStart({
				clientX: e.clientX,
				clientY: e.clientY,
				startX: params.implantEntryXOffsetMm,
				startY: params.implantEntryDepthMm,
				startAng: params.implantAngulationDeg,
			});
		}
	}
}
