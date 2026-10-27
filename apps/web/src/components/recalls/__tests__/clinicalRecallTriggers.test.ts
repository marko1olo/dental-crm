import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateHygieneRecallTrigger,
	evaluateClinicalRecallTrigger,
	toCanonicalRecallStatus,
	fromCanonicalRecallStatus,
	extractPolitePatientName,
	isDateInPeriod,
} from "../patientRecallEngine";

describe("Clinical Recall Triggers: Master Integrity Check", () => {
	it("verifies hygiene interval defaults to 6 months", () => {
		const trigger = calculateHygieneRecallTrigger("2026-01-01");
		assert.equal(trigger.triggerType, "hygiene_6m");
		assert.equal(trigger.intervalMonths, 6);
	});

	it("verifies pediatric trigger triggers on child status", () => {
		const result = evaluateClinicalRecallTrigger({ lastVisitDate: "2026-01-01", isChildUnder14: true });
		assert.equal(result.triggerType, "pediatric_3_4m");
	});

	it("verifies canonical status transitions round-trip", () => {
		assert.equal(toCanonicalRecallStatus("due_now"), "not_called");
		assert.equal(fromCanonicalRecallStatus("not_called"), "due_now");
		assert.equal(toCanonicalRecallStatus("scheduled"), "scheduled");
		assert.equal(fromCanonicalRecallStatus("scheduled"), "scheduled");
	});

	it("verifies polite Russian patient name salutation", () => {
		assert.equal(extractPolitePatientName("Сергеев Петр Иванович"), "Петр Иванович");
	});

	it("verifies period window evaluation", () => {
		const refDate = new Date("2026-05-15T12:00:00Z");
		assert.equal(isDateInPeriod("2026-05-10", "overdue", refDate), true);
		assert.equal(isDateInPeriod("2026-05-20", "this_month", refDate), true);
	});
});
