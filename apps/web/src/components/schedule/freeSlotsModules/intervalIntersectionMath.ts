/**
 * intervalIntersectionMath.ts — Mathematical helpers for schedule intervals and working hours.
 */

import type { ClinicWorkingHoursWindow } from "./freeSlotsTypes";

export function clockToHour(value: unknown): number | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(
		typeof value === "string" ? value.trim() : "",
	);
	if (!match) return null;
	const hour = Number(match[1]);
	return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

export function getTimeOfDayCategory(hour: number): "morning" | "day" | "evening" {
	if (hour < 12) return "morning";
	if (hour < 16) return "day";
	return "evening";
}

export function formatRussianDayHeader(dateStr: string): { dateFormatted: string; dayOfWeek: string } {
	const dateObj = new Date(`${dateStr}T12:00:00Z`);
	const formatted = dateObj.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "short",
		weekday: "short",
	});
	const parts = formatted.split(",");
	return {
		dateFormatted: formatted,
		dayOfWeek: parts[0]?.trim() || "",
	};
}

/**
 * Honest clinic working window derived from live settings and doctor profile.
 */
export function deriveClinicWorkingHours(
	dashboard: unknown,
	doctorId?: string | null | undefined,
): ClinicWorkingHoursWindow {
	const settings = (
		dashboard as
			| { clinicSettings?: { profile?: unknown; staff?: unknown } | null }
			| null
			| undefined
	)?.clinicSettings;
	const profile = settings?.profile as
		| {
				scheduleDefaults?: {
					workdayStart?: string | null;
					workdayEnd?: string | null;
					workingDays?: number[] | null;
				} | null;
		  }
		| undefined;
	const parsedStart = clockToHour(profile?.scheduleDefaults?.workdayStart);
	const parsedEnd = clockToHour(profile?.scheduleDefaults?.workdayEnd);
	const clinicStartHour = parsedStart ?? 9;
	const clinicEndHour = parsedEnd && parsedEnd > clinicStartHour ? parsedEnd : 20;

	const result: ClinicWorkingHoursWindow = { clinicStartHour, clinicEndHour };
	const clinicWorkingDays = profile?.scheduleDefaults?.workingDays;
	if (Array.isArray(clinicWorkingDays) && clinicWorkingDays.length > 0) {
		result.workingDays = [...clinicWorkingDays];
	}

	if (!doctorId) return result;

	const staff = settings?.staff as
		| Array<{
				id?: string | null;
				workingHours?:
					| Array<{
							weekday?: number | null;
							enabled?: boolean | null;
							start?: string | null;
							end?: string | null;
					  }>
					| null;
		  }>
		| null
		| undefined;
	const doctor = staff?.find((member) => member?.id === doctorId);
	const doctorSchedule = doctor?.workingHours;
	if (!Array.isArray(doctorSchedule) || doctorSchedule.length === 0) {
		return result;
	}

	const perDay: Record<number, { startHour: number; endHour: number }> = {};
	for (const day of doctorSchedule) {
		if (!day || day.enabled === false) continue;
		const weekday = day.weekday;
		const dayStart = clockToHour(day.start);
		const dayEnd = clockToHour(day.end);
		if (
			typeof weekday !== "number" ||
			!Number.isInteger(weekday) ||
			weekday < 0 ||
			weekday > 6 ||
			dayStart === null ||
			dayEnd === null ||
			dayEnd <= dayStart
		) {
			continue;
		}
		perDay[weekday] = {
			startHour: Math.max(dayStart, clinicStartHour),
			endHour: Math.min(dayEnd, clinicEndHour),
		};
	}

	result.perDayWorkingHours = perDay;
	const configuredDays = Object.keys(perDay).map(Number);
	if (result.workingDays) {
		result.workingDays = result.workingDays.filter((d) => perDay[d] !== undefined);
	} else {
		result.workingDays = configuredDays;
	}
	return result;
}
