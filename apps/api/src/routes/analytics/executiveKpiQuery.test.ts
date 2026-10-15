import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveExecutiveDateRange } from "./executiveKpiQuery.js";

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
});
