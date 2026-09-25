/**
 * DENTE Dental CRM — Week Copy, Clear & Rotation Operations
 * Compliance: StomX / DentalPRO Parity, Mandates 8e, 8k, 8n
 */

import type { DoctorShift } from "./doctorShiftRosterEngine";

/**
 * Add days to YYYY-MM-DD date string using UTC arithmetic (timezone-safe)
 */
export function addDaysToDateIso(dateIso: string, daysToAdd: number): string {
	const parts = (dateIso || "").split("-").map(Number);
	const y = parts[0] || 2026;
	const m = parts[1] || 8;
	const d = parts[2] || 24;
	const target = new Date(Date.UTC(y, m - 1, d + daysToAdd));
	return target.toISOString().substring(0, 10);
}

/**
 * Get 7 days (Monday to Sunday) of the week as ISO date strings
 */
export function getWeekDaysIso(weekStartDateIso: string): string[] {
	const days: string[] = [];
	for (let i = 0; i < 7; i++) {
		days.push(addDaysToDateIso(weekStartDateIso, i));
	}
	return days;
}

/**
 * 1-Click Copy Week Shifts to Target Week (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 *
 * Copies all shifts of source week to target week (+7 days or arbitrary target week Monday).
 * Preserves doctorId, doctorName, doctorRole, assistantId, assistantName,
 * cabinetId, chairId, archetypeId, startTime, endTime, durationHours, breakMinutes,
 * isNight, nightHours, customNotes.
 *
 * Replaces existing shifts on target week dates to prevent duplicate overlaps.
 */
export function copyWeekShiftsToTargetWeek(
	currentShifts: DoctorShift[],
	sourceWeekStartDateIso: string,
	targetWeekStartDateIso: string,
): DoctorShift[] {
	const sourceDays = getWeekDaysIso(sourceWeekStartDateIso);
	const targetDays = getWeekDaysIso(targetWeekStartDateIso);
	const targetDaysSet = new Set(targetDays);

	const getShiftDate = (s: DoctorShift): string =>
		s.dateIso || (s as unknown as { date?: string }).date || "";

	const sourceShifts = currentShifts.filter(
		(s) => sourceDays.includes(getShiftDate(s)) && s.status !== "cancelled",
	);

	if (sourceShifts.length === 0) {
		return currentShifts;
	}

	// Filter out existing shifts in the target week
	const remainingShifts = currentShifts.filter(
		(s) => !targetDaysSet.has(getShiftDate(s)),
	);

	// Generate copied shifts for the target week
	const newShifts: DoctorShift[] = sourceShifts.map((s, idx) => {
		const shiftDate = getShiftDate(s);
		const dayIdx = sourceDays.indexOf(shiftDate);
		const targetDateIso = targetDays[dayIdx] || targetDays[0]!;
		return {
			...s,
			id: `shift-${targetDateIso}-${s.chairId}-${s.doctorId}-${s.startTime.replace(":", "")}-${s.endTime.replace(":", "")}-${idx}`,
			dateIso: targetDateIso,
			status: "scheduled",
		};
	});

	return [...remainingShifts, ...newShifts];
}

/**
 * 1-Click Copy Week Shifts to Next 4 Weeks / Month (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 *
 * Iteratively copies the source week shifts across the next `weeksCount` (default: 4) weeks.
 */
export function copyWeekShiftsToMonth(
	currentShifts: DoctorShift[],
	sourceWeekStartDateIso: string,
	weeksCount = 4,
): DoctorShift[] {
	let accumulated = currentShifts;
	for (let w = 1; w <= weeksCount; w++) {
		const targetMonday = addDaysToDateIso(sourceWeekStartDateIso, w * 7);
		accumulated = copyWeekShiftsToTargetWeek(
			accumulated,
			sourceWeekStartDateIso,
			targetMonday,
		);
	}
	return accumulated;
}

/**
 * 1-Click Clear Week Shifts (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 *
 * Removes all shifts in the specified week, returning a clean slate for the week.
 */
export function clearWeekShifts(
	currentShifts: DoctorShift[],
	weekStartDateIso: string,
): DoctorShift[] {
	const weekDays = getWeekDaysIso(weekStartDateIso);
	const weekDaysSet = new Set(weekDays);
	const getShiftDate = (s: DoctorShift): string =>
		s.dateIso || (s as unknown as { date?: string }).date || "";
	return currentShifts.filter((s) => !weekDaysSet.has(getShiftDate(s)));
}

/**
 * 1-Click Shift Rotation (Утро ⇄ Вечер) (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 *
 * Rotates morning shifts to evening shifts, and evening shifts to morning shifts
 * for the specified week (and optionally restricted to a specific chairId).
 * Morning (08:00–14:00, "morning_shift") ⇄ Evening (14:00–20:00, "evening_shift").
 */
export function rotateWeekShifts(
	currentShifts: DoctorShift[],
	weekStartDateIso: string,
	options?: { chairId?: string },
): DoctorShift[] {
	const weekDays = getWeekDaysIso(weekStartDateIso);
	const weekDaysSet = new Set(weekDays);
	const getShiftDate = (s: DoctorShift): string =>
		s.dateIso || (s as unknown as { date?: string }).date || "";

	return currentShifts.map((s) => {
		const shiftDate = getShiftDate(s);
		if (!weekDaysSet.has(shiftDate) || s.status === "cancelled") {
			return s;
		}
		if (options?.chairId && s.chairId !== options.chairId) {
			return s;
		}

		const isMorning =
			s.archetypeId === "morning_shift" ||
			(s.startTime < "13:00" && s.endTime <= "16:00");
		const isEvening =
			s.archetypeId === "evening_shift" ||
			(s.startTime >= "13:00" && s.endTime > "16:00");

		if (isMorning) {
			return {
				...s,
				startTime: "14:00",
				endTime: "20:00",
				durationHours: 6.0,
				breakMinutes: 0,
				archetypeId: "evening_shift",
				customNotes:
					(s.customNotes || "").replace(/Утро.*?(?=[•,;]|$)/i, "Вечер 14:00–20:00") ||
					"Вечер 14:00–20:00",
			};
		}
		if (isEvening) {
			return {
				...s,
				startTime: "08:00",
				endTime: "14:00",
				durationHours: 6.0,
				breakMinutes: 0,
				archetypeId: "morning_shift",
				customNotes:
					(s.customNotes || "").replace(/Вечер.*?(?=[•,;]|$)/i, "Утро 08:00–14:00") ||
					"Утро 08:00–14:00",
			};
		}
		return s;
	});
}
