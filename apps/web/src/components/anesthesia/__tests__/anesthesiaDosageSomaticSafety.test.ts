/**
 * DENTE CRM — Unit Tests for Anesthesia Dosage: Somatic Safety, Mepivacaine, Lidocaine & Cardio Limits
 * (Минздрав РФ / СтАР / Mandates 8e, 8y, 8b <= 120 lines)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAnesthesiaSafety,
	EPINEPHRINE_CEILINGS_MG,
} from "../anesthesiaEngine";

describe("AnesthesiaDosageCalculator — Somatic Safety, Mepivacaine, Lidocaine & Cardio", () => {
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
			isPregnantOrLactating: true,
			techniqueId: "infiltration",
			needleType: "g30_short_21mm",
			targetToothNumberFdi: 24,
			aspirationNegativeConfirmed: true,
		});

		assert.equal(result.injectedActiveMg, 102);
		assert.equal(result.injectedEpinephrineMg, 0);
		assert.equal(result.maxSafeActiveMg, 264);
		assert.equal(result.drug.isAdrenalineFree, true);
		assert.equal(result.safetyZone, "safe");
	});

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

		assert.equal(result.injectedActiveMg, 68);
		assert.equal(result.maxSafeActiveMg, 300);
		assert.equal(result.safetyZone, "safe");
	});

	it("6. Strictly enforces Epinephrine 0.04 mg cardiac ceiling for ASA III / Cardio Risk", () => {
		const cardioResult = calculateAnesthesiaSafety({
			drugId: "articaine_1_100k",
			carpulesCount: 3.0,
			patientWeightKg: 70,
			patientAgeYears: 60,
			asaStatus: "asa_3",
			hasCardiovascularRisk: true,
			hasSulfiteAllergy: false,
			hasBronchialAsthma: false,
			isPregnantOrLactating: false,
			techniqueId: "infiltration",
			needleType: "g30_short_21mm",
			aspirationNegativeConfirmed: true,
		});

		assert.equal(cardioResult.maxSafeEpinephrineMg, EPINEPHRINE_CEILINGS_MG.cardiovascularRisk);
		assert.equal(cardioResult.injectedEpinephrineMg, 0.051);
		assert.equal(cardioResult.isEpinephrineOverdose, true);
		assert.equal(cardioResult.safetyZone, "overdose_danger");
	});
});
