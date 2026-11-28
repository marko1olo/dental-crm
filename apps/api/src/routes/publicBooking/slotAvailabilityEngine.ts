import { BoundedTtlMap } from "../../lib/boundedTtlMap.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import {
	type DaySchedule,
	type DoctorScheduleWindow,
	DEFAULT_CLOSE_MINUTE,
	DEFAULT_OPEN_MINUTE,
	weekdayKeys,
} from "./types.js";

const logger = createApiLogger("slotAvailabilityEngine");

function asPlainRecord(value: unknown): Record<string, unknown> | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return null;
	}
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(value)) {
		out[k] = v;
	}
	return out;
}

export function clockToMinutes(value: unknown): number | null {
	if (typeof value !== "string") return null;
	const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
	if (!match || !match[1] || !match[2]) return null;
	const hours = Number.parseInt(match[1], 10);
	const minutes = Number.parseInt(match[2], 10);
	if (hours === 24 && minutes === 0) return 1440;
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
	return hours * 60 + minutes;
}

function resolveCloseMinutes(value: unknown, openMinute: number): number | null {
	const parsed = clockToMinutes(value);
	if (parsed === null) return null;
	if (parsed === 0 && openMinute > 0) return 1440;
	return parsed;
}

/**
 * Resolves the working window (in local minutes-of-day) for a given weekday
 * from the organization clinicSchedule blob.
 */
export function resolveDaySchedule(
	clinicSchedule: unknown,
	weekday: number,
): DaySchedule {
	const key = weekdayKeys[weekday];
	const schedule = asPlainRecord(clinicSchedule);
	const day = schedule && key ? asPlainRecord(schedule[key]) : null;

	if (!day) {
		const workdayOpen = clockToMinutes(schedule?.workdayStart);
		const workdayClose =
			workdayOpen !== null
				? resolveCloseMinutes(schedule?.workdayEnd, workdayOpen)
				: clockToMinutes(schedule?.workdayEnd);
		if (
			workdayOpen !== null &&
			workdayClose !== null &&
			workdayClose > workdayOpen
		) {
			const settingsWorkingDays = Array.isArray(schedule?.workingDays)
				? schedule.workingDays.map((value) => Number(value))
				: null;
			return {
				isWorking:
					settingsWorkingDays && settingsWorkingDays.length > 0
						? settingsWorkingDays.includes(weekday)
						: weekday !== 0,
				openMinute: workdayOpen,
				closeMinute: workdayClose,
			};
		}

		const workHours = schedule?.workHours;
		if (Array.isArray(workHours) && workHours.length === 2) {
			const openHour = Number(workHours[0]);
			const closeHour = Number(workHours[1]);
			const workingDays = Array.isArray(schedule?.workingDays)
				? schedule.workingDays.map((value) => Number(value))
				: null;
			if (
				Number.isFinite(openHour) &&
				Number.isFinite(closeHour) &&
				closeHour > openHour
			) {
				return {
					isWorking: workingDays
						? workingDays.includes(weekday)
						: weekday !== 0,
					openMinute: Math.round(openHour * 60),
					closeMinute: Math.round(closeHour * 60),
				};
			}
		}

		return {
			isWorking: weekday !== 0,
			openMinute: DEFAULT_OPEN_MINUTE,
			closeMinute: DEFAULT_CLOSE_MINUTE,
		};
	}

	const openMinute = clockToMinutes(day.startsAt) ?? DEFAULT_OPEN_MINUTE;
	const closeMinute = resolveCloseMinutes(day.endsAt, openMinute) ?? DEFAULT_CLOSE_MINUTE;
	return {
		isWorking: day.isWorking !== false,
		openMinute,
		closeMinute,
	};
}

/**
 * Parses a doctor's users.workingHours JSONB blob for a specific weekday.
 *
 * Contract:
 * - If workingHours is null/undefined/empty: doctor defaults to working the clinic's hours.
 * - If workingHours is an array: matches the item where item.weekday === calendarWeekday.
 *   - If item.enabled is false or no entry exists for this weekday -> isWorking = false.
 *   - If item.enabled is true -> isWorking = true, startMinute/endMinute from item.start/item.end.
 */
export function resolveDoctorDaySchedule(
	workingHoursRaw: unknown,
	weekday: number,
	clinicDay: DaySchedule,
): DoctorScheduleWindow {
	if (!clinicDay.isWorking) {
		return { isWorking: false, startMinute: 0, endMinute: 0 };
	}

	if (!Array.isArray(workingHoursRaw) || workingHoursRaw.length === 0) {
		// Inherit clinic schedule defaults
		return {
			isWorking: true,
			startMinute: clinicDay.openMinute,
			endMinute: clinicDay.closeMinute,
		};
	}

	let matchedEntry: Record<string, unknown> | null = null;
	for (const item of workingHoursRaw) {
		const rec = asPlainRecord(item);
		if (rec && Number(rec.weekday) === weekday) {
			matchedEntry = rec;
			break;
		}
	}

	if (!matchedEntry || matchedEntry.enabled === false) {
		return { isWorking: false, startMinute: 0, endMinute: 0 };
	}

	const startMinute = clockToMinutes(matchedEntry.start) ?? clinicDay.openMinute;
	const endMinute = resolveCloseMinutes(matchedEntry.end, startMinute) ?? clinicDay.closeMinute;

	if (endMinute <= startMinute) {
		return { isWorking: false, startMinute: 0, endMinute: 0 };
	}

	return {
		isWorking: true,
		startMinute,
		endMinute,
	};
}

