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

/**
 * Resolve valid IANA timeZone string or fallback.
 */
export function resolveValidIanaTimeZone(
	timeZone: string | null | undefined,
	fallbackTimeZone = "Europe/Samara",
): string {
	const candidate = timeZone?.trim();
	if (candidate) {
		try {
			new Intl.DateTimeFormat("en-US", { timeZone: candidate });
			return candidate;
		} catch {
			// invalid IANA zone -> use fallback
		}
	}
	return fallbackTimeZone;
}

/**
 * Format instant into canonical calendar key YYYY-MM-DD in clinic timeZone
 * (or machine local time when timeZone is null/undefined). Never shifts via raw UTC toISOString.
 */
export function formatDateKeyInTimeZone(
	moment: Date | string | number = new Date(),
	timeZone?: string | null,
): string {
	const d = moment instanceof Date ? moment : new Date(moment);
	if (Number.isNaN(d.getTime())) {
		return formatDateKeyInTimeZone(new Date(), timeZone);
	}
	const trimmedZone = timeZone?.trim();
	if (trimmedZone) {
		try {
			const parts = new Intl.DateTimeFormat("en-CA", {
				timeZone: trimmedZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			}).formatToParts(d);
			const y = parts.find((p) => p.type === "year")?.value;
			const m = parts.find((p) => p.type === "month")?.value;
			const day = parts.find((p) => p.type === "day")?.value;
			if (y && m && day) return `${y}-${m}-${day}`;
		} catch {
			// fallback to local calendar parts below
		}
	}
	const pad = (v: number) => String(v).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Calendar-day shift for YYYY-MM-DD (handles month/year rollovers without DST/24h drift).
 */
export function shiftCalendarDay(dateKey: string, deltaDays: number): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateKey.trim());
	if (!match) return dateKey;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (!isValidDateParts(year, month, day)) return dateKey;
	return new Date(Date.UTC(year, month - 1, day + deltaDays))
		.toISOString()
		.slice(0, 10);
}

/**
 * Today's YYYY-MM-DD in clinic timeZone (or local machine timeZone if omitted).
 */
export function todayDateKeyInTimeZone(
	timeZone?: string | null,
	now: Date = new Date(),
): string {
	return formatDateKeyInTimeZone(now, timeZone);
}

/**
 * Tomorrow's YYYY-MM-DD in clinic timeZone (calendar-shifted, never +86400s UTC slice).
 */
export function tomorrowDateKeyInTimeZone(
	timeZone?: string | null,
	now: Date = new Date(),
): string {
	return shiftCalendarDay(formatDateKeyInTimeZone(now, timeZone), 1);
}

/**
 * Extract wall-clock dateKey, hours, minutes, HH:mm and weekday (0=Sun..6=Sat) in timeZone.
 */
export function extractWallTimePartsInTimeZone(
	moment: Date | string | number,
	timeZone?: string | null,
): {
	readonly dateKey: string;
	readonly hours: number;
	readonly minutes: number;
	readonly hm: string;
	readonly weekday: number;
} | null {
	const d = moment instanceof Date ? moment : new Date(moment);
	if (Number.isNaN(d.getTime())) return null;

	const trimmedZone = timeZone?.trim();
	if (trimmedZone) {
		try {
			const parts = new Intl.DateTimeFormat("en-CA", {
				timeZone: trimmedZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			}).formatToParts(d);
			const byType = new Map(parts.map((p) => [p.type, p.value]));
			const year = Number(byType.get("year"));
			const month = Number(byType.get("month"));
			const day = Number(byType.get("day"));
			const rawHour = Number(byType.get("hour"));
			const hours = rawHour === 24 ? 0 : rawHour;
			const minutes = Number(byType.get("minute"));
			if (
				Number.isFinite(year) &&
				Number.isFinite(month) &&
				Number.isFinite(day) &&
				Number.isFinite(hours) &&
				Number.isFinite(minutes)
			) {
				const dateKey = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
				const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
				const hm = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
				return { dateKey, hours, minutes, hm, weekday };
			}
		} catch {
			// fallback below
		}
	}

	const year = d.getFullYear();
	const month = d.getMonth() + 1;
	const day = d.getDate();
	const hours = d.getHours();
	const minutes = d.getMinutes();
	const dateKey = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	const hm = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
	return { dateKey, hours, minutes, hm, weekday: d.getDay() };
}

