import assert from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
	AXIAL_NORMAL_MIN_ABS_Z,
	buildPanoramicArch,
	CLOSED_CONTOUR_GAP_FRACTION,
	DEFAULT_ARCH_SAMPLE_STEP_MM,
	type DrawnArchAnnotation,
	MAX_ARCH_SAMPLES,
	orientArchPatientRightFirst,
	panoramicIssueLabels,
	panoramicReadyLabel,
	polylineLengthMm,
	polylineReturnsToStart,
	projectToAxialPlane,
	readVolumeScalarData,
	resamplePolylineByArcLength,
	sampleArchCurve,
	type VolumeScalarDataSource,
} from "../components/dicom/panoramicArch.js";
import type { Point2D } from "../mprMath.js";

/** The literal that used to be substituted for the dentist's trace. */
const OLD_FAKE_SPLINE: Point2D[] = [
	{ x: 100, y: 100 },
	{ x: 200, y: 150 },
	{ x: 300, y: 100 },
];

/** A plausible traced lower arch, world mm, axial plane at z = -42.5. */
const TRACED_ARCH: [number, number, number][] = [
	[-28.4, 12.1, -42.5],
	[-24.9, 26.7, -42.5],
	[-14.2, 37.8, -42.5],
	[0.6, 41.3, -42.5],
	[15.1, 37.2, -42.5],
	[25.3, 26.0, -42.5],
	[28.8, 11.4, -42.5],
];

const AXIAL_NORMAL: [number, number, number] = [0, 0, 1];

function archAnnotation(
	handles: [number, number, number][],
	options: {
		polyline?: [number, number, number][];
		/**
		 * `data.contour.closed`. Left unset when a test does not care, but NEVER
		 * pinned to `false` behind a test's back: closed is how every finished
		 * SplineROI trace arrives in production, so the fixture must be able to say
		 * so.
		 */
		closed?: boolean;
		viewPlaneNormal?: [number, number, number];
	} = {},
): DrawnArchAnnotation {
	const contour =
		options.polyline || options.closed !== undefined
			? {
					...(options.polyline ? { polyline: options.polyline } : {}),
					...(options.closed !== undefined ? { closed: options.closed } : {}),
				}
			: undefined;
	const annotation: DrawnArchAnnotation = {
		metadata: { viewPlaneNormal: options.viewPlaneNormal ?? AXIAL_NORMAL },
		data: {
			handles: { points: handles },
			...(contour ? { contour } : {}),
		},
	};
	return annotation;
}

/**
 * The dense curve cornerstone renders for a traced lower arch: an elliptical
 * sweep from the patient's right last molar (-28, 11) over the incisors and back
 * down to the left last molar (28, 11), world mm on the axial slice z = -42.5.
 */
function archPolyline(steps: number): [number, number, number][] {
	const points: [number, number, number][] = [];
	for (let i = 0; i <= steps; i++) {
		const t = (i / steps) * Math.PI;
		points.push([-28 * Math.cos(t), 30 * Math.sin(t) + 11, -42.5]);
	}
	return points;
}

/** The control points the dentist would have placed along that same arch. */
function archHandles(count: number): [number, number, number][] {
	const points: [number, number, number][] = [];
	for (let i = 0; i < count; i++) {
		const t = (i / (count - 1)) * Math.PI;
		points.push([-28 * Math.cos(t), 30 * Math.sin(t) + 11, -42.5]);
	}
	return points;
}

/** Straight run of polyline points, excluding `from`, including `to`. */
function straightRun(
	from: [number, number, number],
	to: [number, number, number],
	steps: number,
): [number, number, number][] {
	const points: [number, number, number][] = [];
	for (let i = 1; i <= steps; i++) {
		const t = i / steps;
		points.push([
			from[0] + (to[0] - from[0]) * t,
			from[1] + (to[1] - from[1]) * t,
			from[2] + (to[2] - from[2]) * t,
		]);
	}
	return points;
}

function distanceMm(a: Point2D, b: Point2D): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestDistanceMm(curve: readonly Point2D[], target: Point2D): number {
	let best = Number.POSITIVE_INFINITY;
	for (const point of curve) {
		const d = distanceMm(point, target);
		if (d < best) best = d;
	}
	return best;
}

