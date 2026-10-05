/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT RADIOLOGY: ENDODONTIC ROOT CANAL FRANGI TUBENESS ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * High-precision 3D differential geometry engine for detecting and segmenting
 * endodontic root canal lumens in dental Cone-Beam CT (CBCT) datasets.
 *
 * Implements:
 * 1. 3D Multiscale Hessian Tensor H_sigma over spatial scales sigma in {0.35, 0.60, 0.90} mm
 *    with Lindeberg normalized second spatial derivatives (sigma^2 * H).
 * 2. Closed-form analytical eigensolver for 3x3 real symmetric matrices using the
 *    Cardano / Viète trigonometric formulation, sorting |lambda_1| <= |lambda_2| <= |lambda_3|
 *    and computing orthonormal eigenvectors (v1 = canal tangent axis, v2, v3 = cross-section).
 * 3. Frangi 3D Tubeness Filter formulated for hypodense (dark) cylindrical lumens
 *    embedded inside radiopaque (hyperdense) radicular dentin:
 *    - lambda_2 > 0, lambda_3 > 0, lambda_1 ~= 0
 *    - R_A = |lambda_2| / |lambda_3| (cross-sectional circularity)
 *    - R_B = |lambda_1| / sqrt(|lambda_2 * lambda_3|) (blobness suppression)
 *    - S = sqrt(lambda_1^2 + lambda_2^2 + lambda_3^2) (Frobenius structuredness)
 *    - V_sigma = (1 - exp(-R_A^2 / (2*alpha^2))) * exp(-R_B^2 / (2*beta^2)) * (1 - exp(-S^2 / (2*c^2)))
 * 4. Anatomical Dentin Mask HU in [750, 1650] HU to prevent false vesselness leakage
 *    into the periodontal ligament space (PDL), periapical lesions, or spongy bone marrow.
 *
 * Standards: ITI Endodontic Guidelines, ESE (European Society of Endodontology) CBCT Consensus,
 * Order 804n / Form 043/u.
 * 100% pure TypeScript, zero loose any, zero DOM/UI dependencies, deterministic and testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Vec3 } from "./implantGeometryEngine.js";
import type { VolumeDimensions, VolumeSpacingMm, CbctVoxelVolume } from "./cbctCropBox.js";

export type { Vec3 };

// ── Zod Schemas & Strict Data Contracts ──────────────────────────

export const FrangiParametersSchema = z.object({
	/** Sensitivity parameter for cross-sectional circularity R_A (default: 0.5) */
	alpha: z.number().positive().default(0.5),
	/** Sensitivity parameter for blobness suppression R_B (default: 0.5) */
	beta: z.number().positive().default(0.5),
	/** Frobenius structuredness sensitivity c (half max Frobenius norm, default: 15.0) */
	c: z.number().positive().default(15.0),
	/** Multiscale Gaussian spatial standard deviations in mm (default: [0.35, 0.60, 0.90]) */
	scalesMm: z.array(z.number().positive()).min(1).default([0.35, 0.6, 0.9]),
	/** True if searching for dark lumen in bright tissue (endodontic canal in dentin) */
	darkTubeness: z.boolean().default(true),
});
export type FrangiParameters = z.infer<typeof FrangiParametersSchema>;

export const DentinThresholdsSchema = z.object({
	/** Lower bound of radicular dentin in HU (filters out periodontal ligament and spongy bone) */
	minDentinHU: z.number().default(750),
	/** Upper bound of radicular dentin in HU (enamel starts >= 1650-2000 HU) */
	maxDentinHU: z.number().default(1650),
	/** Maximum HU considered uncalcified canal lumen (pulp soft tissue / air) */
	maxLumenHU: z.number().default(650),
});
export type DentinThresholds = z.infer<typeof DentinThresholdsSchema>;

export const HessianMatrix3DSchema = z.object({
	xx: z.number(),
	yy: z.number(),
	zz: z.number(),
	xy: z.number(),
	xz: z.number(),
	yz: z.number(),
});
export type HessianMatrix3D = z.infer<typeof HessianMatrix3DSchema>;

