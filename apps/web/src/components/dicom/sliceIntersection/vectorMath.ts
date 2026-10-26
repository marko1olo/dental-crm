/**
 * vectorMath.ts — Векторная алгебра и пересечение плоскостей (Мандат 8b <= 120 строк).
 */

import type { Vec3, PlaneEquation } from "./types";

export function dot3(a: Vec3, b: Vec3): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross3(a: Vec3, b: Vec3, out?: Vec3): Vec3 {
	const x = a[1] * b[2] - a[2] * b[1];
	const y = a[2] * b[0] - a[0] * b[2];
	const z = a[0] * b[1] - a[1] * b[0];
	if (out) {
		out[0] = x;
		out[1] = y;
		out[2] = z;
		return out;
	}
	return [x, y, z];
}

export function norm3(v: Vec3): number {
	return Math.hypot(v[0], v[1], v[2]);
}

export function normalize3(v: Vec3, out?: Vec3): Vec3 {
	const len = Math.hypot(v[0], v[1], v[2]);
	const inv = len > 1e-12 ? 1 / len : 0;
	if (out) {
		out[0] = v[0] * inv;
		out[1] = v[1] * inv;
		out[2] = v[2] * inv;
		return out;
	}
	return [v[0] * inv, v[1] * inv, v[2] * inv];
}

export function planeFromPointAndNormal(point: Vec3, normal: Vec3): PlaneEquation {
	const n = normalize3(normal);
	return { normal: n, d: dot3(n, point) };
}

export function intersectPlanes3D(
	n1: Vec3, d1: number, n2: Vec3, d2: number, outRayPoint: Vec3, outRayDir: Vec3,
): boolean {
	const dx = n1[1] * n2[2] - n1[2] * n2[1];
	const dy = n1[2] * n2[0] - n1[0] * n2[2];
	const dz = n1[0] * n2[1] - n1[1] * n2[0];
	const dLen = Math.hypot(dx, dy, dz);
	if (dLen < 1e-6) return false;

	const invDLen = 1 / dLen;
	outRayDir[0] = dx * invDLen;
	outRayDir[1] = dy * invDLen;
	outRayDir[2] = dz * invDLen;

	const cosAlpha = dot3(n1, n2);
	const sin2Alpha = 1 - cosAlpha * cosAlpha;
	if (sin2Alpha < 1e-10) return false;

	const invSin2 = 1 / sin2Alpha;
	const c1 = (d1 - d2 * cosAlpha) * invSin2;
	const c2 = (d2 - d1 * cosAlpha) * invSin2;

	outRayPoint[0] = c1 * n1[0] + c2 * n2[0];
	outRayPoint[1] = c1 * n1[1] + c2 * n2[1];
	outRayPoint[2] = c1 * n1[2] + c2 * n2[2];
	return true;
}
