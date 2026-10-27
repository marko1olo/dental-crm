/**
 * periodontalDiscreteHeatmap.test.ts — Дискретная шкала тонов и клинических глубин зондирования.
 * Мандат 8b: <= 120 строк.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	fastGetClinicalToneHex,
	fastGetProbingDepthTone,
	probingDepthClinicalHex,
	probingDepthClinicalTone,
	probingDepthTone,
} from "../perioHeatmap";

describe("1. Discrete Calm Heatmap Scale & Clinical Tones", () => {
	it("probingDepthTone: null and undefined return 'neutral'", () => {
		assert.strictEqual(probingDepthTone(null), "neutral");
		assert.strictEqual(probingDepthTone(undefined), "neutral");
	});

	it("probingDepthTone: depth <= 3 mm returns 'success' (нормальная борозда)", () => {
		for (const d of [0, 1, 2, 3]) {
			assert.strictEqual(probingDepthTone(d), "success");
			assert.strictEqual(fastGetProbingDepthTone(d), "success");
		}
	});

	it("probingDepthTone: depth 4 mm returns 'warning-low' and 5..6 mm returns 'warning-high'", () => {
		assert.strictEqual(probingDepthTone(4), "warning-low");
		assert.strictEqual(probingDepthTone(5), "warning-high");
		assert.strictEqual(probingDepthTone(6), "warning-high");
	});

	it("probingDepthTone: depth > 6 mm returns 'error'", () => {
		for (const d of [7, 8, 10, 15]) {
			assert.strictEqual(probingDepthTone(d), "error");
		}
	});

	it("probingDepthClinicalTone: 4-tier clinical scale", () => {
		assert.strictEqual(probingDepthClinicalTone(null), "neutral");
		assert.strictEqual(probingDepthClinicalTone(Number.NaN), "neutral");
		// 1..3 mm -> success (green)
		assert.strictEqual(probingDepthClinicalTone(1), "success");
		assert.strictEqual(probingDepthClinicalTone(3), "success");
		// 4..5 mm -> warning-low (yellow)
		assert.strictEqual(probingDepthClinicalTone(4), "warning-low");
		assert.strictEqual(probingDepthClinicalTone(5), "warning-low");
		// 6..7 mm -> warning-high (orange)
		assert.strictEqual(probingDepthClinicalTone(6), "warning-high");
		assert.strictEqual(probingDepthClinicalTone(7), "warning-high");
		// >= 8 mm -> critical (crimson)
		assert.strictEqual(probingDepthClinicalTone(8), "critical");
		assert.strictEqual(probingDepthClinicalTone(12), "critical");
	});

	it("maps clinical tones to correct hex colors", () => {
		assert.strictEqual(probingDepthClinicalHex(2), "#34d399"); // green
		assert.strictEqual(probingDepthClinicalHex(4), "#fbbf24"); // yellow
		assert.strictEqual(probingDepthClinicalHex(5), "#fbbf24"); // yellow
		assert.strictEqual(probingDepthClinicalHex(6), "#f97316"); // orange
		assert.strictEqual(probingDepthClinicalHex(8), "#e11d48"); // crimson / red
		assert.strictEqual(fastGetClinicalToneHex(2), "#34d399");
		assert.strictEqual(fastGetClinicalToneHex(8), "#e11d48");
	});
});