export const EigenDecomposition3DSchema = z.object({
	/** Sorted eigenvalues: |lambda1| <= |lambda2| <= |lambda3| */
	eigenvalues: z.tuple([z.number(), z.number(), z.number()]),
	/** Corresponding orthonormal eigenvectors [v1, v2, v3] */
	eigenvectors: z.tuple([
		z.tuple([z.number(), z.number(), z.number()]),
		z.tuple([z.number(), z.number(), z.number()]),
		z.tuple([z.number(), z.number(), z.number()]),
	]),
});
export type EigenDecomposition3D = z.infer<typeof EigenDecomposition3DSchema>;

export const FrangiVoxelResponseSchema = z.object({
	/** Maximum Frangi tubeness response across all scales [0.0 .. 1.0] */
	tubeness: z.number().min(0).max(1),
	/** Scale sigma in mm that yielded maximum tubeness */
	bestScaleMm: z.number().nonnegative(),
	/** Unit tangent vector pointing along canal axis (eigenvector v1) */
	canalDirection: z.tuple([z.number(), z.number(), z.number()]),
	/** Sorted eigenvalues at the winning scale */
	eigenvalues: z.tuple([z.number(), z.number(), z.number()]),
	/** Frobenius structuredness norm S */
	structuredness: z.number().nonnegative(),
});
export type FrangiVoxelResponse = z.infer<typeof FrangiVoxelResponseSchema>;

/**
 * Result of computing the multiscale Frangi tubeness over a 3D subvolume.
 */
export interface FrangiVolumeResult {
	readonly dimensions: VolumeDimensions;
	readonly spacingMm: VolumeSpacingMm;
	/** Float32Array of Frangi tubeness values in [0..1], length = width * height * depth */
	readonly tubeness: Float32Array;
	/** Float32Array of optimal sigma scale (mm) at each voxel */
	readonly bestScaleMm: Float32Array;
	/** Float32Array of unit canal direction vectors: 3 floats per voxel [vx, vy, vz] */
	readonly directions: Float32Array;
	/** Binary mask (1 for dentin/canal lumen ROI, 0 for outside bone/air) */
	readonly dentinMask: Uint8Array;
	readonly parameters: FrangiParameters;
}

// ── Default Constants ────────────────────────────────────────────

export const DEFAULT_FRANGI_PARAMS: Readonly<FrangiParameters> = Object.freeze({
	alpha: 0.5,
	beta: 0.5,
	c: 15.0,
	scalesMm: [0.35, 0.6, 0.9],
	darkTubeness: true,
});

export const DEFAULT_DENTIN_THRESHOLDS: Readonly<DentinThresholds> = Object.freeze({
	minDentinHU: 750,
	maxDentinHU: 1650,
	maxLumenHU: 650,
});

// ── Dentin & Lumen Segmentation Filters ──────────────────────────

/**
 * Validates whether a voxel HU belongs to the radicular dentin range [750, 1650] HU.
 * Prevents false canal tracking into the periodontal ligament, spongy bone, or crown enamel.
 */
export function isDentinHU(hu: number, thresholds: DentinThresholds = DEFAULT_DENTIN_THRESHOLDS): boolean {
	return hu >= thresholds.minDentinHU && hu <= thresholds.maxDentinHU;
}

/**
 * Validates whether a voxel HU belongs to the uncalcified pulp/canal lumen range (< 650 HU).
 */
export function isCanalLumenHU(hu: number, thresholds: DentinThresholds = DEFAULT_DENTIN_THRESHOLDS): boolean {
	return hu <= thresholds.maxLumenHU && hu >= -400;
}

/**
 * Generates a binary dentin and root lumen envelope mask for a CBCT volume.
 * Voxels that are dentin or enclosed pulp canal are marked as 1, background is 0.
 */
