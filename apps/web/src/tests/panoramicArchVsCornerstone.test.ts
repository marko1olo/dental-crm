import assert from "node:assert";
import { describe, test } from "node:test";
import { splines } from "@cornerstonejs/tools";
import {
	buildPanoramicArch,
	polylineLengthMm,
} from "../components/dicom/panoramicArch.js";
import type { Point2D } from "../mprMath.js";

/**
 * What the panorama costs, measured against the curve cornerstone ACTUALLY
 * renders.
 *
 * `buildPanoramicArch` deliberately does NOT sample the polyline cornerstone
 * hands over when the contour is closed — and a finished SplineROI is always
 * closed (`SplineROITool.js:245-269`). It interpolates the dentist's own control
 * points instead. That choice has a price, and the price has to be measured
 * against a curve that exists in production.
 *
 * The R2 packet measured it against the OPEN spline (0.002 %, 0.3879 mm) — a
 * curve that same packet proves can never reach `buildPanoramicArch`, with a
 * column->nearest-VERTEX metric that flatters the result. Both numbers are
 * withdrawn. This file re-derives the comparison against the two baselines that
 * do exist:
 *
 *  1. the arch portion of the CLOSED polyline — literally the pixels the dentist
 *     saw on the AXIAL panel, produced here by the installed cornerstone
 *     `CatmullRomSpline`, not by a reimplementation;
 *  2. for the elliptical fixture only, the analytic semi-ellipse the fixture is
 *     built from — a synthetic ground truth, not a patient's real arch.
 *
 * Every control point used is written out below, so every digit this file
 * asserts is re-derivable with one command:
 *   node --import tsx --test apps/web/src/tests/panoramicArchVsCornerstone.test.ts
 */

/** Semi-ellipse the `archHandles`/`archPolyline` fixtures model: a = 28, b = 30, y offset 11. */
const ARCH_A_MM = 28;
const ARCH_B_MM = 30;
const ARCH_Y_OFFSET_MM = 11;

/** Point on that semi-ellipse at parameter `t` in [0, PI]. */
function ellipsePoint(t: number): Point2D {
	return {
		x: -ARCH_A_MM * Math.cos(t),
		y: ARCH_B_MM * Math.sin(t) + ARCH_Y_OFFSET_MM,
	};
}

/**
 * The seven control points of the elliptical fixture, identical to
 * `archHandles(7)` in `panoramicArch.test.ts`. Written as the generating formula
 * rather than literals so the two fixtures cannot silently drift apart:
 * (-28.0000, 11.0000) (-14.0000, 26.0000) (14.0000, 36.9808)
 * ... exact values are asserted below.
 */
const ELLIPSE_HANDLES: Point2D[] = Array.from({ length: 7 }, (_, i) =>
	ellipsePoint((i / 6) * Math.PI),
);

/**
 * The hand-picked "plausible traced lower arch" fixture, copied verbatim from
 * `TRACED_ARCH` in `panoramicArch.test.ts` (world mm, axial slice z = -42.5, Z
 * dropped here because every curve in this file is planar). It is NOT an
 * ellipse, so no analytic ground truth exists for it — only baseline 1 applies.
 */
const TRACED_HANDLES: Point2D[] = [
	{ x: -28.4, y: 12.1 },
	{ x: -24.9, y: 26.7 },
	{ x: -14.2, y: 37.8 },
	{ x: 0.6, y: 41.3 },
	{ x: 15.1, y: 37.2 },
	{ x: 25.3, y: 26.0 },
	{ x: 28.8, y: 11.4 },
];

const AXIAL_NORMAL: [number, number, number] = [0, 0, 1];

/** Renders control points through the installed cornerstone CatmullRomSpline. */
function cornerstonePolyline(
	controlPoints: readonly Point2D[],
	closed: boolean,
): Point2D[] {
	const spline = new splines.CatmullRomSpline();
	spline.closed = closed;
	spline.setControlPoints(
		controlPoints.map((p) => [p.x, p.y] as [number, number]),
	);
	return spline.getPolylinePoints().map(([x, y]) => ({ x, y }));
}