/**
 * Convert local wall clock (YYYY-MM-DD, HH, MM) in a specific IANA timeZone to UTC Date.
 */
export function wallClockToUtcInTimeZone(
	dateKey: string,
	hours: number,
	minutes: number,
	timeZone: string,
): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateKey.trim());
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (!isValidDateParts(year, month, day)) return null;

	const utcGuessMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
	try {
		const dtf = new Intl.DateTimeFormat("en-US", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});
		const offsetMsAt = (ms: number): number => {
			const parts = dtf.formatToParts(new Date(ms));
			const map: Record<string, number> = {};
			for (const p of parts) {
				if (p.type !== "literal") map[p.type] = Number.parseInt(p.value, 10);
			}
			const h = map.hour === 24 ? 0 : (map.hour ?? 0);
			const wallMs = Date.UTC(
				map.year ?? year,
				(map.month ?? month) - 1,
				map.day ?? day,
				h,
				map.minute ?? minutes,
				map.second ?? 0,
			);
			return wallMs - ms;
		};
		const offset1 = offsetMsAt(utcGuessMs);
		const candidate = utcGuessMs - offset1;
		const offset2 = offsetMsAt(candidate);
		return new Date(utcGuessMs - offset2);
	} catch {
		return new Date(utcGuessMs);
	}
}

/**
 * Compute start-of-period threshold in clinic IANA timeZone for appointments query (?period=...).
 */
export function getPeriodStartInTimeZone(
	period: "day" | "week" | "month" | "quarter" | "year",
	timeZone: string,
	now: Date = new Date(),
): Date {
	const resolvedTz = resolveValidIanaTimeZone(timeZone);
	const todayKey = formatDateKeyInTimeZone(now, resolvedTz);
	const [yStr, mStr] = todayKey.split("-");
	const year = Number(yStr);
	const month = Number(mStr);

	if (period === "day") {
		return wallClockToUtcInTimeZone(todayKey, 0, 0, resolvedTz) ?? now;
	}
	if (period === "week") {
		const weekAgoKey = shiftCalendarDay(todayKey, -7);
		return wallClockToUtcInTimeZone(weekAgoKey, 0, 0, resolvedTz) ?? new Date(now.getTime() - 7 * 86_400_000);
	}
	if (period === "month") {
		const firstOfMonth = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
		return wallClockToUtcInTimeZone(firstOfMonth, 0, 0, resolvedTz) ?? now;
	}
	if (period === "quarter") {
		const qMonth = Math.floor((month - 1) / 3) * 3 + 1;
		const firstOfQuarter = `${String(year).padStart(4, "0")}-${String(qMonth).padStart(2, "0")}-01`;
		return wallClockToUtcInTimeZone(firstOfQuarter, 0, 0, resolvedTz) ?? now;
	}
	const firstOfYear = `${String(year).padStart(4, "0")}-01-01`;
	return wallClockToUtcInTimeZone(firstOfYear, 0, 0, resolvedTz) ?? now;
}

/**
 * Format clock time HH:mm in clinic timeZone.
 */
export function formatTimeInTimeZone(
	moment: Date | string | number,
	timeZone?: string | null,
	locale = "ru-RU",
): string {
	const d = moment instanceof Date ? moment : new Date(moment);
	if (Number.isNaN(d.getTime())) return "—";
	const tz = timeZone?.trim();
	try {
		return new Intl.DateTimeFormat(locale, {
			hour: "2-digit",
			minute: "2-digit",
			...(tz ? { timeZone: tz } : {}),
		}).format(d);
	} catch {
		return new Intl.DateTimeFormat(locale, {
			hour: "2-digit",
			minute: "2-digit",
		}).format(d);
	}
}