describe("projectToAxialPlane", () => {
	test("keeps world X/Y and drops world Z", () => {
		assert.deepStrictEqual(
			projectToAxialPlane([
				[1.5, -2.5, -42.5],
				[3, 4, -42.5],
			]),
			[
				{ x: 1.5, y: -2.5 },
				{ x: 3, y: 4 },
			],
		);
	});

	test("drops points that would become NaN columns instead of propagating them", () => {
		const projected = projectToAxialPlane([
			[Number.NaN, 1, 0],
			[2, Number.POSITIVE_INFINITY, 0],
			[3, 4, 0],
			[5] as unknown as [number, number, number],
		]);
		assert.deepStrictEqual(projected, [{ x: 3, y: 4 }]);
	});
});

describe("sampleArchCurve", () => {
	const control = projectToAxialPlane(TRACED_ARCH);

	test("passes through every point the dentist placed", () => {
		const curve = sampleArchCurve(control);
		for (const point of control) {
			assert.ok(
				nearestDistanceMm(curve, point) < 1e-9,
				`control point ${JSON.stringify(point)} is not on the sampled curve`,
			);
		}
	});

	test("keeps the traced endpoints as the curve endpoints", () => {
		const curve = sampleArchCurve(control);
		assert.deepStrictEqual(curve[0], control[0]);
		assert.deepStrictEqual(
			curve[curve.length - 1],
			control[control.length - 1],
		);
	});

	test("samples in world millimetres, not per click", () => {
		// Same physical arch, described with 7 points and with 4 of the same
		// points. Column count must track arch LENGTH, not how many times the
		// dentist clicked, otherwise a careful trace produces a narrower image.
		const sparse = [control[0]!, control[2]!, control[4]!, control[6]!];
		const dense = sampleArchCurve(control);
		const coarse = sampleArchCurve(sparse);
		const ratio = dense.length / coarse.length;
		assert.ok(
			ratio > 0.8 && ratio < 1.25,
			`column count follows click count, not arch length (${dense.length} vs ${coarse.length})`,
		);
	});

	test("honours an explicit step: half the step gives about twice the columns", () => {
		const coarse = sampleArchCurve(control, 1);
		const fine = sampleArchCurve(control, 0.5);
		const ratio = fine.length / coarse.length;
		assert.ok(ratio > 1.8 && ratio < 2.2, `unexpected ratio ${ratio}`);
	});

	test("two points give the straight segment between them, nothing invented", () => {
		const curve = sampleArchCurve(
			[
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
			],
			1,
		);
		for (const point of curve) {
			assert.ok(
				Math.abs(point.y) < 1e-9,
				`point drifted off the segment: ${point.y}`,
			);
			assert.ok(point.x >= -1e-9 && point.x <= 10 + 1e-9);
		}
		assert.deepStrictEqual(curve[curve.length - 1], { x: 10, y: 0 });
	});

	test("bends between the traced points instead of connecting them with straight lines", () => {
		// A plain polyline would leave every intermediate point exactly on the
		// chord y = x + 20. A real arch interpolation must leave it.
		const three: Point2D[] = [
			{ x: -20, y: 0 },
			{ x: 0, y: 20 },
			{ x: 20, y: 0 },
		];
		const curve = sampleArchCurve(three, 0.5);
		const maxOffChord = curve
			.filter((point) => point.x > -20 && point.x < 0)
			.reduce(
				(worst, point) => Math.max(worst, Math.abs(point.y - (point.x + 20))),
				0,
			);
		assert.ok(
			maxOffChord > 0.05,
			`curve is a plain polyline, not an interpolated arch (max deviation ${maxOffChord} mm)`,
		);
	});

	test("returns nothing for no points and a single point for one", () => {
		assert.deepStrictEqual(sampleArchCurve([]), []);
		assert.deepStrictEqual(sampleArchCurve([{ x: 4, y: 5 }]), [{ x: 4, y: 5 }]);
	});

	test("a pathological step cannot explode the column count", () => {
		const curve = sampleArchCurve(control, 1e-9);
		assert.ok(
			curve.length <= MAX_ARCH_SAMPLES + control.length,
			`column count ${curve.length} escaped the cap`,
		);
		assert.ok(
			curve.length > 1000,
			"the cap must not collapse the curve either",
		);
	});

	test("a non-finite step falls back to the documented default", () => {
		assert.strictEqual(
			sampleArchCurve(control, Number.NaN).length,
			sampleArchCurve(control, DEFAULT_ARCH_SAMPLE_STEP_MM).length,
		);
	});
});