function distanceMm(a: Point2D, b: Point2D): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distance from `p` to the SEGMENT ab — not to a vertex. */
function distanceToSegmentMm(p: Point2D, a: Point2D, b: Point2D): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lengthSquared = dx * dx + dy * dy;
	if (lengthSquared === 0) return distanceMm(p, a);
	let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
	t = t < 0 ? 0 : t > 1 ? 1 : t;
	return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Distance from `p` to the nearest segment of `reference`. */
function distanceToPolylineMm(
	p: Point2D,
	reference: readonly Point2D[],
): number {
	let best = Number.POSITIVE_INFINITY;
	for (let i = 1; i < reference.length; i++) {
		const d = distanceToSegmentMm(p, reference[i - 1]!, reference[i]!);
		if (d < best) best = d;
	}
	return best;
}

/**
 * One-sided max deviation: the worst distance from any point of `curve` to the
 * reference polyline. Direction matters and is named at every call site.
 */
function maxDeviationMm(
	curve: readonly Point2D[],
	reference: readonly Point2D[],
): number {
	let worst = 0;
	for (const point of curve) {
		const d = distanceToPolylineMm(point, reference);
		if (d > worst) worst = d;
	}
	return worst;
}

/**
 * The coarse metric that produced R2's withdrawn `0.3879 mm`: distance to the
 * nearest reference VERTEX instead of the nearest reference SEGMENT. It cannot
 * report less than half the reference's own vertex spacing however well the two
 * curves agree, so it measures the baseline's sampling density, not the error.
 * Kept only so the withdrawn figure's provenance is on the record.
 */
function maxVertexDeviationMm(
	curve: readonly Point2D[],
	reference: readonly Point2D[],
): number {
	let worst = 0;
	for (const point of curve) {
		let best = Number.POSITIVE_INFINITY;
		for (const vertex of reference) {
			const d = distanceMm(point, vertex);
			if (d < best) best = d;
		}
		if (best > worst) worst = best;
	}
	return worst;
}

/** The analytic semi-ellipse, dense enough that its own chord error is negligible. */
const ANALYTIC_SEGMENTS = 20_000;
const ANALYTIC_ARCH: Point2D[] = Array.from(
	{ length: ANALYTIC_SEGMENTS + 1 },
	(_, i) => ellipsePoint((i / ANALYTIC_SEGMENTS) * Math.PI),
);

/** What `buildPanoramicArch` produces for a finished (closed) trace. */
function reconstruction(controlPoints: readonly Point2D[]): {
	curve: Point2D[];
	lengthMm: number;
} {
	const closedPolyline = cornerstonePolyline(controlPoints, true);
	const result = buildPanoramicArch([
		{
			metadata: { viewPlaneNormal: AXIAL_NORMAL },
			data: {
				handles: {
					points: controlPoints.map((p) => [p.x, p.y, -42.5]),
				},
				contour: {
					polyline: closedPolyline.map((p) => [p.x, p.y, -42.5]),
					closed: true,
				},
			},
		},
	]);
	assert.strictEqual(result.status, "ready");
	if (result.status !== "ready") throw new Error("unreachable");
	return { curve: result.curve, lengthMm: result.lengthMm };
}

/**
 * Splits a CLOSED cornerstone polyline into the arch the dentist traced and the
 * wrap-around run back to the start. The split index is FOUND, not assumed: it is
 * the vertex nearest the last control point.
 */
function archPortionOfClosed(
	closedPolyline: readonly Point2D[],
	lastControlPoint: Point2D,
): { archPortion: Point2D[]; splitIndex: number } {
	let splitIndex = 0;
	let best = Number.POSITIVE_INFINITY;
	for (let i = 0; i < closedPolyline.length; i++) {
		const d = distanceMm(closedPolyline[i]!, lastControlPoint);
		if (d < best) {
			best = d;
			splitIndex = i;
		}
	}
	// Cornerstone evaluates its splines through a transform matrix, so the vertex
	// that IS the last control point lands within ~1e-6 mm of it rather than
	// exactly on it. 1e-4 mm is four orders of magnitude below a CBCT voxel and
	// still far too tight to accept any neighbouring vertex.
	assert.ok(
		best < 1e-4,
		`no vertex of the closed polyline lands on the last control point (nearest ${best} mm)`,
	);
	return {
		archPortion: closedPolyline.slice(0, splitIndex + 1),
		splitIndex,
	};
}

