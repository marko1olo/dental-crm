/**
 * DENTE CRM — Panoramic Dental Arch Spline & Transverse Cross-Section Reslicer Engine
 * Standards: DICOM Part 3, Misch CE, Buser
 *
 * Implements:
 * 1. Interactive Anatomical Dental Spline Curve mapped on Axial plane with FDI 18..48 tooth anchors.
 * 2. Unfolded Dental Panoramic Reconstruction (OPG / Focal Trough) with adjustable thickness (5-20 mm).
 * 3. Perpendicular Transverse Cross-Section Reslicing (1-2 mm spacing) for accurate bone height/width measurements.
 * 4. Normal & Tangent vector field derivation along the alveolar ridge.
 * 5. Automatic bone dimension metrics calculation (Crest, Mid, Basal width, Vertical height).
 */

import {
	type CbctVoxelVolume,
	get16BitLut,
	huToGrayscale,
	sampleVoxelHU,
	sampleVoxelTrilinearHU,
	worldMmToVoxel,
	worldMmToVoxelContinuous,
	worldMmToSlicePx,
	slicePxToScreenPx,
	type ViewportTransform,
	DEFAULT_VIEWPORT_TRANSFORM,
} from "./cbctMprMath";
import {
	type Point2D,
	type Point3D,
	calculateSplineLength3DMm,
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
} from "./cbctCaliperNerveMath";


export interface DentalArchAnchor {
	readonly id: string;
	readonly toothFdi: string; // e.g. "46", "36", "11", "21"
	readonly labelRu: string;
	readonly positionMm: Point2D; // X (Right-Left) and Y (Anterior-Posterior) in physical mm
	readonly isQuadrantRight: boolean;
}

export interface DentalArchCurve {
	readonly id: string;
	readonly jawType: "mandible" | "maxilla";
	readonly anchors: readonly DentalArchAnchor[];
	readonly splinePointsMm: readonly Point2D[];
	readonly totalArcLengthMm: number;
	readonly focalTroughThicknessMm: number; // 5..20 mm (default 12 mm)
}

export interface CrossSectionSliceData {
	readonly sliceIndex: number;
	readonly distanceAlongArchMm: number; // Distance from right end (0 mm) to left end
	readonly centerPointMm: Point3D;
	readonly normalVector2D: Point2D; // Perpendicular direction across ridge (Buccal - Lingual)
	readonly tangentVector2D: Point2D; // Direction along arch (Mesial - Distal)
	readonly nearestToothFdi: string;
	readonly toothLabelRu: string;
	readonly widthMm: number; // Typically 24 mm
	readonly heightMm: number; // Typically 32 mm
	readonly pixelSpacingMm: number; // Typically 0.25 mm/px
	readonly widthPx: number;
	readonly heightPx: number;
	readonly pixelData: Uint8ClampedArray; // RGBA grayscale
	readonly corticalCrestHeightMm?: number;
	readonly alveolarRidgeWidthMm?: number;
}

export interface PanoramicReconstructionResult {
	readonly widthPx: number;
	readonly heightPx: number;
	readonly focalThicknessMm: number;
	readonly pixelData: Uint8ClampedArray; // RGBA grayscale image
	readonly toothMarkersOnPano: ReadonlyArray<{
		readonly toothFdi: string;
		readonly xPx: number;
		readonly labelRu: string;
	}>;
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
	{ id: "a-16", toothFdi: "16", labelRu: "16 (1-й моляр)", positionMm: { x: -33.0, y: -27.0 }, isQuadrantRight: true },
	{ id: "a-15", toothFdi: "15", labelRu: "15 (2-й премоляр)", positionMm: { x: -29.0, y: -37.0 }, isQuadrantRight: true },
	{ id: "a-14", toothFdi: "14", labelRu: "14 (1-й премоляр)", positionMm: { x: -24.0, y: -45.0 }, isQuadrantRight: true },
	{ id: "a-13", toothFdi: "13", labelRu: "13 (Клык)", positionMm: { x: -17.5, y: -51.0 }, isQuadrantRight: true },
	{ id: "a-12", toothFdi: "12", labelRu: "12 (Боковой резец)", positionMm: { x: -9.5, y: -55.5 }, isQuadrantRight: true },
	{ id: "a-11", toothFdi: "11", labelRu: "11 (Центральный резец)", positionMm: { x: -3.0, y: -57.5 }, isQuadrantRight: true },
	{ id: "a-21", toothFdi: "21", labelRu: "21 (Центральный резец)", positionMm: { x: 3.0, y: -57.5 }, isQuadrantRight: false },
	{ id: "a-22", toothFdi: "22", labelRu: "22 (Боковой резец)", positionMm: { x: 9.5, y: -55.5 }, isQuadrantRight: false },
	{ id: "a-23", toothFdi: "23", labelRu: "23 (Клык)", positionMm: { x: 17.5, y: -51.0 }, isQuadrantRight: false },
	{ id: "a-24", toothFdi: "24", labelRu: "24 (1-й премоляр)", positionMm: { x: 24.0, y: -45.0 }, isQuadrantRight: false },
	{ id: "a-25", toothFdi: "25", labelRu: "25 (2-й премоляр)", positionMm: { x: 29.0, y: -37.0 }, isQuadrantRight: false },
	{ id: "a-26", toothFdi: "26", labelRu: "26 (1-й моляр)", positionMm: { x: 33.0, y: -27.0 }, isQuadrantRight: false },
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
	if (anchors.length === 0) return [];
	if (anchors.length === 1) return [{ ...anchors[0]!.positionMm }];

	const pts = anchors.map((a) => a.positionMm);
	const curve: Point2D[] = [];

	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = i > 0 ? pts[i - 1]! : pts[0]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = i < pts.length - 2 ? pts[i + 2]! : pts[pts.length - 1]!;

