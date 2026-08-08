import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { dictationTodayDate } from "./dictationParser.js";

describe("dictationTodayDate", () => {
	// A fixed point in time: Dec 31, 2024, 22:00:00 UTC
	// This means in UTC, the date is 2024-12-31.
	const fixedNow = new Date("2024-12-31T22:00:00.000Z");

	// A helper to compute what the server date would be for the fixed date,
	// since the fallback relies on local server timezone
	const getServerDate = (date: Date) => {
		const pad = (value: number) => String(value).padStart(2, "0");
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
	};
	const expectedFallback = getServerDate(fixedNow);

	test("returns the correct date for a positive offset timezone (Europe/Moscow)", () => {
		// Moscow is UTC+3, so 22:00 UTC on Dec 31 is 01:00 Jan 1 in Moscow
		const result = dictationTodayDate("Europe/Moscow", fixedNow);
		assert.strictEqual(result, "2025-01-01");
	});

	test("returns the correct date for a negative offset timezone (America/New_York)", () => {
		// New York is UTC-5, so 22:00 UTC on Dec 31 is 17:00 Dec 31 in New York
		const result = dictationTodayDate("America/New_York", fixedNow);
		assert.strictEqual(result, "2024-12-31");
	});

	test("returns the correct date for an extreme positive offset (Pacific/Auckland)", () => {
		// Auckland is UTC+13 (with Daylight Saving Time, but basically +13/+12)
		// 22:00 UTC Dec 31 is 11:00 Jan 1 in Auckland
		const result = dictationTodayDate("Pacific/Auckland", fixedNow);
		assert.strictEqual(result, "2025-01-01");
	});

	test("returns the server local date if timezone is not provided (null)", () => {
		const result = dictationTodayDate(null, fixedNow);
		assert.strictEqual(result, expectedFallback);
	});

	test("returns the server local date if timezone is not provided (undefined)", () => {
		const result = dictationTodayDate(undefined, fixedNow);
		assert.strictEqual(result, expectedFallback);
	});

	test("returns the server local date if timezone is empty string", () => {
		const result = dictationTodayDate("", fixedNow);
		assert.strictEqual(result, expectedFallback);
	});

	test("returns the server local date if timezone is invalid", () => {
		// This should throw in Intl.DateTimeFormat and be caught by the try-catch block
		const result = dictationTodayDate("Invalid/Timezone_Name", fixedNow);
		assert.strictEqual(result, expectedFallback);
	});

	test("uses the current Date by default if not provided", () => {
		const result = dictationTodayDate("UTC");
		// We can't strictly assert the exact date since it depends on when the test runs,
		// but we can assert it matches the regex YYYY-MM-DD
		assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
	});
});
