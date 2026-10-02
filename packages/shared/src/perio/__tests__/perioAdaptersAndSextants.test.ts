import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	convertPerioDentitionToSepa,
	convertPerioSiteToSepaSite,
	convertPerioToothRecordToSepaTooth,
	convertSepaDentitionToPerio,
	convertSepaSiteToPerioSite,
	convertSepaToothToPerioToothRecord,
	createDefaultPerioTeeth,
	createHealthyHygieneAssessment,
	calculateSextantHygieneIndices,
	deriveSextantHygieneFromPerioTeeth,
	deriveSextantHygieneFromSepaTeeth,
	formatSextantHygieneSummary,
	mapPerioSiteKeyToSepaSiteCode,
	mapSepaSiteCodeToPerioSiteKey,
	WHO_HYGIENE_SEXTANTS,
	type PerioToothRecord,
} from "../index.js";
import {
	createHealthySepaPeriodontiumPreset,
	type SepaToothValue,
} from "../../emr/periodontogram.js";

describe("Periodontal Adapters & WHO 6-Sextant Hygiene Engine (SSOT — Mandates 8e, 8k, 8za)", () => {
	describe("1. Bidirectional Site & Key Mapping", () => {
		it("correctly maps all 6 PerioSiteKeys to SEPA site codes and vice versa", () => {
			assert.equal(mapPerioSiteKeyToSepaSiteCode("mesioBuccal"), "MV");
			assert.equal(mapPerioSiteKeyToSepaSiteCode("midBuccal"), "V");
			assert.equal(mapPerioSiteKeyToSepaSiteCode("distoBuccal"), "DV");
			assert.equal(mapPerioSiteKeyToSepaSiteCode("mesioLingual"), "ML");
			assert.equal(mapPerioSiteKeyToSepaSiteCode("midLingual"), "L");
			assert.equal(mapPerioSiteKeyToSepaSiteCode("distoLingual"), "DL");

			assert.equal(mapSepaSiteCodeToPerioSiteKey("MV"), "mesioBuccal");
			assert.equal(mapSepaSiteCodeToPerioSiteKey("V"), "midBuccal");
			assert.equal(mapSepaSiteCodeToPerioSiteKey("DV"), "distoBuccal");
			assert.equal(mapSepaSiteCodeToPerioSiteKey("ML"), "mesioLingual");
			assert.equal(mapSepaSiteCodeToPerioSiteKey("L"), "midLingual");
			assert.equal(mapSepaSiteCodeToPerioSiteKey("DL"), "distoLingual");
		});

		it("converts PerioSiteMeasurement to SepaSiteValue losslessly", () => {
			const perioSite = {
				probingDepthMm: 5,
				gingivalMarginMm: 2,
				bleedingOnProbing: true,
				plaque: true,
				suppuration: false,
				calculus: true,
				calMm: 7,
			};

			const sepaSite = convertPerioSiteToSepaSite("distoBuccal", perioSite);
			assert.equal(sepaSite.siteCode, "DV");
			assert.equal(sepaSite.probingDepthMm, 5);
			assert.equal(sepaSite.gingivalMarginMm, 2);
			assert.equal(sepaSite.bleedingOnProbing, true);
			assert.equal(sepaSite.plaque, true);
			assert.equal(sepaSite.suppuration, false);
			assert.equal(sepaSite.calculus, true);

			// Roundtrip conversion back to PerioSite
			const roundtrip = convertSepaSiteToPerioSite(sepaSite);
			assert.equal(roundtrip.key, "distoBuccal");
			assert.equal(roundtrip.measurement.probingDepthMm, 5);
			assert.equal(roundtrip.measurement.gingivalMarginMm, 2);
			assert.equal(roundtrip.measurement.calMm, 7);
			assert.equal(roundtrip.measurement.bleedingOnProbing, true);
			assert.equal(roundtrip.measurement.plaque, true);
			assert.equal(roundtrip.measurement.suppuration, false);
			assert.equal(roundtrip.measurement.calculus, true);
		});
	});

	describe("2. Full Tooth & Dentition Roundtrip (SSOT — Mandate 8za)", () => {
		it("converts PerioToothRecord with pathological pocket, furcation and mobility to SepaToothValue", () => {
			const teeth = createDefaultPerioTeeth(2);
			const tooth16 = teeth.find((t) => t.toothNumber === 16)!;
			tooth16.mobility = 2;
			tooth16.furcation = 2; // Grade II
			tooth16.isImplant = true;
			tooth16.distoBuccal = {
				probingDepthMm: 6,
				gingivalMarginMm: 1,
				bleedingOnProbing: true,
				plaque: true,
				suppuration: true,
				calculus: true,
				calMm: 7,
			};

			const sepa16 = convertPerioToothRecordToSepaTooth(tooth16);
			assert.equal(sepa16.toothNumber, 16);
			assert.equal(sepa16.isPresent, true);
			assert.equal(sepa16.isImplant, true);
			assert.equal(sepa16.mobility, 2);
			assert.equal(sepa16.furcationBuccal, "II");
			assert.equal(sepa16.furcationLingual, "II");
			assert.equal(sepa16.sites.length, 6);

			const dvSite = sepa16.sites.find((s) => s.siteCode === "DV")!;
			assert.equal(dvSite.probingDepthMm, 6);
			assert.equal(dvSite.gingivalMarginMm, 1);
			assert.equal(dvSite.bleedingOnProbing, true);
			assert.equal(dvSite.suppuration, true);

			// Convert back to PerioToothRecord
			const restored16 = convertSepaToothToPerioToothRecord(sepa16);
			assert.equal(restored16.toothNumber, 16);
			assert.equal(restored16.isMissing, false);
			assert.equal(restored16.isImplant, true);
			assert.equal(restored16.mobility, 2);
			assert.equal(restored16.furcation, 2);
			assert.equal(restored16.distoBuccal.probingDepthMm, 6);
			assert.equal(restored16.distoBuccal.gingivalMarginMm, 1);
			assert.equal(restored16.distoBuccal.calMm, 7);
			assert.equal(restored16.distoBuccal.bleedingOnProbing, true);
			assert.equal(restored16.distoBuccal.suppuration, true);
		});

		it("converts full 32-tooth dentition both ways without data drift", () => {
			const perioTeeth = createDefaultPerioTeeth(2);
			const sepaTeeth = convertPerioDentitionToSepa(perioTeeth);
			assert.equal(sepaTeeth.length, 32);

			const restoredPerioTeeth = convertSepaDentitionToPerio(sepaTeeth);
			assert.equal(restoredPerioTeeth.length, 32);

			for (let i = 0; i < 32; i++) {
				assert.equal(restoredPerioTeeth[i]!.toothNumber, perioTeeth[i]!.toothNumber);
				assert.equal(restoredPerioTeeth[i]!.isMissing, perioTeeth[i]!.isMissing);
				assert.equal(restoredPerioTeeth[i]!.midBuccal.probingDepthMm, 2);
				assert.equal(restoredPerioTeeth[i]!.midBuccal.bleedingOnProbing, false);
			}
		});

		it("converts SEPA healthy preset into PerioToothRecord seamlessly", () => {
			const sepaPreset = createHealthySepaPeriodontiumPreset();
			const perioTeeth = convertSepaDentitionToPerio(sepaPreset);
			assert.equal(perioTeeth.length, 32);

			const t11 = perioTeeth.find((t) => t.toothNumber === 11)!;
			assert.equal(t11.isMissing, false);
			assert.equal(t11.mobility, 0);
			assert.equal(t11.furcation, 0);
			assert.equal(t11.midBuccal.probingDepthMm, 1);
			assert.equal(t11.mesioBuccal.probingDepthMm, 2);
			assert.equal(t11.midBuccal.bleedingOnProbing, false);
		});
	});

	describe("3. WHO 6-Sextant Express Hygiene & Periodontal Indices", () => {
		it("defines 6 canonical WHO sextants mapped to teeth 16, 11, 26, 36, 31, 46", () => {
			assert.equal(WHO_HYGIENE_SEXTANTS.length, 6);
			assert.deepEqual(
				WHO_HYGIENE_SEXTANTS.map((s) => s.indexToothNumber),
				[16, 11, 26, 36, 31, 46],
			);
			assert.deepEqual(
				WHO_HYGIENE_SEXTANTS.map((s) => s.sextant),
				["S1", "S2", "S3", "S4", "S5", "S6"],
			);
		});

		it("calculates 100% healthy sextant indices for healthy baseline", () => {
			const healthy = createHealthyHygieneAssessment();
			const result = calculateSextantHygieneIndices(healthy);

			assert.equal(result.ohiS.totalScore, 0);
			assert.equal(result.pma.pmaPercent, 0);
			assert.equal(result.kpi.kpiScore, 0);

			for (const sKey of ["S1", "S2", "S3", "S4", "S5", "S6"] as const) {
				const sextant = result.sextants[sKey];
				assert.equal(sextant.totalOhiScore, 0);
				assert.equal(sextant.pmaScore, 0);
				assert.equal(sextant.pmaPercent, 0);
				assert.equal(sextant.isHealthy, true);
			}

			const summary = formatSextantHygieneSummary(result);
			assert.ok(summary.includes("S1(#16): OHI 0/PMA 0"));
			assert.ok(summary.includes("S6(#46): OHI 0/PMA 0"));
		});

		it("calculates localized sextant pathology without contaminating healthy sextants", () => {
			// S1 (16) has debris 2, calculus 1, PMA 2 (marginal)
			// S5 (31) has debris 1, calculus 2, PMA 1 (papillary)
			// All other sextants healthy (0)
			const assessments = {
				16: { toothNumber: 16, debrisScore: 2, calculusScore: 1, pmaScore: 2, kpiScore: 2 },
				11: { toothNumber: 11, debrisScore: 0, calculusScore: 0, pmaScore: 0, kpiScore: 0 },
				26: { toothNumber: 26, debrisScore: 0, calculusScore: 0, pmaScore: 0, kpiScore: 0 },
				36: { toothNumber: 36, debrisScore: 0, calculusScore: 0, pmaScore: 0, kpiScore: 0 },
				31: { toothNumber: 31, debrisScore: 1, calculusScore: 2, pmaScore: 1, kpiScore: 2 },
				46: { toothNumber: 46, debrisScore: 0, calculusScore: 0, pmaScore: 0, kpiScore: 0 },
			};

			const result = calculateSextantHygieneIndices(assessments);

			// S1 check
			assert.equal(result.sextants.S1.totalOhiScore, 3);
			assert.equal(result.sextants.S1.pmaScore, 2);
			assert.equal(result.sextants.S1.pmaPercent, 66.7);
			assert.equal(result.sextants.S1.isHealthy, false);

			// S5 check
			assert.equal(result.sextants.S5.totalOhiScore, 3);
			assert.equal(result.sextants.S5.pmaScore, 1);
			assert.equal(result.sextants.S5.pmaPercent, 33.3);
			assert.equal(result.sextants.S5.isHealthy, false);

			// S2, S3, S4, S6 remain 100% healthy
			assert.equal(result.sextants.S2.isHealthy, true);
			assert.equal(result.sextants.S3.isHealthy, true);
			assert.equal(result.sextants.S4.isHealthy, true);
			assert.equal(result.sextants.S6.isHealthy, true);
		});

		it("derives WHO sextants directly from PerioToothRecord and SepaToothValue dentitions", () => {
			const teeth = createDefaultPerioTeeth(2);
			// Add calculus on tooth 26 midBuccal
			const tooth26 = teeth.find((t) => t.toothNumber === 26)!;
			tooth26.midBuccal.calculus = true;
			tooth26.midBuccal.bleedingOnProbing = true;

			// Derive from PerioToothRecord[]
			const perioResult = deriveSextantHygieneFromPerioTeeth(teeth);
			assert.equal(perioResult.sextants.S3.calculusScore, 1);
			assert.equal(perioResult.sextants.S3.isHealthy, false);
			assert.equal(perioResult.sextants.S1.isHealthy, true);

			// Convert to SEPA and derive from SepaToothValue[]
			const sepaTeeth = convertPerioDentitionToSepa(teeth);
			const sepaResult = deriveSextantHygieneFromSepaTeeth(sepaTeeth);
			assert.equal(sepaResult.sextants.S3.calculusScore, 1);
			assert.equal(sepaResult.sextants.S3.isHealthy, false);
			assert.equal(sepaResult.sextants.S1.isHealthy, true);
		});
	});
});
