/**
 * DENTE Dental CRM — Doctor & Chair Roster Mathematical Engine (chairRosterMath.ts)
 *
 * Principles & Compliance:
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, non-blocking 1-tap actions)
 * - Mandate 8k: CRM != Reality Simulator (1-click weekly shift assignment, copy week/month)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (resilient defaults for 1 chair / 1 doctor)
 * - Mandate 8d: Apple HIG & Medical Density (touch targets >= 44x44px, 0 emojis)
 */

import {
	areIntervalsOverlapping,
	calculateOverlapDurationMinutes,
} from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { safeLocalStorageGetJson } from "../../lib/safeLocalStorage";
import { isDemoShowcaseMode } from "../../lib/demoMode";
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
		id: "full_9_21" as const,
		label: "Весь день (09:00–21:00)",
		hours: "09:00–21:00",
		name: "Весь день 09:00–21:00",
		startHour: 9,
		endHour: 21,
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
	shiftLabel?: string | undefined;
	shiftHours: string;
	startHour: number;
	endHour: number;
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
	shiftPreset?: "morning" | "morning_9" | "evening" | "evening_15" | "full" | "full_9_21" | "two_shifts" | "custom" | undefined;
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
 * Resolves which doctor is on duty for a given chair at a specific time/slot.
 * Resilient multi-tier fallback:
 * 1. Active chair doctor shift assignment for the date (morning vs evening vs custom sub-shifts vs presets).
 * 2. In-memory safeLocalStorage assignment.
 * 3. Initial slot doctor.
 * 4. Default doctor fallback for chair.
 * 5. Default doctor from chair settings stored in safeLocalStorage.
 */
