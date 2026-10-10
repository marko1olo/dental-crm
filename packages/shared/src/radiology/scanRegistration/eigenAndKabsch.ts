/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EIGENSOLVER & HORN / KABSCH RIGID REGISTRATION — (LAYER 2)
 * ═══════════════════════════════════════════════════════════════════════════
 * Cyclic Jacobi symmetric matrix eigensolver, 3D centroid calculation,
 * Horn's unit-quaternion absolute orientation (Kabsch algorithm) mapping
 * paired 3D landmarks, and clinical CBCT RMS quality grading.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	JacobiEigenResult,
	KabschResultWithQuality,
	RegistrationQuality,
	Vec3,
} from "./types.js";
import { applyMat4, rigidMatrix } from "./matrixMath4.js";

/**
 * Eigen-decomposition of a symmetric n×n matrix via cyclic Jacobi rotations.
 * vectors[r][c] = component r of eigenvector c (column-organized eigenvectors).
 */
export function jacobiEigenSymmetric(input: number[][], n: number): JacobiEigenResult {
	const a: number[][] = input.map((row) => row.slice());
	const v: number[][] = Array.from({ length: n }, (_, i) =>
		Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
	);

	for (let iter = 0; iter < 100; iter++) {
		// Locate largest off-diagonal magnitude in upper triangle
		let p = 0;
		let q = 1;
		let off = 0;
		for (let i = 0; i < n; i++) {
			const rowI = a[i];
			if (!rowI) continue;
			for (let j = i + 1; j < n; j++) {
				const val = Math.abs(rowI[j] ?? 0);
				if (val > off) {
					off = val;
					p = i;
					q = j;
				}
			}
		}
		if (off < 1e-12) break;

		const rowP = a[p]!;
		const rowQ = a[q]!;
		const app = rowP[p] ?? 0;
		const aqq = rowQ[q] ?? 0;
		const apq = rowP[q] ?? 0;
		const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
		const c = Math.cos(phi);
		const s = Math.sin(phi);

		// Apply Givens rotation: B = A * J (transform columns)
		for (let i = 0; i < n; i++) {
			const row = a[i]!;
			const aip = row[p] ?? 0;
			const aiq = row[q] ?? 0;
			row[p] = c * aip - s * aiq;
			row[q] = s * aip + c * aiq;
		}
		// Apply Givens rotation: A' = J^T * B (transform rows)
		for (let i = 0; i < n; i++) {
			const api = a[p]![i] ?? 0;
			const aqi = a[q]![i] ?? 0;
			a[p]![i] = c * api - s * aqi;
			a[q]![i] = s * api + c * aqi;
		}
		// Accumulate eigenvectors: V' = V * J
		for (let i = 0; i < n; i++) {
			const vRow = v[i]!;
			const vip = vRow[p] ?? 0;
			const viq = vRow[q] ?? 0;
			vRow[p] = c * vip - s * viq;
			vRow[q] = s * vip + c * viq;
		}
	}

	const values = a.map((row, i) => row[i] ?? 0);
	return { values, vectors: v };
}

/**
 * Compute the 3D centroid of an array of points.
 */
export function centroid(pts: Vec3[]): Vec3 {
	if (pts.length === 0) return [0, 0, 0];
	const c: Vec3 = [0, 0, 0];
	for (let i = 0; i < pts.length; i++) {
		const p = pts[i];
		if (p) {
			c[0] += p[0];
			c[1] += p[1];
			c[2] += p[2];
		}
	}
	const inv = 1 / pts.length;
	return [c[0] * inv, c[1] * inv, c[2] * inv];
}

/**
 * Best-fit rigid transform mapping source landmarks to target landmarks (N >= 3).
 * Uses Horn's unit-quaternion method (symmetric 4×4 eigenproblem).
 * Returns a 4×4 column-major affine transform matrix, or null if degenerate.
 */
