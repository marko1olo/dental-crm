import type { Point2D } from "../../../utils/math/mprMath";
import type { WorldPoint } from "./panoramicArchTypes";
import { CLOSED_CONTOUR_GAP_FRACTION } from "./panoramicArchTypes";

/**
 * Drops the world Z of each point, keeping axial-plane X/Y that generatePanoramicImage consumes.
 */
export function projectToAxialPlane(points: readonly WorldPoint[]): Point2D[] {
	const out: Point2D[] = [];
	for (const point of points) {
		if (!point || point.length < 2) continue;
		const x = point[0];
		const y = point[1];
		if (typeof x !== "number" || typeof y !== "number") continue;
		if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
		out.push({ x, y });
	}
	return out;
}

/** Sum of segment lengths of an open polyline, world mm. */
export function polylineLengthMm(points: readonly Point2D[]): number {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1];
		const b = points[i];
		if (!a || !b) continue;
		total += Math.hypot(b.x - a.x, b.y - a.y);
	}
	return total;
}

/**
 * True when a polyline comes back to where it started — a loop, not an open arch.
 */
export function polylineReturnsToStart(
	points: readonly Point2D[],
	gapFraction: number = CLOSED_CONTOUR_GAP_FRACTION,
): boolean {
	if (points.length < 4) return false;
	const totalMm = polylineLengthMm(points);
	if (totalMm <= 0) return false;
	const fraction =
		Number.isFinite(gapFraction) && gapFraction >= 0
			? gapFraction
			: CLOSED_CONTOUR_GAP_FRACTION;
	const first = points[0];
	const last = points[points.length - 1];
	if (!first || !last) return false;
	return Math.hypot(last.x - first.x, last.y - first.y) <= totalMm * fraction;
}

/**
 * Puts the arch in a deterministic column order: patient's RIGHT first (smallest world X first).
 */
export function orientArchPatientRightFirst(
	points: readonly Point2D[],
): Point2D[] {
	const ordered = points.map((point) => ({ ...point }));
	if (ordered.length < 2) return ordered;
	const first = ordered[0];
	const last = ordered[ordered.length - 1];
	if (!first || !last) return ordered;
	if (first.x > last.x) return ordered.reverse();
	if (first.x === last.x && first.y > last.y) return ordered.reverse();
	return ordered;
}
