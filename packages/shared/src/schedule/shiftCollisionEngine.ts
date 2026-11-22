/**
 * MULTI-CHAIR CLINICAL SCHEDULE COLLISION & EMERGENCY RESERVE ENGINE
 * Ported & adapted from Dentalpin agenda module & DENTE multi-chair scheduling invariants.
 *
 * Capabilities:
 * 1. Multi-chair doctor, cabinet, and patient schedule collision detection (checkScheduleOverlap).
 * 2. Dedicated emergency reserve slot buffer calculation (e.g. 30 min per shift for acute toothache / острая боль).
 * 3. Sweeping-line + Disjoint Set Union (DSU) side-by-side timeline overlap grouping (calculateScheduleOverlapGroups).
 * 4. Free slot intervals discovery with shift boundaries and emergency reserve respect.
 * 5. Full Zod validation contracts and pure zero-dependency TypeScript implementation.
 */

import { z } from "zod";
import {
	appointmentStatusSchema,
	type AppointmentStatus,
} from "./appointmentSchemas.js";

// ─── 1. SCHEMAS & TYPES ──────────────────────────────────────────────────────

export const appointmentScheduleStatusSchema = appointmentStatusSchema;
export type AppointmentScheduleStatus = AppointmentStatus;

export const scheduleCollisionTypeSchema = z.enum([
	"doctor_overlap",
	"cabinet_overlap",
	"patient_double_booking",
	"outside_shift_bounds",
	"emergency_reserve_blocked",
]);
export type ScheduleCollisionType = z.infer<typeof scheduleCollisionTypeSchema>;

export const timeIntervalSchema = z.object({
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
});
export type TimeInterval = z.infer<typeof timeIntervalSchema>;

export const scheduledAppointmentSchema = z.object({
	id: z.string().uuid(),
	clinicId: z.string().uuid(),
	doctorId: z.string().uuid(),
	cabinetId: z.string().uuid().nullable().optional(),
	cabinetName: z.string().optional(),
	patientId: z.string().uuid(),
	patientFullName: z.string().optional(),
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
	status: appointmentScheduleStatusSchema,
	isEmergency: z.boolean().optional().default(false),
	notes: z.string().max(2000).nullable().optional(),
});
export type ScheduledAppointment = z.input<typeof scheduledAppointmentSchema>;

export const doctorShiftScheduleSchema = z.object({
	id: z.string().uuid(),
	clinicId: z.string().uuid(),
	doctorId: z.string().uuid(),
	doctorFullName: z.string().optional(),
	cabinetId: z.string().uuid().nullable().optional(),
	shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
	breakStartTime: z.string().datetime().nullable().optional(),
	breakEndTime: z.string().datetime().nullable().optional(),
	isEmergencyReserveEnabled: z.boolean().default(true),
	emergencyReserveMinutes: z.number().int().min(0).max(180).default(30),
	notes: z.string().max(1000).nullable().optional(),
});
export type DoctorShiftSchedule = z.input<typeof doctorShiftScheduleSchema>;

export const emergencyReserveSlotSchema = z.object({
	id: z.string().uuid(),
	shiftId: z.string().uuid(),
	clinicId: z.string().uuid(),
	doctorId: z.string().uuid(),
	cabinetId: z.string().uuid().nullable().optional(),
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
	durationMinutes: z.number().int().positive(),
	isBooked: z.boolean().default(false),
	bookedAppointmentId: z.string().uuid().nullable().optional(),
	reason: z.literal("acute_pain_buffer"),
});
export type EmergencyReserveSlot = z.infer<typeof emergencyReserveSlotSchema>;

export const scheduleCollisionDetailSchema = z.object({
	type: scheduleCollisionTypeSchema,
	conflictingAppointmentId: z.string().uuid().optional(),
	conflictingShiftId: z.string().uuid().optional(),
	descriptionRu: stringOrEmpty(),
	overlapDurationMinutes: z.number().int().min(0),
});
export type ScheduleCollisionDetail = z.infer<typeof scheduleCollisionDetailSchema>;

function stringOrEmpty() {
	return z.string();
}

export const scheduleCollisionResultSchema = z.object({
	hasConflict: z.boolean(),
	conflicts: z.array(scheduleCollisionDetailSchema),
	canForceSchedule: z.boolean(),
});
export type ScheduleCollisionResult = z.infer<typeof scheduleCollisionResultSchema>;

export const freeSlotIntervalSchema = z.object({
	startTime: z.string().datetime(),
	endTime: z.string().datetime(),
	durationMinutes: z.number().int().positive(),
	doctorId: z.string().uuid(),
	cabinetId: z.string().uuid().nullable().optional(),
	qualifiesForTargetDuration: z.boolean(),
});
export type FreeSlotInterval = z.infer<typeof freeSlotIntervalSchema>;

export const overlapLayoutPositionSchema = z.object({
	columnIndex: z.number().int().min(0),
	totalColumns: z.number().int().min(1),
	groupRootId: z.string(),
});
export type OverlapLayoutPosition = z.infer<typeof overlapLayoutPositionSchema>;

// ─── 2. COLLISION DETECTION ENGINE ───────────────────────────────────────────

