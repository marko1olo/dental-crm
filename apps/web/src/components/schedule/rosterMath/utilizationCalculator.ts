/**
 * DENTE Dental CRM — Chair Utilization, StomX Parity Presets & Shift Allocation (utilizationCalculator.ts)
 *
 * Principles & Compliance:
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, non-blocking 1-tap actions)
 * - Mandate 8k: CRM != Reality Simulator (1-click weekly shift assignment, copy week/month)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (resilient defaults for 1 chair / 1 doctor)
 */

import { isDemoShowcaseMode } from "../../../lib/demoMode";
import {
	DEFAULT_CLINIC_STAFF,
	DEFAULT_SOLO_CHAIR,
	type DoctorShift,
	type StaffMember,
	type CabinetDefinition,
	type ShiftArchetypeId,
	type ChairDoctorShiftAssignment,
	type DateRangeShiftBindingParams,
} from "./types";
import {
	addDaysToDateIso,
	formatDoctorShortName,
} from "./timeSlotGeometry";
import {
	applyDoctorChairWeeklyTemplate,
	applyDoctorChairDateRange as baseApplyDoctorChairDateRange,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	clearWeekShifts,
	rotateWeekShifts,
} from "../roster/doctorWeeklyScheduleGenerator";

export {
	applyDoctorChairWeeklyTemplate,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	clearWeekShifts,
	rotateWeekShifts,
};

/**
 * 1-Click Fast Cell Shift Assignment for matrix grids (StomX / DentalPRO parity).
 */
export function applyCellShiftPreset(
	currentShifts: DoctorShift[],
	params: {
		dateIso: string;
		cabinetId: string;
		chairId: string;
		presetType: "morning" | "morning_9" | "evening" | "evening_15" | "full_day" | "full_9_21" | "clear";
		doctorId: string;
		staffList?: StaffMember[];
		cabinets?: CabinetDefinition[];
	},
): DoctorShift[] {
	const {
		dateIso,
		cabinetId,
		chairId,
		presetType,
		doctorId,
		staffList: propStaffList,
	} = params;

	const staffList =
		propStaffList !== undefined
			? propStaffList
			: isDemoShowcaseMode()
				? DEFAULT_CLINIC_STAFF
				: [];

	// Filter out any existing shift on this chair and date
	const filtered = currentShifts.filter(
		(s) => !(s.dateIso === dateIso && s.chairId === chairId),
	);

	if (presetType === "clear") {
		return filtered;
	}

	const foundDoc =
		staffList.find((s) => s.id === doctorId) ||
		staffList.find((s) => s.isDoctor) ||
		staffList[0] ||
		(isDemoShowcaseMode() ? DEFAULT_CLINIC_STAFF[0]! : undefined);

	if (!foundDoc) {
		return filtered;
	}

	let startTime = "08:00";
	let endTime = "14:00";
	let durationHours = 6.0;
	let archetypeId: ShiftArchetypeId = "morning_shift";

	if (presetType === "morning_9") {
		startTime = "09:00";
		endTime = "15:00";
		durationHours = 6.0;
		archetypeId = "morning_shift";
	} else if (presetType === "evening") {
		startTime = "14:00";
		endTime = "20:00";
		durationHours = 6.0;
		archetypeId = "evening_shift";
	} else if (presetType === "evening_15") {
		startTime = "15:00";
		endTime = "21:00";
		durationHours = 6.0;
		archetypeId = "evening_shift";
	} else if (presetType === "full_day") {
		startTime = "08:00";
		endTime = "20:00";
		durationHours = 12.0;
		archetypeId = "morning_shift";
	} else if (presetType === "full_9_21") {
		startTime = "09:00";
		endTime = "21:00";
		durationHours = 12.0;
		archetypeId = "morning_shift";
	}

	const newShift: DoctorShift = {
		id: `shift-${dateIso}-${chairId}-${foundDoc.id}-${presetType}`,
		doctorId: foundDoc.id,
		doctorName: foundDoc.shortName || foundDoc.fullName,
		doctorRole: foundDoc.role,
		assistantId: null,
		assistantName: null,
		cabinetId,
		chairId,
		dateIso,
		archetypeId,
		startTime,
		endTime,
		durationHours,
		breakMinutes: 0,
		isNight: false,
		nightHours: 0,
		status: "scheduled",
	};

	return [...filtered, newShift];
}

