import assert from "node:assert";
import { describe, test } from "node:test";
import {
	calculateAngle3Points,
	calculatePeriapicalLesion,
	calculatePolygonArea,
	calculatePolygonPerimeter,
	calculateRuler,
	CALIBRATION_PRESETS,
	classifyPeriapicalLesionData,
	computeCalibration,
	DEFAULT_PIXEL_SCALE_MM,
	distance2D,
	type Point2D,
} from "../VisiographMeasurementMath";

describe("Visiograph Radiographic Measurement & Calibration Math", () => {
	test("distance2D calculates exact Euclidean distance", () => {
		const p1: Point2D = { x: 0, y: 0 };
		const p2: Point2D = { x: 30, y: 40 };
		const dist = distance2D(p1, p2);
		assert.strictEqual(dist, 50); // 3-4-5 triangle
	});

	test("computeCalibration calculates correct scale for 5.0 mm sphere", () => {
		// User measures a 5.0 mm sphere that occupies 100 pixels on sensor
		const p1: Point2D = { x: 50, y: 50 };
		const p2: Point2D = { x: 150, y: 50 };
		const calib = computeCalibration(p1, p2, 5.0, "sphere_5mm");

		assert.strictEqual(calib.pixelDistance, 100);
		assert.strictEqual(calib.knownLengthMm, 5.0);
		assert.strictEqual(calib.scaleMmPerPixel, 0.05); // 5 mm / 100 px = 0.05 mm/px
		assert.strictEqual(calib.type, "sphere_5mm");
	});

	test("computeCalibration supports implant thread pitch calibration (0.8 mm / 1.0 mm)", () => {
		const p1: Point2D = { x: 10, y: 10 };
		const p2: Point2D = { x: 10, y: 30 }; // 20 px
		const calib = computeCalibration(p1, p2, 0.8, "implant_pitch_0_8");

		assert.strictEqual(calib.pixelDistance, 20);
		assert.strictEqual(calib.scaleMmPerPixel, 0.04); // 0.8 mm / 20 px = 0.04 mm/px
	});

	test("calculateRuler outputs accurate length in px and mm", () => {
		const p1: Point2D = { x: 0, y: 0 };
		const p2: Point2D = { x: 60, y: 80 }; // 100 px
		const scale = 0.05; // mm per px

		const ruler = calculateRuler(p1, p2, scale, "Длина корня зуба");
		assert.strictEqual(ruler.lengthPx, 100);
		assert.strictEqual(ruler.lengthMm, 5.0);
		assert.strictEqual(ruler.label, "Длина корня зуба");
		assert.ok(ruler.id.startsWith("ruler-"));
	});

	test("calculateAngle3Points computes precise angle and deviation from vertical", () => {
		// Right angle 90 degrees: vertex at (0,0), arm1 at (0,-10) (pointing up), arm2 at (10,0) (pointing right)
		const vertex: Point2D = { x: 0, y: 0 };
		const arm1: Point2D = { x: 0, y: -50 }; // pointing straight up (vertical)
		const arm2: Point2D = { x: 50, y: 0 }; // pointing right (horizontal)

		const angle = calculateAngle3Points(vertex, arm1, arm2, "tooth_axis", "Наклон моляра");
		assert.ok(Math.abs(angle.angleDeg - 90.0) < 1e-4);
		assert.ok(
			Math.abs(angle.deviationFromVerticalDeg - 0.0) < 1e-4,
			"Arm1 pointing straight up should have 0 deg deviation from vertical",
		);

		// 45 degrees tilt: arm1 at (50, -50)
		const armTilt: Point2D = { x: 50, y: -50 };
		const angleTilt = calculateAngle3Points(vertex, armTilt, arm2, "implant_shaft");
		assert.ok(Math.abs(angleTilt.angleDeg - 45.0) < 1e-4);
		assert.ok(Math.abs(angleTilt.deviationFromVerticalDeg - 45.0) < 1e-4);
	});

	test("calculatePolygonArea uses Shoelace formula accurately for geometric figures", () => {
		// Square 100x100 px -> Area 10,000 px²
		const square: Point2D[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 },
			{ x: 0, y: 100 },
		];
		assert.strictEqual(calculatePolygonArea(square), 10000);

		// Triangle 100x100 px -> Area 5,000 px²
		const triangle: Point2D[] = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 0, y: 100 },
		];
		assert.strictEqual(calculatePolygonArea(triangle), 5000);

		// Degenerate (<3 points)
		assert.strictEqual(calculatePolygonArea([{ x: 0, y: 0 }, { x: 10, y: 10 }]), 0);
	});

	test("calculatePolygonPerimeter sums Euclidean segment lengths", () => {
		const rect: Point2D[] = [
			{ x: 0, y: 0 },
			{ x: 30, y: 0 },
			{ x: 30, y: 40 },
			{ x: 0, y: 40 },
		];
		const perim = calculatePolygonPerimeter(rect);
		assert.strictEqual(perim, 140); // 30 + 40 + 30 + 40
	});

	test("classifyPeriapicalLesion categorizes granuloma (Ø < 5.0 mm)", () => {
		const smallLesion = classifyPeriapicalLesionData(12.5, 4.0);
		assert.strictEqual(smallLesion.classification, "granuloma");
		assert.ok(smallLesion.label.includes("Периапикальная гранулема"));
		assert.ok(smallLesion.treatment.includes("Консервативное эндодонтическое лечение"));
	});

	test("classifyPeriapicalLesion categorizes radicular cyst (Ø 5.0–10.0 mm)", () => {
		const cyst = classifyPeriapicalLesionData(38.5, 7.0);
		assert.strictEqual(cyst.classification, "cyst");
		assert.ok(cyst.label.includes("Радикулярная кистогранулема / Киста корня"));
		assert.ok(cyst.treatment.includes("резекцией верхушки корня"));
	});

	test("classifyPeriapicalLesion categorizes extensive cyst (Ø ≥ 10.0 mm)", () => {
		const bigCyst = classifyPeriapicalLesionData(113.1, 12.0);
		assert.strictEqual(bigCyst.classification, "extensive_cyst");
		assert.ok(bigCyst.label.includes("Обширная радикулярная киста"));
		assert.ok(bigCyst.treatment.includes("Хирургическое вмешательство"));
	});

	test("calculatePeriapicalLesion handles full contour analysis with calibrated mm²", () => {
		// 100x100 px square with scale 0.05 mm/px:
		// Area in px = 10,000 px²
		// Area in mm² = 10,000 * (0.05)^2 = 25.0 mm²
		// Equivalent diameter = 2 * sqrt(25 / pi) ≈ 5.64 mm -> Cyst
		const polygon: Point2D[] = [
			{ x: 10, y: 10 },
			{ x: 110, y: 10 },
			{ x: 110, y: 110 },
			{ x: 10, y: 110 },
		];

		const lesion = calculatePeriapicalLesion(polygon, 0.05, "36");
		assert.strictEqual(lesion.areaPx, 10000);
		assert.ok(Math.abs(lesion.areaMm2 - 25.0) < 1e-4);
		assert.strictEqual(lesion.perimeterPx, 400);
		assert.strictEqual(lesion.perimeterMm, 20.0);
		assert.ok(Math.abs(lesion.equivalentDiameterMm - 5.64) < 0.05);
		assert.strictEqual(lesion.classification, "cyst");
		assert.strictEqual(lesion.fdiToothCode, "36");
	});
});