export function computeDentinRootMask(
	data: Int16Array,
	dimensions: VolumeDimensions,
	thresholds: DentinThresholds = DEFAULT_DENTIN_THRESHOLDS,
): Uint8Array {
	const totalVoxels = dimensions.width * dimensions.height * dimensions.depth;
	const mask = new Uint8Array(totalVoxels);

	for (let i = 0; i < totalVoxels; i++) {
		const hu = data[i] ?? -1000;
		if (hu >= thresholds.minDentinHU && hu <= thresholds.maxDentinHU) {
			mask[i] = 1;
		}
	}

	return mask;
}

// ── Analytical 3x3 Symmetric Matrix Eigensolver ───────────────────

/**
 * Computes exact eigenvalues and eigenvectors of a 3x3 real symmetric matrix:
 *   [ xx  xy  xz ]
 *   [ xy  yy  yz ]
 *   [ xz  yz  zz ]
 *
 * Implements Cardano / Viète trigonometric solution of cubic characteristic polynomial.
 * Guarantees real eigenvalues sorted by absolute value: |lambda_1| <= |lambda_2| <= |lambda_3|.
 * Guarantees orthonormal eigenvectors [v1, v2, v3] where v1 corresponds to lambda_1.
 */
export function solveSymmetricEigenvalues3D(H: HessianMatrix3D): EigenDecomposition3D {
	const a11 = H.xx;
	const a22 = H.yy;
	const a33 = H.zz;
	const a12 = H.xy;
	const a13 = H.xz;
	const a23 = H.yz;

	// Trace and mean diagonal
	const q = (a11 + a22 + a33) / 3.0;

	// Shifted diagonal
	const b11 = a11 - q;
	const b22 = a22 - q;
	const b33 = a33 - q;

	// Variance / second invariant p
	const p = (b11 * b11 + b22 * b22 + b33 * b33 + 2.0 * (a12 * a12 + a13 * a13 + a23 * a23)) / 6.0;

	let rawEvals: [number, number, number];

	if (p < 1e-14) {
		// Matrix is essentially a multiple of identity
		rawEvals = [q, q, q];
	} else {
		// Determinant of B matrix = 0.5 * det(B)
		const r =
			0.5 *
			(b11 * (b22 * b33 - a23 * a23) -
				a12 * (a12 * b33 - a23 * a13) +
				a13 * (a12 * a23 - b22 * a13));

		const sqrtP = Math.sqrt(p);
		const p32 = p * sqrtP;
		let phi = r / p32;

		// Clamp numerical precision errors for acos
		if (phi <= -1.0) {
			phi = -1.0;
		} else if (phi >= 1.0) {
			phi = 1.0;
		}

		const theta = Math.acos(phi) / 3.0;
		const twoSqrtP = 2.0 * sqrtP;

		const e1 = q + twoSqrtP * Math.cos(theta);
		const e2 = q + twoSqrtP * Math.cos(theta + (2.0 * Math.PI) / 3.0);
		const e3 = q + twoSqrtP * Math.cos(theta + (4.0 * Math.PI) / 3.0);

		rawEvals = [e1, e2, e3];
	}

	// Sort indices such that |lambda_1| <= |lambda_2| <= |lambda_3|
	const sortedIndices = [0, 1, 2].sort((i, j) => {
		const absI = Math.abs(rawEvals[i] ?? 0);
		const absJ = Math.abs(rawEvals[j] ?? 0);
		return absI - absJ;
	});

	const lambda1 = rawEvals[sortedIndices[0] ?? 0] ?? 0;
	const lambda2 = rawEvals[sortedIndices[1] ?? 1] ?? 0;
	const lambda3 = rawEvals[sortedIndices[2] ?? 2] ?? 0;

	// Compute orthonormal eigenvectors for sorted eigenvalues
	const v1 = computeEigenvectorForEigenvalue(H, lambda1, [1, 0, 0]);
	let v2 = computeEigenvectorForEigenvalue(H, lambda2, [0, 1, 0]);

	// Gram-Schmidt orthogonalization: v2 = normalize(v2 - (v2 . v1) * v1)
	const dot21 = v2[0] * v1[0] + v2[1] * v1[1] + v2[2] * v1[2];
	v2 = [v2[0] - dot21 * v1[0], v2[1] - dot21 * v1[1], v2[2] - dot21 * v1[2]];
	const normV2 = Math.hypot(v2[0], v2[1], v2[2]);
	if (normV2 > 1e-8) {
		v2 = [v2[0] / normV2, v2[1] / normV2, v2[2] / normV2];
	} else {
		v2 = findPerpendicularUnitVector(v1);
	}

	// v3 = v1 x v2 to guarantee right-handed orthonormal coordinate triad
	const v3: Vec3 = [
		v1[1] * v2[2] - v1[2] * v2[1],
		v1[2] * v2[0] - v1[0] * v2[2],
		v1[0] * v2[1] - v1[1] * v2[0],
	];

	return {
		eigenvalues: [lambda1, lambda2, lambda3],
		eigenvectors: [v1, v2, v3],
	};
}