/**
 * Calculates the exact interval intersection between clinic schedule and doctor hours:
 * I_effective = I_clinic ∩ I_doctor
 */
export function intersectWorkingWindows(
	clinicSchedule: DaySchedule,
	doctorWindow: DoctorScheduleWindow,
	slotMinutes: number,
): { isWorking: boolean; startMinute: number; endMinute: number } {
	if (!clinicSchedule.isWorking || !doctorWindow.isWorking) {
		return { isWorking: false, startMinute: 0, endMinute: 0 };
	}

	const effectiveStart = Math.max(clinicSchedule.openMinute, doctorWindow.startMinute);
	const effectiveEnd = Math.min(clinicSchedule.closeMinute, doctorWindow.endMinute);

	if (effectiveEnd - effectiveStart < slotMinutes) {
		return { isWorking: false, startMinute: 0, endMinute: 0 };
	}

	return {
		isWorking: true,
		startMinute: effectiveStart,
		endMinute: effectiveEnd,
	};
}

const offsetFormatters = new BoundedTtlMap<string, Intl.DateTimeFormat>({
	maxEntries: 64,
	ttlMs: 24 * 60 * 60 * 1000,
});

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
	const cached = offsetFormatters.get(timeZone);
	if (cached) return cached;
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone,
		timeZoneName: "longOffset",
	});
	offsetFormatters.set(timeZone, formatter);
	return formatter;
}

export function timezoneOffsetMinutes(instant: Date, timeZone: string): number {
	try {
		const parts = getOffsetFormatter(timeZone).formatToParts(instant);
		const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
		const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
		if (!match || !match[2]) return 0;
		const sign = match[1] === "-" ? -1 : 1;
		const hours = Number.parseInt(match[2], 10);
		const minutes = match[3] ? Number.parseInt(match[3], 10) : 0;
		return sign * (hours * 60 + minutes);
	} catch (err) {
		logger.warn(
			{ err: safeLogError(err), timeZone },
			"[slotAvailabilityEngine] Invalid timezone in timezoneOffsetMinutes, falling back to UTC",
		);
		return 0;
	}
}

export function utcToLocalWallTime(
	instant: Date,
	timeZone: string,
): { weekday: number; hours: number; minutes: number } {
	const offset = timezoneOffsetMinutes(instant, timeZone);
	const shifted = new Date(instant.getTime() + offset * 60_000);
	return {
		weekday: shifted.getUTCDay(),
		hours: shifted.getUTCHours(),
		minutes: shifted.getUTCMinutes(),
	};
}

export function localWallTimeToUtc(
	date: string,
	minuteOfDay: number,
	timeZone: string,
): Date {
	const [year = 1970, month = 1, day = 1] = date.split("-").map((n) => Number.parseInt(n, 10));
	const hour = Math.floor(minuteOfDay / 60);
	const minute = minuteOfDay % 60;
	const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
	let offset = timezoneOffsetMinutes(new Date(naiveUtc), timeZone);
	let corrected = naiveUtc - offset * 60_000;
	const refinedOffset = timezoneOffsetMinutes(new Date(corrected), timeZone);
	if (refinedOffset !== offset) {
		offset = refinedOffset;
		corrected = naiveUtc - offset * 60_000;
	}
	return new Date(corrected);
}

export function normalizePhoneDigits(phone: string): string {
	const digits = String(phone ?? "").replace(/\D/g, "");
	const national =
		digits.startsWith("8") && digits.length === 11
			? `7${digits.slice(1)}`
			: digits;
	return national.length > 10 ? national.slice(-10) : national;
}

export interface ChairOccupiedInterval {
	chairId: string;
	startMs: number;
	endMs: number;
}

/**
 * Checks whether at least one active physical chair in the clinic is free
 * during the [slotStartMs, slotEndMs] window.
 *
 * If activeChairIds is empty, physical chairs do not constrain appointment scheduling.
 * If activeChairIds has chairs, at least one chair must be free from conflicting appointments.
 */
export function isAnyChairAvailable(
	activeChairIds: readonly string[],
	occupiedChairIntervals: readonly ChairOccupiedInterval[],
	slotStartMs: number,
	slotEndMs: number,
): boolean {
	if (activeChairIds.length === 0) {
		return true;
	}
	for (const chairId of activeChairIds) {
		const isOccupied = occupiedChairIntervals.some(
			(occ) =>
				occ.chairId === chairId &&
				slotStartMs < occ.endMs &&
				slotEndMs > occ.startMs,
		);
		if (!isOccupied) {
			return true;
		}
	}
	return false;
}

