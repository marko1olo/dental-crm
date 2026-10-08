import type React from "react";
import { useCallback } from "react";
import type {
	CbctViewportType,
	MprPlane,
} from "../../cbctMprMath";
import {
	getCanvasPointerPos,
	hitTestCrosshairCenter,
	resetPlaneObliqueAngle,
	worldMmToSlicePx,
} from "../../cbctMprMath";
import { updateDentalArchAnchorPosition } from "../../dentalCurveEngine";
import { notifyCbctSliceInteraction } from "../cbctAdaptiveSlicePipeline";
import { CROSSHAIR_CENTER_HIT_RADIUS } from "./constants";
import { resolveCanvasCursor } from "./crosshairRotationHandlers";
import { handleActiveRulerMouseUp } from "./measurementInteractionHandlers";
import { handleMprCanvasMouseDown } from "./mprCanvasMouseDown";
import { handleMprCanvasMouseMove } from "./mprCanvasMouseMove";
import { handleZoomSingleClickMouseUp } from "./panZoomHandlers";
import { handleCanvasWheelSliceNavigation } from "./sliceNavigationHandlers";
import type { MprCanvasEventContext } from "./types";

/**
 * Hook providing canvas event listeners for MPR interaction (mousedown, mousemove, mouseup, doubleclick, cursor, wheel).
 */
