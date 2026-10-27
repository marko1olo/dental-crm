/**
 * periodontalClinicalRecession.test.ts — Рецессия десны (K06.0) и потеря клинического прикрепления (CAL).
 * Мандат 8b: <= 120 строк.
 */

import { calculateClinicalAttachmentLevel, createDefaultPerioTeeth } from "@dental/shared";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyGingivalRecessionPreset,
	PERIO_EXPRESS_PRESETS,
} from "../perioMath";

describe("10. Clinical Recession (K06.0) & CAL Measurement", () => {
	it("recession_express preset exists with ICD-10 K06.0 and protocol text", () => {
		const recPreset = PERIO_EXPRESS_PRESETS.recession_express;
		assert.ok(recPreset);
		assert.strictEqual(recPreset.icd10, "K06.0");
		assert.ok(recPreset.defaultProtocolRu.includes("Рецессия десны"));
	});

	it("applyGingivalRecessionPreset sets margin with intact pockets and 0 BOP", () => {
		const baseTeeth = createDefaultPerioTeeth();
		const result = applyGingivalRecessionPreset(baseTeeth);
		assert.strictEqual(result.length, 32);

		for (const t of result) {
			assert.strictEqual(t.mobility, 0);
			assert.strictEqual(t.furcation, 0);
			for (const siteKey of ["distoBuccal", "midBuccal", "mesioBuccal"] as const) {
				const site = t[siteKey];
				assert.strictEqual(site.bleedingOnProbing, false);
				assert.ok(site.probingDepthMm <= 2);
			}
		}

		// Tooth 13 has prominent midBuccal recession
		const tooth13 = result.find((t) => t.toothNumber === 13);
		assert.ok(tooth13);
		assert.ok((tooth13.midBuccal.gingivalMarginMm ?? 0) >= 1);
		assert.ok((tooth13.midBuccal.calMm ?? 0) >= 2);
	});

	it("calculateClinicalAttachmentLevel: pocket 2 mm + recession 2 mm -> CAL = 4 mm", () => {
		const cal = calculateClinicalAttachmentLevel(2, 2);
		assert.strictEqual(cal, 4);
	});
});
