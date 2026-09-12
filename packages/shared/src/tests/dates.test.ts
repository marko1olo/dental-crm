import assert from "node:assert";
import { describe, test } from "node:test";
import { normalizeDate } from "../utils/dates.js";

describe("normalizeDate", () => {
	test("returns null for empty values", () => {
		assert.strictEqual(normalizeDate(null), null);
		assert.strictEqual(normalizeDate(""), null);
		assert.strictEqual(normalizeDate(undefined), null);
		assert.strictEqual(normalizeDate("   "), null);
	});

	test("normalizes Russian DMY dates to ISO YYYY-MM-DD", () => {
		assert.strictEqual(normalizeDate("15.03.1985"), "1985-03-15");
		assert.strictEqual(normalizeDate("1/5/2020"), "2020-05-01");
		assert.strictEqual(normalizeDate("09-12-2023"), "2023-12-09");
	});

	test("normalizes ISO dates to canonical YYYY-MM-DD", () => {
		assert.strictEqual(normalizeDate("1985-03-15"), "1985-03-15");
		assert.strictEqual(normalizeDate("2020/5/1"), "2020-05-01");
		assert.strictEqual(normalizeDate("2023.12.09"), "2023-12-09");
	});

	test("returns null for unparseable garbage", () => {
		assert.strictEqual(normalizeDate("invalid"), null);
		assert.strictEqual(normalizeDate("не помнит"), null);
	});
});