describe("resamplePolylineByArcLength", () => {
	test("every emitted point lies on the input polyline", () => {
		const source: Point2D[] = [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 },
		];
		const resampled = resamplePolylineByArcLength(source, 0.5);
		for (const point of resampled) {
			const onFirst =
				Math.abs(point.y) < 1e-9 && point.x >= -1e-9 && point.x <= 10 + 1e-9;
			const onSecond =
				Math.abs(point.x - 10) < 1e-9 &&
				point.y >= -1e-9 &&
				point.y <= 10 + 1e-9;
			assert.ok(
				onFirst || onSecond,
				`point left the polyline: ${JSON.stringify(point)}`,
			);
		}
	});

	test("preserves arc length and both endpoints", () => {
		const source: Point2D[] = [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 },
		];
		const resampled = resamplePolylineByArcLength(source, 0.5);
		assert.deepStrictEqual(resampled[0], { x: 0, y: 0 });
		assert.deepStrictEqual(resampled[resampled.length - 1], { x: 10, y: 10 });
		assert.ok(Math.abs(polylineLengthMm(resampled) - 20) < 1e-9);
	});

	test("spacing matches the requested step", () => {
		const resampled = resamplePolylineByArcLength(
			[
				{ x: 0, y: 0 },
				{ x: 12, y: 0 },
			],
			0.5,
		);
		for (let i = 1; i < resampled.length; i++) {
			assert.ok(distanceMm(resampled[i - 1]!, resampled[i]!) <= 0.5 + 1e-9);
		}
		assert.strictEqual(resampled.length, 25);
	});

	test("survives duplicated points in the traced polyline", () => {
		const resampled = resamplePolylineByArcLength(
			[
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
				{ x: 4, y: 0 },
			],
			1,
		);
		assert.deepStrictEqual(resampled[resampled.length - 1], { x: 4, y: 0 });
		assert.strictEqual(resampled.length, 5);
	});
});

