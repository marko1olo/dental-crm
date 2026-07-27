import type { Point2D } from "../../mprMath";

/**
 * Panoramic (ОПТГ) reconstruction geometry, derived from the dental arch the
 * dentist actually traced with the SplineROI tool.
 *
 * This module is deliberately free of DOM, canvas, WebGL and cornerstone
 * imports at runtime: every cornerstone shape it consumes is described
 * structurally below, so the geometry can be executed and asserted in
 * `node:test` without a browser. The only import is a type, which is erased.
 *
 * Coordinate frame: everything here is WORLD millimetres, the same frame
 * `generatePanoramicImage` in `../../mprMath` reads. The arch is traced on the
 * axial plane, so the reconstruction consumes its world X/Y and sweeps world Z
 * itself; the Z of the traced slice is reported separately and is not baked
 * into the curve.
 */

/** A world-space coordinate triple as cornerstone stores it: [x, y, z] in mm. */
export type WorldPoint = ArrayLike<number>;

/**
 * The subset of a cornerstone SplineROI annotation this module reads.
 *
 * Declared structurally rather than imported from `@cornerstonejs/tools` so
 * the geometry stays testable outside a browser. Every optional member is
 * written `?: T | undefined` on purpose: the repo compiles with
 * `exactOptionalPropertyTypes`, and cornerstone's own optional members carry
 * an explicit `| undefined`, which would otherwise not be assignable here.
 */
export interface DrawnArchAnnotation {
	metadata?:
		| {
				/** Unit normal of the plane the annotation was drawn on. */
				viewPlaneNormal?: WorldPoint | undefined;
		  }
		| undefined;
	data?:
		| {
				/** The editable points the dentist placed, world mm. */
				handles?: { points?: WorldPoint[] | undefined } | undefined;
				/** The dense curve cornerstone rendered for those points, world mm. */
				contour?:
					| {
							polyline?: WorldPoint[] | undefined;
							closed?: boolean | undefined;
					  }
					| undefined;
		  }
		| undefined;
}

/**
 * Reasons the traced geometry itself cannot produce a reconstruction. These
 * are the only verdicts `buildPanoramicArch` can reach on its own.
 */
export type PanoramicArchIssue = "no_arch" | "too_few_points" | "wrong_plane";

/**
 * Every reason the viewer may have to refuse a panorama: the geometry verdicts
 * above, plus the two the viewer alone can observe — cornerstone refusing to
 * hand over its annotation store, and the volume having no decoded voxels yet.
 */
export type PanoramicIssue =
	| PanoramicArchIssue
	| "read_failed"
	| "volume_not_ready";

export type PanoramicArchResult =
	| {
			status: "ready";
			/** Sampled arch, one entry per output column of the panorama. */
			curve: Point2D[];
			/** The dentist's own control points, projected to the axial plane. */
			controlPoints: Point2D[];
			/** Arc length of the sampled curve, world mm. */
			lengthMm: number;
	  }
	| {
			status: "unavailable";
			reason: PanoramicArchIssue;
			/** How many usable control points were found (0 when none). */
			controlPointCount: number;
	  };

/**
 * Arc length between two output columns, world mm.
 *
 * 0.25 mm sits at or below the voxel pitch of a dental CBCT (typically
 * 0.2-0.4 mm), so the unwrap is not the step that throws away detail. Callers
 * may override it; it is a rendering resolution, not a tuning knob for the
 * clinical result.
 */
export const DEFAULT_ARCH_SAMPLE_STEP_MM = 0.25;

/**
 * Upper bound on output columns. A panorama wider than this is beyond any
 * display and would make the worker allocate width*height floats for nothing.
 * When a traced arch would exceed it, the effective step is widened instead of
 * truncating the arch — the dentist's full curve is always represented.
 */
export const MAX_ARCH_SAMPLES = 4096;

/**
 * How far the traced plane may tilt off the axial axis and still be usable.
 * |n·z| >= 0.9 is roughly 25 degrees, which admits a tilted oblique axial view
 * but rejects a sagittal or coronal trace (|n·z| ~ 0), whose X/Y projection
 * would collapse the arch into a meaningless line.
 */
export const AXIAL_NORMAL_MIN_ABS_Z = 0.9;

/**
 * Russian UI copy for each issue.
 *
 * i18n debt, stated plainly: this repo has no i18n library and no locale
 * files. These strings are Russian-only, exactly like the rest of the imaging
 * lane. Keeping them in a dictionary here rather than inline in JSX is the
 * only part of `.agents/UI_STANDARDS.md` "Decouple Strings" that can be
 * honoured today; a real locale lookup does not exist to route them through.
 */
