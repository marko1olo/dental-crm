/**
 * DENTE CRM — CBCT Dental Arch Spline Fitting & Manipulator Math
 * Decomposed from dentalCurveEngine.ts per Mandate 8b.
 * Standards: DICOM Part 3, Misch CE, Buser
 */

import {
	type CbctVoxelVolume,
	worldMmToSlicePx,
	slicePxToScreenPx,
	worldMmToVoxel,
	type ViewportTransform,
	DEFAULT_VIEWPORT_TRANSFORM,
} from "./cbctMprMath";
import type { Point2D, Point3D } from "./cbctCaliperNerveMath";

export interface DentalArchAnchor {
	readonly id: string;
	readonly toothFdi: string; // e.g. "46", "36", "11", "21"
	readonly labelRu: string;
	readonly positionMm: Point2D; // X (Right-Left) and Y (Anterior-Posterior) in physical mm
	readonly isQuadrantRight: boolean;
	readonly zMm?: number;
}

export interface DentalArchCurve {
	readonly id: string;
	readonly jawType: "mandible" | "maxilla";
	readonly anchors: readonly DentalArchAnchor[];
	readonly splinePointsMm: readonly Point2D[];
	readonly totalArcLengthMm: number;
	readonly focalTroughThicknessMm: number; // 5..20 mm (default 12 mm)
	readonly planeZMm?: number;
}

// ─── DEFAULT ANATOMICAL DENTAL ARCH ANCHORS (ADULT DENTITION) ───────────────

export const DEFAULT_MANDIBULAR_ARCH_ANCHORS: readonly DentalArchAnchor[] = [
	{ id: "a-48", toothFdi: "48", labelRu: "48 (3-й моляр)", positionMm: { x: -37.0, y: -2.0 }, isQuadrantRight: true },
	{ id: "a-47", toothFdi: "47", labelRu: "47 (2-й моляр)", positionMm: { x: -35.0, y: -14.0 }, isQuadrantRight: true },
	{ id: "a-46", toothFdi: "46", labelRu: "46 (1-й моляр)", positionMm: { x: -32.0, y: -26.0 }, isQuadrantRight: true },
	{ id: "a-45", toothFdi: "45", labelRu: "45 (2-й премоляр)", positionMm: { x: -28.0, y: -36.0 }, isQuadrantRight: true },
	{ id: "a-44", toothFdi: "44", labelRu: "44 (1-й премоляр)", positionMm: { x: -23.0, y: -44.0 }, isQuadrantRight: true },
	{ id: "a-43", toothFdi: "43", labelRu: "43 (Клык)", positionMm: { x: -16.5, y: -50.0 }, isQuadrantRight: true },
	{ id: "a-42", toothFdi: "42", labelRu: "42 (Боковой резец)", positionMm: { x: -9.0, y: -54.5 }, isQuadrantRight: true },
	{ id: "a-41", toothFdi: "41", labelRu: "41 (Центральный резец)", positionMm: { x: -2.8, y: -56.5 }, isQuadrantRight: true },
	{ id: "a-31", toothFdi: "31", labelRu: "31 (Центральный резец)", positionMm: { x: 2.8, y: -56.5 }, isQuadrantRight: false },
	{ id: "a-32", toothFdi: "32", labelRu: "32 (Боковой резец)", positionMm: { x: 9.0, y: -54.5 }, isQuadrantRight: false },
	{ id: "a-33", toothFdi: "33", labelRu: "33 (Клык)", positionMm: { x: 16.5, y: -50.0 }, isQuadrantRight: false },
	{ id: "a-34", toothFdi: "34", labelRu: "34 (1-й премоляр)", positionMm: { x: 23.0, y: -44.0 }, isQuadrantRight: false },
	{ id: "a-35", toothFdi: "35", labelRu: "35 (2-й премоляр)", positionMm: { x: 28.0, y: -36.0 }, isQuadrantRight: false },
	{ id: "a-36", toothFdi: "36", labelRu: "36 (1-й моляр)", positionMm: { x: 32.0, y: -26.0 }, isQuadrantRight: false },
	{ id: "a-37", toothFdi: "37", labelRu: "37 (2-й моляр)", positionMm: { x: 35.0, y: -14.0 }, isQuadrantRight: false },
	{ id: "a-38", toothFdi: "38", labelRu: "38 (3-й моляр)", positionMm: { x: 37.0, y: -2.0 }, isQuadrantRight: false },
];