/**
 * Computes the unit eigenvector corresponding to a given eigenvalue of a 3x3 symmetric matrix.
 * Solves (H - lambda * I) * v = 0 via row cross products.
 */
function computeEigenvectorForEigenvalue(H: HessianMatrix3D, lambda: number, fallback: Vec3): Vec3 {
	const m00 = H.xx - lambda;
	const m01 = H.xy;
	const m02 = H.xz;

	const m10 = H.xy;
	const m11 = H.yy - lambda;
	const m12 = H.yz;

	const m20 = H.xz;
	const m21 = H.yz;
	const m22 = H.zz - lambda;

	// Cross products of pairs of rows
	// c0 = row0 x row1
	const c0x = m01 * m12 - m02 * m11;
	const c0y = m02 * m10 - m00 * m12;
	const c0z = m00 * m11 - m01 * m10;
	const norm0Sq = c0x * c0x + c0y * c0y + c0z * c0z;

	// c1 = row0 x row2
	const c1x = m01 * m22 - m02 * m21;
	const c1y = m02 * m20 - m00 * m22;
	const c1z = m00 * m21 - m01 * m20;
	const norm1Sq = c1x * c1x + c1y * c1y + c1z * c1z;

	// c2 = row1 x row2
	const c2x = m11 * m22 - m12 * m21;
	const c2y = m12 * m20 - m10 * m22;
	const c2z = m10 * m21 - m11 * m20;
	const norm2Sq = c2x * c2x + c2y * c2y + c2z * c2z;

	let bestX = c0x;
	let bestY = c0y;
	let bestZ = c0z;
	let maxNormSq = norm0Sq;

	if (norm1Sq > maxNormSq) {
		maxNormSq = norm1Sq;
		bestX = c1x;
		bestY = c1y;
		bestZ = c1z;
	}
	if (norm2Sq > maxNormSq) {
		maxNormSq = norm2Sq;
		bestX = c2x;
		bestY = c2y;
		bestZ = c2z;
	}

	if (maxNormSq > 1e-12) {
		const invLen = 1.0 / Math.sqrt(maxNormSq);
		return [bestX * invLen, bestY * invLen, bestZ * invLen];
	}

	return fallback;
}

/**
 * Finds an arbitrary unit vector perpendicular to a given vector v.
 */
function findPerpendicularUnitVector(v: Vec3): Vec3 {
	const absX = Math.abs(v[0]);
	const absY = Math.abs(v[1]);
	const absZ = Math.abs(v[2]);

	let perp: Vec3;
	if (absX <= absY && absX <= absZ) {
		perp = [0, -v[2], v[1]];
	} else if (absY <= absX && absY <= absZ) {
		perp = [-v[2], 0, v[0]];
	} else {
		perp = [-v[1], v[0], 0];
	}

	const len = Math.hypot(perp[0], perp[1], perp[2]);
	if (len < 1e-8) {
		return [1, 0, 0];
	}
	return [perp[0] / len, perp[1] / len, perp[2] / len];
}

