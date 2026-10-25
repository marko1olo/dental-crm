import assert from "node:assert";
import { describe, test } from "node:test";
import {
	calculatePeriapicalLesion,
	calculatePolygonArea,
	calculatePolygonPerimeter,
	classifyPeriapicalLesionData,
	type Point2D,
} from "../VisiographMeasurementMath";

describe("Visiograph Radiographic Lesion & Contour Math", () => {
	test("calculatePolygonArea uses Shoelace formula accurately for geometric figures", () => {
		const square: Point2D[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
		assert.strictEqual(calculatePolygonArea(square), 10000);

		const triangle: Point2D[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }];
		assert.strictEqual(calculatePolygonArea(triangle), 5000);
		assert.strictEqual(calculatePolygonArea([{ x: 0, y: 0 }, { x: 10, y: 10 }]), 0);
	});

	test("calculatePolygonPerimeter sums Euclidean segment lengths", () => {
		const rect: Point2D[] = [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 40 }, { x: 0, y: 40 }];
		assert.strictEqual(calculatePolygonPerimeter(rect), 140);
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
		const polygon: Point2D[] = [{ x: 10, y: 10 }, { x: 110, y: 10 }, { x: 110, y: 110 }, { x: 10, y: 110 }];
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