export const DEFAULT_MAXILLARY_ARCH_ANCHORS: readonly DentalArchAnchor[] = [
	{ id: "a-18", toothFdi: "18", labelRu: "18 (3-й моляр)", positionMm: { x: -38.0, y: -3.0 }, isQuadrantRight: true },
	{ id: "a-17", toothFdi: "17", labelRu: "17 (2-й моляр)", positionMm: { x: -36.0, y: -15.0 }, isQuadrantRight: true },
	{ id: "a-16", toothFdi: "16", labelRu: "16 (1-й моляр)", positionMm: { x: -33.5, y: -27.0 }, isQuadrantRight: true },
	{ id: "a-15", toothFdi: "15", labelRu: "15 (2-й премоляр)", positionMm: { x: -29.5, y: -37.0 }, isQuadrantRight: true },
	{ id: "a-14", toothFdi: "14", labelRu: "14 (1-й премоляр)", positionMm: { x: -24.5, y: -45.0 }, isQuadrantRight: true },
	{ id: "a-13", toothFdi: "13", labelRu: "13 (Клык)", positionMm: { x: -18.0, y: -51.5 }, isQuadrantRight: true },
	{ id: "a-12", toothFdi: "12", labelRu: "12 (Боковой резец)", positionMm: { x: -10.0, y: -56.0 }, isQuadrantRight: true },
	{ id: "a-11", toothFdi: "11", labelRu: "11 (Центральный резец)", positionMm: { x: -3.2, y: -58.0 }, isQuadrantRight: true },
	{ id: "a-21", toothFdi: "21", labelRu: "21 (Центральный резец)", positionMm: { x: 3.2, y: -58.0 }, isQuadrantRight: false },
	{ id: "a-22", toothFdi: "22", labelRu: "22 (Боковой резец)", positionMm: { x: 10.0, y: -56.0 }, isQuadrantRight: false },
	{ id: "a-23", toothFdi: "23", labelRu: "23 (Клык)", positionMm: { x: 18.0, y: -51.5 }, isQuadrantRight: false },
	{ id: "a-24", toothFdi: "24", labelRu: "24 (1-й премоляр)", positionMm: { x: 24.5, y: -45.0 }, isQuadrantRight: false },
	{ id: "a-25", toothFdi: "25", labelRu: "25 (2-й премоляр)", positionMm: { x: 29.5, y: -37.0 }, isQuadrantRight: false },
	{ id: "a-26", toothFdi: "26", labelRu: "26 (1-й моляр)", positionMm: { x: 33.5, y: -27.0 }, isQuadrantRight: false },
	{ id: "a-27", toothFdi: "27", labelRu: "27 (2-й моляр)", positionMm: { x: 36.0, y: -15.0 }, isQuadrantRight: false },
	{ id: "a-28", toothFdi: "28", labelRu: "28 (3-й моляр)", positionMm: { x: 38.0, y: -3.0 }, isQuadrantRight: false },
];

// ─── 1. CATMULL-ROM SPLINE FITTING & VECTOR MATH ─────────────────────────────

/**
 * Fits a smooth Catmull-Rom spline curve through dental arch anchor points.
 */