export const panoramicIssueLabels: Record<PanoramicIssue, string> = {
	no_arch:
		"Панорама не построена: зубная дуга не обведена. Включите инструмент «Дуга (Spline)» и поставьте точки вдоль дуги на панели AXIAL.",
	too_few_points:
		"Панорама не построена: в обведённой дуге меньше двух точек. Поставьте минимум две точки вдоль зубной дуги.",
	wrong_plane:
		"Панорама не построена: дуга обведена не на аксиальном срезе. Постройте дугу на панели AXIAL.",
	read_failed:
		"Панорама не построена: срезы ещё не готовы, обведённую дугу прочитать не удалось. Дождитесь окончания загрузки и повторите.",
	volume_not_ready:
		"Панорама не построена: объём ещё не декодирован. Дождитесь окончания загрузки серии и нажмите «Развернуть» снова.",
};

/**
 * Drops the world Z of each point, keeping the axial-plane X/Y that
 * `generatePanoramicImage` consumes. Points with a non-finite X or Y are
 * discarded rather than propagated as NaN columns.
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
		const a = points[i - 1]!;
		const b = points[i]!;
		total += Math.hypot(b.x - a.x, b.y - a.y);
	}
	return total;
}

function lerp(a: Point2D, b: Point2D, t: number): Point2D {
	return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * One centripetal Catmull-Rom segment evaluated at `t` in [0, 1] between `p1`
 * and `p2`, using `p0`/`p3` as the neighbouring tangent anchors
 * (Barry-Goldman pyramidal form, alpha = 0.5).
 *
 * Centripetal parameterisation is chosen over uniform because a traced dental
 * arch has wildly uneven point spacing at the molars, and uniform Catmull-Rom
 * produces cusps and self-intersections there — visible as a folded panorama.
 *
 * t = 0 returns exactly `p1` and t = 1 returns exactly `p2`, which is what
 * makes the sampled curve pass through every point the dentist placed.
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

	// Coincident points collapse a knot interval; the segment is then a plain
	// straight line and the pyramidal form would divide by zero.
	if (t1 === t0 || t2 === t1 || t3 === t2) return lerp(p1, p2, t);

	const tt = t1 + (t2 - t1) * t;
	const a1 = lerp(p0, p1, (tt - t0) / (t1 - t0));
	const a2 = lerp(p1, p2, (tt - t1) / (t2 - t1));
	const a3 = lerp(p2, p3, (tt - t2) / (t3 - t2));
	const b1 = lerp(a1, a2, (tt - t0) / (t2 - t0));
	const b2 = lerp(a2, a3, (tt - t1) / (t3 - t1));
	return lerp(b1, b2, (tt - t1) / (t2 - t1));
}

function reflect(anchor: Point2D, through: Point2D): Point2D {
	return { x: 2 * anchor.x - through.x, y: 2 * anchor.y - through.y };
}

function resolveStepMm(
	requestedStepMm: number,
	totalLengthMm: number,
): number {
	const step =
		Number.isFinite(requestedStepMm) && requestedStepMm > 0
			? requestedStepMm
			: DEFAULT_ARCH_SAMPLE_STEP_MM;
	if (totalLengthMm <= 0) return step;
	const minimumStep = totalLengthMm / MAX_ARCH_SAMPLES;
	return step > minimumStep ? step : minimumStep;
}

/**
 * Samples a centripetal Catmull-Rom curve through `controlPoints` at roughly
 * `stepMm` spacing. Every control point is emitted exactly, so the curve
 * provably passes through what the dentist drew. Two control points degenerate
 * to the straight line between them, which is the honest answer for two points.
 */
export function sampleArchCurve(
	controlPoints: readonly Point2D[],
	stepMm: number = DEFAULT_ARCH_SAMPLE_STEP_MM,
): Point2D[] {
	if (controlPoints.length === 0) return [];
	if (controlPoints.length === 1) return [{ ...controlPoints[0]! }];

	const step = resolveStepMm(stepMm, polylineLengthMm(controlPoints));
	const last = controlPoints.length - 1;
	const curve: Point2D[] = [];

	for (let i = 0; i < last; i++) {
		const p1 = controlPoints[i]!;
		const p2 = controlPoints[i + 1]!;
		const p0 = i === 0 ? reflect(p1, p2) : controlPoints[i - 1]!;
		const p3 = i + 2 > last ? reflect(p2, p1) : controlPoints[i + 2]!;

		const chordMm = Math.hypot(p2.x - p1.x, p2.y - p1.y);
		const steps = Math.max(1, Math.round(chordMm / step));
		for (let j = 0; j < steps; j++) {
			curve.push(catmullRomSegment(p0, p1, p2, p3, j / steps));
		}
	}

	curve.push({ ...controlPoints[last]! });
	return curve;
}

/**
 * Walks an existing polyline and emits a point every `stepMm` of arc length.
 * Every emitted point lies ON the input polyline, so the shape the dentist saw
 * on screen is preserved exactly; only the column density changes. The first
 * and last points are always kept.
 */
