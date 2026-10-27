import { clockTimeToMinutes, minutesToClockTime } from "@dental/shared";

/**
 * Parse HH:MM to minutes from midnight via @dental/shared SSOT
 */
export function timeStringToMinutes(time: string): number {
	if (!time || !time.includes(":")) return 0;
	return clockTimeToMinutes(time);
}

/**
 * Convert minutes from midnight to HH:MM via @dental/shared SSOT
 */
export const minutesToTimeString = minutesToClockTime;

/**
 * Check if two time intervals overlap on the same calendar date
 */
export function doIntervalsOverlap(
	start1: string,
	end1: string,
	start2: string,
	end2: string,
): boolean {
	let s1 = timeStringToMinutes(start1);
	let e1 = timeStringToMinutes(end1);
	let s2 = timeStringToMinutes(start2);
	let e2 = timeStringToMinutes(end2);

	// Handle night shift crossing midnight (e.g. 20:00 -> 08:00)
	if (e1 <= s1) e1 += 1440;
	if (e2 <= s2) e2 += 1440;

	return Math.max(s1, s2) < Math.min(e1, e2);
}

/**
 * Calculate shift duration in hours and exact night hours (22:00 to 06:00 per TK RF Article 96)
 */
export function calculateShiftDurationHours(
	startTime: string,
	endTime: string,
	breakMinutes = 0,
): { durationHours: number; nightHours: number } {
	if (!startTime || !endTime) {
		return { durationHours: 0, nightHours: 0 };
	}

	const startMins = timeStringToMinutes(startTime);
	let endMins = timeStringToMinutes(endTime);

	// Handle overnight shifts crossing midnight
	if (endMins <= startMins) {
		endMins += 1440;
	}

	const rawMinutes = Math.max(0, endMins - startMins - breakMinutes);
	const durationHours = Math.round((rawMinutes / 60) * 100) / 100;

	// Calculate night minutes (22:00 to 06:00)
	let nightMinutes = 0;
	for (let m = startMins; m < endMins; m += 1) {
		const modMinute = m % 1440;
		if (modMinute >= 1320 || modMinute < 360) {
			nightMinutes += 1;
		}
	}

	const nightHours = Math.round((nightMinutes / 60) * 100) / 100;

	return { durationHours, nightHours };
}

/**
 * Get ISO week number and year from a date string (YYYY-MM-DD)
 */
export function getIsoWeekKey(dateIso: string): string {
	if (!dateIso || !dateIso.includes("-")) return "2026-W01";
	const parts = dateIso.split("-").map((p) => Number.parseInt(p, 10));
	const y = parts[0] || 2026;
	const m = parts[1] || 1;
	const d = parts[2] || 1;

	const date = new Date(Date.UTC(y, m - 1, d));
	const dayNum = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
