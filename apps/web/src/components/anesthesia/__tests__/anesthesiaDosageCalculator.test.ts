/**
 * DENTE CRM — Unit Tests for Anesthesia Dosage Calculator & Safety Engine
 * (Минздрав РФ / СтАР / AHA Guidelines / Form 043/u Clinical Compliance)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAnesthesiaSafety,
	EPINEPHRINE_CEILINGS_MG,
	ASA_CLASSIFICATIONS,
} from "../anesthesiaEngine";
import { DENTAL_ANESTHETICS } from "../anesthesiaCatalog";

describe("AnesthesiaDosageCalculator — Clinical Safety & Maximum Recommended Dose (MRD)", () => {
	// ── 1. Adult Weight-Based Articaine 4% Calculations ──────────────────────
	it("1. Calculates Articaine 4% MRD correctly for 70 kg adult (7 mg/kg, max 7 carpules)", () => {
		const result = calculateAnesthesiaSafety({
			drugId: "articaine_1_100k",
			carpulesCount: 1.0,
			patientWeightKg: 70,
			patientAgeYears: 30,
			asaStatus: "asa_1",
			hasCardiovascularRisk: false,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: false,
			techniqueId: "infiltration",
			needleType: "g30_short_21mm",
			targetToothNumberFdi: 16,
			aspirationNegativeConfirmed: true,
		});

		// INVARIANTS:
		// Active substance per carpule = 68 mg (4% = 40 mg/ml * 1.7 ml)
		assert.equal(result.injectedActiveMg, 68);
		assert.equal(result.injectedVolumeMl, 1.7);
		// Max safe dose for 70 kg = 70 * 7 = 490 mg
		assert.equal(result.maxSafeActiveMg, 490);
		// Max safe carpules = Math.floor(490 / 68 * 10) / 10 = 7.2
		assert.equal(result.maxSafeCarpulesCount, 7.2);
		// 68 / 490 = 14%
		assert.equal(result.percentOfMaxDose, 14);
		assert.equal(result.safetyZone, "safe");
		assert.equal(result.isOverdose, false);
		assert.equal(result.isEpinephrineOverdose, false);
	});

	it("2. Triggers hard overdose blocking (#ef4444) when exceeding Articaine MRD", () => {
		// 8 carpules of Articaine 4% = 544 mg active substance (exceeds 490 mg limit for 70 kg)
		const result = calculateAnesthesiaSafety({
			drugId: "articaine_1_100k",
			carpulesCount: 8.0,
			patientWeightKg: 70,
			patientAgeYears: 30,
			asaStatus: "asa_1",
			hasCardiovascularRisk: false,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: false,
			techniqueId: "mandibular_torus",
			needleType: "g27_long_35mm",
			targetToothNumberFdi: 46,
			aspirationNegativeConfirmed: true,
		});

		assert.equal(result.injectedActiveMg, 544);
		assert.equal(result.isOverdose, true);
		assert.equal(result.safetyZone, "overdose_danger");
		assert.ok(result.percentOfMaxDose > 100);
	});

	// ── 2. Pediatric Weight Scaling ──────────────────────────────────────────
	it("3. Correctly scales MRD for pediatric patient (20 kg child, max 5 mg/kg)", () => {
		const result = calculateAnesthesiaSafety({
			drugId: "articaine_1_200k",
			carpulesCount: 1.0,
			patientWeightKg: 20,
			patientAgeYears: 7,
			asaStatus: "asa_1",
			hasCardiovascularRisk: false,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: false,
			techniqueId: "infiltration",
			needleType: "g30_ultrashort_12mm",
			targetToothNumberFdi: 54,
			aspirationNegativeConfirmed: true,
		});

		// Pediatric max safe dose for 20 kg = 20 * 5 = 100 mg
		assert.equal(result.ageCategory, "pediatric");
		assert.equal(result.maxSafeActiveMg, 100);
		// Max safe carpules = Math.floor(100 / 68 * 10) / 10 = 1.4 carpules
		assert.equal(result.maxSafeCarpulesCount, 1.4);
		assert.equal(result.isOverdose, false);

		// If 2 carpules are given to this 20kg child (136 mg > 100 mg), it must trigger overdose danger
		const overdosePediatric = calculateAnesthesiaSafety({
			drugId: "articaine_1_200k",
			carpulesCount: 2.0,
			patientWeightKg: 20,
			patientAgeYears: 7,
			asaStatus: "asa_1",
			hasCardiovascularRisk: false,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: false,
			techniqueId: "infiltration",
			needleType: "g30_ultrashort_12mm",
			aspirationNegativeConfirmed: true,
		});

		assert.equal(overdosePediatric.isOverdose, true);
		assert.equal(overdosePediatric.safetyZone, "overdose_danger");
	});

	// ── 3. Mepivacaine 3% Plain for Pregnancy & Hypertension ────────────────
	it("4. Calculates Mepivacaine 3% without vasoconstrictor (4.4 mg/kg, 0 epinephrine)", () => {
		const result = calculateAnesthesiaSafety({
			drugId: "mepivacaine_plain",
			carpulesCount: 2.0,
			patientWeightKg: 60,
			patientAgeYears: 28,
			asaStatus: "asa_2",
			hasCardiovascularRisk: false,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: true, // Pregnant patient
			techniqueId: "infiltration",
			needleType: "g30_short_21mm",
			targetToothNumberFdi: 24,
			aspirationNegativeConfirmed: true,
		});

		// 3% Mepivacaine = 30 mg/ml * 1.7 ml = 51 mg per carpule -> 2 carpules = 102 mg
		assert.equal(result.injectedActiveMg, 102);
		assert.equal(result.injectedEpinephrineMg, 0);
		// Max safe dose = 60 * 4.4 = 264 mg
		assert.equal(result.maxSafeActiveMg, 264);
		assert.equal(result.drug.isAdrenalineFree, true);
		assert.equal(result.safetyZone, "safe");
	});

	// ── 4. Lidocaine 2% Calculations ─────────────────────────────────────────
	it("5. Calculates Lidocaine 2% (4.4 mg/kg, max 300 mg ceiling)", () => {
		const result = calculateAnesthesiaSafety({
			drugId: "lidocaine_1_100k",
			carpulesCount: 2.0,
			patientWeightKg: 70,
			patientAgeYears: 40,
			asaStatus: "asa_1",
			hasCardiovascularRisk: false,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: false,
			techniqueId: "infiltration",
			needleType: "g30_short_21mm",
			aspirationNegativeConfirmed: true,
		});

		// 2% Lidocaine = 20 mg/ml * 1.7 ml = 34 mg per carpule -> 2 carpules = 68 mg
		assert.equal(result.injectedActiveMg, 68);
		// 70 * 4.4 = 308 mg, capped at absolute ceiling 300 mg
		assert.equal(result.maxSafeActiveMg, 300);
		assert.equal(result.safetyZone, "safe");
	});

	// ── 5. ASA III Cardio Risk & Epinephrine 0.04 mg Limit ───────────────────
	it("6. Strictly enforces Epinephrine 0.04 mg cardiac ceiling for ASA III / Cardio Risk", () => {
		// 3 carpules of Articaine 1:100 000 contains 3 * 0.017 mg = 0.051 mg Epinephrine
		const cardioResult = calculateAnesthesiaSafety({
			drugId: "articaine_1_100k",
			carpulesCount: 3.0,
			patientWeightKg: 70,
			patientAgeYears: 60,
			asaStatus: "asa_3", // Cardiac risk
			hasCardiovascularRisk: true,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: false,
			techniqueId: "infiltration",
			needleType: "g30_short_21mm",
			aspirationNegativeConfirmed: true,
		});

		// Epinephrine limit for ASA III is 0.04 mg
		assert.equal(cardioResult.maxSafeEpinephrineMg, EPINEPHRINE_CEILINGS_MG.cardiovascularRisk);
		assert.equal(cardioResult.injectedEpinephrineMg, 0.051);
		assert.equal(cardioResult.isEpinephrineOverdose, true);
		assert.equal(cardioResult.safetyZone, "overdose_danger");
	});

	// ── 6. Form 043/u Diary Formatting ───────────────────────────────────────
	it("7. Generates complete, compliant Form 043/u clinical diary record", () => {
		const result = calculateAnesthesiaSafety({
			drugId: "articaine_1_100k",
			carpulesCount: 1.0,
			patientWeightKg: 70,
			patientAgeYears: 35,
			asaStatus: "asa_1",
			hasCardiovascularRisk: false,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: false,
			techniqueId: "mandibular_torus",
			needleType: "g27_long_35mm",
			targetToothNumberFdi: 46,
			aspirationNegativeConfirmed: true,
		});

		assert.ok(result.diaryEntryRu.includes("Проведена местная"));
		assert.ok(result.diaryEntryRu.includes("анестезия"));
		assert.ok(result.diaryEntryRu.includes("1.7 мл"));
		assert.ok(result.diaryEntryRu.includes("68 мг"));
		assert.ok(result.diaryEntryRu.includes("Аспирационная проба"));
	});

	// ── 7. Mandate 8e / Section VII: Zero Weight-Input Paralysis ───────────────
	it("8. Resolves clinical default 70 kg when adult weight is missing/0, max 7.2 carpules, unblocked for 1-2 carpules", () => {
		const result = calculateAnesthesiaSafety({
			drugId: "articaine_1_100k",
			carpulesCount: 2.0, // 2 carpules standard dose
			patientWeightKg: undefined, // Weight not entered!
			patientAgeYears: 35,
			asaStatus: "asa_1",
			hasCardiovascularRisk: false,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: false,
			techniqueId: "infiltration",
			needleType: "g30_short_21mm",
			aspirationNegativeConfirmed: true,
		});

		// Uses clinical default 70 kg
		assert.equal(result.maxSafeActiveMg, 490);
		assert.equal(result.maxSafeCarpulesCount, 7.2);
		// 2 carpules = 136 mg active (< 490 mg)
		assert.equal(result.injectedActiveMg, 136);
		assert.equal(result.isOverdose, false);
		assert.equal(result.safetyZone, "safe");
		assert.equal(result.contraindicationsTriggered.length, 0);
	});

	it("9. Resolves clinical default 70 kg for Scandonest 3% when weight is missing/0 (max 5.8 carpules, capped at 300 mg)", () => {
		const result = calculateAnesthesiaSafety({
			drugId: "mepivacaine_plain",
			carpulesCount: 2.0, // 2 carpules
			patientWeightKg: 0, // Empty weight in card
			patientAgeYears: 40,
			asaStatus: "asa_1",
			hasCardiovascularRisk: false,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: false,
			techniqueId: "infiltration",
			needleType: "g30_short_21mm",
			aspirationNegativeConfirmed: true,
		});

		// 70 * 4.4 = 308 mg, capped at absolute maximum 300 mg
		assert.equal(result.maxSafeActiveMg, 300);
		// 300 / 51 = 5.8 carpules
		assert.equal(result.maxSafeCarpulesCount, 5.8);
		assert.equal(result.isOverdose, false);
		assert.equal(result.safetyZone, "safe");
	});

	it("10. Resolves pediatric age-based weight when child weight is missing, calculating safe dose without blocking", () => {
		// 7-year-old child without entered weight: standard formula 3 * age + 4 = 25 kg
		const result = calculateAnesthesiaSafety({
			drugId: "articaine_1_200k",
			carpulesCount: 1.0,
			patientWeightKg: undefined,
			patientAgeYears: 7,
			asaStatus: "asa_1",
			hasCardiovascularRisk: false,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: false,
			techniqueId: "infiltration",
			needleType: "g30_ultrashort_12mm",
			aspirationNegativeConfirmed: true,
		});

		assert.equal(result.ageCategory, "pediatric");
		// 25 kg * 5.0 mg/kg = 125 mg
		assert.equal(result.maxSafeActiveMg, 125);
		// 125 / 68 = 1.8 carpules
		assert.equal(result.maxSafeCarpulesCount, 1.8);
		assert.equal(result.isOverdose, false);
		assert.equal(result.safetyZone, "safe");
	});
});