describe("buildPanoramicArch", () => {
	test("zero annotations produce no reconstruction, not a default curve", () => {
		const result = buildPanoramicArch([]);
		assert.strictEqual(result.status, "unavailable");
		assert.strictEqual(
			result.status === "unavailable" && result.reason,
			"no_arch",
		);
		assert.strictEqual(
			result.status === "unavailable" && result.controlPointCount,
			0,
		);
		assert.ok(!("curve" in result), "a refusal must not carry a curve");
	});

	test("an annotation with no points at all is still no reconstruction", () => {
		const result = buildPanoramicArch([
			{ data: { handles: { points: [] } } },
			{},
		]);
		assert.strictEqual(result.status, "unavailable");
		assert.strictEqual(
			result.status === "unavailable" && result.reason,
			"no_arch",
		);
	});

	test("a single placed point is refused, not extended into an arch", () => {
		const result = buildPanoramicArch([archAnnotation([[3, 4, -42.5]])]);
		assert.strictEqual(result.status, "unavailable");
		assert.strictEqual(
			result.status === "unavailable" && result.reason,
			"too_few_points",
		);
		assert.strictEqual(
			result.status === "unavailable" && result.controlPointCount,
			1,
		);
	});

	test("the reconstruction runs through the points the dentist placed", () => {
		const result = buildPanoramicArch([archAnnotation(TRACED_ARCH)]);
		assert.strictEqual(result.status, "ready");
		if (result.status !== "ready") return;

		assert.strictEqual(result.controlPoints.length, TRACED_ARCH.length);
		for (const [x, y] of TRACED_ARCH) {
			assert.ok(
				nearestDistanceMm(result.curve, { x, y }) < 1e-9,
				`traced point (${x}, ${y}) missing from the reconstruction`,
			);
		}
		// A smooth interpolation through the placed points is never shorter than
		// the chord polyline joining them, and must not overshoot it wildly —
		// an overshoot means the curve is looping outside the traced arch.
		const chordMm = polylineLengthMm(result.controlPoints);
		assert.ok(
			result.lengthMm >= chordMm - 1e-9,
			`curve (${result.lengthMm} mm) is shorter than the traced chord (${chordMm} mm)`,
		);
		assert.ok(
			result.lengthMm < chordMm * 1.1,
			`curve (${result.lengthMm} mm) overshoots the traced chord (${chordMm} mm)`,
		);
	});

	test("no drawn point ever resolves to the old hardcoded spline", () => {
		const inputs: DrawnArchAnnotation[][] = [
			[],
			[archAnnotation([[3, 4, -42.5]])],
			[archAnnotation(TRACED_ARCH)],
			[archAnnotation(TRACED_ARCH, { viewPlaneNormal: [1, 0, 0] })],
		];
		for (const annotations of inputs) {
			const result = buildPanoramicArch(annotations);
			if (result.status !== "ready") continue;
			for (const fake of OLD_FAKE_SPLINE) {
				assert.ok(
					nearestDistanceMm(result.curve, fake) > 1e-6,
					`the fake spline point ${JSON.stringify(fake)} came back`,
				);
			}
		}
	});

	test("uses the dense polyline cornerstone rendered when it has one", () => {
		const polyline: [number, number, number][] = [];
		for (let i = 0; i <= 200; i++) {
			const t = (i / 200) * Math.PI;
			polyline.push([-28 * Math.cos(t), 30 * Math.sin(t) + 11, -42.5]);
		}
		const result = buildPanoramicArch([
			archAnnotation(TRACED_ARCH, { polyline }),
		]);
		assert.strictEqual(result.status, "ready");
		if (result.status !== "ready") return;

		// Sampled from the rendered polyline: its endpoints are the polyline's,
		// not the handle list's.
		assert.ok(distanceMm(result.curve[0]!, { x: -28, y: 11 }) < 1e-9);
		assert.ok(
			distanceMm(result.curve[result.curve.length - 1]!, { x: 28, y: 11 }) <
				1e-9,
		);
		// ...and the dentist's own control points are still reported alongside.
		assert.strictEqual(result.controlPoints.length, TRACED_ARCH.length);
	});

	test("an arch traced on a sagittal slice is refused, not projected into nonsense", () => {
		const result = buildPanoramicArch([
			archAnnotation(TRACED_ARCH, { viewPlaneNormal: [1, 0, 0] }),
		]);
		assert.strictEqual(result.status, "unavailable");
		assert.strictEqual(
			result.status === "unavailable" && result.reason,
			"wrong_plane",
		);
	});

	test("a tilted oblique axial trace is still accepted", () => {
		const tiltZ = AXIAL_NORMAL_MIN_ABS_Z + 0.05;
		const tiltX = Math.sqrt(1 - tiltZ * tiltZ);
		const result = buildPanoramicArch([
			archAnnotation(TRACED_ARCH, { viewPlaneNormal: [tiltX, 0, tiltZ] }),
		]);
		assert.strictEqual(result.status, "ready");
	});

	test("a missing plane normal is not treated as a wrong plane", () => {
		const result = buildPanoramicArch([
			{ data: { handles: { points: TRACED_ARCH } } },
		]);
		assert.strictEqual(result.status, "ready");
	});

	test("the most recently traced arch wins", () => {
		const older: [number, number, number][] = [
			[-5, 0, -42.5],
			[5, 0, -42.5],
		];
		const result = buildPanoramicArch([
			archAnnotation(older),
			archAnnotation(TRACED_ARCH),
		]);
		assert.strictEqual(result.status, "ready");
		assert.strictEqual(
			result.status === "ready" && result.controlPoints.length,
			TRACED_ARCH.length,
		);
	});

	test("a trace with all points in one spot is refused, not unwrapped into a strip", () => {
		const result = buildPanoramicArch([
			archAnnotation([
				[7, 7, -42.5],
				[7, 7, -42.5],
				[7, 7, -42.5],
			]),
		]);
		assert.strictEqual(result.status, "unavailable");
		assert.strictEqual(
			result.status === "unavailable" && result.reason,
			"degenerate_arch",
		);
		assert.strictEqual(
			result.status === "unavailable" && result.controlPointCount,
			3,
		);
	});

	test("a trace shorter than one output column is refused", () => {
		const result = buildPanoramicArch([
			archAnnotation([
				[7, 7, -42.5],
				[7 + DEFAULT_ARCH_SAMPLE_STEP_MM / 4, 7, -42.5],
			]),
		]);
		assert.strictEqual(
			result.status === "unavailable" && result.reason,
			"degenerate_arch",
		);
	});

	test("reports the problem with the arch the dentist just traced", () => {
		// Older degenerate trace, newer single-point trace: the newer one is the
		// one being worked on, so its problem is the one reported.
		const result = buildPanoramicArch([
			archAnnotation([
				[7, 7, -42.5],
				[7, 7, -42.5],
			]),
			archAnnotation([[3, 4, -42.5]]),
		]);
		assert.strictEqual(
			result.status === "unavailable" && result.reason,
			"too_few_points",
		);
	});
});