		for (let s = 0; s < samplesPerSegment; s++) {
			const t = s / samplesPerSegment;
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

			curve.push({
				x: Number(x.toFixed(2)),
				y: Number(y.toFixed(2)),
			});
		}
	}

	const lastPt = pts[pts.length - 1]!;
	curve.push({
		x: Number(lastPt.x.toFixed(2)),
		y: Number(lastPt.y.toFixed(2)),
	});

	return curve;
}

/**
 * Calculates total arc length in physical millimeters.
 */
export function calculateArchLengthMm(spline: readonly Point2D[]): number {
	let total = 0;
	for (let i = 0; i < spline.length - 1; i++) {
		const p1 = spline[i]!;
		const p2 = spline[i + 1]!;
		total += Math.hypot(p2.x - p1.x, p2.y - p1.y);
	}
	return Number(total.toFixed(2));
}

/**
 * Computes tangents and unit normal vectors along the dental spline curve.
 */
export function calculateArchTangentsAndNormals(spline: readonly Point2D[]): Array<{
	point: Point2D;
	tangent: Point2D;
	normal: Point2D;
	distanceAlongArchMm: number;
}> {
	if (!spline || spline.length === 0) return [];
	const results: Array<{
		point: Point2D;
		tangent: Point2D;
		normal: Point2D;
		distanceAlongArchMm: number;
	}> = [];

	let accumulatedDist = 0;

	for (let i = 0; i < spline.length; i++) {
		const cur = spline[i]!;
		let tx = 0;
		let ty = 0;

		if (i === 0) {
			const next = spline[1] ?? cur;
			tx = next.x - cur.x;
			ty = next.y - cur.y;
		} else if (i === spline.length - 1) {
			const prev = spline[i - 1] ?? cur;
			tx = cur.x - prev.x;
			ty = cur.y - prev.y;
			accumulatedDist += Math.hypot(tx, ty);
		} else {
			const prev = spline[i - 1]!;
			const next = spline[i + 1]!;
			tx = next.x - prev.x;
			ty = next.y - prev.y;
			accumulatedDist += Math.hypot(cur.x - prev.x, cur.y - prev.y);
		}

		const len = Math.hypot(tx, ty) || 1.0;
		const normTangent: Point2D = { x: tx / len, y: ty / len };

		// Normal is rotated 90 degrees counter-clockwise across ridge (Buccal to Lingual)
		const normNormal: Point2D = { x: -normTangent.y, y: normTangent.x };

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
	const halfThickness = thicknessMm / 2.0;
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
	};
}

export function createDentalArchCurve(
	jawTypeOrAnchors: "mandible" | "maxilla" | readonly DentalArchAnchor[] = "mandible",
	jawType: "mandible" | "maxilla" = "mandible",
	focalTroughThicknessMm = 12.0,
): DentalArchCurve {
	if (typeof jawTypeOrAnchors === "string") {
		const anchors = jawTypeOrAnchors === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS;
		return buildDentalArchCurve(anchors, jawTypeOrAnchors, focalTroughThicknessMm);
	}
	return buildDentalArchCurve(jawTypeOrAnchors, jawType, focalTroughThicknessMm);
}

/**
 * Updates the physical 2D millimeter position (X, Y) of an anchor point on the dental arch curve
 * and re-calculates the Catmull-Rom spline, total arc length, and tangents/normals in real time.
 */
export function updateDentalArchAnchorPosition(
	archCurve: DentalArchCurve,
	anchorIndexOrFdiOrId: number | string,
	newPositionMm: Point2D,
): DentalArchCurve {
	let modified = false;
	const anchors = archCurve.anchors.map((anchor, idx) => {
		const isTarget =
			(typeof anchorIndexOrFdiOrId === "number" && idx === anchorIndexOrFdiOrId) ||
			anchor.id === String(anchorIndexOrFdiOrId) ||
			anchor.toothFdi === String(anchorIndexOrFdiOrId);
		if (isTarget) {
			modified = true;
			return {
				...anchor,
				positionMm: {
					x: Number(newPositionMm.x.toFixed(2)),
					y: Number(newPositionMm.y.toFixed(2)),
				},
			};
		}
		return anchor;
	});

	if (!modified) {
		return archCurve;
	}

	return buildDentalArchCurve(anchors, archCurve.jawType, archCurve.focalTroughThicknessMm);
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
 * Features:
 * - Clear 24px round touch/drag targets with high contrast dark halos.
 * - Distinct visual states: default (purple/white), hovered (cyan/gold glow), dragging (bright cyan ring + pill badge).
 * - Floating FDI tooth number badge on hover/drag for immediate anatomical feedback.
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
			// Dark underlay halo only on active interaction to prevent contrast loss
			ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 14, 0, Math.PI * 2);
			ctx.fill();

			// Dragging state: Vibrant Cyan Glow (24px touch circle)
			ctx.fillStyle = "rgba(6, 182, 212, 0.35)";
			ctx.strokeStyle = "#06b6d4";
			ctx.lineWidth = 2.0;
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 12, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			// Center core
			ctx.fillStyle = "#ffffff";
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
			ctx.fill();
		} else if (isHovered) {
			// Dark underlay halo
			ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 14, 0, Math.PI * 2);
			ctx.fill();

			// Hovered state: 24px Transparent Active Hitbox Ring (cursor-grab target)
			ctx.fillStyle = "rgba(45, 212, 191, 0.22)";
			ctx.strokeStyle = "rgba(45, 212, 191, 0.95)";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 12, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			// 6px Teal-400 core
			ctx.fillStyle = "#2dd4bf";
			ctx.strokeStyle = "#09090b";
			ctx.lineWidth = 1.0;
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 3.0, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			// Center bright dot
			ctx.fillStyle = "#ffffff";
			ctx.beginPath();
			ctx.arc(screen.x, screen.y, 1.2, 0, Math.PI * 2);
			ctx.fill();
		} else if (isSelected) {
			// Selected state: Highlighted Teal/Cyan Ring
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
			// Idle state: Visible small teal-400 circle (6px diameter / 3.0px radius) with dark border
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

			// Pill background with dark backdrop
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

			// Pill text
			ctx.fillStyle = isDragging ? "#67e8f9" : isHovered ? "#5eead4" : "#ffffff";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(labelText, screen.x, pillY + pillH / 2);
		}
	}

	ctx.restore();
}