export function kabschTransform(src: Vec3[], tgt: Vec3[]): number[] | null {
	if (src.length < 3 || src.length !== tgt.length) return null;

	const cs = centroid(src);
	const ct = centroid(tgt);

	// Cross-covariance matrix S[a][b] = Σ (src - cs)[a] · (tgt - ct)[b]
	const S: number[][] = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
	];

	for (let i = 0; i < src.length; i++) {
		const sp = src[i]!;
		const tp = tgt[i]!;
		const p: Vec3 = [sp[0] - cs[0], sp[1] - cs[1], sp[2] - cs[2]];
		const q: Vec3 = [tp[0] - ct[0], tp[1] - ct[1], tp[2] - ct[2]];
		for (let a = 0; a < 3; a++) {
			const sa = S[a]!;
			for (let b = 0; b < 3; b++) {
				sa[b] = (sa[b] ?? 0) + p[a]! * q[b]!;
			}
		}
	}

	const row0 = S[0]!;
	const row1 = S[1]!;
	const row2 = S[2]!;

	const Sxx = row0[0] ?? 0;
	const Sxy = row0[1] ?? 0;
	const Sxz = row0[2] ?? 0;

	const Syx = row1[0] ?? 0;
	const Syy = row1[1] ?? 0;
	const Syz = row1[2] ?? 0;

	const Szx = row2[0] ?? 0;
	const Szy = row2[1] ?? 0;
	const Szz = row2[2] ?? 0;

	// Horn's 4×4 symmetric key matrix N
	const N: number[][] = [
		[Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
		[Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
		[Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
		[Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz],
	];

	const { values, vectors } = jacobiEigenSymmetric(N, 4);

	// Optimal rotation quaternion corresponds to maximum eigenvalue
	let best = 0;
	for (let i = 1; i < 4; i++) {
		if ((values[i] ?? -Infinity) > (values[best] ?? -Infinity)) best = i;
	}

	const q0 = vectors[0]?.[best] ?? 1;
	const q1 = vectors[1]?.[best] ?? 0;
	const q2 = vectors[2]?.[best] ?? 0;
	const q3 = vectors[3]?.[best] ?? 0;
	const nrm = Math.hypot(q0, q1, q2, q3) || 1;
	const w = q0 / nrm;
	const x = q1 / nrm;
	const y = q2 / nrm;
	const z = q3 / nrm;

	// Convert unit quaternion to 3×3 rotation matrix R
	const R: number[][] = [
		[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
		[2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
		[2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
	];

	const r0 = R[0]!;
	const r1 = R[1]!;
	const r2 = R[2]!;

	// R * cs
	const Rcs: Vec3 = [
		(r0[0] ?? 0) * cs[0] + (r0[1] ?? 0) * cs[1] + (r0[2] ?? 0) * cs[2],
		(r1[0] ?? 0) * cs[0] + (r1[1] ?? 0) * cs[1] + (r1[2] ?? 0) * cs[2],
		(r2[0] ?? 0) * cs[0] + (r2[1] ?? 0) * cs[1] + (r2[2] ?? 0) * cs[2],
	];

	// Translation vector t = ct - R * cs
	const t: Vec3 = [ct[0] - Rcs[0], ct[1] - Rcs[1], ct[2] - Rcs[2]];

	return rigidMatrix(R, t);
}

/**
 * Classifies registration residual fit quality based on clinical CBCT thresholds:
 * - RMS < 0.5 mm: "excellent" (ideal for precision static/dynamic surgical guides)
 * - 0.5 mm <= RMS <= 1.0 mm: "acceptable" (clinically viable for standard guide fabrication)
 * - RMS > 1.0 mm: "poor" (unacceptable, landmark recalibration required)
 */
export function classifyRegistrationQuality(rmsMm: number): RegistrationQuality {
	if (rmsMm < 0.5) return "excellent";
	if (rmsMm <= 1.0) return "acceptable";
	return "poor";
}

/**
 * Computes Horn's rigid registration matrix, RMS point-pair residual in mm,
 * and clinical registration quality rating.
 */
export function kabschTransformWithRms(
	src: Vec3[],
	tgt: Vec3[],
): KabschResultWithQuality | null {
	const matrix = kabschTransform(src, tgt);
	if (!matrix) return null;
	let sum = 0;
	for (let i = 0; i < src.length; i++) {
		const sp = src[i]!;
		const tp = tgt[i]!;
		const p = applyMat4(matrix, sp);
		sum += (p[0] - tp[0]) ** 2 + (p[1] - tp[1]) ** 2 + (p[2] - tp[2]) ** 2;
	}
	const rmsMm = Math.sqrt(sum / src.length);
	const quality = classifyRegistrationQuality(rmsMm);
	return { matrix, rmsMm, quality };
}
