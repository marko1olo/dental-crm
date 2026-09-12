/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & CBCT: AUTOMATIC DENTAL ARCH DETECTION (RANSAC)
 * ═══════════════════════════════════════════════════════════════════════════
 * Automatic dental arch-curve detection via:
 * 1. Axial slab Max-Intensity Projection (MIP)
 * 2. Cortical bone density thresholding (HU > 400 for alveolar ridge and teeth)
 * 3. Radial ray tracing across anterior arc
 * 4. Parabolic RANSAC curve estimation & inlier least-squares refinement
 * 5. Arc-length reparameterization to 9 Catmull-Rom control points
 *
 * Adapted from DenCT core/archDetect.ts for dental outpatient chairside care.
 * Pure TypeScript, zero external dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { resampleByArcLength, type Point2 } from "./archCurve.js";
import type { VolumeSamplingData } from "./cprMath.js";

export interface ArchDetectOptions {
	/** World Z of the slab centre (e.g. axial focal point in mm). Default: mid-Z. */
	focalWorldZ?: number;
	/** Half-thickness of the projected slab in mm. Default: 6 mm. */
	slabHalfMm?: number;
	/** Bone threshold in HU. Default: 400 HU (alveolar cortical bone / teeth). */
	boneThreshold?: number;
	/** Number of control points to emit. Default: 9. */
	numControlPoints?: number;
	/** Angular half-span of the swept arc from anterior in degrees. Default: 115°. */
	angularSpanDeg?: number;
	/** Enable RANSAC parabolic outlier rejection. Default: true. */
	useRansac?: boolean;
	/** Inlier distance threshold in mm for RANSAC. Default: 3.0 mm. */
	ransacThresholdMm?: number;
	/** Max RANSAC iterations. Default: 150. */
	ransacIterations?: number;
}

export interface ParabolaFitResult {
	/** Coefficient a for y = a*x^2 + b*x + c */
	a: number;
	/** Coefficient b for y = a*x^2 + b*x + c */
	b: number;
	/** Coefficient c for y = a*x^2 + b*x + c */
	c: number;
	inliers: Point2[];
	inlierRatio: number;
}

// ── RANSAC Parabolic Arch Fitting ──────────────────────────────

/**
 * Fits a parabola y = a*x^2 + b*x + c to 3 distinct 2D points.
 * Returns null if points are collinear or x coordinates are degenerate.
 */
export function solveParabola3Points(
	p1: Point2,
	p2: Point2,
	p3: Point2,
): { a: number; b: number; c: number } | null {
	const [x1, y1] = p1;
	const [x2, y2] = p2;
	const [x3, y3] = p3;

	const dx12 = x2 - x1;
	const dx23 = x3 - x2;
	const dx13 = x3 - x1;

	if (
		Math.abs(dx12) < 1e-6 ||
		Math.abs(dx23) < 1e-6 ||
		Math.abs(dx13) < 1e-6
	) {
		return null;
	}

	const s12 = (y2 - y1) / dx12;
	const s23 = (y3 - y2) / dx23;
	const a = (s23 - s12) / dx13;
	const b = s12 - a * (x1 + x2);
	const c = y1 - a * x1 * x1 - b * x1;

	return { a, b, c };
}

/**
 * Refines parabola coefficients y = a*x^2 + b*x + c on a set of points using Linear Least Squares.
 */
export function fitParabolaLeastSquares(
	points: Point2[],
): { a: number; b: number; c: number } | null {
	const n = points.length;
	if (n < 3) return null;

	let s4 = 0,
		s3 = 0,
		s2 = 0,
		s1 = 0,
		s0 = n;
	let sy2 = 0,
		sy1 = 0,
		sy0 = 0;

	for (let i = 0; i < n; i++) {
		const x = points[i]![0];
		const y = points[i]![1];
		const x2 = x * x;
		s4 += x2 * x2;
		s3 += x2 * x;
		s2 += x2;
		s1 += x;
		sy2 += x2 * y;
		sy1 += x * y;
		sy0 += y;
	}

	// Solve 3x3 normal equations using Cramer's rule:
	// [ s4 s3 s2 ] [ a ]   [ sy2 ]
	// [ s3 s2 s1 ] [ b ] = [ sy1 ]
	// [ s2 s1 s0 ] [ c ]   [ sy0 ]
	const det =
		s4 * (s2 * s0 - s1 * s1) -
		s3 * (s3 * s0 - s1 * s2) +
		s2 * (s3 * s1 - s2 * s2);

	if (Math.abs(det) < 1e-9) return null;

	const detA =
		sy2 * (s2 * s0 - s1 * s1) -
		s3 * (sy1 * s0 - s1 * sy0) +
		s2 * (sy1 * s1 - s2 * sy0);
	const detB =
		s4 * (sy1 * s0 - s1 * sy0) -
		sy2 * (s3 * s0 - s1 * s2) +
		s2 * (s3 * sy0 - sy1 * s2);
	const detC =
		s4 * (s2 * sy0 - sy1 * s1) -
		s3 * (s3 * sy0 - sy1 * s2) +
		sy2 * (s3 * s1 - s2 * s2);

	return {
		a: detA / det,
		b: detB / det,
		c: detC / det,
	};
}