// ─── 2. UNFOLDED PANORAMIC (OPG) RECONSTRUCTION ─────────────────────────────

/**
 * Reconstructs a full panoramic radiograph (OPG) by sweeping along the dental spline.
 */
export function reconstructPanoramicView(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	options: {
		heightMm?: number;
		heightPx?: number;
		widthPx?: number;
		windowWidth?: number;
		windowLevel?: number;
		projectionMode?: string;
		invert?: boolean;
	} = {},
): PanoramicReconstructionResult {

	const {
		heightMm = 38.0,
		heightPx = 220,
		widthPx,
		windowWidth = 4400,
		windowLevel = 1300,
		projectionMode = "average",
		invert = false,
	} = options as { heightMm?: number; heightPx?: number; widthPx?: number; windowWidth?: number; windowLevel?: number; projectionMode?: string; invert?: boolean };

	const splinePoints = archCurve.splinePointsMm;
	const vectorField = calculateArchTangentsAndNormals(splinePoints);
	const outW = widthPx ?? Math.max(500, Math.round(archCurve.totalArcLengthMm / (volume.spacingMm.x || 0.35)));
	const outH = heightPx;
	const pixelBuffer = new Uint8ClampedArray(outW * outH * 4);

	// Focal trough slab sampling
	const focalRadiusMm = archCurve.focalTroughThicknessMm / 2.0;
	const slabSamples = Math.max(3, Math.round(focalRadiusMm / 0.5));

	const zTopMm = heightMm / 2.0;
	const zBottomMm = -heightMm / 2.0;
	const zStepMm = (zTopMm - zBottomMm) / outH;
	const nNodes = vectorField.length;
	const totalLengthMm = archCurve.totalArcLengthMm || 100;

	const lut = get16BitLut(windowWidth, windowLevel, invert);

	// Sweep along the spline with constant physical arc-length distance
	const denomW = Math.max(1, outW - 1);
	for (let col = 0; col < outW; col++) {
		const targetDistMm = (col / denomW) * totalLengthMm;

		// Find bracketing vectorField nodes by distanceAlongArchMm
		let i0 = 0;
		let i1 = 0;
		let frac = 0;

		for (let i = 0; i < nNodes - 1; i++) {
			const d0 = vectorField[i]!.distanceAlongArchMm;
			const d1 = vectorField[i + 1]!.distanceAlongArchMm;
			if (targetDistMm >= d0 && targetDistMm <= d1) {
				i0 = i;
				i1 = i + 1;
				const segLen = d1 - d0;
				frac = segLen > 0.0001 ? (targetDistMm - d0) / segLen : 0;
				break;
			}
			if (i === nNodes - 2) {
				i0 = i;
				i1 = i + 1;
				frac = 1;
			}
		}

		const n0 = vectorField[i0] || vectorField[0]!;
		const n1 = vectorField[i1] || n0;

		const ptX = n0.point.x + (n1.point.x - n0.point.x) * frac;
		const ptY = n0.point.y + (n1.point.y - n0.point.y) * frac;
		const rawNormX = n0.normal.x + (n1.normal.x - n0.normal.x) * frac;
		const rawNormY = n0.normal.y + (n1.normal.y - n0.normal.y) * frac;
		const normLen = Math.hypot(rawNormX, rawNormY) || 1.0;
		const normX = rawNormX / normLen;
		const normY = rawNormY / normLen;

		for (let row = 0; row < outH; row++) {
			const zMm = zTopMm - row * zStepMm;

			// MIP along focal trough thickness with continuous anti-aliased sub-voxel sampling
			let maxHU = -32768;
			let minHU = 32767;
			let sumHU = 0;
			let sampleCount = 0;

			for (let s = -slabSamples; s <= slabSamples; s++) {
				const offsetMm = (s / slabSamples) * focalRadiusMm;
				const sampleX = ptX + normX * offsetMm;
				const sampleY = ptY + normY * offsetMm;

				const vox = worldMmToVoxelContinuous({ x: sampleX, y: sampleY, z: zMm }, volume);
				const hu = sampleVoxelTrilinearHU(vox.x, vox.y, vox.z, volume);
				if (hu > maxHU) maxHU = hu;
				if (hu < minHU) minHU = hu;
				sumHU += hu;
				sampleCount++;
			}

			let finalHU = maxHU;
			if (projectionMode === "minip") finalHU = minHU;
			else if (projectionMode === "average") finalHU = sampleCount > 0 ? Math.round(sumHU / sampleCount) : maxHU;

			const gray = lut[(finalHU + 32768) & 0xffff]!;
			const idx = (row * outW + col) * 4;
			pixelBuffer[idx] = gray;
			pixelBuffer[idx + 1] = gray;
			pixelBuffer[idx + 2] = gray;
			pixelBuffer[idx + 3] = 255;
		}
	}

	// Calculate tooth marker positions on the panoramic image based on exact arc distance & symmetric margins >= 20px
	const toothMarkers = archCurve.anchors.map((anchor) => {
		let minDistance = Infinity;
		let bestArcDistMm = 0;

		for (let i = 0; i < nNodes - 1; i++) {
			const n0 = vectorField[i]!;
			const n1 = vectorField[i + 1]!;
			const segDx = n1.point.x - n0.point.x;
			const segDy = n1.point.y - n0.point.y;
			const segL2 = segDx * segDx + segDy * segDy;
			let t = 0;
			if (segL2 > 1e-6) {
				const pDx = anchor.positionMm.x - n0.point.x;
				const pDy = anchor.positionMm.y - n0.point.y;
				t = Math.max(0, Math.min(1, (pDx * segDx + pDy * segDy) / segL2));
			}
			const projX = n0.point.x + t * segDx;
			const projY = n0.point.y + t * segDy;
			const dist = Math.hypot(anchor.positionMm.x - projX, anchor.positionMm.y - projY);
			if (dist < minDistance) {
				minDistance = dist;
				const segLen = n1.distanceAlongArchMm - n0.distanceAlongArchMm;
				bestArcDistMm = n0.distanceAlongArchMm + t * segLen;
			}
		}

		const ratio = totalLengthMm > 0 ? Math.max(0, Math.min(1, bestArcDistMm / totalLengthMm)) : 0;
		// Ensure symmetrical dental arch landmarks with equal margins on left and right (>= 20px)
		const minMarginPx = 20;
		const availableWidth = Math.max(0, outW - 2 * minMarginPx);
		const mappedCol = Math.round(minMarginPx + ratio * availableWidth);
		const clampedCol = Math.max(minMarginPx, Math.min(outW - minMarginPx, mappedCol));

		return {
			toothFdi: anchor.toothFdi,
			xPx: clampedCol,
			labelRu: anchor.labelRu,
		};
	});

	return {
		widthPx: outW,
		heightPx: outH,
		focalThicknessMm: archCurve.focalTroughThicknessMm,
		pixelData: pixelBuffer,
		toothMarkersOnPano: toothMarkers,
	};
}

