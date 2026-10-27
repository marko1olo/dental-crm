import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateComprehensiveAnesthesiaSafety as calculateAnesthesiaSafety } from "@dental/shared";

/**
 * Epinephrine Cardiovascular Gating (0.04 mg Ceiling)
 * Mandate 8b <= 120 lines.
 */

describe("shared anesthesia safety — 3. Epinephrine Cardiovascular Gating (0.04 mg Ceiling)", () => {
	it("enforces 0.04 mg limit for hypertension and ASA III patients", () => {
		const cardioSafe = calculateAnesthesiaSafety({
			drugId: "articaine_4_epi_100k",
			patientWeightKg: 70,
			carpulesCount: 2,
			hasHypertension: true,
			asaStatus: "asa_3",
		});

		assert.equal(cardioSafe.maxSafeEpinephrineMg, 0.04);
		assert.equal(cardioSafe.injectedEpinephrineMg, 0.034);
		assert.equal(cardioSafe.isEpinephrineOverdose, false);
		assert.equal(cardioSafe.maxSafeCarpulesCount, 2.4);
	});

	it("triggers epinephrine overdose alert when exceeding 0.04 mg cardio limit", () => {
		const cardioOverdose = calculateAnesthesiaSafety({
			drugId: "articaine_4_epi_100k",
			patientWeightKg: 70,
			carpulesCount: 3,
			hasCardiovascularRisk: true,
		});

		assert.equal(cardioOverdose.isEpinephrineOverdose, true);
		assert.equal(cardioOverdose.safetyZone, "overdose_danger");
		assert.ok(
			cardioOverdose.warnings.some((w) => w.includes("КАРДИОЛИМИТ АДРЕНАЛИНА")),
		);
	});

	it("allows up to 4 carpules of 1:200k under 0.04 mg cardio limit", () => {
		const res = calculateAnesthesiaSafety({
			drugId: "articaine_4_epi_200k",
			patientWeightKg: 80,
			carpulesCount: 4,
			hasHypertension: true,
		});

		assert.equal(res.injectedEpinephrineMg, 0.034);
		assert.equal(res.isEpinephrineOverdose, false);
		assert.equal(res.maxSafeCarpulesCount, 4.7);
	});
});
