/**
 * periodontalQuickScreeningPeriodontitis.test.ts — Пародонтит легкий, средний и тяжелый (K05.30..K05.32).
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
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	generatePsrDiaryProtocol,
	getPsrMaxCode,
	hasPsrAsterisk,
} from "../perioMath";

describe("6. Periodontal Quick Screening: Periodontitis Presets (K05.3x)", () => {
	const initialTeeth = createDefaultPerioTeeth();

	it("mild periodontitis: pockets 3.5-4 mm, PSR 2-3, BOP+, CAL 1-2 mm, K05.30", () => {
		const mildTeeth = applyPeriodontitisMildPreset(initialTeeth);
		const molar16 = mildTeeth.find((t) => t.toothNumber === 16);
		assert.ok(molar16);
		assert.strictEqual(molar16.distoBuccal.probingDepthMm, 4);
		assert.strictEqual(molar16.distoBuccal.bleedingOnProbing, true);
		assert.strictEqual(molar16.furcation, 0);

		const indices = calculatePerioIndices(mildTeeth);
		assert.strictEqual(indices.deepPocketsCount, 0);
		assert.ok(indices.moderatePocketsCount > 0);

		const diary = generatePsrDiaryProtocol("periodontitis_mild_express");
		assert.ok(diary.includes("K05.30"));
		assert.ok(diary.includes("3.5–4.0 мм"));
	});

	it("moderate periodontitis: pockets up to 5 mm, PSR 3*, furcation I, K05.31", () => {
		const modTeeth = applyPeriodontitisModeratePreset(initialTeeth);
		const molar16 = modTeeth.find((t) => t.toothNumber === 16);
		assert.ok(molar16);
		assert.strictEqual(molar16.distoBuccal.probingDepthMm, 5);
		assert.strictEqual(molar16.distoBuccal.gingivalMarginMm, 1);
		assert.strictEqual(molar16.distoBuccal.calMm, 6);
		assert.strictEqual(molar16.furcation, 1);

		const psr = calculatePsrSextants(modTeeth);
		assert.strictEqual(getPsrMaxCode(psr), 3);
		assert.strictEqual(hasPsrAsterisk(psr), true);

		const diary = generatePsrDiaryProtocol("periodontitis_moderate_express");
		assert.ok(diary.includes("3.5–5.0 мм (PSR 3)"));
		assert.ok(diary.includes("K05.3"));
	});

	it("severe periodontitis: pockets >= 6 mm, PSR 4*, suppuration, mobility II, K05.32", () => {
		const severeTeeth = applyPeriodontitisSeverePreset(initialTeeth);
		const molar16 = severeTeeth.find((t) => t.toothNumber === 16);
		assert.ok(molar16);
		assert.strictEqual(molar16.distoBuccal.probingDepthMm, 7);
		assert.strictEqual(molar16.distoBuccal.suppuration, true);
		assert.strictEqual(molar16.furcation, 2);
		assert.strictEqual(molar16.mobility, 2);

		const indices = calculatePerioIndices(severeTeeth);
		assert.ok(indices.deepPocketsCount >= 8);
		assert.ok(indices.sitesWithSuppurationCount > 0);

		const psr = calculatePsrSextants(severeTeeth);
		assert.strictEqual(getPsrMaxCode(psr), 4);
		assert.strictEqual(hasPsrAsterisk(psr), true);

		const diary = generatePsrDiaryProtocol("periodontitis_severe_express");
		assert.ok(diary.includes("K05.32"));
		assert.ok(diary.includes("гноетечение"));
	});
});
