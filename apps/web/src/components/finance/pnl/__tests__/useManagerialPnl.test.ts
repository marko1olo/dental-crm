import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { getDatesForPnlPreset } from "../useManagerialPnl.js";

describe("Managerial P&L Engine & Hook Invariants", () => {
	test("getDatesForPnlPreset: current_month correctly generates ISO bounds", () => {
		const fixedDate = new Date(Date.UTC(2026, 9, 21)); // October 2026
		const dates = getDatesForPnlPreset("current_month", fixedDate);

		assert.equal(dates.from, "2026-10-01");
		assert.equal(dates.to, "2026-10-31");
	});

	test("getDatesForPnlPreset: prev_month correctly generates ISO bounds for previous month", () => {
		const fixedDate = new Date(Date.UTC(2026, 9, 21)); // October 2026
		const dates = getDatesForPnlPreset("prev_month", fixedDate);

		assert.equal(dates.from, "2026-09-01");
		assert.equal(dates.to, "2026-09-30");
	});

	test("getDatesForPnlPreset: quarter correctly identifies Q4 bounds", () => {
		const fixedDate = new Date(Date.UTC(2026, 9, 21)); // October 2026 (Month index 9 -> Q4)
		const dates = getDatesForPnlPreset("quarter", fixedDate);

		assert.equal(dates.from, "2026-10-01");
		assert.equal(dates.to, "2026-12-31");
	});

	test("getDatesForPnlPreset: year correctly generates full-year bounds", () => {
		const fixedDate = new Date(Date.UTC(2026, 9, 21));
		const dates = getDatesForPnlPreset("year", fixedDate);

		assert.equal(dates.from, "2026-01-01");
		assert.equal(dates.to, "2026-12-31");
	});
});