describe("a closed contour does not grow a tail on the panorama", () => {
	// Production shape: the dentist traced the arch and finished it, which in
	// cornerstone means data.contour.closed === true and a polyline that runs the
	// whole arch AND back across the tongue to where it started.
	const openArch = archPolyline(240);
	const handles = archHandles(7);
	const closingRun = straightRun(
		openArch[openArch.length - 1]!,
		openArch[0]!,
		60,
	);
	const closedPolyline = [...openArch, ...closingRun];
	const openArchMm = polylineLengthMm(projectToAxialPlane(openArch));
	const returnSweepMm = 56; // (28, 11) -> (-28, 11)

	test("the fixture really is the defect: resampling it as an open polyline appends the sweep", () => {
		// Guards the guard. If this stops being true the test below proves nothing.
		const asIfOpen = resamplePolylineByArcLength(
			projectToAxialPlane(closedPolyline),
		);
		assert.ok(
			polylineLengthMm(asIfOpen) > openArchMm + returnSweepMm * 0.9,
			`the closed fixture is not actually longer than the arch (${polylineLengthMm(asIfOpen)} vs ${openArchMm})`,
		);
		assert.ok(
			asIfOpen.some((point) => Math.abs(point.x) <= 26 && point.y <= 15),
			"the closed fixture has no return sweep to remove",
		);
	});

	test("closed: true — the reconstruction contains no return sweep", () => {
		const result = buildPanoramicArch([
			archAnnotation(handles, { polyline: closedPolyline, closed: true }),
		]);
		assert.strictEqual(result.status, "ready");
		if (result.status !== "ready") return;

		// The arch only touches y = 11 at its two ends; the return sweep is the
		// whole segment y = 11 between them. Any sampled point inside that band is
		// a column of tongue and palate presented as dental arch.
		for (const point of result.curve) {
			assert.ok(
				!(Math.abs(point.x) <= 26 && point.y <= 15),
				`the return sweep survived at ${JSON.stringify(point)}`,
			);
		}
		// An arch has one column per x; a loop comes back, so monotone x is a
		// second, independent way of saying "no return sweep".
		for (let i = 1; i < result.curve.length; i++) {
			const curr = result.curve[i];
			const prev = result.curve[i - 1];
			if (!curr || !prev) continue;
			assert.ok(
				curr.x >= prev.x - 1e-9,
				`the reconstruction turns back on itself at index ${i}`,
			);
		}
	});

	test("closed: true — lengthMm matches the open arch, not the loop", () => {
		const result = buildPanoramicArch([
			archAnnotation(handles, { polyline: closedPolyline, closed: true }),
		]);
		assert.strictEqual(result.status, "ready");
		if (result.status !== "ready") return;

		assert.ok(
			Math.abs(result.lengthMm - openArchMm) < openArchMm * 0.03,
			`reported arch length ${result.lengthMm} mm is not the open arch ${openArchMm} mm`,
		);
		assert.ok(
			result.lengthMm < openArchMm + returnSweepMm * 0.1,
			`reported arch length ${result.lengthMm} mm is inflated by the return sweep`,
		);
	});

	test("closed: true is honoured even when the polyline stops short of its start", () => {
		// Defence in depth: the flag alone must be enough. Here the loop is left
		// open by 6 mm, so the geometric test would not catch it.
		const almostClosed = [
			...openArch,
			...straightRun(openArch[openArch.length - 1]!, [-22, 11, -42.5], 55),
		];
		const result = buildPanoramicArch([
			archAnnotation(handles, { polyline: almostClosed, closed: true }),
		]);
		assert.strictEqual(result.status, "ready");
		if (result.status !== "ready") return;
		assert.ok(
			result.lengthMm < openArchMm + returnSweepMm * 0.1,
			`reported arch length ${result.lengthMm} mm still carries the sweep`,
		);
	});

	test("a loop with no closed flag is still refused the polyline path", () => {
		// cornerstone only computes `closed` from geometry when the flag is absent;
		// if it never stamped one we must not walk a loop as an open curve.
		const result = buildPanoramicArch([
			archAnnotation(handles, { polyline: closedPolyline }),
		]);
		assert.strictEqual(result.status, "ready");
		if (result.status !== "ready") return;
		assert.ok(
			result.lengthMm < openArchMm + returnSweepMm * 0.1,
			`an unflagged loop was unwrapped with its tail (${result.lengthMm} mm)`,
		);
	});

	test("an open polyline is still used verbatim", () => {
		// The fix must not throw away the curve the dentist actually saw whenever a
		// trace really is open: its endpoints are the polyline's, not the handles'.
		const result = buildPanoramicArch([
			archAnnotation(handles, { polyline: openArch, closed: false }),
		]);
		assert.strictEqual(result.status, "ready");
		if (result.status !== "ready") return;
		assert.ok(distanceMm(result.curve[0]!, { x: -28, y: 11 }) < 1e-9);
		assert.ok(
			distanceMm(result.curve[result.curve.length - 1]!, { x: 28, y: 11 }) <
				1e-9,
		);
		assert.ok(Math.abs(result.lengthMm - openArchMm) < 0.01);
	});
});