/**
 * Worst vertex-to-vertex disagreement between the closed rendering's arch portion
 * and the open rendering of the same handles. Compared index by index because both
 * carry 127 vertices produced by the same resolution over the same control points,
 * so vertex i of one corresponds to vertex i of the other.
 */
function closedVsOpenWorstVertexMm(controlPoints: readonly Point2D[]): number {
	const open = cornerstonePolyline(controlPoints, false);
	const { archPortion } = archPortionOfClosed(
		cornerstonePolyline(controlPoints, true),
		controlPoints[controlPoints.length - 1]!,
	);
	assert.strictEqual(archPortion.length, open.length);
	return archPortion.reduce(
		(worst, point, i) => Math.max(worst, distanceMm(point, open[i]!)),
		0,
	);
}

describe("the fixtures are the curves they claim to be", () => {
	test("the elliptical handles are archHandles(7) from panoramicArch.test.ts", () => {
		// Same generator, so the two files describe one arch. Endpoints and apex
		// pinned so a change to either fixture fails loudly here.
		assert.strictEqual(ELLIPSE_HANDLES.length, 7);
		assert.ok(distanceMm(ELLIPSE_HANDLES[0]!, { x: -28, y: 11 }) < 1e-9);
		assert.ok(distanceMm(ELLIPSE_HANDLES[6]!, { x: 28, y: 11 }) < 1e-9);
		assert.ok(
			Math.abs(ELLIPSE_HANDLES[3]!.x) < 1e-9 &&
				Math.abs(ELLIPSE_HANDLES[3]!.y - (ARCH_B_MM + ARCH_Y_OFFSET_MM)) < 1e-9,
			"the middle handle is not the apex of the semi-ellipse",
		);
		for (const handle of ELLIPSE_HANDLES) {
			assert.ok(
				distanceToPolylineMm(handle, ANALYTIC_ARCH) < 1e-6,
				`handle ${JSON.stringify(handle)} is not on the analytic semi-ellipse`,
			);
		}
	});

	test("the analytic semi-ellipse arc length is 91.1333 mm", () => {
		// Ramanujan's ellipse perimeter for a = 28, b = 30 halved = 91.134 mm, so the
		// dense sampling is converged and this is a real ground truth, not a guess.
		const analyticMm = polylineLengthMm(ANALYTIC_ARCH);
		assert.ok(
			Math.abs(analyticMm - 91.1333) < 5e-4,
			`analytic semi-ellipse arc length ${analyticMm.toFixed(4)} mm`,
		);
	});
});

