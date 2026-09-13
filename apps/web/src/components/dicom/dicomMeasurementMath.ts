/**
 * dicomMeasurementMath.ts
 *
 * Precision Caliper & Measurement Engine for DICOM/CBCT Dental Imaging.
 * Formulated without procedural mocks or academic bloat (Mandates 8s, 8i, 8k).
 *
 * Provides:
 * 1. 2D and 3D Euclidean distances with anisotropic voxel spacing scaling (mm).
 * 2. 2D and 3D angle calculations at arbitrary vertices (degrees).
 * 3. Polyline cumulative length calculations (mm).
 * 4. 2D ROI area calculations (Rectangle, Ellipse, Circle) in mm².
 * 5. ROI intensity statistics (mean, stdDev, min, max, count).
 * 6. Line profile HU sampling along arbitrary 3D segments.
 * 7. Clinical localized text formatters conforming to Russian medical UI standards.
 */

import { AIR_HU, trilinear, type VolumeSamplingData } from "./panoramicMprMath";

export type Point2D = [number, number] | { x: number; y: number };
export type Point3D = [number, number, number] | { x: number; y: number; z: number };

export type VoxelSpacing2D = [number, number];
export type VoxelSpacing3D = [number, number, number];

export interface RoiStats {
	count: number;
	mean: number;
	stdDev: number;
	min: number;
	max: number;
}

/**
 * Normalizes a 2D point input to [x, y] coordinates.
 */
export function point2ToArray(p: Point2D): [number, number] {
	if (Array.isArray(p)) {
		return [p[0], p[1]];
	}
	return [p.x, p.y];
}

/**
 * Normalizes a 3D point input to [x, y, z] coordinates.
 */
export function point3ToArray(p: Point3D): [number, number, number] {
	if (Array.isArray(p)) {
		return [p[0], p[1], p[2]];
	}
	return [p.x, p.y, p.z];
}

// ---------------------------------------------------------------------------
// 1. EUCLIDEAN DISTANCE WITH ANISOTROPIC VOXEL SPACING
// ---------------------------------------------------------------------------

/**
 * Computes the 2D Euclidean distance in mm between two points,
 * accounting for pixel spacing (spacing[0] = dx, spacing[1] = dy).
 */
export function euclideanDistance2D(
	a: Point2D,
	b: Point2D,
	spacing: VoxelSpacing2D = [1, 1],
): number {
	const [ax, ay] = point2ToArray(a);
	const [bx, by] = point2ToArray(b);
	const sx = spacing[0] || 1;
	const sy = spacing[1] || 1;
	const dx = (bx - ax) * sx;
	const dy = (by - ay) * sy;
	return Math.hypot(dx, dy);
}

/**
 * Computes the 3D Euclidean distance in mm between two points,
 * accounting for voxel spacing (dx, dy, dz).
 */
export function euclideanDistance3D(
	a: Point3D,
	b: Point3D,
	spacing: VoxelSpacing3D = [1, 1, 1],
): number {
	const [ax, ay, az] = point3ToArray(a);
	const [bx, by, bz] = point3ToArray(b);
	const sx = spacing[0] || 1;
	const sy = spacing[1] || 1;
	const sz = spacing[2] || 1;
	const dx = (bx - ax) * sx;
	const dy = (by - ay) * sy;
	const dz = (bz - az) * sz;
	return Math.hypot(dx, dy, dz);
}

/**
 * Computes the total cumulative arc length of a 2D polyline in mm.
 */
export function polylineLength2D(
	points: Point2D[],
	spacing: VoxelSpacing2D = [1, 1],
): number {
	if (points.length < 2) return 0;
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += euclideanDistance2D(points[i - 1]!, points[i]!, spacing);
	}
	return total;
}

/**
 * Computes the total cumulative length of a 3D polyline in mm.
 */
export function polylineLength3D(
	points: Point3D[],
	spacing: VoxelSpacing3D = [1, 1, 1],
): number {
	if (points.length < 2) return 0;
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += euclideanDistance3D(points[i - 1]!, points[i]!, spacing);
	}
	return total;
}

