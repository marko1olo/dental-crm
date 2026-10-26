/**
 * liangBarsky.ts — Алгоритмы отсечения Лианга-Барски в 2D и 3D (Мандат 8b <= 120 строк).
 */

import type { Vec3, BoundingBox3D, Segment3D, Segment2D } from "./types";

export function clipLineToAABB3D(
	p0: Vec3, dir: Vec3, box: BoundingBox3D, outSegment: Segment3D,
): boolean {
	let tEnter = -Infinity;
	let tExit = Infinity;

	for (let i = 0; i < 3; i++) {
		const d = dir[i]!;
		const p = p0[i]!;
		const min = i === 0 ? box.xMin : i === 1 ? box.yMin : box.zMin;
		const max = i === 0 ? box.xMax : i === 1 ? box.yMax : box.zMax;

		if (Math.abs(d) < 1e-12) {
			if (p < min || p > max) return false;
		} else {
			const t1 = (min - p) / d;
			const t2 = (max - p) / d;
			const tNear = Math.min(t1, t2);
			const tFar = Math.max(t1, t2);
			if (tNear > tEnter) tEnter = tNear;
			if (tFar < tExit) tExit = tFar;
			if (tEnter > tExit) return false;
		}
	}

	outSegment.p1[0] = p0[0] + tEnter * dir[0];
	outSegment.p1[1] = p0[1] + tEnter * dir[1];
	outSegment.p1[2] = p0[2] + tEnter * dir[2];

	outSegment.p2[0] = p0[0] + tExit * dir[0];
	outSegment.p2[1] = p0[1] + tExit * dir[1];
	outSegment.p2[2] = p0[2] + tExit * dir[2];
	return true;
}

export function clipSegment2D(
	x1: number, y1: number, x2: number, y2: number,
	xMin: number, xMax: number, yMin: number, yMax: number,
	outSegment: Segment2D,
): boolean {
	const dx = x2 - x1;
	const dy = y2 - y1;
	let t0 = 0.0;
	let t1 = 1.0;
	const p = [-dx, dx, -dy, dy];
	const q = [x1 - xMin, xMax - x1, y1 - yMin, yMax - y1];

	for (let i = 0; i < 4; i++) {
		const pi = p[i]!;
		const qi = q[i]!;
		if (Math.abs(pi) < 1e-12) {
			if (qi < 0) return false;
		} else {
			const r = qi / pi;
			if (pi < 0) {
				if (r > t1) return false;
				if (r > t0) t0 = r;
			} else {
				if (r < t0) return false;
				if (r < t1) t1 = r;
			}
		}
	}

	outSegment.x1 = x1 + t0 * dx;
	outSegment.y1 = y1 + t0 * dy;
	outSegment.x2 = x1 + t1 * dx;
	outSegment.y2 = y1 + t1 * dy;
	return true;
}
