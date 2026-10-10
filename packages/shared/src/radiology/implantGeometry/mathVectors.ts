/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT 3D IMPLANT GEOMETRY — VECTOR MATH PRIMITIVES (LAYER 1)
 * ═══════════════════════════════════════════════════════════════════════════
 * Analytical 3D Euclidean distances, dot/cross products, normalization,
 * segment-to-segment analytical distance solver, and polyline distance fields.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3 } from "./types.js";

export function dot3(a: Vec3, b: Vec3): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function sub3(a: Vec3, b: Vec3): Vec3 {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function add3(a: Vec3, b: Vec3): Vec3 {
	return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scale3(v: Vec3, s: number): Vec3 {
	return [v[0] * s, v[1] * s, v[2] * s];
}

export function len3(v: Vec3): number {
	return Math.hypot(v[0], v[1], v[2]);
}

export const norm3 = len3;

export function normalize3(v: Vec3): Vec3 {
	const l = Math.hypot(v[0], v[1], v[2]);
	return l > 1e-9 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 1];
}

export function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// ── Analytical 3D Distance Primitives ──────────────────────────

/**
 * Shortest Euclidean distance from point p to line segment [a, b] in 3D (mm).
 */
export function distPointToSegment3(p: Vec3, a: Vec3, b: Vec3): number {
	const ab = sub3(b, a);
	const len2 = dot3(ab, ab);
	let t = len2 > 0 ? dot3(sub3(p, a), ab) / len2 : 0;
	t = Math.max(0, Math.min(1, t));
	const c: Vec3 = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
	return Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
}

/**
 * Shortest Euclidean distance between two 3D line segments [p1, q1] and [p2, q2] in mm.
 * Analytical solution with clamped parameter space (s, t) in [0, 1] x [0, 1].
 * Correctly handles skew, parallel, collinear, and degenerate (single point) segments.
 */
export function distSegmentToSegment3(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3): number {
	const d1 = sub3(q1, p1);
	const d2 = sub3(q2, p2);
	const r = sub3(p1, p2);
	const a = dot3(d1, d1);
	const e = dot3(d2, d2);
	const f = dot3(d2, r);
	const EPS = 1e-9;

	let s: number;
	let t: number;
	if (a <= EPS && e <= EPS) {
		return Math.hypot(r[0], r[1], r[2]);
	}
	if (a <= EPS) {
		s = 0;
		t = Math.max(0, Math.min(1, f / e));
	} else {
		const c = dot3(d1, r);
		if (e <= EPS) {
			t = 0;
			s = Math.max(0, Math.min(1, -c / a));
		} else {
			const b = dot3(d1, d2);
			const denom = a * e - b * b;
			s = denom > EPS ? Math.max(0, Math.min(1, (b * f - c * e) / denom)) : 0;
			t = (b * s + f) / e;
			if (t < 0) {
				t = 0;
				s = Math.max(0, Math.min(1, -c / a));
			} else if (t > 1) {
				t = 1;
				s = Math.max(0, Math.min(1, (b - c) / a));
			}
		}
	}
	const c1: Vec3 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s];
	const c2: Vec3 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
	return Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
}

/** Shortest distance between segment [a, b] and a 3D polyline (>= 1 points). */
export function distSegmentToPolyline3(a: Vec3, b: Vec3, poly: readonly Vec3[] | Vec3[]): number {
	if (poly.length === 0) return Number.POSITIVE_INFINITY;
	const first = poly[0];
	if (poly.length === 1 && first) return distPointToSegment3(first, a, b);
	let min = Number.POSITIVE_INFINITY;
	for (let i = 0; i < poly.length - 1; i++) {
		const pStart = poly[i];
		const pEnd = poly[i + 1];
		if (!pStart || !pEnd) continue;
		const d = distSegmentToSegment3(a, b, pStart, pEnd);
		if (d < min) min = d;
	}
	return min;
}

/** Shortest distance between 3D point p and a polyline (>= 1 points). */
export function distPointToPolyline3(p: Vec3, poly: readonly Vec3[] | Vec3[]): number {
	if (poly.length === 0) return Number.POSITIVE_INFINITY;
	const first = poly[0];
	if (poly.length === 1 && first) return Math.hypot(p[0] - first[0], p[1] - first[1], p[2] - first[2]);
	let min = Number.POSITIVE_INFINITY;
	for (let i = 0; i < poly.length - 1; i++) {
		const pStart = poly[i];
		const pEnd = poly[i + 1];
		if (!pStart || !pEnd) continue;
		const d = distPointToSegment3(p, pStart, pEnd);
		if (d < min) min = d;
	}
	return min;
}