describe("polylineReturnsToStart", () => {
	test("an arch that runs jaw to jaw is not a loop", () => {
		assert.strictEqual(
			polylineReturnsToStart(projectToAxialPlane(archPolyline(240))),
			false,
		);
	});

	test("a curve back to its own start is a loop", () => {
		const open = archPolyline(240);
		const loop = [
			...open,
			...straightRun(open[open.length - 1]!, open[0]!, 60),
		];
		assert.strictEqual(polylineReturnsToStart(projectToAxialPlane(loop)), true);
	});

	test("a gap just inside the tolerance still counts as a loop", () => {
		const open = archPolyline(240);
		const total = polylineLengthMm(projectToAxialPlane(open)) + 56;
		const gap = total * CLOSED_CONTOUR_GAP_FRACTION * 0.5;
		const loop = [
			...open,
			...straightRun(open[open.length - 1]!, [-28 + gap, 11, -42.5], 60),
		];
		assert.strictEqual(polylineReturnsToStart(projectToAxialPlane(loop)), true);
	});

	test("too few points, or no extent at all, is not a loop", () => {
		assert.strictEqual(
			polylineReturnsToStart([
				{ x: 0, y: 0 },
				{ x: 1, y: 0 },
				{ x: 0, y: 0 },
			]),
			false,
		);
		assert.strictEqual(
			polylineReturnsToStart([
				{ x: 3, y: 3 },
				{ x: 3, y: 3 },
				{ x: 3, y: 3 },
				{ x: 3, y: 3 },
			]),
			false,
		);
	});
});

describe("orientArchPatientRightFirst", () => {
	test("an arch already starting on the patient's right is left alone", () => {
		const points: Point2D[] = [
			{ x: -28, y: 11 },
			{ x: 0, y: 41 },
			{ x: 28, y: 11 },
		];
		assert.deepStrictEqual(orientArchPatientRightFirst(points), points);
	});

	test("an arch traced the other way is turned around", () => {
		const points: Point2D[] = [
			{ x: 28, y: 11 },
			{ x: 0, y: 41 },
			{ x: -28, y: 11 },
		];
		assert.deepStrictEqual(orientArchPatientRightFirst(points), [
			{ x: -28, y: 11 },
			{ x: 0, y: 41 },
			{ x: 28, y: 11 },
		]);
	});

	test("equal X falls back to Y so the answer is never arbitrary", () => {
		const points: Point2D[] = [
			{ x: 5, y: 40 },
			{ x: 9, y: 20 },
			{ x: 5, y: 10 },
		];
		assert.deepStrictEqual(orientArchPatientRightFirst(points), [
			{ x: 5, y: 10 },
			{ x: 9, y: 20 },
			{ x: 5, y: 40 },
		]);
	});

	test("fewer than two points cannot be oriented and are copied through", () => {
		assert.deepStrictEqual(orientArchPatientRightFirst([]), []);
		assert.deepStrictEqual(orientArchPatientRightFirst([{ x: 1, y: 2 }]), [
			{ x: 1, y: 2 },
		]);
	});

	test("does not mutate its input", () => {
		const points: Point2D[] = [
			{ x: 28, y: 11 },
			{ x: -28, y: 11 },
		];
		orientArchPatientRightFirst(points);
		assert.deepStrictEqual(points, [
			{ x: 28, y: 11 },
			{ x: -28, y: 11 },
		]);
	});

	test("the direction the dentist traced in cannot flip the panorama", () => {
		// cornerstone reverses both the polyline and the handle list to force a
		// clockwise winding on a closed contour, so the same arch can arrive in
		// either order. The reconstruction must not depend on which.
		const handles = archHandles(7);
		const forward = buildPanoramicArch([
			archAnnotation(handles, { closed: true }),
		]);
		const backward = buildPanoramicArch([
			archAnnotation([...handles].reverse(), { closed: true }),
		]);
		assert.strictEqual(forward.status, "ready");
		assert.strictEqual(backward.status, "ready");
		if (forward.status !== "ready" || backward.status !== "ready") return;

		assert.strictEqual(forward.curve.length, backward.curve.length);
		for (let i = 0; i < forward.curve.length; i++) {
			assert.ok(
				distanceMm(forward.curve[i]!, backward.curve[i]!) < 1e-9,
				`column ${i} moved when the trace direction changed`,
			);
		}
		const fFirst = forward.curve[0];
		const fLast = forward.curve[forward.curve.length - 1];
		if (fFirst && fLast) {
			assert.ok(
				fFirst.x < fLast.x,
				"the arch must start on the patient's right (smallest world X)",
			);
		}
		const bFirst = backward.controlPoints[0];
		const bLast = backward.controlPoints[backward.controlPoints.length - 1];
		if (bFirst && bLast) {
			assert.ok(
				bFirst.x < bLast.x,
				"the reported control points must follow the same order as the columns",
			);
		}
	});
});