export interface ScheduleOverlapOptions {
	readonly ignoreCancelled?: boolean;
	readonly ignoreSelfId?: string | undefined;
	readonly allowCabinetDoubleBooking?: boolean;
}

/**
 * Validates whether two time intervals overlap.
 * Overlap exists if max(start1, start2) < min(end1, end2).
 */
export function areIntervalsOverlapping(
	start1: Date | string | number,
	end1: Date | string | number,
	start2: Date | string | number,
	end2: Date | string | number,
): boolean {
	const s1 = new Date(start1).getTime();
	const e1 = new Date(end1).getTime();
	const s2 = new Date(start2).getTime();
	const e2 = new Date(end2).getTime();

	if (Number.isNaN(s1) || Number.isNaN(e1) || Number.isNaN(s2) || Number.isNaN(e2)) {
		return false;
	}
	return Math.max(s1, s2) < Math.min(e1, e2);
}

/**
 * Calculates overlap duration in minutes between two intervals.
 */
export function calculateOverlapDurationMinutes(
	start1: Date | string | number,
	end1: Date | string | number,
	start2: Date | string | number,
	end2: Date | string | number,
): number {
	const s1 = new Date(start1).getTime();
	const e1 = new Date(end1).getTime();
	const s2 = new Date(start2).getTime();
	const e2 = new Date(end2).getTime();

	const overlapStart = Math.max(s1, s2);
	const overlapEnd = Math.min(e1, e2);

	if (overlapStart >= overlapEnd) return 0;
	return Math.round((overlapEnd - overlapStart) / 60000);
}

export interface ScheduleOverlapTarget {
	readonly id?: string | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctorUserId?: string | null | undefined;
	readonly cabinetId?: string | null | undefined;
	readonly chairId?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly startTime?: string | Date | undefined;
	readonly startsAt?: string | Date | undefined;
	readonly endTime?: string | Date | undefined;
	readonly endsAt?: string | Date | undefined;
}

export interface ScheduleOverlapItem {
	readonly id?: string | undefined;
	readonly clinicId?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctorUserId?: string | null | undefined;
	readonly doctorFullName?: string | undefined;
	readonly cabinetId?: string | null | undefined;
	readonly cabinetName?: string | undefined;
	readonly chairId?: string | null | undefined;
	readonly chairName?: string | undefined;
	readonly patientId?: string | null | undefined;
	readonly patientFullName?: string | undefined;
	readonly startTime?: string | Date | undefined;
	readonly startsAt?: string | Date | undefined;
	readonly startAt?: string | Date | undefined;
	readonly endTime?: string | Date | undefined;
	readonly endsAt?: string | Date | undefined;
	readonly durationMinutes?: number | string | undefined;
	readonly status?: string | undefined;
	readonly isEmergency?: boolean | undefined;
	readonly reason?: string | null | undefined;
	readonly notes?: string | null | undefined;
	readonly comment?: string | null | undefined;
}

/**
 * Checks for scheduling collisions across Doctor, Cabinet, and Patient.
 * Seamlessly accepts both ScheduledAppointment and canonical Appointment (Mandates 8b, 8e, 8n).
 */
