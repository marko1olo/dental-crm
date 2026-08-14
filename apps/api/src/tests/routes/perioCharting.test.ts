import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	calculatePsrSextants,
	type PerioToothRecord,
} from "@dental/shared";

describe("Periodontal Charting & Probing Calculations", () => {
	it("calculates Clinical Attachment Level (CAL = PD + GM) accurately", () => {
		// Normal sulcus with 2mm recession
		assert.equal(calculateClinicalAttachmentLevel(3, 2), 5);

		// 6mm pocket with 0mm margin
		assert.equal(calculateClinicalAttachmentLevel(6, 0), 6);

		// 4mm pocket with -2mm gingival enlargement/overgrowth
		assert.equal(calculateClinicalAttachmentLevel(4, -2), 2);

		// Bounds check: negative values clamped to zero
		assert.equal(calculateClinicalAttachmentLevel(0, -3), 0);
	});

	it("calculates Full Mouth Bleeding Score (FMBS) and Plaque Score (FMPS)", () => {
		const teeth: PerioToothRecord[] = [
			{
				toothNumber: 11,
				isMissing: false,
				isImplant: false,
				mobility: 0,
				furcation: 0,
				distoBuccal: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: true, plaque: true, suppuration: false, calculus: false },
				midBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: true, suppuration: false, calculus: false },
				mesioBuccal: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: true, plaque: false, suppuration: false, calculus: false },
				distoLingual: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				midLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				mesioLingual: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
			},
			{
				toothNumber: 12,
				isMissing: false,
				isImplant: false,
				mobility: 0,
				furcation: 0,
				distoBuccal: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				midBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				mesioBuccal: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				distoLingual: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				midLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				mesioLingual: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
			},
		];

		const summary = calculatePerioIndices(teeth);
		assert.equal(summary.totalTeethExamined, 2);
		assert.equal(summary.totalSitesProbed, 12);
		// 2 BOP sites out of 12 = 16.7%
		assert.equal(summary.fmbsPercent, 16.7);
		// 2 Plaque sites out of 12 = 16.7%
		assert.equal(summary.fmpsPercent, 16.7);
		assert.equal(summary.deepPocketsCount, 0);
		assert.equal(summary.riskCategory, "moderate");
	});

	it("identifies high risk periodontal cases with deep pockets and furcation", () => {
		const teeth: PerioToothRecord[] = [
			{
				toothNumber: 16,
				isMissing: false,
				isImplant: false,
				mobility: 2,
				furcation: 2,
				distoBuccal: { probingDepthMm: 6, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: true, suppuration: true, calculus: true },
				midBuccal: { probingDepthMm: 5, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: true, suppuration: false, calculus: true },
				mesioBuccal: { probingDepthMm: 7, gingivalMarginMm: 2, bleedingOnProbing: true, plaque: true, suppuration: true, calculus: true },
				distoLingual: { probingDepthMm: 5, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: false, suppuration: false, calculus: false },
				midLingual: { probingDepthMm: 4, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				mesioLingual: { probingDepthMm: 6, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: false, suppuration: false, calculus: false },
			},
			{
				toothNumber: 26,
				isMissing: false,
				isImplant: false,
				mobility: 1,
				furcation: 2,
				distoBuccal: { probingDepthMm: 6, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: true, suppuration: true, calculus: true },
				midBuccal: { probingDepthMm: 5, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: true, suppuration: false, calculus: true },
				mesioBuccal: { probingDepthMm: 7, gingivalMarginMm: 2, bleedingOnProbing: true, plaque: true, suppuration: true, calculus: true },
				distoLingual: { probingDepthMm: 5, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: false, suppuration: false, calculus: false },
				midLingual: { probingDepthMm: 4, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				mesioLingual: { probingDepthMm: 6, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: false, suppuration: false, calculus: false },
			},
		];

		const summary = calculatePerioIndices(teeth);
		assert.equal(summary.maxPocketDepthMm, 7);
		assert.equal(summary.maxCalMm, 9); // 7mm PD + 2mm GM = 9mm CAL
		assert.equal(summary.teethWithFurcationCount, 2);
		assert.equal(summary.teethWithMobilityCount, 2);
		assert.equal(summary.riskCategory, "high");
	});

	it("computes PSR/CPITN sextant codes with asterisk indicators", () => {
		const teeth: PerioToothRecord[] = [
			// Sextant S1: 17-14 (has 6mm pocket on 16)
			{
				toothNumber: 16,
				isMissing: false,
				isImplant: false,
				mobility: 2,
				furcation: 1,
				distoBuccal: { probingDepthMm: 6, gingivalMarginMm: 0, bleedingOnProbing: true, plaque: true, suppuration: false, calculus: true },
				midBuccal: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				mesioBuccal: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				distoLingual: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				midLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				mesioLingual: { probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
			},
			// Sextant S2: 13-23 (healthy, Code 0)
			{
				toothNumber: 11,
				isMissing: false,
				isImplant: false,
				mobility: 0,
				furcation: 0,
				distoBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				midBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				mesioBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				distoLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				midLingual: { probingDepthMm: 1, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
				mesioLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
			},
		];

		const psr = calculatePsrSextants(teeth);
		// S1 should have Code 4 (due to 6mm PD) and asterisk (mobility 2 & furcation 1)
		assert.equal(psr.S1?.code, 4);
		assert.equal(psr.S1?.asterisk, true);

		// S2 should have Code 0 (all healthy <= 3mm, no BOP, no calculus)
		assert.equal(psr.S2?.code, 0);
		assert.equal(psr.S2?.asterisk, false);
	});
});
