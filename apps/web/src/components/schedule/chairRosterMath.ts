/**
 * DENTE Dental CRM — Doctor & Chair Roster Mathematical Engine (chairRosterMath.ts)
 *
 * Principles & Compliance:
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, non-blocking 1-tap actions)
 * - Mandate 8k: CRM != Reality Simulator (1-click weekly shift assignment, copy week/month)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (resilient defaults for 1 chair / 1 doctor)
 * - Mandate 8d: Apple HIG & Medical Density (touch targets >= 44x44px, 0 emojis)
 */

import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	DEFAULT_CLINIC_STAFF,
	CLINIC_CABINETS_CATALOG,
	type StaffMember,
	type CabinetDefinition,
	type ShiftArchetypeId,
	type DoctorChairRosterTemplateId,
	type DoctorChairRosterTemplate,
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
} from "./roster/doctorShiftRosterPresets";
import type { DoctorShift } from "./roster/doctorShiftRosterEngine";
import {
	addDaysToDateIso,
	getWeekDaysIso,
	applyDoctorChairWeeklyTemplate,
	applyDoctorChairDateRange as baseApplyDoctorChairDateRange,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	clearWeekShifts,
	rotateWeekShifts,
	type DateRangeShiftPreset,
	type DateRangeShiftBindingParams,
} from "./roster/doctorWeeklyScheduleGenerator";

/**
 * Returns ISO date (YYYY-MM-DD) for Monday of the given date's week.
 */
export function getMondayOfWeekIso(dateIso?: string): string {
	const base = dateIso ? new Date(dateIso) : new Date();
	const day = base.getDay(); // 0 is Sun
	const diff = base.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(base.setDate(diff));
	return monday.toISOString().slice(0, 10);
}

export {
	addDaysToDateIso,
	getWeekDaysIso,
	applyDoctorChairWeeklyTemplate,
	copyWeekShiftsToTargetWeek,
	copyWeekShiftsToMonth,
	clearWeekShifts,
	rotateWeekShifts,
	DEFAULT_CLINIC_STAFF,
	CLINIC_CABINETS_CATALOG,
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
};
export type {
	DoctorShift,
	StaffMember,
	CabinetDefinition,
	ShiftArchetypeId,
	DoctorChairRosterTemplateId,
	DoctorChairRosterTemplate,
	DateRangeShiftPreset,
	DateRangeShiftBindingParams,
};

/**
 * Solo doctor 1-chair default object per Mandate 8n.
 * Resilient zero-configuration fallback when clinicSettings.chairs is empty.
 */
export const DEFAULT_SOLO_CHAIR = {
	id: "chair-1",
	name: "Кресло 1",
	roomNumber: "1",
	room: "Кабинет 1",
	color: "#0d9488",
	active: true,
	sortOrder: 0,
} as const;

/**
 * Standard shift presets for chair assignments.
 */
export const CHAIR_SHIFT_PRESETS = [
	{
		id: "morning" as const,
		label: "Утренняя смена",
		hours: "08:00–14:00",
		name: "Утро 08:00–14:00",
		startHour: 8,
		endHour: 14,
	},
	{
		id: "morning_9" as const,
		label: "Утренняя (с 9)",
		hours: "09:00–15:00",
		name: "Утро 09:00–15:00",
		startHour: 9,
		endHour: 15,
	},
	{
		id: "evening" as const,
		label: "Вечерняя смена",
		hours: "14:00–20:00",
		name: "Вечер 14:00–20:00",
		startHour: 14,
		endHour: 20,
	},
	{
		id: "evening_15" as const,
		label: "Вечерняя (с 15)",
		hours: "15:00–21:00",
		name: "Вечер 15:00–21:00",
		startHour: 15,
		endHour: 21,
	},
	{
		id: "full" as const,
		label: "Полный день",
		hours: "08:00–20:00",
		name: "Весь день 08:00–20:00",
		startHour: 8,
		endHour: 20,
	},
	{
		id: "two_shifts" as const,
		label: "2 смены (Утро + Вечер)",
		hours: "08:00–20:00",
		name: "2 смены (08–14 / 14–20)",
		startHour: 8,
		endHour: 20,
	},
] as const;

export type ChairShiftPresetId = (typeof CHAIR_SHIFT_PRESETS)[number]["id"];

/**
 * Sub-shift for dual-shift chairs (Morning doctor + Evening doctor on same chair).
 */
export interface ChairDoctorSubShift {
	doctorId: string;
	doctorName: string;
	doctorSpecialty?: string | undefined;
	startHour: number;
	endHour: number;
	shiftHours: string;
}

/**
 * Chair doctor assignment structure for ScheduleGrid and ChairScheduleView.
 */
export interface ChairDoctorShiftAssignment {
	chairId: string;
	chairName?: string | undefined;
	doctorId: string;
	doctorName: string;
	doctorSpecialty?: string | undefined;
	shiftPreset?: "morning" | "morning_9" | "evening" | "evening_15" | "full" | "two_shifts" | "custom" | undefined;
	shiftLabel?: string | undefined;
	shiftHours: string;
	startHour?: number | undefined;
	endHour?: number | undefined;
	subShifts?: ChairDoctorSubShift[] | undefined;
}

/**
 * Formats doctor's full name to compact Russian clinical short name: "Иванов И.И."
 */
export function formatDoctorShortName(fullName: string): string {
	if (!fullName) return "";
	const cleaned = fullName.trim().replace(/^(д-р|доктор|врач)\s+/i, "");
	const parts = cleaned.trim().split(/\s+/);
	if (parts.length === 0 || !parts[0]) return fullName;
	const lastName = parts[0];
	if (parts.length === 1) return lastName;
	if (parts[1]?.includes(".")) {
		return `${lastName} ${parts.slice(1).join(" ")}`.trim();
	}
	const firstInitial = parts[1]?.[0] ? `${parts[1][0].toUpperCase()}.` : "";
	const middleInitial = parts[2]?.[0] ? `${parts[2][0].toUpperCase()}.` : "";
	return `${lastName} ${firstInitial}${middleInitial}`.trim();
}