export function fitSmoothDentalArchSpline(
	anchors: readonly DentalArchAnchor[],
	samplesPerSegment = 8,
): Point2D[] {
	if (!anchors || anchors.length === 0) return [];

	const validAnchors = anchors.filter(
		(a) => a && a.positionMm && Number.isFinite(a.positionMm.x) && Number.isFinite(a.positionMm.y),
	);
	if (validAnchors.length === 0) return [];
	if (validAnchors.length === 1) return [{ ...validAnchors[0]!.positionMm }];

	const numSamples = Math.max(1, Math.round(Number.isFinite(samplesPerSegment) ? samplesPerSegment : 8));
	const pts = validAnchors.map((a) => a.positionMm);
	const curve: Point2D[] = [];

	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = i > 0 ? pts[i - 1]! : pts[0]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = i < pts.length - 2 ? pts[i + 2]! : pts[pts.length - 1]!;

		for (let s = 0; s < numSamples; s++) {
			const t = s / numSamples;
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

			if (Number.isFinite(x) && Number.isFinite(y)) {
				curve.push({
					x: Number(x.toFixed(2)),
					y: Number(y.toFixed(2)),
				});
			}
		}
	}

	const lastPt = pts[pts.length - 1]!;
	if (Number.isFinite(lastPt.x) && Number.isFinite(lastPt.y)) {
		curve.push({
			x: Number(lastPt.x.toFixed(2)),
			y: Number(lastPt.y.toFixed(2)),
		});
	}

	return curve;
}

/**
 * Calculates total arc length in physical millimeters.
 */
export function calculateArchLengthMm(spline: readonly Point2D[]): number {
	if (!spline || spline.length < 2) return 0;
	let total = 0;
	for (let i = 0; i < spline.length - 1; i++) {
		const p1 = spline[i]!;
		const p2 = spline[i + 1]!;
		const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
		if (Number.isFinite(dist)) {
			total += dist;
		}
	}
	return Number(total.toFixed(2));
}

/**
 * Computes tangents and unit normal vectors along the dental spline curve.
 * Zero-division, Infinity, and NaN safe under coinciding or degenerate anchors.
 */
export function calculateArchTangentsAndNormals(spline: readonly Point2D[]): Array<{
	point: Point2D;
	tangent: Point2D;
	normal: Point2D;
	distanceAlongArchMm: number;
}> {
	if (!spline || spline.length === 0) return [];

	const validSpline: Point2D[] = [];
	for (const pt of spline) {
		if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
			validSpline.push(pt);
		}
	}
	if (validSpline.length === 0) return [];

	const results: Array<{
		point: Point2D;
		tangent: Point2D;
		normal: Point2D;
		distanceAlongArchMm: number;
	}> = [];

	let accumulatedDist = 0;
	let lastValidTangent: Point2D | null = null;

	for (let i = 0; i < validSpline.length; i++) {
		const cur = validSpline[i]!;
		let tx = 0;
		let ty = 0;

		if (validSpline.length === 1) {
			tx = 1.0;
			ty = 0.0;
		} else if (i === 0) {
			const next = validSpline[1]!;
			tx = next.x - cur.x;
			ty = next.y - cur.y;
		} else if (i === validSpline.length - 1) {
			const prev = validSpline[i - 1]!;
			tx = cur.x - prev.x;
			ty = cur.y - prev.y;
			const stepDist = Math.hypot(tx, ty);
			if (Number.isFinite(stepDist)) {
				accumulatedDist += stepDist;
			}
		} else {
			const prev = validSpline[i - 1]!;
			const next = validSpline[i + 1]!;
			tx = next.x - prev.x;
			ty = next.y - prev.y;
			const stepDist = Math.hypot(cur.x - prev.x, cur.y - prev.y);
			if (Number.isFinite(stepDist)) {
				accumulatedDist += stepDist;
			}
		}

		let len = Math.hypot(tx, ty);
		if (!Number.isFinite(len) || len < 1e-6) {
			// Try forward difference: cur -> next
			if (i < validSpline.length - 1) {
				const fwdX = validSpline[i + 1]!.x - cur.x;
				const fwdY = validSpline[i + 1]!.y - cur.y;
				const fwdLen = Math.hypot(fwdX, fwdY);
				if (Number.isFinite(fwdLen) && fwdLen >= 1e-6) {
					tx = fwdX;
					ty = fwdY;
					len = fwdLen;
				}
			}
			// Try backward difference: prev -> cur
			if (len < 1e-6 && i > 0) {
				const bwdX = cur.x - validSpline[i - 1]!.x;
				const bwdY = cur.y - validSpline[i - 1]!.y;
				const bwdLen = Math.hypot(bwdX, bwdY);
				if (Number.isFinite(bwdLen) && bwdLen >= 1e-6) {
					tx = bwdX;
					ty = bwdY;
					len = bwdLen;
				}
			}
			// Fallback to previous valid tangent
			if (len < 1e-6 && lastValidTangent) {
				tx = lastValidTangent.x;
				ty = lastValidTangent.y;
				len = 1.0;
			}
			// Ultimate fallback to unit X vector
			if (len < 1e-6 || !Number.isFinite(len)) {
				tx = 1.0;
				ty = 0.0;
				len = 1.0;
			}
		}

		const unitTx = tx / len;
		const unitTy = ty / len;
		const normTangent: Point2D = { x: unitTx, y: unitTy };

		// Normal is rotated 90 degrees counter-clockwise across ridge (Buccal to Lingual)
		const normNormal: Point2D = { x: -unitTy, y: unitTx };
		lastValidTangent = normTangent;

		results.push({
			point: cur,
			tangent: normTangent,
			normal: normNormal,
			distanceAlongArchMm: Number(accumulatedDist.toFixed(2)),
		});
	}

	return results;
}

