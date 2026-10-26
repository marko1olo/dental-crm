/**
 * nerveSpline3DMath.ts — 3D сплайн Catmull-Rom, дистанции и оценка безопасности (Мандат 8b).
 */

import type { Point3D } from "../caliperModules/caliperTypes";
import {
	MANDIBULAR_NERVE_CRITICAL_THRESHOLD_MM,
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
	type NerveClearanceCheckResult,
} from "./nerveTypes";

export function calculatePointToNerveDistance3D(point: Point3D, spline: Point3D[]) {
	if (spline.length === 0) return { distanceMm: Infinity, closestPointIndex: -1 };
	if (spline.length === 1) {
		const p0 = spline[0]!;
		return { distanceMm: Number(Math.hypot(point.x - p0.x, point.y - p0.y, point.z - p0.z).toFixed(2)), closestPointIndex: 0 };
	}
	let minDistance = Infinity;
	let closestIdx = 0;
	for (let i = 0; i < spline.length - 1; i++) {
		const v = spline[i]!;
		const w = spline[i + 1]!;
		const vwx = w.x - v.x;
		const vwy = w.y - v.y;
		const vwz = w.z - v.z;
		const l2 = vwx * vwx + vwy * vwy + vwz * vwz;
		let d = 0;
		if (l2 === 0) {
			d = Math.hypot(point.x - v.x, point.y - v.y, point.z - v.z);
		} else {
			let t = ((point.x - v.x) * vwx + (point.y - v.y) * vwy + (point.z - v.z) * vwz) / l2;
			t = Math.max(0, Math.min(1, t));
			d = Math.hypot(point.x - (v.x + t * vwx), point.y - (v.y + t * vwy), point.z - (v.z + t * vwz));
		}
		if (d < minDistance) { minDistance = d; closestIdx = i; }
	}
	return { distanceMm: Number(minDistance.toFixed(2)), closestPointIndex: closestIdx };
}

export function evaluateNerveClearance(distanceMm: number, safetyMarginMm = MANDIBULAR_NERVE_SAFETY_MARGIN_MM): NerveClearanceCheckResult {
	const dist = Number(distanceMm.toFixed(2));
	const isDanger = dist < MANDIBULAR_NERVE_CRITICAL_THRESHOLD_MM;
	const isWarning = dist >= MANDIBULAR_NERVE_CRITICAL_THRESHOLD_MM && dist < safetyMarginMm;
	let safetyStatus: "safe" | "warning" | "danger" = "safe";
	let messageRu = "";
	if (isDanger) {
		safetyStatus = "danger";
		messageRu = `КРИТИЧЕСКАЯ ОПАСНОСТЬ: дистанция до нерва ${dist} мм (< 1.5 мм)! Риск повреждения сосудисто-нервного пучка!`;
	} else if (isWarning) {
		safetyStatus = "warning";
		messageRu = `ПРЕДУПРЕЖДЕНИЕ: дистанция до нерва ${dist} мм (< 2.0 мм). Рекомендуется укоротить имплантат.`;
	} else {
		safetyStatus = "safe";
		messageRu = `Безопасный коридор соблюден: дистанция до канала ${dist} мм (норма >= 2.0 мм).`;
	}
	return { distanceMm: dist, safetyStatus, safetyMarginMm, isDanger, isWarning, messageRu };
}

export function interpolateNerveSpline3D(controlPoints: readonly Point3D[], subdivisions = 12): Point3D[] {
	if (controlPoints.length === 0) return [];
	if (controlPoints.length === 1) {
		const p0 = controlPoints[0]!;
		return [{ x: Number(p0.x.toFixed(3)), y: Number(p0.y.toFixed(3)), z: Number(p0.z.toFixed(3)) }];
	}
	if (controlPoints.length === 2) {
		const [p0, p1] = controlPoints;
		if (!p0 || !p1) return [];
		const res: Point3D[] = [];
		for (let i = 0; i <= subdivisions; i++) {
			const t = i / subdivisions;
			res.push({ x: Number((p0.x + (p1.x - p0.x) * t).toFixed(3)), y: Number((p0.y + (p1.y - p0.y) * t).toFixed(3)), z: Number((p0.z + (p1.z - p0.z) * t).toFixed(3)) });
		}
		return res;
	}
	const pts = controlPoints;
	const n = pts.length;
	const spline: Point3D[] = [];
	for (let i = 0; i < n - 1; i++) {
		const p0 = i > 0 ? pts[i - 1]! : pts[i]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = i < n - 2 ? pts[i + 2]! : p2;
		for (let step = 0; step < subdivisions; step++) {
			const t = step / subdivisions;
			const t2 = t * t;
			const t3 = t2 * t;
			const cr = (v0: number, v1: number, v2: number, v3: number) =>
				0.5 * (2 * v1 + (-v0 + v2) * t + (2 * v0 - 5 * v1 + 4 * v2 - v3) * t2 + (-v0 + 3 * v1 - 3 * v2 + v3) * t3);
			spline.push({ x: Number(cr(p0.x, p1.x, p2.x, p3.x).toFixed(3)), y: Number(cr(p0.y, p1.y, p2.y, p3.y).toFixed(3)), z: Number(cr(p0.z, p1.z, p2.z, p3.z).toFixed(3)) });
		}
	}
	const last = pts[n - 1]!;
	spline.push({ x: Number(last.x.toFixed(3)), y: Number(last.y.toFixed(3)), z: Number(last.z.toFixed(3)) });
	return spline;
}

export function calculateSplineLength3DMm(points: Point3D[]): number {
	if (points.length < 2) return 0;
	let total = 0;
	for (let i = 0; i < points.length - 1; i++) {
		total += Math.hypot(points[i + 1]!.x - points[i]!.x, points[i + 1]!.y - points[i]!.y, points[i + 1]!.z - points[i]!.z);
	}
	return Number(total.toFixed(2));
}
