import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	currentLocalDateTimeInputValue as currentLocalDateTimeFromFacade,
	timeZoneDateParts as timeZoneDatePartsFromFacade,
	toDateTimeLocalValue as toDateTimeLocalFromFacade,
} from "../utils/dateUtils";
import {
	addMinutesToClinicDateTimeLocal,
	calendarDayInTimeZone,
	currentLocalDateTimeInputValue,
	dateInputValuePlusDays,
	formatDateTime,
	formatShortDate,
	formatTime,
	fromDateTimeLocalValue,
	isDateInputValue,
	isDateTimeLocalInputValue,
	isoDateLabel,
	isValidDateParts,
	minutesLabel,
	normalizeClockTime,
	shiftCalendarDay,
	timeZoneDateParts,
	timeZoneOffsetMinutes,
	timeZoneOffsetSuffix,
	toDateInputValue,
	toDateTimeLocalValue,
	todayDateInputValue,
	validClockTime,
	weekdayFromDateInput,
} from "../utils/dateTimeUtils";

describe("dateTimeUtils - Single Source of Truth (SSOT)", () => {
	describe("dateUtils facade parity", () => {
		it("re-exports identical functions from dateUtils facade", () => {
			assert.strictEqual(
				currentLocalDateTimeFromFacade,
				currentLocalDateTimeInputValue,
				"currentLocalDateTimeInputValue must match SSOT",
			);
			assert.strictEqual(
				timeZoneDatePartsFromFacade,
				timeZoneDateParts,
				"timeZoneDateParts must match SSOT",
			);
			assert.strictEqual(
				toDateTimeLocalFromFacade,
				toDateTimeLocalValue,
				"toDateTimeLocalValue must match SSOT",
			);
		});
	});

	describe("currentLocalDateTimeInputValue", () => {
		it("returns a valid YYYY-MM-DDTHH:mm string matching local time", () => {
			const value = currentLocalDateTimeInputValue();
			assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
			assert.equal(value.length, 16);
		});
	});

	describe("timeZoneDateParts", () => {
		it("formats ISO date string into specified timezone", () => {
			// 2026-07-29T22:00:00Z -> Moscow (+3) is 2026-07-30T01:00
			const result = timeZoneDateParts(
				"2026-07-29T22:00:00Z",
				"Europe/Moscow",
			);
			assert.equal(result, "2026-07-30T01:00");
		});

		it("returns null for invalid date string", () => {
			assert.equal(timeZoneDateParts("invalid-date", "Europe/Moscow"), null);
		});

		it("returns null when timezone is missing or invalid", () => {
			assert.equal(timeZoneDateParts("2026-07-29T22:00:00Z", null), null);
			assert.equal(timeZoneDateParts("2026-07-29T22:00:00Z", undefined), null);
			assert.equal(timeZoneDateParts("2026-07-29T22:00:00Z", "Invalid/Tz"), null);
		});
	});

	describe("toDateTimeLocalValue", () => {
		it("returns empty string for empty, null, or undefined values", () => {
			assert.equal(toDateTimeLocalValue(null), "");
			assert.equal(toDateTimeLocalValue(undefined), "");
			assert.equal(toDateTimeLocalValue(""), "");
		});

		it("preserves already formatted datetime-local strings (YYYY-MM-DDTHH:mm)", () => {
			const formatted = "2026-08-15T14:30";
			assert.equal(toDateTimeLocalValue(formatted), formatted);
		});

		it("converts ISO UTC strings to target timezone when provided", () => {
			const iso = "2026-07-29T22:00:00Z";
			assert.equal(
				toDateTimeLocalValue(iso, "Europe/Moscow"),
				"2026-07-30T01:00",
			);
			assert.equal(
				toDateTimeLocalValue(iso, "Europe/Samara"),
				"2026-07-30T02:00",
			);
		});

		it("falls back to local machine timezone conversion when timezone is omitted", () => {
			const iso = "2026-07-29T22:00:00Z";
			const res = toDateTimeLocalValue(iso);
			assert.match(res, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		});
	});

	describe("formatting and validation helpers", () => {
		it("validClockTime validates HH:mm format strictly", () => {
			assert.equal(validClockTime("09:00"), true);
			assert.equal(validClockTime("23:59"), true);
			assert.equal(validClockTime("00:00"), true);
			assert.equal(validClockTime("24:00"), false);
			assert.equal(validClockTime("12:60"), false);
			assert.equal(validClockTime("9:00"), false);
		});

		it("normalizeClockTime returns fallback on invalid time", () => {
			assert.equal(normalizeClockTime("09:30", "10:00"), "09:30");
			assert.equal(normalizeClockTime("invalid", "10:00"), "10:00");
		});

		it("isoDateLabel formats YYYY-MM-DD to DD.MM.YYYY", () => {
			assert.equal(isoDateLabel("2026-05-24"), "24.05.2026");
			assert.equal(isoDateLabel(""), "");
			assert.equal(isoDateLabel(null), "");
		});

		it("minutesLabel formats durations nicely", () => {
			assert.equal(minutesLabel(30), "30 мин");
			assert.equal(minutesLabel(60), "1 ч");
			assert.equal(minutesLabel(90), "1 ч 30 мин");
		});

		it("isDateInputValue validates YYYY-MM-DD calendar dates", () => {
			assert.equal(isDateInputValue("2026-05-24"), true);
			assert.equal(isDateInputValue("2026-02-29"), false, "2026 is not leap");
			assert.equal(isDateInputValue("2028-02-29"), true, "2028 is leap");
			assert.equal(isDateInputValue("not-a-date"), false);
		});

		it("isDateTimeLocalInputValue validates YYYY-MM-DDTHH:mm timestamps", () => {
			assert.equal(isDateTimeLocalInputValue("2026-05-24T14:30"), true);
			assert.equal(isDateTimeLocalInputValue("2026-05-24T25:00"), false);
			assert.equal(isDateTimeLocalInputValue("2026-05-24T14:61"), false);
		});

		it("toDateInputValue converts both ISO and Russian dot-separated dates", () => {
			assert.equal(toDateInputValue("2026-05-24"), "2026-05-24");
			assert.equal(toDateInputValue("24.05.2026"), "2026-05-24");
			assert.equal(toDateInputValue(""), "");
		});

		it("fromDateTimeLocalValue converts datetime-local to ISO in timezone", () => {
			const dtLocal = "2026-07-30T01:00";
			const res = fromDateTimeLocalValue(dtLocal, "Europe/Moscow");
			assert.match(res, /^2026-07-30T01:00:00\+03:00$/);
		});

		it("addMinutesToClinicDateTimeLocal correctly shifts time in clinic timezone", () => {
			const dtLocal = "2026-07-30T01:00";
			const res = addMinutesToClinicDateTimeLocal(
				dtLocal,
				30,
				"Europe/Moscow",
			);
			assert.equal(res, "2026-07-30T01:30");
		});
	});
});
