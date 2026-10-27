import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateClinicalCycleSuggestion } from "../../patientRecallEngine";

describe("Patient Recall Engine - Clinical Cycle Auto-Classification", () => {
	it("prioritizes periodontal maintenance when pocket >= 4mm or BOP present", () => {
		const perio = evaluateClinicalCycleSuggestion({
			maxPocketDepthMm: 5,
			hasBleedingOnProbing: true,
		});
		assert.equal(perio.suggestedCycle, "periodontal_maintenance");
		assert.equal(perio.recommendedIntervalValue, 3);
	});

	it("suggests implant monitoring for implant carriers", () => {
		const implant = evaluateClinicalCycleSuggestion({
			hasImplants: true,
			monthsSinceImplantSurgery: 2,
		});
		assert.equal(implant.suggestedCycle, "implant_monitoring");
		assert.equal(implant.recommendedIntervalValue, 3);
	});

	it("suggests braces vs aligners based on orthodontic appliances", () => {
		const braces = evaluateClinicalCycleSuggestion({ hasBraces: true });
		assert.equal(braces.suggestedCycle, "orthodontic_braces");
		assert.equal(braces.intervalUnit, "weeks");
		assert.equal(braces.recommendedIntervalValue, 4);

		const aligners = evaluateClinicalCycleSuggestion({ hasAligners: true });
		assert.equal(aligners.suggestedCycle, "orthodontic_aligners");
		assert.equal(aligners.intervalUnit, "weeks");
		assert.equal(aligners.recommendedIntervalValue, 6);
	});

	it("suggests pediatric fluoridation for children under 14", () => {
		const ped = evaluateClinicalCycleSuggestion({ isChildUnder14: true });
		assert.equal(ped.suggestedCycle, "pediatric_fluoridation");
		assert.equal(ped.recommendedIntervalValue, 3);
	});

	it("suggests high caries risk for patients with active caries", () => {
		const caries = evaluateClinicalCycleSuggestion({ hasDeepCaries: true, decayedTeethCount: 4 });
		assert.equal(caries.suggestedCycle, "caries_high_risk");
		assert.equal(caries.recommendedIntervalValue, 3);
	});
});