// ─── 3. TRANSVERSE CROSS-SECTION RESLICING ──────────────────────────────────

/**
 * Reslices a single perpendicular transverse cross-section slice at a specific curve point.
 */
export function extractSingleCrossSectionSlice(
	volume: CbctVoxelVolume,
	centerMm: Point3D,
	normal2D: Point2D,
	sliceIndex: number,
	distanceAlongArchMm: number,
	nearestAnchor: DentalArchAnchor,
	options: {
		widthMm?: number;
		heightMm?: number;
		pixelSpacingMm?: number;
		windowWidth?: number;
		windowLevel?: number;
		invert?: boolean;
	} = {},
): CrossSectionSliceData {
	const {
		widthMm = 24.0,
		heightMm = 32.0,
		pixelSpacingMm = 0.25,
		windowWidth = 4400,
		windowLevel = 1300,
		invert = false,
	} = options;

	const widthPx = Math.round(widthMm / pixelSpacingMm);
	const heightPx = Math.round(heightMm / pixelSpacingMm);
	const pixelData = new Uint8ClampedArray(widthPx * heightPx * 4);
	const lut = get16BitLut(windowWidth, windowLevel, invert);

	const halfW = widthMm / 2.0;
	const halfH = heightMm / 2.0;

	for (let y = 0; y < heightPx; y++) {
		const zOffsetMm = halfH - y * pixelSpacingMm;
		const sampleZ = centerMm.z + zOffsetMm;

		for (let x = 0; x < widthPx; x++) {
			const normalOffsetMm = -halfW + x * pixelSpacingMm;
			const sampleX = centerMm.x + normal2D.x * normalOffsetMm;
			const sampleY = centerMm.y + normal2D.y * normalOffsetMm;

			const vox = worldMmToVoxelContinuous({ x: sampleX, y: sampleY, z: sampleZ }, volume);
			const hu = sampleVoxelTrilinearHU(vox.x, vox.y, vox.z, volume);
			const gray = lut[(hu + 32768) & 0xffff]!;

			const idx = (y * widthPx + x) * 4;
			pixelData[idx] = gray;
			pixelData[idx + 1] = gray;
			pixelData[idx + 2] = gray;
			pixelData[idx + 3] = 255;
		}
	}

	return {
		sliceIndex,
		distanceAlongArchMm,
		centerPointMm: centerMm,
		normalVector2D: normal2D,
		tangentVector2D: { x: normal2D.y, y: -normal2D.x },
		nearestToothFdi: nearestAnchor.toothFdi,
		toothLabelRu: nearestAnchor.labelRu,
		widthMm,
		heightMm,
		pixelSpacingMm,
		widthPx,
		heightPx,
		pixelData,
	};
}

/**
 * Finds the nearest dental arch anchor to a given distance along the arch curve.
 */
export function findNearestToothAnchorToDistance(
	distanceAlongArchMm: number,
	archCurve: DentalArchCurve,
): DentalArchAnchor {
	if (archCurve.anchors.length === 0) {
		return DEFAULT_MANDIBULAR_ARCH_ANCHORS[0]!;
	}

	const totalLength = archCurve.totalArcLengthMm || 1.0;
	const norm = distanceAlongArchMm / totalLength;
	const index = Math.max(0, Math.min(archCurve.anchors.length - 1, Math.floor(norm * archCurve.anchors.length)));

	return archCurve.anchors[index] || archCurve.anchors[0]!;
}

/**
 * Generates an array of transverse cross-section slices across the whole dental arch.
 */
export function generateCrossSectionSlices(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	stepMm = 2.0,
	sliceCenterZMm = -10.0,
	options: {
		widthMm?: number;
		heightMm?: number;
		pixelSpacingMm?: number;
		windowWidth?: number;
		windowLevel?: number;
		invert?: boolean;
	} = {},
): CrossSectionSliceData[] {
	const vectorField = calculateArchTangentsAndNormals(archCurve.splinePointsMm);
	if (vectorField.length === 0) return [];

	const slices: CrossSectionSliceData[] = [];
	let currentTargetDist = 0;
	let sliceIdx = 1;

	for (let i = 0; i < vectorField.length; i++) {
		const node = vectorField[i]!;
		if (node.distanceAlongArchMm >= currentTargetDist || i === vectorField.length - 1) {
			const nearestAnchor = findNearestToothAnchorToDistance(node.distanceAlongArchMm, archCurve);
			const slice = extractSingleCrossSectionSlice(
				volume,
				{ x: node.point.x, y: node.point.y, z: sliceCenterZMm },
				node.normal,
				sliceIdx,
				node.distanceAlongArchMm,
				nearestAnchor,
				options,
			);
			slices.push(slice);
			sliceIdx++;
			currentTargetDist += stepMm;
		}
	}

	return slices;
}