describe("closing the contour is what cornerstone does, and it moves the curve", () => {
	test("a closed CatmullRomSpline emits one extra segment and returns to its start", () => {
		const open = cornerstonePolyline(ELLIPSE_HANDLES, false);
		const closed = cornerstonePolyline(ELLIPSE_HANDLES, true);
		assert.strictEqual(open.length, 127);
		assert.strictEqual(closed.length, 148);
		// 7 control points: 6 curve segments open, 7 closed, same resolution.
		assert.strictEqual((closed.length - 1) / (open.length - 1), 7 / 6);
		assert.ok(
			distanceMm(closed[closed.length - 1]!, closed[0]!) < 1e-9,
			"the closed polyline does not return to its own start",
		);
	});

	test("the arch portion of the closed polyline ends exactly on the last handle", () => {
		const closed = cornerstonePolyline(ELLIPSE_HANDLES, true);
		const { archPortion, splitIndex } = archPortionOfClosed(
			closed,
			ELLIPSE_HANDLES[6]!,
		);
		// The split is the found index, and it coincides with the open rendering's
		// vertex count, which is what makes "arch portion" a well-defined object.
		assert.strictEqual(splitIndex, 126);
		assert.strictEqual(archPortion.length, 127);
	});

	test("the wrap-around run is 21 vertices and ~36 % of the polyline the old code walked", () => {
		// This is the size of the defect b4292f74d fixed, measured on one baseline
		// instead of two. Before that commit `resamplePolylineByArcLength` walked the
		// CLOSED polyline as if it were open, so the share of the output columns that
		// showed tongue and palate is the wrap-around run as a fraction of THAT
		// polyline: (closed - archPortion) / closed.
		//
		// The R2 handoff instead quoted «40.8 % длины развёртки» = (closed - OPEN) /
		// closed, mixing the open rendering into a statement about the closed one.
		// Both are above the C5 review's ~30 % estimate, so the substance held; the
		// number did not, and the correct one is asserted here.
		const closed = cornerstonePolyline(ELLIPSE_HANDLES, true);
		const open = cornerstonePolyline(ELLIPSE_HANDLES, false);
		const { archPortion, splitIndex } = archPortionOfClosed(
			closed,
			ELLIPSE_HANDLES[6]!,
		);
		assert.strictEqual(closed.length - 1 - splitIndex, 21);

		const closedTotalMm = polylineLengthMm(closed);
		const tailFraction =
			(closedTotalMm - polylineLengthMm(archPortion)) / closedTotalMm;
		assert.ok(
			tailFraction > 0.34 && tailFraction < 0.39,
			`wrap-around run is ${(tailFraction * 100).toFixed(1)} % of the closed polyline`,
		);
		assert.ok(
			tailFraction > 0.3,
			"the C5 review's ~30 % estimate was optimistic and must stay so",
		);

		const mixedFraction =
			(closedTotalMm - polylineLengthMm(open)) / closedTotalMm;
		assert.ok(
			mixedFraction > tailFraction,
			`the mixed-baseline figure ${(mixedFraction * 100).toFixed(1)} % should exceed the single-baseline ${(tailFraction * 100).toFixed(1)} %`,
		);
	});

	for (const fixture of [
		{ name: "archHandles(7)", handles: ELLIPSE_HANDLES },
		{ name: "TRACED_ARCH", handles: TRACED_HANDLES },
	]) {
		test(`${fixture.name}: closing changes the arch itself, not just the tail`, () => {
			// This is why the OPEN spline is not a usable baseline: it is not the same
			// arch drawn plus a tail, it is a different arch. A closed Catmull-Rom uses
			// wrap-around tangents at the first and last control points.
			const worstVertexMm = closedVsOpenWorstVertexMm(fixture.handles);
			assert.ok(
				worstVertexMm > 4,
				`closed and open renderings of the same handles differ by only ${worstVertexMm.toFixed(4)} mm`,
			);
		});
	}
});

