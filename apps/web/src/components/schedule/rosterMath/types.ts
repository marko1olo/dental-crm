/**
 * DENTE Dental CRM — Doctor & Chair Roster Mathematical Engine: Domain Types & Models (types.ts)
 *
 * Principles & Compliance:
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons, non-blocking 1-tap actions)
 * - Mandate 8k: CRM != Reality Simulator (1-click weekly shift assignment, copy week/month)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (resilient defaults for 1 chair / 1 doctor)
 * - Mandate 8d: Apple HIG & Medical Density (touch targets >= 44x44px, 0 emojis)
 */

import {
	DEFAULT_CLINIC_STAFF,
	CLINIC_CABINETS_CATALOG,
	type StaffMember,
	type CabinetDefinition,
	type ShiftArchetypeId,
	type DoctorChairRosterTemplateId,
	type DoctorChairRosterTemplate,
	DOCTOR_CHAIR_ROSTER_TEMPLATES,
} from "../roster/doctorShiftRosterPresets";
import type { DoctorShift } from "../roster/doctorShiftRosterEngine";
import type {
	DateRangeShiftPreset,
	DateRangeShiftBindingParams,
} from "../roster/doctorWeeklyScheduleGenerator";

export {
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
	shiftPreset?:
		| "morning"
		| "morning_9"
		| "evening"
		| "evening_15"
		| "full"
		| "full_9_21"
		| "two_shifts"
		| "custom"
		| undefined;
	shiftLabel?: string | undefined;
	shiftHours: string;
	startHour?: number | undefined;
	endHour?: number | undefined;
	subShifts?: ChairDoctorSubShift[] | undefined;
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
