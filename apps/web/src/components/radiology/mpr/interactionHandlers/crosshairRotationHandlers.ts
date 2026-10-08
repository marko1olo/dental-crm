import type React from "react";
import type { CbctToolMode } from "../../CbctLeftToolDock";
import type {
	CbctViewportType,
	CbctVoxelVolume,
	MprPlane,
	ObliqueRotationAngles,
	Point2D,
	Point3D,
	ViewportTransform,
} from "../../cbctMprMath";
import {
	calculateAngleFromHandleDrag,
	calculateAngleFromShiftDrag,
	calculateCrosshairDragWorldMm,
	getRotationHandles,
	hitTestRotationHandle,
	slicePxToScreenPx,
	worldMmToSlicePx,
} from "../../cbctMprMath";
import { ROTATE_CURSOR } from "../cbctStudioTypes";
import {
	ROTATION_HANDLE_DISTANCE_PX,
	ROTATION_HANDLE_HIT_RADIUS,
} from "./constants";
import type {
	ActiveRotationHandleState,
	HoveredHandleState,
	ShiftRotatingState,
} from "./types";

/**
 * Layer 2: Crosshair and Rotation Interaction Handlers.
 * Handles oblique axis angle calculation, crosshair center hit-testing, and dynamic cursor resolution.
 */

export interface CursorResolutionParams {
	plane: MprPlane;
	isDraggingNerveNode: number | null;
	isDraggingArchAnchor: number | null;
	hoveredArchAnchorIdx: number | null;
	draggingMeasurementHandle: unknown;
	hoveredMeasurementHandlePlane?: MprPlane;
	isShiftRotatingPlane?: MprPlane;
	activeRotationHandlePlane?: MprPlane;
	hoveredHandlePlane?: MprPlane;
	isDraggingWL: unknown;
	isPanningPlane?: CbctViewportType;
	isDraggingZoomPlane?: CbctViewportType;
	activeTool: CbctToolMode;
}

/**
 * Determines appropriate CSS cursor for canvas based on active dragging and hover states.
 */
export function resolveCanvasCursor(params: CursorResolutionParams): string {
	const {
		plane,
		isDraggingNerveNode,
		isDraggingArchAnchor,
		hoveredArchAnchorIdx,
		draggingMeasurementHandle,
		hoveredMeasurementHandlePlane,
		isShiftRotatingPlane,
		activeRotationHandlePlane,
		hoveredHandlePlane,
		isDraggingWL,
		isPanningPlane,
		isDraggingZoomPlane,
		activeTool,
	} = params;

	if (isDraggingNerveNode !== null) return "grabbing";
	if (isDraggingArchAnchor !== null && plane === "axial") return "grabbing";
	if (hoveredArchAnchorIdx !== null && plane === "axial") return "pointer";
	if (draggingMeasurementHandle) return "grabbing";
	if (hoveredMeasurementHandlePlane === plane) return "grab";
	if (isShiftRotatingPlane === plane || activeRotationHandlePlane === plane)
		return ROTATE_CURSOR;
	if (hoveredHandlePlane === plane) return ROTATE_CURSOR;
	if (isDraggingWL) return "move";
	if (isPanningPlane === plane) return "grabbing";
	if (isDraggingZoomPlane === plane) return "ns-resize";
	if (activeTool === "pan") return "grab";
	if (activeTool === "zoom") return "zoom-in";
	if (activeTool === "window_level") return "col-resize";
	if (activeTool === "rotate") return ROTATE_CURSOR;
	return "crosshair";
}

/**
 * Creates an updated ObliqueRotationAngles object with the new plane angle applied.
 */
export function applyPlaneRotationAngle(
	prev: ObliqueRotationAngles,
	plane: MprPlane,
	newAngle: number,
): ObliqueRotationAngles {
	return {
		...prev,
		...(plane === "axial"
			? { axialAngleDeg: newAngle }
			: plane === "coronal"
				? { coronalTiltDeg: newAngle }
				: { sagittalTiltDeg: newAngle }),
	};
}

/**
 * Handles shift rotate, rotation handles hit test, and crosshair drag start on mouse down.
 */
