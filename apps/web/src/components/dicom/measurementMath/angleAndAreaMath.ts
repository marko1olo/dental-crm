/**
 * angleAndAreaMath.ts — Вычисление углов 2D/3D и физической площади ROI (Мандат 8b <= 120 строк).
 */

import {
	point2ToArray,
	point3ToArray,
	type Point2D,
	type Point3D,
	type VoxelSpacing2D,
	type VoxelSpacing3D,
} from "./types";
import { euclideanDistance2D } from "./euclideanMath";

export function angleDeg2D(
	a: Point2D,
	vertex: Point2D,
	b: Point2D,
	spacing: VoxelSpacing2D = [1, 1],
): number {
	const [ax, ay] = point2ToArray(a);
	const [vx, vy] = point2ToArray(vertex);
	const [bx, by] = point2ToArray(b);
	const sx = spacing[0] || 1;
	const sy = spacing[1] || 1;
	const v1x = (ax - vx) * sx;
	const v1y = (ay - vy) * sy;
	const v2x = (bx - vx) * sx;
	const v2y = (by - vy) * sy;
	const dot = v1x * v2x + v1y * v2y;
	const det = v1x * v2y - v1y * v2x;
	return (Math.abs(Math.atan2(det, dot)) * 180) / Math.PI;
}

export function angleDeg3D(
	a: Point3D,
	vertex: Point3D,
	b: Point3D,
	spacing: VoxelSpacing3D = [1, 1, 1],
): number {
	const [ax, ay, az] = point3ToArray(a);
	const [vx, vy, vz] = point3ToArray(vertex);
	const [bx, by, bz] = point3ToArray(b);
	const sx = spacing[0] || 1;
	const sy = spacing[1] || 1;
	const sz = spacing[2] || 1;
	const u: [number, number, number] = [(ax - vx) * sx, (ay - vy) * sy, (az - vz) * sz];
	const w: [number, number, number] = [(bx - vx) * sx, (by - vy) * sy, (bz - vz) * sz];
	const dot = u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
	const lenU = Math.hypot(u[0], u[1], u[2]);
	const lenW = Math.hypot(w[0], w[1], w[2]);
	if (lenU === 0 || lenW === 0) return 0;
	const cosTheta = Math.max(-1, Math.min(1, dot / (lenU * lenW)));
	return (Math.acos(cosTheta) * 180) / Math.PI;
}

export function rectangleAreaMm2(
	corner1: Point2D,
	corner2: Point2D,
	spacing: VoxelSpacing2D = [1, 1],
): number {
	const [x1, y1] = point2ToArray(corner1);
	const [x2, y2] = point2ToArray(corner2);
	const sx = spacing[0] || 1;
	const sy = spacing[1] || 1;
	return Math.abs(x2 - x1) * sx * (Math.abs(y2 - y1) * sy);
}

export function ellipseAreaMm2(
	corner1: Point2D,
	corner2: Point2D,
	spacing: VoxelSpacing2D = [1, 1],
): number {
	const [x1, y1] = point2ToArray(corner1);
	const [x2, y2] = point2ToArray(corner2);
	const sx = spacing[0] || 1;
	const sy = spacing[1] || 1;
	const semiMajor = (Math.abs(x2 - x1) * sx) / 2;
	const semiMinor = (Math.abs(y2 - y1) * sy) / 2;
	return Math.PI * semiMajor * semiMinor;
}

export function circleAreaMm2(radiusMm: number): number {
	if (radiusMm <= 0) return 0;
	return Math.PI * radiusMm * radiusMm;
}

export function circleRadiusMm(
	center: Point2D,
	edge: Point2D,
	spacing: VoxelSpacing2D = [1, 1],
): number {
	return euclideanDistance2D(center, edge, spacing);
}
