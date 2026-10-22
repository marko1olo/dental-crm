/**
 * apps/web/src/components/analytics/__tests__/executiveDoctorsAndRanges.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock top doctors performance rows and period date ranges.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTopDoctorsPerformanceRows } from "../executiveModules/ExecutiveDoctorPerformanceTable.js";
import { getFinancialPeriodDateRange } from "../financialModalModules/FinancialCashflowTimeline.js";

describe("Executive Doctors Performance and Period Ranges", () => {
	it("builds top doctors performance rows and resolves financial period date ranges", () => {
		const docs = buildTopDoctorsPerformanceRows(
			[
				{
					doctorUserId: "doc-101",
					doctorName: "Иванов Сергей Петрович",
					revenueRub: 840_000,
					appointments: { total: 30, completed: 28 },
				},
			],
			"month",
			false,
		);

		assert.equal(docs.length, 1);
		assert.equal(docs[0]?.initials, "ИС");
		assert.equal(docs[0]?.attendance, "93%");
		assert.ok(docs[0]?.averageCheckFormatted.includes("30"));

		const monthRange = getFinancialPeriodDateRange("month");
		const quarterRange = getFinancialPeriodDateRange("quarter");
		const yearRange = getFinancialPeriodDateRange("year");

		assert.match(monthRange.from, /^\d{4}-\d{2}-01$/);
		assert.match(quarterRange.from, /^\d{4}-\d{2}-01$/);
		assert.match(yearRange.from, /^\d{4}-01-01$/);
	});
});
