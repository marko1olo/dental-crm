import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatDateTime, formatShortDate, formatTime } from "./formatting";

describe("formatting", () => {
	describe("formatTime", () => {
		test("formats time in Europe/Samara timezone", () => {
			assert.equal(formatTime("2023-10-25T14:30:00Z"), "18:30");
		});

		test("handles timezone boundaries (shifts to next day if needed)", () => {
			// 22:30 UTC is 02:30 Samara time next day
			assert.equal(formatTime("2023-10-25T22:30:00Z"), "02:30");
		});

		test("throws on invalid date string", () => {
			assert.throws(() => formatTime("invalid-date"), RangeError);
		});
	});

	describe("formatDateTime", () => {
		test("formats date and time in Europe/Samara timezone", () => {
			assert.equal(formatDateTime("2023-10-25T14:30:00Z"), "25.10, 18:30");
		});

		test("handles timezone boundaries correctly", () => {
			assert.equal(formatDateTime("2023-10-25T22:30:00Z"), "26.10, 02:30");
		});

		test("throws on invalid date string", () => {
			assert.throws(() => formatDateTime("invalid-date"), RangeError);
		});
	});

	describe("formatShortDate", () => {
		test("formats short date in Europe/Samara timezone", () => {
			assert.equal(formatShortDate("2023-10-25T14:30:00Z"), "25.10.23");
		});

		test("handles timezone boundaries correctly", () => {
			assert.equal(formatShortDate("2023-10-25T22:30:00Z"), "26.10.23");
		});

		test("throws on invalid date string", () => {
			assert.throws(() => formatShortDate("invalid-date"), RangeError);
		});
	});
});
