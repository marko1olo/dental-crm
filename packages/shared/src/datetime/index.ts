/**
 * @dental/shared/datetime — Canonical Date & Time Parsing, Validation & Scheduling Helpers.
 * Compliant with ISO 8601, Russian DD.MM.YYYY formats, and clock time arithmetic.
 */

import { z } from "zod";

export const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export type ClockTime = z.infer<typeof clockTimeSchema>;

export const weekdayIndexSchema = z.number().int().min(0).max(6);
export type WeekdayIndex = z.infer<typeof weekdayIndexSchema>;

export function clockTimeToMinutes(value: string): number {
	const [hours = "0", minutes = "0"] = value.split(":");
	return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

export function isValidDateParts(year: number, month: number, day: number): boolean {
	const parsed = new Date(Date.UTC(year, month - 1, day));
	return (
		parsed.getUTCFullYear() === year &&
		parsed.getUTCMonth() === month - 1 &&
		parsed.getUTCDate() === day
	);
}

export function isValidTimeParts(
	hourText?: string,
	minuteText?: string,
	secondText?: string,
): boolean {
	if (
		hourText === undefined &&
		minuteText === undefined &&
		secondText === undefined
	) {
		return true;
	}
	if (hourText === undefined || minuteText === undefined) return false;
	const hour = Number(hourText);
	const minute = Number(minuteText);
	const second = secondText === undefined ? 0 : Number(secondText);
	return (
		Number.isInteger(hour) &&
		Number.isInteger(minute) &&
		Number.isInteger(second) &&
		hour >= 0 &&
		hour <= 23 &&
		minute >= 0 &&
		minute <= 59 &&
		second >= 0 &&
		second <= 59
	);
}

export function isValidTimezoneOffset(value?: string): boolean {
	if (value === undefined || value === "Z") return true;
	const match = /^([+-])(\d{2}):?(\d{2})$/.exec(value);
	if (!match) return false;
	const hour = Number(match[2]);
	const minute = Number(match[3]);
	return (
		Number.isInteger(hour) &&
		Number.isInteger(minute) &&
		hour >= 0 &&
		hour <= 23 &&
		minute >= 0 &&
		minute <= 59
	);
}

export function isDateLikeString(value: string): boolean {
	const trimmed = value.trim();
	const iso =
		/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/.exec(
			trimmed,
		);
	if (iso) {
		return (
			isValidDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3])) &&
			isValidTimeParts(iso[4], iso[5], iso[6]) &&
			isValidTimezoneOffset(iso[7])
		);
	}
	const ru =
		/^(\d{2})\.(\d{2})\.(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(
			trimmed,
		);
	if (ru) {
		return (
			isValidDateParts(Number(ru[3]), Number(ru[2]), Number(ru[1])) &&
			isValidTimeParts(ru[4], ru[5], ru[6])
		);
	}
	return false;
}

export function normalizeDateOnlyString(value: string): string | null {
	const trimmed = value.trim();
	const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
	if (iso && isValidDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))) {
		return `${iso[1]}-${iso[2]}-${iso[3]}`;
	}
	const ru = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed);
	if (ru && isValidDateParts(Number(ru[3]), Number(ru[2]), Number(ru[1]))) {
		return `${ru[3]}-${ru[2]}-${ru[1]}`;
	}
	return null;
}

export function todayIsoDateOnly(): string {
	const now = new Date();
	const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 10);
}

export function isPastOrTodayDateOnlyString(value: string): boolean {
	const normalized = normalizeDateOnlyString(value);
	return Boolean(normalized && normalized <= todayIsoDateOnly());
}
