import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	addCalendarMonthsSafe,
	addDaysSafe,
	addWeeksSafe,
	calculateDaysOverdue,
	calculateRecallProfile,
	formatIsoDateOnly,
	resolveUrgencyStatus,
} from "../../patientRecallEngine";

describe("Patient Recall Engine - Calendar Math & Urgency", () => {
	it("handles month overflows (31 August -> 28 February, 31 May -> 30 September)", () => {
		const aug31 = new Date(2026, 7, 31);
		const plus6m = addCalendarMonthsSafe(aug31, 6);
		assert.equal(plus6m.getFullYear(), 2027);
		assert.equal(plus6m.getMonth(), 1);
		assert.equal(plus6m.getDate(), 28);

		const may31 = new Date(2026, 4, 31);
		const plus4m = addCalendarMonthsSafe(may31, 4);
		assert.equal(plus4m.getFullYear(), 2026);
		assert.equal(plus4m.getMonth(), 8);
		assert.equal(plus4m.getDate(), 30);
	});

	it("handles leap year February 29th properly", () => {
		const leapJan31 = new Date(2028, 0, 31);
		const plus1m = addCalendarMonthsSafe(leapJan31, 1);
		assert.equal(plus1m.getFullYear(), 2028);
		assert.equal(plus1m.getMonth(), 1);
		assert.equal(plus1m.getDate(), 29);
	});

	it("adds weeks and days correctly", () => {
		const d = new Date(2026, 7, 1);
		const plus4w = addWeeksSafe(d, 4);
		assert.equal(formatIsoDateOnly(plus4w), "2026-08-29");
		const plus10d = addDaysSafe(d, 10);
		assert.equal(formatIsoDateOnly(plus10d), "2026-08-11");
	});

	it("calculates overdue days and resolves urgency status accurately", () => {
		assert.equal(calculateDaysOverdue("2026-08-10", "2026-08-25"), 15);
		assert.equal(calculateDaysOverdue("2026-08-25", "2026-08-10"), -15);
		assert.equal(calculateDaysOverdue("2026-08-10", "2026-08-10"), 0);

		const due = "2026-08-10";
		assert.equal(resolveUrgencyStatus(due, "2026-08-25", true), "completed");
		assert.equal(resolveUrgencyStatus("2026-09-10", "2026-08-25"), "upcoming");
		assert.equal(resolveUrgencyStatus(due, "2026-08-10"), "due_now");
		assert.equal(resolveUrgencyStatus(due, "2026-09-15"), "overdue_30");
		assert.equal(resolveUrgencyStatus(due, "2026-11-15"), "overdue_90");
	});

	it("calculates full recall profile for braces", () => {
		const profile = calculateRecallProfile({
			lastVisitDate: "2026-08-01",
			cycleType: "orthodontic_braces",
			referenceDate: "2026-08-29",
		});
		assert.equal(profile.formattedDueDate, "2026-08-29");
		assert.equal(profile.daysOverdue, 0);
		assert.equal(profile.urgencyStatus, "due_now");
	});
});