/**
 * Multi-day date range shift assignment (StomX / DentalPRO parity).
 */
export function applyDoctorChairDateRange(
	currentShifts: DoctorShift[],
	params: DateRangeShiftBindingParams,
): DoctorShift[] {
	return baseApplyDoctorChairDateRange(currentShifts, params);
}

/**
 * 1-Click Solo Doctor Chair Binding (Mandate 8n).
 * Binds the solo doctor to the chair for the entire week or month in 1 tap without any modal maze.
 */
export function bindSoloDoctorToDefaultChair(params: {
	doctor: { id: string; fullName: string; shortName?: string; role?: string };
	chair?: { id: string; name?: string; roomNumber?: string };
	shiftPreset?: "full" | "morning" | "evening" | "two_two" | "five_day";
	weekStartDateIso: string;
	currentShifts?: DoctorShift[];
}): {
	shifts: DoctorShift[];
	assignment: ChairDoctorShiftAssignment;
} {
	const {
		doctor,
		chair = DEFAULT_SOLO_CHAIR,
		shiftPreset = "full",
		weekStartDateIso,
		currentShifts = [],
	} = params;

	const targetChairId = chair.id || DEFAULT_SOLO_CHAIR.id;
	const chairName = chair.name || DEFAULT_SOLO_CHAIR.name;
	const docShortName = doctor.shortName || formatDoctorShortName(doctor.fullName);

	let startHour = 8;
	let endHour = 20;
	let shiftHours = "08:00–20:00";
	let shiftLabel = "Весь день";

	if (shiftPreset === "morning") {
		startHour = 8;
		endHour = 14;
		shiftHours = "08:00–14:00";
		shiftLabel = "Утро 08-14";
	} else if (shiftPreset === "evening") {
		startHour = 14;
		endHour = 20;
		shiftHours = "14:00–20:00";
		shiftLabel = "Вечер 14-20";
	}

	const assignment: ChairDoctorShiftAssignment = {
		chairId: targetChairId,
		chairName,
		doctorId: doctor.id,
		doctorName: docShortName,
		doctorSpecialty: doctor.role,
		shiftPreset: shiftPreset === "two_two" || shiftPreset === "five_day" ? "full" : shiftPreset,
		shiftLabel,
		shiftHours,
		startHour,
		endHour,
	};

	// Generate shifts for Monday through Friday (or Sunday)
	const newShifts: DoctorShift[] = [];
	const daysCount = shiftPreset === "five_day" ? 5 : 7;

	for (let i = 0; i < daysCount; i++) {
		const dateIso = addDaysToDateIso(weekStartDateIso, i);
		newShifts.push({
			id: `shift-${dateIso}-${targetChairId}-${doctor.id}-solo`,
			doctorId: doctor.id,
			doctorName: docShortName,
			doctorRole: "therapist",
			assistantId: null,
			assistantName: null,
			cabinetId: (chair as any)?.roomNumber || "cab-1",
			chairId: targetChairId,
			dateIso,
			archetypeId: "morning_shift",
			startTime: `${String(startHour).padStart(2, "0")}:00`,
			endTime: `${String(endHour).padStart(2, "0")}:00`,
			durationHours: endHour - startHour,
			breakMinutes: 0,
			isNight: false,
			nightHours: 0,
			status: "scheduled",
		});
	}

	// Remove old shifts on this chair for the active week and add new ones
	const weekEndIso = addDaysToDateIso(weekStartDateIso, 6);
	const remaining = currentShifts.filter(
		(s) => !(s.chairId === targetChairId && s.dateIso >= weekStartDateIso && s.dateIso <= weekEndIso),
	);

	return {
		shifts: [...remaining, ...newShifts],
		assignment,
	};
}
