/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT 3D IMPLANT GEOMETRY — SAFETY ENVELOPE (LAYER 2)
 * ═══════════════════════════════════════════════════════════════════════════
 * Mandibular canal (Inferior Alveolar Nerve) proximity, cylindrical distance
 * fields, segment-to-cylinder Euclidean metrics, and sinus floor clearance.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Vec3 } from "./types.js";

/**
 * Shortest distance from 3D point p to the surface of a finite 3D cylinder.
 */
export function pointToCylinderDistance(
	p: Vec3,
	entry: Vec3,
	dir: Vec3,
	length: number,
	radius: number,
): number {
	const vx = p[0] - entry[0];
	const vy = p[1] - entry[1];
	const vz = p[2] - entry[2];
	const t = vx * dir[0] + vy * dir[1] + vz * dir[2];
	const rx = vx - dir[0] * t;
	const ry = vy - dir[1] * t;
	const rz = vz - dir[2] * t;
	const rAxis = Math.hypot(rx, ry, rz);

	if (t < 0) {
		const dr = Math.max(0, rAxis - radius);
		return Math.hypot(-t, dr);
	}
	if (t > length) {
		const dt = t - length;
		const dr = Math.max(0, rAxis - radius);
		return Math.hypot(dt, dr);
	}
	return rAxis - radius;
}

/**
 * Shortest distance from 3D line segment [a, b] to the surface of a finite 3D cylinder.
 */
export function segmentToCylinderDistance(
	a: Vec3,
	b: Vec3,
	entry: Vec3,
	dir: Vec3,
	length: number,
	radius: number,
): number {
	let minD = Math.min(
		pointToCylinderDistance(a, entry, dir, length, radius),
		pointToCylinderDistance(b, entry, dir, length, radius),
	);
	const samples = 8;
	for (let i = 1; i < samples; i++) {
		const s = i / samples;
		const p: Vec3 = [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
		const d = pointToCylinderDistance(p, entry, dir, length, radius);
		if (d < minD) minD = d;
	}
	return minD;
}

/**
 * Evaluates shortest clearance between an implant cylindrical body and the mandibular canal (IAN).
 */
export function calculateMandibularCanalDistance(
	entry: Vec3,
	dir: Vec3,
	length: number,
	radius: number,
	canalSplinePoints: Vec3[],
	canalRadius = 0,
): number {
	if (canalSplinePoints.length === 0) return 99.0;
	let minRawDist = Number.POSITIVE_INFINITY;
	if (canalSplinePoints.length === 1) {
		minRawDist = pointToCylinderDistance(canalSplinePoints[0]!, entry, dir, length, radius);
	} else {
		for (let i = 0; i < canalSplinePoints.length - 1; i++) {
			const d = segmentToCylinderDistance(
				canalSplinePoints[i]!,
				canalSplinePoints[i + 1]!,
				entry,
				dir,
				length,
				radius,
			);
			if (d < minRawDist) minRawDist = d;
		}
	}
	const clearance = Math.max(0, minRawDist - canalRadius);
	return Number(clearance.toFixed(2));
}
