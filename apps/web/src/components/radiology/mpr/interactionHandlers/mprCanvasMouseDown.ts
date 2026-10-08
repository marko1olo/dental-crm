import type React from "react";
import type { MprPlane } from "../../cbctMprMath";
import {
	DEFAULT_VIEWPORT_TRANSFORM,
	getCanvasPointerPos,
} from "../../cbctMprMath";
import { notifyCbctSliceInteraction } from "../cbctAdaptiveSlicePipeline";
import { handleCrosshairAndRotationMouseDown } from "./crosshairRotationHandlers";
import { handleDentalArchMouseDownHit } from "./dentalArchInteractionHandlers";
import {
	handleMeasurementCreationMouseDown,
	handleMeasurementMouseDownHits,
} from "./measurementInteractionHandlers";
import { handleNerveMouseDown } from "./nerveInteractionHandlers";
import { handlePanZoomMouseDown } from "./panZoomHandlers";
import type { MprCanvasEventContext } from "./types";

/**
 * Dispatches mousedown events on MPR canvas (window/level drag, measurements, pan/zoom, nerve, dental arch, crosshairs).
 */
export function handleMprCanvasMouseDown(
	ctx: MprCanvasEventContext,
	plane: MprPlane,
	e: React.MouseEvent<HTMLCanvasElement>,
): void {
	const {
		volume,
		activeTool,
		studioMode,
		windowWidth,
		windowLevel,
		transforms,
		setTransforms,
		crosshairMm,
		setCrosshairMm,
		obliqueAngles,
		rulers,
		setRulers,
		angles,
		setAngles,
		probeMarkers,
		setProbeMarkers,
		activeRuler,
		setActiveRuler,
		activeAngle,
		setActiveAngle,
		activeProbe,
		setActiveProbe,
		setSelectedMeasurement,
		setDraggingMeasurementHandle,
		nervePoints,
		setNervePoints,
		setSelectedNerveNodeIdx,
		setIsDraggingNerveNode,
		showDentalArch,
		archCurve,
		setIsDraggingArchAnchor,
		setIsDraggingWL,
		setIsPanning,
		setIsDraggingZoom,
		hasDraggedZoomRef,
		setIsShiftRotating,
		setActiveRotationHandle,
		setIsDraggingCrosshair,
	} = ctx;

	if (!volume) return;
	notifyCbctSliceInteraction();
	if (e.button === 2 || activeTool === "window_level") {
		e.preventDefault();
		setIsDraggingWL({
			startX: e.clientX,
			startY: e.clientY,
			startWW: windowWidth,
			startWL: windowLevel,
		});
		return;
	}

	const canvas = e.currentTarget;
	const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
	const pointerPx = { x, y };
	const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;

	const measurementCtx = {
		volume,
		plane,
		canvas,
		pointerPx,
		currentTransform,
		crosshairMm,
		obliqueAngles,
		rulers,
		setRulers,
		angles,
		setAngles,
		probeMarkers,
		setProbeMarkers,
		activeRuler,
		setActiveRuler,
		activeAngle,
		setActiveAngle,
		activeProbe,
		setActiveProbe,
		setSelectedMeasurement,
		setDraggingMeasurementHandle,
	};

	if (handleMeasurementMouseDownHits(measurementCtx)) {
		return;
	}

	if (
		handlePanZoomMouseDown({
			plane,
			e,
			activeTool,
			currentTransform,
			setIsPanning,
			setIsDraggingZoom,
			setTransforms,
			hasDraggedZoomRef,
		})
	) {
		return;
	}

	if (handleMeasurementCreationMouseDown(activeTool, measurementCtx)) {
		return;
	}

	if (activeTool === "nerve") {
		handleNerveMouseDown({
			volume,
			plane,
			canvas,
			pointerPx,
			currentTransform,
			crosshairMm,
			obliqueAngles,
			nervePoints,
			setNervePoints,
			setSelectedNerveNodeIdx,
			setIsDraggingNerveNode,
		});
		return;
	}

	if (
		handleDentalArchMouseDownHit({
			plane,
			showDentalArch,
			archCurve,
			studioMode,
			pointerPx,
			volume,
			axialTransform: transforms.axial,
			crosshairZ: crosshairMm.z,
			setIsDraggingArchAnchor,
		})
	) {
		return;
	}

	handleCrosshairAndRotationMouseDown({
		plane,
		canvas,
		pointerPx,
		currentTransform,
		crosshairMm,
		obliqueAngles,
		volume,
		activeTool,
		isShiftKey: e.shiftKey,
		setIsShiftRotating,
		setActiveRotationHandle,
		setIsDraggingCrosshair,
		setCrosshairMm,
	});
}
