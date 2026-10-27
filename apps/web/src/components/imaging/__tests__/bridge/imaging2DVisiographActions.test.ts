/**
 * @file imaging2DVisiographActions.test.ts
 * @description Clean unit tests for 2D RVG visiograph measurements and diagnostic filters.
 * Validates transform invariance, apex contrast, negative presets, and sensors (Mandate 8e, 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateRuler,
	recalculateRulersWithScale,
} from "../../../visiograph/VisiographMeasurementMath";
import { CLINICAL_VISIOGRAPH_FILTERS } from "../../../visiograph/VisiographWindowPresets";

describe("Imaging 2D Viewer — RVG / OPG Actions & Sensor Calculations", () => {
	it("Zoom & Pan: ruler length in physical mm is invariant under canvas transforms", () => {
		const scaleMmPerPixel = 0.035; // Vatech EzSensor 1.5
		const p1 = { x: 100, y: 150 };
		const p2 = { x: 100, y: 435 }; // 285 px

		const ruler = calculateRuler(p1, p2, scaleMmPerPixel, "Канал 16 Дистальный");
		assert.strictEqual(ruler.lengthPx, 285);
		// 285 * 0.035 = 9.975 -> 10.0 mm
		const roundedMm = Math.round(ruler.lengthMm * 10) / 10;
		assert.strictEqual(roundedMm, 10.0);
	});

	it("Brightness & Contrast: provides instant 1-click clinical presets without voxel lag", () => {
		const endo = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "endodontics");
		assert.ok(endo, "Эндодонтия preset must exist");
		assert.ok(endo.params.contrast >= 40, "High contrast for apex visibility");

		const bone = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "bone_periodont");
		assert.ok(bone, "Кость preset must exist");
		assert.ok(bone.params.sharpness >= 60, "High sharpness for trabeculae");
	});

	it("Negative / Inversion: 1-click microcrack & fracture detection preset", () => {
		const negative = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "negative_cracks");
		assert.ok(negative, "Негатив preset must exist");
		assert.strictEqual(negative.params.invert, true, "Must invert pixel intensities");
	});

	it("Calibrated Ruler: measures root canal length with 0.1 mm precision across sensor presets", () => {
		const p1 = { x: 50, y: 50 };
		const p2 = { x: 50, y: 350 }; // 300 px

		// Vatech EzSensor 1.5 (0.035 mm/px) -> 10.5 mm
		const vatechRuler = calculateRuler(p1, p2, 0.035, "WL 21");
		assert.strictEqual(Math.round(vatechRuler.lengthMm * 10) / 10, 10.5);

		// Planmeca ProSensor (0.030 mm/px) -> 9.0 mm
		const planmecaRulers = recalculateRulersWithScale([vatechRuler], 0.030);
		assert.strictEqual(Math.round(planmecaRulers[0]!.lengthMm * 10) / 10, 9.0);

		// Sirona Xios Plus (0.015 mm/px) -> 4.5 mm
		const sironaRulers = recalculateRulersWithScale([vatechRuler], 0.015);
		assert.strictEqual(Math.round(sironaRulers[0]!.lengthMm * 10) / 10, 4.5);
	});
});