export function generateCrossSectionsAlongArch(
	volume: CbctVoxelVolume,
	archCurve: DentalArchCurve,
	stepOrOptions: number | { stepSpacingMm?: number; windowWidth?: number; windowLevel?: number; widthMm?: number; heightMm?: number } = 2.0,
): CrossSectionSliceData[] {
	if (typeof stepOrOptions === "object") {
		const step = stepOrOptions.stepSpacingMm ?? 2.0;
		return generateCrossSectionSlices(volume, archCurve, step, -10.0, stepOrOptions);
	}
	return generateCrossSectionSlices(volume, archCurve, stepOrOptions);
}


/**
 * Analyzes alveolar ridge dimensions (Height, Crest width, Mid width, Basal width) from cross-section HU data.
 * Returns null if no bone data is detected in the cross-section slice.
 */
export function measureAlveolarRidgeCrossSection(
	crossSection: CrossSectionSliceData,
	crestDepthMm = 2.0,
): {
	heightMm: number;
	crestWidthMm: number;
	midWidthMm: number;
	baseWidthMm: number;
	isAdequateForImplant: boolean;
	clinicalAdviceRu: string;
} | null {
	if (!crossSection || !crossSection.pixelData || crossSection.pixelData.length === 0) {
		return null;
	}

	// Check if explicit measurements were already attached
	if (
		typeof crossSection.corticalCrestHeightMm === "number" &&
		typeof crossSection.alveolarRidgeWidthMm === "number" &&
		crossSection.corticalCrestHeightMm > 0 &&
		crossSection.alveolarRidgeWidthMm > 0
	) {
		const h = Number(crossSection.corticalCrestHeightMm.toFixed(1));
		const w = Number(crossSection.alveolarRidgeWidthMm.toFixed(1));
		const mid = Number((w * 1.15).toFixed(1));
		const base = Number((w * 1.35).toFixed(1));
		const isAdequate = h >= 10.0 && w >= 6.0;
		return {
			heightMm: h,
			crestWidthMm: w,
			midWidthMm: mid,
			baseWidthMm: base,
			isAdequateForImplant: isAdequate,
			clinicalAdviceRu: isAdequate
				? `Объем кости в зоне FDI #${crossSection.nearestToothFdi} достаточен для стандартного имплантата.`
				: `Внимание: Дефицит альвеолярного гребня в зоне FDI #${crossSection.nearestToothFdi}. Показана аугментация.`,
		};
	}

	// Compute directly from cross-section pixel data (threshold >= 40 represents bone in 8-bit LUT)
	const widthPx = crossSection.widthPx;
	const heightPx = crossSection.heightPx;
	const spacing = crossSection.pixelSpacingMm || 0.25;
	const pixelData = crossSection.pixelData;

	let minBoneY = -1;
	let maxBoneY = -1;
	const rowWidths: number[] = new Array(heightPx).fill(0);

	for (let y = 0; y < heightPx; y++) {
		let minX = -1;
		let maxX = -1;
		const rowOffset = y * widthPx * 4;
		for (let x = 0; x < widthPx; x++) {
			const val = pixelData[rowOffset + x * 4]!;
			if (val >= 40) {
				if (minX === -1) minX = x;
				maxX = x;
			}
		}
		if (minX !== -1 && maxX >= minX) {
			if (minBoneY === -1) minBoneY = y;
			maxBoneY = y;
			rowWidths[y] = (maxX - minX + 1) * spacing;
		}
	}

	if (minBoneY === -1 || maxBoneY <= minBoneY) {
		// No bone data present in slice
		return null;
	}

	const measuredHeight = Number(((maxBoneY - minBoneY) * spacing).toFixed(1));
	if (measuredHeight < 2.0) {
		return null;
	}

	const crestOffsetPx = Math.min(
		maxBoneY - minBoneY,
		Math.round(crestDepthMm / spacing),
	);
	const crestY = minBoneY + crestOffsetPx;
	const midY = minBoneY + Math.round((maxBoneY - minBoneY) * 0.5);
	const baseY = Math.max(minBoneY, maxBoneY - Math.round(1.0 / spacing));

	const measuredCrestWidth = Number((rowWidths[crestY] || rowWidths[minBoneY] || 0).toFixed(1));
	const measuredMidWidth = Number((rowWidths[midY] || measuredCrestWidth).toFixed(1));
	const measuredBaseWidth = Number((rowWidths[baseY] || measuredMidWidth).toFixed(1));

	if (measuredCrestWidth <= 0) {
		return null;
	}

	const isAdequate = measuredHeight >= 10.0 && measuredCrestWidth >= 6.0;

	return {
		heightMm: measuredHeight,
		crestWidthMm: measuredCrestWidth,
		midWidthMm: measuredMidWidth,
		baseWidthMm: measuredBaseWidth,
		isAdequateForImplant: isAdequate,
		clinicalAdviceRu: isAdequate
			? `Объем кости в зоне FDI #${crossSection.nearestToothFdi} достаточен для стандартного имплантата.`
			: `Внимание: Дефицит альвеолярного гребня в зоне FDI #${crossSection.nearestToothFdi}. Показана аугментация.`,
	};
}

export const reconstructPanoramicOpg = reconstructPanoramicView;
export type AlveolarRidgeMeasurementResult = ReturnType<typeof measureAlveolarRidgeCrossSection>;
export const interpolateArchSpline = fitSmoothDentalArchSpline;
export const getSplineNormalAndTangent = calculateArchTangentsAndNormals;

