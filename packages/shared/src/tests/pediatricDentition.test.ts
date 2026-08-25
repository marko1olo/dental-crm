import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_MIXED_DENTITION_TEETH,
	ALL_PRIMARY_TEETH,
	calculateCariogramRisk,
	calculateEruptionTimelineByAge,
	calculatePediatricAnestheticSafety,
	generatePediatricCariogramDiaryText,
	isPrimaryTooth,
	MIXED_DENTITION_BOTTOM,
	MIXED_DENTITION_TOP,
	PEDIATRIC_ANESTHETIC_DOSAGE_LIMITS,
	PERMANENT_TO_PRIMARY_PREDECESSOR_MAP,
	PRIMARY_LOWER_TEETH,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	PRIMARY_UPPER_TEETH,
	primaryToothNumberSchema,
	RESORPTION_STAGE_DEFINITIONS,
	type ResorptionStagePercent,
} from "../index.js";

describe("Pediatric & Mixed Dentition Engine (packages/shared)", () => {
	it("1. FDI Primary dentition tooth numbering and validation (51..85)", () => {
		assert.equal(ALL_PRIMARY_TEETH.length, 20);
		assert.equal(PRIMARY_UPPER_TEETH.length, 10);
		assert.equal(PRIMARY_LOWER_TEETH.length, 10);

		// Upper right 55..51
		assert.ok(isPrimaryTooth(51));
		assert.ok(isPrimaryTooth(55));

		// Upper left 61..65
		assert.ok(isPrimaryTooth(61));
		assert.ok(isPrimaryTooth(65));

		// Lower left 71..75
		assert.ok(isPrimaryTooth(71));
		assert.ok(isPrimaryTooth(75));

		// Lower right 81..85
		assert.ok(isPrimaryTooth(81));
		assert.ok(isPrimaryTooth(85));

		// Permanent teeth are not primary
		assert.equal(isPrimaryTooth(11), false);
		assert.equal(isPrimaryTooth(16), false);
		assert.equal(isPrimaryTooth(36), false);
		assert.equal(isPrimaryTooth(48), false);

		// Schema validation
		assert.equal(primaryToothNumberSchema.safeParse(51).success, true);
		assert.equal(primaryToothNumberSchema.safeParse(85).success, true);
		assert.equal(primaryToothNumberSchema.safeParse(11).success, false);
		assert.equal(primaryToothNumberSchema.safeParse(99).success, false);
	});

	it("2. Primary to Permanent Successor and Predecessor Map accuracy", () => {
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[51], 11);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[52], 12);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[53], 13);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[54], 14);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[55], 15);

		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[61], 21);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[65], 25);

		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[71], 31);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[75], 35);

		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[81], 41);
		assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[85], 45);

		assert.equal(PERMANENT_TO_PRIMARY_PREDECESSOR_MAP[11], 51);
		assert.equal(PERMANENT_TO_PRIMARY_PREDECESSOR_MAP[15], 55);
		assert.equal(PERMANENT_TO_PRIMARY_PREDECESSOR_MAP[45], 85);
	});

	it("3. Mixed Dentition Arch Presets (6..12 years)", () => {
		assert.equal(MIXED_DENTITION_TOP.length, 12);
		assert.equal(MIXED_DENTITION_BOTTOM.length, 12);
		assert.equal(ALL_MIXED_DENTITION_TEETH.length, 24);

		// Top arch includes permanent 16 and 26
		assert.ok(MIXED_DENTITION_TOP.includes(16));
		assert.ok(MIXED_DENTITION_TOP.includes(26));
		assert.ok(MIXED_DENTITION_TOP.includes(51));

		// Bottom arch includes permanent 46 and 36
		assert.ok(MIXED_DENTITION_BOTTOM.includes(46));
		assert.ok(MIXED_DENTITION_BOTTOM.includes(36));
		assert.ok(MIXED_DENTITION_BOTTOM.includes(81));
	});

	it("4. Physiological Root Resorption stage definitions (0%, 25%, 50%, 75%, 100%)", () => {
		const stages: ResorptionStagePercent[] = [0, 25, 50, 75, 100];
		for (const stage of stages) {
			const def = RESORPTION_STAGE_DEFINITIONS[stage];
			assert.ok(def);
			assert.equal(def.stage, stage);
			assert.ok(def.nameRu.length > 0);
			assert.ok(def.clinicalSignRu.length > 0);
		}

		// Stage 0: 100% root length remaining, mobility degree 0
		assert.equal(RESORPTION_STAGE_DEFINITIONS[0].rootLengthRemainingRatio, 1.0);
		assert.equal(RESORPTION_STAGE_DEFINITIONS[0].expectedMobilityDegree, 0);

		// Stage 100: Complete resorption, ready for exfoliation
		assert.equal(RESORPTION_STAGE_DEFINITIONS[100].rootLengthRemainingRatio, 0.0);
		assert.ok(RESORPTION_STAGE_DEFINITIONS[100].expectedMobilityDegree >= 2);
	});

	it("5. Mixed Dentition Age-based Progression Calculator (calculateEruptionTimelineByAge)", () => {
		// Age 5.0: Primary dentition stage
		const primary5 = calculateEruptionTimelineByAge(5.0);
		assert.equal(primary5.stageCategory, "primary");
		assert.ok(primary5.stageNameRu.includes("Временный прикус"));

		// Age 7.0: Early mixed stage (1st molars 16, 26, 36, 46 and lower central incisors 31, 41)
		const mixed7 = calculateEruptionTimelineByAge(7.0);
		assert.equal(mixed7.stageCategory, "early_mixed");
		assert.ok(mixed7.expectedUpperArchTeeth.includes(16));
		assert.ok(mixed7.expectedLowerArchTeeth.includes(36));
		assert.ok(mixed7.clinicalAlerts.length > 0);

		// Age 9.5: Intermediate mixed stage
		const mixed9 = calculateEruptionTimelineByAge(9.5);
		assert.equal(mixed9.stageCategory, "intermediate_mixed");

		// Age 11.5: Late mixed stage (canines and premolars erupting)
		const mixed11 = calculateEruptionTimelineByAge(11.5);
		assert.equal(mixed11.stageCategory, "late_mixed");

		// Age 14.0: Permanent dentition
		const perm14 = calculateEruptionTimelineByAge(14.0);
		assert.equal(perm14.stageCategory, "permanent");
	});

	it("6. Douglas Bratthall Cariogram Multi-Factor Risk Assessment (calculateCariogramRisk)", () => {
		// High risk profile: high sugar diet, heavy plaque, no fluoride, past caries
		const highRisk = calculateCariogramRisk({
			dietContents: 3,
			dietFrequency: 3,
			plaqueAmount: 3,
			streptococcusMutans: 3,
			fluorideProgram: 3,
			pastCariesExperience: 3,
		});

		assert.ok(highRisk.chanceOfAvoidingCariesPercent < 40);
		assert.ok(highRisk.riskCategory === "high" || highRisk.riskCategory === "very_high");
		assert.ok(highRisk.preventiveProgram.professionalHygieneRu.length > 0);
		assert.ok(highRisk.sectors.dietSectorPercent > 0);
		assert.ok(highRisk.sectors.bacteriaSectorPercent > 0);

		// Low risk profile: excellent hygiene, fluoridated toothpaste, low sugar
		const lowRisk = calculateCariogramRisk({
			dietContents: 0,
			dietFrequency: 0,
			plaqueAmount: 0,
			streptococcusMutans: 0,
			fluorideProgram: 0,
			pastCariesExperience: 0,
			salivaSecretionRate: 0,
			salivaBufferCapacity: 0,
			systemicDiseases: 0,
			clinicalJudgment: 0,
		});

		assert.ok(lowRisk.chanceOfAvoidingCariesPercent >= 80);
		assert.ok(lowRisk.riskCategory === "very_low" || lowRisk.riskCategory === "low");
	});

	it("7. Form 043/u Pediatric Clinical Protocol and Cariogram diary text generation", () => {
		const diary = generatePediatricCariogramDiaryText({
			patientAgeYears: 7.5,
			resorptionStages: {
				71: 75, // Tooth 71 ready to exfoliate
				81: 75, // Tooth 81 ready to exfoliate
				54: 25, // Early resorption
			},
			customNotes: "Проведена герметизация фиссур 1.6 и 2.6.",
		});

		assert.ok(diary.includes("ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА"));
		assert.ok(diary.includes("Хронологический возраст: 7.5"));
		assert.ok(diary.includes("Зуб #71: резорбция 75%"));
		assert.ok(diary.includes("Кариограмме"));
		assert.ok(diary.includes("Проведена герметизация"));
	});

	it("8. Pediatric Anesthesiology Dosage Limits (Articaine 4% max 5.0 mg/kg & Epinephrine 1:200,000)", () => {
		// 1. Normal safe dose for a 7-year-old child weighing 25 kg (Limit: 25 * 5.0 = 125 mg)
		const safeChild = calculatePediatricAnestheticSafety({
			drugType: "articaine4Percent",
			patientAgeYears: 7,
			patientWeightKg: 25,
			carpulesAdministered: 1, // 68 mg
		});

		assert.equal(safeChild.isSafe, true);
		assert.equal(safeChild.isOverdose, false);
		assert.equal(safeChild.isAgeContraindicated, false);
		assert.equal(safeChild.mrdPerKgMg, 5.0);
		assert.equal(safeChild.maxAllowedTotalDoseMg, 125.0);
		assert.equal(safeChild.totalDoseAdministeredMg, 68.0);
		assert.equal(safeChild.vasoconstrictorRatio, "1:200000");
		assert.ok(safeChild.totalEpinephrineAdministeredMg > 0 && safeChild.totalEpinephrineAdministeredMg < 0.01);
		assert.equal(safeChild.maxSafeCarpulesCount, 1.84); // 125 / 68 = 1.84 carpules

		// 2. Overdose detection (3 carpules = 204 mg > 125 mg limit)
		const overdoseChild = calculatePediatricAnestheticSafety({
			drugType: "articaine4Percent",
			patientAgeYears: 7,
			patientWeightKg: 25,
			carpulesAdministered: 3, // 204 mg
		});

		assert.equal(overdoseChild.isSafe, false);
		assert.equal(overdoseChild.isOverdose, true);
		assert.ok(overdoseChild.safetyWarningsRu.some((w) => w.includes("ПРЕВЫШЕНА МАКСИМАЛЬНАЯ ДОЗА")));

		// 3. Age contraindication (< 4 years of age for Articaine)
		const toddlerContraindicated = calculatePediatricAnestheticSafety({
			drugType: "articaine4Percent",
			patientAgeYears: 3,
			patientWeightKg: 14,
			carpulesAdministered: 0.5,
		});

		assert.equal(toddlerContraindicated.isSafe, false);
		assert.equal(toddlerContraindicated.isAgeContraindicated, true);
		assert.ok(toddlerContraindicated.safetyWarningsRu.some((w) => w.includes("противопоказан детям в возрасте до 4 лет")));

		// 4. Mepivacaine 3% without vasoconstrictor (4.4 mg/kg)
		const mepivacaineChild = calculatePediatricAnestheticSafety({
			drugType: "mepivacaine3Percent",
			patientAgeYears: 6,
			patientWeightKg: 20,
			carpulesAdministered: 1, // 54 mg, limit 20 * 4.4 = 88 mg
		});

		assert.equal(mepivacaineChild.isSafe, true);
		assert.equal(mepivacaineChild.vasoconstrictorRatio, "none");
		assert.equal(mepivacaineChild.totalEpinephrineAdministeredMg, 0);
		assert.equal(mepivacaineChild.maxAllowedTotalDoseMg, 88.0);
	});
});
