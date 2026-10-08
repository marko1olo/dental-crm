/**
 * DENTE CRM — CBCT Curve Spline & Geometry Math
 * Layer 1: Pure mathematical utilities, Catmull-Rom interpolation, coordinate projections, and implant geometry
 * Standards: DICOM Part 3, Planmeca Romexis 6.x, Vatech Ez3D-i
 */

import {
	crossSectionSlicePxToWorldMm,
	panoramicSlicePxToWorldMm,
} from "../../cbctCoordinateMath";
import type {
	Point3D,
	ViewportTransform,
} from "../../cbctMprMath";
import { DEFAULT_VIEWPORT_TRANSFORM } from "../../cbctMprMath";
import type {
	CrossSectionSliceData,
	PanoramicReconstructionResult,
} from "../../dentalCurveEngine";
import {
	pointToSegmentDistance2D,
	type VirtualImplantSpec,
} from "../../implantSafetyEngine";
import { getImplantCrossSectionGeometry } from "../cbctInteractionHelpers";
import {
	DEFAULT_ALVEOLAR_CREST_INSET_MM,
	DEFAULT_CROSS_SECTION_HEIGHT_PX,
	DEFAULT_CROSS_SECTION_WIDTH_PX,
	DEFAULT_PANORAMIC_HEIGHT_PX,
	DEFAULT_PANORAMIC_WIDTH_PX,
	IMPLANT_BODY_HIT_TOLERANCE_PX,
	IMPLANT_HIT_HANDLE_RADIUS_PX,
	IMPLANT_MAX_ANGULATION_DEG,
	IMPLANT_MAX_ENTRY_DEPTH_MM,
	IMPLANT_MAX_ENTRY_X_OFFSET_MM,
	IMPLANT_MIN_ANGULATION_DEG,
	IMPLANT_MIN_ENTRY_DEPTH_MM,
	IMPLANT_MIN_ENTRY_X_OFFSET_MM,
	IMPLANT_MIN_ROTATION_DRAG_HYPOT_PX,
} from "./constants";
import type { ImplantDragState } from "./types";

/**
 * Projects panoramic canvas pixel coordinates into 3D patient world coordinates (mm)
 */
export function getPanoPointerWorldMm(
	pointerPx: { readonly x: number; readonly y: number },
	transform: ViewportTransform | undefined,
	panoramicData: PanoramicReconstructionResult | null | undefined,
	totalArcLengthMm: number,
): Point3D {
	const t = transform ?? DEFAULT_VIEWPORT_TRANSFORM;
	const slicePx = {
		x: (pointerPx.x - t.panX) / t.zoom,
		y: (pointerPx.y - t.panY) / t.zoom,
	};
	return panoramicSlicePxToWorldMm(
		slicePx,
		panoramicData ?? {
			widthPx: DEFAULT_PANORAMIC_WIDTH_PX,
			heightPx: DEFAULT_PANORAMIC_HEIGHT_PX,
		},
		totalArcLengthMm,
	);
}

/**
 * Projects cross-section canvas pixel coordinates into 3D patient world coordinates (mm)
 */
export function getCrossPointerWorldMm(
	pointerPx: { readonly x: number; readonly y: number },
	transform: ViewportTransform | undefined,
	activeCrossSection: CrossSectionSliceData | null | undefined,
	canvasWidth: number,
): Point3D {
	const t = transform ?? DEFAULT_VIEWPORT_TRANSFORM;
	const slicePx = {
		x: (pointerPx.x - t.panX) / t.zoom,
		y: (pointerPx.y - t.panY) / t.zoom,
	};
	return crossSectionSlicePxToWorldMm(
		slicePx,
		activeCrossSection ?? {
			widthPx: DEFAULT_CROSS_SECTION_WIDTH_PX,
			heightPx: DEFAULT_CROSS_SECTION_HEIGHT_PX,
		},
		canvasWidth,
	);
}

/**
 * Calculates true 3D coordinates for mandibular nerve points marked on cross-section slices
 */
export function calculateCrossSectionNerveWorldPoint(
	activeCrossSection: CrossSectionSliceData,
	localMm: Point3D,
): Point3D {
	const crestZ =
		activeCrossSection.centerPointMm.z +
		(activeCrossSection.heightMm / 2.0 - DEFAULT_ALVEOLAR_CREST_INSET_MM);
	return {
		x: Number(
			(
				activeCrossSection.centerPointMm.x +
				activeCrossSection.normalVector2D.x * localMm.x
			).toFixed(2),
		),
		y: Number(
			(
				activeCrossSection.centerPointMm.y +
				activeCrossSection.normalVector2D.y * localMm.x
			).toFixed(2),
		),
		z: Number((crestZ - localMm.z).toFixed(2)),
	};
}

/**
 * Calculates virtual implant angulation in degrees from drag deltas, clamped to safe clinical boundaries
 */
export function calculateImplantAngulationDeg(
	relX: number,
	relY: number,
): number {
	const angleDeg = Math.round((Math.atan2(relX, relY) * 180) / Math.PI);
	return Math.max(
		IMPLANT_MIN_ANGULATION_DEG,
		Math.min(IMPLANT_MAX_ANGULATION_DEG, angleDeg),
	);
}

/**
 * Checks whether pointer is clicking the 'Reset Position' HUD button in cross-section
 */
