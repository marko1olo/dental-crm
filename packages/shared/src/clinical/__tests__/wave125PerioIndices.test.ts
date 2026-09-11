/**
 * packages/shared/src/clinical/__tests__/wave125PerioIndices.test.ts
 *
 * Unit tests for SEPA Periodontal Indices & AAP/EFP 2018 Staging Engine (Wave 125).
 * Adapted from DentalPin periodontogram module (indices.py & constants.py).
 *
 * Requirements:
 * 1. 28 present teeth and theoretical denominator calculation (168 sites).
 * 2. BoP % and Plaque Index % formulas (prevent percentage inflation on partially examined charts).
 * 3. Clinical Attachment Level CAL = Probing Depth + Gingival Margin.
 * 4. Deep pockets count (distinct present teeth with at least one site >= 5 mm).
 * 5. AAP/EFP 2018 staging classification.
 * 6. Printable A4 summary generation for Form 043/y: strictly 0 emojis (Mandate 8d item 7).
 * 7. 100% Zero Mocks, Exit Code 0.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type AapEfpStage,
	type PerioIndicesSummary,
	type PerioSiteData,
	type PerioToothData,
	type SepaSiteCode,
	DEEP_POCKET_THRESHOLD_MM,
	GINGIVAL_MARGIN_MAX_MM,
	GINGIVAL_MARGIN_MIN_MM,
	KERATINIZED_GINGIVA_MAX_MM,
	KERATINIZED_GINGIVA_MIN_MM,
	PALATAL_LINGUAL_SITES,
	PROBING_DEPTH_MAX_MM,
	PROBING_DEPTH_MIN_MM,
	SEPA_SITE_CODES,
	SEPA_SITE_LABELS_RU,
	SITES_PER_TOOTH,
	VESTIBULAR_SITES,
	aapEfpStageSchema,
	computeBoPPct,
	computeMeanCalMm,
	computePerioIndices,
	computePlaqueIndexPct,
	countDeepPockets,
	determineAapEfpStage,
	formatPerioIndicesA4Summary,
	isGingivalMarginValid,
	isKeratinizedGingivaValid,
	isProbingDepthValid,
	perioIndicesSummarySchema,
	perioSiteDataSchema,
	perioToothDataSchema,
} from "../perioIndicesEngine.js";
import {
	computeBoPPct as computeBoPPctFromClinicalIndex,
	computeMeanCalMm as computeMeanCalMmFromClinicalIndex,
	computePerioIndices as computePerioIndicesFromClinicalIndex,
	computePlaqueIndexPct as computePlaqueIndexPctFromClinicalIndex,
	countDeepPockets as countDeepPocketsFromClinicalIndex,
	determineAapEfpStage as determineAapEfpStageFromClinicalIndex,
	formatPerioIndicesA4Summary as formatPerioIndicesA4SummaryFromClinicalIndex,
} from "../index.js";
import {
	computeBoPPct as computeBoPPctFromRoot,
	computeMeanCalMm as computeMeanCalMmFromRoot,
	computePerioIndices as computePerioIndicesFromRoot,
	computePlaqueIndexPct as computePlaqueIndexPctFromRoot,
	countDeepPockets as countDeepPocketsFromRoot,
	determineAapEfpStage as determineAapEfpStageFromRoot,
	formatPerioIndicesA4Summary as formatPerioIndicesA4SummaryFromRoot,
} from "../../index.js";

// Standard 28 permanent teeth (FDI notation, excluding wisdom teeth 18, 28, 38, 48)
const PERMANENT_28_TEETH_FDI: readonly number[] = [
	17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27,
	37, 36, 35, 34, 33, 32, 31,
	41, 42, 43, 44, 45, 46, 47,
];

describe("Wave 125: SEPA Periodontal Indices & AAP/EFP Staging Engine", () => {
	describe("1. Re-exports & Architecture Invariants", () => {
		it("re-exports all core functions and constants identically across modules", () => {
			assert.equal(computeBoPPct, computeBoPPctFromClinicalIndex);
			assert.equal(computeBoPPct, computeBoPPctFromRoot);
			assert.equal(computePlaqueIndexPct, computePlaqueIndexPctFromClinicalIndex);
			assert.equal(computePlaqueIndexPct, computePlaqueIndexPctFromRoot);
			assert.equal(computeMeanCalMm, computeMeanCalMmFromClinicalIndex);
			assert.equal(computeMeanCalMm, computeMeanCalMmFromRoot);
			assert.equal(countDeepPockets, countDeepPocketsFromClinicalIndex);
			assert.equal(countDeepPockets, countDeepPocketsFromRoot);
			assert.equal(determineAapEfpStage, determineAapEfpStageFromClinicalIndex);
			assert.equal(determineAapEfpStage, determineAapEfpStageFromRoot);
			assert.equal(computePerioIndices, computePerioIndicesFromClinicalIndex);
			assert.equal(computePerioIndices, computePerioIndicesFromRoot);
			assert.equal(
				formatPerioIndicesA4Summary,
				formatPerioIndicesA4SummaryFromClinicalIndex,
			);
			assert.equal(
				formatPerioIndicesA4Summary,
				formatPerioIndicesA4SummaryFromRoot,
			);
		});

		it("defines correct SEPA constants and validation boundaries", () => {
			assert.equal(SITES_PER_TOOTH, 6);
			assert.equal(DEEP_POCKET_THRESHOLD_MM, 5);
			assert.deepEqual(SEPA_SITE_CODES, ["MV", "V", "DV", "ML", "L", "DL"]);
			assert.deepEqual(VESTIBULAR_SITES, ["MV", "V", "DV"]);
			assert.deepEqual(PALATAL_LINGUAL_SITES, ["ML", "L", "DL"]);
			assert.equal(PROBING_DEPTH_MIN_MM, 0);
			assert.equal(PROBING_DEPTH_MAX_MM, 15);
			assert.equal(GINGIVAL_MARGIN_MIN_MM, -5);
			assert.equal(GINGIVAL_MARGIN_MAX_MM, 10);
			assert.equal(KERATINIZED_GINGIVA_MIN_MM, 0);
			assert.equal(KERATINIZED_GINGIVA_MAX_MM, 20);

			for (const code of SEPA_SITE_CODES) {
				assert.ok(SEPA_SITE_LABELS_RU[code], `Missing label for site ${code}`);
			}
		});

		it("validates boundary inputs correctly via validator helpers", () => {
			assert.equal(isProbingDepthValid(0), true);
			assert.equal(isProbingDepthValid(15), true);
			assert.equal(isProbingDepthValid(-1), false);
			assert.equal(isProbingDepthValid(16), false);

			assert.equal(isGingivalMarginValid(-5), true);
			assert.equal(isGingivalMarginValid(10), true);
			assert.equal(isGingivalMarginValid(-6), false);
			assert.equal(isGingivalMarginValid(11), false);

			assert.equal(isKeratinizedGingivaValid(0), true);
			assert.equal(isKeratinizedGingivaValid(20), true);
			assert.equal(isKeratinizedGingivaValid(-1), false);
			assert.equal(isKeratinizedGingivaValid(21), false);
		});
	});

	describe("2. Theoretical Denominator & Tooth Counts", () => {
		it("calculates 168 theoretical sites for 28 present teeth", () => {
			const teeth: PerioToothData[] = PERMANENT_28_TEETH_FDI.map((toothNumber) => ({
				toothNumber,
				isPresent: true,
				sites: [],
			}));

			const summary = computePerioIndices(teeth);
			assert.equal(summary.presentTeethCount, 28);
			assert.equal(summary.totalTheoreticalSites, 168);
			assert.equal(summary.totalMeasuredSites, 0);
			assert.equal(summary.bopPct, 0);
			assert.equal(summary.piPct, 0);
			assert.equal(summary.meanCalMm, 0);
			assert.equal(summary.deepPocketsCount, 0);
			assert.equal(summary.aapEfpStage, "health_gingivitis");
		});

		it("excludes missing/extracted teeth (isPresent = false) from denominator", () => {
			// 28 teeth total: 4 missing (24 present)
			const teeth: PerioToothData[] = PERMANENT_28_TEETH_FDI.map((toothNumber, idx) => ({
				toothNumber,
				isPresent: idx >= 4, // first 4 are missing
				sites:
					idx < 4
						? [
								// If missing teeth had phantom measurements, they must NOT be counted
								{
									probingDepthMm: 8,
									gingivalMarginMm: 2,
									bleedingOnProbing: true,
									plaque: true,
								},
							]
						: [],
			}));

			const summary = computePerioIndices(teeth);
			assert.equal(summary.presentTeethCount, 24);
			assert.equal(summary.totalTheoreticalSites, 144); // 24 * 6
			// Absent teeth measurements are completely ignored
			assert.equal(summary.deepPocketsCount, 0);
			assert.equal(summary.bopPct, 0);
			assert.equal(summary.piPct, 0);
		});

		it("returns zeroes when teeth array is completely empty", () => {
			const summary = computePerioIndices([]);
			assert.equal(summary.presentTeethCount, 0);
			assert.equal(summary.totalTheoreticalSites, 0);
			assert.equal(summary.totalMeasuredSites, 0);
			assert.equal(summary.bopPct, 0);
			assert.equal(summary.piPct, 0);
			assert.equal(summary.meanCalMm, 0);
			assert.equal(summary.deepPocketsCount, 0);
			assert.equal(summary.aapEfpStage, "health_gingivitis");
		});
	});

	describe("3. BoP % and Plaque Index % Formulas (Anti-Inflation Standard)", () => {
		it("anchors BoP % and PI % to theoretical sites, preventing percentage inflation on partial exam", () => {
			// Patient has 28 present teeth (168 theoretical sites).
			// Dentist examined tooth 11 and recorded 3 bleeding sites and 2 plaque sites.
			const teeth: PerioToothData[] = PERMANENT_28_TEETH_FDI.map((toothNumber) => {
				if (toothNumber === 11) {
					return {
						toothNumber,
						isPresent: true,
						sites: [
							{ probingDepthMm: 3, bleedingOnProbing: true, plaque: false },
							{ probingDepthMm: 4, bleedingOnProbing: true, plaque: true },
							{ probingDepthMm: 5, bleedingOnProbing: true, plaque: true },
							{ probingDepthMm: 3, bleedingOnProbing: false, plaque: false },
						],
					};
				}
				return { toothNumber, isPresent: true, sites: [] };
			});

			const bopPct = computeBoPPct(teeth);
			const piPct = computePlaqueIndexPct(teeth);

			// Expected: 3 bleeders out of 168 sites = (3 / 168) * 100 = 1.79%
			// NOT (3 / 4) * 100 = 75%!
			assert.equal(bopPct, 1.79);

			// Expected: 2 plaque sites out of 168 sites = (2 / 168) * 100 = 1.19%
			// NOT (2 / 4) * 100 = 50%!
			assert.equal(piPct, 1.19);

			const summary = computePerioIndices(teeth);
			assert.equal(summary.bopPct, 1.79);
			assert.equal(summary.piPct, 1.19);
			assert.equal(summary.totalMeasuredSites, 4);
		});

		it("matches DentalPin exact test case (2 teeth, 12 sites)", () => {
			// 2 present teeth -> total theoretical sites = 12
			const sampleTeeth: PerioToothData[] = [
				{
					toothNumber: 11,
					isPresent: true,
					sites: [
						{ probingDepthMm: 3, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false },
						{ probingDepthMm: 4, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: false },
						{ probingDepthMm: 5, gingivalMarginMm: 1, bleedingOnProbing: true, plaque: true },
					],
				},
				{
					toothNumber: 12,
					isPresent: true,
					sites: [
						{ probingDepthMm: 7, gingivalMarginMm: 2, bleedingOnProbing: true, plaque: true },
						{ probingDepthMm: null, gingivalMarginMm: null, bleedingOnProbing: false, plaque: false },
					],
				},
			];

			// 3 bleeders out of 12 theoretical sites -> 25%
			assert.equal(computeBoPPct(sampleTeeth), 25.0);

			// 2 plaque sites out of 12 -> 16.67%
			assert.equal(computePlaqueIndexPct(sampleTeeth), 16.67);

			// CAL sum: 3 + 5 + 6 + 9 = 23 -> 23 / 12 = 1.92 mm
			assert.equal(computeMeanCalMm(sampleTeeth), 1.92);

			// Deep pockets (>= 5 mm): tooth 11 has site 5, tooth 12 has site 7 -> 2 distinct teeth
			assert.equal(countDeepPockets(sampleTeeth, 5), 2);

			const bundle = computePerioIndices(sampleTeeth);
			assert.equal(bundle.bopPct, 25.0);
			assert.equal(bundle.piPct, 16.67);
			assert.equal(bundle.meanCalMm, 1.92);
			assert.equal(bundle.deepPocketsCount, 2);
			assert.equal(bundle.totalMeasuredSites, 4);
		});

		it("supports record/map dictionary format for sites", () => {
			const teeth: PerioToothData[] = [
				{
					toothNumber: 21,
					isPresent: true,
					sites: {
						MV: { probingDepthMm: 3, bleedingOnProbing: true, plaque: true },
						V: { probingDepthMm: 2, bleedingOnProbing: false, plaque: false },
						DV: { probingDepthMm: 4, bleedingOnProbing: true, plaque: false },
						ML: { probingDepthMm: 2, bleedingOnProbing: false, plaque: false },
						L: { probingDepthMm: 3, bleedingOnProbing: false, plaque: false },
						DL: { probingDepthMm: 3, bleedingOnProbing: false, plaque: false },
					},
				},
			];

			// 1 tooth = 6 theoretical sites
			// 2 bleeders / 6 = 33.33%
			// 1 plaque / 6 = 16.67%
			assert.equal(computeBoPPct(teeth), 33.33);
			assert.equal(computePlaqueIndexPct(teeth), 16.67);
		});
	});

	describe("4. Clinical Attachment Level (CAL = PD + GM)", () => {
		it("correctly computes CAL with positive gingival margin (recession)", () => {
			// Probing depth 4 mm + Gingival margin 3 mm recession = 7 mm CAL
			const teeth: PerioToothData[] = [
				{
					toothNumber: 11,
					isPresent: true,
					sites: [{ probingDepthMm: 4, gingivalMarginMm: 3 }],
				},
			];

			// 1 tooth = 6 sites. CAL sum = 7. Mean CAL = 7 / 6 = 1.17 mm
			assert.equal(computeMeanCalMm(teeth), 1.17);
		});

		it("correctly computes CAL with negative gingival margin (coronal/pseudopocket)", () => {
			// Probing depth 5 mm + Gingival margin -2 mm (hyperplasia) = 3 mm CAL
			const teeth: PerioToothData[] = [
				{
					toothNumber: 11,
					isPresent: true,
					sites: [{ probingDepthMm: 5, gingivalMarginMm: -2 }],
				},
			];

			// 1 tooth = 6 sites. CAL sum = 3. Mean CAL = 3 / 6 = 0.50 mm
			assert.equal(computeMeanCalMm(teeth), 0.5);
		});

		it("ignores sites missing either probingDepthMm or gingivalMarginMm", () => {
			const teeth: PerioToothData[] = [
				{
					toothNumber: 11,
					isPresent: true,
					sites: [
						{ probingDepthMm: 4, gingivalMarginMm: null },
						{ probingDepthMm: null, gingivalMarginMm: 2 },
						{ probingDepthMm: 6, gingivalMarginMm: 0 },
					],
				},
			];

			// Only the 3rd site (6 + 0 = 6) is counted. 6 / 6 = 1.0 mm
			assert.equal(computeMeanCalMm(teeth), 1.0);
		});
	});

	describe("5. Deep Pockets Count (countDeepPockets)", () => {
		it("counts distinct teeth, not individual sites", () => {
			const teeth: PerioToothData[] = [
				{
					// Tooth 11 has THREE deep sites (>= 5 mm), but counts as 1 tooth
					toothNumber: 11,
					isPresent: true,
					sites: [
						{ probingDepthMm: 5 },
						{ probingDepthMm: 6 },
						{ probingDepthMm: 7 },
					],
				},
				{
					// Tooth 12 has ONE deep site
					toothNumber: 12,
					isPresent: true,
					sites: [{ probingDepthMm: 5 }, { probingDepthMm: 3 }],
				},
				{
					// Tooth 13 has shallow pockets
					toothNumber: 13,
					isPresent: true,
					sites: [{ probingDepthMm: 4 }, { probingDepthMm: 3 }],
				},
				{
					// Tooth 14 is absent, must NOT count
					toothNumber: 14,
					isPresent: false,
					sites: [{ probingDepthMm: 8 }],
				},
			];

			assert.equal(countDeepPockets(teeth), 2);
			assert.equal(countDeepPockets(teeth, 6), 1); // Only tooth 11 has site >= 6 mm
		});
	});

	describe("6. AAP/EFP 2018 Staging Classification", () => {
		it("classifies periodontal health / gingivitis when CAL <= 0 and no deep pockets", () => {
			assert.equal(determineAapEfpStage(0, 0, 0), "health_gingivitis");
			assert.equal(determineAapEfpStage(-1, 0, 0), "health_gingivitis");
		});

		it("classifies Stage I: CAL 1-2 mm, PD <= 4 mm, 0 teeth lost", () => {
			assert.equal(determineAapEfpStage(1, 0, 0), "I");
			assert.equal(determineAapEfpStage(2, 0, 0), "I");
		});

		it("classifies Stage II: CAL 3-4 mm OR presence of deep pockets (PD >= 5 mm)", () => {
			assert.equal(determineAapEfpStage(3, 0, 0), "II");
			assert.equal(determineAapEfpStage(4, 0, 0), "II");
			// Complexity: Even if CAL is only 2 mm, a deep pocket >= 5 mm elevates to Stage II
			assert.equal(determineAapEfpStage(2, 1, 0), "II");
		});

		it("classifies Stage III: CAL >= 5 mm OR 1-4 teeth lost due to periodontitis", () => {
			assert.equal(determineAapEfpStage(5, 2, 0), "III");
			assert.equal(determineAapEfpStage(6, 4, 0), "III");
			// 2 teeth lost escalates mild CAL to Stage III
			assert.equal(determineAapEfpStage(3, 1, 2), "III");
			assert.equal(determineAapEfpStage(2, 0, 4), "III");
		});

		it("classifies Stage IV: >= 5 teeth lost due to periodontitis", () => {
			assert.equal(determineAapEfpStage(6, 5, 5), "IV");
			assert.equal(determineAapEfpStage(8, 8, 8), "IV");
			assert.equal(determineAapEfpStage(3, 1, 6), "IV");
		});

		it("derives complete summary stage in computePerioIndices", () => {
			// Severe patient with 6 missing teeth and 6 mm pocket on tooth 11
			const teeth: PerioToothData[] = PERMANENT_28_TEETH_FDI.map((toothNumber, idx) => ({
				toothNumber,
				isPresent: idx >= 6, // 6 missing teeth
				sites: toothNumber === 11 ? [{ probingDepthMm: 6, gingivalMarginMm: 1 }] : [],
			}));

			const summary = computePerioIndices(teeth);
			assert.equal(summary.presentTeethCount, 22);
			assert.equal(summary.deepPocketsCount, 1);
			assert.equal(summary.aapEfpStage, "IV");
		});
	});

	describe("7. Printable A4 Summary (Form 043/y) & Strict 0 Emojis Law (Mandate 8d item 7)", () => {
		it("generates structured Russian medical protocol without any emojis", () => {
			const summary: PerioIndicesSummary = {
				bopPct: 18.45,
				piPct: 22.02,
				meanCalMm: 2.15,
				deepPocketsCount: 3,
				presentTeethCount: 28,
				totalTheoreticalSites: 168,
				totalMeasuredSites: 168,
				aapEfpStage: "II",
			};

			const text = formatPerioIndicesA4Summary(
				summary,
				"Кузнецов Александр Сергеевич",
				"д-р Иванов П.А.",
			);

			// Must contain official medical metadata
			assert.ok(text.includes("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ"));
			assert.ok(text.includes("Форма 043/у"));
			assert.ok(text.includes("Кузнецов Александр Сергеевич"));
			assert.ok(text.includes("д-р Иванов П.А."));
			assert.ok(text.includes("18.45%"));
			assert.ok(text.includes("22.02%"));
			assert.ok(text.includes("2.15 мм"));
			assert.ok(text.includes("Стадия II"));
			assert.ok(text.includes("DENTE Dental CRM"));

			// Mandate 8d item 7 / Mandate 8p item 5: Zero Emojis!
			const emojiPattern =
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}]/u;
			assert.equal(
				emojiPattern.test(text),
				false,
				"A4 summary must not contain any cartoon emojis",
			);
		});

		it("formats healthy summary correctly", () => {
			const summary: PerioIndicesSummary = {
				bopPct: 5.0,
				piPct: 8.0,
				meanCalMm: 0,
				deepPocketsCount: 0,
				presentTeethCount: 28,
				totalTheoreticalSites: 168,
				totalMeasuredSites: 168,
				aapEfpStage: "health_gingivitis",
			};

			const text = formatPerioIndicesA4Summary(summary, "Иванова О.В.", "д-р Смирнов А.Б.");
			assert.ok(text.includes("Клинически здоровый пародонт"));
			assert.ok(text.includes("Иванова О.В."));
		});
	});

	describe("8. Zod Schema Validation Integrity", () => {
		it("validates compliant site, tooth, and summary records", () => {
			const validSite: PerioSiteData = {
				probingDepthMm: 4,
				gingivalMarginMm: 1,
				bleedingOnProbing: true,
				plaque: false,
				keratinizedGingivaMm: 3,
			};
			assert.ok(perioSiteDataSchema.parse(validSite));

			const validTooth: PerioToothData = {
				toothNumber: 11,
				isPresent: true,
				sites: [validSite],
			};
			assert.ok(perioToothDataSchema.parse(validTooth));

			const validSummary: PerioIndicesSummary = {
				bopPct: 15.5,
				piPct: 20.0,
				meanCalMm: 1.5,
				deepPocketsCount: 1,
				presentTeethCount: 28,
				totalTheoreticalSites: 168,
				totalMeasuredSites: 168,
				aapEfpStage: "I",
			};
			assert.ok(perioIndicesSummarySchema.parse(validSummary));
			assert.ok(aapEfpStageSchema.parse("III"));
		});

		it("rejects out-of-range probing depths or percentages", () => {
			assert.throws(() => perioSiteDataSchema.parse({ probingDepthMm: 25 }));
			assert.throws(() => perioSiteDataSchema.parse({ gingivalMarginMm: -10 }));
			assert.throws(() => perioIndicesSummarySchema.parse({ bopPct: 150 }));
		});
	});
});
