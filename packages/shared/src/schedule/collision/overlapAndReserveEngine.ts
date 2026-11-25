import type { AppointmentStatus } from "../appointmentSchemas.js";
import type {
	DoctorShiftSchedule,
	EmergencyReserveSlot,
	OverlapLayoutPosition,
	ScheduleCollisionDetail,
	ScheduleCollisionResult,
	ScheduleOverlapOptions,
	ScheduledAppointment,
} from "./collisionSchemas.js";

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