// ── Frangi Tubeness Evaluation ───────────────────────────────────

/**
 * Evaluates the Frangi 3D tubeness response from sorted eigenvalues |lambda_1| <= |lambda_2| <= |lambda_3|.
 *
 * For hypodense/dark canal lumen inside bright dentin:
 * - Second derivatives perpendicular to canal axis must be positive (lambda_2 > 0, lambda_3 > 0).
 * - Intensity along the canal axis varies slowly (lambda_1 ~= 0).
 * - Cross-sectional eccentricity: R_A = |lambda_2| / |lambda_3|
 * - Blobness suppression: R_B = |lambda_1| / sqrt(|lambda_2 * lambda_3|)
 * - Frobenius structuredness: S = sqrt(lambda_1^2 + lambda_2^2 + lambda_3^2)
 */
export function computeFrangiTubenessFromEigenvalues(
	lambda1: number,
	lambda2: number,
	lambda3: number,
	params: FrangiParameters = DEFAULT_FRANGI_PARAMS,
): { tubeness: number; structuredness: number } {
	// Condition for dark tube in bright surrounding: lambda2 > 0 and lambda3 > 0
	if (params.darkTubeness) {
		if (lambda2 <= 0 || lambda3 <= 0) {
			return { tubeness: 0.0, structuredness: 0.0 };
		}
	} else {
		// Standard bright tube in dark surrounding: lambda2 < 0 and lambda3 < 0
		if (lambda2 >= 0 || lambda3 >= 0) {
			return { tubeness: 0.0, structuredness: 0.0 };
		}
	}

	const absL1 = Math.abs(lambda1);
	const absL2 = Math.abs(lambda2);
	const absL3 = Math.abs(lambda3);

	if (absL3 < 1e-8) {
		return { tubeness: 0.0, structuredness: 0.0 };
	}

	// R_A: Deviation from plate-like structure (for ideal tube, |lambda2| ~= |lambda3|, so R_A ~= 1)
	const Ra = absL2 / absL3;

	// R_B: Deviation from blob-like structure (for ideal tube, |lambda1| ~= 0, so R_B ~= 0)
	const denomRb = Math.sqrt(absL2 * absL3);
	const Rb = denomRb > 1e-8 ? absL1 / denomRb : 0.0;

	// S: Frobenius norm / structuredness (distinguishes canal from background noise)
	const S = Math.sqrt(lambda1 * lambda1 + lambda2 * lambda2 + lambda3 * lambda3);

	const twoAlphaSq = 2.0 * params.alpha * params.alpha;
	const twoBetaSq = 2.0 * params.beta * params.beta;
	const twoCSq = 2.0 * params.c * params.c;

	const termA = 1.0 - Math.exp(-(Ra * Ra) / twoAlphaSq);
	const termB = Math.exp(-(Rb * Rb) / twoBetaSq);
	const termC = 1.0 - Math.exp(-(S * S) / twoCSq);

	const tubeness = Math.max(0.0, Math.min(1.0, termA * termB * termC));

	return {
		tubeness: Number.isFinite(tubeness) ? tubeness : 0.0,
		structuredness: S,
	};
}

// ── 3D Discrete Gaussian Kernels & Hessian Estimation ────────────

/**
 * Pre-computes 1D discrete Gaussian smoothing and derivative kernels for a given sigma (mm)
 * and physical voxel spacing (mm).
 */
