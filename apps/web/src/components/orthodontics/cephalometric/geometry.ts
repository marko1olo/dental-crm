/**
 * DENTE CRM — Cephalometric Vector Geometry Engine (Layer 0)
 * Pure 2D mathematical functions for distances, angles, projections, and vectors.
 */

import type { Point2D } from "./types";

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function distance(p1: Point2D, p2: Point2D): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates vector between two 2D points (from -> to).
 */
export function vector(from: Point2D, to: Point2D): Point2D {
	return { x: to.x - from.x, y: to.y - from.y };
}

/**
 * Calculates dot product of two 2D vectors.
 */
export function dotProduct(v1: Point2D, v2: Point2D): number {
	return v1.x * v2.x + v1.y * v2.y;
}

/**
 * Calculates length/magnitude of a 2D vector.
 */
export function vectorLength(v: Point2D): number {
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Calculates angle in degrees between two 2D vectors (0° to 180°).
 */
export function angleBetweenVectors(v1: Point2D, v2: Point2D): number {
	const l1 = vectorLength(v1);
	const l2 = vectorLength(v2);
	if (l1 === 0 || l2 === 0) return 0;
	const cosVal = Math.max(-1, Math.min(1, dotProduct(v1, v2) / (l1 * l2)));
	return (Math.acos(cosVal) * 180) / Math.PI;
}

/**
 * Calculates angle between three points where `vertex` is the angle vertex:
 * Angle formed by P1 - Vertex - P2.
 */
export function angle3Points(p1: Point2D, vertex: Point2D, p2: Point2D): number {
	const v1 = vector(vertex, p1);
	const v2 = vector(vertex, p2);
	return angleBetweenVectors(v1, v2);
}

/**
 * Calculates angle between two lines defined by (p1 -> p2) and (p3 -> p4).
 * Returns positive acute/obtuse angle (0° to 180°).
 */
export function angleBetweenLines(
	p1: Point2D,
	p2: Point2D,
	p3: Point2D,
	p4: Point2D,
): number {
	const v1 = vector(p1, p2);
	const v2 = vector(p3, p4);
	return angleBetweenVectors(v1, v2);
}

/**
 * Projects point P perpendicularly onto line (A -> B).
 * Returns the projected point on the line.
 */
export function projectPointOntoLine(p: Point2D, a: Point2D, b: Point2D): Point2D {
	const ab = vector(a, b);
	const ap = vector(a, p);
	const abLenSq = ab.x * ab.x + ab.y * ab.y;
	if (abLenSq === 0) return { ...a };
	const t = dotProduct(ap, ab) / abLenSq;
	return {
		x: a.x + t * ab.x,
		y: a.y + t * ab.y,
	};
}
