/**
 * vectorMath.ts — Чистые векторные 3D-операции (Мандат 8b <= 120 строк).
 */

import type { Point3D } from "./types";

export function vec3Length(v: Point3D): number {
	return Math.hypot(v.x, v.y, v.z);
}

export function vec3Normalize(v: Point3D): Point3D {
	const len = vec3Length(v);
	if (len < 1e-9) return { x: 0, y: 0, z: 1 };
	return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function vec3Dot(a: Point3D, b: Point3D): number {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vec3Cross(a: Point3D, b: Point3D): Point3D {
	return {
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x,
	};
}

export function vec3Distance(a: Point3D, b: Point3D): number {
	return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

export function vec3Lerp(a: Point3D, b: Point3D, t: number): Point3D {
	return {
		x: a.x + (b.x - a.x) * t,
		y: a.y + (b.y - a.y) * t,
		z: a.z + (b.z - a.z) * t,
	};
}

export function reflectPoint(anchor: Point3D, through: Point3D): Point3D {
	return {
		x: 2 * anchor.x - through.x,
		y: 2 * anchor.y - through.y,
		z: 2 * anchor.z - through.z,
	};
}
