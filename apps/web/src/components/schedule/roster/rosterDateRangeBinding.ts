/**
 * DENTE Dental CRM — Multi-Day Date Range Shift Binding
 * Compliance: StomX / DentalPRO Parity, Mandates 8e, 8k, 8n
 */

import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	DEFAULT_CLINIC_STAFF,
	type StaffMember,
	type MedicalStaffRole,
} from "./doctorShiftRosterPresets";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import type { DoctorShift } from "./doctorShiftRosterEngine";
import { addDaysToDateIso } from "./rosterWeekCopyAndRotate";

/**
 * Supported shift presets for multi-day date range shift binding (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 */
export type DateRangeShiftPreset =
	| "morning"
	| "morning_9"
	| "evening"
	| "evening_15"
	| "full"
	| "two_two"
	| "five_day";

export interface DateRangeShiftBindingParams {
	startDateIso: string;
	endDateIso: string;
	doctorId: string;
	chairId: string;
	cabinetId?: string | undefined;
	shiftPreset: DateRangeShiftPreset;
	startTime?: string | undefined;
	endTime?: string | undefined;
	staffList?: StaffMember[] | undefined;
	cabinets?: CabinetDefinition[] | undefined;
	includeWeekends?: boolean | undefined;
}

/**
 * 1-Click Fast Multi-Day Date Range Doctor-to-Chair Shift Binding (StomX / DentalPRO Parity, Mandates 8e, 8k, 8n)
 */
