import assert from "node:assert";
import { describe, test } from "node:test";
import {
	computeVoiRange,
	huToGrayscale,
	VISIOGRAPH_PRESETS_LIST,
	VISIOGRAPH_WINDOW_PRESETS,
} from "../VisiographWindowPresets";
import {
	buildPanoramicArch,
	catmullRomSegment,
	orientArchPatientRightFirst,
	polylineLengthMm,
	polylineReturnsToStart,
	projectToAxialPlane,
	resamplePolylineByArcLength,
	sampleArchCurve,
} from "../../../utils/math/panoramicArch";

describe("3D Visiograph & DICOM HU Presets Calibration", () => {
	test("Bone Preset is exactly Window 2000, Level 500", () => {
		const preset = VISIOGRAPH_WINDOW_PRESETS.bone;
		assert.strictEqual(preset.windowWidth, 2000);
		assert.strictEqual(preset.windowCenter, 500);
		const range = computeVoiRange(preset.windowWidth, preset.windowCenter);
		assert.strictEqual(range.lower, -500);
		assert.strictEqual(range.upper, 1500);
	});

	test("Enamel/Dentin Preset is exactly Window 4000, Level 1500", () => {
		const preset = VISIOGRAPH_WINDOW_PRESETS.enamel_dentin;
		assert.strictEqual(preset.windowWidth, 4000);
		assert.strictEqual(preset.windowCenter, 1500);
		const range = computeVoiRange(preset.windowWidth, preset.windowCenter);
		assert.strictEqual(range.lower, -500);
		assert.strictEqual(range.upper, 3500);
	});

	test("Soft Tissue / Gingiva Preset is exactly Window 400, Level 40", () => {
		const preset = VISIOGRAPH_WINDOW_PRESETS.soft_tissue;
		assert.strictEqual(preset.windowWidth, 400);
		assert.strictEqual(preset.windowCenter, 40);
		const range = computeVoiRange(preset.windowWidth, preset.windowCenter);
		assert.strictEqual(range.lower, -160);
		assert.strictEqual(range.upper, 240);
	});

	test("Endodontic Canal / Apex Preset is exactly Window 1500, Level 300", () => {
		const preset = VISIOGRAPH_WINDOW_PRESETS.endodontic_canal;
		assert.strictEqual(preset.windowWidth, 1500);
		assert.strictEqual(preset.windowCenter, 300);
		const range = computeVoiRange(preset.windowWidth, preset.windowCenter);
		assert.strictEqual(range.lower, -450);
		assert.strictEqual(range.upper, 1050);
	});

	test("all 4 clinical presets are registered in VISIOGRAPH_PRESETS_LIST", () => {
		assert.strictEqual(VISIOGRAPH_PRESETS_LIST.length, 4);
		const ids = VISIOGRAPH_PRESETS_LIST.map((p) => p.id);
		assert.deepStrictEqual(ids, [
			"bone",
			"enamel_dentin",
			"soft_tissue",
			"endodontic_canal",
		]);
	});

	test("huToGrayscale maps values accurately to 0..255 with proper clamping", () => {
		const ww = 2000;
		const wl = 500;
		// lower = -500, center = 500, upper = 1500

		// At or below lower -> 0
		assert.strictEqual(huToGrayscale(-600, ww, wl), 0);
		assert.strictEqual(huToGrayscale(-500, ww, wl), 0);

		// At center -> 128 (approx half of 255)
		assert.strictEqual(huToGrayscale(500, ww, wl), 128);

		// At or above upper -> 255
		assert.strictEqual(huToGrayscale(1500, ww, wl), 255);
		assert.strictEqual(huToGrayscale(2000, ww, wl), 255);

		// Intermediate linear step: 0 HU is at quarter of range (500 from -500 out of 2000 range = 25%) -> ~64
		assert.strictEqual(huToGrayscale(0, ww, wl), 64);
	});
});

describe("Panoramic Dental Arch Math & Reconstruction", () => {
	test("projectToAxialPlane discards non-finite numbers and keeps X,Y", () => {
		const raw = [
			[10, 20, 30],
			[Number.NaN, 5, 10],
			[15, 25, -40],
			null as unknown as number[],
			[30],
		];
		const projected = projectToAxialPlane(raw as readonly number[][]);
		assert.strictEqual(projected.length, 2);
		assert.deepStrictEqual(projected, [
			{ x: 10, y: 20 },
			{ x: 15, y: 25 },
		]);
	});

	test("orientArchPatientRightFirst sorts patient right (smallest X) first", () => {
		const leftToRight = [
			{ x: 30, y: 10 },
			{ x: 10, y: 25 },
			{ x: -20, y: 10 },
		];
		const oriented = orientArchPatientRightFirst(leftToRight);
		assert.strictEqual(oriented[0]?.x, -20);
		assert.strictEqual(oriented[oriented.length - 1]?.x, 30);
	});

	test("catmullRomSegment passes through p1 at t=0 and p2 at t=1", () => {
		const p0 = { x: 0, y: 0 };
		const p1 = { x: 10, y: 10 };
		const p2 = { x: 20, y: 15 };
		const p3 = { x: 30, y: 10 };

		const start = catmullRomSegment(p0, p1, p2, p3, 0);
		assert.ok(Math.abs(start.x - p1.x) < 1e-6);
		assert.ok(Math.abs(start.y - p1.y) < 1e-6);

		const end = catmullRomSegment(p0, p1, p2, p3, 1);
		assert.ok(Math.abs(end.x - p2.x) < 1e-6);
		assert.ok(Math.abs(end.y - p2.y) < 1e-6);
	});

	test("polylineReturnsToStart detects closed loop annotations", () => {
		const closedLoop = [
			{ x: 0, y: 0 },
			{ x: 10, y: 20 },
			{ x: 20, y: 20 },
			{ x: 30, y: 0 },
			{ x: 0, y: 0.1 },
		];
		assert.strictEqual(polylineReturnsToStart(closedLoop), true);

		const openArch = [
			{ x: -30, y: 0 },
			{ x: -15, y: 25 },
			{ x: 0, y: 30 },
			{ x: 15, y: 25 },
			{ x: 30, y: 0 },
		];
		assert.strictEqual(polylineReturnsToStart(openArch), false);
	});

	test("buildPanoramicArch builds smooth reconstruction from open Spline ROI", () => {
		const handles = [
			[-28.4, 12.1, -42.5],
			[-14.2, 37.8, -42.5],
			[0.6, 41.3, -42.5],
			[15.1, 37.2, -42.5],
			[28.8, 11.4, -42.5],
		];
		const annotation = {
			metadata: { viewPlaneNormal: [0, 0, 1] },
			data: {
				handles: { points: handles },
			},
		};

		const result = buildPanoramicArch([annotation]);
		assert.strictEqual(result.status, "ready");
		if (result.status === "ready") {
			assert.ok(result.curve.length > 50);
			assert.ok(result.lengthMm > 50);
			assert.strictEqual(result.controlPoints.length, 5);
		}
	});
});