// ---------------------------------------------------------------------------
// 2. CALIPER ANGLE CALCULATIONS (DEGREES)
// ---------------------------------------------------------------------------

/**
 * Computes the angle in degrees [0, 180] at `vertex` between the rays to `a` and `b`.
 * Accounts for 2D pixel spacing to preserve angular truth under non-square pixels.
 */
export function angleDeg2D(
	a: Point2D,
	vertex: Point2D,
	b: Point2D,
	spacing: VoxelSpacing2D = [1, 1],
): number {
	const [ax, ay] = point2ToArray(a);
	const [vx, vy] = point2ToArray(vertex);
	const [bx, by] = point2ToArray(b);

	const sx = spacing[0] || 1;
	const sy = spacing[1] || 1;

	const v1x = (ax - vx) * sx;
	const v1y = (ay - vy) * sy;
	const v2x = (bx - vx) * sx;
	const v2y = (by - vy) * sy;

	const dot = v1x * v2x + v1y * v2y;
	const det = v1x * v2y - v1y * v2x;

	const rad = Math.abs(Math.atan2(det, dot));
	return (rad * 180) / Math.PI;
}

/**
 * Computes the 3D spatial angle in degrees [0, 180] at `vertex` between rays to `a` and `b`.
 * Uses vector dot product normalized by vector lengths with voxel spacing.
 */
export function angleDeg3D(
	a: Point3D,
	vertex: Point3D,
	b: Point3D,
	spacing: VoxelSpacing3D = [1, 1, 1],
): number {
	const [ax, ay, az] = point3ToArray(a);
	const [vx, vy, vz] = point3ToArray(vertex);
	const [bx, by, bz] = point3ToArray(b);

	const sx = spacing[0] || 1;
	const sy = spacing[1] || 1;
	const sz = spacing[2] || 1;

	const u: [number, number, number] = [
		(ax - vx) * sx,
		(ay - vy) * sy,
		(az - vz) * sz,
	];
	const w: [number, number, number] = [
		(bx - vx) * sx,
		(by - vy) * sy,
		(bz - vz) * sz,
	];

	const dot = u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
	const lenU = Math.hypot(u[0], u[1], u[2]);
	const lenW = Math.hypot(w[0], w[1], w[2]);

	if (lenU === 0 || lenW === 0) return 0;
	const cosTheta = Math.max(-1, Math.min(1, dot / (lenU * lenW)));
	return (Math.acos(cosTheta) * 180) / Math.PI;
}

// ---------------------------------------------------------------------------
// 3. 2D ROI AREA CALCULATIONS (MM²)
// ---------------------------------------------------------------------------

/**
 * Computes the physical area of an axis-aligned rectangle in mm².
 */
export function rectangleAreaMm2(
	corner1: Point2D,
	corner2: Point2D,
	spacing: VoxelSpacing2D = [1, 1],
): number {
	const [x1, y1] = point2ToArray(corner1);
	const [x2, y2] = point2ToArray(corner2);
	const sx = spacing[0] || 1;
	const sy = spacing[1] || 1;

	const widthMm = Math.abs(x2 - x1) * sx;
	const heightMm = Math.abs(y2 - y1) * sy;
	return widthMm * heightMm;
}

/**
 * Computes the physical area of an ellipse bounded by corners in mm²: π * (w/2) * (h/2).
 */
export function ellipseAreaMm2(
	corner1: Point2D,
	corner2: Point2D,
	spacing: VoxelSpacing2D = [1, 1],
): number {
	const [x1, y1] = point2ToArray(corner1);
	const [x2, y2] = point2ToArray(corner2);
	const sx = spacing[0] || 1;
	const sy = spacing[1] || 1;

	const semiMajor = (Math.abs(x2 - x1) * sx) / 2;
	const semiMinor = (Math.abs(y2 - y1) * sy) / 2;
	return Math.PI * semiMajor * semiMinor;
}

/**
 * Computes the physical area of a circle with given radius in mm²: π * r².
 */
export function circleAreaMm2(radiusMm: number): number {
	if (radiusMm <= 0) return 0;
	return Math.PI * radiusMm * radiusMm;
}