describe("cost of not sampling the polyline, against the curve that exists", () => {
	for (const fixture of [
		{ name: "elliptical fixture (archHandles(7))", handles: ELLIPSE_HANDLES },
		{ name: "traced fixture (TRACED_ARCH)", handles: TRACED_HANDLES },
	]) {
		test(`${fixture.name}: reported length sits ~7 % BELOW the arch on screen`, () => {
			const { archPortion } = archPortionOfClosed(
				cornerstonePolyline(fixture.handles, true),
				fixture.handles[fixture.handles.length - 1]!,
			);
			const seenMm = polylineLengthMm(archPortion);
			const built = reconstruction(fixture.handles);
			const shortfall = (seenMm - built.lengthMm) / seenMm;
			// Direction and order of magnitude are the load-bearing facts: the banner
			// UNDER-reports the on-screen arch by single-digit percent. The R2 claim of
			// 0.002 % was measured against the open spline and is withdrawn.
			assert.ok(
				shortfall > 0.06 && shortfall < 0.09,
				`shortfall ${(shortfall * 100).toFixed(2)} % (seen ${seenMm.toFixed(4)} mm, reported ${built.lengthMm.toFixed(4)} mm)`,
			);
		});

		test(`${fixture.name}: max column deviation from the seen arch is ~4 mm, not 0.39 mm`, () => {
			const { archPortion } = archPortionOfClosed(
				cornerstonePolyline(fixture.handles, true),
				fixture.handles[fixture.handles.length - 1]!,
			);
			const built = reconstruction(fixture.handles);
			const deviationMm = maxDeviationMm(built.curve, archPortion);
			// ~16 CBCT voxels at 0.25 mm. The R2 handoff said "under two voxels".
			assert.ok(
				deviationMm > 3.5 && deviationMm < 4.5,
				`max deviation from the seen arch ${deviationMm.toFixed(4)} mm`,
			);
			assert.ok(
				deviationMm > 1,
				"the withdrawn 0.3879 mm figure must not silently come back",
			);
		});

		test(`${fixture.name}: the withdrawn 0.39 mm figure is the baseline's vertex spacing`, () => {
			// Why the R2 number was small: it was column->nearest-VERTEX against the
			// open spline. That metric has a floor of half the baseline's own vertex
			// spacing (~0.36 mm here) no matter how well the curves agree, and against
			// SEGMENTS the same pair of curves agree to ~0.017 mm. So the withdrawn
			// figure was ~20x too pessimistic about a baseline that was itself ~300x
			// too optimistic. Both errors are recorded, neither is repeated.
			const open = cornerstonePolyline(fixture.handles, false);
			const built = reconstruction(fixture.handles);
			const vertexMm = maxVertexDeviationMm(built.curve, open);
			const segmentMm = maxDeviationMm(built.curve, open);
			const halfSpacingMm = polylineLengthMm(open) / (open.length - 1) / 2;
			assert.ok(
				vertexMm >= halfSpacingMm,
				`vertex metric ${vertexMm.toFixed(4)} mm is below its own floor ${halfSpacingMm.toFixed(4)} mm`,
			);
			assert.ok(
				vertexMm / segmentMm > 10,
				`the two metrics differ by only ${(vertexMm / segmentMm).toFixed(1)}x`,
			);
			assert.ok(
				segmentMm < 0.05,
				`reconstruction and open spline disagree by ${segmentMm.toFixed(4)} mm, so the open baseline is not merely mis-metricked`,
			);
		});
	}
});