export function compute1DGaussianKernels(
	sigmaMm: number,
	spacingMm: number,
): {
	radius: number;
	g0: Float64Array;
	g1: Float64Array;
	g2: Float64Array;
} {
	const sigmaVox = Math.max(0.5, sigmaMm / Math.max(1e-4, spacingMm));
	const radius = Math.max(1, Math.min(12, Math.ceil(3.0 * sigmaVox)));
	const size = 2 * radius + 1;

	const g0 = new Float64Array(size);
	const g1 = new Float64Array(size);
	const g2 = new Float64Array(size);

	const twoSigmaSq = 2.0 * sigmaVox * sigmaVox;
	const sigmaSq = sigmaVox * sigmaVox;
	const sigma4 = sigmaSq * sigmaSq;
	let sumG0 = 0.0;

	for (let i = -radius; i <= radius; i++) {
		const idx = i + radius;
		const u = i;
		const base = Math.exp(-(u * u) / twoSigmaSq);
		g0[idx] = base;
		sumG0 += base;

		// First derivative dG/du = -u / sigma^2 * G
		g1[idx] = (-u / sigmaSq) * base;

		// Second derivative d2G/du2 = (u^2 / sigma^4 - 1 / sigma^2) * G
		g2[idx] = (u * u / sigma4 - 1.0 / sigmaSq) * base;
	}

	// Normalize kernels
	if (sumG0 > 1e-12) {
		const invSum = 1.0 / sumG0;
		for (let i = 0; i < size; i++) {
			const val = g0[i];
			if (val !== undefined) {
				g0[i] = val * invSum;
			}
		}
	}

	return { radius, g0, g1, g2 };
}

/**
 * Reads a voxel value in HU with boundary clamping.
 */
export function getVoxelClamped(
	data: Int16Array,
	dimensions: VolumeDimensions,
	x: number,
	y: number,
	z: number,
): number {
	const cx = Math.max(0, Math.min(dimensions.width - 1, x));
	const cy = Math.max(0, Math.min(dimensions.height - 1, y));
	const cz = Math.max(0, Math.min(dimensions.depth - 1, z));
	const index = cz * (dimensions.width * dimensions.height) + cy * dimensions.width + cx;
	return data[index] ?? -1000;
}

/**
 * Computes the 3D Hessian tensor of second spatial derivatives at continuous or discrete voxel coordinates (x, y, z)
 * at scale sigma (mm) using separable Gaussian convolution.
 *
 * Applies Lindeberg scale-space normalization factor: sigmaMm^2 * H.
 */
export function computeHessianAtVoxel(
	data: Int16Array,
	dimensions: VolumeDimensions,
	spacing: VolumeSpacingMm,
	x: number,
	y: number,
	z: number,
	sigmaMm: number,
): HessianMatrix3D {
	const kx = compute1DGaussianKernels(sigmaMm, spacing.x);
	const ky = compute1DGaussianKernels(sigmaMm, spacing.y);
	const kz = compute1DGaussianKernels(sigmaMm, spacing.z);

	const rx = kx.radius;
	const ry = ky.radius;
	const rz = kz.radius;

	let dxx = 0.0;
	let dyy = 0.0;
	let dzz = 0.0;
	let dxy = 0.0;
	let dxz = 0.0;
	let dyz = 0.0;

	// Physical derivatives conversion: d/dx_phys = (1 / spacing.x) * d/dx_vox
	const sx = spacing.x;
	const sy = spacing.y;
	const sz = spacing.z;

	for (let dz = -rz; dz <= rz; dz++) {
		const vz = z + dz;
		const gz0 = kz.g0[dz + rz] ?? 0;
		const gz1 = kz.g1[dz + rz] ?? 0;
		const gz2 = kz.g2[dz + rz] ?? 0;

		for (let dy = -ry; dy <= ry; dy++) {
			const vy = y + dy;
			const gy0 = ky.g0[dy + ry] ?? 0;
			const gy1 = ky.g1[dy + ry] ?? 0;
			const gy2 = ky.g2[dy + ry] ?? 0;

			for (let dx = -rx; dx <= rx; dx++) {
				const vx = x + dx;
				const gx0 = kx.g0[dx + rx] ?? 0;
				const gx1 = kx.g1[dx + rx] ?? 0;
				const gx2 = kx.g2[dx + rx] ?? 0;

				const val = getVoxelClamped(data, dimensions, vx, vy, vz);

				// Second derivative xx: gx2 * gy0 * gz0
				dxx += val * gx2 * gy0 * gz0;

				// Second derivative yy: gx0 * gy2 * gz0
				dyy += val * gx0 * gy2 * gz0;

				// Second derivative zz: gx0 * gy0 * gz2
				dzz += val * gx0 * gy0 * gz2;

				// Mixed derivative xy: gx1 * gy1 * gz0
				dxy += val * gx1 * gy1 * gz0;

				// Mixed derivative xz: gx1 * gy0 * gz1
				dxz += val * gx1 * gy0 * gz1;

				// Mixed derivative yz: gx0 * gy1 * gz1
				dyz += val * gx0 * gy1 * gz1;
			}
		}
	}

	// Scale to physical coordinates (1/mm^2) and multiply by Lindeberg scale-space normalization sigmaMm^2
	const scaleNorm = sigmaMm * sigmaMm;
	const invSx2 = 1.0 / (sx * sx);
	const invSy2 = 1.0 / (sy * sy);
	const invSz2 = 1.0 / (sz * sz);
	const invSxSy = 1.0 / (sx * sy);
	const invSxSz = 1.0 / (sx * sz);
	const invSySz = 1.0 / (sy * sz);

	return {
		xx: dxx * invSx2 * scaleNorm,
		yy: dyy * invSy2 * scaleNorm,
		zz: dzz * invSz2 * scaleNorm,
		xy: dxy * invSxSy * scaleNorm,
		xz: dxz * invSxSz * scaleNorm,
		yz: dyz * invSySz * scaleNorm,
	};
}

