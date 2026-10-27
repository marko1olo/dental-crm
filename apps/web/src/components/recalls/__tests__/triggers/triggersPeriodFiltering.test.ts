import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDateInPeriod } from "../../patientRecallEngine";

describe("4. Period Filtering (Overdue, This Month, Next Month, Next 30 Days)", () => {
	const refDate = new Date("2026-05-15T12:00:00Z");

	it("recognizes overdue dates (dueDate < referenceDate)", () => {
		assert.equal(isDateInPeriod("2026-05-10", "overdue", refDate), true);
		assert.equal(isDateInPeriod("2026-04-01", "overdue", refDate), true);
		assert.equal(isDateInPeriod("2026-05-20", "overdue", refDate), false);
		assert.equal(isDateInPeriod("2026-06-01", "overdue", refDate), false);
	});

	it("recognizes dates in this month (year and month match)", () => {
		assert.equal(isDateInPeriod("2026-05-01", "this_month", refDate), true);
		assert.equal(isDateInPeriod("2026-05-25", "this_month", refDate), true);
		assert.equal(isDateInPeriod("2026-04-30", "this_month", refDate), false);
		assert.equal(isDateInPeriod("2026-06-01", "this_month", refDate), false);
	});

	it("recognizes dates in next month", () => {
		assert.equal(isDateInPeriod("2026-06-05", "next_month", refDate), true);
		assert.equal(isDateInPeriod("2026-06-30", "next_month", refDate), true);
		assert.equal(isDateInPeriod("2026-05-31", "next_month", refDate), false);
		assert.equal(isDateInPeriod("2026-07-01", "next_month", refDate), false);
	});

	it("recognizes dates in next 30 days window", () => {
		assert.equal(isDateInPeriod("2026-05-16", "next_30_days", refDate), true);
		assert.equal(isDateInPeriod("2026-06-10", "next_30_days", refDate), true);
		assert.equal(isDateInPeriod("2026-07-01", "next_30_days", refDate), false);
		assert.equal(isDateInPeriod("2026-05-10", "next_30_days", refDate), false);
	});

	it("period 'all' matches any valid date", () => {
		assert.equal(isDateInPeriod("2025-01-01", "all", refDate), true);
		assert.equal(isDateInPeriod("2027-12-31", "all", refDate), true);
	});
});
