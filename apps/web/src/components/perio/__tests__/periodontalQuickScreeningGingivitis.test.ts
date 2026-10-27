/**
 * periodontalQuickScreeningGingivitis.test.ts — Экспресс-пресет «Гингивит» (BOP+, PSR 1-2, K05.1).
 * Мандат 8b: <= 120 строк.
 */

import {
	calculatePerioIndices,
	calculatePsrSextants,
	createDefaultPerioTeeth,
} from "@dental/shared";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyGingivitisPreset,
	generatePsrDiaryProtocol,
	getPsrMaxCode,
	hasPsrAsterisk,
} from "../perioMath";

describe("5. Periodontal Quick Screening: Gingivitis Preset (K05.1)", () => {
	const initialTeeth = createDefaultPerioTeeth();

	it("sets diffuse BOP+ with false pockets < 3.5 mm and 0 mobility", () => {
		const gingivitisTeeth = applyGingivitisPreset(initialTeeth);
		assert.strictEqual(gingivitisTeeth.length, 32);

		for (const tooth of gingivitisTeeth) {
			assert.strictEqual(tooth.mobility, 0, "No mobility in gingivitis");
			assert.strictEqual(tooth.furcation, 0, "No furcation involvement in gingivitis");

			const sites = [
				tooth.distoBuccal, tooth.midBuccal, tooth.mesioBuccal,
				tooth.distoLingual, tooth.midLingual, tooth.mesioLingual,
			];

			for (const site of sites) {
				assert.ok(site.probingDepthMm <= 3, `Depth must be <= 3 mm, got: ${site.probingDepthMm}`);
				assert.strictEqual(site.bleedingOnProbing, true, "BOP+ diffuse bleeding");
				assert.strictEqual(site.plaque, true, "Plaque present");
			}
		}

		const indices = calculatePerioIndices(gingivitisTeeth);
		assert.strictEqual(indices.fmbsPercent, 100, "FMBS (BOP) 100%");
		assert.strictEqual(indices.deepPocketsCount, 0, "No true deep pockets >= 5 mm");

		const psr = calculatePsrSextants(gingivitisTeeth);
		const maxCode = getPsrMaxCode(psr);
		assert.ok(maxCode === 1 || maxCode === 2, `PSR max code 1 or 2, got: ${maxCode}`);
		assert.strictEqual(hasPsrAsterisk(psr), false, "No asterisk in gingivitis");
	});

	it("generates diary protocol with K05.1 and inflammation findings", () => {
		const diaryText = generatePsrDiaryProtocol("gingivitis_express");
		assert.ok(diaryText.includes("десна отечна, гиперемирована"));
		assert.ok(diaryText.includes("BOP+"));
		assert.ok(diaryText.includes("ложные карманы"));
		assert.ok(diaryText.includes("K05.1"));
	});
});
