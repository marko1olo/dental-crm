/**
 * DENTE CRM — Unit Tests for Anesthesia Dosage: Clinical Diary Formatting & Default Weights
 * (Минздрав РФ / СтАР / Mandates 8e, 8y, 8b <= 120 lines)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAnesthesiaSafety } from "../anesthesiaEngine";

describe("AnesthesiaDosageCalculator — Clinical Diary & Default Weights", () => {
	it("7. Generates clean Latin clinical diary record without academic bureaucracy", () => {
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

		assert.ok(result.diaryEntryRu.includes("Проведена проводниковая анестезия"));
		assert.ok(result.diaryEntryRu.includes("в области зуба 46"));
		assert.ok(result.diaryEntryRu.includes("Sol. Articaini 4% cum Epinephrini 1:100 000"));
		assert.ok(result.diaryEntryRu.includes("1.7 мл (1 карпула)"));
		assert.ok(result.diaryEntryRu.includes("Осложнений нет."));
		assert.equal(result.diaryEntryRu.includes("27G"), false);
	});

	it("8. Resolves clinical default 70 kg when adult weight is missing/0, max 7.2 carpules", () => {
		const result = calculateAnesthesiaSafety({
			drugId: "articaine_1_100k",
			carpulesCount: 2.0,
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

		assert.equal(result.maxSafeActiveMg, 490);
		assert.equal(result.maxSafeCarpulesCount, 7.2);
		assert.equal(result.injectedActiveMg, 136);
		assert.equal(result.isOverdose, false);
		assert.equal(result.safetyZone, "safe");
		assert.equal(result.contraindicationsTriggered.length, 0);
	});

	it("9. Resolves clinical default 70 kg for Scandonest 3% when weight is missing/0", () => {
		const result = calculateAnesthesiaSafety({
			drugId: "mepivacaine_plain",
			carpulesCount: 2.0,
			patientWeightKg: 0,
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

		assert.equal(result.maxSafeActiveMg, 300);
		assert.equal(result.maxSafeCarpulesCount, 5.8);
		assert.equal(result.isOverdose, false);
		assert.equal(result.safetyZone, "safe");
	});

	it("10. Resolves pediatric age-based weight when child weight is missing", () => {
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
		assert.equal(result.maxSafeActiveMg, 125);
		assert.equal(result.maxSafeCarpulesCount, 1.8);
		assert.equal(result.isOverdose, false);
		assert.equal(result.safetyZone, "safe");
	});
});
