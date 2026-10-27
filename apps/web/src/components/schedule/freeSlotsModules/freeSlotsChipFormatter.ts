/**
 * freeSlotsChipFormatter.ts — 1-Click Fast Re-booking algorithm and quick repeat slot chips (+7, +14, +30 days).
 */

import type {
	Appointment,
	DoctorBreakInterval,
	DoctorFreeSlot,
	FindNextDoctorFreeSlotParams,
	QuickRepeatSlotsResult,
} from "./freeSlotsTypes";
import { findDoctorFreeSlots } from "./slotAvailabilityFilters";

/**
 * 1-Click Fast Re-booking algorithm:
 * Instantly finds the nearest free slot at the doctor starting from referenceDate + daysOffset.
 */
export function findNextDoctorFreeSlotAfterDays(
	params: FindNextDoctorFreeSlotParams,
): DoctorFreeSlot | null {
	const refDateStr = params.referenceDate || new Date().toISOString().slice(0, 10);
	const refDate = new Date(`${refDateStr}T00:00:00`);
	refDate.setDate(refDate.getDate() + params.daysOffset);

	const yyyy = refDate.getFullYear();
	const mm = String(refDate.getMonth() + 1).padStart(2, "0");
	const dd = String(refDate.getDate()).padStart(2, "0");
	const startDateStr = `${yyyy}-${mm}-${dd}`;

	const days = findDoctorFreeSlots({
		doctorId: params.doctorId,
		startDate: startDateStr,
		horizonDays: params.maxScanDaysAhead ?? 14,
		durationMinutes: params.durationMinutes ?? 60,
		timeOfDayFilter: params.timeOfDayFilter ?? "all",
		appointments: params.appointments,
		chairs: params.chairs,
		clinicStartHour: params.clinicStartHour ?? 9,
		clinicEndHour: params.clinicEndHour ?? 20,
		stepMinutes: params.stepMinutes ?? 30,
		workingDays: params.workingDays,
		breakIntervals: params.breakIntervals,
	});

	for (const day of days) {
		if (day.isDayOff || day.slots.length === 0) continue;
		const firstSlot = day.slots[0];
		if (firstSlot) return firstSlot;
	}

	return null;
}

/**
 * 1-Click Re-booking presets calculation (+7 days, +14 days, +1 month / 30 days)
 * for the same doctor with single-pass evaluation.
 */
export function findQuickRepeatSlotsForDoctor(params: {
	readonly doctorId?: string | null | undefined;
	readonly referenceDate?: string | undefined;
	readonly durationMinutes?: number | undefined;
	readonly appointments: readonly Appointment[];
	readonly chairs: readonly { id: string; name: string; active?: boolean | undefined }[];
	readonly clinicStartHour?: number | undefined;
	readonly clinicEndHour?: number | undefined;
	readonly stepMinutes?: number | undefined;
	readonly workingDays?: readonly number[] | undefined;
	readonly breakIntervals?: readonly DoctorBreakInterval[] | undefined;
}): QuickRepeatSlotsResult {
	const slot7Days = findNextDoctorFreeSlotAfterDays({ ...params, daysOffset: 7 });
	const slot14Days = findNextDoctorFreeSlotAfterDays({ ...params, daysOffset: 14 });
	const slot30Days = findNextDoctorFreeSlotAfterDays({ ...params, daysOffset: 30 });

	return {
		slot7Days,
		slot14Days,
		slot30Days,
	};
}