export function applyDoctorChairDateRange(
	currentShifts: DoctorShift[],
	params: DateRangeShiftBindingParams,
): DoctorShift[] {
	const {
		startDateIso,
		endDateIso,
		doctorId,
		chairId,
		cabinetId,
		shiftPreset,
		startTime: customStart,
		endTime: customEnd,
		staffList = isDemoShowcaseMode() ? DEFAULT_CLINIC_STAFF : [],
		cabinets = isDemoShowcaseMode() ? CLINIC_CABINETS_CATALOG : [],
		includeWeekends = true,
	} = params;

	if (!startDateIso || !endDateIso || !doctorId || !chairId) {
		return currentShifts;
	}

	let startIso = startDateIso;
	let endIso = endDateIso;
	if (endIso < startIso) {
		const tmp = startIso;
		startIso = endIso;
		endIso = tmp;
	}

	const foundDoc =
		staffList.find((s) => s.id === doctorId) ||
		(isDemoShowcaseMode()
			? DEFAULT_CLINIC_STAFF.find((s) => s.id === doctorId)
			: undefined);
	const doc =
		foundDoc || {
			id: doctorId,
			fullName: `Врач ${doctorId}`,
			shortName: `Врач ${doctorId}`,
			role: "therapist" as MedicalStaffRole,
			tabNumber: "001",
			isDoctor: true,
			isAssistant: false,
			weeklyHourLimit: 33,
			avatarColor: "#2563eb",
		};

	const asstId = (doc as any).preferredAssistantId || (doc as any).defaultAssistantId;
	const asst = asstId
		? staffList.find((s) => s.id === asstId) || null
		: staffList.find((s) => s.role === "assistant") || null;

	let targetCabId = cabinetId;
	if (!targetCabId) {
		const cabWithChair = cabinets.find(
			(c) => Array.isArray(c.chairs) && c.chairs.some((ch) => ch.id === chairId),
		);
		targetCabId = cabWithChair?.id || cabinets[0]?.id || "cab-1";
	}

	// Preset defaults
	let defStart = "08:00";
	let defEnd = "14:00";
	let defDuration = 6.0;
	let defBreak = 0;
	let defArchetype: "morning_shift" | "evening_shift" = "morning_shift";
	let defLabel = "1 смена (08:00–14:00)";

	if (shiftPreset === "morning_9") {
		defStart = "09:00";
		defEnd = "15:00";
		defDuration = 6.0;
		defArchetype = "morning_shift";
		defLabel = "1 смена (09:00–15:00)";
	} else if (shiftPreset === "evening") {
		defStart = "14:00";
		defEnd = "20:00";
		defDuration = 6.0;
		defArchetype = "evening_shift";
		defLabel = "2 смена (14:00–20:00)";
	} else if (shiftPreset === "evening_15") {
		defStart = "15:00";
		defEnd = "21:00";
		defDuration = 6.0;
		defArchetype = "evening_shift";
		defLabel = "2 смена (15:00–21:00)";
	} else if (shiftPreset === "full") {
		defStart = "08:00";
		defEnd = "20:00";
		defDuration = 11.0;
		defBreak = 60;
		defArchetype = "morning_shift";
		defLabel = "Весь день (08:00–20:00)";
	} else if (shiftPreset === "two_two") {
		defStart = "08:00";
		defEnd = "20:00";
		defDuration = 11.0;
		defBreak = 60;
		defArchetype = "morning_shift";
		defLabel = "2/2 Полный день (08:00–20:00)";
	} else if (shiftPreset === "five_day") {
		defStart = "09:00";
		defEnd = "18:00";
		defDuration = 8.0;
		defBreak = 60;
		defArchetype = "morning_shift";
		defLabel = "Пятидневка (09:00–18:00)";
	}

	const finalStart = customStart || defStart;
	const finalEnd = customEnd || defEnd;

	const newShifts: DoctorShift[] = [];
	const coveredDates = new Set<string>();

	// Iterate through dates up to 180 days max
	let currentIso = startIso;
	let dayCounter = 0;
	while (currentIso <= endIso && dayCounter < 180) {
		const parts = currentIso.split("-").map(Number);
		const curDate = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!));
		const dayOfWeek = curDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

		let shouldInclude = true;
		if (shiftPreset === "five_day") {
			if (dayOfWeek === 0 || dayOfWeek === 6) {
				shouldInclude = false;
			}
		} else if (shiftPreset === "two_two") {
			if (dayCounter % 4 >= 2) {
				shouldInclude = false;
			}
		} else if (!includeWeekends) {
			if (dayOfWeek === 0 || dayOfWeek === 6) {
				shouldInclude = false;
			}
		}

		if (shouldInclude) {
			coveredDates.add(currentIso);
			newShifts.push({
				id: `shift-${currentIso}-${chairId}-${doc.id}-${shiftPreset}-${dayCounter}`,
				doctorId: doc.id,
				doctorName: doc.shortName || doc.fullName,
				doctorRole: doc.role,
				assistantId: asst ? asst.id : null,
				assistantName: asst ? asst.shortName || asst.fullName : null,
				cabinetId: targetCabId,
				chairId,
				dateIso: currentIso,
				archetypeId: defArchetype,
				startTime: finalStart,
				endTime: finalEnd,
				durationHours: defDuration,
				breakMinutes: defBreak,
				isNight: false,
				nightHours: 0,
				status: "scheduled",
				customNotes: defLabel,
			});
		}

		dayCounter++;
		currentIso = addDaysToDateIso(startIso, dayCounter);
	}

	// Filter out conflicting shifts on the affected chair & dates
	const isFullOrHeavy =
		defDuration >= 8.0 ||
		shiftPreset === "full" ||
		shiftPreset === "two_two" ||
		shiftPreset === "five_day";
	const isMorningShift = finalStart < "14:00" && finalEnd <= "15:00";
	const isEveningShift = finalStart >= "14:00";

	const remaining = currentShifts.filter((s) => {
		if (s.chairId !== chairId || !coveredDates.has(s.dateIso)) {
			return true;
		}
		if (s.doctorId === doc.id) {
			return false; // Replace own shifts
		}
		if (isFullOrHeavy) {
			return false; // Full day covers entire chair
		}
		if (isMorningShift && (s.startTime < "14:00" || s.durationHours >= 8.0)) {
			return false;
		}
		if (isEveningShift && (s.startTime >= "14:00" || s.durationHours >= 8.0)) {
			return false;
		}
		return true;
	});

	return [...remaining, ...newShifts];
}
