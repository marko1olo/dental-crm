import type { Point2D } from "../../../utils/math/mprMath";
import { DEFAULT_ARCH_SAMPLE_STEP_MM, MAX_ARCH_SAMPLES } from "./panoramicArchTypes";
import { polylineLengthMm } from "./panoramicArchGeometry";
import { catmullRomSegment, lerp, reflect } from "./panoramicArchCatmullRom";

export * from "./panoramicArchCatmullRom";

function resolveStepMm(requestedStepMm: number, totalLengthMm: number): number {
	const step =
		Number.isFinite(requestedStepMm) && requestedStepMm > 0
			? requestedStepMm
			: DEFAULT_ARCH_SAMPLE_STEP_MM;
	if (totalLengthMm <= 0) return step;
	const minimumStep = totalLengthMm / MAX_ARCH_SAMPLES;
	return step > minimumStep ? step : minimumStep;
}

/**
 * Samples a centripetal Catmull-Rom curve through controlPoints at roughly stepMm spacing.
 */
export function sampleArchCurve(
	controlPoints: readonly Point2D[],
	stepMm: number = DEFAULT_ARCH_SAMPLE_STEP_MM,
): Point2D[] {
	if (controlPoints.length === 0) return [];
	if (controlPoints.length === 1) {
		const pt = controlPoints[0];
		return pt ? [{ ...pt }] : [];
	}

	const step = resolveStepMm(stepMm, polylineLengthMm(controlPoints));
	const last = controlPoints.length - 1;
	const curve: Point2D[] = [];

	for (let i = 0; i < last; i++) {
		const p1 = controlPoints[i];
		const p2 = controlPoints[i + 1];
		if (!p1 || !p2) continue;
		const p0 = i === 0 ? reflect(p1, p2) : controlPoints[i - 1] ?? reflect(p1, p2);
		const p3 = i + 2 > last ? reflect(p2, p1) : controlPoints[i + 2] ?? reflect(p2, p1);

		const chordMm = Math.hypot(p2.x - p1.x, p2.y - p1.y);
		const steps = Math.max(1, Math.round(chordMm / step));
		for (let j = 0; j < steps; j++) {
			curve.push(catmullRomSegment(p0, p1, p2, p3, j / steps));
		}
	}

	const tail = controlPoints[last];
	if (tail) {
		curve.push({ ...tail });
	}
	return curve;
}

/**
 * Walks an existing polyline and emits a point every stepMm of arc length.
 */
export function resamplePolylineByArcLength(
	points: readonly Point2D[],
	stepMm: number = DEFAULT_ARCH_SAMPLE_STEP_MM,
): Point2D[] {
	if (points.length <= 1) return points.map((point) => ({ ...point }));

	const totalMm = polylineLengthMm(points);
	const step = resolveStepMm(stepMm, totalMm);
	if (totalMm <= 0) {
		const pt = points[0];
		return pt ? [{ ...pt }] : [];
	}

	const first = points[0];
	if (!first) return [];
	const out: Point2D[] = [{ ...first }];
	let carriedMm = 0;

	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1];
		const b = points[i];
		if (!a || !b) continue;
		const segmentMm = Math.hypot(b.x - a.x, b.y - a.y);
		if (segmentMm <= 0) continue;

		let travelledMm = step - carriedMm;
		while (travelledMm <= segmentMm) {
			out.push(lerp(a, b, travelledMm / segmentMm));
			travelledMm += step;
		}
		carriedMm = segmentMm - (travelledMm - step);
	}

	const tail = points[points.length - 1];
	const emittedTail = out[out.length - 1];
	if (tail && emittedTail && (emittedTail.x !== tail.x || emittedTail.y !== tail.y)) {
		out.push({ ...tail });
	}
	return out;
}