describe("the measurement itself, printed so it can be quoted", () => {
	test("digest of every figure this file asserts", () => {
		const lines: string[] = [];
		for (const fixture of [
			{ name: "archHandles(7)", handles: ELLIPSE_HANDLES },
			{ name: "TRACED_ARCH  ", handles: TRACED_HANDLES },
		]) {
			const closed = cornerstonePolyline(fixture.handles, true);
			const open = cornerstonePolyline(fixture.handles, false);
			const { archPortion, splitIndex } = archPortionOfClosed(
				closed,
				fixture.handles[fixture.handles.length - 1]!,
			);
			const seenMm = polylineLengthMm(archPortion);
			const built = reconstruction(fixture.handles);
			const closedTotalMm = polylineLengthMm(closed);
			lines.push(
				[
					`${fixture.name}  handles=${fixture.handles.length}`,
					`closed pts=${closed.length} split=${splitIndex}`,
					`closed FULL len=${closedTotalMm.toFixed(4)} mm`,
					`SEEN arch (closed portion) len=${seenMm.toFixed(4)} mm`,
					`wrap-around run: pts=${closed.length - 1 - splitIndex} len=${(closedTotalMm - seenMm).toFixed(4)} mm = ${(((closedTotalMm - seenMm) / closedTotalMm) * 100).toFixed(1)} % of the closed polyline`,
					`open spline len=${polylineLengthMm(open).toFixed(4)} mm`,
					`R2's mixed-baseline share (closed-OPEN)/closed=${(((closedTotalMm - polylineLengthMm(open)) / closedTotalMm) * 100).toFixed(1)} %`,
					`reconstruction len=${built.lengthMm.toFixed(4)} mm cols=${built.curve.length}`,
					`shortfall vs SEEN=${(((seenMm - built.lengthMm) / seenMm) * 100).toFixed(2)} %`,
					`max col->SEEN segment dev=${maxDeviationMm(built.curve, archPortion).toFixed(4)} mm`,
					`max col->OPEN segment dev=${maxDeviationMm(built.curve, open).toFixed(4)} mm`,
					`max col->OPEN VERTEX dev=${maxVertexDeviationMm(built.curve, open).toFixed(4)} mm (withdrawn metric)`,
					`half the OPEN spline's own vertex spacing=${(polylineLengthMm(open) / (open.length - 1) / 2).toFixed(4)} mm`,
					`CLOSED arch portion vs OPEN, worst vertex=${closedVsOpenWorstVertexMm(fixture.handles).toFixed(4)} mm`,
				].join("\n    "),
			);
		}
		const { archPortion } = archPortionOfClosed(
			cornerstonePolyline(ELLIPSE_HANDLES, true),
			ELLIPSE_HANDLES[6]!,
		);
		lines.push(
			[
				"analytic semi-ellipse a=28 b=30 (archHandles fixture ONLY)",
				`analytic len=${polylineLengthMm(ANALYTIC_ARCH).toFixed(4)} mm`,
				`closed portion dev from analytic=${maxDeviationMm(archPortion, ANALYTIC_ARCH).toFixed(4)} mm`,
				`reconstruction dev from analytic=${maxDeviationMm(reconstruction(ELLIPSE_HANDLES).curve, ANALYTIC_ARCH).toFixed(4)} mm`,
			].join("\n    "),
		);
		const digest = lines.join("\n  ");
		console.log(`  ${digest}`);
		assert.ok(digest.length > 0);
	});
});

describe("the reconstruction is closer to the true arch than what cornerstone draws", () => {
	// The measurement R2 never took, and the reason the geometry is NOT to be
	// churned: on the fixture whose true arch is known analytically, the
	// control-point interpolation beats the closed rendering by ~6x.
	test("max deviation from the analytic semi-ellipse: reconstruction << closed rendering", () => {
		const { archPortion } = archPortionOfClosed(
			cornerstonePolyline(ELLIPSE_HANDLES, true),
			ELLIPSE_HANDLES[6]!,
		);
		const built = reconstruction(ELLIPSE_HANDLES);

		const builtVsTruth = maxDeviationMm(built.curve, ANALYTIC_ARCH);
		const closedVsTruth = maxDeviationMm(archPortion, ANALYTIC_ARCH);

		assert.ok(
			builtVsTruth < 0.7,
			`reconstruction deviates ${builtVsTruth.toFixed(4)} mm from the analytic arch`,
		);
		assert.ok(
			closedVsTruth > 3,
			`the closed rendering deviates only ${closedVsTruth.toFixed(4)} mm from the analytic arch`,
		);
		assert.ok(
			closedVsTruth / builtVsTruth > 5,
			`the reconstruction is only ${(closedVsTruth / builtVsTruth).toFixed(2)}x closer to the truth`,
		);
	});

	test("arc length: the closed rendering overshoots the true arch, the reconstruction does not", () => {
		const analyticMm = polylineLengthMm(ANALYTIC_ARCH);
		const { archPortion } = archPortionOfClosed(
			cornerstonePolyline(ELLIPSE_HANDLES, true),
			ELLIPSE_HANDLES[6]!,
		);
		const closedMm = polylineLengthMm(archPortion);
		const builtMm = reconstruction(ELLIPSE_HANDLES).lengthMm;

		assert.ok(
			closedMm / analyticMm > 1.05,
			`the closed rendering overshoots by only ${((closedMm / analyticMm - 1) * 100).toFixed(2)} %`,
		);
		assert.ok(
			Math.abs(builtMm / analyticMm - 1) < 0.01,
			`the reconstruction is off the true arch length by ${((builtMm / analyticMm - 1) * 100).toFixed(2)} %`,
		);
	});
});
