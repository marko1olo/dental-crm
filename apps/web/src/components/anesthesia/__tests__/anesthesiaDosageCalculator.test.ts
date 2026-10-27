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
});