export function findNearestAnchorToPoint(pointMm: Point2D, archCurve: DentalArchCurve): DentalArchAnchor {
	let closest = archCurve.anchors[0]!;
	let minDist = Infinity;
	for (const a of archCurve.anchors) {
		const d = Math.hypot(a.positionMm.x - pointMm.x, a.positionMm.y - pointMm.y);
		if (d < minDist) {
			minDist = d;
			closest = a;
		}
	}
	return closest;
}

// ─── 4. PANORAMIC CROSS-SECTION FAN & SLICE COORDINATE MAPPING ──────────────

export interface PanoramicSliceFanTick {
	readonly sliceIndex: number;
	readonly panoX: number;
	readonly distanceMm: number;
	readonly nearestToothFdi: string;
	readonly isMajor: boolean;
}

/**
 * Maps a transverse cross-section slice to its horizontal X pixel column on the panoramic radiograph.
 */
export function mapSliceToPanoramicX(
	slice: CrossSectionSliceData,
	panoWidthPx: number,
	totalArchLengthMm: number,
): number {
	if (totalArchLengthMm <= 0 || panoWidthPx <= 0) return 0;
	const ratio = Math.max(0, Math.min(1, slice.distanceAlongArchMm / totalArchLengthMm));
	const denom = Math.max(1, panoWidthPx - 1);
	return Math.round(ratio * denom);
}

/**
 * Finds the nearest cross-section slice index given a click/hover X pixel position on the panorama.
 */
export function findNearestCrossSectionIndexByPanoX(
	panoX: number,
	panoWidthPx: number,
	crossSections: readonly CrossSectionSliceData[],
	totalArchLengthMm: number,
): number {
	if (crossSections.length === 0) return 0;
	if (totalArchLengthMm <= 0 || panoWidthPx <= 0) return 0;

	const denom = Math.max(1, panoWidthPx - 1);
	const targetDist = (Math.max(0, Math.min(denom, panoX)) / denom) * totalArchLengthMm;

	let closestIdx = 0;
	let minDiff = Infinity;

	for (let i = 0; i < crossSections.length; i++) {
		const diff = Math.abs((crossSections[i]?.distanceAlongArchMm ?? 0) - targetDist);
		if (diff < minDiff) {
			minDiff = diff;
			closestIdx = i;
		}
	}

	return closestIdx;
}

/**
 * Generates numbered slice fan tick marks along the panorama for interactive navigation.
 */
export function getPanoramicSliceFanTicks(
	crossSections: readonly CrossSectionSliceData[],
	panoWidthPx: number,
	totalArchLengthMm: number,
): readonly PanoramicSliceFanTick[] {
	if (crossSections.length === 0 || panoWidthPx <= 0 || totalArchLengthMm <= 0) {
		return [];
	}

	return crossSections.map((cs) => {
		const px = mapSliceToPanoramicX(cs, panoWidthPx, totalArchLengthMm);
		const isMajor = cs.sliceIndex === 1 || cs.sliceIndex % 5 === 0 || cs.sliceIndex === 60 || cs.sliceIndex === crossSections.length;
		return {
			sliceIndex: cs.sliceIndex,
			panoX: px,
			distanceMm: cs.distanceAlongArchMm,
			nearestToothFdi: cs.nearestToothFdi,
			isMajor,
		};
	});
}

// ─── 5. REAL-TIME PANORAMA SYNCHRONIZATION & TOOTH LOOKUP ───────────────────

export interface PanoClickSyncResult {
	readonly worldMm: Point3D;
	readonly crossSectionIdx: number;
	readonly nearestToothFdi: string;
	readonly hitToothMarker: boolean;
	readonly clickedToothFdi: string | null;
}

/**
 * Hit-tests if a screen/canvas pointer position is on or near an FDI tooth badge on the panorama.
 */
export function hitTestPanoramicToothMarker(
	pointerPx: { readonly x: number; readonly y: number },
	toothMarkers: ReadonlyArray<{ readonly toothFdi: string; readonly xPx: number; readonly labelRu: string; readonly yPx?: number }>,
	transform?: { readonly panX?: number | undefined; readonly panY?: number | undefined; readonly zoom?: number | undefined } | undefined,
	hitRadiusPx = 18,
): { readonly toothFdi: string; readonly xPx: number } | null {
	const zoom = Number.isFinite(transform?.zoom) && (transform?.zoom ?? 0) > 0 ? (transform?.zoom ?? 1.0) : 1.0;
	const panX = Number.isFinite(transform?.panX) ? (transform?.panX ?? 0) : 0;
	const panY = Number.isFinite(transform?.panY) ? (transform?.panY ?? 0) : 0;

	const untransformedPxX = (pointerPx.x - panX) / zoom;
	const untransformedPxY = (pointerPx.y - panY) / zoom;

	for (const tm of toothMarkers) {
		const dx = Math.abs(untransformedPxX - tm.xPx);
		const targetY = typeof tm.yPx === "number" ? tm.yPx : 14;
		const dy = Math.abs(untransformedPxY - targetY);
		// Tooth badge is rendered in top margin (y: 2..32px) or near target yPx
		if (dx <= hitRadiusPx && (untransformedPxY <= 32 || dy <= hitRadiusPx)) {
			return { toothFdi: tm.toothFdi, xPx: tm.xPx };
		}
	}
	return null;
}

/**
 * Synchronizes 3D crosshair coordinate and active cross-section index from a click/drag on the panoramic radiograph.
 * Handles viewport zoom & pan transformations, FDI tooth marker hit-testing, and vertical height (Z) mapping.
 */
