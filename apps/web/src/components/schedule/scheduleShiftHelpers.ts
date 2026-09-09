/**
 * DENTE Dental CRM — scheduleShiftHelpers.ts
 *
 * Mathematical and state calculation helpers for chair doctor shifts (StomX / IDENT parity).
 * Mandate 8e (Doctor Autonomy), Mandate 8k (Frictionless Presets), Mandate 8n (Solo Doctor).
 */

import type {
	ChairDoctorShiftAssignment,
	ChairDoctorSubShift,
} from "./ScheduleGrid";
import type { ScheduleChair } from "./ScheduleFilterStrip";

export type ShiftPresetType =
	| "morning"
	| "morning_9"
	| "evening"
	| "evening_15"
	| "full"
	| "full_9_21"
	| "two_shifts"
	| "2x2"
	| "even_odd";

export interface ComputeShiftAssignmentParams {
	chair: ScheduleChair;
	preset: ShiftPresetType;
	targetDoc: { id: string; fullName: string; specialty?: string | null };
	existingAssignment?: ChairDoctorShiftAssignment | null;
	dateKey: string;
}

/**
 * Computes ChairDoctorShiftAssignment for standard and split-shift chair schedules.
 */
export function computeShiftAssignment(
	params: ComputeShiftAssignmentParams,
): ChairDoctorShiftAssignment {
	const { chair, preset, targetDoc, existingAssignment, dateKey } = params;

	let shiftPreset: "morning" | "evening" | "full" | "two_shifts" = "morning";
	let shiftLabel = "Утро 08-14";
	let shiftHours = "08:00–14:00";
	let startHour = 8;
	let endHour = 14;
	let subShifts: ChairDoctorSubShift[] | undefined;

	const isMorn = preset === "morning" || preset === "morning_9";
	const isEve = preset === "evening" || preset === "evening_15";
	const startH =
		preset === "morning_9" ? 9 : preset === "evening_15" ? 15 : isEve ? 14 : 8;
	const endH =
		preset === "morning_9" ? 15 : preset === "evening_15" ? 21 : isEve ? 20 : 14;
	const sHours = `${String(startH).padStart(2, "0")}:00–${String(endH).padStart(2, "0")}:00`;

	const targetSubShift: ChairDoctorSubShift = {
		doctorId: targetDoc.id,
		doctorName: targetDoc.fullName,
		doctorSpecialty: targetDoc.specialty ? String(targetDoc.specialty) : undefined,
		startHour: startH,
		endHour: endH,
		shiftHours: sHours,
	};

	if (isMorn) {
		let existingEvening: ChairDoctorSubShift | null = null;
		if (existingAssignment?.subShifts && existingAssignment.subShifts.length > 0) {
			const found = existingAssignment.subShifts.find(
				(s) =>
					s.doctorId !== targetDoc.id &&
					((s.startHour !== undefined && s.startHour >= 14) ||
						s.shiftHours?.includes("14:00") ||
						s.shiftHours?.includes("15:00")),
			);
			if (found) existingEvening = found;
		} else if (
			existingAssignment &&
			existingAssignment.doctorId !== targetDoc.id &&
			existingAssignment.shiftPreset !== "full" &&
			((existingAssignment.startHour !== undefined &&
				existingAssignment.startHour >= 14) ||
				existingAssignment.shiftPreset === "evening")
		) {
			existingEvening = {
				doctorId: existingAssignment.doctorId,
				doctorName: existingAssignment.doctorName,
				doctorSpecialty: existingAssignment.doctorSpecialty,
				startHour: existingAssignment.startHour ?? 14,
				endHour: existingAssignment.endHour ?? 20,
				shiftHours: existingAssignment.shiftHours || "14:00–20:00",
			};
		}

		if (existingEvening) {
			shiftPreset = "two_shifts";
			shiftLabel = "2 смены (Утро + Вечер)";
			shiftHours = "08:00–20:00";
			startHour = startH;
			endHour = existingEvening.endHour || 20;
			subShifts = [targetSubShift, existingEvening];
		} else {
			shiftPreset = "morning";
			shiftLabel = preset === "morning_9" ? "1 см. 09-15" : "Утро 08-14";
			shiftHours = sHours;
			startHour = startH;
			endHour = endH;
			subShifts = [targetSubShift];
		}
	} else if (isEve) {
		let existingMorning: ChairDoctorSubShift | null = null;
		if (existingAssignment?.subShifts && existingAssignment.subShifts.length > 0) {
			const found = existingAssignment.subShifts.find(
				(s) =>
					s.doctorId !== targetDoc.id &&
					((s.startHour !== undefined && s.startHour < 14) ||
						s.shiftHours?.includes("08:00") ||
						s.shiftHours?.includes("09:00")),
			);
			if (found) existingMorning = found;
		} else if (
			existingAssignment &&
			existingAssignment.doctorId !== targetDoc.id &&
			existingAssignment.shiftPreset !== "full" &&
			((existingAssignment.startHour !== undefined &&
				existingAssignment.startHour < 14) ||
				existingAssignment.shiftPreset === "morning")
		) {
			existingMorning = {
				doctorId: existingAssignment.doctorId,
				doctorName: existingAssignment.doctorName,
				doctorSpecialty: existingAssignment.doctorSpecialty,
				startHour: existingAssignment.startHour ?? 8,
				endHour: existingAssignment.endHour ?? 14,
				shiftHours: existingAssignment.shiftHours || "08:00–14:00",
			};
		}

		if (existingMorning) {
			shiftPreset = "two_shifts";
			shiftLabel = "2 смены (Утро + Вечер)";
			shiftHours = "08:00–20:00";
			startHour = existingMorning.startHour || 8;
			endHour = endH;
			subShifts = [existingMorning, targetSubShift];
		} else {
			shiftPreset = "evening";
			shiftLabel = preset === "evening_15" ? "2 см. 15-21" : "Вечер 14-20";
			shiftHours = sHours;
			startHour = startH;
			endHour = endH;
			subShifts = [targetSubShift];
		}
	} else if (preset === "full") {
		shiftPreset = "full";
		shiftLabel = "Весь день";
		shiftHours = "08:00–20:00";
		startHour = 8;
		endHour = 20;
		subShifts = undefined;
	} else if (preset === "full_9_21") {
		shiftPreset = "full";
		shiftLabel = "Весь день (09:00–21:00)";
		shiftHours = "09:00–21:00";
		startHour = 9;
		endHour = 21;
		subShifts = undefined;
	} else if (preset === "2x2") {
		shiftPreset = "two_shifts";
		shiftLabel = "2 через 2";
		shiftHours = "08:00–20:00";
		startHour = 8;
		endHour = 20;
	} else if (preset === "even_odd") {
		const dayOfMonth =
			Number.parseInt(dateKey ? dateKey.slice(8, 10) : "1", 10) || 1;
		const isEven = dayOfMonth % 2 === 0;
		shiftPreset = isEven ? "morning" : "evening";
		shiftLabel = isEven ? "Чет (Утро 08-14)" : "Нечет (Вечер 14-20)";
		shiftHours = isEven ? "08:00–14:00" : "14:00–20:00";
		startHour = isEven ? 8 : 14;
		endHour = isEven ? 14 : 20;
	}

	const firstSub = subShifts?.[0];
	const secondSub = subShifts?.[1];

	return {
		chairId: chair.id,
		chairName: chair.name,
		doctorId: targetDoc.id,
		doctorName:
			firstSub && secondSub
				? `${firstSub.doctorName} / ${secondSub.doctorName}`
				: targetDoc.fullName,
		doctorSpecialty: targetDoc.specialty ? String(targetDoc.specialty) : undefined,
		shiftPreset,
		shiftLabel,
		shiftHours,
		startHour,
		endHour,
		...(subShifts ? { subShifts } : {}),
	};
}