export function useMprCanvasEventHandlers(ctx: MprCanvasEventContext) {
	const {
		volume,
		crosshairMm,
		setCrosshairMm,
		obliqueAngles,
		setObliqueAngles,
		activeTool,
		transforms,
		setTransforms,
		setRulers,
		activeRuler,
		setActiveRuler,
		setSelectedMeasurement,
		hoveredMeasurementHandle,
		setHoveredMeasurementHandle,
		draggingMeasurementHandle,
		setDraggingMeasurementHandle,
		setArchCurve,
		crossSections,
		setActiveCrossSectionIdx,
		handleToggleMaximize,
		isDraggingCrosshair,
		setIsDraggingCrosshair,
		activeRotationHandle,
		setActiveRotationHandle,
		hoveredHandle,
		isShiftRotating,
		setIsShiftRotating,
		isPanning,
		setIsPanning,
		isDraggingZoom,
		setIsDraggingZoom,
		isDraggingWL,
		setIsDraggingWL,
		isDraggingArchAnchor,
		setIsDraggingArchAnchor,
		hoveredArchAnchorIdx,
		isDraggingNerveNode,
		setIsDraggingNerveNode,
		rafCrosshairIdRef,
		rafObliqueIdRef,
		pendingArchAnchorMmRef,
		rafArchAnchorIdRef,
		hasDraggedZoomRef,
		wheelAccumulatorsRef,
		rafWheelIdRef,
		latestShiftKeyRef,
	} = ctx;

	const handleCanvasMouseDown = useCallback(
		(plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
			handleMprCanvasMouseDown(ctx, plane, e);
		},
		[ctx],
	);

	const handleCanvasMouseMove = useCallback(
		(plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
			handleMprCanvasMouseMove(ctx, plane, e);
		},
		[ctx],
	);

	const handleCanvasMouseUp = useCallback(() => {
		if (rafCrosshairIdRef.current !== null) {
			cancelAnimationFrame(rafCrosshairIdRef.current);
			rafCrosshairIdRef.current = null;
		}
		if (rafObliqueIdRef.current !== null) {
			cancelAnimationFrame(rafObliqueIdRef.current);
			rafObliqueIdRef.current = null;
		}
		if (rafArchAnchorIdRef.current !== null) {
			cancelAnimationFrame(rafArchAnchorIdRef.current);
			rafArchAnchorIdRef.current = null;
		}
		if (pendingArchAnchorMmRef.current) {
			const { index, positionMm } = pendingArchAnchorMmRef.current;
			setArchCurve((prev) =>
				updateDentalArchAnchorPosition(prev, index, positionMm),
			);
			pendingArchAnchorMmRef.current = null;
		}
		setIsDraggingArchAnchor(null);

		handleActiveRulerMouseUp(
			activeRuler,
			setRulers,
			setSelectedMeasurement,
			setActiveRuler,
		);

		handleZoomSingleClickMouseUp({
			isDraggingZoom,
			hasDraggedZoom: hasDraggedZoomRef.current,
			transforms,
			setTransforms,
		});

		setIsDraggingCrosshair(null);
		setActiveRotationHandle(null);
		setIsShiftRotating(null);
		setIsPanning(null);
		setIsDraggingZoom(null);
		setIsDraggingWL(null);
		setIsDraggingNerveNode(null);
		if (draggingMeasurementHandle) setDraggingMeasurementHandle(null);
		if (hoveredMeasurementHandle) setHoveredMeasurementHandle(null);
		hasDraggedZoomRef.current = false;
	}, [
		activeRuler,
		draggingMeasurementHandle,
		hoveredMeasurementHandle,
		isDraggingZoom,
		transforms,
		setArchCurve,
		setRulers,
		setSelectedMeasurement,
		setActiveRuler,
		setTransforms,
		setDraggingMeasurementHandle,
		setHoveredMeasurementHandle,
		setIsDraggingArchAnchor,
		setIsDraggingCrosshair,
		setActiveRotationHandle,
		setIsShiftRotating,
		setIsPanning,
		setIsDraggingZoom,
		setIsDraggingWL,
		setIsDraggingNerveNode,
		hasDraggedZoomRef,
		pendingArchAnchorMmRef,
		rafArchAnchorIdRef,
		rafCrosshairIdRef,
		rafObliqueIdRef,
	]);

	const handleCanvasDoubleClick = useCallback(
		(plane: MprPlane, e: React.MouseEvent<HTMLCanvasElement>) => {
			e.preventDefault();
			e.stopPropagation();
			if (!volume) {
				handleToggleMaximize(plane);
				return;
			}
			const canvas = e.currentTarget;
			const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);
			const centerPx = worldMmToSlicePx(crosshairMm, plane, volume);
			if (hitTestCrosshairCenter({ x, y }, centerPx, CROSSHAIR_CENTER_HIT_RADIUS)) {
				setObliqueAngles((prev) => resetPlaneObliqueAngle(prev, plane));
				return;
			}
			handleToggleMaximize(plane);
		},
		[volume, crosshairMm, handleToggleMaximize, setObliqueAngles],
	);

	const getCanvasCursor = useCallback(
		(plane: MprPlane) => {
			return resolveCanvasCursor({
				plane,
				isDraggingNerveNode,
				isDraggingArchAnchor,
				hoveredArchAnchorIdx,
				draggingMeasurementHandle,
				hoveredMeasurementHandlePlane: hoveredMeasurementHandle?.plane,
				isShiftRotatingPlane: isShiftRotating?.plane,
				activeRotationHandlePlane: activeRotationHandle?.plane,
				hoveredHandlePlane: hoveredHandle?.plane,
				isDraggingWL,
				isPanningPlane: isPanning?.plane,
				isDraggingZoomPlane: isDraggingZoom?.plane,
				activeTool,
			});
		},
		[
			isDraggingNerveNode,
			isDraggingArchAnchor,
			hoveredArchAnchorIdx,
			draggingMeasurementHandle,
			hoveredMeasurementHandle,
			isShiftRotating,
			activeRotationHandle,
			hoveredHandle,
			isDraggingWL,
			isPanning,
			isDraggingZoom,
			activeTool,
		],
	);

	const handleCanvasWheel = useCallback(
		(viewport: CbctViewportType, e: React.WheelEvent<HTMLCanvasElement>) => {
			e.preventDefault();
			notifyCbctSliceInteraction();
			const canvas = e.currentTarget;
			const { x, y } = getCanvasPointerPos(canvas, e.clientX, e.clientY);

			handleCanvasWheelSliceNavigation({
				viewport,
				deltaY: e.deltaY,
				activeTool,
				pointerPx: { x, y },
				isCtrlOrMeta: e.ctrlKey || e.metaKey,
				isShiftKey: e.shiftKey,
				transforms,
				setTransforms,
				wheelAccumulatorsRef,
				rafWheelIdRef,
				latestShiftKeyRef,
				crossSections,
				volume,
				obliqueAngles,
				crosshairZ: crosshairMm.z,
				setActiveCrossSectionIdx,
				setCrosshairMm,
			});
		},
		[
			activeTool,
			crossSections,
			volume,
			obliqueAngles,
			crosshairMm.z,
			transforms,
			setTransforms,
			setActiveCrossSectionIdx,
			setCrosshairMm,
			wheelAccumulatorsRef,
			rafWheelIdRef,
			latestShiftKeyRef,
		],
	);

	return {
		handleCanvasMouseDown,
		handleCanvasMouseMove,
		handleCanvasMouseUp,
		handleCanvasDoubleClick,
		getCanvasCursor,
		handleCanvasWheel,
	};
}