export function mapPanoPointerToCrosshairAndSlice(
	pointerPx: { readonly x: number; readonly y: number },
	panoSize: { readonly width: number; readonly height: number },
	archCurve: DentalArchCurve,
	crossSections: readonly CrossSectionSliceData[],
	currentCrosshairMm: Point3D,
	transform?: { readonly panX?: number | undefined; readonly panY?: number | undefined; readonly zoom?: number | undefined } | undefined,
	heightMm = 38.0,
): PanoClickSyncResult {
	if (crossSections.length === 0) {
		return {
			worldMm: currentCrosshairMm,
			crossSectionIdx: 0,
			nearestToothFdi: "46",
			hitToothMarker: false,
			clickedToothFdi: null,
		};
	}

	const zoom = Number.isFinite(transform?.zoom) && (transform?.zoom ?? 0) > 0 ? (transform?.zoom ?? 1.0) : 1.0;
	const panX = Number.isFinite(transform?.panX) ? (transform?.panX ?? 0) : 0;
	const panY = Number.isFinite(transform?.panY) ? (transform?.panY ?? 0) : 0;

	// Untransform screen pointer to raw panorama pixel buffer coordinate
	const untransformedPxX = (pointerPx.x - panX) / zoom;
	const untransformedPxY = (pointerPx.y - panY) / zoom;

	const panoW = panoSize.width > 0 ? panoSize.width : 500;
	const panoH = panoSize.height > 0 ? panoSize.height : 220;

	const clampedPanoX = Math.max(0, Math.min(panoW - 1, untransformedPxX));
	const clampedPanoY = Math.max(0, Math.min(panoH - 1, untransformedPxY));

	// 1. Find closest cross-section slice index
	const totalLengthMm = archCurve.totalArcLengthMm || 100.0;
	const closestIdx = findNearestCrossSectionIndexByPanoX(
		clampedPanoX,
		panoW,
		crossSections,
		totalLengthMm,
	);

	const targetSlice = crossSections[closestIdx] ?? crossSections[0]!;

	// 2. Map vertical Y position to Z physical millimeter coordinate
	const zTopMm = heightMm / 2.0;
	const zStepMm = heightMm / panoH;
	const sampledZMm = Number((zTopMm - clampedPanoY * zStepMm).toFixed(2));

	// Check if click was in top header badge zone (y <= 24px in untransformed space)
	const isToothBadgeHit = untransformedPxY <= 26;

	const targetWorldMm: Point3D = {
		x: targetSlice.centerPointMm.x,
		y: targetSlice.centerPointMm.y,
		z: isToothBadgeHit ? currentCrosshairMm.z : sampledZMm,
	};

	return {
		worldMm: targetWorldMm,
		crossSectionIdx: closestIdx,
		nearestToothFdi: targetSlice.nearestToothFdi,
		hitToothMarker: isToothBadgeHit,
		clickedToothFdi: targetSlice.nearestToothFdi,
	};
}

/**
 * Finds cross-section slice index and anatomical 3D position for a given FDI tooth number (11..48).
 */
export function findCrossSectionAndPositionByFdi(
	toothFdi: number | string,
	crossSections: readonly CrossSectionSliceData[],
	archCurve: DentalArchCurve,
	currentZMm = 0,
): { crossSectionIdx: number; positionMm: Point3D; nearestToothFdi: string; found: boolean } {
	const fdiStr = String(toothFdi);
	if (crossSections.length > 0) {
		const idx = crossSections.findIndex(
			(s) => s.nearestToothFdi === fdiStr || Number.parseInt(s.nearestToothFdi, 10) === Number.parseInt(fdiStr, 10),
		);
		if (idx >= 0) {
			const slice = crossSections[idx]!;
			return {
				crossSectionIdx: idx,
				positionMm: { x: slice.centerPointMm.x, y: slice.centerPointMm.y, z: currentZMm },
				nearestToothFdi: slice.nearestToothFdi,
				found: true,
			};
		}
	}
	const anchor = archCurve.anchors.find(
		(a) => a.toothFdi === fdiStr || Number.parseInt(a.toothFdi, 10) === Number.parseInt(fdiStr, 10),
	);
	if (anchor) {
		return {
			crossSectionIdx: 0,
			positionMm: { x: anchor.positionMm.x, y: anchor.positionMm.y, z: currentZMm },
			nearestToothFdi: anchor.toothFdi,
			found: true,
		};
	}
	return {
		crossSectionIdx: 0,
		positionMm: { x: 0, y: 0, z: currentZMm },
		nearestToothFdi: fdiStr,
		found: false,
	};
}

// ─── 6. 3D MANDIBULAR CANAL NERVE (IAN) PROJECTION ON PANORAMA ──────────────

export interface Projected3DNervePoint {
	readonly x: number; // Horizontal column (px) on panorama
	readonly y: number; // Vertical row (px) on panorama
	readonly zMm: number; // Original Z coordinate in physical mm
	readonly distanceAlongArchMm: number; // Arc length (mm) along dental spline
	readonly lateralDistanceMm: number; // Perpendicular distance (mm) to dental arch spline
	readonly isInsideFocalTrough: boolean; // True if within focal trough thickness
}

export interface Projected3DNerveResult {
	readonly projectedPoints: readonly Projected3DNervePoint[];
	readonly safetyCorridorUpper: readonly Point2D[];
	readonly safetyCorridorLower: readonly Point2D[];
	readonly safetyCorridorPolygon: readonly Point2D[];
	readonly safetyMarginMm: number; // 2.0 mm
	readonly canalDiameterMm: number; // 2.8 mm
	readonly safetyBufferPx: number; // Vertical safety corridor buffer in pixels
	readonly isVisibleOnPanorama: boolean;
	readonly totalLengthMm: number; // 3D length of the nerve in mm
}

export interface Project3DNerveOptions {
	readonly heightMm?: number; // Panoramic vertical field of view in mm (default 38.0 mm)
	readonly safetyMarginMm?: number; // Safety buffer in mm (default 2.0 mm)
	readonly canalDiameterMm?: number; // Canal diameter in mm (default 2.8 mm)
}

/**
 * Projects a 3D mandibular nerve (IAN) spline onto panoramic unfolded radiograph coordinates
 * with an exact 2.0 mm safety buffer corridor envelope.
 */
