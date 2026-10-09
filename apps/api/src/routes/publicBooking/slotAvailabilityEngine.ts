import {
	type DaySchedule,
	type DoctorScheduleWindow,
	DEFAULT_CLOSE_MINUTE,
	DEFAULT_OPEN_MINUTE,
	weekdayKeys,
} from "./types.js";

export function clockToMinutes(value: unknown): number | null {
	if (typeof value !== "string") return null;
	const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
	if (!match) return null;
	const hours = Number.parseInt(match[1] as string, 10);
	const minutes = Number.parseInt(match[2] as string, 10);
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
	return hours * 60 + minutes;
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
	const schedule =
		clinicSchedule && typeof clinicSchedule === "object"
			? (clinicSchedule as Record<string, unknown>)
			: null;
	const day =
		schedule && key && typeof schedule[key] === "object"
			? (schedule[key] as Record<string, unknown>)
			: null;

	if (!day) {
		const workdayOpen = clockToMinutes(schedule?.workdayStart);
		const workdayClose = clockToMinutes(schedule?.workdayEnd);
		if (
			workdayOpen !== null &&
			workdayClose !== null &&
			workdayClose > workdayOpen
		) {
			const settingsWorkingDays = Array.isArray(schedule?.workingDays)
				? (schedule.workingDays as unknown[]).map((value) => Number(value))
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
				? (schedule.workingDays as unknown[]).map((value) => Number(value))
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
	const closeMinute = clockToMinutes(day.endsAt) ?? DEFAULT_CLOSE_MINUTE;
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

	const entry = workingHoursRaw.find(
		(item) => typeof item === "object" && item !== null && Number(item.weekday) === weekday,
	);

	if (!entry || entry.enabled === false) {
		return { isWorking: false, startMinute: 0, endMinute: 0 };
	}

	const startMinute = clockToMinutes(entry.start) ?? clinicDay.openMinute;
	const endMinute = clockToMinutes(entry.end) ?? clinicDay.closeMinute;

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

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

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
		if (!match) return 0;
		const sign = match[1] === "-" ? -1 : 1;
		const hours = Number.parseInt(match[2] as string, 10);
		const minutes = match[3] ? Number.parseInt(match[3], 10) : 0;
		return sign * (hours * 60 + minutes);
	} catch (err) {
		console.error("[Dente] timezoneOffsetMinutes failed:", err);
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
	const [year, month, day] = date.split("-").map((n) => Number.parseInt(n, 10));
	const hour = Math.floor(minuteOfDay / 60);
	const minute = minuteOfDay % 60;
	const naiveUtc = Date.UTC(
		year as number,
		(month as number) - 1,
		day as number,
		hour,
		minute,
	);
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
