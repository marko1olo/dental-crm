import type { Point2D } from "../../mprMath";

/**
 * Panoramic (ОПТГ) reconstruction geometry, derived from the dental arch the
 * dentist actually traced with the SplineROI tool, plus the rules that decide
 * whether there are decoded voxels to unwrap along it.
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
							/**
							 * Set by cornerstone when the trace was finished as a loop. A
							 * finished SplineROI is a CLOSED SplineROI: double-clicking or
							 * clicking back on the first control point is the only way to end a
							 * trace and both set this flag (`SplineROITool.js:245-269`), so this
							 * is the production case, not an edge case. It MUST be read — see
							 * `buildPanoramicArch`.
							 */
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
export type PanoramicArchIssue =
	| "no_arch"
	| "too_few_points"
	| "degenerate_arch"
	| "wrong_plane";

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
 * Target ceiling on output columns. A panorama wider than this is beyond any
 * display and would make the worker allocate width*height floats for nothing.
 * When a traced arch would exceed it, the effective step is widened instead of
 * truncating the arch — the dentist's full curve is always represented.
 *
 * It is a target, not a hard limit: every control point is emitted regardless,
 * so a trace with more than `MAX_ARCH_SAMPLES` control points overshoots by the
 * excess. That is the correct trade — losing a placed point would falsify the
 * arch, allocating a few extra columns only costs memory.
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
 * When `data.contour.closed` is missing, this decides whether a polyline is a
 * loop: the gap between its last and first point, as a fraction of its own
 * length.
 *
 * A closed spline's polyline ends exactly where it began, so the gap is zero.
 * An open traced arch runs from one last molar to the other, so its gap is the
 * end-to-end chord — tens of millimetres, roughly 40% of the arch length. 1% of
 * a ~130 mm arch is ~1.3 mm: orders of magnitude above floating-point noise and
 * orders of magnitude below any real open trace. Cornerstone applies the same
 * geometric test with an exact-equality tolerance when the flag is absent
 * (`updateContourPolyline.js`), so this is the tolerant version of a rule that
 * already exists upstream.
 */
export const CLOSED_CONTOUR_GAP_FRACTION = 0.01;

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
	degenerate_arch:
		"Панорама не построена: длина обведённой дуги нулевая — точки стоят в одном месте. Обведите дугу от одного конца челюсти до другого.",
	wrong_plane:
		"Панорама не построена: дуга обведена не на аксиальном срезе. Постройте дугу на панели AXIAL.",
	read_failed:
		"Панорама не построена: срезы ещё не готовы, обведённую дугу прочитать не удалось. Дождитесь окончания загрузки и повторите.",
	volume_not_ready:
		"Панорама не построена: объём ещё не декодирован. Дождитесь окончания загрузки серии и нажмите «Развернуть» снова.",
};

/**
 * Russian UI copy for a panorama that WAS built, kept in this dictionary next to
 * the refusal copy so that no user-facing literal lives inline in JSX. Same
 * i18n debt as `panoramicIssueLabels`, stated once above; the unit is part of
 * the sentence, so the formatting belongs here rather than in the component.
 */
export function panoramicReadyLabel(
	controlPointCount: number,
	lengthMm: number,
): string {
	return `Панорама построена по обведённой дуге: точек ${controlPointCount}, длина дуги ${lengthMm.toFixed(1)} мм.`;
}

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
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const a = points[i - 1]!;
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const b = points[i]!;
		total += Math.hypot(b.x - a.x, b.y - a.y);
	}
	return total;
}