export function checkScheduleOverlap(
	target: ScheduleOverlapTarget,
	existingAppointments: readonly ScheduleOverlapItem[],
	options: ScheduleOverlapOptions = {},
): ScheduleCollisionResult {
	const { ignoreCancelled = true, ignoreSelfId = target.id, allowCabinetDoubleBooking = false } = options;
	const conflicts: ScheduleCollisionDetail[] = [];

	const targetDoctorId = target.doctorId ?? target.doctorUserId ?? undefined;
	const targetCabinetId = target.cabinetId ?? target.chairId ?? undefined;
	const targetPatientId = target.patientId ?? undefined;
	const rawTargetStart = target.startTime ?? target.startsAt;
	const rawTargetEnd = target.endTime ?? target.endsAt;

	const targetStart = rawTargetStart ? new Date(rawTargetStart).getTime() : NaN;
	const targetEnd = rawTargetEnd ? new Date(rawTargetEnd).getTime() : NaN;

	if (Number.isNaN(targetStart) || Number.isNaN(targetEnd) || targetEnd <= targetStart) {
		conflicts.push({
			type: "outside_shift_bounds",
			descriptionRu: "Время окончания приема должно быть строго позже времени начала.",
			overlapDurationMinutes: 0,
		});
		return {
			hasConflict: true,
			conflicts,
			canForceSchedule: false,
		};
	}

	for (const apt of existingAppointments) {
		if (ignoreSelfId && apt.id === ignoreSelfId) continue;
		if (ignoreCancelled && (apt.status === "cancelled" || apt.status === "no_show")) continue;

		const aptDoctorId = ("doctorId" in apt && apt.doctorId ? apt.doctorId : ("doctorUserId" in apt ? apt.doctorUserId : undefined)) ?? undefined;
		const aptCabinetId = ("cabinetId" in apt && apt.cabinetId ? apt.cabinetId : ("chairId" in apt ? apt.chairId : undefined)) ?? undefined;
		const aptPatientId = apt.patientId ?? undefined;
		const rawAptStart = "startTime" in apt && apt.startTime ? apt.startTime : ("startsAt" in apt ? apt.startsAt : undefined);
		const rawAptEnd = "endTime" in apt && apt.endTime ? apt.endTime : ("endsAt" in apt ? apt.endsAt : undefined);

		const aptStart = rawAptStart ? new Date(rawAptStart).getTime() : NaN;
		const aptEnd = rawAptEnd ? new Date(rawAptEnd).getTime() : NaN;

		if (Number.isNaN(aptStart) || Number.isNaN(aptEnd)) continue;

		if (Math.max(targetStart, aptStart) < Math.min(targetEnd, aptEnd)) {
			const overlapMin = calculateOverlapDurationMinutes(new Date(targetStart), new Date(targetEnd), new Date(aptStart), new Date(aptEnd));

			// 1. Doctor collision
			if (targetDoctorId && aptDoctorId === targetDoctorId) {
				conflicts.push({
					type: "doctor_overlap",
					conflictingAppointmentId: apt.id,
					descriptionRu: `Врач уже занят на приеме (с ${new Date(aptStart).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} до ${new Date(aptEnd).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}). Наложение: ${overlapMin} мин.`,
					overlapDurationMinutes: overlapMin,
				});
			}

			// 2. Cabinet collision
			if (!allowCabinetDoubleBooking && targetCabinetId && aptCabinetId && targetCabinetId === aptCabinetId) {
				conflicts.push({
					type: "cabinet_overlap",
					conflictingAppointmentId: apt.id,
					descriptionRu: `Кабинет/кресло уже занято другим приемом (с ${new Date(aptStart).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} до ${new Date(aptEnd).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}). Наложение: ${overlapMin} мин.`,
					overlapDurationMinutes: overlapMin,
				});
			}

			// 3. Patient double booking
			if (targetPatientId && aptPatientId === targetPatientId) {
				conflicts.push({
					type: "patient_double_booking",
					conflictingAppointmentId: apt.id,
					descriptionRu: `Пациент уже записан на другой прием в это же время (наложение ${overlapMin} мин).`,
					overlapDurationMinutes: overlapMin,
				});
			}
		}
	}

	return {
		hasConflict: conflicts.length > 0,
		conflicts,
		canForceSchedule: conflicts.length > 0 && conflicts.every((c) => c.type !== "patient_double_booking"),
	};
}

// ─── 3. EMERGENCY RESERVE SLOT BUFFER CALCULATION ─────────────────────────────

/**
 * Computes the dedicated emergency reserve slot buffer for acute toothache in a shift.
 * Default strategy places the buffer in the last 30-45 minutes of the doctor's shift.
 */
export function calculateEmergencyReserveSlots(
	shift: DoctorShiftSchedule,
	existingAppointments: readonly ScheduledAppointment[] = [],
): EmergencyReserveSlot[] {
	const reserveMinutes = shift.emergencyReserveMinutes ?? 30;
	if (!shift.isEmergencyReserveEnabled || reserveMinutes <= 0) {
		return [];
	}

	const shiftStart = new Date(shift.startTime).getTime();
	const shiftEnd = new Date(shift.endTime).getTime();
	const reserveDurationMs = reserveMinutes * 60000;

	if (shiftEnd - shiftStart <= reserveDurationMs) {
		return [];
	}

	// Place reserve slot at the end of the shift (or before the end)
	const reserveStartMs = shiftEnd - reserveDurationMs;
	const reserveEndMs = shiftEnd;

	const reserveStartIso = new Date(reserveStartMs).toISOString();
	const reserveEndIso = new Date(reserveEndMs).toISOString();

	// Check if any existing appointment occupies this buffer
	let isBooked = false;
	let bookedAppointmentId: string | null = null;

	for (const apt of existingAppointments) {
		if (apt.status === "cancelled" || apt.status === "no_show") continue;
		if (apt.doctorId !== shift.doctorId) continue;

		const aptStart = new Date(apt.startTime).getTime();
		const aptEnd = new Date(apt.endTime).getTime();

		if (Math.max(reserveStartMs, aptStart) < Math.min(reserveEndMs, aptEnd)) {
			isBooked = true;
			bookedAppointmentId = apt.id;
			break;
		}
	}

	return [
		{
			id: `reserve-${shift.id}`,
			shiftId: shift.id,
			clinicId: shift.clinicId,
			doctorId: shift.doctorId,
			cabinetId: shift.cabinetId,
			startTime: reserveStartIso,
			endTime: reserveEndIso,
			durationMinutes: reserveMinutes,
			isBooked,
			bookedAppointmentId,
			reason: "acute_pain_buffer",
		},
	];
}

// ─── 4. SWEEPING-LINE & DSU TIMELINE OVERLAP GROUPING ─────────────────────────

/**
 * Groups overlapping appointments using Disjoint Set Union (DSU) and assigns
 * zero-indexed column positions (columnIndex) and total group columns (totalColumns).
 * Ideal for multi-chair and daily calendar side-by-side rendering.
 */
