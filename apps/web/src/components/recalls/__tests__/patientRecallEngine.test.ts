import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateHygieneRecallDate,
	calculateOrthoRecallDate,
	calculateDaysOverdue,
	evaluateClinicalCycleSuggestion,
	extractFirstName,
} from "../patientRecallEngine";

describe("Patient Recall Engine: Master Integration Suite", () => {
	it("verifies hygiene recall defaults to 6 months", () => {
		const res = calculateHygieneRecallDate("2026-01-01", false);
		assert.equal(res.intervalMonths, 6);
		assert.equal(res.cycleType, "standard_prophylaxis");
	});

	it("verifies ortho braces defaults to 4 weeks", () => {
		const res = calculateOrthoRecallDate("2026-01-01", "braces");
		assert.equal(res.cycleType, "orthodontic_braces");
	});

	it("verifies overdue calculation", () => {
		assert.equal(calculateDaysOverdue("2026-01-01", "2026-01-11"), 10);
	});

	it("verifies clinical cycle suggestion for periodontitis", () => {
		const s = evaluateClinicalCycleSuggestion({ maxPocketDepthMm: 5 });
		assert.equal(s.suggestedCycle, "periodontal_maintenance");
	});

	it("verifies first name extraction", () => {
		assert.equal(extractFirstName("Иванов Иван Иванович"), "Иван");
	});
});