// ── Multiscale Frangi Analysis at Single Voxel ────────────────────

/**
 * Computes multiscale Frangi tubeness at a specific voxel coordinate (x, y, z),
 * evaluating across all specified scales sigma in params.scalesMm.
 * Returns the maximum response, winning scale, and canal orientation unit vector v1.
 */
export function computeMultiscaleFrangiAtVoxel(
	data: Int16Array,
	dimensions: VolumeDimensions,
	spacing: VolumeSpacingMm,
	x: number,
	y: number,
	z: number,
	params: FrangiParameters = DEFAULT_FRANGI_PARAMS,
): FrangiVoxelResponse {
	let maxTubeness = 0.0;
	let bestScaleMm = params.scalesMm[0] ?? 0.35;
	let bestDirection: Vec3 = [0, 0, 1];
	let bestEigenvalues: [number, number, number] = [0, 0, 0];
	let bestStructuredness = 0.0;

	for (const sigmaMm of params.scalesMm) {
		const H = computeHessianAtVoxel(data, dimensions, spacing, x, y, z, sigmaMm);
		const eigen = solveSymmetricEigenvalues3D(H);
		const [l1, l2, l3] = eigen.eigenvalues;

		const response = computeFrangiTubenessFromEigenvalues(l1, l2, l3, params);

		if (response.tubeness > maxTubeness) {
			maxTubeness = response.tubeness;
			bestScaleMm = sigmaMm;
			bestDirection = eigen.eigenvectors[0];
			bestEigenvalues = eigen.eigenvalues;
			bestStructuredness = response.structuredness;
		}
	}

	return {
		tubeness: maxTubeness,
		bestScaleMm,
		canalDirection: bestDirection,
		eigenvalues: bestEigenvalues,
		structuredness: bestStructuredness,
	};
}

// ── Full Volume / Sub-Volume Multiscale Frangi Processor ─────────

export interface SubVolumeBounds {
	readonly startX: number;
	readonly endX: number;
	readonly startY: number;
	readonly endY: number;
	readonly startZ: number;
	readonly endZ: number;
}

/**
 * Computes 3D multiscale Frangi tubeness volume for a dental CBCT dataset or cropped tooth ROI.
 * Restricts calculations to voxels inside the dentin root envelope or provided bounds.
 */
