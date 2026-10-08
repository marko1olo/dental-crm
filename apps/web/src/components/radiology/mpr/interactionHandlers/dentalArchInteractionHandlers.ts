import type React from "react";
import type {
	CbctVoxelVolume,
	MprPlane,
	ObliqueRotationAngles,
	Point2D,
	Point3D,
	ViewportTransform,
} from "../../cbctMprMath";
import {
	DEFAULT_VIEWPORT_TRANSFORM,
	mapCanvasPointerToWorldMmWithTransform,
} from "../../cbctMprMath";
import type { DentalArchCurve } from "../../dentalCurveEngine";
import {
	hitTestDentalArchControlPoint,
	updateDentalArchAnchorPosition,
} from "../../dentalCurveEngine";
import type { StudioMode } from "../cbctStudioTypes";
import { DENTAL_ARCH_ANCHOR_HIT_RADIUS } from "./constants";

/**
 * Layer 2: Dental Arch Spline Anchor Interaction Handlers.
 */

export interface DentalArchInteractionContext {
	plane: MprPlane;
	showDentalArch: boolean;
	archCurve: DentalArchCurve;
	studioMode: StudioMode;
	pointerPx: Point2D;
	volume: CbctVoxelVolume;
	axialTransform: ViewportTransform;
	crosshairZ: number;
	setIsDraggingArchAnchor: React.Dispatch<React.SetStateAction<number | null>>;
}

/**
 * Hit tests dental arch control point on Axial plane.
 * Returns true if an anchor point was hit and dragging started.
 */
export function handleDentalArchMouseDownHit(
	ctx: DentalArchInteractionContext,
): boolean {
	const {
		plane,
		showDentalArch,
		archCurve,
		studioMode,
		pointerPx,
		volume,
		axialTransform,
		crosshairZ,
		setIsDraggingArchAnchor,
	} = ctx;

	if (
		plane === "axial" &&
		showDentalArch &&
		archCurve &&
		studioMode === "panoramic"
	) {
		const archHit = hitTestDentalArchControlPoint(
			pointerPx,
			archCurve,
			volume,
			axialTransform,
			DENTAL_ARCH_ANCHOR_HIT_RADIUS,
			crosshairZ,
		);
		if (archHit) {
			setIsDraggingArchAnchor(archHit.index);
			return true;
		}
	}
	return false;
}

/**
 * Updates pending anchor drag position and schedules rAF update.
 */
export function handleDentalArchDragMouseMove(
	isDraggingArchAnchor: number,
	canvas: HTMLCanvasElement,
	pointerPx: Point2D,
	crosshairMm: Point3D,
	obliqueAngles: ObliqueRotationAngles,
	axialTransform: ViewportTransform,
	volume: CbctVoxelVolume,
	pendingArchAnchorMmRef: React.MutableRefObject<{
		index: number;
		positionMm: Point2D;
	} | null>,
	rafArchAnchorIdRef: React.MutableRefObject<number | null>,
	setArchCurve: React.Dispatch<React.SetStateAction<DentalArchCurve>>,
): void {
	const currentTransform = axialTransform ?? DEFAULT_VIEWPORT_TRANSFORM;
	const pointMm = mapCanvasPointerToWorldMmWithTransform(
		pointerPx,
		{ width: canvas.width, height: canvas.height },
		"axial",
		crosshairMm,
		obliqueAngles,
		currentTransform,
		volume,
	);
	pendingArchAnchorMmRef.current = {
		index: isDraggingArchAnchor,
		positionMm: { x: pointMm.x, y: pointMm.y },
	};
	if (rafArchAnchorIdRef.current === null) {
		rafArchAnchorIdRef.current = requestAnimationFrame(() => {
			if (pendingArchAnchorMmRef.current) {
				const { index, positionMm } = pendingArchAnchorMmRef.current;
				setArchCurve((prev) =>
					updateDentalArchAnchorPosition(prev, index, positionMm),
				);
			}
			rafArchAnchorIdRef.current = null;
		});
	}
}

/**
 * Updates hovered arch anchor index when mouse moves across Axial canvas.
 */
export function handleDentalArchHoverMouseMove(
	plane: MprPlane,
	showDentalArch: boolean,
	archCurve: DentalArchCurve,
	studioMode: StudioMode,
	pointerPx: Point2D,
	volume: CbctVoxelVolume,
	axialTransform: ViewportTransform,
	crosshairZ: number,
	hoveredArchAnchorIdx: number | null,
	setHoveredArchAnchorIdx: React.Dispatch<React.SetStateAction<number | null>>,
): void {
	if (
		plane === "axial" &&
		showDentalArch &&
		archCurve &&
		studioMode === "panoramic"
	) {
		const archHit = hitTestDentalArchControlPoint(
			pointerPx,
			archCurve,
			volume,
			axialTransform,
			DENTAL_ARCH_ANCHOR_HIT_RADIUS,
			crosshairZ,
		);
		if (archHit) {
			if (hoveredArchAnchorIdx !== archHit.index)
				setHoveredArchAnchorIdx(archHit.index);
		} else if (hoveredArchAnchorIdx !== null) {
			setHoveredArchAnchorIdx(null);
		}
	} else if (hoveredArchAnchorIdx !== null && plane === "axial") {
		setHoveredArchAnchorIdx(null);
	}
}
