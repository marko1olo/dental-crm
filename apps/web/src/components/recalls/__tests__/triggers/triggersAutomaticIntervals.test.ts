import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateHygieneRecallTrigger,
	calculateImplantProstheticRecallTrigger,
	calculateOrthoActivationRecallTrigger,
	calculatePediatricRecallTrigger,
} from "../../patientRecallEngine";

describe("1. Automatic Clinical Return Triggers: Intervals", () => {
	it("Trigger 1: Hygiene — sets 6 months interval from last cleaning", () => {
		const lastCleaning = "2026-03-15";
		const trigger = calculateHygieneRecallTrigger(lastCleaning);

		assert.equal(trigger.triggerType, "hygiene_6m");
		assert.equal(trigger.intervalMonths, 6);
		assert.equal(trigger.formattedDueDate, "2026-09-15");
		assert.equal(trigger.mappedCycleType, "standard_prophylaxis");
		assert.ok(trigger.title.includes("гигиена"));
		assert.ok(trigger.clinicalRationale.includes("гарантийных обязательств"));
	});

	it("Trigger 1: Hygiene handles month end overflow safely (Aug 31 + 6 months -> Feb 28)", () => {
		const trigger = calculateHygieneRecallTrigger("2025-08-31");
		assert.equal(trigger.formattedDueDate, "2026-02-28");
	});

	it("Trigger 2: Implants / Prosthetics — sets 12 months interval for annual checkup", () => {
		const surgeryDate = "2025-05-20";
		const trigger = calculateImplantProstheticRecallTrigger(surgeryDate);

		assert.equal(trigger.triggerType, "implant_prosthetic_12m");
		assert.equal(trigger.intervalMonths, 12);
		assert.equal(trigger.formattedDueDate, "2026-05-20");
		assert.equal(trigger.mappedCycleType, "implant_monitoring");
		assert.ok(trigger.title.includes("имплантации"));
		assert.ok(trigger.clinicalRationale.includes("СтАР/ITI"));
	});

	it("Trigger 3: Orthodontic Activation — sets strictly 1 month / 4 weeks (28 days)", () => {
		const lastAdjustment = "2026-04-01";
		const trigger = calculateOrthoActivationRecallTrigger(lastAdjustment);

		assert.equal(trigger.triggerType, "ortho_activation_1m");
		assert.equal(trigger.intervalWeeks, 4);
		assert.equal(trigger.intervalMonths, 1);
		assert.equal(trigger.formattedDueDate, "2026-04-29");
		assert.equal(trigger.mappedCycleType, "orthodontic_braces");
		assert.ok(trigger.title.includes("активация"));
	});

	it("Trigger 4: Pediatric Checkup — sets 3 or 4 months interval for children", () => {
		const lastVisit = "2026-01-10";
		const trigger3m = calculatePediatricRecallTrigger(lastVisit, 3);
		assert.equal(trigger3m.triggerType, "pediatric_3_4m");
		assert.equal(trigger3m.intervalMonths, 3);
		assert.equal(trigger3m.formattedDueDate, "2026-04-10");
		assert.equal(trigger3m.mappedCycleType, "pediatric_fluoridation");
		assert.ok(trigger3m.clinicalRationale.includes("незрелой эмали"));

		const trigger4m = calculatePediatricRecallTrigger(lastVisit, 4);
		assert.equal(trigger4m.intervalMonths, 4);
		assert.equal(trigger4m.formattedDueDate, "2026-05-10");
	});
});