export function isImplantResetButtonHit(
	x: number,
	y: number,
	canvasWidth: number,
): boolean {
	return (
		x >= canvasWidth - 85 &&
		x <= canvasWidth - 10 &&
		y >= 8 &&
		y <= 30
	);
}

/**
 * Hit tests parts of the virtual implant (entry handle, apex handle, or body cylinder)
 */
export function hitTestImplantPart(
	canvas: HTMLCanvasElement,
	activeCrossSection: CrossSectionSliceData,
	currentImplantSpec: VirtualImplantSpec,
	implantEntryXOffsetMm: number,
	implantEntryDepthMm: number,
	implantAngulationDeg: number,
	pointerPx: { readonly x: number; readonly y: number },
): "entry" | "apex" | "body" | null {
	const { entryPxX, entryPxY, apexPxX, apexPxY, radiusPx } =
		getImplantCrossSectionGeometry(
			canvas,
			activeCrossSection,
			currentImplantSpec,
			implantEntryXOffsetMm,
			implantEntryDepthMm,
			implantAngulationDeg,
		);

	const distToEntry = Math.hypot(pointerPx.x - entryPxX, pointerPx.y - entryPxY);
	const distToApex = Math.hypot(pointerPx.x - apexPxX, pointerPx.y - apexPxY);

	if (distToEntry <= IMPLANT_HIT_HANDLE_RADIUS_PX) {
		return "entry";
	}
	if (distToApex <= IMPLANT_HIT_HANDLE_RADIUS_PX) {
		return "apex";
	}

	const seg = pointToSegmentDistance2D(
		pointerPx,
		{ x: entryPxX, y: entryPxY },
		{ x: apexPxX, y: apexPxY },
	);
	if (seg.distance <= radiusPx + IMPLANT_BODY_HIT_TOLERANCE_PX) {
		return "body";
	}

	return null;
}

/**
 * Calculates updated offset and depth or angulation during implant drag
 */
export function calculateImplantDragDelta(
	dragImplantPart: string,
	crossSectionDragStart: ImplantDragState,
	clientX: number,
	clientY: number,
	pxSpacing: number,
	canvas: HTMLCanvasElement,
	activeCrossSection: CrossSectionSliceData,
	currentImplantSpec: VirtualImplantSpec,
	pointerPx: { readonly x: number; readonly y: number },
): {
	newXOffset?: number;
	newDepth?: number;
	newAngulation?: number;
} {
	if (dragImplantPart === "entry" || dragImplantPart === "body") {
		const dxPx = clientX - crossSectionDragStart.clientX;
		const dyPx = clientY - crossSectionDragStart.clientY;
		const newX = Math.max(
			IMPLANT_MIN_ENTRY_X_OFFSET_MM,
			Math.min(
				IMPLANT_MAX_ENTRY_X_OFFSET_MM,
				crossSectionDragStart.startX + dxPx * pxSpacing,
			),
		);
		const newY = Math.max(
			IMPLANT_MIN_ENTRY_DEPTH_MM,
			Math.min(
				IMPLANT_MAX_ENTRY_DEPTH_MM,
				crossSectionDragStart.startY + dyPx * pxSpacing,
			),
		);
		return {
			newXOffset: Number(newX.toFixed(1)),
			newDepth: Number(newY.toFixed(1)),
		};
	}

	if (dragImplantPart === "apex") {
		const { entryPxX, entryPxY } = getImplantCrossSectionGeometry(
			canvas,
			activeCrossSection,
			currentImplantSpec,
			crossSectionDragStart.startX,
			crossSectionDragStart.startY,
			crossSectionDragStart.startAng,
		);
		const relX = pointerPx.x - entryPxX;
		const relY = pointerPx.y - entryPxY;
		if (Math.hypot(relX, relY) > IMPLANT_MIN_ROTATION_DRAG_HYPOT_PX) {
			const angleDeg = calculateImplantAngulationDeg(relX, relY);
			return { newAngulation: angleDeg };
		}
	}

	return {};
}

/**
 * Catmull-Rom cubic spline interpolation for 2D points along dental arch curve
 */
export function interpolateCatmullRom2D(
	p0: { x: number; y: number },
	p1: { x: number; y: number },
	p2: { x: number; y: number },
	p3: { x: number; y: number },
	t: number,
): { x: number; y: number } {
	const t2 = t * t;
	const t3 = t2 * t;
	const x =
		0.5 *
		(2 * p1.x +
			(-p0.x + p2.x) * t +
			(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
			(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
	const y =
		0.5 *
		(2 * p1.y +
			(-p0.y + p2.y) * t +
			(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
			(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
	return { x, y };
}

/**
 * Computes unit tangent and unit orthogonal normal vectors for curve segments
 */
export function computeCurveNormal2D(
	pA: { x: number; y: number },
	pB: { x: number; y: number },
): { tangent: { x: number; y: number }; normal: { x: number; y: number } } {
	const dx = pB.x - pA.x;
	const dy = pB.y - pA.y;
	const len = Math.hypot(dx, dy) || 1.0;
	const tx = (dx / len) || 0;
	const ty = (dy / len) || 0;
	return {
		tangent: { x: tx, y: ty },
		normal: { x: -ty || 0, y: tx },
	};
}