export function resolveChairDutyDoctor(
	chairId: string | null | undefined,
	startsAtIsoOrLocal: string | null | undefined,
	chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined,
	dateKeyFallback?: string | undefined,
	initialSlotDoctorId?: string | null | undefined,
	defaultDoctorIdFallback?: string | null | undefined,
): { doctorId: string | null; shiftHours: string } {
	if (!chairId) {
		return { doctorId: initialSlotDoctorId || defaultDoctorIdFallback || null, shiftHours: "08:00–20:00" };
	}

	// 1. Check passed chairDoctorAssignments
	let assignment = chairDoctorAssignments?.[chairId];

	// 2. Fallback to in-memory safeLocalStorage
	const targetDateKey =
		startsAtIsoOrLocal && startsAtIsoOrLocal.length >= 10
			? startsAtIsoOrLocal.slice(0, 10)
			: (dateKeyFallback || "");
	if (!assignment && targetDateKey) {
		const parsed = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment> | null>(
			`dente_chair_doctor_assignments_${targetDateKey}`,
			null,
		);
		if (parsed?.[chairId]) {
			assignment = parsed[chairId];
		}
	}

	if (assignment && (assignment.doctorId || (assignment.subShifts && assignment.subShifts.length > 0))) {
		let hourNum = NaN;
		if (startsAtIsoOrLocal) {
			if (startsAtIsoOrLocal.length >= 13) {
				hourNum = Number.parseInt(startsAtIsoOrLocal.slice(11, 13), 10);
			} else if (/^\d{2}:\d{2}/.test(startsAtIsoOrLocal)) {
				hourNum = Number.parseInt(startsAtIsoOrLocal.slice(0, 2), 10);
			}
		}

		// 1. Two-shift chair handling: morning (< 14:00) vs evening (>= 14:00)
		if (
			(assignment.subShifts && assignment.subShifts.length > 1) ||
			assignment.shiftPreset === "two_shifts"
		) {
			const mornSub = assignment.subShifts?.[0] || {
				doctorId: assignment.doctorId,
				doctorName: assignment.doctorName,
				startHour: 8,
				endHour: 14,
				shiftHours: "08:00–14:00",
			};
			const eveSub = assignment.subShifts?.[1] || {
				doctorId: assignment.doctorId,
				doctorName: assignment.doctorName,
				startHour: 14,
				endHour: 20,
				shiftHours: "14:00–20:00",
			};

			const mornStart = mornSub.startHour ?? 8;
			const eveEnd = eveSub.endHour ?? 20;

			if (!Number.isNaN(hourNum)) {
				if (hourNum < mornStart || (hourNum >= eveEnd && (eveEnd < 20 || hourNum > 20))) {
					return { doctorId: null, shiftHours: assignment.shiftHours || "08:00–20:00" };
				}
				if (hourNum < 14) {
					return {
						doctorId: mornSub.doctorId || assignment.doctorId || null,
						shiftHours: mornSub.shiftHours || "08:00–14:00",
					};
				}
				return {
					doctorId: eveSub.doctorId || mornSub.doctorId || assignment.doctorId || null,
					shiftHours: eveSub.shiftHours || "14:00–20:00",
				};
			}
			return {
				doctorId: assignment.doctorId,
				shiftHours: assignment.shiftHours || "08:00–20:00",
			};
		}

		// 2. Custom sub-shifts array
		if (assignment.subShifts && assignment.subShifts.length > 0) {
			if (!Number.isNaN(hourNum)) {
				const matchingSub = assignment.subShifts.find(
					(s) =>
						hourNum >= s.startHour &&
						(hourNum < s.endHour || (s.endHour >= 20 && hourNum <= 20)),
				);
				if (matchingSub) {
					return {
						doctorId: matchingSub.doctorId,
						shiftHours:
							matchingSub.shiftHours ||
							`${String(matchingSub.startHour).padStart(2, "0")}:00–${String(matchingSub.endHour).padStart(2, "0")}:00`,
					};
				}
				return { doctorId: null, shiftHours: assignment.shiftHours || "08:00–20:00" };
			}
			return {
				doctorId: assignment.doctorId,
				shiftHours: assignment.shiftHours || "08:00–20:00",
			};
		}

		// 3. Preset bounds: morning only vs evening only
		if (assignment.shiftPreset === "morning") {
			if (!Number.isNaN(hourNum) && hourNum >= 14) {
				return { doctorId: null, shiftHours: "08:00–14:00" };
			}
			return { doctorId: assignment.doctorId, shiftHours: "08:00–14:00" };
		}
		if (assignment.shiftPreset === "evening") {
			if (!Number.isNaN(hourNum) && (hourNum < 14 || hourNum > 20)) {
				return { doctorId: null, shiftHours: "14:00–20:00" };
			}
			return { doctorId: assignment.doctorId, shiftHours: "14:00–20:00" };
		}

		// 4. Start/End hour limits
		const sHour = assignment.startHour ?? 8;
		const eHour = assignment.endHour ?? 20;
		if (!Number.isNaN(hourNum)) {
			if (hourNum >= sHour && (hourNum < eHour || (eHour >= 20 && hourNum <= 20))) {
				return {
					doctorId: assignment.doctorId,
					shiftHours:
						assignment.shiftHours ||
						`${String(sHour).padStart(2, "0")}:00–${String(eHour).padStart(2, "0")}:00`,
				};
			}
			return {
				doctorId: null,
				shiftHours:
					assignment.shiftHours ||
					`${String(sHour).padStart(2, "0")}:00–${String(eHour).padStart(2, "0")}:00`,
			};
		}

		return {
			doctorId: assignment.doctorId,
			shiftHours: assignment.shiftHours || "08:00–20:00",
		};
	}

	// 3. Fallback: if slot was explicitly booked for this chair with a doctor
	if (initialSlotDoctorId) {
		return { doctorId: initialSlotDoctorId, shiftHours: "08:00–20:00" };
	}

	// 4. Fallback: explicit defaultDoctorIdFallback (e.g. from chair.defaultDoctorId or solo doctor)
	if (defaultDoctorIdFallback) {
		return { doctorId: defaultDoctorIdFallback, shiftHours: "08:00–20:00" };
	}

	// 5. Fallback: check stored default doctor for chair in localStorage
	if (chairId) {
		try {
			const storedChairDef = safeLocalStorageGetJson<Record<string, string>>(
				"dente_chair_default_doctors",
				{},
			);
			if (storedChairDef?.[chairId]) {
				return { doctorId: storedChairDef[chairId], shiftHours: "08:00–20:00" };
			}
		} catch {}
	}

	return { doctorId: null, shiftHours: "08:00–20:00" };
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

export interface AppointmentCollisionDetail {
	type: "chair" | "doctor" | "patient";
	conflictingAppointmentId: string;
	conflictingStartsAt: string;
	conflictingEndsAt: string;
	conflictingDoctorId?: string | null | undefined;
	conflictingDoctorName?: string | null | undefined;
	conflictingChairId?: string | null | undefined;
	conflictingChairName?: string | null | undefined;
	conflictingPatientName?: string | null | undefined;
	message: string;
	overlapMinutes: number;
}

export interface AppointmentCollisionDetectionResult {
	hasCollision: boolean;
	primaryConflictType: "chair" | "doctor" | "patient" | null;
	collisions: AppointmentCollisionDetail[];
	message: string;
}

export interface ShiftMinutesOptionResult {
	minutes: number;
	label: string;
	newStartsAt: string;
	newEndsAt: string;
	isFree: boolean;
}

/**
 * Detects collisions for a prospective appointment against existing appointments:
 * 1. Chair collision: same chair at overlapping times.
 * 2. Doctor double-booking: same doctor at overlapping times across ANY chair/cabinet
 *    (a doctor cannot conduct two invasive clinical treatments simultaneously).
 * 3. Patient collision: same patient booked with different doctors at overlapping times.
 */
export function detectAppointmentCollisions(params: {
	candidate: {
		id?: string;
		doctorId?: string | null;
		chairId?: string | null;
		patientId?: string | null;
		startsAt: string;
		endsAt?: string | null;
		durationMinutes?: number;
		isCito?: boolean;
	};
	existingAppointments: Array<{
		id: string;
		startsAt: string;
		endsAt?: string | null;
		doctorUserId?: string | null;
		chairId?: string | null;
		patientId?: string | null;
		status?: string | null;
		durationMinutes?: number;
	}>;
	chairs?: Array<{ id: string; name: string; active?: boolean }>;
	staff?: Array<{ id: string; fullName?: string; name?: string }>;
	patients?: Array<{ id: string; fullName?: string; name?: string }>;
}): AppointmentCollisionDetectionResult {
	const { candidate, existingAppointments = [], chairs = [], staff = [], patients = [] } = params;

	const candStartMs = Date.parse(candidate.startsAt);
	const fallbackDuration = Number(candidate.durationMinutes) || 30;
	const candEndMs =
		candidate.endsAt && !Number.isNaN(Date.parse(candidate.endsAt))
			? Date.parse(candidate.endsAt)
			: candStartMs + fallbackDuration * 60000;

	if (Number.isNaN(candStartMs) || Number.isNaN(candEndMs) || candEndMs <= candStartMs) {
		return {
			hasCollision: false,
			primaryConflictType: null,
			collisions: [],
			message: "",
		};
	}

	const collisions: AppointmentCollisionDetail[] = [];

	const chairNameMap = new Map(chairs.map((c) => [c.id, c.name]));
	const staffNameMap = new Map(staff.map((s) => [s.id, s.fullName || s.name || "Врач"]));
	const patientNameMap = new Map(patients.map((p) => [p.id, p.fullName || p.name || "Пациент"]));

	for (const a of existingAppointments) {
		// Ignore cancelled, no-show, or self
		const s = String(a.status || "").toLowerCase();
		if (s === "cancelled" || s === "no_show" || s === "canceled") continue;
		if (candidate.id && a.id === candidate.id) continue;

		const aStartMs = Date.parse(a.startsAt);
		const aDuration = Number(a.durationMinutes) || 30;
		const aEndMs =
			a.endsAt && !Number.isNaN(Date.parse(a.endsAt))
				? Date.parse(a.endsAt)
				: aStartMs + aDuration * 60000;

		if (Number.isNaN(aStartMs) || Number.isNaN(aEndMs)) continue;

		// Overlap interval check via SSOT engine
		const isOverlapping = areIntervalsOverlapping(candStartMs, candEndMs, aStartMs, aEndMs);
		if (!isOverlapping) continue;

		const overlapMinutes = calculateOverlapDurationMinutes(candStartMs, candEndMs, aStartMs, aEndMs);

		const docName = a.doctorUserId ? staffNameMap.get(a.doctorUserId) || "Врач" : null;
		const chairName = a.chairId ? chairNameMap.get(a.chairId) || "Кресло" : null;
		const patName = a.patientId ? patientNameMap.get(a.patientId) || "Пациент" : null;

		// 1. Chair collision
		if (candidate.chairId && a.chairId && candidate.chairId === a.chairId) {
			collisions.push({
				type: "chair",
				conflictingAppointmentId: a.id,
				conflictingStartsAt: a.startsAt,
				conflictingEndsAt: a.endsAt || new Date(aEndMs).toISOString(),
				conflictingDoctorId: a.doctorUserId ?? null,
				conflictingDoctorName: docName,
				conflictingChairId: a.chairId ?? null,
				conflictingChairName: chairName,
				conflictingPatientName: patName,
				message: `Кресло «${chairName || candidate.chairId}» уже занято другим приёмом (${overlapMinutes} мин наложения).`,
				overlapMinutes,
			});
		}

		// 2. Doctor double-booking collision (even in different chairs!)
		if (candidate.doctorId && a.doctorUserId && candidate.doctorId === a.doctorUserId) {
			collisions.push({
				type: "doctor",
				conflictingAppointmentId: a.id,
				conflictingStartsAt: a.startsAt,
				conflictingEndsAt: a.endsAt || new Date(aEndMs).toISOString(),
				conflictingDoctorId: a.doctorUserId ?? null,
				conflictingDoctorName: docName,
				conflictingChairId: a.chairId ?? null,
				conflictingChairName: chairName,
				conflictingPatientName: patName,
				message: `Врач «${docName || candidate.doctorId}» уже ведёт приём в это время в «${chairName || "другом кабинете"}» (${overlapMinutes} мин наложения). Одновременный приём запрещён.`,
				overlapMinutes,
			});
		}

		// 3. Patient collision
		if (candidate.patientId && a.patientId && candidate.patientId === a.patientId) {
			collisions.push({
				type: "patient",
				conflictingAppointmentId: a.id,
				conflictingStartsAt: a.startsAt,
				conflictingEndsAt: a.endsAt || new Date(aEndMs).toISOString(),
				conflictingDoctorId: a.doctorUserId ?? null,
				conflictingDoctorName: docName,
				conflictingChairId: a.chairId ?? null,
				conflictingChairName: chairName,
				conflictingPatientName: patName,
				message: `Пациент «${patName || candidate.patientId}» уже записан к врачу «${docName || "клиники"}» на это время.`,
				overlapMinutes,
			});
		}
	}

	const hasCollision = collisions.length > 0;
	let primaryConflictType: "chair" | "doctor" | "patient" | null = null;
	if (hasCollision) {
		if (collisions.some((c) => c.type === "doctor")) {
			primaryConflictType = "doctor";
		} else if (collisions.some((c) => c.type === "chair")) {
			primaryConflictType = "chair";
		} else {
			primaryConflictType = "patient";
		}
	}

	const message = collisions.map((c) => c.message).join(" ");

	return {
		hasCollision,
		primaryConflictType,
		collisions,
		message,
	};
}

/**
 * Finds alternative chairs that are completely free during candidate appointment time.
 */
export function findAlternativeChairsForSlot(params: {
	startsAt: string;
	endsAt?: string | null;
	durationMinutes?: number;
	currentChairId?: string | null;
	chairs: Array<{ id: string; name: string; active?: boolean }>;
	existingAppointments: Array<{
		id: string;
		startsAt: string;
		endsAt?: string | null;
		chairId?: string | null;
		status?: string | null;
		durationMinutes?: number;
	}>;
}): Array<{ id: string; name: string }> {
	const {
		startsAt,
		endsAt,
		durationMinutes = 30,
		currentChairId,
		chairs = [],
		existingAppointments = [],
	} = params;

	const startMs = Date.parse(startsAt);
	const endMs =
		endsAt && !Number.isNaN(Date.parse(endsAt))
			? Date.parse(endsAt)
			: startMs + durationMinutes * 60000;

	if (Number.isNaN(startMs) || Number.isNaN(endMs)) return [];

	const activeChairs = chairs.filter((c) => c.active !== false && c.id !== currentChairId);

	return activeChairs.filter((chair) => {
		const hasConflict = existingAppointments.some((a) => {
			const s = String(a.status || "").toLowerCase();
			if (s === "cancelled" || s === "no_show" || s === "canceled") return false;
			if (a.chairId !== chair.id) return false;

			const aStartMs = Date.parse(a.startsAt);
			const aDuration = Number(a.durationMinutes) || 30;
			const aEndMs =
				a.endsAt && !Number.isNaN(Date.parse(a.endsAt))
					? Date.parse(a.endsAt)
					: aStartMs + aDuration * 60000;

			return areIntervalsOverlapping(startMs, endMs, aStartMs, aEndMs);
		});

		return !hasConflict;
	});
}

/**
 * Calculates shift proposals (+15, +30, +45, +60 min) and evaluates whether they are free.
 */
export function findShiftMinutesOptions(params: {
	startsAt: string;
	durationMinutes?: number;
	chairId?: string | null;
	doctorId?: string | null;
	shiftMinutes?: readonly number[];
	existingAppointments: Array<{
		id: string;
		startsAt: string;
		endsAt?: string | null;
		chairId?: string | null;
		doctorUserId?: string | null;
		status?: string | null;
		durationMinutes?: number;
	}>;
}): ShiftMinutesOptionResult[] {
	const {
		startsAt,
		durationMinutes = 30,
		chairId,
		doctorId,
		shiftMinutes = [15, 30, 45, 60],
		existingAppointments = [],
	} = params;

	const baseStartMs = Date.parse(startsAt);
	if (Number.isNaN(baseStartMs)) return [];

	return shiftMinutes.map((shift) => {
		const newStartMs = baseStartMs + shift * 60000;
		const newEndMs = newStartMs + durationMinutes * 60000;
		const newStartsAt = new Date(newStartMs).toISOString();
		const newEndsAt = new Date(newEndMs).toISOString();

		const hasConflict = existingAppointments.some((a) => {
			const s = String(a.status || "").toLowerCase();
			if (s === "cancelled" || s === "no_show" || s === "canceled") return false;

			const matchesChair = chairId && a.chairId === chairId;
			const matchesDoc = doctorId && a.doctorUserId === doctorId;
			if (!matchesChair && !matchesDoc) return false;

			const aStartMs = Date.parse(a.startsAt);
			const aDuration = Number(a.durationMinutes) || 30;
			const aEndMs =
				a.endsAt && !Number.isNaN(Date.parse(a.endsAt))
					? Date.parse(a.endsAt)
					: aStartMs + aDuration * 60000;

			return areIntervalsOverlapping(newStartMs, newEndMs, aStartMs, aEndMs);
		});

		return {
			minutes: shift,
			label: `+${shift} мин`,
			newStartsAt,
			newEndsAt,
			isFree: !hasConflict,
		};
	});
}
