/**
 * catmullRomArch.ts — 3D Catmull-Rom интерполяция и фреймы Френе-Серре (Мандат 8b <= 120 строк).
 */

import type { Point2D, Point3D, ArchCurvePoint } from "./types";
import { vec3Length, vec3Normalize, vec3Cross, vec3Distance, vec3Lerp, reflectPoint } from "./vectorMath";

function evaluateCatmullRom3D(
	p0: Point3D, p1: Point3D, p2: Point3D, p3: Point3D, t: number, alpha = 0.5,
): { pos: Point3D; tangent: Point3D } {
	const knot = (a: Point3D, b: Point3D, prev: number): number => prev + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) ** alpha;
	const t0 = 0;
	const t1 = knot(p0, p1, t0);
	const t2 = knot(p1, p2, t1);
	const t3 = knot(p2, p3, t2);

	if (t1 === t0 || t2 === t1 || t3 === t2) {
		return { pos: vec3Lerp(p1, p2, t), tangent: vec3Normalize({ x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z }) };
	}

	const dt = 1e-4;
	const tClamped = Math.max(0, Math.min(1, t));
	const tPrev = Math.max(0, tClamped - dt);
	const tNext = Math.min(1, tClamped + dt);

	const evalPos = (paramT: number): Point3D => {
		const tt = t1 + (t2 - t1) * paramT;
		const a1 = vec3Lerp(p0, p1, (tt - t0) / (t1 - t0));
		const a2 = vec3Lerp(p1, p2, (tt - t1) / (t2 - t1));
		const a3 = vec3Lerp(p2, p3, (tt - t2) / (t3 - t2));
		const b1 = vec3Lerp(a1, a2, (tt - t0) / (t2 - t0));
		const b2 = vec3Lerp(a2, a3, (tt - t1) / (t3 - t1));
		return vec3Lerp(b1, b2, (tt - t1) / (t2 - t1));
	};

	const pos = evalPos(tClamped);
	const posPrev = evalPos(tPrev);
	const posNext = evalPos(tNext);
	const delta = tNext - tPrev;
	const rawTangent = delta > 0
		? { x: (posNext.x - posPrev.x) / delta, y: (posNext.y - posPrev.y) / delta, z: (posNext.z - posPrev.z) / delta }
		: { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };

	return { pos, tangent: vec3Normalize(rawTangent) };
}

export function generateCatmullRomArch(controlPoints: (Point3D | Point2D)[], stepMm = 0.5): ArchCurvePoint[] {
	if (controlPoints.length < 2) return [];
	const pts3D: Point3D[] = controlPoints.map((p) => ({ x: p.x, y: p.y, z: "z" in p && typeof p.z === "number" ? p.z : 0 }));
	const last = pts3D.length - 1;
	const rawCurve: { pos: Point3D; tangent: Point3D }[] = [];

	for (let i = 0; i < last; i++) {
		const p1 = pts3D[i]!;
		const p2 = pts3D[i + 1]!;
		const p0 = i === 0 ? reflectPoint(p1, p2) : pts3D[i - 1] ?? reflectPoint(p1, p2);
		const p3 = i + 2 > last ? reflectPoint(p2, p1) : pts3D[i + 2] ?? reflectPoint(p2, p1);
		const steps = Math.max(1, Math.round(vec3Distance(p1, p2) / Math.max(0.1, stepMm)));
		for (let j = 0; j < steps; j++) {
			rawCurve.push(evaluateCatmullRom3D(p0, p1, p2, p3, j / steps));
		}
	}

	const tail = pts3D[last]!;
	const prevTail = pts3D[last - 1]!;
	rawCurve.push({ pos: { ...tail }, tangent: vec3Normalize({ x: tail.x - prevTail.x, y: tail.y - prevTail.y, z: tail.z - prevTail.z }) });

	const result: ArchCurvePoint[] = [];
	let cumulativeLength = 0;
	const worldUp: Point3D = { x: 0, y: 0, z: 1 };

	for (let i = 0; i < rawCurve.length; i++) {
		const curr = rawCurve[i]!;
		if (i > 0) cumulativeLength += vec3Distance(rawCurve[i - 1]!.pos, curr.pos);
		let normalVec = vec3Cross(curr.tangent, worldUp);
		if (vec3Length(normalVec) < 1e-4) {
			normalVec = vec3Cross(curr.tangent, { x: 0, y: 1, z: 0 });
			if (vec3Length(normalVec) < 1e-4) normalVec = vec3Cross(curr.tangent, { x: 1, y: 0, z: 0 });
		}
		const normalLen = vec3Length(normalVec);
		const normal = normalLen > 1e-6 ? vec3Normalize(normalVec) : { x: 1, y: 0, z: 0 };
		const binormal = vec3Normalize(vec3Cross(normal, curr.tangent));
		result.push({ point: curr.pos, tangent: curr.tangent, normal, binormal, arcLengthMm: cumulativeLength, index: i });
	}

	return result;
}