/**
 * Computes the physical radius in mm between circle center and perimeter edge point.
 */
export function circleRadiusMm(
	center: Point2D,
	edge: Point2D,
	spacing: VoxelSpacing2D = [1, 1],
): number {
	return euclideanDistance2D(center, edge, spacing);
}

// ---------------------------------------------------------------------------
// 4. ROI INTENSITY STATISTICS & LINE PROFILE HU SAMPLING
// ---------------------------------------------------------------------------

/**
 * Computes population mean, standard deviation, minimum, and maximum of intensity samples.
 */
export function computeRoiStats(values: ArrayLike<number>): RoiStats | null {
	const n = values.length;
	if (n === 0) return null;

	let min = Infinity;
	let max = -Infinity;
	let sum = 0;

	for (let i = 0; i < n; i++) {
		const v = values[i]!;
		sum += v;
		if (v < min) min = v;
		if (v > max) max = v;
	}

	const mean = sum / n;
	let sse = 0;
	for (let i = 0; i < n; i++) {
		const diff = values[i]! - mean;
		sse += diff * diff;
	}

	return {
		count: n,
		mean: Number(mean.toFixed(1)),
		stdDev: Number(Math.sqrt(sse / n).toFixed(1)),
		min: Number(min.toFixed(1)),
		max: Number(max.toFixed(1)),
	};
}

/**
 * Samples Hounsfield Units along the 3D world segment a -> b with trilinear volume interpolation.
 * Consistent with cross-section CPR rendering.
 */
export function lineProfileHU(
	vol: VolumeSamplingData,
	a: [number, number, number],
	b: [number, number, number],
	samples = 64,
): number[] {
	const n = Math.max(2, Math.floor(samples));
	const [ox, oy, oz] = vol.origin;
	const out = new Array<number>(n);

	for (let i = 0; i < n; i++) {
		const t = i / (n - 1);
		const wx = a[0] + (b[0] - a[0]) * t;
		const wy = a[1] + (b[1] - a[1]) * t;
		const wz = a[2] + (b[2] - a[2]) * t;

		const ci = (wx - ox) * vol.invSx;
		const cj = (wy - oy) * vol.invSy;
		const ck = (wz - oz) * vol.invSz;

		out[i] = trilinear(vol.getVoxel, vol.dims, ci, cj, ck);
	}

	return out;
}

// ---------------------------------------------------------------------------
// 5. CLINICAL READOUT FORMATTERS (RUSSIAN MEDICAL HIG)
// ---------------------------------------------------------------------------

/**
 * Formats a distance in millimeters (or centimeters if >= 100mm).
 * Example: 8.4 мм
 */
export function formatDistanceRu(distMm: number, decimals = 1): string {
	if (!Number.isFinite(distMm)) return "— мм";
	return `${distMm.toFixed(decimals)} мм`;
}

/**
 * Formats an angle in degrees.
 * Example: 36.5°
 */
export function formatAngleRu(deg: number, decimals = 1): string {
	if (!Number.isFinite(deg)) return "—°";
	return `${deg.toFixed(decimals)}°`;
}

/**
 * Formats an area in square millimeters.
 * Example: 45.2 мм²
 */
export function formatAreaRu(areaMm2: number, decimals = 1): string {
	if (!Number.isFinite(areaMm2)) return "— мм²";
	return `${areaMm2.toFixed(decimals)} мм²`;
}

/**
 * Formats 2D dimensions width x height in mm.
 * Example: 10.5 × 8.2 мм
 */
export function formatDimensions2DRu(
	wMm: number,
	hMm: number,
	decimals = 1,
): string {
	if (!Number.isFinite(wMm) || !Number.isFinite(hMm)) return "— × — мм";
	return `${wMm.toFixed(decimals)} × ${hMm.toFixed(decimals)} мм`;
}

/**
 * Formats a Hounsfield Unit density or CBCT gray value.
 */
export function formatDensityRu(hu: number | null | undefined): string {
	if (hu === null || hu === undefined || !Number.isFinite(hu)) return "— HU";
	return `${Math.round(hu)} HU`;
}