export function calculateScheduleOverlapGroups(
	appointments: readonly ScheduledAppointment[],
): Map<string, OverlapLayoutPosition> {
	const result = new Map<string, OverlapLayoutPosition>();
	if (appointments.length === 0) return result;

	const activeAppointments = appointments.filter(
		(a) => a.status !== "cancelled" && a.status !== "no_show",
	);
	if (activeAppointments.length === 0) return result;

	const items = activeAppointments.map((apt) => ({
		apt,
		start: new Date(apt.startTime).getTime(),
		end: new Date(apt.endTime).getTime(),
	}));

	items.sort((a, b) => a.start - b.start || a.end - b.end);

	// DSU initialization
	const parent = new Array(items.length).fill(0).map((_, i) => i);
	const rank = new Array(items.length).fill(0);

	function find(i: number): number {
		let curr = i;
		while (parent[curr] !== undefined && parent[curr] !== curr) {
			const p = parent[curr];
			if (p === undefined) break;
			const gp = parent[p];
			if (gp !== undefined) {
				parent[curr] = gp;
			}
			curr = p;
		}
		return curr;
	}

	function union(a: number, b: number): void {
		const ra = find(a);
		const rb = find(b);
		if (ra === rb) return;
		const rankRa = rank[ra] ?? 0;
		const rankRb = rank[rb] ?? 0;
		if (rankRa < rankRb) {
			parent[ra] = rb;
		} else if (rankRa > rankRb) {
			parent[rb] = ra;
		} else {
			parent[rb] = ra;
			rank[ra] = rankRa + 1;
		}
	}

	// Active intervals sweep-line
	const active: number[] = [];
	for (let i = 0; i < items.length; i++) {
		const cur = items[i];
		if (!cur) continue;
		while (active.length > 0) {
			const firstActiveIdx = active[0];
			if (firstActiveIdx === undefined) break;
			const firstActive = items[firstActiveIdx];
			if (firstActive && firstActive.end <= cur.start) {
				active.shift();
			} else {
				break;
			}
		}
		for (const j of active) {
			union(i, j);
		}
		active.push(i);
		active.sort((x, y) => {
			const itemX = items[x];
			const itemY = items[y];
			if (!itemX || !itemY) return 0;
			return itemX.end - itemY.end;
		});
	}

	// Materialize groups
	const groups = new Map<number, number[]>();
	for (let i = 0; i < items.length; i++) {
		const root = find(i);
		let g = groups.get(root);
		if (!g) {
			g = [];
			groups.set(root, g);
		}
		g.push(i);
	}

	for (const [rootIdx, g] of groups.entries()) {
		g.sort((a, b) => {
			const itemA = items[a];
			const itemB = items[b];
			if (!itemA || !itemB) return 0;
			return itemA.start - itemB.start;
		});
		const total = g.length;
		const rootId = items[rootIdx]?.apt.id || `group-${rootIdx}`;
		g.forEach((idx, columnIndex) => {
			const item = items[idx];
			if (!item) return;
			result.set(item.apt.id, {
				columnIndex,
				totalColumns: total,
				groupRootId: rootId,
			});
		});
	}

	return result;
}

// ─── 5. FREE SLOT INTERVALS DISCOVERY ─────────────────────────────────────────

export interface FreeSlotDiscoveryOptions {
	readonly minDurationMinutes?: number;
	readonly excludeEmergencyReserves?: boolean;
}

/**
 * Finds available free slot intervals within a doctor's shift by subtracting
 * booked appointments, breaks, and emergency reserves.
 */