export function computeMultiscaleFrangiVolume(
	volume: CbctVoxelVolume,
	bounds?: SubVolumeBounds,
	params: FrangiParameters = DEFAULT_FRANGI_PARAMS,
	thresholds: DentinThresholds = DEFAULT_DENTIN_THRESHOLDS,
): FrangiVolumeResult {
	if (!volume.data) {
		throw new Error("Cannot compute Frangi tubeness: volume.data is null or unallocated.");
	}

	const dims = volume.dimensions;
	const totalVoxels = dims.width * dims.height * dims.depth;

	const tubeness = new Float32Array(totalVoxels);
	const bestScaleMm = new Float32Array(totalVoxels);
	const directions = new Float32Array(totalVoxels * 3);

	// Generate dentin mask
	const dentinMask = computeDentinRootMask(volume.data, dims, thresholds);

	const minX = Math.max(0, bounds?.startX ?? 0);
	const maxX = Math.min(dims.width - 1, bounds?.endX ?? dims.width - 1);
	const minY = Math.max(0, bounds?.startY ?? 0);
	const maxY = Math.min(dims.height - 1, bounds?.endY ?? dims.height - 1);
	const minZ = Math.max(0, bounds?.startZ ?? 0);
	const maxZ = Math.min(dims.depth - 1, bounds?.endZ ?? dims.depth - 1);

	const sliceStride = dims.width * dims.height;

	// Dilate dentin mask by 2 voxels (0.5mm) to bound genuine internal pulp canal lumens
	// and eliminate tens of thousands of useless convolutions on empty air outside the tooth
	const nearDentinMask = new Uint8Array(totalVoxels);
	for (let z = minZ; z <= maxZ; z++) {
		const zOffset = z * sliceStride;
		for (let y = minY; y <= maxY; y++) {
			const yOffset = zOffset + y * dims.width;
			for (let x = minX; x <= maxX; x++) {
				if (dentinMask[yOffset + x] === 1) {
					for (let dz = -2; dz <= 2; dz++) {
						const nz = z + dz;
						if (nz < minZ || nz > maxZ) continue;
						const nzOffset = nz * sliceStride;
						for (let dy = -2; dy <= 2; dy++) {
							const ny = y + dy;
							if (ny < minY || ny > maxY) continue;
							const nyOffset = nzOffset + ny * dims.width;
							for (let dx = -2; dx <= 2; dx++) {
								const nx = x + dx;
								if (nx < minX || nx > maxX) continue;
								nearDentinMask[nyOffset + nx] = 1;
							}
						}
					}
				}
			}
		}
	}

	for (let z = minZ; z <= maxZ; z++) {
		const zOffset = z * sliceStride;
		for (let y = minY; y <= maxY; y++) {
			const yOffset = zOffset + y * dims.width;
			for (let x = minX; x <= maxX; x++) {
				const idx = yOffset + x;

				// Only compute if within dentin envelope or immediate lumen neighborhood
				if (dentinMask[idx] === 0) {
					if (nearDentinMask[idx] === 0) {
						continue;
					}
					const hu = volume.data[idx] ?? -1000;
					if (!isCanalLumenHU(hu, thresholds)) {
						continue;
					}
				}

				const response = computeMultiscaleFrangiAtVoxel(
					volume.data,
					dims,
					volume.spacingMm,
					x,
					y,
					z,
					params,
				);

				tubeness[idx] = response.tubeness;
				bestScaleMm[idx] = response.bestScaleMm;

				const dirIdx = idx * 3;
				directions[dirIdx] = response.canalDirection[0];
				directions[dirIdx + 1] = response.canalDirection[1];
				directions[dirIdx + 2] = response.canalDirection[2];
			}
		}
	}

	return {
		dimensions: dims,
		spacingMm: volume.spacingMm,
		tubeness,
		bestScaleMm,
		directions,
		dentinMask,
		parameters: params,
	};
}
