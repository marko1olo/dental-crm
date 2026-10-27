import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateHygieneRecallDate,
	calculateImplantRecallMilestones,
	calculateOrthoRecallDate,
	calculatePediatricRecallDate,
} from "../../patientRecallEngine";

describe("Patient Recall Engine - Clinical Interval Calculations", () => {
	it("1. Routine Hygiene: 6 months standard and 3-4 months for periodontitis", () => {
		const standard = calculateHygieneRecallDate("2026-02-15", false);
		assert.equal(standard.intervalMonths, 6);
		assert.equal(standard.formattedDueDate, "2026-08-15");
		assert.equal(standard.cycleType, "standard_prophylaxis");

		const perio = calculateHygieneRecallDate("2026-05-10", true);
		assert.equal(perio.intervalMonths, 3);
		assert.equal(perio.formattedDueDate, "2026-08-10");
		assert.equal(perio.cycleType, "periodontal_maintenance");

		const perio4m = calculateHygieneRecallDate("2026-04-10", true, 4);
		assert.equal(perio4m.intervalMonths, 4);
		assert.equal(perio4m.formattedDueDate, "2026-08-10");
	});

	it("2. Dental Implant Osteointegration Milestones (1, 3, 6, 12 months)", () => {
		const surgeryDate = "2026-05-15";
		const earlyPostOp = calculateImplantRecallMilestones(surgeryDate, "2026-05-30");
		assert.equal(earlyPostOp.nextMilestoneMonth, 1);
		assert.equal(earlyPostOp.formattedNextDueDate, "2026-06-15");
		assert.equal(earlyPostOp.milestones.length, 4);
		assert.equal(earlyPostOp.milestones[0]?.month, 1);
		assert.equal(earlyPostOp.milestones[3]?.month, 12);
		assert.equal(earlyPostOp.milestones[3]?.formattedDueDate, "2027-05-15");

		const at2m = calculateImplantRecallMilestones(surgeryDate, "2026-07-20");
		assert.equal(at2m.nextMilestoneMonth, 3);
		assert.equal(at2m.formattedNextDueDate, "2026-08-15");
	});

	it("3. Orthodontic Control: Braces 4 weeks and Aligners 6-8 weeks", () => {
		const lastAdjustment = "2026-08-01";
		const braces = calculateOrthoRecallDate(lastAdjustment, "braces");
		assert.equal(braces.cycleType, "orthodontic_braces");
		assert.equal(braces.formattedDueDate, "2026-08-29");

		const aligners = calculateOrthoRecallDate(lastAdjustment, "aligners");
		assert.equal(aligners.cycleType, "orthodontic_aligners");
		assert.equal(aligners.formattedDueDate, "2026-09-12");

		const retention = calculateOrthoRecallDate(lastAdjustment, "retainer");
		assert.equal(retention.cycleType, "orthodontic_retention");
		assert.equal(retention.formattedDueDate, "2026-11-01");
	});

	it("4. Pediatric Fluoridation and Fissure Sealing (3-6 months)", () => {
		const ped3m = calculatePediatricRecallDate("2026-05-12", true);
		assert.equal(ped3m.intervalMonths, 3);
		assert.equal(ped3m.formattedDueDate, "2026-08-12");

		const ped6m = calculatePediatricRecallDate("2026-05-12", false);
		assert.equal(ped6m.intervalMonths, 6);
		assert.equal(ped6m.formattedDueDate, "2026-11-12");
	});
});