export function project3DNerveToPanorama(
	interpolatedNerve3D: readonly Point3D[],
	archCurve: DentalArchCurve,
	panoWidthPx = 500,
	panoHeightPx = 220,
	options: Project3DNerveOptions = {},
): Projected3DNerveResult {
	const heightMm = options.heightMm ?? 38.0;
	const safetyMarginMm = options.safetyMarginMm ?? MANDIBULAR_NERVE_SAFETY_MARGIN_MM;
	const canalDiameterMm = options.canalDiameterMm ?? 2.8;

	if (interpolatedNerve3D.length === 0 || archCurve.splinePointsMm.length === 0 || panoWidthPx <= 0 || panoHeightPx <= 0) {
		return {
			projectedPoints: [],
			safetyCorridorUpper: [],
			safetyCorridorLower: [],
			safetyCorridorPolygon: [],
			safetyMarginMm,
			canalDiameterMm,
			safetyBufferPx: 0,
			isVisibleOnPanorama: false,
			totalLengthMm: 0,
		};
	}

	const vectorField = calculateArchTangentsAndNormals(archCurve.splinePointsMm);
	const totalLengthMm = archCurve.totalArcLengthMm || 100.0;
	const denomW = Math.max(1, panoWidthPx - 1);
	const zTopMm = heightMm / 2.0;
	const pxPerMmY = panoHeightPx / heightMm;
	const pxPerMmX = denomW / totalLengthMm;
	const safetyBufferPx = Number((safetyMarginMm * pxPerMmY).toFixed(2));
	const halfFocalTroughMm = (archCurve.focalTroughThicknessMm ?? 12.0) / 2.0;

	const projectedPoints: Projected3DNervePoint[] = [];

	for (const pt of interpolatedNerve3D) {
		// 1. Find closest projection onto the 2D dental arch spline curve
		let minDistance = Infinity;
		let bestArcDistMm = 0;

		for (let i = 0; i < vectorField.length - 1; i++) {
			const n0 = vectorField[i]!;
			const n1 = vectorField[i + 1]!;

			const segDx = n1.point.x - n0.point.x;
			const segDy = n1.point.y - n0.point.y;
			const segL2 = segDx * segDx + segDy * segDy;

			let t = 0;
			if (segL2 > 1e-6) {
				const pDx = pt.x - n0.point.x;
				const pDy = pt.y - n0.point.y;
				t = Math.max(0, Math.min(1, (pDx * segDx + pDy * segDy) / segL2));
			}

			const projX = n0.point.x + t * segDx;
			const projY = n0.point.y + t * segDy;
			const dist = Math.hypot(pt.x - projX, pt.y - projY);

			if (dist < minDistance) {
				minDistance = dist;
				const segLen = n1.distanceAlongArchMm - n0.distanceAlongArchMm;
				bestArcDistMm = n0.distanceAlongArchMm + t * segLen;
			}
		}

		// 2. Map distance along arch to horizontal pixel column
		const ratio = Math.max(0, Math.min(1, bestArcDistMm / totalLengthMm));
		const panoX = Number((ratio * denomW).toFixed(2));

		// 3. Map vertical physical Z to panoramic pixel row
		const panoY = Number((((zTopMm - pt.z) / heightMm) * panoHeightPx).toFixed(2));

		projectedPoints.push({
			x: panoX,
			y: panoY,
			zMm: pt.z,
			distanceAlongArchMm: Number(bestArcDistMm.toFixed(2)),
			lateralDistanceMm: Number(minDistance.toFixed(2)),
			isInsideFocalTrough: minDistance <= halfFocalTroughMm,
		});
	}

	// 4. Construct 2.0 mm Safety Corridor Envelope around the projected nerve spline
	const safetyCorridorUpper: Point2D[] = [];
	const safetyCorridorLower: Point2D[] = [];
	const nPts = projectedPoints.length;

	for (let i = 0; i < nPts; i++) {
		const cur = projectedPoints[i]!;
		let tx = 0;
		let ty = 0;

		if (nPts === 1) {
			tx = 1;
			ty = 0;
		} else if (i === 0) {
			const next = projectedPoints[1]!;
			tx = next.x - cur.x;
			ty = next.y - cur.y;
		} else if (i === nPts - 1) {
			const prev = projectedPoints[i - 1]!;
			tx = cur.x - prev.x;
			ty = cur.y - prev.y;
		} else {
			const prev = projectedPoints[i - 1]!;
			const next = projectedPoints[i + 1]!;
			tx = next.x - prev.x;
			ty = next.y - prev.y;
		}

		const len = Math.hypot(tx, ty) || 1.0;
		// Normal vector perpendicular to projected path in panoramic screen space
		const nx = -ty / len;
		const ny = tx / len;

		const offX = nx * (safetyMarginMm * pxPerMmX);
		const offY = ny * (safetyMarginMm * pxPerMmY);

		safetyCorridorUpper.push({
			x: Number((cur.x + offX).toFixed(2)),
			y: Number((cur.y + offY).toFixed(2)),
		});
		safetyCorridorLower.push({
			x: Number((cur.x - offX).toFixed(2)),
			y: Number((cur.y - offY).toFixed(2)),
		});
	}

	const safetyCorridorPolygon: Point2D[] = [
		...safetyCorridorUpper,
		...safetyCorridorLower.slice().reverse(),
	];

	const total3DLength = calculateSplineLength3DMm(interpolatedNerve3D as Point3D[]);

	return {
		projectedPoints,
		safetyCorridorUpper,
		safetyCorridorLower,
		safetyCorridorPolygon,
		safetyMarginMm,
		canalDiameterMm,
		safetyBufferPx,
		isVisibleOnPanorama: projectedPoints.some((p) => p.isInsideFocalTrough),
		totalLengthMm: total3DLength,
	};
}

// ─── 7. CBCT AUTOMATED OCCLUSAL PLANE & DENTAL ARCH TRACING ENGINE ──────────
export * from "./cbctAutoArchEngine";

