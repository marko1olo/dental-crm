import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateWorkingMinutesInPeriod,
	resolveClinicScheduleWorkHours,
	resolveExecutiveDateRange,
} from "./executiveKpiQuery.js";

describe("Executive Analytics Backend Query Resolvers", () => {
	it("resolves date ranges for day, month, quarter, and year properly", () => {
		const day = resolveExecutiveDateRange("day");
		assert.equal(day.execPeriod, "day");
		assert.ok(day.daysCount >= 1);

		const month = resolveExecutiveDateRange("month");
		assert.equal(month.execPeriod, "month");
		assert.equal(month.startDate.getDate(), 1);

		const quarter = resolveExecutiveDateRange("quarter");
		assert.equal(quarter.execPeriod, "quarter");
		assert.ok([0, 3, 6, 9].includes(quarter.startDate.getMonth()));

		const year = resolveExecutiveDateRange("year");
		assert.equal(year.execPeriod, "year");
		assert.equal(year.startDate.getMonth(), 0);
		assert.equal(year.startDate.getDate(), 1);

		const fallback = resolveExecutiveDateRange("unknown_period");
		assert.equal(fallback.execPeriod, "month");
	});

	it("[ANL-04] calculates realistic chair working hours from schedule instead of 84h/week distortion", () => {
		// Понедельник 2026-10-05 до Воскресенья 2026-10-11 (ровно 1 календарная неделя)
		const mon = new Date(2026, 9, 5, 0, 0, 0);
		const sun = new Date(2026, 9, 11, 23, 59, 59);

		// 1. По умолчанию: 40 часов в неделю (5 рабочих дней по 8 часов = 2400 минут)
		const defResult = calculateWorkingMinutesInPeriod(mon, sun);
		assert.equal(defResult.workingDays, 5, "Default working days must be 5 (Mon-Fri)");
		assert.equal(defResult.availableMinutesPerChair, 5 * 8 * 60, "Default must be 2400 minutes (40 hours/week), NOT 5040 (84 hours/week)");

		// 2. Специфический график клиники: 6 дней (Mon-Sat, 1..6) по 10 часов (09:00 - 19:00)
		const customSchedule = resolveClinicScheduleWorkHours({
			workdayStart: "09:00",
			workdayEnd: "19:00",
			workingDays: [1, 2, 3, 4, 5, 6],
		});
		assert.equal(customSchedule.workdayStartMinutes, 540);
		assert.equal(customSchedule.workdayEndMinutes, 1140);
		assert.equal(customSchedule.workingDays.size, 6);

		const customResult = calculateWorkingMinutesInPeriod(mon, sun, customSchedule);
		assert.equal(customResult.workingDays, 6);
		assert.equal(customResult.availableMinutesPerChair, 6 * 10 * 60, "6 days * 10 hours = 3600 minutes");
	});
});
