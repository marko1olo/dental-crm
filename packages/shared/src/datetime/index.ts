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

/**
 * Convert minutes from midnight (0..1439) to HH:mm string.
 */
export function minutesToClockTime(minutes: number): string {
	if (!Number.isFinite(minutes)) return "00:00";
	const normalized = ((Math.floor(minutes) % 1440) + 1440) % 1440;
	const h = Math.floor(normalized / 60);
	const m = normalized % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Safely parse clock time string (e.g. "09:30" or "9:30") to minutes from midnight (0..1439).
 * Returns null for invalid or out-of-range strings.
 */
export function parseTimeToMinutes(value: string | null | undefined): number | null {
	if (!value) return null;
	const trimmed = value.trim();
	const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
	if (!match) return null;
	const hours = Number.parseInt(match[1] ?? "", 10);
	const minutes = Number.parseInt(match[2] ?? "", 10);
	if (
		!Number.isFinite(hours) ||
		!Number.isFinite(minutes) ||
		hours < 0 ||
		hours > 23 ||
		minutes < 0 ||
		minutes > 59
	) {
		return null;
	}
	return hours * 60 + minutes;
}

/**
 * Format a Date, ISO string or timestamp to canonical ISO date YYYY-MM-DD.
 */
export function formatIsoDate(date: Date | string | number = new Date()): string {
	if (!date) return todayIsoDateOnly();
	if (typeof date === "string") {
		const normalized = normalizeDateOnlyString(date);
		if (normalized) return normalized;
	}
	const d = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(d.getTime())) return todayIsoDateOnly();
	const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 10);
}

/**
 * Format date to Russian GOST format: DD.MM.YYYY (e.g. "24.05.2026").
 * Returns "—" for invalid/null/empty inputs.
 */
export function formatDateRu(
	value: string | Date | number | null | undefined,
): string {
	if (!value) return "—";

	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return "—";
		// Fast path for ISO date YYYY-MM-DD
		if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
			const [y, m, d] = trimmed.slice(0, 10).split("-");
			if (y && m && d) return `${d}.${m}.${y}`;
		}
		// Already in RU format DD.MM.YYYY
		if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
			return trimmed;
		}
	}

	const d = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(d.getTime())) return "—";

	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	return `${day}.${month}.${year}`;
}

/**
 * Format date and time to Russian clinical format: DD.MM.YYYY HH:mm.
 * Returns "—" for invalid/null/empty inputs.
 */
export function formatDateTimeRu(
	value: string | Date | number | null | undefined,
): string {
	if (!value) return "—";
	const d = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(d.getTime())) return "—";

	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	const hours = String(d.getHours()).padStart(2, "0");
	const minutes = String(d.getMinutes()).padStart(2, "0");
	return `${day}.${month}.${year} ${hours}:${minutes}`;
}

