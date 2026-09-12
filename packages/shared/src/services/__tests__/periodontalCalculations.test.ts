import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	PERIODONTAL_SITE_CODES,
	SITES_PER_TOOTH,
	calculateBopPercentage,
	calculateDeepPocketsCount,
	calculateMeanCal,
	calculatePlaquePercentage,
	calculateTotalSites,
	computeSepaIndices,
	evaluatePeriodontalRisk,
	isToothPresent,
	type PeriodontalSite,
	type PeriodontalToothRecord,
} from "../periodontalCalculations.js";

describe("SEPA Periodontal Calculations Engine", () => {
	it("verifies 6 canonical probing sites per tooth (MV, V, DV, ML, L, DL)", () => {
		assert.equal(SITES_PER_TOOTH, 6);
		assert.deepEqual(PERIODONTAL_SITE_CODES, ["MV", "V", "DV", "ML", "L", "DL"]);
		assert.equal(calculateTotalSites(28), 168);
		assert.equal(calculateTotalSites(20), 120);
		assert.equal(calculateTotalSites(0), 0);
	});

	it("calculates BoP% and Plaque% for a full permanent dentition (28 teeth)", () => {
		const teethCount = 28;
		const totalSites = SITES_PER_TOOTH * teethCount; // 168 sites

		// Create 168 sites: 42 with BoP, 28 with Plaque
		const sites: PeriodontalSite[] = [];
		for (let i = 0; i < totalSites; i++) {
			sites.push({
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: i < 42,
				plaque: i < 28,
			});
		}

		// BoP: 42 / 168 = 25%
		const bop = calculateBopPercentage(sites, teethCount);
		assert.equal(bop, 25);

		// Plaque: 28 / 168 = 16.666...% -> 16.67%
		const plaque = calculatePlaquePercentage(sites, teethCount);
		assert.equal(plaque, 16.67);
	});

	it("calculates BoP% and Plaque% for a partial dentition (20 present teeth, 8 missing)", () => {
		const presentTeethCount = 20;
		const totalSites = SITES_PER_TOOTH * presentTeethCount; // 120 sites

		// 30 bleeders, 18 with plaque
		const sites: PeriodontalSite[] = [];
		for (let i = 0; i < totalSites; i++) {
			sites.push({
				probingDepthMm: 3,
				gingivalMarginMm: 0,
				bleedingOnProbing: i < 30,
				plaque: i < 18,
			});
		}

		// BoP: 30 / 120 = 25%
		const bop = calculateBopPercentage(sites, presentTeethCount);
		assert.equal(bop, 25);

		// Plaque: 18 / 120 = 15%
		const plaque = calculatePlaquePercentage(sites, presentTeethCount);
		assert.equal(plaque, 15);
	});

	it("returns 0% when no teeth are present or total sites is 0", () => {
		assert.equal(calculateBopPercentage([], 0), 0);
		assert.equal(calculatePlaquePercentage([], 0), 0);
		assert.equal(calculateMeanCal([], 0), 0);
	});

	it("calculates Mean CAL (Clinical Attachment Loss = PD + GM)", () => {
		const teethCount = 2;
		const totalSites = 12; // 2 teeth * 6 sites

		// Site 1: PD = 5, GM = 2 -> CAL = 7
		// Site 2: PD = 4, GM = 1 -> CAL = 5
		// Site 3: PD = 3, GM = 0 -> CAL = 3
		// Other 9 sites: PD = 2, GM = 0 -> CAL = 2
		// Sum = 7 + 5 + 3 + (9 * 2) = 15 + 18 = 33
		// Mean = 33 / 12 = 2.75 mm
		const sites: PeriodontalSite[] = [
			{ probingDepthMm: 5, gingivalMarginMm: 2 },
			{ probingDepthMm: 4, gingivalMarginMm: 1 },
			{ probingDepthMm: 3, gingivalMarginMm: 0 },
			...Array.from({ length: 9 }, () => ({
				probingDepthMm: 2,
				gingivalMarginMm: 0,
			})),
		];

		const meanCal = calculateMeanCal(sites, teethCount);
		assert.equal(meanCal, 2.75);
	});

	it("detects teeth with deep pockets (>= 5 mm) across distinct present teeth", () => {
		const teeth: PeriodontalToothRecord[] = [
			// Tooth 11: present, has a 6mm pocket on MV -> deep
			{
				toothNumber: 11,
				isPresent: true,
				sites: [
					{ siteCode: "MV", probingDepthMm: 6 },
					{ siteCode: "V", probingDepthMm: 3 },
					{ siteCode: "DV", probingDepthMm: 3 },
					{ siteCode: "ML", probingDepthMm: 3 },
					{ siteCode: "L", probingDepthMm: 2 },
					{ siteCode: "DL", probingDepthMm: 2 },
				],
			},
			// Tooth 12: present, has multiple deep pockets (5mm, 7mm) -> counts as 1 tooth
			{
				toothNumber: 12,
				isPresent: true,
				sites: [
					{ siteCode: "MV", probingDepthMm: 5 },
					{ siteCode: "V", probingDepthMm: 7 },
					{ siteCode: "DV", probingDepthMm: 4 },
					{ siteCode: "ML", probingDepthMm: 3 },
					{ siteCode: "L", probingDepthMm: 3 },
					{ siteCode: "DL", probingDepthMm: 3 },
				],
			},
			// Tooth 13: present, healthy pockets (max 3mm) -> not deep
			{
				toothNumber: 13,
				isPresent: true,
				sites: [
					{ siteCode: "MV", probingDepthMm: 3 },
					{ siteCode: "V", probingDepthMm: 2 },
					{ siteCode: "DV", probingDepthMm: 2 },
					{ siteCode: "ML", probingDepthMm: 3 },
					{ siteCode: "L", probingDepthMm: 2 },
					{ siteCode: "DL", probingDepthMm: 2 },
				],
			},
			// Tooth 14: MISSING tooth with 6mm recorded in old history -> MUST NOT BE COUNTED
			{
				toothNumber: 14,
				isMissing: true,
				sites: [{ siteCode: "MV", probingDepthMm: 6 }],
			},
		];

		assert.equal(isToothPresent(teeth[0]!), true);
		assert.equal(isToothPresent(teeth[3]!), false);

		const deepCount = calculateDeepPocketsCount(teeth);
		assert.equal(deepCount, 2); // Only teeth 11 and 12
	});

	it("evaluates periodontal risk according to Lang & Tonetti / SEPA criteria", () => {
		// Low risk: BoP < 15%, deep pockets < 4, bone loss < 0.5
		assert.equal(evaluatePeriodontalRisk(8, 1, 0.3), "low");
		assert.equal(evaluatePeriodontalRisk(0, 0, 0.1), "low");

		// Moderate risk:
		// Moderate BoP (15% - 29%)
		assert.equal(evaluatePeriodontalRisk(20, 2, 0.3), "moderate");
		// Moderate deep pockets (4 - 8)
		assert.equal(evaluatePeriodontalRisk(10, 5, 0.3), "moderate");
		// Moderate bone loss (0.5 - 1.0 or 25% - 50%)
		assert.equal(evaluatePeriodontalRisk(10, 2, 0.7), "moderate");
		assert.equal(evaluatePeriodontalRisk(10, 2, 35), "moderate");

		// High risk:
		// High BoP (>= 30%)
		assert.equal(evaluatePeriodontalRisk(35, 1, 0.2), "high");
		// High deep pockets (>= 9)
		assert.equal(evaluatePeriodontalRisk(8, 10, 0.3), "high");
		// High bone loss (BL/Age > 1.0 or bone loss > 50%)
		assert.equal(evaluatePeriodontalRisk(10, 1, 1.2), "high");
		assert.equal(evaluatePeriodontalRisk(10, 1, 60), "high");
	});

	it("computes full SEPA indices bundle correctly", () => {
		const teeth: PeriodontalToothRecord[] = [
			{
				toothNumber: 11,
				isPresent: true,
				sites: [
					{ probingDepthMm: 5, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: true },
					{ probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: true },
					{ probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false },
					{ probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false },
					{ probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false },
					{ probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false },
				],
			},
			{
				toothNumber: 12,
				isMissing: true, // Extracted, must not participate in denominators
				sites: [{ probingDepthMm: 8, bleedingOnProbing: true }],
			},
		];

		const summary = computeSepaIndices(teeth);
		assert.equal(summary.present_teeth_count, 1);
		assert.equal(summary.total_sites, 6);
		assert.equal(summary.deep_pockets_count, 1);
		// 1 bleeding site out of 6 -> 100 * 1 / 6 = 16.67%
		assert.equal(summary.bop_pct, 16.67);
		// 2 plaque sites out of 6 -> 100 * 2 / 6 = 33.33%
		assert.equal(summary.pi_pct, 33.33);
		// CAL sum: (5 + 1) + 3 + 3 + 2 + 2 + 2 = 18 mm. Mean: 18 / 6 = 3.0 mm
		assert.equal(summary.cal_mean_mm, 3.0);
	});
});
