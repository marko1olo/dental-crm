import assert from "node:assert";
import { describe, test } from "node:test";
import type { Point2D } from "../mprMath.js";
import {
	AXIAL_NORMAL_MIN_ABS_Z,
	buildPanoramicArch,
	DEFAULT_ARCH_SAMPLE_STEP_MM,
	MAX_ARCH_SAMPLES,
	panoramicIssueLabels,
	polylineLengthMm,
	projectToAxialPlane,
	resamplePolylineByArcLength,
	sampleArchCurve,
	type DrawnArchAnnotation,
} from "../components/dicom/panoramicArch.js";

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
		viewPlaneNormal?: [number, number, number];
	} = {},
): DrawnArchAnnotation {
	const annotation: DrawnArchAnnotation = {
		metadata: { viewPlaneNormal: options.viewPlaneNormal ?? AXIAL_NORMAL },
		data: {
			handles: { points: handles },
			...(options.polyline
				? { contour: { polyline: options.polyline, closed: false } }
				: {}),
		},
	};
	return annotation;
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
		assert.deepStrictEqual(curve[curve.length - 1], control[control.length - 1]);
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
		const curve = sampleArchCurve([
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		], 1);
		for (const point of curve) {
			assert.ok(Math.abs(point.y) < 1e-9, `point drifted off the segment: ${point.y}`);
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
			.reduce((worst, point) => Math.max(worst, Math.abs(point.y - (point.x + 20))), 0);
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
		assert.ok(curve.length > 1000, "the cap must not collapse the curve either");
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
			const onFirst = Math.abs(point.y) < 1e-9 && point.x >= -1e-9 && point.x <= 10 + 1e-9;
			const onSecond =
				Math.abs(point.x - 10) < 1e-9 && point.y >= -1e-9 && point.y <= 10 + 1e-9;
			assert.ok(onFirst || onSecond, `point left the polyline: ${JSON.stringify(point)}`);
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
		assert.strictEqual(result.status === "unavailable" && result.reason, "no_arch");
		assert.strictEqual(
			result.status === "unavailable" && result.controlPointCount,
			0,
		);
		assert.ok(!("curve" in result), "a refusal must not carry a curve");
	});

	test("an annotation with no points at all is still no reconstruction", () => {
		const result = buildPanoramicArch([{ data: { handles: { points: [] } } }, {}]);
		assert.strictEqual(result.status, "unavailable");
		assert.strictEqual(result.status === "unavailable" && result.reason, "no_arch");
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
			distanceMm(result.curve[result.curve.length - 1]!, { x: 28, y: 11 }) < 1e-9,
		);
		// ...and the dentist's own control points are still reported alongside.
		assert.strictEqual(result.controlPoints.length, TRACED_ARCH.length);
	});

	test("an arch traced on a sagittal slice is refused, not projected into nonsense", () => {
		const result = buildPanoramicArch([
			archAnnotation(TRACED_ARCH, { viewPlaneNormal: [1, 0, 0] }),
		]);
		assert.strictEqual(result.status, "unavailable");
		assert.strictEqual(result.status === "unavailable" && result.reason, "wrong_plane");
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
});
