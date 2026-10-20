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

import {
	minutesToClockTime,
	parseTimeToMinutes,
	formatIsoDate,
	formatDateRu,
	formatDateTimeRu,
} from "../datetime/index.js";

describe("canonical datetime formatters and minute parsers", () => {
	test("minutesToClockTime converts minute integers to HH:mm string with padding and wrap", () => {
		assert.strictEqual(minutesToClockTime(0), "00:00");
		assert.strictEqual(minutesToClockTime(510), "08:30");
		assert.strictEqual(minutesToClockTime(870), "14:30");
		assert.strictEqual(minutesToClockTime(1439), "23:59");
		assert.strictEqual(minutesToClockTime(1440), "00:00");
	});

	test("parseTimeToMinutes parses HH:mm and rejects malformed values", () => {
		assert.strictEqual(parseTimeToMinutes("00:00"), 0);
		assert.strictEqual(parseTimeToMinutes("08:30"), 510);
		assert.strictEqual(parseTimeToMinutes("14:30"), 870);
		assert.strictEqual(parseTimeToMinutes("23:59"), 1439);
		assert.strictEqual(parseTimeToMinutes("24:00"), null);
		assert.strictEqual(parseTimeToMinutes("12:60"), null);
		assert.strictEqual(parseTimeToMinutes("invalid"), null);
		assert.strictEqual(parseTimeToMinutes(null), null);
	});

	test("formatIsoDate converts dates to YYYY-MM-DD", () => {
		assert.strictEqual(formatIsoDate(new Date(2026, 4, 24)), "2026-05-24");
		assert.strictEqual(formatIsoDate("2026-05-24T14:30:00Z"), "2026-05-24");
		assert.strictEqual(formatIsoDate("24.05.2026"), "2026-05-24");
	});

	test("formatDateRu converts dates to Russian DD.MM.YYYY", () => {
		assert.strictEqual(formatDateRu("2026-05-24"), "24.05.2026");
		assert.strictEqual(formatDateRu("24.05.2026"), "24.05.2026");
		assert.strictEqual(formatDateRu(new Date(2026, 4, 24)), "24.05.2026");
		assert.strictEqual(formatDateRu(null), "—");
		assert.strictEqual(formatDateRu(""), "—");
	});

	test("formatDateTimeRu converts dates to Russian DD.MM.YYYY HH:mm", () => {
		const d = new Date(2026, 4, 24, 14, 30);
		assert.strictEqual(formatDateTimeRu(d), "24.05.2026 14:30");
		assert.strictEqual(formatDateTimeRu(null), "—");
	});
});


