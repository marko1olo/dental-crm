/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 4×4 COLUMN-MAJOR MATRIX ALGEBRA — (LAYER 1)
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure 4×4 affine transformation matrix operations in OpenGL/VTK column-major
 * memory layout: identity constructors, matrix multiplication, 3D affine
 * point transformations, and rigid transform assembly.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3 } from "./types.js";

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
