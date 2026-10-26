/**
 * nerveSpline2DMath.ts — 2D сплайн трассировка и коридор безопасности (Мандат 8b).
 */

import type { Point2D } from "../caliperModules/caliperTypes";
import { calculatePhysicalDistanceMm } from "../caliperModules/caliperDistanceMath";
import { MANDIBULAR_NERVE_SAFETY_MARGIN_MM, type MandibularNerveSpline } from "./nerveTypes";

export function interpolateNerveSpline2D(controlPoints: Point2D[], subdivisions = 12): Point2D[] {
	if (controlPoints.length < 2) return [...controlPoints];
	if (controlPoints.length === 2) {
		const [p0, p1] = controlPoints;
		if (!p0 || !p1) return [];
		const res: Point2D[] = [];
		for (let i = 0; i <= subdivisions; i++) {
			const t = i / subdivisions;
			res.push({ x: Number((p0.x + (p1.x - p0.x) * t).toFixed(3)), y: Number((p0.y + (p1.y - p0.y) * t).toFixed(3)) });
		}
		return res;
	}
	const pts = controlPoints;
	const n = pts.length;
	const spline: Point2D[] = [];
	for (let i = 0; i < n - 1; i++) {
		const p0 = i > 0 ? pts[i - 1]! : pts[i]!;
		const p1 = pts[i]!;
		const p2 = pts[i + 1]!;
		const p3 = i < n - 2 ? pts[i + 2]! : p2;
		for (let step = 0; step < subdivisions; step++) {
			const t = step / subdivisions, t2 = t * t, t3 = t2 * t;
			const x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
			const y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
			spline.push({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
		}
	}
	const last = pts[n - 1]!;
	spline.push({ x: Number(last.x.toFixed(3)), y: Number(last.y.toFixed(3)) });
	return spline;
}

export function calculateSplineLengthMm(points: Point2D[], w = 1000, h = 1000, sp = 0.1): number {
	if (points.length < 2) return 0;
	let total = 0;
	for (let i = 0; i < points.length - 1; i++) {
		total += calculatePhysicalDistanceMm(points[i]!, points[i + 1]!, w, h, sp);
	}
	return Number(total.toFixed(2));
}

export function generateNerveSafetyCorridor2D(pts: Point2D[], marginMm = MANDIBULAR_NERVE_SAFETY_MARGIN_MM, w = 1000, h = 1000, sp = 0.1): Point2D[] {
	if (pts.length < 2) return [];
	const marginPx = marginMm / sp;
	const pctX = (marginPx / w) * 100;
	const pctY = (marginPx / h) * 100;
	const left: Point2D[] = [];
	const right: Point2D[] = [];
	for (let i = 0; i < pts.length; i++) {
		const prev = i === 0 ? pts[i]! : pts[i - 1]!;
		const next = i === pts.length - 1 ? pts[i]! : pts[i + 1]!;
		const curr = pts[i]!;
		const dx = next.x - prev.x;
		const dy = next.y - prev.y;
		const len = Math.hypot(dx, dy) || 1;
		const nx = -dy / len;
		const ny = dx / len;
		left.push({ x: Number((curr.x + nx * pctX).toFixed(3)), y: Number((curr.y + ny * pctY).toFixed(3)) });
		right.push({ x: Number((curr.x - nx * pctX).toFixed(3)), y: Number((curr.y - ny * pctY).toFixed(3)) });
	}
	return [...left, ...right.reverse()];
}

export function distancePointToSegment2DMm(point: Point2D, segStart: Point2D, segEnd: Point2D, w = 1000, h = 1000, sp = 0.1): number {
	const px = (point.x / 100) * w, py = (point.y / 100) * h;
	const ax = (segStart.x / 100) * w, ay = (segStart.y / 100) * h;
	const bx = (segEnd.x / 100) * w, by = (segEnd.y / 100) * h;
	const abx = bx - ax, aby = by - ay;
	const l2 = abx * abx + aby * aby;
	if (l2 === 0) return Number((Math.hypot(px - ax, py - ay) * sp).toFixed(2));
	const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / l2));
	return Number((Math.hypot(px - (ax + t * abx), py - (ay + t * aby)) * sp).toFixed(2));
}

export function calculatePointToNerveDistance2D(point: Point2D, spline: Point2D[], w = 1000, h = 1000, sp = 0.1) {
	if (spline.length === 0) return { distanceMm: Infinity, closestPointIndex: -1 };
	if (spline.length === 1) return { distanceMm: calculatePhysicalDistanceMm(point, spline[0]!, w, h, sp), closestPointIndex: 0 };
	let minDist = Infinity;
	let closestIdx = 0;
	for (let i = 0; i < spline.length - 1; i++) {
		const d = distancePointToSegment2DMm(point, spline[i]!, spline[i + 1]!, w, h, sp);
		if (d < minDist) { minDist = d; closestIdx = i; }
	}
	return { distanceMm: minDist, closestPointIndex: closestIdx };
}

export function buildMandibularNerveSpline(params: {
	id?: string; side?: "left" | "right" | "both"; label?: string; controlPoints: Point2D[];
	imageWidthPx?: number; imageHeightPx?: number; pixelSpacingMm?: number; safetyMarginMm?: number; canalDiameterMm?: number;
}): MandibularNerveSpline {
	const w = params.imageWidthPx ?? 1000;
	const h = params.imageHeightPx ?? 1000;
	const sp = params.pixelSpacingMm ?? 0.1;
	const margin = params.safetyMarginMm ?? MANDIBULAR_NERVE_SAFETY_MARGIN_MM;
	const curve = interpolateNerveSpline2D(params.controlPoints);
	const corridor = generateNerveSafetyCorridor2D(curve, margin, w, h, sp);
	const len = calculateSplineLengthMm(curve, w, h, sp);
	const sideLabel = params.side === "left" ? "левый" : params.side === "right" ? "правый" : "двусторонний";
	return {
		id: params.id || `nerve-spline-${Date.now()}-${params.controlPoints.length}`,
		side: params.side || "right",
		label: params.label || `Нижнечелюстной канал (${sideLabel})`,
		controlPoints: params.controlPoints,
		interpolatedCurve: curve,
		safetyCorridorPolygon: corridor,
		lengthMm: len,
		canalDiameterMm: params.canalDiameterMm ?? 2.8,
		safetyMarginMm: margin,
	};
}