/**
 * Computes the parallel inner and outer boundary curves of the focal trough
 * offset by +/- (thickness / 2) along the normal vectors.
 */
export function getFocalTroughBoundaryCurves(
	spline: readonly Point2D[],
	thicknessMm: number,
): {
	innerBoundary: Point2D[];
	outerBoundary: Point2D[];
} {
	const validThickness = Number.isFinite(thicknessMm) && thicknessMm > 0 ? thicknessMm : 12.0;
	const halfThickness = validThickness / 2.0;
	const vectorField = calculateArchTangentsAndNormals(spline);
	const innerBoundary: Point2D[] = [];
	const outerBoundary: Point2D[] = [];

	for (const node of vectorField) {
		innerBoundary.push({
			x: Number((node.point.x - node.normal.x * halfThickness).toFixed(2)),
			y: Number((node.point.y - node.normal.y * halfThickness).toFixed(2)),
		});
		outerBoundary.push({
			x: Number((node.point.x + node.normal.x * halfThickness).toFixed(2)),
			y: Number((node.point.y + node.normal.y * halfThickness).toFixed(2)),
		});
	}

	return { innerBoundary, outerBoundary };
}

/**
 * Builds a complete DentalArchCurve model from anchor points.
 */
export function buildDentalArchCurve(
	anchors: readonly DentalArchAnchor[],
	jawType: "mandible" | "maxilla" = "mandible",
	focalTroughThicknessMm = 12.0,
	planeZMm?: number,
): DentalArchCurve {
	const spline = fitSmoothDentalArchSpline(anchors, 8);
	const totalLength = calculateArchLengthMm(spline);

	return {
		id: `arch-${jawType}-${Date.now()}`,
		jawType,
		anchors,
		splinePointsMm: spline,
		totalArcLengthMm: totalLength,
		focalTroughThicknessMm,
		...(typeof planeZMm === "number" && Number.isFinite(planeZMm) ? { planeZMm } : {}),
	};
}

export function createDentalArchCurve(
	jawTypeOrAnchors: "mandible" | "maxilla" | readonly DentalArchAnchor[] = "mandible",
	jawType: "mandible" | "maxilla" = "mandible",
	focalTroughThicknessMm = 12.0,
	planeZMm?: number,
): DentalArchCurve {
	if (typeof jawTypeOrAnchors === "string") {
		const anchors = jawTypeOrAnchors === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS;
		return buildDentalArchCurve(anchors, jawTypeOrAnchors, focalTroughThicknessMm, planeZMm);
	}
	return buildDentalArchCurve(jawTypeOrAnchors, jawType, focalTroughThicknessMm, planeZMm);
}

