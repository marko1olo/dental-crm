/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: AUTOMATIC DENTAL ARCH CURVE DETECTION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical heuristic algorithm for automatic detection of the dental
 * arch curve from volumetric CBCT datasets.
 *
 * Algorithm Overview:
 * 1. Axial Slab Max-Intensity Projection (MIP):
 *    Extracts an axial slab around focalWorldZ (+/- slabHalfMm) to generate
 *    a 2D bone-density projection M(i, j).
 * 2. Cortical Bone Mask Centroid:
 *    Calculates the weighted centroid of voxels above boneThreshold (default 400 HU)
 *    to pinpoint the center of the arch in world coordinates (cxw, cyw).
 * 3. Radial Ray Sweeping (Anterior Arc):
 *    Sweeps angular rays over [-angularSpanDeg, +angularSpanDeg] relative to
 *    anterior direction (-Y in LPS). Along each ray, searches outward to locate
 *    the peak bone density corresponding to the alveolar ridge and dentition.
 * 4. Moving-Average Polyline Smoothing:
 *    Applies symmetric windowed smoothing (smoothPolyline) to suppress noise.
 * 5. Uniform Arc-Length Resampling:
 *    Resamples the smoothed ridge contour into N Catmull-Rom control points
 *    (default 9) ordered patient-right -> anterior -> patient-left.
 * 6. Degenerate Geometry Guards:
 *    Returns null when bone count < 50, bone area < 0.2% of slice, or traced
 *    ridge band < 5 samples, allowing safe clinical fallback to manual curve.
 *
 * Adapted from Dental-CBCT-Viewer reference core/archDetect.ts (Wave 121).
 * Pure TypeScript, zero DOM/Cornerstone dependencies, 100% unit-testable.
 * Standard LPS coordinate convention (+X Left, +Y Posterior, +Z Superior).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Point2, VolumeSamplingData } from "./cprMath.js";
import { resampleByArcLength } from "./panoramicCprMath.js";

/** Configuration options for automatic dental arch detection */
export interface ArchDetectOptions {
	/** World Z of the slab centre (e.g. the axial focal point in mm). Default: mid-Z. */
	focalWorldZ?: number;
	/** Half-thickness of the projected slab in mm. Default: 6. */
	slabHalfMm?: number;
	/** Bone threshold in stored HU/GV. Default: 400 (alveolar cortical bone / teeth). */
	boneThreshold?: number;
	/** Number of Catmull-Rom control points to emit. Default: 9. */
	numControlPoints?: number;
	/** Angular half-span of the swept arc from anterior, in degrees. Default: 115. */
	angularSpanDeg?: number;
}

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
	const {
		slabHalfMm = 6,
		boneThreshold = 400,
		numControlPoints = 9,
		angularSpanDeg = 115,
	} = opts;

	const [nx, ny, nz] = vol.dims;
	const [ox, oy, oz] = vol.origin;
	const sx = 1 / vol.invSx;
	const sy = 1 / vol.invSy;
	const sz = 1 / vol.invSz;

	if (nx < 4 || ny < 4 || nz < 1) return null;

	// Slab index range around the focal Z
	const focalZ = opts.focalWorldZ ?? (vol.zMin + vol.zMax) / 2;
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
