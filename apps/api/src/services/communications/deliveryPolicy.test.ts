import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { computeRetryDelaySeconds } from "./deliveryPolicy.js";

describe("computeRetryDelaySeconds", () => {
	const defaultSettings = { retryBaseSeconds: 10, retryMaxSeconds: 3600 };

	test("Calculates exponential backoff within jitter bounds", () => {
		// attempt 1: raw = 10. Jitter bounds: [8, 12]
		const attempt1 = computeRetryDelaySeconds(1, "network", defaultSettings);
		assert.ok(attempt1 >= 8 && attempt1 <= 12, `attempt1 = ${attempt1}`);

		// attempt 2: raw = 20. Jitter bounds: [16, 24]
		const attempt2 = computeRetryDelaySeconds(2, "network", defaultSettings);
		assert.ok(attempt2 >= 16 && attempt2 <= 24, `attempt2 = ${attempt2}`);

		// attempt 3: raw = 40. Jitter bounds: [32, 48]
		const attempt3 = computeRetryDelaySeconds(3, "network", defaultSettings);
		assert.ok(attempt3 >= 32 && attempt3 <= 48, `attempt3 = ${attempt3}`);
	});

	test("Enforces maximum delay (ceiling)", () => {
		// With base=10, attempt 10 would be 10 * 2^9 = 5120. But ceiling is 3600.
		// Raw is 3600. Jitter bounds: [2880, 4320].
		const attempt10 = computeRetryDelaySeconds(10, "network", defaultSettings);
		assert.ok(attempt10 >= 3600 * 0.8 && attempt10 <= 3600 * 1.2, `attempt10 = ${attempt10}`);
	});

	test("Enforces INSUFFICIENT_FUNDS_FLOOR_SECONDS for insufficient_funds error", () => {
		// Attempt 1: raw = 10, but error is insufficient_funds, so delay is max(10, 1800) = 1800.
		// Jitter bounds: [1440, 2160].
		const attempt1 = computeRetryDelaySeconds(1, "insufficient_funds", defaultSettings);
		assert.ok(attempt1 >= 1800 * 0.8 && attempt1 <= 1800 * 1.2, `attempt1 = ${attempt1}`);
	});

	test("Protects against overflow for extremely large attempts", () => {
		// attempt = 100. 10 * 2^99 would overflow to infinity without clamping.
		// The exponent is clamped to 30. 10 * 2^30 = 10737418240, but bounded by ceiling=3600.
		// Result should just be maxed out at 3600 + jitter.
		const attempt100 = computeRetryDelaySeconds(100, "network", defaultSettings);
		assert.ok(attempt100 >= 3600 * 0.8 && attempt100 <= 3600 * 1.2, `attempt100 = ${attempt100}`);

		// Let's test with no ceiling to see the 2^30 clamp.
		const noCeilingSettings = { retryBaseSeconds: 10, retryMaxSeconds: 100 * 2 ** 35 };
		const attempt40 = computeRetryDelaySeconds(40, "network", noCeilingSettings);
		const expectedMaxRaw = 10 * 2 ** 30; // 10737418240
		assert.ok(attempt40 >= expectedMaxRaw * 0.8 && attempt40 <= expectedMaxRaw * 1.2, `attempt40 = ${attempt40}`);
	});

	test("Handles invalid or edge case settings (base <= 0, max <= base)", () => {
		// base = 0 -> clamped to 1
		// max = 0 -> clamped to max(1, 0) = 1
		const zeroSettings = { retryBaseSeconds: 0, retryMaxSeconds: 0 };

		// Attempt 1: raw = 1 * 2^0 = 1, ceiling = 1.
		// Jitter bounds: [0.8, 1.2], rounded to 1.
		const attempt1 = computeRetryDelaySeconds(1, "network", zeroSettings);
		assert.equal(attempt1, 1);

		const attempt5 = computeRetryDelaySeconds(5, "network", zeroSettings);
		assert.equal(attempt5, 1);

		// Negative base
		const negSettings = { retryBaseSeconds: -10, retryMaxSeconds: -5 };
		// base clamped to 1. max clamped to 1.
		const attemptNeg = computeRetryDelaySeconds(3, "network", negSettings);
		assert.equal(attemptNeg, 1);
	});

	test("Calculations are deterministic based on seed and attempt", () => {
		const val1 = computeRetryDelaySeconds(1, "network", defaultSettings, "test_seed_1");
		const val2 = computeRetryDelaySeconds(1, "network", defaultSettings, "test_seed_1");
		assert.equal(val1, val2);

		const val3 = computeRetryDelaySeconds(1, "network", defaultSettings, "test_seed_2");
		assert.notEqual(val1, val3); // Likely different due to different seed
	});
});