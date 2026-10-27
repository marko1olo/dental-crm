import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateComprehensiveAnesthesiaSafety as calculateAnesthesiaSafety } from "@dental/shared";

/**
 * Pediatric Strict Limits (5.0 mg/kg for Articaine)
 * Mandate 8b <= 120 lines.
 */

describe("shared anesthesia safety — 2. Pediatric Strict Limits (5.0 mg/kg for Articaine)", () => {
	it("applies strict 5.0 mg/kg limit for 20kg child (max 100 mg Articaine)", () => {
		const child1Carpule = calculateAnesthesiaSafety({
			drugId: "articaine_4_epi_100k",
			patientWeightKg: 20,
			patientAgeYears: 7,
			carpulesCount: 1,
		});

		assert.equal(child1Carpule.isPediatric, true);
		assert.equal(child1Carpule.effectiveMaxMgPerKg, 5.0);
		assert.equal(child1Carpule.maxSafeActiveMg, 100.0);
		assert.equal(child1Carpule.injectedActiveMg, 68.0);
		assert.equal(child1Carpule.percentOfMaxDose, 68);
		assert.equal(child1Carpule.isOverdose, false);
		assert.equal(child1Carpule.safetyZone, "caution");
	});

	it("triggers critical overdose danger when child exceeds 5.0 mg/kg limit", () => {
		const child2Carpules = calculateAnesthesiaSafety({
			drugId: "articaine_4_epi_100k",
			patientWeightKg: 20,
			patientAgeYears: 7,
			carpulesCount: 2,
		});

		assert.equal(child2Carpules.isOverdose, true);
		assert.equal(child2Carpules.safetyZone, "overdose_danger");
		assert.ok(
			child2Carpules.warnings.some((w) =>
				w.includes("ПРЕВЫШЕНА ПРЕДЕЛЬНО ДОПУСТИМАЯ ДОЗА"),
			),
		);
	});

	it("handles pediatric classification by weight < 40 kg even if age is not specified", () => {
		const res = calculateAnesthesiaSafety({
			drugId: "articaine_4_epi_200k",
			patientWeightKg: 30,
			carpulesCount: 1,
		});

		assert.equal(res.isPediatric, true);
		assert.equal(res.effectiveMaxMgPerKg, 5.0);
		assert.equal(res.maxSafeActiveMg, 150.0);
	});
});