/**
 * Estimates optimal dental arch parabola via RANSAC robust estimator.
 * Dental arch opens posteriorly (+Y in LPS), requiring curvature a > 0.
 */
export function ransacParabolicArchFit(
	points: Point2[],
	distanceThresholdMm = 3.0,
	maxIterations = 150,
): ParabolaFitResult | null {
	const n = points.length;
	if (n < 5) return null;

	let bestInliers: Point2[] = [];
	let bestA = 0;
	let bestB = 0;
	let bestC = 0;

	// Deterministic pseudo-random sequence for repeatability
	let seed = 123456789;
	const pseudoRandom = () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return seed / 4294967296;
	};

	for (let iter = 0; iter < maxIterations; iter++) {
		const i1 = Math.floor(pseudoRandom() * n);
		let i2 = Math.floor(pseudoRandom() * n);
		let i3 = Math.floor(pseudoRandom() * n);
		if (i2 === i1) i2 = (i1 + 1) % n;
		if (i3 === i1 || i3 === i2) i3 = (i1 + 2) % n;

		const model = solveParabola3Points(points[i1]!, points[i2]!, points[i3]!);
		// In LPS coordinates, dental arch horseshoe opens posteriorly (+Y), so a > 0
		if (!model || model.a <= 0 || model.a > 0.1) continue;

		const currentInliers: Point2[] = [];
		for (let i = 0; i < n; i++) {
			const [px, py] = points[i]!;
			const expectedY = model.a * px * px + model.b * px + model.c;
			const dy = Math.abs(py - expectedY);
			// Approximate orthogonal distance
			const slope = 2 * model.a * px + model.b;
			const dist = dy / Math.sqrt(1 + slope * slope);

			if (dist <= distanceThresholdMm) {
				currentInliers.push(points[i]!);
			}
		}

		if (currentInliers.length > bestInliers.length) {
			bestInliers = currentInliers;
			bestA = model.a;
			bestB = model.b;
			bestC = model.c;
		}
	}

	if (bestInliers.length < Math.max(4, Math.floor(n * 0.3))) {
		return null;
	}

	// Refine model parameters using all inliers via Linear Least Squares
	const refined = fitParabolaLeastSquares(bestInliers);
	if (refined && refined.a > 0) {
		bestA = refined.a;
		bestB = refined.b;
		bestC = refined.c;
	}

	return {
		a: bestA,
		b: bestB,
		c: bestC,
		inliers: bestInliers,
		inlierRatio: bestInliers.length / n,
	};
}

/** Symmetric moving-average smoothing of a 2D polyline */
export function smoothPolyline(pts: Point2[], radius: number): Point2[] {
	const n = pts.length;
	if (radius < 1 || n < 3) return pts;
	const out: Point2[] = [];
	for (let i = 0; i < n; i++) {
		let sx = 0;
		let sy = 0;
		let c = 0;
		for (let k = -radius; k <= radius; k++) {
			const idx = i + k;
			if (idx < 0 || idx >= n) continue;
			sx += pts[idx]![0];
			sy += pts[idx]![1];
			c++;
		}
		out.push([sx / c, sy / c]);
	}
	return out;
}

// ── Main Arch Detection Entrypoint ─────────────────────────────

