import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatDate } from "../util.js";

describe("formatDate", () => {
	it("should format as yyyyMMdd correctly", () => {
		// Month is 0-indexed in Date constructor (9 = October)
		const date = new Date(2023, 9, 15);
		assert.strictEqual(formatDate(date, "yyyyMMdd"), "20231015");
	});

	it("should format as yyyyMMddHHmmss correctly", () => {
		// Month is 0-indexed (10 = November)
		const date = new Date(2023, 10, 20, 14, 30, 45);
		assert.strictEqual(formatDate(date, "yyyyMMddHHmmss"), "20231120143045");
	});

	it("should correctly pad single digit values", () => {
		// Single digit month (0 = Jan), day, hours, minutes, seconds
		const date = new Date(2023, 0, 5, 4, 8, 9);
		assert.strictEqual(formatDate(date, "yyyyMMdd"), "20230105");
		assert.strictEqual(formatDate(date, "yyyyMMddHHmmss"), "20230105040809");
	});
});
