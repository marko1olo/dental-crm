import assert from "node:assert";
import { describe, test } from "node:test";
import {
	DENTAL_SENSOR_PRESETS,
	calculatePeriapicalLesion,
	recalculateLesionsWithScale,
	recalculateRulersWithScale,
	type RulerMeasurement,
} from "../VisiographMeasurementMath";
import { STANDARD_SENSOR_PRESETS } from "../VisiographStudioCanvas";

describe("Visiograph Studio 1-Click Clinical Sensor Presets (Mandates 8e, 8k)", () => {
	test("defines standard RVG Size 1, RVG Size 2, and OPG sensor presets with exact physical pitch", () => {
		assert.strictEqual(STANDARD_SENSOR_PRESETS.length, 11);
		const rvg1 = STANDARD_SENSOR_PRESETS.find((p) => p.id === "rvg_size_1");
		assert.ok(rvg1, "RVG Size 1 preset must exist");
		assert.strictEqual(rvg1.pixelSizeMm, 0.02);
		assert.match(rvg1.label, /20 мкм/);

		const rvg2 = STANDARD_SENSOR_PRESETS.find((p) => p.id === "rvg_size_2");
		assert.ok(rvg2, "RVG Size 2 preset must exist");
		assert.strictEqual(rvg2.pixelSizeMm, 0.025);
		assert.match(rvg2.label, /25 мкм/);

		const opg = STANDARD_SENSOR_PRESETS.find((p) => p.id === "opg_standard");
		assert.ok(opg, "OPG standard preset must exist");
		assert.strictEqual(opg.pixelSizeMm, 0.05);
		assert.match(opg.label, /50 мкм/);

		const ezSensor = STANDARD_SENSOR_PRESETS.find((p) => p.id === "vatech_ezsensor_1_5");
		assert.ok(ezSensor, "Vatech EzSensor 1.5 must exist");
		assert.strictEqual(ezSensor.pixelSizeMm, 0.035);
	});

	test("DENTAL_SENSOR_PRESETS in math engine matches STANDARD_SENSOR_PRESETS in canvas", () => {
		assert.strictEqual(DENTAL_SENSOR_PRESETS.length, STANDARD_SENSOR_PRESETS.length);
		for (let i = 0; i < DENTAL_SENSOR_PRESETS.length; i++) {
			assert.strictEqual(DENTAL_SENSOR_PRESETS[i]?.id, STANDARD_SENSOR_PRESETS[i]?.id);
			assert.strictEqual(DENTAL_SENSOR_PRESETS[i]?.pixelSizeMm, STANDARD_SENSOR_PRESETS[i]?.pixelSizeMm);
		}
	});

	test("recalculates linear rulers when switching sensor preset scale in 1 click", () => {
		const r1: RulerMeasurement = { id: "r1", p1: { x: 0, y: 0 }, p2: { x: 200, y: 0 }, lengthPx: 200, lengthMm: 10.0, label: "L1" };
		const updatedRvg1 = recalculateRulersWithScale([r1], 0.02);
		assert.strictEqual(updatedRvg1.length, 1);
		assert.strictEqual(updatedRvg1[0]?.lengthMm, 4.0);
		assert.strictEqual(updatedRvg1[0]?.label, "L1");

		const updatedRvg2 = recalculateRulersWithScale([r1], 0.025);
		assert.strictEqual(updatedRvg2[0]?.lengthMm, 5.0);
	});

	test("recalculates endodontic working length (WL / Apex) polyline and updates label dynamically", () => {
		const canalRuler: RulerMeasurement = {
			id: "canal-1", p1: { x: 100, y: 50 }, p2: { x: 120, y: 300 }, lengthPx: 880, lengthMm: 22.0, label: "Канал: 22.0 мм (WL/Апекс)", color: "#10b981",
		};
		const updated = recalculateRulersWithScale([canalRuler], 0.02);
		assert.strictEqual(updated.length, 1);
		assert.strictEqual(Math.round(updated[0]!.lengthMm * 10) / 10, 17.6);
		assert.strictEqual(updated[0]!.label, "Канал: 17.6 мм (WL/Апекс)");
	});

	test("recalculates periapical bone destruction area and reclassifies clinical diagnosis", () => {
		const squarePoints = [{ x: 10, y: 10 }, { x: 110, y: 10 }, { x: 110, y: 110 }, { x: 10, y: 110 }];
		const initialLesion = calculatePeriapicalLesion(squarePoints, 0.05, "16", "lesion-1");
		assert.strictEqual(Math.round(initialLesion.areaMm2 * 10) / 10, 25.0);
		assert.strictEqual(initialLesion.classification, "cyst");
		assert.match(initialLesion.classificationLabel, /Киста/);

		const recalculated = recalculateLesionsWithScale([initialLesion], 0.02);
		assert.strictEqual(recalculated.length, 1);
		assert.strictEqual(Math.round(recalculated[0]!.areaMm2 * 10) / 10, 4.0);
		assert.strictEqual(recalculated[0]!.classification, "granuloma");
		assert.match(recalculated[0]!.classificationLabel, /гранулема/);
		assert.ok(recalculated[0]!.clinicalDescription.includes("4.0 мм²"));
	});
});