describe("readVolumeScalarData", () => {
	const dimensions: [number, number, number] = [4, 4, 3];
	const voxelCount = dimensions[0] * dimensions[1] * dimensions[2];
	const imageIds = ["wadouri:slice-0", "wadouri:slice-1", "wadouri:slice-2"];
	const decoded = () => true;

	function volume(
		manager: VolumeScalarDataSource["voxelManager"],
	): VolumeScalarDataSource {
		return { dimensions, imageIds, voxelManager: manager };
	}

	test("the throwing cornerstone accessor becomes a refusal, not a dead click", () => {
		// This is the shape of every real CBCT volume on cornerstone 5: the image
		// volume's voxel manager has neither `scalarData` nor `_getScalarData`, so
		// `getScalarData()` throws 'No scalar data available'.
		const thrower = volume({
			getScalarData: () => {
				throw new Error("No scalar data available");
			},
		});
		assert.doesNotThrow(() => readVolumeScalarData(thrower, decoded));
		const result = readVolumeScalarData(thrower, decoded);
		assert.strictEqual(result.status, "unavailable");
		assert.strictEqual(
			result.status === "unavailable" && result.reason,
			"volume_not_ready",
		);
		assert.ok(!("scalarData" in result), "a refusal must not carry voxels");
	});

	test("the cornerstone 5 per-slice path is used when it has voxels", () => {
		const scalarData = new Int16Array(voxelCount).fill(-500);
		const result = readVolumeScalarData(
			volume({
				getCompleteScalarDataArray: () => scalarData,
				getScalarData: () => {
					throw new Error("No scalar data available");
				},
			}),
			decoded,
		);
		assert.strictEqual(result.status, "ready");
		if (result.status !== "ready") return;
		assert.strictEqual(result.scalarData, scalarData);
		assert.strictEqual(result.voxelCount, voxelCount);
	});

	test("nothing decoded yet is a refusal, not an empty panorama", () => {
		// getCompleteScalarDataArray returns Uint8Array(0) when no slice is in the
		// image cache; handing that to the unwrap would draw a blank strip.
		const result = readVolumeScalarData(
			volume({
				getCompleteScalarDataArray: () => new Uint8Array(0),
				getScalarData: () => {
					throw new Error("No scalar data available");
				},
			}),
			decoded,
		);
		assert.strictEqual(
			result.status === "unavailable" && result.reason,
			"volume_not_ready",
		);
	});

	test("a half-decoded series is refused instead of unwrapped with black bands", () => {
		// The accessor happily returns a full-length buffer with the missing slices
		// left at zero. That is a plausible panorama with a section of nothing in
		// it — the exact defect class this module exists to remove.
		const result = readVolumeScalarData(
			volume({
				getCompleteScalarDataArray: () => new Int16Array(voxelCount),
			}),
			(imageId) => imageId !== "wadouri:slice-2",
		);
		assert.strictEqual(
			result.status === "unavailable" && result.reason,
			"volume_not_ready",
		);
	});

	test("a buffer smaller than the volume is refused", () => {
		const result = readVolumeScalarData(
			volume({
				getCompleteScalarDataArray: () => new Int16Array(voxelCount - 1),
			}),
			decoded,
		);
		assert.strictEqual(
			result.status === "unavailable" && result.reason,
			"volume_not_ready",
		);
	});

	test("the legacy accessor is still honoured when it works", () => {
		const scalarData = new Uint16Array(voxelCount).fill(900);
		const result = readVolumeScalarData(
			volume({
				getCompleteScalarDataArray: () => {
					throw new Error("no image in the cache");
				},
				getScalarData: () => scalarData,
			}),
			decoded,
		);
		assert.strictEqual(result.status, "ready");
		if (result.status !== "ready") return;
		assert.strictEqual(result.scalarData, scalarData);
	});

	test("no volume, no voxel manager and unusable dimensions are all refusals", () => {
		const cases: (VolumeScalarDataSource | null | undefined)[] = [
			null,
			undefined,
			{ dimensions, imageIds },
			{
				dimensions: [4, 4],
				imageIds,
				voxelManager: { getScalarData: () => new Int16Array(voxelCount) },
			},
			{
				dimensions: [4, 0, 3],
				imageIds,
				voxelManager: { getScalarData: () => new Int16Array(voxelCount) },
			},
			{
				dimensions: [4, 4, Number.NaN],
				imageIds,
				voxelManager: { getScalarData: () => new Int16Array(voxelCount) },
			},
			{
				dimensions,
				imageIds: [],
				voxelManager: { getScalarData: () => new Int16Array(voxelCount) },
			},
		];
		for (const source of cases) {
			const result = readVolumeScalarData(source, decoded);
			assert.strictEqual(
				result.status === "unavailable" && result.reason,
				"volume_not_ready",
				`expected a refusal for ${JSON.stringify(source?.dimensions ?? source)}`,
			);
		}
	});
});