/**
 * True when a polyline comes back to where it started — a loop, not an open
 * arch. Second line of defence behind `data.contour.closed`: an annotation whose
 * flag was never stamped can still be a loop, and unwrapping a loop appends a
 * return sweep across the tongue and palate to the panorama.
 *
 * Fewer than four points cannot describe a loop worth cutting, which is the same
 * threshold cornerstone uses for its own closed test. A trace with no extent is
 * not a loop either — it is a degenerate arch and is reported as one — so
 * zero-length input answers false.
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
	// biome-ignore lint/style/noNonNullAssertion: automated suppression
	const first = points[0]!;
	// biome-ignore lint/style/noNonNullAssertion: automated suppression
	const last = points[points.length - 1]!;
	return Math.hypot(last.x - first.x, last.y - first.y) <= totalMm * fraction;
}

/**
 * Puts the arch in a deterministic column order: the end on the patient's RIGHT
 * comes first, so it lands in the leftmost column of the unwrap
 * (`generatePanoramicImage` writes column x from `splinePoints[x]`,
 * `../../mprMath.ts:237` and `:267-268`). That is how an ОПТГ is read — as if
 * facing the patient — and cornerstone's world frame is the DICOM patient frame,
 * where +X grows toward the patient's LEFT, so "patient's right first" is
 * "smallest world X first".
 *
 * Without this the order was whatever cornerstone left behind: for a closed
 * contour `updateContourPolyline` reverses the polyline AND the handle list to
 * force a clockwise winding, so which side of the patient landed on the left of
 * the panorama depended on the direction the arch happened to be traced in.
 *
 * The tie-breaks keep this a pure function of the geometry: equal X falls back
 * to Y (posterior grows +Y in the patient frame), equal in both leaves the order
 * untouched.
 */
