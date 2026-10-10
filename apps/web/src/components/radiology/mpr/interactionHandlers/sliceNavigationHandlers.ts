import type React from "react";
import type { CbctToolMode } from "../../CbctLeftToolDock";
import type {
	CbctViewportType,
	CbctVoxelVolume,
	ObliqueRotationAngles,
	Point2D,
	Point3D,
	ViewportTransform,
} from "../../cbctMprMath";
import {
	DEFAULT_VIEWPORT_TRANSFORM,
	applyCursorZoom,
	clampCoordinateToVolume,
} from "../../cbctMprMath";
import {
	DEFAULT_OBLIQUE_ROTATION,
	computeObliquePlaneBasis,
} from "../../cbctObliqueMatrixMath";
import { calculateQuantizedWheelDelta } from "../../cbctObliqueMath";
import type {
	CrossSectionSliceData,
	DentalArchCurve,
} from "../../dentalCurveEngine";
import { findCrossSectionAndPositionByFdi } from "../../dentalCurveEngine";
import {
	WHEEL_QUANTIZE_INTERVAL,
	WHEEL_STEP_NORMAL,
	WHEEL_STEP_SHIFT,
	ZOOM_MAX_LIMIT,
	ZOOM_MIN_LIMIT,
} from "./constants";

/**
 * Layer 1: Slice Navigation and Wheel Processing Handlers.
 * Handles tooth jumping, cross-section indexing, and oblique MPR slice advancement.
 */

export interface ToothNavigationResult {
	switchedJaw?: "mandible" | "maxilla";
	target?: {
		crossSectionIdx: number;
		positionMm: Point3D;
		nearestToothFdi: number;
	};
}

/**
 * Calculates navigation target for selected tooth by FDI code.
 * Checks jaw mismatch (maxilla vs mandible) and cross-section mapping.
 */
export function calculateToothNavigationTarget(
	toothFdi: number | string,
	crossSections: CrossSectionSliceData[],
	archCurve: DentalArchCurve,
	currentZ: number,
	jawType?: "mandible" | "maxilla",
): ToothNavigationResult {
	const num =
		typeof toothFdi === "number"
			? toothFdi
			: Number.parseInt(String(toothFdi), 10);
	const isMaxilla = (num >= 11 && num <= 18) || (num >= 21 && num <= 28);
	const isMandible = (num >= 31 && num <= 38) || (num >= 41 && num <= 48);

	if (isMaxilla && jawType === "mandible") {
		return { switchedJaw: "maxilla" };
	}
	if (isMandible && jawType === "maxilla") {
		return { switchedJaw: "mandible" };
	}

	const targetZ =
		archCurve.planeZMm !== undefined ? archCurve.planeZMm : currentZ;
	const res = findCrossSectionAndPositionByFdi(
		toothFdi,
		crossSections,
		archCurve,
		targetZ,
	);
	if (res.found) {
		return {
			target: {
				crossSectionIdx: res.crossSectionIdx,
				positionMm: res.positionMm,
				nearestToothFdi: typeof res.nearestToothFdi === "number" ? res.nearestToothFdi : (Number.parseInt(String(res.nearestToothFdi), 10) || num),
			},
		};
	}
	return {};
}

/**
 * Advances crosshairs along the oblique slice plane normal.
 * Adheres to Romexis 6.x and Ez3D-i clinical standards.
 */
export function calculateMprWheelAdvance(
	viewport: "axial" | "coronal" | "sagittal",
	currentCrosshair: Point3D,
	steps: number,
	volume: CbctVoxelVolume,
	obliqueAngles: ObliqueRotationAngles,
): Point3D {
	const basis = computeObliquePlaneBasis(
		viewport,
		currentCrosshair,
		obliqueAngles ?? DEFAULT_OBLIQUE_ROTATION,
	);
	const normal = basis.normal;

	const baseSpacingMm =
		viewport === "axial"
			? volume.spacingMm.z
			: viewport === "coronal"
				? volume.spacingMm.y
				: volume.spacingMm.x;
	const stepMm = baseSpacingMm * steps;

	const nx = currentCrosshair.x + normal.x * stepMm;
	const ny = currentCrosshair.y + normal.y * stepMm;
	const nz = currentCrosshair.z + normal.z * stepMm;

	return clampCoordinateToVolume({ x: nx, y: ny, z: nz }, volume);
}

/**
 * Calculates new cross-section index and corresponding center point coordinates.
 */
