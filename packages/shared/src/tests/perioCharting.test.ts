import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_PERIO_TEETH,
	calculateAapEfpStagingAndGrading,
	calculateBoneLossAgeRatio,
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	calculatePsrSextants,
	derivePeriodontalDiagnosis,
	estimateBoneLossPercentFromTeeth,
	formatPsrSextantsSummary,
	FURCATION_GRADES,
	generateComprehensivePerio043Text,
	generateFullMouthProbingSequence,
	getProbingDepthColor,
	isFurcationEligibleTooth,
	MOBILITY_GRADES,
	PERIO_LOWER_ARCH_TEETH,
	PERIO_SITE_KEYS,
	PERIO_SITES_CONFIG,
	PERIO_UPPER_ARCH_TEETH,
	perioChartDataSchema,
	perioChartSummarySchema,
	type PerioToothRecord,
} from "../index.js";

function createDefaultTooth(toothNumber: number): PerioToothRecord {
	return {
		toothNumber,
		isMissing: false,
		isImplant: false,
		mobility: 0,
		furcation: 0,
		distoBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		midBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		mesioBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		distoLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		midLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		mesioLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
	};
}

describe("Periodontal Charting & AAP/EFP 2018 Engine (packages/shared)", () => {
	it("1. 6-point probing sites configuration and color thresholds", () => {
		assert.equal(PERIO_SITES_CONFIG.length, 6);
		assert.equal(PERIO_SITE_KEYS.length, 6);
		assert.deepEqual(PERIO_SITE_KEYS, [
			"distoBuccal",
			"midBuccal",
			"mesioBuccal",
			"distoLingual",
			"midLingual",
			"mesioLingual",
		]);

		// Color indicators: 1-3mm (normal), 4-5mm (moderate), >=6mm (deep/severe)
		const c1 = getProbingDepthColor(2);
		assert.equal(c1.isDeep, false);
		assert.ok(c1.labelRu.includes("Норма"));

		const c2 = getProbingDepthColor(5);
		assert.equal(c2.isDeep, false);
		assert.ok(c2.labelRu.includes("Умеренный"));

		const c3 = getProbingDepthColor(7);
		assert.equal(c3.isDeep, true);
		assert.ok(c3.labelRu.includes("Глубокий"));
	});

	it("2. Clinical Attachment Level (CAL = PD + GM) calculations across anatomical states", () => {
		// Normal gingival margin at CEJ (GM = 0)
		assert.equal(calculateClinicalAttachmentLevel(3, 0), 3);

		// Gingival recession (positive GM): CAL = PD + GM (e.g. PD=4mm + GM=+3mm recession = 7mm attachment loss)
		assert.equal(calculateClinicalAttachmentLevel(4, 3), 7);
		assert.equal(calculateClinicalAttachmentLevel(6, 4), 10);

		// Gingival enlargement / Hyperplasia / False pocket (negative GM): CAL = max(0, PD + GM)
		// e.g. PD=5mm with 3mm false pocket overgrowth (GM = -3) -> true CAL is only 2mm
		assert.equal(calculateClinicalAttachmentLevel(5, -3), 2);
		// Hyperplasia exceeding pocket depth does not give negative attachment loss
		assert.equal(calculateClinicalAttachmentLevel(2, -4), 0);

		// Edge-case resilience
		assert.equal(calculateClinicalAttachmentLevel(NaN, 0), 0);
		assert.equal(calculateClinicalAttachmentLevel(-5, 2), 2);
	});

	it("3. Bleeding on Probing (BOP / FMBS%) and Plaque (FMPS%) aggregate indices", () => {
		const teeth: PerioToothRecord[] = [createDefaultTooth(11), createDefaultTooth(12)];
		// 2 teeth * 6 sites = 12 sites total
		// Mark 3 sites with BOP -> 3 / 12 = 25.0%
		teeth[0]!.distoBuccal.bleedingOnProbing = true;
		teeth[0]!.midBuccal.bleedingOnProbing = true;
		teeth[0]!.mesioBuccal.bleedingOnProbing = true;

		// Mark 6 sites with Plaque -> 6 / 12 = 50.0%
		teeth[0]!.distoBuccal.plaque = true;
		teeth[0]!.midBuccal.plaque = true;
		teeth[0]!.mesioBuccal.plaque = true;
		teeth[1]!.distoBuccal.plaque = true;
		teeth[1]!.midBuccal.plaque = true;
		teeth[1]!.mesioBuccal.plaque = true;

		const summary = calculatePerioIndices(teeth);
		assert.equal(summary.totalTeethExamined, 2);
		assert.equal(summary.totalSitesProbed, 12);
		assert.equal(summary.fmbsPercent, 25.0);
		assert.equal(summary.fmpsPercent, 50.0);
	});

	it("4. Suppuration and Calculus active inflammation counting", () => {
		const teeth: PerioToothRecord[] = [createDefaultTooth(21), createDefaultTooth(22)];
		teeth[0]!.midBuccal.suppuration = true;
		teeth[0]!.distoLingual.suppuration = true;
		teeth[1]!.mesioBuccal.calculus = true;

		const summary = calculatePerioIndices(teeth);
		assert.equal(summary.sitesWithSuppurationCount, 2);
		assert.equal(summary.sitesWithCalculusCount, 1);
	});

	it("5. Multi-rooted tooth detection (isMultiRootedTooth) across all quadrants", () => {
		// Upper molars (16, 17, 18, 26, 27, 28) - 3 roots (trifurcation)
		assert.equal(isFurcationEligibleTooth(16), true);
		assert.equal(isFurcationEligibleTooth(17), true);
		assert.equal(isFurcationEligibleTooth(18), true);
		assert.equal(isFurcationEligibleTooth(26), true);
		assert.equal(isFurcationEligibleTooth(27), true);
		assert.equal(isFurcationEligibleTooth(28), true);

		// Upper first premolars (14, 24) - 2 roots (bifurcation)
		assert.equal(isFurcationEligibleTooth(14), true);
		assert.equal(isFurcationEligibleTooth(24), true);

		// Lower molars (36, 37, 38, 46, 47, 48) - 2 roots (bifurcation)
		assert.equal(isFurcationEligibleTooth(36), true);
		assert.equal(isFurcationEligibleTooth(37), true);
		assert.equal(isFurcationEligibleTooth(46), true);
		assert.equal(isFurcationEligibleTooth(47), true);

		// Single-rooted incisors, canines, and lower premolars
		assert.equal(isFurcationEligibleTooth(11), false);
		assert.equal(isFurcationEligibleTooth(21), false);
		assert.equal(isFurcationEligibleTooth(13), false);
		assert.equal(isFurcationEligibleTooth(43), false);
		assert.equal(isFurcationEligibleTooth(44), false);
		assert.equal(isFurcationEligibleTooth(45), false);
	});

	it("6. Furcation involvement grading (Hamp & Glickman I..IV) and Miller mobility (0..III)", () => {
		assert.equal(FURCATION_GRADES[0]!.codeRu, "0");
		assert.equal(FURCATION_GRADES[1]!.codeRu, "I");
		assert.equal(FURCATION_GRADES[2]!.codeRu, "II");
		assert.equal(FURCATION_GRADES[3]!.codeRu, "III");
		assert.equal(FURCATION_GRADES[4]!.codeRu, "IV");

		assert.equal(MOBILITY_GRADES[0]!.codeRu, "0");
		assert.equal(MOBILITY_GRADES[1]!.codeRu, "I");
		assert.equal(MOBILITY_GRADES[2]!.codeRu, "II");
		assert.equal(MOBILITY_GRADES[3]!.codeRu, "III");

		const tooth = createDefaultTooth(16);
		tooth.furcation = 2; // Class II furcation
		tooth.mobility = 1;  // Degree I mobility

		const summary = calculatePerioIndices([tooth]);
		assert.equal(summary.teethWithFurcationCount, 1);
		assert.equal(summary.teethWithMobilityCount, 1);
	});

	it("7. Continuous anatomical full mouth probing sequence (Florida probe)", () => {
		const teeth: PerioToothRecord[] = ALL_PERIO_TEETH.map(createDefaultTooth);
		// Mark tooth #12 as missing
		const t12 = teeth.find((t) => t.toothNumber === 12);
		if (t12) t12.isMissing = true;

		const seq = generateFullMouthProbingSequence(teeth);
		assert.ok(seq.length > 0);

		// Missing tooth 12 must not appear in probing sequence
		const has12 = seq.some((s) => s.toothNumber === 12);
		assert.equal(has12, false);

		// Sequence starts with upper right molar buccal
		assert.equal(seq[0]!.toothNumber, 18);
		assert.equal(seq[0]!.siteKey, "distoBuccal");
		assert.equal(seq[0]!.arch, "upper");
		assert.equal(seq[0]!.aspect, "buccal");
	});

	it("8. AAP/EFP 2018 Staging & Grading: Health vs Gingivitis vs Stage I..IV", () => {
		const fullDentition = ALL_PERIO_TEETH.map(createDefaultTooth);

		// 1) Healthy Intact Periodontium (BOP <= 10%, PD <= 3mm, CAL = 0)
		const diagHealth = calculateAapEfpStagingAndGrading(fullDentition);
		assert.equal(diagHealth.severity, "intact");
		assert.equal(diagHealth.icd10Code, "Z01.2");
		assert.equal(diagHealth.aapStage, "health");

		// 2) Biofilm-induced Gingivitis (BOP > 10%, PD <= 3mm, CAL = 0)
		const gingivitisDentition = ALL_PERIO_TEETH.map(createDefaultTooth);
		for (let i = 0; i < 10; i++) {
			gingivitisDentition[i]!.distoBuccal.bleedingOnProbing = true;
			gingivitisDentition[i]!.midBuccal.bleedingOnProbing = true;
		}
		const diagGingivitis = calculateAapEfpStagingAndGrading(gingivitisDentition);
		assert.equal(diagGingivitis.severity, "gingivitis");
		assert.equal(diagGingivitis.icd10Code, "K05.1");
		assert.equal(diagGingivitis.aapStage, "gingivitis");

		// 3) Moderate Periodontitis (Stage II: CAL 3-4mm, PD 4-5mm)
		const stage2Dentition = ALL_PERIO_TEETH.map(createDefaultTooth);
		for (let i = 0; i < 12; i++) {
			stage2Dentition[i]!.distoBuccal.probingDepthMm = 4;
			stage2Dentition[i]!.distoBuccal.gingivalMarginMm = 0;
			stage2Dentition[i]!.distoBuccal.bleedingOnProbing = true;
		}
		const diagStage2 = calculateAapEfpStagingAndGrading(stage2Dentition, undefined, {
			patientAgeYears: 50,
			smokingStatus: "light",
		});
		assert.equal(diagStage2.severity, "moderate");
		assert.equal(diagStage2.aapStage, "stage_2");
		assert.equal(diagStage2.isGeneralized, true);
		assert.equal(diagStage2.icd10Code, "K05.32");

		// 4) Severe Periodontitis with Suppuration (Stage III / IV, Grade C)
		const stage3Dentition = ALL_PERIO_TEETH.map(createDefaultTooth);
		for (let i = 0; i < 15; i++) {
			stage3Dentition[i]!.distoBuccal.probingDepthMm = 7;
			stage3Dentition[i]!.distoBuccal.gingivalMarginMm = 2; // CAL = 9mm
			stage3Dentition[i]!.distoBuccal.bleedingOnProbing = true;
			stage3Dentition[i]!.distoBuccal.suppuration = true;
		}
		stage3Dentition[0]!.furcation = 3; // Class III furcation
		stage3Dentition[1]!.mobility = 2;  // Degree II mobility

		const diagStage3 = calculateAapEfpStagingAndGrading(stage3Dentition, undefined, {
			patientAgeYears: 40,
			radiographicBoneLossPercent: 55, // BL/Age = 55 / 40 = 1.38 -> Grade C
			smokingStatus: "heavy",
			diabetesStatus: "uncontrolled",
		});
		assert.equal(diagStage3.severity, "severe");
		assert.equal(diagStage3.aapStage, "stage_3");
		assert.equal(diagStage3.aapGrade, "grade_c");
		assert.equal(diagStage3.hasSuppuration, true);
		assert.equal(diagStage3.icd10Code, "K05.33");
	});

	it("10. WHO 6-Sextant PSR / CPITN Screening calculations", () => {
		const teeth = ALL_PERIO_TEETH.map(createDefaultTooth);
		// Sextant S1 (teeth 17-14): give tooth 16 a 6mm pocket with furcation
		const t16 = teeth.find((t) => t.toothNumber === 16);
		if (t16) {
			t16.distoBuccal.probingDepthMm = 6;
			t16.furcation = 2;
		}

		const psr = calculatePsrSextants(teeth);
		assert.equal(psr.S1!.code, 4);
		assert.equal(psr.S1!.asterisk, true);
		assert.equal(psr.S2!.code, 0);

		const summaryStr = formatPsrSextantsSummary(psr);
		assert.ok(summaryStr.includes("S1: 4*"));
		assert.ok(summaryStr.includes("S2: 0"));
	});

	it("11. Form 043/u clinical protocol text generation with AAP/EFP & PRA", () => {
		const teeth = ALL_PERIO_TEETH.map(createDefaultTooth);
		const t16 = teeth.find((t) => t.toothNumber === 16);
		if (t16) {
			t16.distoBuccal.probingDepthMm = 5;
			t16.distoBuccal.bleedingOnProbing = true;
		}

		const text = generateComprehensivePerio043Text(teeth, undefined, {
			doctorName: "Д-р Иванов А.С.",
			customNotes: "SRP в области 1.6",
		});

		assert.ok(text.includes("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ"));
		assert.ok(text.includes("Д-р Иванов А.С."));
		assert.ok(text.includes("PSR/CPITN"));
		assert.ok(text.includes("Florida Probe"));
		assert.ok(text.includes("Оценка риска пародонтита"));
		assert.ok(text.includes("SRP в области 1.6"));
	});

	it("12. Zod Schema validation for PerioChartData and Summary", () => {
		const teeth = [createDefaultTooth(11)];
		const summary = calculatePerioIndices(teeth);

		const validSummary = perioChartSummarySchema.safeParse(summary);
		assert.equal(validSummary.success, true);

		const validChart = perioChartDataSchema.safeParse({
			id: "a0000000-0000-0000-0000-000000000001",
			organizationId: "b0000000-0000-0000-0000-000000000002",
			patientId: "c0000000-0000-0000-0000-000000000003",
			chartDate: new Date().toISOString(),
			teeth,
			summary,
			praRisk: "low",
		});
		assert.equal(validChart.success, true);
	});
});
