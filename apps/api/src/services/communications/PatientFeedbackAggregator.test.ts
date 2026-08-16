import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { PatientFeedbackAggregator } from "./PatientFeedbackAggregator.js";

describe("PatientFeedbackAggregator — Feature #178 Patient NPS & CSAT Feedback", () => {
	test("1. Calculates NPS correctly (Promoters - Detractors)", () => {
		// 6 promoters (10, 10, 9, 9, 9, 10) = 60%
		// 2 passives (7, 8) = 20%
		// 2 detractors (4, 5) = 20%
		// NPS = 60 - 20 = 40%
		const scores = [10, 10, 9, 9, 9, 10, 7, 8, 4, 5];
		const nps = PatientFeedbackAggregator.calculateNpsFromScores(scores);
		assert.equal(nps, 40);
	});

	test("2. Handles 100% promoter and 100% detractor boundaries", () => {
		const allPromoters = [10, 10, 9];
		assert.equal(PatientFeedbackAggregator.calculateNpsFromScores(allPromoters), 100);

		const allDetractors = [0, 2, 5];
		assert.equal(PatientFeedbackAggregator.calculateNpsFromScores(allDetractors), -100);

		assert.equal(PatientFeedbackAggregator.calculateNpsFromScores([]), 0);
	});

	test("3. Calculates CSAT average accurately", () => {
		const scores = [5, 4, 5, 4, 2]; // Total: 20 / 5 = 4.0
		const csat = PatientFeedbackAggregator.calculateCsatFromScores(scores);
		assert.equal(csat, 4);
	});

	test("4. Identifies negative feedback for management escalation (<= 6)", () => {
		assert.equal(PatientFeedbackAggregator.shouldEscalateNegativeFeedback(6), true);
		assert.equal(PatientFeedbackAggregator.shouldEscalateNegativeFeedback(2), true);
		assert.equal(PatientFeedbackAggregator.shouldEscalateNegativeFeedback(7), false);
		assert.equal(PatientFeedbackAggregator.shouldEscalateNegativeFeedback(10), false);
	});
});
