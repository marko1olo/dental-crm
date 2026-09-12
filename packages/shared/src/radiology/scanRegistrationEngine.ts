/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 133: 3D OPTICAL SCAN RIGID REGISTRATION & PROSTHETIC TOOTH SETUP ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Mathematical reverse-engineering & clinical adaptation from DenCT:
 * - 4×4 Column-Major Matrix Algebra (OpenGL/VTK layout)
 * - Cyclic Jacobi Symmetric Eigensolver (n×n eigen-decomposition)
 * - Horn's Unit-Quaternion Rigid Registration (Kabsch algorithm) mapping
 *   corresponding landmark pairs (source optical scan → target CBCT)
 *   with RMS residual fit quality classification (excellent / acceptable / poor)
 * - Möller–Trumbore Ray-Triangle Picking for surface mesh landmark selection
 * - Principal Component Analysis (PCA) for prosthetic tooth setup & virtual wax-up
 * - World axis to clinical arch frame angles (buccolingual BL & mesiodistal MD)
 * - Prosthetically-driven ("backward") implant platform & axis suggestion
 * - Official Form 043/u A4 registration protocol (strictly zero emojis, Mandate 8d #7)
 *
 * 100% pure TypeScript, zero DOM/VTK dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Point2, Vec3 } from "./cprMath.js";
import { nearestArchFrame, type ArchFrame } from "./implantGeometryEngine.js";

export type { ArchFrame } from "./implantGeometryEngine.js";
export type { Point2, Vec3 } from "./cprMath.js";


// ── 4×4 Column-Major Matrix Algebra ─────────────────────────────

/** Standard 4×4 column-major identity matrix. */
export const IDENTITY4: number[] = [
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1,
];

