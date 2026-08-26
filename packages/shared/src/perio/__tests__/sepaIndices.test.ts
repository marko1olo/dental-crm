import assert from "node:assert";
import { describe, test } from "node:test";
import {
	calculateSepaCal,
	calculateSepaIndices,
	evaluateToothPrognosis,
	type SepaProbingSite,
	type SepaToothMetrics,
} from "../sepaIndices.js";

describe("calculateSepaCal", () => {
	test("computes attachment level for recession and hyperplasia", () => {
		// Normal margin
		assert.strictEqual(calculateSepaCal(3, 0), 3);
		// 2mm recession
		assert.strictEqual(calculateSepaCal(4, 2), 6);
		// 2mm gingival enlargement/hyperplasia
		assert.strictEqual(calculateSepaCal(5, -2), 3);
		// Extreme enlargement
		assert.strictEqual(calculateSepaCal(2, -4), 0);
	});
});

describe("calculateSepaIndices", () => {
	const teeth: SepaToothMetrics[] = Array.from({ length: 28 }, (_, i) => ({
		toothFdi: 11 + i,
		isPresent: true,
		isImplant: false,
		mobilityGrade: 0,
		furcationGradeBuccal: 0,
		furcationGradeLingual: 0,
	}));

	test("computes theoretical vs probed denominators", () => {
		// Probe only 4 sites out of 168 theoretical sites
		const sites: SepaProbingSite[] = [
			{ toothFdi: 11, site: "MV", probingDepthMm: 3, gingivalMarginMm: 0, hasBleedingOnProbing: true, hasPlaque: true },
			{ toothFdi: 11, site: "V", probingDepthMm: 2, gingivalMarginMm: 0, hasBleedingOnProbing: false, hasPlaque: true },
			{ toothFdi: 11, site: "DV", probingDepthMm: 6, gingivalMarginMm: 1, hasBleedingOnProbing: true, hasPlaque: false },
			{ toothFdi: 12, site: "MV", probingDepthMm: 3, gingivalMarginMm: 0, hasBleedingOnProbing: false, hasPlaque: false },
		];

		const summary = calculateSepaIndices(teeth, sites);

		assert.strictEqual(summary.presentTeethCount, 28);
		assert.strictEqual(summary.totalTheoreticalSites, 168);
		assert.strictEqual(summary.probedSitesCount, 4);
		assert.strictEqual(summary.bleedingSitesCount, 2);

		// Probed BOP: 2 / 4 = 50.0%
		assert.strictEqual(summary.bopPercentageProbed, 50.0);
		// SEPA Theoretical BOP: (2 / 168) * 100 = 1.2%
		assert.strictEqual(summary.bopPercentageSepa, 1.2);
		assert.strictEqual(summary.deepPocketsCount, 1);
		assert.strictEqual(summary.teethWithDeepPocketsCount, 1);
	});
});

describe("evaluateToothPrognosis", () => {
	test("evaluates prognosis according to Kwok & Caton", () => {
		const goodTooth: SepaToothMetrics = {
			toothFdi: 11,
			isPresent: true,
			isImplant: false,
			mobilityGrade: 0,
			furcationGradeBuccal: 0,
			furcationGradeLingual: 0,
		};
		assert.strictEqual(evaluateToothPrognosis(goodTooth, 3, 2), "good");

		const fairTooth: SepaToothMetrics = {
			...goodTooth,
			mobilityGrade: 1,
		};
		assert.strictEqual(evaluateToothPrognosis(fairTooth, 5, 4), "fair");

		const poorTooth: SepaToothMetrics = {
			...goodTooth,
			mobilityGrade: 2,
		};
		assert.strictEqual(evaluateToothPrognosis(poorTooth, 6, 6), "poor");

		const hopelessTooth: SepaToothMetrics = {
			...goodTooth,
			mobilityGrade: 3,
			furcationGradeBuccal: 3,
		};
		assert.strictEqual(evaluateToothPrognosis(hopelessTooth, 9, 10), "hopeless");
	});
});
