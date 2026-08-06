import assert from "node:assert";
import { describe, test } from "node:test";
import { normalizeDate } from "../utils/dates.js";

describe("normalizeDate", () => {
	test("returns null for empty values", () => {
		assert.strictEqual(normalizeDate(null), null);
		assert.strictEqual(normalizeDate(""), null);
	});
});