/**
 * Server sync payload type.
 */
export interface SyncShiftPayload {
	id: string;
	doctorId: string;
	doctorName: string;
	doctorSpecialty?: string | undefined;
	cabinetId: string;
	chairId: string;
	dateIso: string;
	startTime: string;
	endTime: string;
	durationHours: number;
	status: string;
	shiftPreset?: string | undefined;
}

/**
 * Synchronizes chair shift assignments with server API with soft fallback (Mandate 8e, 8n).
 */
export async function syncShiftsWithServer(
	targetDateKey: string,
	currentAssignments: Record<string, ChairDoctorShiftAssignment>,
	chairsList?: readonly { id: string; name?: string; roomNumber?: string; room?: string }[],
): Promise<boolean> {
	if (!targetDateKey || !currentAssignments) return false;

	const shiftsToSend: SyncShiftPayload[] = [];

	for (const [chairId, assignment] of Object.entries(currentAssignments)) {
		if (!assignment) continue;
		const chairObj = chairsList?.find((c) => c.id === chairId);
		const cabinetId =
			(chairObj as any)?.roomNumber ||
			(chairObj as any)?.room ||
			"cab-1";

		if (assignment.subShifts && assignment.subShifts.length > 0) {
			for (const sub of assignment.subShifts) {
				const startH = sub.startHour ?? 8;
				const endH = sub.endHour ?? 14;
				shiftsToSend.push({
					id: `shift-${sub.doctorId}-${chairId}-${targetDateKey}-${startH}-${endH}`,
					doctorId: sub.doctorId,
					doctorName: sub.doctorName,
					doctorSpecialty: sub.doctorSpecialty,
					cabinetId,
					chairId,
					dateIso: targetDateKey,
					startTime: `${String(startH).padStart(2, "0")}:00`,
					endTime: `${String(endH).padStart(2, "0")}:00`,
					durationHours: endH - startH,
					status: "scheduled",
					shiftPreset: assignment.shiftPreset || "two_shifts",
				});
			}
		} else if (assignment.doctorId) {
			const startH = assignment.startHour ?? 8;
			const endH = assignment.endHour ?? 20;
			shiftsToSend.push({
				id: `shift-${assignment.doctorId}-${chairId}-${targetDateKey}-${startH}-${endH}`,
				doctorId: assignment.doctorId,
				doctorName: assignment.doctorName,
				doctorSpecialty: assignment.doctorSpecialty,
				cabinetId,
				chairId,
				dateIso: targetDateKey,
				startTime: `${String(startH).padStart(2, "0")}:00`,
				endTime: `${String(endH).padStart(2, "0")}:00`,
				durationHours: endH - startH,
				status: "scheduled",
				shiftPreset: assignment.shiftPreset || "full",
			});
		}
	}

	if (typeof window !== "undefined" && typeof fetch === "function") {
		try {
			const response = await fetch("/api/schedule/shifts", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ shifts: shiftsToSend }),
			});
			return response.ok;
		} catch {
			// Soft fallback per Mandate 8n & 8e (offline / isolated / network degradation)
			return false;
		}
	}

	return true;
}

/**
 * 1-Click Fast Cell Shift Assignment for matrix grids (StomX / DentalPRO parity).
 */
export function applyCellShiftPreset(
	currentShifts: DoctorShift[],
	params: {
		dateIso: string;
		cabinetId: string;
		chairId: string;
		presetType: "morning" | "morning_9" | "evening" | "evening_15" | "full_day" | "clear";
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
		staffList = DEFAULT_CLINIC_STAFF,
	} = params;

	// Filter out any existing shift on this chair and date
	const filtered = currentShifts.filter(
		(s) => !(s.dateIso === dateIso && s.chairId === chairId),
	);

	if (presetType === "clear") {
		return filtered;
	}

	const foundDoc = staffList.find((s) => s.id === doctorId) || DEFAULT_CLINIC_STAFF[0]!;

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

/**
 * Non-blocking conflict check (Mandate 8e).
 * Returns soft warnings if two doctors are assigned to the same chair at overlapping times.
 * Never disables buttons or prevents saving!
 */
export function detectDoctorChairConflicts(
	shifts: DoctorShift[],
): Array<{ chairId: string; dateIso: string; message: string }> {
	const conflicts: Array<{ chairId: string; dateIso: string; message: string }> = [];
	const groupedByChairAndDate = new Map<string, DoctorShift[]>();

	for (const s of shifts) {
		if (s.status === "cancelled") continue;
		const key = `${s.chairId}_${s.dateIso}`;
		const arr = groupedByChairAndDate.get(key) || [];
		arr.push(s);
		groupedByChairAndDate.set(key, arr);
	}

	for (const [key, chairShifts] of groupedByChairAndDate.entries()) {
		if (chairShifts.length > 1) {
			chairShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
			for (let i = 0; i < chairShifts.length - 1; i++) {
				const current = chairShifts[i]!;
				const next = chairShifts[i + 1]!;
				if (current.endTime > next.startTime && current.doctorId !== next.doctorId) {
					const [chairId, dateIso] = key.split("_");
					conflicts.push({
						chairId: chairId || "",
						dateIso: dateIso || "",
						message: `Пересечение смен: ${current.doctorName} (${current.startTime}–${current.endTime}) и ${next.doctorName} (${next.startTime}–${next.endTime})`,
					});
				}
			}
		}
	}

	return conflicts;
}