export function calculateCrossSectionWheelStep(
	currentIdx: number,
	steps: number,
	crossSections: CrossSectionSliceData[],
	currentZ: number,
): { nextIdx: number; newCrosshairMm: Point3D | null } {
	if (crossSections.length === 0) {
		return { nextIdx: currentIdx, newCrosshairMm: null };
	}
	const nextIdx = Math.max(
		0,
		Math.min(crossSections.length - 1, currentIdx + steps),
	);
	const cs = crossSections[nextIdx];
	if (!cs) {
		return { nextIdx, newCrosshairMm: null };
	}
	return {
		nextIdx,
		newCrosshairMm: {
			x: cs.centerPointMm.x,
			y: cs.centerPointMm.y,
			z: currentZ,
		},
	};
}

/**
 * Handles mouse wheel events on canvas: cursor zoom or quantized slice stepping.
 */
export function handleCanvasWheelSliceNavigation(params: {
	viewport: CbctViewportType;
	deltaY: number;
	activeTool: CbctToolMode;
	pointerPx: Point2D;
	isCtrlOrMeta: boolean;
	isShiftKey: boolean;
	transforms: Record<CbctViewportType, ViewportTransform>;
	setTransforms: React.Dispatch<
		React.SetStateAction<Record<CbctViewportType, ViewportTransform>>
	>;
	wheelAccumulatorsRef: React.MutableRefObject<
		Partial<Record<CbctViewportType, number>>
	>;
	rafWheelIdRef: React.MutableRefObject<number | null>;
	latestShiftKeyRef: React.MutableRefObject<boolean>;
	crossSections: CrossSectionSliceData[];
	volume: CbctVoxelVolume | null;
	obliqueAngles: ObliqueRotationAngles;
	crosshairZ: number;
	setActiveCrossSectionIdx: React.Dispatch<React.SetStateAction<number>>;
	setCrosshairMm: React.Dispatch<React.SetStateAction<Point3D>>;
}): void {
	const {
		viewport,
		deltaY,
		activeTool,
		pointerPx,
		isCtrlOrMeta,
		isShiftKey,
		setTransforms,
		wheelAccumulatorsRef,
		rafWheelIdRef,
		latestShiftKeyRef,
		crossSections,
		volume,
		obliqueAngles,
		crosshairZ,
		setActiveCrossSectionIdx,
		setCrosshairMm,
	} = params;

	const isZoom = isCtrlOrMeta || activeTool === "zoom";
	if (isZoom) {
		setTransforms((prev) => ({
			...prev,
			[viewport]: applyCursorZoom(
				prev[viewport] ?? DEFAULT_VIEWPORT_TRANSFORM,
				pointerPx,
				deltaY,
				ZOOM_MIN_LIMIT,
				ZOOM_MAX_LIMIT,
			),
		}));
		return;
	}

	latestShiftKeyRef.current = isShiftKey;
	wheelAccumulatorsRef.current[viewport] =
		(wheelAccumulatorsRef.current[viewport] ?? 0) + deltaY;

	if (rafWheelIdRef.current === null) {
		rafWheelIdRef.current = requestAnimationFrame(() => {
			rafWheelIdRef.current = null;
			const accum = wheelAccumulatorsRef.current;
			const shift = latestShiftKeyRef.current;
			const step = shift ? WHEEL_STEP_SHIFT : WHEEL_STEP_NORMAL;

			for (const vpKey of Object.keys(accum) as CbctViewportType[]) {
				const accumDeltaY = accum[vpKey];
				if (accumDeltaY === undefined || accumDeltaY === 0) continue;

				const { steps, remainder } = calculateQuantizedWheelDelta(
					accumDeltaY,
					WHEEL_QUANTIZE_INTERVAL,
					step,
				);
				accum[vpKey] = remainder;

				if (steps === 0) continue;

				if (vpKey === "cross_section" || vpKey === "panoramic") {
					if (crossSections.length > 0) {
						setActiveCrossSectionIdx((prev) => {
							const { nextIdx, newCrosshairMm } =
								calculateCrossSectionWheelStep(
									prev,
									steps,
									crossSections,
									crosshairZ,
								);
							if (newCrosshairMm) {
								setCrosshairMm((curr) => ({
									...newCrosshairMm,
									z: curr.z,
								}));
							}
							return nextIdx;
						});
					}
				} else if (volume) {
					setCrosshairMm((prev) => {
						const isMpr =
							vpKey === "axial" ||
							vpKey === "coronal" ||
							vpKey === "sagittal";
						if (!isMpr) return prev;

						return calculateMprWheelAdvance(
							vpKey,
							prev,
							steps,
							volume,
							obliqueAngles,
						);
					});
				}
			}
		});
	}
}
