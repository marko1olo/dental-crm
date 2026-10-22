export interface Point2D {
	x: number;
	y: number;
}

export interface Transform2D {
	translateX: number;
	translateY: number;
	scale: number;
	rotationDegrees: number;
}

export function vector(p1: Point2D, p2: Point2D): Point2D {
	return { x: p2.x - p1.x, y: p2.y - p1.y };
}

export function vectorLength(v: Point2D): number {
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function distance(p1: Point2D, p2: Point2D): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

export function dotProduct(v1: Point2D, v2: Point2D): number {
	return v1.x * v2.x + v1.y * v2.y;
}

export function crossProduct2D(v1: Point2D, v2: Point2D): number {
	return v1.x * v2.y - v1.y * v2.x;
}

export function clamp(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, val));
}

export function radiansToDegrees(rad: number): number {
	return (rad * 180) / Math.PI;
}

export function degreesToRadians(deg: number): number {
	return (deg * Math.PI) / 180;
}

export function angleBetweenVectors(v1: Point2D, v2: Point2D): number {
	const len1 = vectorLength(v1);
	const len2 = vectorLength(v2);
	if (len1 === 0 || len2 === 0) return 0;
	const cosTheta = clamp(dotProduct(v1, v2) / (len1 * len2), -1, 1);
	return radiansToDegrees(Math.acos(cosTheta));
}

export function angle3Points(p1: Point2D, vertex: Point2D, p2: Point2D): number {
	const v1 = vector(vertex, p1);
	const v2 = vector(vertex, p2);
	return angleBetweenVectors(v1, v2);
}

export function angleBetweenLines(
	l1_p1: Point2D,
	l1_p2: Point2D,
	l2_p1: Point2D,
	l2_p2: Point2D
): number {
	const v1 = vector(l1_p1, l1_p2);
	const v2 = vector(l2_p1, l2_p2);
	return angleBetweenVectors(v1, v2);
}

export function projectPointOntoLine(
	point: Point2D,
	lineStart: Point2D,
	lineEnd: Point2D
): Point2D {
	const lineVec = vector(lineStart, lineEnd);
	const pointVec = vector(lineStart, point);
	const lineLenSq = lineVec.x * lineVec.x + lineVec.y * lineVec.y;
	if (lineLenSq === 0) return { ...lineStart };

	const t = dotProduct(pointVec, lineVec) / lineLenSq;
	return {
		x: lineStart.x + t * lineVec.x,
		y: lineStart.y + t * lineVec.y,
	};
}

export function signedDistanceToLine(
	point: Point2D,
	lineStart: Point2D,
	lineEnd: Point2D
): number {
	const lineVec = vector(lineStart, lineEnd);
	const len = vectorLength(lineVec);
	if (len === 0) return distance(point, lineStart);
	const dx = point.x - lineStart.x;
	const dy = point.y - lineStart.y;
	return (dx * lineVec.y - dy * lineVec.x) / len;
}