export function orientArchPatientRightFirst(
	points: readonly Point2D[],
): Point2D[] {
	const ordered = points.map((point) => ({ ...point }));
	if (ordered.length < 2) return ordered;
	// biome-ignore lint/style/noNonNullAssertion: automated suppression
	const first = ordered[0]!;
	// biome-ignore lint/style/noNonNullAssertion: automated suppression
	const last = ordered[ordered.length - 1]!;
	if (first.x > last.x) return ordered.reverse();
	if (first.x === last.x && first.y > last.y) return ordered.reverse();
	return ordered;
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
	// biome-ignore lint/style/noNonNullAssertion: automated suppression
	if (controlPoints.length === 1) return [{ ...controlPoints[0]! }];

	const step = resolveStepMm(stepMm, polylineLengthMm(controlPoints));
	const last = controlPoints.length - 1;
	const curve: Point2D[] = [];

	for (let i = 0; i < last; i++) {
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const p1 = controlPoints[i]!;
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const p2 = controlPoints[i + 1]!;
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const p0 = i === 0 ? reflect(p1, p2) : controlPoints[i - 1]!;
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const p3 = i + 2 > last ? reflect(p2, p1) : controlPoints[i + 2]!;

		const chordMm = Math.hypot(p2.x - p1.x, p2.y - p1.y);
		const steps = Math.max(1, Math.round(chordMm / step));
		for (let j = 0; j < steps; j++) {
			curve.push(catmullRomSegment(p0, p1, p2, p3, j / steps));
		}
	}

	// biome-ignore lint/style/noNonNullAssertion: automated suppression
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
	// biome-ignore lint/style/noNonNullAssertion: automated suppression
	if (totalMm <= 0) return [{ ...points[0]! }];

	// biome-ignore lint/style/noNonNullAssertion: automated suppression
	const out: Point2D[] = [{ ...points[0]! }];
	let carriedMm = 0;

	for (let i = 1; i < points.length; i++) {
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const a = points[i - 1]!;
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
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

	// biome-ignore lint/style/noNonNullAssertion: automated suppression
	const tail = points[points.length - 1]!;
	// biome-ignore lint/style/noNonNullAssertion: automated suppression
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
 * When cornerstone has already rendered a dense OPEN polyline for that
 * annotation, that polyline IS the curve the dentist saw, so it is resampled
 * directly. When the contour is closed — which is how every finished SplineROI
 * trace ends — the polyline contains a wrap-around segment that is not part of
 * the arch, so the control points are interpolated instead with a centripetal
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

	// Annotations are walked newest first, so the first problem recorded is the
	// problem with the trace the dentist just made — that is the one worth
	// telling them about.
	let firstIssue: PanoramicArchIssue | null = null;
	let firstIssueControlPoints = 0;

	const recordIssue = (
		reason: PanoramicArchIssue,
		controlPointCount: number,
	) => {
		if (firstIssue !== null) return;
		firstIssue = reason;
		firstIssueControlPoints = controlPointCount;
	};

	for (let i = annotations.length - 1; i >= 0; i--) {
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const annotation = annotations[i]!;
		const rawHandles = annotation.data?.handles?.points ?? [];
		const controlPoints = projectToAxialPlane(rawHandles);
		if (controlPoints.length === 0) continue;

		if (!isAxialPlane(annotation)) {
			recordIssue("wrong_plane", controlPoints.length);
			continue;
		}

		if (controlPoints.length < 2) {
			recordIssue("too_few_points", controlPoints.length);
			continue;
		}

		const rawPolyline = annotation.data?.contour?.polyline ?? [];
		const polyline = projectToAxialPlane(rawPolyline);
		// A CLOSED contour's polyline carries one extra curve segment wrapping the
		// last control point back to the first (`CubicSpline.js:40-41` decides the
		// segment count, `Spline.js:211-214` emits all of them), and closed is the
		// only way a SplineROI trace can be finished. Walking that polyline as if it
		// were open appends a return sweep straight across the tongue and palate to
		// the right of the real panorama — on a ~130 mm arch with a ~55 mm
		// end-to-end chord that is ~30% of the output columns showing tissue that is
		// not the dental arch — and inflates the reported arch length by the same
		// amount. The dentist's own control points are an open list by construction,
		// so a closed contour is interpolated from them instead of resampled.
		const contourIsClosed =
			annotation.data?.contour?.closed === true ||
			polylineReturnsToStart(polyline);
		const usePolyline =
			!contourIsClosed && polyline.length > controlPoints.length;
		const sampled = usePolyline
			? resamplePolylineByArcLength(polyline, stepMm)
			: sampleArchCurve(controlPoints, stepMm);
		const curve = orientArchPatientRightFirst(sampled);
		const lengthMm = polylineLengthMm(curve);

		if (curve.length < 2 || lengthMm < stepMm) {
			// The trace has points but no extent — they sit on top of each other,
			// or within one output column of each other. Unwrapping it yields a
			// strip of one repeated ray: a plausible-looking image of nothing.
			recordIssue("degenerate_arch", controlPoints.length);
			continue;
		}

		return {
			status: "ready",
			curve,
			controlPoints: orientArchPatientRightFirst(controlPoints),
			lengthMm,
		};
	}

	if (firstIssue !== null) {
		return {
			status: "unavailable",
			reason: firstIssue,
			controlPointCount: firstIssueControlPoints,
		};
	}
	return { status: "unavailable", reason: "no_arch", controlPointCount: 0 };
}

/**
 * The subset of a cornerstone image volume needed to decide whether there are
 * decoded voxels to unwrap. Described structurally for the same reason as
 * `DrawnArchAnnotation`: so the readiness rules are executable in `node:test`
 * without a browser and without a DICOM archive.
 */
export interface VolumeScalarDataSource {
	/** [columns, rows, slices] of the volume. */
	dimensions?: ArrayLike<number> | undefined;
	/** One imageId per slice, in slice order. */
	imageIds?: readonly string[] | undefined;
	voxelManager?:
		| {
				/**
				 * cornerstone 5 path: assembles the volume out of the per-slice image
				 * cache (`VoxelManager.js:643-669`). Returns a zero-length array when
				 * no slice has been decoded yet.
				 */
				getCompleteScalarDataArray?: (() => ArrayLike<number>) | undefined;
				/**
				 * Legacy accessor. THROWS `'No scalar data available'` on a streaming
				 * image volume, which is every CBCT series this viewer loads.
				 */
				getScalarData?:
					| ((storeScalarData?: boolean) => ArrayLike<number>)
					| undefined;
		  }
		| undefined;
}

export type PanoramicVolumeResult =
	| {
			status: "ready";
			/** Voxels in volume index order, at least `voxelCount` long. */
			scalarData: ArrayLike<number>;
			/** dimensions[0] * dimensions[1] * dimensions[2]. */
			voxelCount: number;
	  }
	| { status: "unavailable"; reason: "volume_not_ready" };

function expectedVoxelCount(
	dimensions: ArrayLike<number> | undefined,
): number | null {
	if (!dimensions || dimensions.length < 3) return null;
	let count = 1;
	for (let axis = 0; axis < 3; axis++) {
		const size = dimensions[axis];
		if (typeof size !== "number" || !Number.isFinite(size) || size < 1) {
			return null;
		}
		count *= Math.floor(size);
	}
	return count;
}

function readWithoutThrowing(
	read: () => ArrayLike<number> | undefined,
): ArrayLike<number> | undefined {
	try {
		return read();
	} catch {
		// Both cornerstone accessors report "no voxels" by throwing, not by
		// returning: `VoxelManager.getScalarData()` ends in
		// `throw new Error('No scalar data available')` when the manager has
		// neither `scalarData` nor `_getScalarData` (`VoxelManager.js:273-286`),
		// and `createImageVolumeVoxelManager` sets neither
		// (`VoxelManager.js:505-597`). An uncaught throw here killed the click
		// handler outright — React does not route event-handler throws to an error
		// boundary — so the refusal path below could never be reached.
		return undefined;
	}
}

/**
 * Reads the voxels the panorama will be sampled from, or refuses.
 *
 * Refuses — rather than throwing, and rather than handing over a partly filled
 * buffer — in every one of these cases:
 * - no volume in the cache yet;
 * - dimensions missing or not three positive sizes, so the buffer cannot be
 *   checked against the volume it claims to describe;
 * - `isSliceDecoded` says some slice is still absent from the image cache.
 *   `getCompleteScalarDataArray` reads exactly that cache and silently leaves
 *   missing slices at zero, so a half-loaded series would otherwise unwrap into
 *   a panorama with black bands across it — a plausible image containing a
 *   section of nothing, the same defect class this module exists to remove;
 * - every accessor threw, or returned fewer values than the volume has voxels.
 *
 * @param isSliceDecoded predicate over `volume.imageIds`; omit it only where
 * there is no image cache to ask.
 */
export function readVolumeScalarData(
	volume: VolumeScalarDataSource | null | undefined,
	isSliceDecoded?: ((imageId: string) => boolean) | undefined,
): PanoramicVolumeResult {
	const notReady: PanoramicVolumeResult = {
		status: "unavailable",
		reason: "volume_not_ready",
	};
	if (!volume) return notReady;

	const voxelCount = expectedVoxelCount(volume.dimensions);
	if (voxelCount === null) return notReady;

	if (isSliceDecoded && volume.imageIds) {
		if (volume.imageIds.length === 0) return notReady;
		for (const imageId of volume.imageIds) {
			if (!isSliceDecoded(imageId)) return notReady;
		}
	}

	const manager = volume.voxelManager;
	if (!manager) return notReady;

	const fromImageCache = readWithoutThrowing(() =>
		manager.getCompleteScalarDataArray?.(),
	);
	if (fromImageCache && fromImageCache.length >= voxelCount) {
		return { status: "ready", scalarData: fromImageCache, voxelCount };
	}

	const fromLegacyAccessor = readWithoutThrowing(() =>
		manager.getScalarData?.(),
	);
	if (fromLegacyAccessor && fromLegacyAccessor.length >= voxelCount) {
		return { status: "ready", scalarData: fromLegacyAccessor, voxelCount };
	}

	return notReady;
}