export function findAvailableSlots(
	shift: DoctorShiftSchedule,
	appointments: readonly ScheduledAppointment[],
	options: FreeSlotDiscoveryOptions = {},
): FreeSlotInterval[] {
	const { minDurationMinutes = 30, excludeEmergencyReserves = true } = options;

	const shiftStart = new Date(shift.startTime).getTime();
	const shiftEnd = new Date(shift.endTime).getTime();

	if (shiftEnd <= shiftStart) return [];

	interface BlockedSpan {
		start: number;
		end: number;
	}

	const busySpans: BlockedSpan[] = [];

	// 1. Shift break
	if (shift.breakStartTime && shift.breakEndTime) {
		const bStart = new Date(shift.breakStartTime).getTime();
		const bEnd = new Date(shift.breakEndTime).getTime();
		if (bEnd > bStart) {
			busySpans.push({ start: bStart, end: bEnd });
		}
	}

	// 2. Existing appointments for this doctor
	for (const apt of appointments) {
		if (apt.doctorId !== shift.doctorId) continue;
		if (apt.status === "cancelled" || apt.status === "no_show") continue;

		const aStart = new Date(apt.startTime).getTime();
		const aEnd = new Date(apt.endTime).getTime();

		const clampedStart = Math.max(shiftStart, aStart);
		const clampedEnd = Math.min(shiftEnd, aEnd);

		if (clampedEnd > clampedStart) {
			busySpans.push({ start: clampedStart, end: clampedEnd });
		}
	}

	// 3. Emergency reserve buffer
	const reserveMinutes = shift.emergencyReserveMinutes ?? 30;
	if (excludeEmergencyReserves && shift.isEmergencyReserveEnabled && reserveMinutes > 0) {
		const reserveMs = reserveMinutes * 60000;
		const rStart = Math.max(shiftStart, shiftEnd - reserveMs);
		busySpans.push({ start: rStart, end: shiftEnd });
	}

	// Merge overlapping busy intervals
	if (busySpans.length === 0) {
		const durationMin = Math.round((shiftEnd - shiftStart) / 60000);
		return [
			{
				startTime: new Date(shiftStart).toISOString(),
				endTime: new Date(shiftEnd).toISOString(),
				durationMinutes: durationMin,
				doctorId: shift.doctorId,
				cabinetId: shift.cabinetId,
				qualifiesForTargetDuration: durationMin >= minDurationMinutes,
			},
		];
	}

	busySpans.sort((a, b) => a.start - b.start);
	const mergedBusy: BlockedSpan[] = [];
	const firstSpan = busySpans[0];
	if (!firstSpan) return [];
	let current = { ...firstSpan };

	for (let i = 1; i < busySpans.length; i++) {
		const next = busySpans[i];
		if (!next) continue;
		if (next.start <= current.end) {
			current.end = Math.max(current.end, next.end);
		} else {
			mergedBusy.push(current);
			current = { ...next };
		}
	}
	mergedBusy.push(current);

	// Compute complement (free spans)
	const freeIntervals: FreeSlotInterval[] = [];
	let cursor = shiftStart;

	for (const b of mergedBusy) {
		if (b.start > cursor) {
			const dur = Math.round((b.start - cursor) / 60000);
			if (dur > 0) {
				freeIntervals.push({
					startTime: new Date(cursor).toISOString(),
					endTime: new Date(b.start).toISOString(),
					durationMinutes: dur,
					doctorId: shift.doctorId,
					cabinetId: shift.cabinetId,
					qualifiesForTargetDuration: dur >= minDurationMinutes,
				});
			}
		}
		cursor = Math.max(cursor, b.end);
	}

	if (cursor < shiftEnd) {
		const dur = Math.round((shiftEnd - cursor) / 60000);
		if (dur > 0) {
			freeIntervals.push({
				startTime: new Date(cursor).toISOString(),
				endTime: new Date(shiftEnd).toISOString(),
				durationMinutes: dur,
				doctorId: shift.doctorId,
				cabinetId: shift.cabinetId,
				qualifiesForTargetDuration: dur >= minDurationMinutes,
			});
		}
	}

	return freeIntervals;
}

// ─── 6. CANONICAL TIMEZONE HELPERS & FREE SLOTS SCANNER ──────────────────────

export function timeZoneOffsetMinutes(
	timeZone: string | null | undefined,
	at: Date,
): number {
	if (!timeZone || timeZone === "UTC" || timeZone === "GMT") return 0;
	try {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			timeZoneName: "shortOffset",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		}).formatToParts(at);
		const value =
			parts.find((part) => part.type === "timeZoneName")?.value ?? "";
		if (value === "GMT" || value === "UTC") return 0;
		const match = /(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/.exec(value);
		if (!match) return 0;
		const sign = match[1] === "-" ? -1 : 1;
		return sign * (Number(match[2]) * 60 + Number(match[3] ?? "0"));
	} catch {
		return 0;
	}
}

export function timeZoneOffsetSuffix(offsetMinutes: number): string {
	const sign = offsetMinutes < 0 ? "-" : "+";
	const absolute = Math.abs(offsetMinutes);
	const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
	const minutes = String(absolute % 60).padStart(2, "0");
	return `${sign}${hours}:${minutes}`;
}

export function buildZonedIsoString(
	dateKey: string,
	timeStr: string,
	timeZone?: string | null,
): string {
	const cleanDate = dateKey.slice(0, 10);
	const [hStr = "00", mStr = "00"] = timeStr.slice(0, 5).split(":");
	const h = Number(hStr) || 0;
	const m = Number(mStr) || 0;
	const padH = String(h).padStart(2, "0");
	const padM = String(m).padStart(2, "0");

	if (!timeZone || timeZone === "UTC" || timeZone === "GMT") {
		return `${cleanDate}T${padH}:${padM}:00.000Z`;
	}

	const [yStr, monStr, dStr] = cleanDate.split("-");
	const year = Number(yStr) || 2026;
	const month = Number(monStr) || 1;
	const day = Number(dStr) || 1;

	const utcGuess = new Date(Date.UTC(year, month - 1, day, h, m, 0));
	let offsetMinutes = timeZoneOffsetMinutes(timeZone, utcGuess);
	const correctedInstant = new Date(utcGuess.getTime() - offsetMinutes * 60_000);
	const correctedOffsetMinutes = timeZoneOffsetMinutes(timeZone, correctedInstant);
	if (correctedOffsetMinutes !== offsetMinutes) {
		offsetMinutes = correctedOffsetMinutes;
	}

	return new Date(utcGuess.getTime() - offsetMinutes * 60_000).toISOString();
}

export type TimeOfDayFilter = "all" | "morning" | "day" | "evening";

export function getTimeOfDayCategory(hour: number): "morning" | "day" | "evening" {
	if (hour < 12) return "morning";
	if (hour < 16) return "day";
	return "evening";
}

