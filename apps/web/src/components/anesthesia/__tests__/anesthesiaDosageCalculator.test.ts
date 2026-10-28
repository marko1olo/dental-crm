/**
 * DENTE CRM — Unit Tests for Anesthesia Dosage Calculator: Adult & Pediatric MRD
 * (Минздрав РФ / СтАР / Mandates 8e, 8y, 8b <= 120 lines)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAnesthesiaSafety } from "../anesthesiaEngine";

describe("AnesthesiaDosageCalculator — Adult & Pediatric MRD", () => {
	it("1. Calculates Articaine 4% MRD correctly for 70 kg adult (7 mg/kg, max 7.2 carpules)", () => {
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

		assert.equal(result.injectedActiveMg, 68);
		assert.equal(result.injectedVolumeMl, 1.7);
		assert.equal(result.maxSafeActiveMg, 490);
		assert.equal(result.maxSafeCarpulesCount, 7.2);
		assert.equal(result.percentOfMaxDose, 14);
		assert.equal(result.safetyZone, "safe");
		assert.equal(result.isOverdose, false);
		assert.equal(result.isEpinephrineOverdose, false);
	});

	it("2. Identifies clinical overdose threshold without UI dead-ends when exceeding Articaine MRD", () => {
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

		assert.equal(result.ageCategory, "pediatric");
		assert.equal(result.maxSafeActiveMg, 100);
		assert.equal(result.maxSafeCarpulesCount, 1.4);
		assert.equal(result.isOverdose, false);

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

	it("4. Missing or zero patient weight falls back smoothly to 70 kg without throwing or blocking doctor (Mandates 8e, 8n)", () => {
		const noWeightResult = calculateAnesthesiaSafety({
			drugId: "articaine_1_100k",
			carpulesCount: 1.0,
			patientWeightKg: undefined,
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

		assert.equal(noWeightResult.maxSafeActiveMg, 490, "Default 70 kg adult must have 490 mg max dose");
		assert.equal(noWeightResult.maxSafeCarpulesCount, 7.2, "Default 70 kg adult must have 7.2 carpules max");
		assert.equal(noWeightResult.isOverdose, false);
		assert.ok(noWeightResult.diaryEntryRu.includes("Sol. Articaini"), "Must generate valid clinical diary text");
	});

	it("5. Passive allergy warnings never block doctor actions or freeze the visit (Mandates 8e, 8y)", () => {
		const allergyResult = calculateAnesthesiaSafety({
			drugId: "articaine_1_100k",
			carpulesCount: 1.0,
			patientWeightKg: 70,
			patientAgeYears: 40,
			asaStatus: "asa_1",
			hasCardiovascularRisk: false,
			hasSulfiteAllergy: true,
			hasBronchialAsthma: true,
			isPregnantOrLactating: false,
			techniqueId: "infiltration",
			needleType: "g30_short_21mm",
			aspirationNegativeConfirmed: true,
		});

		assert.ok(allergyResult.contraindicationsTriggered.length > 0, "Must contain passive contraindication alert");
		assert.ok(allergyResult.diaryEntryRu.length > 0, "Diary protocol must be formed without blocking");
	});
});
