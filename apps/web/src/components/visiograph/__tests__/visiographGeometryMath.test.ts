import assert from "node:assert";
import { describe, test } from "node:test";
import {
	calculateAngle3Points,
	calculateRuler,
	computeCalibration,
	DEFAULT_PIXEL_SCALE_MM,
	DENTAL_SENSOR_PRESETS,
	distance2D,
	type Point2D,
	resolveVisiographPixelScaleMm,
} from "../VisiographMeasurementMath";

describe("Visiograph Radiographic Geometry & Calibration Math", () => {
	test("distance2D calculates exact Euclidean distance", () => {
		assert.strictEqual(distance2D({ x: 0, y: 0 }, { x: 30, y: 40 }), 50);
	});

	test("computeCalibration calculates correct scale for 5.0 mm sphere", () => {
		const calib = computeCalibration({ x: 50, y: 50 }, { x: 150, y: 50 }, 5.0, "sphere_5mm");
		assert.strictEqual(calib.pixelDistance, 100);
		assert.strictEqual(calib.knownLengthMm, 5.0);
		assert.strictEqual(calib.scaleMmPerPixel, 0.05);
	});

	test("computeCalibration supports implant thread pitch calibration (0.8 mm / 1.0 mm)", () => {
		const calib = computeCalibration({ x: 10, y: 10 }, { x: 10, y: 30 }, 0.8, "implant_pitch_0_8");
		assert.strictEqual(calib.pixelDistance, 20);
		assert.strictEqual(calib.scaleMmPerPixel, 0.04);
	});

	test("calculateRuler outputs accurate length in px and mm", () => {
		const ruler = calculateRuler({ x: 0, y: 0 }, { x: 60, y: 80 }, 0.05, "Длина корня зуба");
		assert.strictEqual(ruler.lengthPx, 100);
		assert.strictEqual(ruler.lengthMm, 5.0);
		assert.strictEqual(ruler.label, "Длина корня зуба");
		assert.ok(ruler.id.startsWith("ruler-"));
	});

	test("calculateAngle3Points computes precise angle and deviation from vertical", () => {
		const vertex: Point2D = { x: 0, y: 0 };
		const arm1: Point2D = { x: 0, y: -50 };
		const arm2: Point2D = { x: 50, y: 0 };
		const angle = calculateAngle3Points(vertex, arm1, arm2, "tooth_axis", "Наклон моляра");
		assert.ok(Math.abs(angle.angleDeg - 90.0) < 1e-4);
		assert.ok(Math.abs(angle.deviationFromVerticalDeg - 0.0) < 1e-4);

		const armTilt: Point2D = { x: 50, y: -50 };
		const angleTilt = calculateAngle3Points(vertex, armTilt, arm2, "implant_shaft");
		assert.ok(Math.abs(angleTilt.angleDeg - 45.0) < 1e-4);
		assert.ok(Math.abs(angleTilt.deviationFromVerticalDeg - 45.0) < 1e-4);
	});
});

describe("Vatech Hardware Sensor Calibrations & Physical Scale Invariants", () => {
	test("DEFAULT_PIXEL_SCALE_MM matches Vatech EzSensor 1.5 standard (35.0 µm)", () => {
		assert.strictEqual(DEFAULT_PIXEL_SCALE_MM, 0.035);
	});

	test("DENTAL_SENSOR_PRESETS contains authentic Vatech sensor hardware calibrations", () => {
		const ez15 = DENTAL_SENSOR_PRESETS.find((p) => p.id === "vatech_ezsensor_1_5");
		assert.ok(ez15 && ez15.pixelSizeMm === 0.035 && ez15.pixelPitchMicrons === 35.0);

		const softHr = DENTAL_SENSOR_PRESETS.find((p) => p.id === "vatech_ezsensor_soft_hr");
		assert.ok(softHr && softHr.pixelSizeMm === 0.0148 && softHr.pixelPitchMicrons === 14.8);

		const classic = DENTAL_SENSOR_PRESETS.find((p) => p.id === "vatech_ezsensor_classic");
		assert.ok(classic && classic.pixelSizeMm === 0.0296 && classic.pixelPitchMicrons === 29.6);

		const sensorP = DENTAL_SENSOR_PRESETS.find((p) => p.id === "vatech_ezsensor_p");
		assert.ok(sensorP && sensorP.pixelSizeMm === 0.02 && sensorP.pixelPitchMicrons === 20.0);

		const paxI = DENTAL_SENSOR_PRESETS.find((p) => p.id === "opg_vatech_pax_i");
		assert.ok(paxI && paxI.pixelSizeMm === 0.0761);
	});

	test("resolveVisiographPixelScaleMm resolves hardware model strings accurately", () => {
		assert.strictEqual(resolveVisiographPixelScaleMm("Vatech EzSensor 1.5"), 0.035);
		assert.strictEqual(resolveVisiographPixelScaleMm("RVG 6200"), 0.019);
		assert.strictEqual(resolveVisiographPixelScaleMm("Unknown Hardware Model"), 0.035);
	});

	test("5.0 mm reference object spans expected physical pixels across sensors", () => {
		assert.strictEqual(Math.round(5.0 / 0.02), 250);
		assert.strictEqual(Math.round(5.0 / 0.035), 143);
		assert.strictEqual(Math.round(5.0 / 0.05), 100);
	});
});