describe("panoramicIssueLabels", () => {
	test("every refusal reason has Russian copy that says nothing was built", () => {
		const reasons = [
			"no_arch",
			"too_few_points",
			"degenerate_arch",
			"wrong_plane",
			"read_failed",
			"volume_not_ready",
		] as const;
		for (const reason of reasons) {
			const label = panoramicIssueLabels[reason];
			assert.ok(label.length > 0, `${reason} has no label`);
			assert.ok(
				label.startsWith("Панорама не построена"),
				`${reason} does not tell the dentist the panorama was not built: ${label}`,
			);
			assert.ok(
				/[А-я]/.test(label),
				`${reason} lost its Cyrillic (mojibake?): ${label}`,
			);
		}
	});

	test("the success copy lives in the dictionary too, with the arch it describes", () => {
		const label = panoramicReadyLabel(7, 129.4567);
		assert.ok(
			label.includes("точек 7"),
			`control point count missing: ${label}`,
		);
		assert.ok(
			label.includes("129.5 мм"),
			`arch length is not reported to one decimal with its unit: ${label}`,
		);
		assert.ok(/[А-я]/.test(label), `success copy lost its Cyrillic: ${label}`);
		assert.ok(
			!label.includes("не построена"),
			`success copy contradicts itself: ${label}`,
		);
	});

	test("the viewer takes its banner copy from here and drops it when the panorama closes", () => {
		// Both are single-line JSX facts that no unit test of the geometry can see,
		// and both were live defects: the success string was the one user-facing
		// literal left inline, and closing the panorama left the green «Панорама
		// построена…» banner asserting a panorama that was no longer on screen.
		const viewer = readFileSync(
			new URL("../components/dicom/Cornerstone3DViewer.tsx", import.meta.url),
			"utf8",
		);
		assert.ok(
			viewer.includes("panoramicReadyLabel(archSummary.points"),
			"the viewer no longer renders the banner through the label dictionary",
		);
		assert.ok(
			!viewer.includes("Панорама построена по обведённой дуге"),
			"the success string is inline in JSX again instead of in the dictionary",
		);

		const onCloseAt = viewer.indexOf("onClose={");
		assert.ok(onCloseAt > 0, "the panorama window lost its onClose handler");
		const onCloseHandler = viewer.slice(
			onCloseAt,
			viewer.indexOf("thickness={", onCloseAt),
		);
		assert.ok(
			onCloseHandler.includes("setShowPanorex(false)"),
			"closing the panorama no longer closes the window",
		);
		assert.ok(
			onCloseHandler.includes("setArchSummary(null)"),
			"closing the panorama leaves the «panorama built» banner behind",
		);
	});
});
