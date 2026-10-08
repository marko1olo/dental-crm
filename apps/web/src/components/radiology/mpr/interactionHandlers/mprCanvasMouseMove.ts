import type React from "react";
import type { MprPlane } from "../../cbctMprMath";
import {
	DEFAULT_VIEWPORT_TRANSFORM,
	getCanvasPointerPos,
	hitTestMeasurementHandle,
} from "../../cbctMprMath";
import { notifyCbctSliceInteraction } from "../cbctAdaptiveSlicePipeline";
import { projectMeasurementsToSlice } from "../cbctInteractionHelpers";
import { MEASUREMENT_HANDLE_HIT_RADIUS } from "./constants";
import {
	handleCrosshairAndRotationMouseMove,
	handleRotationHandleHover,
} from "./crosshairRotationHandlers";
import {
	handleDentalArchDragMouseMove,
	handleDentalArchHoverMouseMove,
} from "./dentalArchInteractionHandlers";
import { handleMeasurementMouseMove } from "./measurementInteractionHandlers";
import { handleNerveNodeDragMouseMove } from "./nerveInteractionHandlers";
import { handlePanZoomMouseMove } from "./panZoomHandlers";
import type { MprCanvasEventContext } from "./types";
import { calculateWindowLevelDrag } from "./windowLevelHandlers";

/**
 * Dispatches mousemove events on MPR canvas (dragging and hover state updates).
 */
export function handleMprCanvasMouseMove(
	ctx: MprCanvasEventContext,
	plane: MprPlane,
	e: React.MouseEvent<HTMLCanvasElement>,
): void {
	const {
		volume,
		isDraggingCrosshair,
		activeRotationHandle,
		isShiftRotating,
		isPanning,
		isDraggingZoom,
		isDraggingArchAnchor,
		isDraggingNerveNode,
		transforms,
		crosshairMm,
		obliqueAngles,
		draggingMeasurementHandle,
		isDraggingWL,
		activeTool,
		studioMode,
		hoveredHandle,
		showDentalArch,
		archCurve,
		hoveredArchAnchorIdx,
		rulers,
		angles,
		probeMarkers,
		hoveredMeasurementHandle,
		setArchCurve,
		setRulers,
		setAngles,
		setActiveProbe,
		setWindowWidth,
		setWindowLevel,
		setTransforms,
		setActiveRuler,
		setActiveAngle,
		setObliqueAngles,
		setCrosshairMm,
		setHoveredArchAnchorIdx,
		setHoveredMeasurementHandle,
		setNervePoints,
		setSelectedMeasurement,
		setDraggingMeasurementHandle,
		hasDraggedZoomRef,
		pendingArchAnchorMmRef,
		rafArchAnchorIdRef,
		activeRuler,
		activeAngle,
		activeProbe,
		setProbeMarkers,
		setHoveredHandle,
	} = ctx;

	if (!volume) return;
	if (
		isDraggingCrosshair !== null ||
		activeRotationHandle !== null ||
		isShiftRotating !== null ||
		isPanning !== null ||
		isDraggingZoom !== null ||
		isDraggingArchAnchor !== null ||
		isDraggingNerveNode !== null
	) {
		notifyCbctSliceInteraction();
	}
	const canvas = e.currentTarget;
	const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
	const pointerPx = { x, y };
	const currentTransform = transforms[plane] ?? DEFAULT_VIEWPORT_TRANSFORM;

	if (isDraggingNerveNode !== null) {
		handleNerveNodeDragMouseMove(
			isDraggingNerveNode,
			plane,
			canvas,
			pointerPx,
			currentTransform,
			crosshairMm,
			obliqueAngles,
			volume,
			setNervePoints,
		);
		return;
	}

	if (isDraggingArchAnchor !== null && plane === "axial") {
		handleDentalArchDragMouseMove(
			isDraggingArchAnchor,
			canvas,
			pointerPx,
			crosshairMm,
			obliqueAngles,
			transforms.axial,
			volume,
			pendingArchAnchorMmRef,
			rafArchAnchorIdRef,
			setArchCurve,
		);
		return;
	}

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

	if (
		handleMeasurementMouseMove(
			draggingMeasurementHandle,
			activeTool,
			measurementCtx,
		)
	) {
		return;
	}

	if (isDraggingWL) {
		const { nextWW, nextWL } = calculateWindowLevelDrag(
			isDraggingWL,
			e.clientX,
			e.clientY,
		);
		setWindowWidth(nextWW);
		setWindowLevel(nextWL);
		return;
	}

	if (
		handlePanZoomMouseMove({
			plane,
			clientX: e.clientX,
			clientY: e.clientY,
			isPanning,
			isDraggingZoom,
			setTransforms,
			hasDraggedZoomRef,
		})
	) {
		return;
	}

	if (
		handleCrosshairAndRotationMouseMove({
			plane,
			canvas,
			pointerPx,
			currentTransform,
			crosshairMm,
			obliqueAngles,
			volume,
			isShiftRotating,
			activeRotationHandle,
			isDraggingCrosshair,
			setObliqueAngles,
			setCrosshairMm,
		})
	) {
		return;
	}

	// Hover Detection
	if (
		!isShiftRotating &&
		!activeRotationHandle &&
		!isDraggingCrosshair &&
		isDraggingNerveNode === null &&
		!draggingMeasurementHandle
	) {
		handleRotationHandleHover({
			plane,
			canvas,
			pointerPx,
			currentTransform,
			crosshairMm,
			obliqueAngles,
			volume,
			hoveredHandle,
			setHoveredHandle,
		});

		const { projectedRulers, projectedAngles } = projectMeasurementsToSlice(
			plane,
			volume,
			rulers,
			angles,
			probeMarkers,
		);
		const handleHit = hitTestMeasurementHandle(
			pointerPx,
			projectedRulers,
			projectedAngles,
			MEASUREMENT_HANDLE_HIT_RADIUS,
		);
		if (handleHit)
			setHoveredMeasurementHandle({
				id: handleHit.id,
				handleIndex: handleHit.handleIndex,
				plane,
			});
		else if (hoveredMeasurementHandle?.plane === plane)
			setHoveredMeasurementHandle(null);

		handleDentalArchHoverMouseMove(
			plane,
			showDentalArch,
			archCurve,
			studioMode,
			pointerPx,
			volume,
			transforms.axial,
			crosshairMm.z,
			hoveredArchAnchorIdx,
			setHoveredArchAnchorIdx,
		);
	}
}
