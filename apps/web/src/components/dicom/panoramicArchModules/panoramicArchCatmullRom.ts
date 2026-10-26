import type { Point2D } from "../../../utils/math/mprMath";

export function lerp(a: Point2D, b: Point2D, t: number): Point2D {
	return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function reflect(anchor: Point2D, through: Point2D): Point2D {
	return { x: 2 * anchor.x - through.x, y: 2 * anchor.y - through.y };
}

/**
 * One centripetal Catmull-Rom segment evaluated at t in [0, 1] between p1 and p2.
 */
export function catmullRomSegment(
	p0: Point2D,
	p1: Point2D,
	p2: Point2D,
	p3: Point2D,
	t: number,
): Point2D {
	const alpha = 0.5;
	const knot = (a: Point2D, b: Point2D, previous: number): number =>
		previous + Math.hypot(b.x - a.x, b.y - a.y) ** alpha;

	const t0 = 0;
	const t1 = knot(p0, p1, t0);
	const t2 = knot(p1, p2, t1);
	const t3 = knot(p2, p3, t2);

	if (t1 === t0 || t2 === t1 || t3 === t2) return lerp(p1, p2, t);

	const tt = t1 + (t2 - t1) * t;
	const a1 = lerp(p0, p1, (tt - t0) / (t1 - t0));
	const a2 = lerp(p1, p2, (tt - t1) / (t2 - t1));
	const a3 = lerp(p2, p3, (tt - t2) / (t3 - t2));
	const b1 = lerp(a1, a2, (tt - t0) / (t2 - t0));
	const b2 = lerp(a2, a3, (tt - t1) / (t3 - t1));
	return lerp(b1, b2, (tt - t1) / (t2 - t1));
}
