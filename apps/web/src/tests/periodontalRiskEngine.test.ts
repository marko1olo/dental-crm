import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PerioToothRecord } from "@dental/shared";
import {
	ALL_SIX_SITE_KEYS,
	calculateCAL,
	calculateFullMouth6PointMetrics,
	calculateTooth6PointMetrics,
	getPocketSeverity,
	isDeepPerioPocket,
	SIX_POINT_SITES,
} from "../components/clinical/perio/perio6PointMath";
import {
	calculateBoneLossAgeRatio,
	calculateDetailedPra,
	estimateBoneLossPercentFromTeeth,
	generatePraSummaryReport,
	resolveDiabetesCategory,
	resolveSmokingCategory,
} from "../components/clinical/perio/perioPraCalculator";

function createTestPerioTooth(
	toothNumber: number,
	defaultPd = 2,
	defaultGm = 0,
): PerioToothRecord {
	return {
		toothNumber,
		isMissing: false,
		isImplant: false,
		mobility: 0,
		furcation: 0,
		distoBuccal: { probingDepthMm: defaultPd, gingivalMarginMm: defaultGm, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		midBuccal: { probingDepthMm: defaultPd, gingivalMarginMm: defaultGm, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		mesioBuccal: { probingDepthMm: defaultPd, gingivalMarginMm: defaultGm, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		distoLingual: { probingDepthMm: defaultPd, gingivalMarginMm: defaultGm, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		midLingual: { probingDepthMm: defaultPd, gingivalMarginMm: defaultGm, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		mesioLingual: { probingDepthMm: defaultPd, gingivalMarginMm: defaultGm, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
	};
}

const ALL_32_TEETH_NUMBERS = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

describe("Periodontal 6-Point Probing & Lang-Tonetti PRA Spider-Chart Engine", () => {
	it("1. 6-point probing site configuration and severity classification", () => {
		assert.equal(SIX_POINT_SITES.length, 6);
		assert.equal(ALL_SIX_SITE_KEYS.length, 6);

		// Verify 6-point code mappings (B1, B2, B3, L1, L2, L3)
		const b1 = SIX_POINT_SITES.find((s) => s.code6Point === "B1");
		const b2 = SIX_POINT_SITES.find((s) => s.code6Point === "B2");
		const b3 = SIX_POINT_SITES.find((s) => s.code6Point === "B3");
		const l1 = SIX_POINT_SITES.find((s) => s.code6Point === "L1");
		const l2 = SIX_POINT_SITES.find((s) => s.code6Point === "L2");
		const l3 = SIX_POINT_SITES.find((s) => s.code6Point === "L3");

		assert.ok(b1 && b1.siteKey === "mesioBuccal" && b1.aspect === "buccal");
		assert.ok(b2 && b2.siteKey === "midBuccal" && b2.aspect === "buccal");
		assert.ok(b3 && b3.siteKey === "distoBuccal" && b3.aspect === "buccal");
		assert.ok(l1 && l1.siteKey === "mesioLingual" && l1.aspect === "lingual");
		assert.ok(l2 && l2.siteKey === "midLingual" && l2.aspect === "lingual");
		assert.ok(l3 && l3.siteKey === "distoLingual" && l3.aspect === "lingual");

		// Pocket depth severity
		assert.equal(getPocketSeverity(1), "normal");
		assert.equal(getPocketSeverity(3), "normal");
		assert.equal(getPocketSeverity(4), "moderate");
		assert.equal(getPocketSeverity(5), "moderate");
		assert.equal(getPocketSeverity(6), "severe");
		assert.equal(getPocketSeverity(10), "severe");

		// Deep pocket predicate (PD >= 5 mm)
		assert.equal(isDeepPerioPocket(4), false);
		assert.equal(isDeepPerioPocket(5), true);
		assert.equal(isDeepPerioPocket(7), true);
	});

	it("2. Clinical Attachment Level (CAL = PD + GM) calculations across recession and hyperplasia", () => {
		// Normal sulcus with 2mm gingival recession: CAL = 3 + 2 = 5mm
		assert.equal(calculateCAL(3, 2), 5);

		// 6mm deep pocket with 0mm margin at CEJ: CAL = 6 + 0 = 6mm
		assert.equal(calculateCAL(6, 0), 6);

		// 5mm pocket with 4mm extensive recession: CAL = 5 + 4 = 9mm
		assert.equal(calculateCAL(5, 4), 9);

		// 4mm pocket with -2mm gingival hyperplasia/edema: CAL = 4 + (-2) = 2mm
		assert.equal(calculateCAL(4, -2), 2);

		// Clamped to 0 (cannot be negative attachment level)
		assert.equal(calculateCAL(1, -4), 0);
	});

	it("3. Single tooth 6-point metrics calculation (max PD, mean PD, max CAL, flags)", () => {
		const tooth = createTestPerioTooth(16, 2, 0);
		tooth.mesioBuccal.probingDepthMm = 6;
		tooth.mesioBuccal.gingivalMarginMm = 2; // CAL = 8mm
		tooth.mesioBuccal.bleedingOnProbing = true;
		tooth.mesioBuccal.suppuration = true;
		tooth.midBuccal.probingDepthMm = 4;
		tooth.midBuccal.plaque = true;
		tooth.distoBuccal.probingDepthMm = 5;
		tooth.distoBuccal.calculus = true;
		tooth.furcation = 2;
		tooth.mobility = 1;

		const metrics = calculateTooth6PointMetrics(tooth);

		assert.equal(metrics.toothNumber, 16);
		assert.equal(metrics.isMissing, false);
		assert.equal(metrics.mobility, 1);
		assert.equal(metrics.furcation, 2);
		assert.equal(metrics.maxPdMm, 6);
		assert.equal(metrics.maxCalMm, 8);
		assert.equal(metrics.bopSitesCount, 1);
		assert.equal(metrics.suppurationSitesCount, 1);
		assert.equal(metrics.plaqueSitesCount, 1);
		assert.equal(metrics.calculusSitesCount, 1);
		assert.equal(metrics.deepPocketsCount, 2); // 6mm (MB) and 5mm (DB)
		assert.equal(metrics.moderatePocketsCount, 1); // 4mm (B)
		// Total PD sum = 6 + 4 + 5 + 2 + 2 + 2 = 21 / 6 = 3.5
		assert.equal(metrics.meanPdMm, 3.5);
	});

	it("4. Full mouth 6-point metrics aggregation (BOP %, Plaque %, Suppuration %, Calculus %)", () => {
		const teeth: PerioToothRecord[] = [
			createTestPerioTooth(11, 2, 0),
			createTestPerioTooth(12, 2, 0),
			createTestPerioTooth(21, 2, 0),
			createTestPerioTooth(22, 2, 0),
		];

		// 4 teeth * 6 sites = 24 sites
		const t0 = teeth[0]!;
		const t1 = teeth[1]!;
		const t2 = teeth[2]!;

		t0.mesioBuccal.bleedingOnProbing = true;
		t0.distoBuccal.bleedingOnProbing = true;
		t1.midBuccal.bleedingOnProbing = true;
		t2.midLingual.bleedingOnProbing = true;
		t2.mesioLingual.bleedingOnProbing = true;
		t2.distoLingual.bleedingOnProbing = true; // 6 BOP sites out of 24 -> 25.0%

		t0.midBuccal.suppuration = true;
		t1.midBuccal.suppuration = true; // 2 suppuration sites out of 24 -> 8.3%

		t0.mesioBuccal.plaque = true;
		t1.mesioBuccal.plaque = true;
		t2.mesioBuccal.plaque = true; // 3 plaque sites out of 24 -> 12.5%

		const summary = calculateFullMouth6PointMetrics(teeth);

		assert.equal(summary.activeTeethCount, 4);
		assert.equal(summary.totalSitesProbed, 24);
		assert.equal(summary.bopSitesCount, 6);
		assert.equal(summary.bopPercent, 25.0);
		assert.equal(summary.suppurationSitesCount, 2);
		assert.equal(summary.suppurationPercent, 8.3);
		assert.equal(summary.plaqueSitesCount, 3);
		assert.equal(summary.plaquePercent, 12.5);
	});

	it("5. Mobility and Furcation distribution tracking across dentition", () => {
		const teeth: PerioToothRecord[] = ALL_32_TEETH_NUMBERS.map((n) => createTestPerioTooth(n, 2, 0));

		const t16 = teeth.find((t) => t.toothNumber === 16);
		const t26 = teeth.find((t) => t.toothNumber === 26);
		const t36 = teeth.find((t) => t.toothNumber === 36);
		const t41 = teeth.find((t) => t.toothNumber === 41);

		if (t16) { t16.furcation = 1; t16.mobility = 1; }
		if (t26) { t26.furcation = 2; t26.mobility = 2; }
		if (t36) { t36.furcation = 3; t36.mobility = 3; }
		if (t41) { t41.mobility = 2; }

		const summary = calculateFullMouth6PointMetrics(teeth);

		assert.equal(summary.teethWithFurcationCount, 3);
		assert.equal(summary.furcationDistribution.class1, 1);
		assert.equal(summary.furcationDistribution.class2, 1);
		assert.equal(summary.furcationDistribution.class3, 1);
		assert.equal(summary.furcationDistribution.class4, 0);

		assert.equal(summary.teethWithMobilityCount, 4);
		assert.equal(summary.mobilityDistribution.grade1, 1);
		assert.equal(summary.mobilityDistribution.grade2, 2);
		assert.equal(summary.mobilityDistribution.grade3, 1);
	});

	it("6. Lang & Tonetti PRA Vector 1 (BOP %) threshold categorizations", () => {
		const teeth: PerioToothRecord[] = ALL_32_TEETH_NUMBERS.map((n) => createTestPerioTooth(n, 2, 0));

		// Case A: Low BOP <= 9%
		const praLow = calculateDetailedPra({ teeth });
		assert.equal(praLow.vectors.bop.riskLevel, "low");

		// Case B: Moderate BOP (10% - 25%)
		// Set BOP on 30 out of 192 sites -> 15.6%
		for (let i = 0; i < 5; i++) {
			const t = teeth[i]!;
			t.distoBuccal.bleedingOnProbing = true;
			t.midBuccal.bleedingOnProbing = true;
			t.mesioBuccal.bleedingOnProbing = true;
			t.distoLingual.bleedingOnProbing = true;
			t.midLingual.bleedingOnProbing = true;
			t.mesioLingual.bleedingOnProbing = true;
		}
		const praMod = calculateDetailedPra({ teeth });
		assert.equal(praMod.vectors.bop.riskLevel, "moderate");
		assert.ok(praMod.vectors.bop.numericValue >= 10 && praMod.vectors.bop.numericValue <= 25);

		// Case C: High BOP > 25%
		// Set BOP on 60 out of 192 sites -> 31.3%
		for (let i = 5; i < 10; i++) {
			const t = teeth[i]!;
			t.distoBuccal.bleedingOnProbing = true;
			t.midBuccal.bleedingOnProbing = true;
			t.mesioBuccal.bleedingOnProbing = true;
			t.distoLingual.bleedingOnProbing = true;
			t.midLingual.bleedingOnProbing = true;
			t.mesioLingual.bleedingOnProbing = true;
		}
		const praHigh = calculateDetailedPra({ teeth });
		assert.equal(praHigh.vectors.bop.riskLevel, "high");
		assert.ok(praHigh.vectors.bop.numericValue > 25);
	});

	it("7. Lang & Tonetti PRA Vector 2 (Residual Pockets PD >= 5mm) thresholds", () => {
		const teeth: PerioToothRecord[] = ALL_32_TEETH_NUMBERS.map((n) => createTestPerioTooth(n, 2, 0));

		// Low risk: <= 4 sites
		teeth[0]!.mesioBuccal.probingDepthMm = 5;
		teeth[1]!.mesioBuccal.probingDepthMm = 6;
		const praLow = calculateDetailedPra({ teeth });
		assert.equal(praLow.vectors.deepPockets.riskLevel, "low");
		assert.equal(praLow.vectors.deepPockets.numericValue, 2);

		// Moderate risk: 5 - 8 sites
		teeth[2]!.mesioBuccal.probingDepthMm = 5;
		teeth[3]!.mesioBuccal.probingDepthMm = 5;
		teeth[4]!.mesioBuccal.probingDepthMm = 6;
		teeth[5]!.mesioBuccal.probingDepthMm = 5;
		const praMod = calculateDetailedPra({ teeth });
		assert.equal(praMod.vectors.deepPockets.riskLevel, "moderate");
		assert.equal(praMod.vectors.deepPockets.numericValue, 6);

		// High risk: >= 9 sites
		teeth[6]!.mesioBuccal.probingDepthMm = 7;
		teeth[7]!.mesioBuccal.probingDepthMm = 5;
		teeth[8]!.mesioBuccal.probingDepthMm = 8;
		const praHigh = calculateDetailedPra({ teeth });
		assert.equal(praHigh.vectors.deepPockets.riskLevel, "high");
		assert.equal(praHigh.vectors.deepPockets.numericValue, 9);
	});

	it("8. Lang & Tonetti PRA Vector 3 (Tooth Loss / Missing count) thresholds", () => {
		const teeth: PerioToothRecord[] = ALL_32_TEETH_NUMBERS.map((n) => createTestPerioTooth(n, 2, 0));

		// Low risk: <= 4 missing teeth
		teeth[0]!.isMissing = true;
		teeth[1]!.isMissing = true;
		const praLow = calculateDetailedPra({ teeth });
		assert.equal(praLow.vectors.toothLoss.riskLevel, "low");
		assert.equal(praLow.vectors.toothLoss.numericValue, 2);

		// Moderate risk: 5 - 8 missing teeth
		for (let i = 2; i < 7; i++) {
			teeth[i]!.isMissing = true;
		}
		const praMod = calculateDetailedPra({ teeth });
		assert.equal(praMod.vectors.toothLoss.riskLevel, "moderate");
		assert.equal(praMod.vectors.toothLoss.numericValue, 7);

		// High risk: > 8 missing teeth
		for (let i = 7; i < 11; i++) {
			teeth[i]!.isMissing = true;
		}
		const praHigh = calculateDetailedPra({ teeth });
		assert.equal(praHigh.vectors.toothLoss.riskLevel, "high");
		assert.equal(praHigh.vectors.toothLoss.numericValue, 11);
	});

	it("9. Lang & Tonetti PRA Vector 4 (Bone Loss / Age ratio) calculations and AAP 2018 grading", () => {
		// BL / Age = 20% / 60 years = 0.33 (< 0.5 -> Low risk / Grade A)
		assert.equal(calculateBoneLossAgeRatio(20, 60), 0.33);

		// BL / Age = 40% / 50 years = 0.80 (0.5 - 1.0 -> Moderate risk / Grade B)
		assert.equal(calculateBoneLossAgeRatio(40, 50), 0.8);

		// BL / Age = 65% / 40 years = 1.63 (> 1.0 -> High risk / Grade C)
		assert.equal(calculateBoneLossAgeRatio(65, 40), 1.63);

		const teeth: PerioToothRecord[] = ALL_32_TEETH_NUMBERS.map((n) => createTestPerioTooth(n, 2, 0));

		const praGradeA = calculateDetailedPra({
			teeth,
			patientAgeYears: 60,
			radiographicBoneLossPercent: 20,
		});
		assert.equal(praGradeA.vectors.boneLossAgeRatio.riskLevel, "low");

		const praGradeB = calculateDetailedPra({
			teeth,
			patientAgeYears: 50,
			radiographicBoneLossPercent: 40,
		});
		assert.equal(praGradeB.vectors.boneLossAgeRatio.riskLevel, "moderate");

		const praGradeC = calculateDetailedPra({
			teeth,
			patientAgeYears: 40,
			radiographicBoneLossPercent: 65,
		});
		assert.equal(praGradeC.vectors.boneLossAgeRatio.riskLevel, "high");
	});

	it("10. Systemic Diabetes & HbA1c status resolution and risk levels", () => {
		const resNone = resolveDiabetesCategory("none");
		assert.equal(resNone.category, "none");

		const resHbA1cLow = resolveDiabetesCategory(undefined, 5.4);
		assert.equal(resHbA1cLow.category, "none");

		const resHbA1cMod = resolveDiabetesCategory(undefined, 6.7);
		assert.equal(resHbA1cMod.category, "controlled");

		const resHbA1cHigh = resolveDiabetesCategory(undefined, 8.2);
		assert.equal(resHbA1cHigh.category, "uncontrolled");

		const teeth: PerioToothRecord[] = ALL_32_TEETH_NUMBERS.map((n) => createTestPerioTooth(n, 2, 0));

		const praNone = calculateDetailedPra({ teeth, diabetesStatus: "none" });
		assert.equal(praNone.vectors.systemicDiabetes.riskLevel, "low");

		const praControlled = calculateDetailedPra({ teeth, diabetesStatus: "controlled" });
		assert.equal(praControlled.vectors.systemicDiabetes.riskLevel, "moderate");

		const praUncontrolled = calculateDetailedPra({ teeth, diabetesStatus: "uncontrolled" });
		assert.equal(praUncontrolled.vectors.systemicDiabetes.riskLevel, "high");
	});

	it("11. Environmental Smoking status & cigarettes per day resolution", () => {
		const resNonSmoker = resolveSmokingCategory("non_smoker");
		assert.equal(resNonSmoker.category, "non_smoker");

		const res0Cigs = resolveSmokingCategory(undefined, 0);
		assert.equal(res0Cigs.category, "non_smoker");

		const resLight = resolveSmokingCategory(undefined, 6);
		assert.equal(resLight.category, "light");

		const resHeavy = resolveSmokingCategory(undefined, 20);
		assert.equal(resHeavy.category, "heavy");

		const teeth: PerioToothRecord[] = ALL_32_TEETH_NUMBERS.map((n) => createTestPerioTooth(n, 2, 0));

		const praNon = calculateDetailedPra({ teeth, smokingStatus: "non_smoker" });
		assert.equal(praNon.vectors.environmentalSmoking.riskLevel, "low");

		const praLight = calculateDetailedPra({ teeth, smokingStatus: "light" });
		assert.equal(praLight.vectors.environmentalSmoking.riskLevel, "moderate");

		const praHeavy = calculateDetailedPra({ teeth, smokingStatus: "heavy" });
		assert.equal(praHeavy.vectors.environmentalSmoking.riskLevel, "high");
	});

	it("12. Overall Lang & Tonetti PRA Decision Matrix (Low, Moderate, High risk classifications)", () => {
		const teeth: PerioToothRecord[] = ALL_32_TEETH_NUMBERS.map((n) => createTestPerioTooth(n, 2, 0));

		// Low Risk Scenario: all low vectors
		const praAllLow = calculateDetailedPra({
			teeth,
			patientAgeYears: 50,
			radiographicBoneLossPercent: 10,
			smokingStatus: "non_smoker",
			diabetesStatus: "none",
		});
		assert.equal(praAllLow.overallRisk, "low");
		assert.equal(praAllLow.highRiskVectorsCount, 0);
		assert.equal(praAllLow.moderateRiskVectorsCount, 0);
		assert.equal(praAllLow.recommendedRecallIntervalMonths, 12);

		// Low Risk Scenario: 1 moderate vector (e.g. light smoker), 0 high vectors
		const pra1Mod = calculateDetailedPra({
			teeth,
			patientAgeYears: 50,
			radiographicBoneLossPercent: 10,
			smokingStatus: "light", // 1 moderate
			diabetesStatus: "none",
		});
		assert.equal(pra1Mod.overallRisk, "low");
		assert.equal(pra1Mod.moderateRiskVectorsCount, 1);
		assert.equal(pra1Mod.highRiskVectorsCount, 0);

		// Moderate Risk Scenario: 2 moderate vectors (e.g. light smoker + controlled diabetes)
		const pra2Mod = calculateDetailedPra({
			teeth,
			patientAgeYears: 50,
			radiographicBoneLossPercent: 10,
			smokingStatus: "light",
			diabetesStatus: "controlled",
		});
		assert.equal(pra2Mod.overallRisk, "moderate");
		assert.equal(pra2Mod.moderateRiskVectorsCount, 2);
		assert.equal(pra2Mod.highRiskVectorsCount, 0);
		assert.equal(pra2Mod.recommendedRecallIntervalMonths, 6);

		// Moderate Risk Scenario: 1 high vector (e.g. heavy smoker), 0 or 1 moderate
		const pra1High = calculateDetailedPra({
			teeth,
			patientAgeYears: 50,
			radiographicBoneLossPercent: 10,
			smokingStatus: "heavy", // 1 high
			diabetesStatus: "none",
		});
		assert.equal(pra1High.overallRisk, "moderate");
		assert.equal(pra1High.highRiskVectorsCount, 1);
		assert.equal(pra1High.recommendedRecallIntervalMonths, 6);

		// High Risk Scenario: >= 2 high vectors (heavy smoker + uncontrolled diabetes)
		const pra2High = calculateDetailedPra({
			teeth,
			patientAgeYears: 40,
			radiographicBoneLossPercent: 15,
			smokingStatus: "heavy", // High 1
			diabetesStatus: "uncontrolled", // High 2
		});
		assert.equal(pra2High.overallRisk, "high");
		assert.equal(pra2High.highRiskVectorsCount, 2);
		assert.equal(pra2High.recommendedRecallIntervalMonths, 3);
	});

	it("13. Spider Radar Polygon geometry and coordinate generation", () => {
		const teeth: PerioToothRecord[] = ALL_32_TEETH_NUMBERS.map((n) => createTestPerioTooth(n, 2, 0));
		const pra = calculateDetailedPra({
			teeth,
			patientAgeYears: 45,
			smokingStatus: "light",
			diabetesStatus: "none",
		});

		assert.equal(pra.radarCoordinates.length, 6);
		assert.ok(pra.radarPolygonPoints.length > 0);

		// Verify 6 points formatting: "x,y x,y x,y x,y x,y x,y"
		const pointPairs = pra.radarPolygonPoints.split(" ");
		assert.equal(pointPairs.length, 6);
		for (const p of pointPairs) {
			const [x, y] = p.split(",").map(Number);
			assert.ok(typeof x === "number" && !isNaN(x));
			assert.ok(typeof y === "number" && !isNaN(y));
			// Coordinates stay within reasonable SVG bounding box (0..320)
			assert.ok(x >= 20 && x <= 300);
			assert.ok(y >= 20 && y <= 300);
		}

		// Verify concentric zone rings exist
		assert.ok(pra.zonePolygonRings.lowZonePoints.length > 0);
		assert.ok(pra.zonePolygonRings.moderateZonePoints.length > 0);
		assert.ok(pra.zonePolygonRings.highZonePoints.length > 0);
	});

	it("14. Automatic radiographic bone loss estimation from maximum CAL site", () => {
		const teeth: PerioToothRecord[] = ALL_32_TEETH_NUMBERS.map((n) => createTestPerioTooth(n, 2, 0));

		// Healthy: Max CAL = 2mm -> 2/12 = 17%
		const estHealthy = estimateBoneLossPercentFromTeeth(teeth);
		assert.equal(estHealthy, 17);

		// Deep pocket with recession: PD = 7mm, GM = 2mm -> CAL = 9mm -> 9/12 = 75%
		teeth[0]!.distoBuccal.probingDepthMm = 7;
		teeth[0]!.distoBuccal.gingivalMarginMm = 2;
		const estSevere = estimateBoneLossPercentFromTeeth(teeth);
		assert.equal(estSevere, 75);
	});

	it("15. Form 043/u clinical PRA summary report text generation", () => {
		const teeth: PerioToothRecord[] = ALL_32_TEETH_NUMBERS.map((n) => createTestPerioTooth(n, 2, 0));
		teeth[0]!.mesioBuccal.probingDepthMm = 6;
		teeth[0]!.mesioBuccal.bleedingOnProbing = true;

		const pra = calculateDetailedPra({
			teeth,
			patientAgeYears: 52,
			smokingStatus: "light",
			diabetesStatus: "controlled",
		});

		const report = generatePraSummaryReport(pra, "Иванов И.И.");

		assert.ok(report.includes("ОЦЕНКА ПАРОДОНТОЛОГИЧЕСКОГО ПРОФИЛЯ РИСКА"));
		assert.ok(report.includes("Пациент: Иванов И.И."));
		assert.ok(report.includes("Интегральный уровень риска:"));
		assert.ok(report.includes("1. Кровоточивость (BOP %):"));
		assert.ok(report.includes("2. Глубокие карманы (≥ 5 мм):"));
		assert.ok(report.includes("3. Утрата зубов:"));
		assert.ok(report.includes("4. Резорбция кости / Возраст:"));
		assert.ok(report.includes("5. Сахарный диабет (HbA1c):"));
		assert.ok(report.includes("6. Курение:"));
		assert.ok(report.includes("Баланс векторов:"));
	});

	it("16. Graceful handling of edentulous and fully missing teeth dentitions", () => {
		const emptyTeeth: PerioToothRecord[] = [];
		const metricsEmpty = calculateFullMouth6PointMetrics(emptyTeeth);
		assert.equal(metricsEmpty.activeTeethCount, 0);
		assert.equal(metricsEmpty.totalSitesProbed, 0);
		assert.equal(metricsEmpty.bopPercent, 0);

		const praEmpty = calculateDetailedPra({ teeth: emptyTeeth });
		assert.ok(praEmpty.radarCoordinates.length === 6);
		assert.ok(!isNaN(praEmpty.radarCoordinates[0]!.x));
	});
});