function parseTimeStringToMinutes(raw?: string | Date | null): number {
	if (!raw) return 0;
	const str = typeof raw === "string" ? raw : raw.toISOString();
	if (str.includes("T")) {
		const timePart = str.split("T")[1]?.slice(0, 5) || "00:00";
		const [h = 0, m = 0] = timePart.split(":").map(Number);
		return (h ?? 0) * 60 + (m ?? 0);
	}
	const [h = 0, m = 0] = str.slice(0, 5).split(":").map(Number);
	return (h ?? 0) * 60 + (m ?? 0);
}

function formatMinutesToTime(totalMin: number): string {
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface WorkingHoursConfig {
	startHour?: number;
	endHour?: number;
	stepMinutes?: number;
	workingDays?: readonly number[];
	breakIntervals?: readonly { startTime: string; endTime: string }[];
	timezone?: string | null;
}

export interface FindFreeScheduleIntervalsParams {
	doctorId?: string | null | undefined;
	chairId?: string | null | undefined;
	dateFrom: string;
	dateTo?: string | null | undefined;
	durationMinutes: number;
	existingAppointments: readonly ScheduleOverlapItem[];
	chairs?: readonly { id: string; name: string; active?: boolean }[];
	doctors?: readonly { id: string; fullName: string; active?: boolean; specialties?: string[] }[];
	workingHours?: WorkingHoursConfig;
	timeOfDayFilter?: "all" | "morning" | "day" | "evening";
	timezone?: string | null;
}

export interface FreeScheduleInterval {
	date: string;
	startTime: string;
	endTime: string;
	startsAtIso: string;
	endsAtIso: string;
	timeDisplay: string;
	durationMinutes: number;
	doctorId?: string | undefined;
	doctorName?: string | undefined;
	chairId?: string | undefined;
	chairName?: string | undefined;
	timeOfDay: "morning" | "day" | "evening";
}

export function findFreeScheduleIntervals(
	params: FindFreeScheduleIntervalsParams,
): FreeScheduleInterval[] {
	const {
		doctorId,
		chairId,
		dateFrom,
		dateTo = dateFrom,
		durationMinutes,
		existingAppointments = [],
		chairs = [],
		doctors = [],
		workingHours = {},
		timeOfDayFilter = "all",
		timezone = workingHours.timezone ?? null,
	} = params;

	if (!dateFrom || durationMinutes <= 0) {
		return [];
	}

	const startHour = workingHours.startHour ?? 9;
	const endHour = workingHours.endHour ?? 20;
	const stepMinutes = workingHours.stepMinutes ?? 15;
	const workingDays = workingHours.workingDays ?? [1, 2, 3, 4, 5, 6];
	const breakIntervals = (workingHours.breakIntervals ?? []).map((b) => ({
		startMin: parseTimeStringToMinutes(b.startTime),
		endMin: parseTimeStringToMinutes(b.endTime),
	}));

	const activeChairs = chairs.filter((c) => c.active !== false);
	const defaultChair = activeChairs[0] ?? { id: "chair-1", name: "Кабинет 1" };
	const activeDoctors = doctors.filter((d) => d.active !== false);

	const activeAppointments = existingAppointments.filter((a) => {
		const s = a?.status;
		return s !== "cancelled" && s !== "no_show";
	});

	const fromObj = new Date(`${dateFrom}T00:00:00`);
	const toObj = new Date(`${dateTo}T00:00:00`);
	if (Number.isNaN(fromObj.getTime()) || Number.isNaN(toObj.getTime())) {
		return [];
	}

	const diffDays = Math.min(60, Math.max(0, Math.round((toObj.getTime() - fromObj.getTime()) / 86400000)));
	const results: FreeScheduleInterval[] = [];

	for (let d = 0; d <= diffDays; d++) {
		const dayObj = new Date(fromObj);
		dayObj.setDate(fromObj.getDate() + d);
		const dayOfWeek = dayObj.getDay();

		if (workingDays.length > 0 && !workingDays.includes(dayOfWeek)) {
			continue;
		}

		const yyyy = dayObj.getFullYear();
		const mm = String(dayObj.getMonth() + 1).padStart(2, "0");
		const dd = String(dayObj.getDate()).padStart(2, "0");
		const dateKey = `${yyyy}-${mm}-${dd}`;

		const dayAppts = activeAppointments
			.filter((a) => {
				const raw = a.startsAt || a.startTime || a.startAt || "";
				const str = typeof raw === "string" ? raw : raw instanceof Date ? raw.toISOString() : "";
				return str.slice(0, 10) === dateKey;
			})
			.map((a) => {
				const startRaw = a.startsAt || a.startTime || a.startAt || "";
				const aStartMin = parseTimeStringToMinutes(startRaw);

				const aDur = Number(a.durationMinutes) || 30;
				let aEndMin = aStartMin + aDur;
				const endRaw = a.endsAt || a.endTime || "";
				if (endRaw) {
					aEndMin = parseTimeStringToMinutes(endRaw);
				}

				return {
					doctorUserId: a.doctorUserId || a.doctorId,
					chairId: a.chairId,
					startMin: aStartMin,
					endMin: aEndMin,
				};
			});

		const dayStartMin = startHour * 60;
		const dayEndMin = endHour * 60;

		for (let startMin = dayStartMin; startMin + durationMinutes <= dayEndMin; startMin += stepMinutes) {
			const endMin = startMin + durationMinutes;
			const startH = Math.floor(startMin / 60);

			const tod = getTimeOfDayCategory(startH);
			if (timeOfDayFilter !== "all" && tod !== timeOfDayFilter) {
				continue;
			}

			const hasBreak = breakIntervals.some((b) => startMin < b.endMin && endMin > b.startMin);
			if (hasBreak) {
				continue;
			}

			let assignedDoctorId = doctorId || undefined;
			let assignedDoctorName: string | undefined;

			if (doctorId) {
				const doctorConflict = dayAppts.some(
					(a) => a.doctorUserId === doctorId && startMin < a.endMin && endMin > a.startMin,
				);
				if (doctorConflict) {
					continue;
				}
				const doc = activeDoctors.find((d) => d.id === doctorId);
				if (doc) assignedDoctorName = doc.fullName;
			} else if (activeDoctors.length > 0) {
				const freeDoctor = activeDoctors.find((doc) => {
					const conflict = dayAppts.some(
						(a) => a.doctorUserId === doc.id && startMin < a.endMin && endMin > a.startMin,
					);
					return !conflict;
				});
				if (!freeDoctor) {
					continue;
				}
				assignedDoctorId = freeDoctor.id;
				assignedDoctorName = freeDoctor.fullName;
			}

			let assignedChairId = chairId || undefined;
			let assignedChairName: string | undefined;

			if (chairId) {
				const chairConflict = dayAppts.some(
					(a) => a.chairId === chairId && startMin < a.endMin && endMin > a.startMin,
				);
				if (chairConflict) {
					continue;
				}
				const ch = activeChairs.find((c) => c.id === chairId);
				assignedChairName = ch?.name ?? defaultChair.name;
			} else {
				const freeChair = (activeChairs.length > 0 ? activeChairs : [defaultChair]).find((chair) => {
					const conflict = dayAppts.some(
						(a) => a.chairId === chair.id && startMin < a.endMin && endMin > a.startMin,
					);
					return !conflict;
				});
				if (!freeChair) {
					continue;
				}
				assignedChairId = freeChair.id;
				assignedChairName = freeChair.name;
			}

			const startTimeStr = formatMinutesToTime(startMin);
			const endTimeStr = formatMinutesToTime(endMin);
			const startsAtIso = buildZonedIsoString(dateKey, startTimeStr, timezone);
			const endsAtIso = buildZonedIsoString(dateKey, endTimeStr, timezone);

			results.push({
				date: dateKey,
				startTime: startTimeStr,
				endTime: endTimeStr,
				startsAtIso,
				endsAtIso,
				timeDisplay: `${startTimeStr} – ${endTimeStr}`,
				durationMinutes,
				doctorId: assignedDoctorId,
				doctorName: assignedDoctorName,
				chairId: assignedChairId,
				chairName: assignedChairName,
				timeOfDay: tod,
			});
		}
	}

	return results;
}

export interface DoctorBreakInterval {
	startTime: string;
	endTime: string;
}

export interface DoctorFreeSlot {
	date: string;
	startsAtIso: string;
	endsAtIso: string;
	timeDisplay: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
	doctorId: string;
	chairId: string;
	chairName: string;
	timeOfDay: "morning" | "day" | "evening";
}

export interface DayFreeSlots {
	date: string;
	dateFormatted: string;
	dayOfWeek: string;
	isDayOff?: boolean | undefined;
	dayOffReason?: string | undefined;
	slots: DoctorFreeSlot[];
}

export interface FindDoctorFreeSlotsParams {
	doctorId?: string | null | undefined;
	chairId?: string | null | undefined;
	startDate: string;
	horizonDays?: number | undefined;
	durationMinutes?: number | undefined;
	timeOfDayFilter?: TimeOfDayFilter | undefined;
	appointments: readonly ScheduleOverlapItem[];
	chairs: readonly { id: string; name: string; active?: boolean | undefined }[];
	clinicStartHour?: number | undefined;
	clinicEndHour?: number | undefined;
	stepMinutes?: number | undefined;
	workingDays?: readonly number[] | undefined;
	perDayWorkingHours?: Readonly<
		Record<number, { startHour: number; endHour: number }>
	> | undefined;
	breakIntervals?: readonly DoctorBreakInterval[] | undefined;
	timezone?: string | null | undefined;
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

export function findDoctorFreeSlots(params: FindDoctorFreeSlotsParams): DayFreeSlots[] {
	const {
		doctorId,
		chairId,
		startDate,
		horizonDays = 7,
		durationMinutes = 60,
		timeOfDayFilter = "all",
		appointments,
		chairs,
		clinicStartHour = 9,
		clinicEndHour = 20,
		stepMinutes = 30,
		workingDays,
		perDayWorkingHours,
		breakIntervals = [],
		timezone = "UTC",
	} = params;

	const activeChairs = chairs.filter((c) => c.active !== false);
	const targetChairs = chairId ? activeChairs.filter((c) => c.id === chairId) : activeChairs;
	const hasRealChairs = (targetChairs[0] || activeChairs[0]) !== undefined;

	const activeAppointments = appointments.filter((a) => a.status !== "cancelled" && a.status !== "no_show");
	const result: DayFreeSlots[] = [];
	const startObj = new Date(`${startDate}T00:00:00`);

	for (let d = 0; d < horizonDays; d++) {
		const currentDay = new Date(startObj);
		currentDay.setDate(startObj.getDate() + d);
		const dayOfWeekNum = currentDay.getDay();
		const dateKey = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, "0")}-${String(currentDay.getDate()).padStart(2, "0")}`;
		const { dateFormatted, dayOfWeek } = formatRussianDayHeader(dateKey);

		if (!hasRealChairs) {
			result.push({ date: dateKey, dateFormatted, dayOfWeek, isDayOff: true, dayOffReason: "В клинике нет активных кресел", slots: [] });
			continue;
		}

		if (workingDays && !workingDays.includes(dayOfWeekNum)) {
			result.push({ date: dateKey, dateFormatted, dayOfWeek, isDayOff: true, dayOffReason: "Выходной день врача", slots: [] });
			continue;
		}

		const perDayWindow = perDayWorkingHours ? perDayWorkingHours[dayOfWeekNum] : undefined;
		if (perDayWorkingHours && (!perDayWindow || perDayWindow.endHour <= perDayWindow.startHour)) {
			result.push({ date: dateKey, dateFormatted, dayOfWeek, isDayOff: true, dayOffReason: "Врач не работает в этот день недели", slots: [] });
			continue;
		}

		const dayStartHour = perDayWindow ? Math.max(perDayWindow.startHour, clinicStartHour) : clinicStartHour;
		const dayEndHour = perDayWindow ? Math.min(perDayWindow.endHour, clinicEndHour) : clinicEndHour;

		const daySlots: DoctorFreeSlot[] = [];
		const dayAppts = activeAppointments.filter((a) => (typeof a.startsAt === "string" ? a.startsAt.slice(0, 10) : "") === dateKey);
		const parsedBreaks = breakIntervals.map((b) => {
			const [bStartH, bStartM] = b.startTime.split(":").map(Number);
			const [bEndH, bEndM] = b.endTime.split(":").map(Number);
			return { startMin: (bStartH ?? 0) * 60 + (bStartM ?? 0), endMin: (bEndH ?? 0) * 60 + (bEndM ?? 0) };
		});

		const parsedDayAppts = dayAppts.map((a) => {
			const aStart = new Date(a.startsAt || 0).getTime();
			const fallbackMin = a.durationMinutes ? Number(a.durationMinutes) : 30;
			const aEnd = a.endsAt && !Number.isNaN(new Date(a.endsAt).getTime()) ? new Date(a.endsAt).getTime() : aStart + (fallbackMin > 0 ? fallbackMin : 30) * 60000;
			return { doctorUserId: a.doctorUserId, chairId: a.chairId, startMs: aStart, endMs: aEnd };
		});

		const totalDayMinutes = (dayEndHour - dayStartHour) * 60;
		for (let offset = 0; offset + durationMinutes <= totalDayMinutes; offset += stepMinutes) {
			const startMin = dayStartHour * 60 + offset;
			const endMin = startMin + durationMinutes;
			const startH = Math.floor(startMin / 60);
			const startM = startMin % 60;
			const endH = Math.floor(endMin / 60);
			const endM = endMin % 60;

			const timeCategory = getTimeOfDayCategory(startH);
			if (timeOfDayFilter !== "all" && timeCategory !== timeOfDayFilter) continue;

			const hasBreak = parsedBreaks.some((b) => startMin < b.endMin && endMin > b.startMin);
			if (hasBreak) continue;

			const timeStartStr = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
			const timeEndStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

			const startIso = buildZonedIsoString(dateKey, timeStartStr, timezone);
			const endIso = buildZonedIsoString(dateKey, timeEndStr, timezone);
			const startMs = new Date(startIso).getTime();
			const endMs = new Date(endIso).getTime();

			const hasDoctorConflict = doctorId ? parsedDayAppts.some((a) => a.doctorUserId === doctorId && areIntervalsOverlapping(startMs, endMs, a.startMs, a.endMs)) : false;
			if (hasDoctorConflict) continue;

			const availableChair = targetChairs.find((chair) => !parsedDayAppts.some((a) => a.chairId === chair.id && areIntervalsOverlapping(startMs, endMs, a.startMs, a.endMs)));
			if (!availableChair) continue;

			daySlots.push({
				date: dateKey,
				startsAtIso: startIso,
				endsAtIso: endIso,
				startTime: timeStartStr,
				endTime: timeEndStr,
				timeDisplay: `${timeStartStr} – ${timeEndStr}`,
				durationMinutes,
				doctorId: doctorId || "",
				chairId: availableChair.id,
				chairName: availableChair.name,
				timeOfDay: timeCategory,
			});
		}

		result.push({ date: dateKey, dateFormatted, dayOfWeek, isDayOff: false, slots: daySlots });
	}

	return result;
}
