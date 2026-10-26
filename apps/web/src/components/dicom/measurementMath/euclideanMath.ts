/**
 * euclideanMath.ts — Евклидовы расстояния 2D/3D с анизотропным скейлингом (Мандат 8b <= 120 строк).
 */

import {
	point2ToArray,
	point3ToArray,
	type Point2D,
	type Point3D,
	type VoxelSpacing2D,
	type VoxelSpacing3D,
} from "./types";

export function euclideanDistance2D(
	a: Point2D,
	b: Point2D,
	spacing: VoxelSpacing2D = [1, 1],
): number {
	const [ax, ay] = point2ToArray(a);
	const [bx, by] = point2ToArray(b);
	const sx = spacing[0] || 1;
	const sy = spacing[1] || 1;
	const dx = (bx - ax) * sx;
	const dy = (by - ay) * sy;
	return Math.hypot(dx, dy);
}

export function euclideanDistance3D(
	a: Point3D,
	b: Point3D,
	spacing: VoxelSpacing3D = [1, 1, 1],
): number {
	const [ax, ay, az] = point3ToArray(a);
	const [bx, by, bz] = point3ToArray(b);
	const sx = spacing[0] || 1;
	const sy = spacing[1] || 1;
	const sz = spacing[2] || 1;
	const dx = (bx - ax) * sx;
	const dy = (by - ay) * sy;
	const dz = (bz - az) * sz;
	return Math.hypot(dx, dy, dz);
}

export function polylineLength2D(
	points: Point2D[],
	spacing: VoxelSpacing2D = [1, 1],
): number {
	if (points.length < 2) return 0;
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += euclideanDistance2D(points[i - 1]!, points[i]!, spacing);
	}
	return total;
}

export function polylineLength3D(
	points: Point3D[],
	spacing: VoxelSpacing3D = [1, 1, 1],
): number {
	if (points.length < 2) return 0;
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += euclideanDistance3D(points[i - 1]!, points[i]!, spacing);
	}
	return total;
}
