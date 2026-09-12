/**
 * CLINICAL RADIOLOGY & CBCT: AUTOMATIC DENTAL ARCH CURVE DETECTION ENGINE
 *
 * Pure mathematical heuristic algorithm for automatic detection of the dental
 * arch curve from volumetric CBCT datasets.
 *
 * Method:
 * 1. Max-Intensity Projection (MIP) of an axial slab around focalWorldZ (+/- slabHalfMm)
 *    to generate a 2D bone-density projection matrix M(i, j).
 * 2. Weighted centroid of cortical bone voxels exceeding boneThreshold (default 400 HU)
 *    to locate the center of the dental arch in world coordinates (cxw, cyw).
 * 3. Radial ray sweeping from the centroid across the anterior arc [-angularSpanDeg, +angularSpanDeg]
 *    (in LPS coordinates: anterior is -Y, patient right is -X, patient left is +X).
 *    Along each ray, marches outward to find the radius of peak bone/teeth density.
 * 4. Moving-average smoothing (smoothPolyline) to suppress spatial noise.
 * 5. Uniform arc-length resampling into numControlPoints (default 9) Catmull-Rom
 *    control points ordered patient-right -> anterior -> patient-left in LPS mm.
 * 6. Safe fallbacks returning null if bone density or geometry is insufficient or degenerate.
 *
 * Single Source of Truth (SSOT) for arch detection (Wave 124 & Wave 136 consolidation).
 * Pure TypeScript, zero DOM/Cornerstone dependencies, 100% unit-testable.
 */

import { z } from "zod";
import type { Point2, VolumeSamplingData } from "./cprMath.js";
import {
	AIR_HU,
	generateDefaultArchCurve,
	resampleByArcLength,
} from "./cprPanoramicEngine.js";

// ── 1. Geometric Primitive Types & Schemas ─────────────────────────────────

export const point2Schema = z.tuple([z.number(), z.number()]);
export type { Point2, VolumeSamplingData };

// ── 2. Arch Detection Options & Schemas ────────────────────────────────────

export const archDetectOptionsSchema = z.object({
	/** World Z of the slab centre in mm (LPS). Default: volume mid-Z */
	focalWorldZ: z.number().optional(),
	/** Half-thickness of the projected axial slab in mm. Default: 6 mm */
	slabHalfMm: z.number().positive().optional().default(6),
	/** Bone density threshold in HU/GV. Default: 400 HU (cortical bone/teeth) */
	boneThreshold: z.number().optional().default(400),
	/** Number of Catmull-Rom control points to emit. Default: 9 */
	numControlPoints: z.number().int().min(3).max(64).optional().default(9),
	/** Angular half-span of the swept arc from anterior in degrees. Default: 115 */
	angularSpanDeg: z.number().min(10).max(180).optional().default(115),
});

export type ArchDetectInputOptions = z.input<typeof archDetectOptionsSchema>;
export type ArchDetectOptions = z.input<typeof archDetectOptionsSchema>;
export type ArchDetectResolvedOptions = z.output<typeof archDetectOptionsSchema>;

/**
 * Symmetric moving-average smoothing of a 2D polyline (radius in samples).
 * Operates on [X, Y] coordinates to smooth out spatial jitter while preserving endpoints.
 */
export function smoothPolyline(pts: Point2[], radius = 2): Point2[] {
	const n = pts.length;
	if (radius < 1 || n < 3) return [...pts];

	const out: Point2[] = [];
	for (let i = 0; i < n; i++) {
		let sx = 0;
		let sy = 0;
		let c = 0;
		for (let k = -radius; k <= radius; k++) {
			const idx = i + k;
			if (idx >= 0 && idx < n) {
				const pt = pts[idx];
				if (pt) {
					sx += pt[0];
					sy += pt[1];
					c++;
				}
			}
		}
		out.push([sx / c, sy / c]);
	}
	return out;
}

/**
 * Automatically estimates dental arch Catmull-Rom control points from a CBCT volume.
 *
 * Coordinates are returned in world XY (mm, LPS), ordered from:
 * patient right (-X) -> anterior (-Y) -> patient left (+X).
 *
 * Returns null when the volume/slab contains insufficient bone density or when
 * the geometry is degenerate, enabling non-blocking fallback to manual arch placement.
 */
