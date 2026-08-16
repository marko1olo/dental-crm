import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { PatientReactivationEngine } from "./PatientReactivationEngine.js";

describe("PatientReactivationEngine — Feature #270 Lost Patient Reactivation Engine", () => {
	test("1. Identifies critical churn risk for overdue hygiene + unfinished plan + overdue checkup", () => {
		const result = PatientReactivationEngine.calculateChurnScore({
			monthsSinceLastHygiene: 8,
			hasUnfinishedTreatmentPlan: true,
			monthsSinceLastVisit: 14,
		});

		assert.equal(result.churnRiskScore, 100);
		assert.equal(result.riskCategory, "critical");
		assert.equal(result.triggerReasons.length, 3);
	});

	test("2. Identifies medium churn risk for overdue hygiene only", () => {
		const result = PatientReactivationEngine.calculateChurnScore({
			monthsSinceLastHygiene: 7,
			hasUnfinishedTreatmentPlan: false,
			monthsSinceLastVisit: 5,
		});

		assert.equal(result.churnRiskScore, 40);
		assert.equal(result.riskCategory, "medium");
		assert.equal(result.triggerReasons.length, 1);
	});
});
