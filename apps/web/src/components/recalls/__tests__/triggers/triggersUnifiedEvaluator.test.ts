import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	evaluateClinicalRecallTrigger,
	resolveCandidateTriggerType,
	type PatientRecallRecord,
} from "../../patientRecallEngine";

describe("1b. Clinical Return Triggers: Unified Evaluator", () => {
	it("Unified Evaluator: classifies child < 14 as pediatric recall trigger", () => {
		const result = evaluateClinicalRecallTrigger({
			lastVisitDate: "2026-02-01",
			isChildUnder14: true,
		});
		assert.equal(result.triggerType, "pediatric_3_4m");
		assert.equal(result.intervalMonths, 3);
	});

	it("Unified Evaluator: classifies orthodontic braces patient as 1 month activation", () => {
		const result = evaluateClinicalRecallTrigger({
			lastVisitDate: "2026-03-01",
			hasBraces: true,
		});
		assert.equal(result.triggerType, "ortho_activation_1m");
		assert.equal(result.intervalWeeks, 4);
	});

	it("Unified Evaluator: classifies implant/crown carrier as 12 months annual checkup", () => {
		const result = evaluateClinicalRecallTrigger({
			lastVisitDate: "2025-06-15",
			hasImplants: true,
		});
		assert.equal(result.triggerType, "implant_prosthetic_12m");
		assert.equal(result.intervalMonths, 12);
	});

	it("Unified Evaluator: defaults healthy adult patient to 6 months hygiene trigger", () => {
		const result = evaluateClinicalRecallTrigger({
			lastVisitDate: "2026-01-01",
		});
		assert.equal(result.triggerType, "hygiene_6m");
		assert.equal(result.intervalMonths, 6);
		assert.equal(result.formattedDueDate, "2026-07-01");
	});

	it("Candidate Trigger Resolver: maps patient records into canonical triggers correctly", () => {
		const childCandidate: PatientRecallRecord = {
			id: "c1",
			patientId: "p1",
			fullName: "Смирнов Артем Денисович",
			phone: "+79991112233",
			age: 8,
			cycleType: "pediatric_fluoridation",
			lastVisitDate: "2026-01-01",
			dueDate: "2026-04-01",
			daysOverdue: 0,
			urgencyStatus: "due_now",
			status: "due_now",
		};
		assert.equal(resolveCandidateTriggerType(childCandidate), "pediatric_3_4m");

		const orthoCandidate: PatientRecallRecord = {
			...childCandidate,
			age: 22,
			cycleType: "orthodontic_braces",
		};
		assert.equal(resolveCandidateTriggerType(orthoCandidate), "ortho_activation_1m");

		const implantCandidate: PatientRecallRecord = {
			...childCandidate,
			age: 45,
			cycleType: "implant_monitoring",
			implantSurgeryDate: "2025-04-10",
		};
		assert.equal(resolveCandidateTriggerType(implantCandidate), "implant_prosthetic_12m");

		const hygieneCandidate: PatientRecallRecord = {
			...childCandidate,
			age: 35,
			cycleType: "standard_prophylaxis",
		};
		assert.equal(resolveCandidateTriggerType(hygieneCandidate), "hygiene_6m");
	});
});