/** Return a fresh mutable 4×4 column-major identity matrix. */
export function identity4(): number[] {
	return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/**
 * Multiply two column-major 4×4 matrices: returns a · b.
 */
export function mul4(
	a: ArrayLike<number>,
	b: ArrayLike<number>,
): number[] {
	const out = new Array<number>(16).fill(0);
	for (let c = 0; c < 4; c++) {
		for (let r = 0; r < 4; r++) {
			let s = 0;
			for (let k = 0; k < 4; k++) {
				const ak = a[k * 4 + r] ?? 0;
				const bk = b[c * 4 + k] ?? 0;
				s += ak * bk;
			}
			out[c * 4 + r] = s;
		}
	}
	return out;
}

/**
 * Apply a column-major 4×4 affine transformation matrix to a 3D point.
 */
export function applyMat4(
	m: ArrayLike<number>,
	p: Vec3,
): Vec3 {
	const m0 = m[0] ?? 0;
	const m1 = m[1] ?? 0;
	const m2 = m[2] ?? 0;
	const m4 = m[4] ?? 0;
	const m5 = m[5] ?? 0;
	const m6 = m[6] ?? 0;
	const m8 = m[8] ?? 0;
	const m9 = m[9] ?? 0;
	const m10 = m[10] ?? 0;
	const m12 = m[12] ?? 0;
	const m13 = m[13] ?? 0;
	const m14 = m[14] ?? 0;

	return [
		m0 * p[0] + m4 * p[1] + m8 * p[2] + m12,
		m1 * p[0] + m5 * p[1] + m9 * p[2] + m13,
		m2 * p[0] + m6 * p[1] + m10 * p[2] + m14,
	];
}

/**
 * Column-major rigid matrix from a row-major 3×3 rotation R and translation t.
 */
export function rigidMatrix(R: number[][], t: Vec3): number[] {
	const r0 = R[0] ?? [1, 0, 0];
	const r1 = R[1] ?? [0, 1, 0];
	const r2 = R[2] ?? [0, 0, 1];

	return [
		r0[0] ?? 1, r1[0] ?? 0, r2[0] ?? 0, 0,
		r0[1] ?? 0, r1[1] ?? 1, r2[1] ?? 0, 0,
		r0[2] ?? 0, r1[2] ?? 0, r2[2] ?? 1, 0,
		t[0], t[1], t[2], 1,
	];
}

// ── Symmetric Matrix Eigensolver (Cyclic Jacobi) ────────────────

export interface JacobiEigenResult {
	values: number[];
	vectors: number[][];
}

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

// ── Horn's Unit-Quaternion Rigid Registration (Kabsch) ──────────

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

export type RegistrationQuality = "excellent" | "acceptable" | "poor";

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

export interface KabschResultWithQuality {
	matrix: number[];
	rmsMm: number;
	quality: RegistrationQuality;
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

export interface KabschResultWithRms {
	matrix: number[];
	rmsMm: number;
}

// ── Iterative Closest Point (Surface Refinement) ────────────────

export interface IcpOptions {
	/** Maximum iterations (default 40). */
	maxIterations?: number;
	/** Stop when the RMS improvement between iterations drops below this threshold in mm (default 1e-4). */
	tolerance?: number;
	/** Initial source -> target transform (4x4 column-major, default identity). */
	initial?: number[];
}

export interface IcpResult {
	/** Refined source -> target rigid transform (4x4 column-major). */
	transform: number[];
	/** Final RMS of each source point to its nearest target point in mm. */
	rmsMm: number;
	/** Total iterations executed. */
	iterations: number;
}

/** Find nearest target point to point q. */
export function nearestPoint(target: Vec3[], q: Vec3): Vec3 {
	let bd = Infinity;
	let bj = 0;
	for (let j = 0; j < target.length; j++) {
		const t = target[j]!;
		const d = (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2 + (q[2] - t[2]) ** 2;
		if (d < bd) {
			bd = d;
			bj = j;
		}
	}
	return target[bj]!;
}

/** RMS of transformed source points to their nearest target points in mm. */
export function nearestRms(source: Vec3[], target: Vec3[], m: number[]): number {
	let sum = 0;
	for (let i = 0; i < source.length; i++) {
		const p = source[i]!;
		const q = applyMat4(m, p);
		const t = nearestPoint(target, q);
		sum += (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2 + (q[2] - t[2]) ** 2;
	}
	return Math.sqrt(sum / source.length);
}

/**
 * Point-to-point ICP (Iterative Closest Point):
 * Refines an initial alignment between source and target point clouds by repeatedly
 * finding closest-point correspondences and estimating the optimal rigid transform.
 */
export function icpAlign(
	source: Vec3[],
	target: Vec3[],
	opts: IcpOptions = {},
): IcpResult | null {
	const maxIter = opts.maxIterations ?? 40;
	const tol = opts.tolerance ?? 1e-4;
	if (source.length < 3 || target.length < 1) return null;

	let current: number[] = opts.initial ? [...opts.initial] : [...IDENTITY4];
	let prevRms = Infinity;
	let iter = 0;

	for (; iter < maxIter; iter++) {
		const moved = source.map((p) => applyMat4(current, p));
		const matched = moved.map((m) => nearestPoint(target, m));
		const delta = kabschTransform(moved, matched);
		if (!delta) break;

		current = mul4(delta, current);
		const rms = nearestRms(source, target, current);
		const improved = prevRms - rms;
		prevRms = rms;

		if (improved >= 0 && improved < tol) {
			iter++;
			break;
		}
	}

	const rmsMm = prevRms === Infinity ? nearestRms(source, target, current) : prevRms;
	return { transform: current, rmsMm, iterations: iter };
}

// ── Möller–Trumbore Ray-Triangle Picking ─────────────────────────

/**
 * Möller–Trumbore ray-triangle intersection test.
 * Returns the ray parameter t at intersection (> 1e-6), or null if no hit.
 */
export function rayTriangleHit(
	orig: Vec3,
	dir: Vec3,
	v0: Vec3,
	v1: Vec3,
	v2: Vec3,
): number | null {
	const e1: Vec3 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
	const e2: Vec3 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

	const px = dir[1] * e2[2] - dir[2] * e2[1];
	const py = dir[2] * e2[0] - dir[0] * e2[2];
	const pz = dir[0] * e2[1] - dir[1] * e2[0];
	const det = e1[0] * px + e1[1] * py + e1[2] * pz;

	if (Math.abs(det) < 1e-9) return null;
	const inv = 1 / det;

	const tv: Vec3 = [orig[0] - v0[0], orig[1] - v0[1], orig[2] - v0[2]];
	const u = (tv[0] * px + tv[1] * py + tv[2] * pz) * inv;
	if (u < 0 || u > 1) return null;

	const qx = tv[1] * e1[2] - tv[2] * e1[1];
	const qy = tv[2] * e1[0] - tv[0] * e1[2];
	const qz = tv[0] * e1[1] - tv[1] * e1[0];
	const v = (dir[0] * qx + dir[1] * qy + dir[2] * qz) * inv;
	if (v < 0 || u + v > 1) return null;

	const t = (e2[0] * qx + e2[1] * qy + e2[2] * qz) * inv;
	return t > 1e-6 ? t : null;
}

export interface MeshRayHit {
	point: Vec3;
	distance: number;
	triangleIndex: number;
}

/**
 * Cast a ray against a polygon mesh (indexed or triangle soup) to pick landmarks.
 * Returns the nearest 3D hit point, distance, and triangle index, or null if no hit.
 */
export function pickMeshRay(
	orig: Vec3,
	dir: Vec3,
	positions: ArrayLike<number>,
	indices?: ArrayLike<number> | null,
): MeshRayHit | null {
	const dLen = Math.hypot(dir[0], dir[1], dir[2]);
	if (dLen < 1e-9) return null;
	const ndir: Vec3 = [dir[0] / dLen, dir[1] / dLen, dir[2] / dLen];

	let bestT = Infinity;
	let bestTriangle = -1;

	if (indices && indices.length >= 3) {
		const triCount = Math.floor(indices.length / 3);
		for (let t = 0; t < triCount; t++) {
			const i0 = indices[3 * t]!;
			const i1 = indices[3 * t + 1]!;
			const i2 = indices[3 * t + 2]!;

			const v0: Vec3 = [positions[3 * i0]!, positions[3 * i0 + 1]!, positions[3 * i0 + 2]!];
			const v1: Vec3 = [positions[3 * i1]!, positions[3 * i1 + 1]!, positions[3 * i1 + 2]!];
			const v2: Vec3 = [positions[3 * i2]!, positions[3 * i2 + 1]!, positions[3 * i2 + 2]!];

			const hitT = rayTriangleHit(orig, ndir, v0, v1, v2);
			if (hitT !== null && hitT < bestT) {
				bestT = hitT;
				bestTriangle = t;
			}
		}
	} else {
		const triCount = Math.floor(positions.length / 9);
		for (let t = 0; t < triCount; t++) {
			const o = t * 9;
			const v0: Vec3 = [positions[o]!, positions[o + 1]!, positions[o + 2]!];
			const v1: Vec3 = [positions[o + 3]!, positions[o + 4]!, positions[o + 5]!];
			const v2: Vec3 = [positions[o + 6]!, positions[o + 7]!, positions[o + 8]!];

			const hitT = rayTriangleHit(orig, ndir, v0, v1, v2);
			if (hitT !== null && hitT < bestT) {
				bestT = hitT;
				bestTriangle = t;
			}
		}
	}

	if (!Number.isFinite(bestT) || bestTriangle === -1) return null;

	const hitPoint: Vec3 = [
		orig[0] + ndir[0] * bestT,
		orig[1] + ndir[1] * bestT,
		orig[2] + ndir[2] * bestT,
	];

	return {
		point: hitPoint,
		distance: bestT,
		triangleIndex: bestTriangle,
	};
}

/**
 * Find nearest ray hit against a triangle soup [ax,ay,az, bx,by,bz, cx,cy,cz, ...].
 * Returns the 3D world hit point, or null if no triangle was hit.
 */
export function pickTriangleSoup(
	orig: Vec3,
	dir: Vec3,
	tris: Float32Array | number[],
): Vec3 | null {
	let bestT = Infinity;
	for (let i = 0; i + 8 < tris.length; i += 9) {
		const a: Vec3 = [tris[i] ?? 0, tris[i + 1] ?? 0, tris[i + 2] ?? 0];
		const b: Vec3 = [tris[i + 3] ?? 0, tris[i + 4] ?? 0, tris[i + 5] ?? 0];
		const c: Vec3 = [tris[i + 6] ?? 0, tris[i + 7] ?? 0, tris[i + 8] ?? 0];
		const t = rayTriangleHit(orig, dir, a, b, c);
		if (t !== null && t < bestT) {
			bestT = t;
		}
	}
	if (!Number.isFinite(bestT)) return null;
	return [
		orig[0] + dir[0] * bestT,
		orig[1] + dir[1] * bestT,
		orig[2] + dir[2] * bestT,
	];
}

// ── Prosthetic Tooth Setup (PCA & Backward Planning) ────────────

export interface PrincipalAxis {
	/** 3D Centroid [cx, cy, cz] of the point cluster. */
	centroid: Vec3;
	/** Normalized unit eigenvector of largest variance (tooth long axis; sign arbitrary). */
	axis: Vec3;
	/** Total extent (max - min projection) along the long axis in mm. */
	extent: number;
}

/**
 * Computes the principal long axis, centroid, and longitudinal extent of a 3D point set
 * using a 3×3 covariance matrix and cyclic Jacobi eigensolver.
 * Returns null if fewer than 3 vertices are provided.
 */
export function principalAxis(positions: ArrayLike<number>): PrincipalAxis | null {
	const n = Math.floor(positions.length / 3);
	if (n < 3) return null;

	let cx = 0;
	let cy = 0;
	let cz = 0;
	for (let i = 0; i < n; i++) {
		cx += positions[3 * i]!;
		cy += positions[3 * i + 1]!;
		cz += positions[3 * i + 2]!;
	}
	cx /= n;
	cy /= n;
	cz /= n;

	// Symmetric 3×3 covariance matrix
	let xx = 0;
	let yy = 0;
	let zz = 0;
	let xy = 0;
	let xz = 0;
	let yz = 0;
	for (let i = 0; i < n; i++) {
		const dx = positions[3 * i]! - cx;
		const dy = positions[3 * i + 1]! - cy;
		const dz = positions[3 * i + 2]! - cz;
		xx += dx * dx;
		yy += dy * dy;
		zz += dz * dz;
		xy += dx * dy;
		xz += dx * dz;
		yz += dy * dz;
	}
	const cov: number[][] = [
		[xx / n, xy / n, xz / n],
		[xy / n, yy / n, yz / n],
		[xz / n, yz / n, zz / n],
	];

	const { values, vectors } = jacobiEigenSymmetric(cov, 3);
	let best = 0;
	for (let i = 1; i < 3; i++) {
		if ((values[i] ?? -Infinity) > (values[best] ?? -Infinity)) {
			best = i;
		}
	}

	let ax = vectors[0]?.[best] ?? 0;
	let ay = vectors[1]?.[best] ?? 0;
	let az = vectors[2]?.[best] ?? 0;
	const len = Math.hypot(ax, ay, az) || 1;
	ax /= len;
	ay /= len;
	az /= len;

	// Measure longitudinal extent along the dominant axis
	let min = Infinity;
	let max = -Infinity;
	for (let i = 0; i < n; i++) {
		const p =
			(positions[3 * i]! - cx) * ax +
			(positions[3 * i + 1]! - cy) * ay +
			(positions[3 * i + 2]! - cz) * az;
		if (p < min) min = p;
		if (p > max) max = p;
	}

	return {
		centroid: [cx, cy, cz],
		axis: [ax, ay, az],
		extent: max - min,
	};
}

/**
 * Inverse of implantAxis: maps a 3D unit world vector to buccolingual (BL)
 * and mesiodistal (MD) angles relative to the local arch frame.
 * Perfectly round-trips with implantAxis.
 */
export function anglesFromWorldAxis(
	frame: ArchFrame,
	axis: Vec3,
): { angleBLDeg: number; angleMDDeg: number } {
	const len = Math.hypot(axis[0], axis[1], axis[2]);
	const ax = len > 0 ? axis[0] / len : axis[0];
	const ay = len > 0 ? axis[1] / len : axis[1];
	const az = len > 0 ? axis[2] / len : axis[2];

	const n = ax * frame.normal[0] + ay * frame.normal[1]; // sin(BL)
	const t = ax * frame.tangent[0] + ay * frame.tangent[1]; // cos(BL) * sin(MD)
	const z = az; // -cos(BL) * cos(MD)

	let C = Math.sqrt(Math.max(0, 1 - n * n)); // |cos(BL)|
	if (z > 0) C = -C; // apex up (maxilla) -> cos(BL) < 0

	const bl = Math.atan2(n, C);
	const sinMD = C !== 0 ? t / C : 0;
	const cosMD = C !== 0 ? -z / C : 1;
	const md = Math.atan2(sinMD, cosMD);

	return {
		angleBLDeg: (bl * 180) / Math.PI,
		angleMDDeg: (md * 180) / Math.PI,
	};
}

export interface CrownImplantSuggestion {
	position: Vec3;
	angleBLDeg: number;
	angleMDDeg: number;
	axis: Vec3;
	centroid: Vec3;
	extentMm: number;
}

/**
 * Derives suggested implant platform position and insertion angles from a planned
 * prosthetic tooth crown / wax-up mesh:
 * - Computes PCA long axis as the ideal screw channel
 * - Orients the apex into the jaw bone (default apex down -Z for mandible, +Z for maxilla)
 * - Places platform at the apical boundary of the crown
 * - Calculates BL and MD tilts against the nearest dental arch frame
 */
export function suggestImplantFromCrown(
	controlPoints: Point2[],
	positions: ArrayLike<number>,
	opts: { apexUp?: boolean } = {},
): CrownImplantSuggestion | null {
	const pa = principalAxis(positions);
	if (!pa) return null;

	let axis: Vec3 = [pa.axis[0], pa.axis[1], pa.axis[2]];
	const wantDown = !opts.apexUp;
	if ((wantDown && axis[2] > 0) || (!wantDown && axis[2] < 0)) {
		axis = [-axis[0], -axis[1], -axis[2]];
	}

	const [ax, ay, az] = axis;
	const half = pa.extent / 2;
	const position: Vec3 = [
		pa.centroid[0] + ax * half,
		pa.centroid[1] + ay * half,
		pa.centroid[2] + az * half,
	];

	const frame = nearestArchFrame(controlPoints, [position[0], position[1]]);
	if (!frame) return null;

	const { angleBLDeg, angleMDDeg } = anglesFromWorldAxis(frame, axis);
	return {
		position,
		angleBLDeg,
		angleMDDeg,
		axis,
		centroid: pa.centroid,
		extentMm: pa.extent,
	};
}

// ── Form 043/u A4 Clinical Protocol ─────────────────────────────

export interface ScanRegistrationProtocolInput {
	patientName?: string;
	doctorName?: string;
	clinicName?: string;
	dateStr?: string;
	toothNumber?: number;
	landmarkCount?: number;
	rmsMm: number;
	quality: RegistrationQuality;
	transformMatrix?: number[];
	crownSuggestion?: CrownImplantSuggestion | null;
	clinicalNotes?: string;
}

/**
 * Formats an official A4 medical protocol of optical scan registration and
 * prosthetically-driven implant placement for Form 043/u.
 * Strictly zero emojis (Mandate 8d #7), 100% formal clinical terminology.
 */
export function formatScanRegistrationA4Protocol(
	input: ScanRegistrationProtocolInput,
): string {
	const clinic = input.clinicName?.trim() || "СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА";
	const patient = input.patientName?.trim() || "Не указан";
	const doctor = input.doctorName?.trim() || "Врач-стоматолог";
	const date = input.dateStr?.trim() || new Date().toISOString().slice(0, 10);
	const toothStr = input.toothNumber ? `Зуб FDI ${input.toothNumber}` : "Не указан";
	const landmarks = input.landmarkCount ?? 3;

	let qualityLabel = "";
	let verdictText = "";
	let recommendation = "";

	if (input.quality === "excellent") {
		qualityLabel = "ОТЛИЧНОЕ (RMS < 0.500 мм)";
		verdictText = "[ДОПУЩЕНО К ИЗГОТОВЛЕНИЮ ХИРУРГИЧЕСКОГО ШАБЛОНА]";
		recommendation =
			"Высокая прецизионная точность оптико-томографического совмещения. " +
			"Погрешность не превышает 0.5 мм. Допускается для прямого моделирования " +
			"навигационных хирургических шаблонов с пилотным и полным протоколом сверления.";
	} else if (input.quality === "acceptable") {
		qualityLabel = "ПРИЕМЛЕМОЕ (0.500 мм <= RMS <= 1.000 мм)";
		verdictText = "[ДОПУЩЕНО К КЛИНИЧЕСКОМУ ИСПОЛЬЗОВАНИЮ С КОНТРОЛЕМ]";
		recommendation =
			"Точность совмещения находится в допустимых клинических пределах. " +
			"Рекомендуется визуальная инспекция окклюзионных прилеганий перед окончательной " +
			"фиксацией направляющих втулок хирургического шаблона.";
	} else {
		qualityLabel = "НИЗКАЯ ТОЧНОСТЬ (RMS > 1.000 мм)";
		verdictText = "[ВНИМАНИЕ: ТРЕБУЕТСЯ ПОВТОРНАЯ РАССТАНОВКА РЕПЕРОВ]";
		recommendation =
			"Среднеквадратическое отклонение превышает допустимый хирургический порог (RMS > 1.0 мм). " +
			"Категорически запрещено использовать текущую матрицу для навигационной хирургии. " +
			"Необходимо заново расставить анатомические ориентиры (бугры клыков, фиссуры моляров) " +
			"или устранить артефакты сканирования.";
	}

	const lines: string[] = [
		"================================================================================",
		`                    ${clinic.toUpperCase()}`,
		"        ПРОТОКОЛ ОПТИЧЕСКОГО СОВМЕЩЕНИЯ И ОРТОПЕДИЧЕСКОГО ПЛАНИРОВАНИЯ         ",
		"               (OPTICAL SCAN RIGID REGISTRATION & TOOTH SETUP)                  ",
		"================================================================================",
		"",
		`Пациент                : ${patient}`,
		`Лечащий врач           : ${doctor}`,
		`Дата планирования      : ${date}`,
		`Анатомическая зона     : ${toothStr}`,
		"Стандарт протокола     : Медицинская карта стоматологического больного (Форма 043/у)",
		"",
		"--------------------------------------------------------------------------------",
		"1. МАТЕМАТИЧЕСКИЕ ПАРАМЕТРЫ РЕГИСТРАЦИИ (KABSCH / HORN UNIT-QUATERNION)",
		"--------------------------------------------------------------------------------",
		`Количество анатомических реперов      : ${landmarks} пар`,
		`Среднеквадратичная ошибка (RMS)       : ${input.rmsMm.toFixed(4)} мм`,
		`Категория клинической точности        : ${qualityLabel}`,
		`Клинический вердикт                   : ${verdictText}`,
	];

	if (input.transformMatrix && input.transformMatrix.length === 16) {
		const m = input.transformMatrix;
		lines.push("");
		lines.push("Матрица жесткой трансформации (Column-Major 4x4):");
		lines.push(
			`  [ ${m[0]!.toFixed(6)}, ${m[4]!.toFixed(6)}, ${m[8]!.toFixed(6)}, ${m[12]!.toFixed(4)} ]`,
		);
		lines.push(
			`  [ ${m[1]!.toFixed(6)}, ${m[5]!.toFixed(6)}, ${m[9]!.toFixed(6)}, ${m[13]!.toFixed(4)} ]`,
		);
		lines.push(
			`  [ ${m[2]!.toFixed(6)}, ${m[6]!.toFixed(6)}, ${m[10]!.toFixed(6)}, ${m[14]!.toFixed(4)} ]`,
		);
		lines.push(
			`  [ ${m[3]!.toFixed(6)}, ${m[7]!.toFixed(6)}, ${m[11]!.toFixed(6)}, ${m[15]!.toFixed(4)} ]`,
		);
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("2. ОРТОПЕДИЧЕСКИ-ОРИЕНТИРОВАННОЕ ПОЗИЦИОНИРОВАНИЕ (PCA WAX-UP)");
	lines.push("--------------------------------------------------------------------------------");

	if (input.crownSuggestion) {
		const cs = input.crownSuggestion;
		lines.push(`Центроид виртуальной коронки          : X=${cs.centroid[0].toFixed(2)} мм, Y=${cs.centroid[1].toFixed(2)} мм, Z=${cs.centroid[2].toFixed(2)} мм`);
		lines.push(`Протяженность коронки по главной оси  : ${cs.extentMm.toFixed(2)} мм`);
		lines.push(`Вектор апикальной оси (Screw Channel) : [${cs.axis[0].toFixed(4)}, ${cs.axis[1].toFixed(4)}, ${cs.axis[2].toFixed(4)}]`);
		lines.push(`Позиция платформы имплантата          : X=${cs.position[0].toFixed(2)} мм, Y=${cs.position[1].toFixed(2)} мм, Z=${cs.position[2].toFixed(2)} мм`);
		lines.push(`Вестибуло-оральный наклон (BL)        : ${cs.angleBLDeg.toFixed(2)} град.`);
		lines.push(`Мезио-дистальный наклон (MD)          : ${cs.angleMDDeg.toFixed(2)} град.`);
	} else {
		lines.push("Виртуальная коронка (wax-up)          : Не задана (прямое анатомическое ориентирование)");
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("3. КЛИНИЧЕСКИЕ РЕКОМЕНДАЦИИ И ЗАКЛЮЧЕНИЕ");
	lines.push("--------------------------------------------------------------------------------");
	lines.push(recommendation);

	if (input.clinicalNotes?.trim()) {
		lines.push("");
		lines.push(`Особые отметки хирурга: ${input.clinicalNotes.trim()}`);
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("4. ВЕРИФИКАЦИЯ И ЭЛЕКТРОННАЯ ПОДПИСЬ");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("Протокол проверен врачом-стоматологом у кресла в соответствии с клиническими");
	lines.push("рекомендациями Стоматологической Ассоциации России (СтАР).");
	lines.push("");
	lines.push(`Врач-стоматолог (подпись): ____________________ / ${doctor} /`);
	lines.push("");
	lines.push("Подпись ответственного лица: ____________________");
	lines.push("");
	lines.push("М.П. Клиники");
	lines.push("================================================================================");

	return lines.join("\n");
}

// ── Printable Clinical A4 Protocol (Wave 126 Parity, 0 Emojis) ───

export interface RegistrationProtocolInput {
	landmarkRmsMm: number;
	icpRmsMm: number;
	iterations: number;
	scanPointsCount: number;
	isClinicallyAcceptable: boolean;
}

/**
 * Formats an A4-printable clinical protocol for optical intraoral scan to CBCT registration.
 * Fully compliant with Mandate 8d item 7: strictly zero cartoon emojis, professional medical terminology.
 */
export function formatRegistrationA4Protocol(
	result: RegistrationProtocolInput,
	patientName: string,
	doctorName: string,
): string {
	const statusText = result.isClinicallyAcceptable
		? "[ДОПУЩЕНО К КЛИНИЧЕСКОМУ ИСПОЛЬЗОВАНИЮ]"
		: "[ВНИМАНИЕ: ТРЕБУЕТСЯ ПОВТОРНАЯ КАЛИБРОВКА]";

	const recommendation = result.isClinicallyAcceptable
		? "Точность оптико-томографического совмещения находится в пределах клинического допуска (RMS <= 0.500 мм). Данные согласованы для прецизионного моделирования хирургических навигационных шаблонов и позиционирования дентальных имплантатов."
		: "Среднеквадратическое отклонение превышает допустимый клинический порог (RMS > 0.500 мм). Рекомендуется повторно расставить анатомические ориентиры (минимум 3 не коллинеарные пары реперов на твердых тканях зубов) и исключить участки с артефактами металлоконструкций.";

	const lines = [
		"================================================================================",
		"        ПРОТОКОЛ СОПОСТАВЛЕНИЯ КЛКТ И ОПТИЧЕСКОГО ИНТРАОРАЛЬНОГО СКАНИРОВАНИЯ   ",
		"               (CBCT <-> INTRAORAL OPTICAL SCAN REGISTRATION REPORT)            ",
		"================================================================================",
		"",
		`Пациент: ${patientName.trim() || "Не указан"}`,
		`Лечащий врач: ${doctorName.trim() || "Не указан"}`,
		`Дата формирования: ${new Date().toISOString().slice(0, 10)}`,
		"Стандарт протокола: Форма 043/у / Предоперационное 3D-планирование",
		"",
		"--------------------------------------------------------------------------------",
		"1. ПАРАМЕТРЫ РЕГИСТРАЦИИ И АЛГОРИТМИЧЕСКИЙ АНАЛИЗ",
		"--------------------------------------------------------------------------------",
		"Математический метод первичной привязки : Horn Unit-Quaternion Absolute Orientation (Kabsch)",
		"Математический метод прецизионной доводки : Iterative Closest Point (Point-to-Point ICP)",
		`Количество обработанных вершин меша    : ${result.scanPointsCount.toLocaleString("ru-RU")}`,
		`Первичное отклонение по реперам (RMS)  : ${result.landmarkRmsMm.toFixed(4)} мм`,
		`Финальное отклонение ICP (RMS)         : ${result.icpRmsMm.toFixed(4)} мм`,
		`Количество выполненных итераций ICP    : ${result.iterations}`,
		"",
		"--------------------------------------------------------------------------------",
		"2. КЛИНИЧЕСКИЙ ВЕРДИКТ И ЗАКЛЮЧЕНИЕ",
		"--------------------------------------------------------------------------------",
		`Статус верификации: ${statusText}`,
		"Клинический допуск: RMS <= 0.500 мм (допустимо для навигационной хирургии)",
		"",
		"Заключение:",
		recommendation,
		"",
		"--------------------------------------------------------------------------------",
		"3. ВЕРИФИКАЦИЯ И ПОДПИСЬ",
		"--------------------------------------------------------------------------------",
		"Протокол проверен врачом-стоматологом у кресла в соответствии с клиническими",
		"рекомендациями Стоматологической Ассоциации России (СтАР).",
		"",
		`Врач-стоматолог (подпись): ____________________ / ${doctorName.trim() || "Врач-клиницист"} /`,
		"",
		"Подпись ответственного лица: ____________________",
		"",
		"М.П. Клиники",
		"================================================================================",
	];

	return lines.join("\n");
}

// ── Canonical Aliases (DenCT / API Parity per Mandate 8s) ────────

export const transformPoint4 = applyMat4;
export const hornRegistration = kabschTransformWithRms;
export const mollerTrumborePick = pickMeshRay;
export const formatRegistrationReport = formatScanRegistrationA4Protocol;