export function detectArchControlPoints(
	vol: VolumeSamplingData,
	opts: ArchDetectOptions = {},
): Point2[] | null {
	const parsed = archDetectOptionsSchema.safeParse(opts ?? {});
	if (!parsed.success) return null;
	const {
		slabHalfMm,
		boneThreshold,
		numControlPoints,
		angularSpanDeg,
	} = parsed.data;

	const [nx, ny, nz] = vol.dims;
	const [ox, oy, oz] = vol.origin;
	const sx = 1 / vol.invSx;
	const sy = 1 / vol.invSy;
	const sz = 1 / vol.invSz;

	if (nx < 4 || ny < 4 || nz < 1) return null;

	// Slab index range around the focal Z
	const focalZ = parsed.data.focalWorldZ ?? (vol.zMin + vol.zMax) / 2;
	const kCenter = Math.round((focalZ - oz) / sz);
	const kHalf = Math.max(0, Math.round(slabHalfMm / Math.abs(sz)));
	const kLo = Math.max(0, kCenter - kHalf);
	const kHi = Math.min(nz - 1, kCenter + kHalf);

	if (kLo > kHi) return null;

	// 1. Max-intensity projection (MIP) over the axial slab -> M(i, j)
	const M = new Float32Array(nx * ny);
	for (let k = kLo; k <= kHi; k++) {
		for (let j = 0; j < ny; j++) {
			const row = j * nx;
			for (let i = 0; i < nx; i++) {
				const v = vol.getVoxel(i, j, k);
				const idx = row + i;
				if (v > M[idx]!) {
					M[idx] = v;
				}
			}
		}
	}

	// 2. Bone centroid (index space, weighted uniformly over thresholded mask)
	let sumI = 0;
	let sumJ = 0;
	let count = 0;
	for (let j = 0; j < ny; j++) {
		const row = j * nx;
		for (let i = 0; i < nx; i++) {
			const val = M[row + i]!;
			if (val > boneThreshold) {
				sumI += i;
				sumJ += j;
				count++;
			}
		}
	}

	// Guard: Require meaningful bone density to trust centroid and ray tracing
	// Must have at least 50 bone voxels and at least 0.2% of the axial slice area
	if (count < Math.max(50, nx * ny * 0.002)) return null;

	const ci = sumI / count;
	const cj = sumJ / count;
	const cxw = ox + ci * sx;
	const cyw = oy + cj * sy;

	// Bilinear interpolation of M at continuous index coordinates (0 outside volume)
	const sampleM = (fi: number, fj: number): number => {
		if (fi < 0 || fj < 0 || fi > nx - 1 || fj > ny - 1) return 0;
		const i0 = Math.floor(fi);
		const j0 = Math.floor(fj);
		const i1 = Math.min(nx - 1, i0 + 1);
		const j1 = Math.min(ny - 1, j0 + 1);
		const ti = fi - i0;
		const tj = fj - j0;
		const a = M[j0 * nx + i0] ?? 0;
		const b = M[j0 * nx + i1] ?? 0;
		const c = M[j1 * nx + i0] ?? 0;
		const d = M[j1 * nx + i1] ?? 0;
		return (a * (1 - ti) + b * ti) * (1 - tj) + (c * (1 - ti) + d * ti) * tj;
	};

	// 3. Radial ray sweep across anterior arc
	// In LPS coordinates: anterior is -Y, patient right is -X, patient left is +X
	// phi = 0 points anteriorly (dx = 0, dy = -1)
	// phi < 0 points toward patient right (-X)
	// phi > 0 points toward patient left (+X)
	const spanRad = (angularSpanDeg * Math.PI) / 180;
	const stepRad = (1.5 * Math.PI) / 180;
	const rMin = 4; // mm minimum search radius from centroid
	const rMax = 0.48 * Math.min(nx * sx, ny * sy); // mm maximum search radius
	const rStep = Math.max(0.5, Math.min(sx, sy)); // mm step size along ray

	const band: Point2[] = [];

	for (let phi = -spanRad; phi <= spanRad + 1e-6; phi += stepRad) {
		const dx = Math.sin(phi);
		const dy = -Math.cos(phi);
		let bestR = -1;
		let bestV = boneThreshold;

		for (let r = rMin; r <= rMax; r += rStep) {
			const wx = cxw + r * dx;
			const wy = cyw + r * dy;
			const v = sampleM((wx - ox) / sx, (wy - oy) / sy);
			if (v > bestV) {
				bestV = v;
				bestR = r;
			}
		}

		if (bestR > 0) {
			band.push([cxw + bestR * dx, cyw + bestR * dy]);
		}
	}

	// Guard: Need at least 5 traced points along the alveolar ridge
	if (band.length < 5) return null;

	// 4. Moving-average smoothing
	const smoothed = smoothPolyline(band, 2);

	// 5. Arc-length uniform resampling to numControlPoints
	const cps = resampleByArcLength(smoothed, numControlPoints);

	return cps.length === numControlPoints ? cps : null;
}

/**
 * Convenience entry point for automatic dental arch detection from raw volume data array.
 * Samples an axial slab around mid-Z using Maximum Intensity Projection (MIP), computes
 * the weighted bone centroid, and performs a radial sweep across the anterior dental arc.
 *
 * Fallback: If bone density is insufficient or geometry is degenerate, returns the
 * canonical default anatomical dental arch curve (Mandates 8e, 8k, 8n - Zero Dead-Ends).
 */
export function autoDetectDentalArch(
	volumeData: Float32Array | Int16Array,
	dims: [number, number, number],
	spacing: [number, number, number],
	options?: ArchDetectOptions,
): Point2[] {
	const [nx, ny, nz] = dims;
	if (nx < 4 || ny < 4 || nz < 1) {
		const center: Point2 = [(nx * spacing[0]) / 2, (ny * spacing[1]) / 2];
		const size: Point2 = [nx * spacing[0], ny * spacing[1]];
		return generateDefaultArchCurve(center, size);
	}

	const sliceStride = nx * ny;
	const invSx = 1 / spacing[0];
	const invSy = 1 / spacing[1];
	const invSz = 1 / spacing[2];
	const zMin = 0;
	const zMax = (nz - 1) * Math.abs(spacing[2]);
	const vSpacing = Math.abs(spacing[2]);

	const vol: VolumeSamplingData = {
		dims,
		origin: [0, 0, 0],
		invSx,
		invSy,
		invSz,
		zMin,
		zMax,
		vSpacing,
		getVoxel: (i: number, j: number, k: number) => {
			if (i < 0 || i >= nx || j < 0 || j >= ny || k < 0 || k >= nz) {
				return AIR_HU;
			}
			const idx = k * sliceStride + j * nx + i;
			return volumeData[idx] ?? AIR_HU;
		},
	};

	const detected = detectArchControlPoints(vol, options);
	if (detected && detected.length >= 7) {
		return detected;
	}

	// Canonical fallback: default dental arch curve scaled to the volume FOV
	const center: Point2 = [(nx * spacing[0]) / 2, (ny * spacing[1]) / 2];
	const size: Point2 = [nx * spacing[0], ny * spacing[1]];
	return generateDefaultArchCurve(center, size);
}
