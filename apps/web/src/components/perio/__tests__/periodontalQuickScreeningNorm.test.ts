/**
 * periodontalQuickScreeningNorm.test.ts — Экспресс-скрининг нормы пародонта и дневник Формы 043/у.
 * Мандат 8b: <= 120 строк.
 */

import {
	calculatePerioIndices,
	calculatePsrSextants,
	createDefaultPerioTeeth,
	PSR_SEXTANTS,
} from "@dental/shared";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyHealthyPeriodontiumPreset,
	generatePsrDiaryProtocol,
	getPsrMaxCode,
	hasPsrAsterisk,
} from "../perioMath";

describe("4. Periodontal Quick Screening: Healthy Norm Preset (PSR 0)", () => {
	const initialTeeth = createDefaultPerioTeeth();

	it("sets depth <= 2 mm, BOP = 0%, PSR 0 in all 6 sextants", () => {
		const normTeeth = applyHealthyPeriodontiumPreset(initialTeeth);
		assert.strictEqual(normTeeth.length, 32);

		for (const tooth of normTeeth) {
			assert.strictEqual(tooth.mobility, 0);
			assert.strictEqual(tooth.furcation, 0);
			const sites = [
				tooth.distoBuccal, tooth.midBuccal, tooth.mesioBuccal,
				tooth.distoLingual, tooth.midLingual, tooth.mesioLingual,
			];
			for (const site of sites) {
				assert.ok(site.probingDepthMm <= 2, `Tooth ${tooth.toothNumber} pocket must be <= 2 mm`);
				assert.strictEqual(site.bleedingOnProbing, false);
				assert.strictEqual(site.plaque, false);
			}
		}

		const indices = calculatePerioIndices(normTeeth);
		assert.strictEqual(indices.totalSitesProbed, 192);
		assert.strictEqual(indices.fmbsPercent, 0, "BOP must be 0%");
		assert.strictEqual(indices.fmpsPercent, 0, "Plaque must be 0%");
		assert.strictEqual(indices.deepPocketsCount, 0);
		assert.strictEqual(indices.meanPocketDepthMm, 2);

		const psr = calculatePsrSextants(normTeeth);
		assert.strictEqual(getPsrMaxCode(psr), 0);
		assert.strictEqual(hasPsrAsterisk(psr), false);

		for (const sextant of PSR_SEXTANTS) {
			const sResult = psr[sextant.name];
			assert.ok(sResult);
			assert.strictEqual(sResult.code, 0);
			assert.strictEqual(sResult.asterisk, false);
		}
	});

	it("generates clean clinical SOAP diary protocol with ICD-10 Z01.2", () => {
		const diaryText = generatePsrDiaryProtocol("perio_norm_express");
		assert.ok(diaryText.includes("маргинальная десна бледно-розовая"));
		assert.ok(diaryText.includes("глубина зубодесневой борозды 1-2 мм"));
		assert.ok(diaryText.includes("кровоточивость отсутствует"));
		assert.ok(diaryText.includes("Скрининг PSR: 0 во всех секстантах"));
		assert.ok(diaryText.includes("Z01.2"));
	});
});