/**
 * Updates the physical 2D millimeter position (X, Y) of an anchor point on the dental arch curve
 * and re-calculates the Catmull-Rom spline, total arc length, and tangents/normals in real time.
 */
export function updateDentalArchAnchorPosition(
	archCurve: DentalArchCurve,
	anchorIndexOrFdiOrId: number | string,
	newPositionMm: Point2D | (Point2D & { readonly zMm?: number }),
): DentalArchCurve {
	let modified = false;
	const anchors = archCurve.anchors.map((anchor, idx) => {
		const isTarget =
			(typeof anchorIndexOrFdiOrId === "number" && idx === anchorIndexOrFdiOrId) ||
			anchor.id === String(anchorIndexOrFdiOrId) ||
			anchor.toothFdi === String(anchorIndexOrFdiOrId);
		if (isTarget) {
			modified = true;
			const zVal = "zMm" in newPositionMm ? (newPositionMm as any).zMm : anchor.zMm;
			return {
				...anchor,
				positionMm: {
					x: Number(newPositionMm.x.toFixed(2)),
					y: Number(newPositionMm.y.toFixed(2)),
				},
				...(typeof zVal === "number" && Number.isFinite(zVal) ? { zMm: Number(zVal.toFixed(2)) } : {}),
			};
		}
		return anchor;
	});

	if (!modified) {
		return archCurve;
	}

	return buildDentalArchCurve(anchors, archCurve.jawType, archCurve.focalTroughThicknessMm, archCurve.planeZMm);
}

export interface DentalArchAnchorHitResult {
	readonly anchor: DentalArchAnchor;
	readonly index: number;
	readonly screenPx: Point2D;
	readonly distancePx: number;
}

/**
 * Hit-tests screen pointer against all dental arch anchor control points on the Axial plane.
 * Enforces a standard 24x24px circular hitbox (hitRadiusPx = 12).
 */
export function hitTestDentalArchControlPoint(
	pointerScreenPx: Point2D,
	archCurve: DentalArchCurve,
	volume: CbctVoxelVolume,
	transform?: { readonly panX?: number; readonly panY?: number; readonly zoom?: number } | undefined,
	hitRadiusPx = 12,
	crosshairZMm = 0,
): DentalArchAnchorHitResult | null {
	if (!archCurve || !archCurve.anchors || archCurve.anchors.length === 0 || !volume) {
		return null;
	}

	const activeTransform: ViewportTransform = {
		panX: transform?.panX ?? 0,
		panY: transform?.panY ?? 0,
		zoom: transform?.zoom ?? 1.0,
	};

	let closestHit: DentalArchAnchorHitResult | null = null;
	let minDistance = Infinity;

	for (let i = 0; i < archCurve.anchors.length; i++) {
		const anchor = archCurve.anchors[i]!;
		const slicePx = worldMmToSlicePx(
			{ x: anchor.positionMm.x, y: anchor.positionMm.y, z: crosshairZMm },
			"axial",
			volume,
		);
		const screenPx = slicePxToScreenPx(slicePx, activeTransform);

		const dist = Math.hypot(pointerScreenPx.x - screenPx.x, pointerScreenPx.y - screenPx.y);
		if (dist <= hitRadiusPx && dist < minDistance) {
			minDistance = dist;
			closestHit = {
				anchor,
				index: i,
				screenPx,
				distancePx: Number(dist.toFixed(2)),
			};
		}
	}

	return closestHit;
}

export interface DrawDentalArchManipulatorsOptions {
	readonly archCurve: DentalArchCurve;
	readonly volume: CbctVoxelVolume;
	readonly transform?: { readonly panX?: number; readonly panY?: number; readonly zoom?: number } | undefined;
	readonly crosshairZMm?: number;
	readonly selectedAnchorIdx?: number | null;
	readonly hoveredAnchorIdx?: number | null;
	readonly draggingAnchorIdx?: number | null;
	readonly activeToothFdi?: string | null;
	readonly invertColors?: boolean;
}

