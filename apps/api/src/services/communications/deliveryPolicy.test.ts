import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { minuteOfDayInTimeZone } from "./deliveryPolicy.js";

describe("deliveryPolicy", () => {
	describe("minuteOfDayInTimeZone", () => {
		test("calculates minute of day for a valid timezone (UTC)", () => {
			const date = new Date(Date.UTC(2023, 0, 1, 14, 30)); // 14:30 UTC
			const result = minuteOfDayInTimeZone(date, "UTC");
			assert.equal(result, 14 * 60 + 30);
		});

		test("calculates minute of day for a valid timezone (Asia/Dubai)", () => {
			// Asia/Dubai is UTC+4
			const date = new Date(Date.UTC(2023, 0, 1, 10, 15)); // 10:15 UTC -> 14:15 in Dubai
			const result = minuteOfDayInTimeZone(date, "Asia/Dubai");
			assert.equal(result, 14 * 60 + 15);
		});

		test("calculates minute of day crossing midnight (UTC vs local)", () => {
			// America/New_York is UTC-5 (standard time in Jan)
			const date = new Date(Date.UTC(2023, 0, 1, 2, 45)); // 02:45 UTC -> 21:45 in NY on previous day
			const result = minuteOfDayInTimeZone(date, "America/New_York");
			assert.equal(result, 21 * 60 + 45);
		});

		test("falls back to UTC for an invalid timezone without throwing", () => {
			const date = new Date(Date.UTC(2023, 0, 1, 14, 30)); // 14:30 UTC
			// "Invalid/Timezone" should trigger the catch block and use UTC
			const result = minuteOfDayInTimeZone(date, "Invalid/Timezone");
			assert.equal(result, 14 * 60 + 30); // Should match UTC result
		});
	});
});
