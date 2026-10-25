/**
 * VisiographMathGeometry.ts
 * 2D Euclidean geometry, linear ruler and angle measurement computations.
 */

export interface Point2D {
	x: number;
	y: number;
}

export interface RulerMeasurement {
	id: string;
	p1: Point2D;
	p2: Point2D;
	lengthPx: number;
	lengthMm: number;
	label?: string | undefined;
	color?: string | undefined;
}

export type AngleMeasurementKind = "tooth_axis" | "implant_shaft" | "general_angle";

export interface AngleMeasurement {
	id: string;
	vertex: Point2D;
	arm1: Point2D;
	arm2: Point2D;
	angleDeg: number;
	deviationFromVerticalDeg: number;
	kind: AngleMeasurementKind;
	label?: string | undefined;
	color?: string | undefined;
}

export function distance2D(p1: Point2D, p2: Point2D): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

export function calculateRuler(
	p1: Point2D,
	p2: Point2D,
	scaleMmPerPixel = 0.035,
	label?: string,
	id?: string,
): RulerMeasurement {
	const lengthPx = distance2D(p1, p2);
	return {
		id: id ?? `ruler-${Date.now()}-${Math.abs(Math.round(p1.x + p2.x + p1.y + p2.y)).toString(36)}`,
		p1: { x: p1.x, y: p1.y },
		p2: { x: p2.x, y: p2.y },
		lengthPx,
		lengthMm: lengthPx * scaleMmPerPixel,
		label,
		color: "#00e5ff",
	};
}

export function calculateAngle3Points(
	vertex: Point2D,
	arm1: Point2D,
	arm2: Point2D,
	kind: AngleMeasurementKind = "general_angle",
	label?: string,
	id?: string,
): AngleMeasurement {
	const v1x = arm1.x - vertex.x;
	const v1y = arm1.y - vertex.y;
	const v2x = arm2.x - vertex.x;
	const v2y = arm2.y - vertex.y;
	const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
	const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

	let angleDeg = 0;
	if (len1 > 0.0001 && len2 > 0.0001) {
		const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
		angleDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180.0) / Math.PI;
	}

	let deviationFromVerticalDeg = 0;
	if (len1 > 0.0001) {
		const dotVert = -v1y / len1;
		deviationFromVerticalDeg = (Math.acos(Math.max(-1, Math.min(1, dotVert))) * 180.0) / Math.PI;
	}

	return {
		id: id ?? `angle-${Date.now()}-${Math.abs(Math.round(vertex.x + arm1.x + arm2.x)).toString(36)}`,
		vertex: { x: vertex.x, y: vertex.y },
		arm1: { x: arm1.x, y: arm1.y },
		arm2: { x: arm2.x, y: arm2.y },
		angleDeg,
		deviationFromVerticalDeg,
		kind,
		label,
		color: "#ffab00",
	};
}

export function calculatePolygonArea(points: Point2D[]): number {
	const n = points.length;
	if (n < 3) return 0;
	let area = 0;
	for (let i = 0; i < n; i++) {
		const curr = points[i];
		const next = points[(i + 1) % n];
		if (curr && next) area += curr.x * next.y - next.x * curr.y;
	}
	return Math.abs(area) * 0.5;
}

export function calculatePolygonPerimeter(points: Point2D[]): number {
	const n = points.length;
	if (n < 2) return 0;
	let perimeter = 0;
	for (let i = 0; i < n; i++) {
		const curr = points[i];
		const next = points[(i + 1) % n];
		if (curr && next) perimeter += distance2D(curr, next);
	}
	return perimeter;
}