export function handleCrosshairAndRotationMouseDown(params: {
	plane: MprPlane;
	canvas: HTMLCanvasElement;
	pointerPx: Point2D;
	currentTransform: ViewportTransform;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
	volume: CbctVoxelVolume;
	activeTool: CbctToolMode;
	isShiftKey: boolean;
	setIsShiftRotating: (state: ShiftRotatingState | null) => void;
	setActiveRotationHandle: (state: ActiveRotationHandleState | null) => void;
	setIsDraggingCrosshair: (plane: MprPlane | null) => void;
	setCrosshairMm: (pos: Point3D) => void;
}): boolean {
	const {
		plane,
		canvas,
		pointerPx,
		currentTransform,
		crosshairMm,
		obliqueAngles,
		volume,
		activeTool,
		isShiftKey,
		setIsShiftRotating,
		setActiveRotationHandle,
		setIsDraggingCrosshair,
		setCrosshairMm,
	} = params;

	if (isShiftKey || activeTool === "rotate") {
		const centerPx = worldMmToSlicePx(crosshairMm, plane, volume);
		const rotDeg =
			plane === "axial"
				? obliqueAngles.axialAngleDeg
				: plane === "coronal"
					? obliqueAngles.coronalTiltDeg
					: obliqueAngles.sagittalTiltDeg;
		setIsShiftRotating({
			plane,
			centerPx,
			startPointerPx: pointerPx,
			initialAngleDeg: rotDeg,
		});
		return true;
	}

	const centerPx = worldMmToSlicePx(crosshairMm, plane, volume);
	const rotDeg =
		plane === "axial"
			? obliqueAngles.axialAngleDeg
			: plane === "coronal"
				? obliqueAngles.coronalTiltDeg
				: obliqueAngles.sagittalTiltDeg;
	const centerScreen = slicePxToScreenPx(centerPx, currentTransform);
	const handles = getRotationHandles(
		plane,
		canvas.width,
		canvas.height,
		centerScreen,
		ROTATION_HANDLE_DISTANCE_PX,
		rotDeg,
	);
	const hitHandle = hitTestRotationHandle(
		pointerPx,
		handles,
		ROTATION_HANDLE_HIT_RADIUS,
	);
	if (hitHandle) {
		setActiveRotationHandle({
			plane,
			handle: hitHandle.position,
			centerPx: centerScreen,
		});
		return true;
	}

	setIsDraggingCrosshair(plane);
	const newWorldMm = calculateCrosshairDragWorldMm(
		pointerPx,
		{ width: canvas.width, height: canvas.height },
		plane,
		crosshairMm,
		obliqueAngles,
		currentTransform,
		volume,
	);
	setCrosshairMm(newWorldMm);
	return true;
}

/**
 * Handles shift rotate angle update, handle rotate update, and crosshair drag update on mouse move.
 */
export function handleCrosshairAndRotationMouseMove(params: {
	plane: MprPlane;
	canvas: HTMLCanvasElement;
	pointerPx: Point2D;
	currentTransform: ViewportTransform;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
	volume: CbctVoxelVolume;
	isShiftRotating: ShiftRotatingState | null;
	activeRotationHandle: ActiveRotationHandleState | null;
	isDraggingCrosshair: MprPlane | null;
	setObliqueAngles: React.Dispatch<React.SetStateAction<ObliqueRotationAngles>>;
	setCrosshairMm: (pos: Point3D) => void;
}): boolean {
	const {
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
	} = params;

	if (isShiftRotating && isShiftRotating.plane === plane) {
		const newAngle = calculateAngleFromShiftDrag(
			isShiftRotating.centerPx,
			pointerPx,
			isShiftRotating.startPointerPx,
			isShiftRotating.initialAngleDeg,
		);
		setObliqueAngles((prev) => applyPlaneRotationAngle(prev, plane, newAngle));
		return true;
	}

	if (activeRotationHandle && activeRotationHandle.plane === plane) {
		const newAngle = calculateAngleFromHandleDrag(
			activeRotationHandle.centerPx,
			pointerPx,
			activeRotationHandle.handle,
		);
		setObliqueAngles((prev) => applyPlaneRotationAngle(prev, plane, newAngle));
		return true;
	}

	if (isDraggingCrosshair === plane) {
		const newWorldMm = calculateCrosshairDragWorldMm(
			pointerPx,
			{ width: canvas.width, height: canvas.height },
			plane,
			crosshairMm,
			obliqueAngles,
			currentTransform,
			volume,
		);
		setCrosshairMm(newWorldMm);
		return true;
	}

	return false;
}

/**
 * Handles hover detection for rotation handles when not dragging.
 */
export function handleRotationHandleHover(params: {
	plane: MprPlane;
	canvas: HTMLCanvasElement;
	pointerPx: Point2D;
	currentTransform: ViewportTransform;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
	volume: CbctVoxelVolume;
	hoveredHandle: HoveredHandleState | null;
	setHoveredHandle: React.Dispatch<React.SetStateAction<HoveredHandleState | null>>;
}): void {
	const {
		plane,
		canvas,
		pointerPx,
		currentTransform,
		crosshairMm,
		obliqueAngles,
		volume,
		hoveredHandle,
		setHoveredHandle,
	} = params;

	const centerPx = worldMmToSlicePx(crosshairMm, plane, volume);
	const rotDeg =
		plane === "axial"
			? obliqueAngles.axialAngleDeg
			: plane === "coronal"
				? obliqueAngles.coronalTiltDeg
				: obliqueAngles.sagittalTiltDeg;
	const centerScreen = slicePxToScreenPx(centerPx, currentTransform);
	const handles = getRotationHandles(
		plane,
		canvas.width,
		canvas.height,
		centerScreen,
		ROTATION_HANDLE_DISTANCE_PX,
		rotDeg,
	);
	const hitHandle = hitTestRotationHandle(
		pointerPx,
		handles,
		ROTATION_HANDLE_HIT_RADIUS,
	);
	if (hitHandle) setHoveredHandle({ plane, handle: hitHandle.position });
	else if (hoveredHandle?.plane === plane) setHoveredHandle(null);
}