/**
 * Renders interactive 24x24px dental arch control points on the Axial canvas in Screen Space (Pass 2).
 */
export function drawDentalArchControlPointManipulators(
	ctx: CanvasRenderingContext2D,
	options: DrawDentalArchManipulatorsOptions,
): void {
	const {
		archCurve,
		volume,
		transform,
		crosshairZMm = 0,
		selectedAnchorIdx = null,
		hoveredAnchorIdx = null,
		draggingAnchorIdx = null,
		activeToothFdi = null,
		invertColors = false,
	} = options;

	if (!archCurve || !archCurve.anchors || archCurve.anchors.length === 0 || !volume) {
		return;
	}

	const activeTransform: ViewportTransform = {
		panX: transform?.panX ?? 0,
		panY: transform?.panY ?? 0,
		zoom: transform?.zoom ?? 1.0,
	};

	ctx.save();

	for (let i = 0; i < archCurve.anchors.length; i++) {
		const anchor = archCurve.anchors[i]!;
		const isDragging = draggingAnchorIdx === i;
		const isHovered = hoveredAnchorIdx === i;
		const isSelected = selectedAnchorIdx === i || (activeToothFdi !== null && anchor.toothFdi === activeToothFdi);

		const slicePx = worldMmToSlicePx(
			{ x: anchor.positionMm.x, y: anchor.positionMm.y, z: crosshairZMm },
			"axial",
			volume,
		);
		const screen = slicePxToScreenPx(slicePx, activeTransform);

		// 1. Interactive hitbox ring (24x24px touch/drag boundary = 12px radius)
		if (isDragging) {
			ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 14, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = "rgba(6, 182, 212, 0.35)";
			ctx.strokeStyle = "#06b6d4";
			ctx.lineWidth = 2.0;
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 12, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = "#ffffff";
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
			ctx.fill();
		} else if (isHovered) {
			ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 14, 0, Math.PI * 2);
			ctx.fill();

			ctx.fillStyle = "rgba(45, 212, 191, 0.22)";
			ctx.strokeStyle = "rgba(45, 212, 191, 0.95)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 12, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = "#2dd4bf";
			ctx.strokeStyle = "#09090b";
			ctx.lineWidth = 1.0;
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 3.0, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = "#ffffff";
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 1.2, 0, Math.PI * 2);
			ctx.fill();
		} else if (isSelected) {
			ctx.fillStyle = "rgba(45, 212, 191, 0.25)";
			ctx.strokeStyle = "#2dd4bf";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 8, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = "#ffffff";
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 3.0, 0, Math.PI * 2);
			ctx.fill();
		} else {
			ctx.fillStyle = invertColors ? "#0d9488" : "#2dd4bf";
			ctx.strokeStyle = invertColors ? "#ffffff" : "#09090b";
			ctx.lineWidth = 1.0;
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 3.0, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		}

		// 2. Floating FDI Tooth Badge Pill on Hover/Drag/Select
		if (isHovered || isDragging || isSelected) {
			const labelText = `FDI #${anchor.toothFdi}`;
			ctx.font = "bold 10px monospace";
			const textWidth = ctx.measureText(labelText).width;
			const pillW = textWidth + 10;
			const pillH = 16;
			const pillX = screen.x - pillW / 2;
			const pillY = screen.y - 24;

			ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
			ctx.strokeStyle = isDragging ? "#06b6d4" : isHovered ? "#2dd4bf" : "#a855f7";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			if (typeof ctx.roundRect === "function") {
				ctx.roundRect(pillX, pillY, pillW, pillH, 4);
			} else {
				ctx.rect(pillX, pillY, pillW, pillH);
			}
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = isDragging ? "#67e8f9" : isHovered ? "#5eead4" : "#ffffff";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(labelText, screen.x, pillY + pillH / 2);
		}
	}

	ctx.restore();
}