export function resamplePolylineByArcLength(
	points: readonly Point2D[],
	stepMm: number = DEFAULT_ARCH_SAMPLE_STEP_MM,
): Point2D[] {
	if (points.length <= 1) return points.map((point) => ({ ...point }));

	const totalMm = polylineLengthMm(points);
	const step = resolveStepMm(stepMm, totalMm);
	if (totalMm <= 0) return [{ ...points[0]! }];

	const out: Point2D[] = [{ ...points[0]! }];
	let carriedMm = 0;

	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1]!;
		const b = points[i]!;
		const segmentMm = Math.hypot(b.x - a.x, b.y - a.y);
		if (segmentMm <= 0) continue;

		let travelledMm = step - carriedMm;
		while (travelledMm <= segmentMm) {
			out.push(lerp(a, b, travelledMm / segmentMm));
			travelledMm += step;
		}
		carriedMm = segmentMm - (travelledMm - step);
	}

	const tail = points[points.length - 1]!;
	const emittedTail = out[out.length - 1]!;
	if (emittedTail.x !== tail.x || emittedTail.y !== tail.y) {
		out.push({ ...tail });
	}
	return out;
}

function isAxialPlane(annotation: DrawnArchAnnotation): boolean {
	const normal = annotation.metadata?.viewPlaneNormal;
	// A missing normal is not evidence of a wrong plane. Rejecting a legitimate
	// arch because cornerstone did not stamp the metadata would be worse than
	// accepting it, so absence is treated as "cannot disprove".
	if (!normal || normal.length < 3) return true;
	const nx = normal[0] ?? Number.NaN;
	const ny = normal[1] ?? Number.NaN;
	const nz = normal[2] ?? Number.NaN;
	if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) {
		return true;
	}
	const length = Math.hypot(nx, ny, nz);
	if (length === 0) return true;
	return Math.abs(nz / length) >= AXIAL_NORMAL_MIN_ABS_Z;
}

export interface BuildPanoramicArchOptions {
	/** Arc length per output column, world mm. */
	sampleStepMm?: number | undefined;
}

/**
 * Turns the SplineROI annotations cornerstone is holding into the arch the
 * panoramic reconstruction should follow.
 *
 * The most recently drawn spline wins: cornerstone appends new annotations, so
 * the last usable one is the arch the dentist is working with right now.
 *
 * When cornerstone has already rendered a dense polyline for that annotation,
 * that polyline IS the curve the dentist saw, so it is resampled directly.
 * Otherwise the control points are interpolated with a centripetal
 * Catmull-Rom that passes through every one of them.
 *
 * There is no fallback curve. If nothing usable was drawn, the caller gets
 * `status: "unavailable"` and must render nothing.
 */
export function buildPanoramicArch(
	annotations: readonly DrawnArchAnnotation[],
	options: BuildPanoramicArchOptions = {},
): PanoramicArchResult {
	const stepMm = options.sampleStepMm ?? DEFAULT_ARCH_SAMPLE_STEP_MM;

	let bestControlPointCount = 0;
	let sawNonAxial = false;

	for (let i = annotations.length - 1; i >= 0; i--) {
		const annotation = annotations[i]!;
		const rawHandles = annotation.data?.handles?.points ?? [];
		const controlPoints = projectToAxialPlane(rawHandles);
		if (controlPoints.length === 0) continue;

		if (!isAxialPlane(annotation)) {
			sawNonAxial = true;
			if (controlPoints.length > bestControlPointCount) {
				bestControlPointCount = controlPoints.length;
			}
			continue;
		}

		if (controlPoints.length < 2) {
			if (controlPoints.length > bestControlPointCount) {
				bestControlPointCount = controlPoints.length;
			}
			continue;
		}

		const rawPolyline = annotation.data?.contour?.polyline ?? [];
		const polyline = projectToAxialPlane(rawPolyline);
		const usePolyline = polyline.length > controlPoints.length;
		const curve = usePolyline
			? resamplePolylineByArcLength(polyline, stepMm)
			: sampleArchCurve(controlPoints, stepMm);

		if (curve.length < 2) {
			// A degenerate trace (all points on top of each other) cannot be
			// unwrapped into columns; treat it as not enough geometry.
			if (controlPoints.length > bestControlPointCount) {
				bestControlPointCount = controlPoints.length;
			}
			continue;
		}

		return {
			status: "ready",
			curve,
			controlPoints,
			lengthMm: polylineLengthMm(curve),
		};
	}

	if (sawNonAxial) {
		return {
			status: "unavailable",
			reason: "wrong_plane",
			controlPointCount: bestControlPointCount,
		};
	}
	if (bestControlPointCount > 0) {
		return {
			status: "unavailable",
			reason: "too_few_points",
			controlPointCount: bestControlPointCount,
		};
	}
	return { status: "unavailable", reason: "no_arch", controlPointCount: 0 };
}