/**
 * Automatically estimates dental arch Catmull-Rom control points from a CT/CBCT volume.
 *
 * Algorithm:
 * 1. Max-intensity projects an axial slab around focalWorldZ.
 * 2. Thresholds bone voxels (HU > boneThreshold, default 400).
 * 3. Computes the bone centroid.
 * 4. Sweeps rays outward across the anterior arc to identify peak bone density coordinates.
 * 5. Optionally applies RANSAC parabolic fitting to filter outliers/noise.
 * 6. Smooths and resamples the resulting curve to `numControlPoints` (default 9).
 *
 * Returns null if the slab contains insufficient bone or cannot establish a stable curve.
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
		useRansac = true,
		ransacThresholdMm = 3.0,
		ransacIterations = 150,
	} = opts;

	const [nx, ny, nz] = vol.dims;
	const [ox, oy, oz] = vol.origin;
	const sx = 1 / vol.invSx;
	const sy = 1 / vol.invSy;
	const sz = 1 / vol.invSz;
	if (nx < 4 || ny < 4 || nz < 1) return null;

	// Slab index range around the focal Z coordinate
	const focalZ = opts.focalWorldZ ?? (vol.zMin + vol.zMax) / 2;
	const kCenter = Math.round((focalZ - oz) / sz);
	const kHalf = Math.max(0, Math.round(slabHalfMm / Math.abs(sz)));
	const kLo = Math.max(0, kCenter - kHalf);
	const kHi = Math.min(nz - 1, kCenter + kHalf);
	if (kLo > kHi) return null;

	// 1. Max-intensity projection (MIP) over the slab
	const mip = new Float32Array(nx * ny);
	for (let k = kLo; k <= kHi; k++) {
		for (let j = 0; j < ny; j++) {
			const row = j * nx;
			for (let i = 0; i < nx; i++) {
				const v = vol.getVoxel(i, j, k);
				if (v > mip[row + i]!) {
					mip[row + i] = v;
				}
			}
		}
	}

	// 2. Bone centroid computation (weighted by thresholded bone mask)
	let sumI = 0;
	let sumJ = 0;
	let count = 0;
	for (let j = 0; j < ny; j++) {
		const row = j * nx;
		for (let i = 0; i < nx; i++) {
			if (mip[row + i]! > boneThreshold) {
				sumI += i;
				sumJ += j;
				count++;
			}
		}
	}

	// Minimum density requirement: at least 50 voxels or 0.2% of the slice
	if (count < Math.max(50, nx * ny * 0.002)) return null;

	const ci = sumI / count;
	const cj = sumJ / count;
	const cxw = ox + ci * sx;
	const cyw = oy + cj * sy;

	// Bilinear sampling of MIP map at fractional index coordinates
	const sampleMip = (fi: number, fj: number): number => {
		if (fi < 0 || fj < 0 || fi > nx - 1 || fj > ny - 1) return 0;
		const i0 = Math.floor(fi);
		const j0 = Math.floor(fj);
		const i1 = Math.min(nx - 1, i0 + 1);
		const j1 = Math.min(ny - 1, j0 + 1);
		const ti = fi - i0;
		const tj = fj - j0;

		const a = mip[j0 * nx + i0]!;
		const b = mip[j0 * nx + i1]!;
		const c = mip[j1 * nx + i0]!;
		const d = mip[j1 * nx + i1]!;
		return (a * (1 - ti) + b * ti) * (1 - tj) + (c * (1 - ti) + d * ti) * tj;
	};

	// 3. Radial sweep across anterior arc
	const spanRad = (angularSpanDeg * Math.PI) / 180;
	const stepRad = (1.5 * Math.PI) / 180;
	const rMin = 4; // mm
	const rMax = 0.48 * Math.min(nx * sx, ny * sy); // mm
	const rStep = Math.max(0.5, Math.min(sx, sy)); // mm
	const band: Point2[] = [];

	for (let phi = -spanRad; phi <= spanRad + 1e-6; phi += stepRad) {
		const dx = Math.sin(phi);
		const dy = -Math.cos(phi);
		let bestR = -1;
		let bestV = boneThreshold;

		for (let r = rMin; r <= rMax; r += rStep) {
			const wx = cxw + r * dx;
			const wy = cyw + r * dy;
			const v = sampleMip((wx - ox) / sx, (wy - oy) / sy);
			if (v > bestV) {
				bestV = v;
				bestR = r;
			}
		}

		if (bestR > 0) {
			band.push([cxw + bestR * dx, cyw + bestR * dy]);
		}
	}

	if (band.length < 5) return null;

	let processedBand = band;

	// 4. Parabolic RANSAC outlier elimination
	if (useRansac && band.length >= 8) {
		const ransacResult = ransacParabolicArchFit(
			band,
			ransacThresholdMm,
			ransacIterations,
		);
		if (ransacResult && ransacResult.inliers.length >= 5) {
			// Sort inliers by ray angle from patient right to patient left
			processedBand = [...ransacResult.inliers].sort((p1, p2) => {
				const ang1 = Math.atan2(p1[0] - cxw, -(p1[1] - cyw));
				const ang2 = Math.atan2(p2[0] - cxw, -(p2[1] - cyw));
				return ang1 - ang2;
			});
		}
	}

	// 5. Moving-average smoothing and arc-length resampling
	const smoothed = smoothPolyline(processedBand, 2);
	const cps = resampleByArcLength(smoothed, numControlPoints);
	return cps.length === numControlPoints ? cps : null;
}
