import assert from "node:assert";
import { describe, test } from "node:test";
import { normalizedTaxpayerInn } from "../documents.js";

describe("normalizedTaxpayerInn", () => {
	test("removes all non-digit characters", () => {
		assert.strictEqual(normalizedTaxpayerInn("123-456-789"), "123456789");
		assert.strictEqual(normalizedTaxpayerInn(" 12 34 abc 56 "), "123456");
		assert.strictEqual(
			normalizedTaxpayerInn("a1b2c3d4e5f6g7h8i9j0"),
			"1234567890",
		);
	});

	test("handles null and undefined", () => {
		assert.strictEqual(normalizedTaxpayerInn(null), "");
		assert.strictEqual(normalizedTaxpayerInn(undefined), "");
	});

	test("handles empty strings", () => {
		assert.strictEqual(normalizedTaxpayerInn(""), "");
		assert.strictEqual(normalizedTaxpayerInn("   "), "");
	});

	test("handles strings with only non-digits", () => {
		assert.strictEqual(normalizedTaxpayerInn("abc"), "");
		assert.strictEqual(normalizedTaxpayerInn("!@#$%^&*()"), "");
	});

	test("returns the original string if it contains only digits", () => {
		assert.strictEqual(normalizedTaxpayerInn("1234567890"), "1234567890");
	});
});
