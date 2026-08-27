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
// ─── 1. SCHEMAS & TYPES ──────────────────────────────────────────────────────
export const appointmentScheduleStatusSchema = z.enum([
    "planned",
    "scheduled",
    "confirmed",
    "checked_in",
    "in_treatment",
    "completed",
    "cancelled",
    "no_show",
]);
export const scheduleCollisionTypeSchema = z.enum([
    "doctor_overlap",
    "cabinet_overlap",
    "patient_double_booking",
    "outside_shift_bounds",
    "emergency_reserve_blocked",
]);
export const timeIntervalSchema = z.object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
});
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
export const scheduleCollisionDetailSchema = z.object({
    type: scheduleCollisionTypeSchema,
    conflictingAppointmentId: z.string().uuid().optional(),
    conflictingShiftId: z.string().uuid().optional(),
    descriptionRu: stringOrEmpty(),
    overlapDurationMinutes: z.number().int().min(0),
});
function stringOrEmpty() {
    return z.string();
}
export const scheduleCollisionResultSchema = z.object({
    hasConflict: z.boolean(),
    conflicts: z.array(scheduleCollisionDetailSchema),
    canForceSchedule: z.boolean(),
});
export const freeSlotIntervalSchema = z.object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    durationMinutes: z.number().int().positive(),
    doctorId: z.string().uuid(),
    cabinetId: z.string().uuid().nullable().optional(),
    qualifiesForTargetDuration: z.boolean(),
});
export const overlapLayoutPositionSchema = z.object({
    columnIndex: z.number().int().min(0),
    totalColumns: z.number().int().min(1),
    groupRootId: z.string(),
});
/**
 * Validates whether two time intervals overlap.
 * Overlap exists if max(start1, start2) < min(end1, end2).
 */
export function areIntervalsOverlapping(start1, end1, start2, end2) {
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
export function calculateOverlapDurationMinutes(start1, end1, start2, end2) {
    const s1 = new Date(start1).getTime();
    const e1 = new Date(end1).getTime();
    const s2 = new Date(start2).getTime();
    const e2 = new Date(end2).getTime();
    const overlapStart = Math.max(s1, s2);
    const overlapEnd = Math.min(e1, e2);
    if (overlapStart >= overlapEnd)
        return 0;
    return Math.round((overlapEnd - overlapStart) / 60000);
}
/**
 * Checks for scheduling collisions across Doctor, Cabinet, and Patient.
 */
export function checkScheduleOverlap(target, existingAppointments, options = {}) {
    const { ignoreCancelled = true, ignoreSelfId = target.id, allowCabinetDoubleBooking = false } = options;
    const conflicts = [];
    const targetStart = new Date(target.startTime).getTime();
    const targetEnd = new Date(target.endTime).getTime();
    if (targetEnd <= targetStart) {
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
        if (ignoreSelfId && apt.id === ignoreSelfId)
            continue;
        if (ignoreCancelled && (apt.status === "cancelled" || apt.status === "no_show"))
            continue;
        const aptStart = new Date(apt.startTime).getTime();
        const aptEnd = new Date(apt.endTime).getTime();
        if (Math.max(targetStart, aptStart) < Math.min(targetEnd, aptEnd)) {
            const overlapMin = calculateOverlapDurationMinutes(new Date(targetStart), new Date(targetEnd), new Date(aptStart), new Date(aptEnd));
            // 1. Doctor collision
            if (apt.doctorId === target.doctorId) {
                conflicts.push({
                    type: "doctor_overlap",
                    conflictingAppointmentId: apt.id,
                    descriptionRu: `Врач уже занят на приеме (с ${new Date(apt.startTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} до ${new Date(apt.endTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}). Наложение: ${overlapMin} мин.`,
                    overlapDurationMinutes: overlapMin,
                });
            }
            // 2. Cabinet collision
            if (!allowCabinetDoubleBooking && target.cabinetId && apt.cabinetId && target.cabinetId === apt.cabinetId) {
                conflicts.push({
                    type: "cabinet_overlap",
                    conflictingAppointmentId: apt.id,
                    descriptionRu: `Кабинет/кресло уже занято другим приемом (с ${new Date(apt.startTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} до ${new Date(apt.endTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}). Наложение: ${overlapMin} мин.`,
                    overlapDurationMinutes: overlapMin,
                });
            }
            // 3. Patient double booking
            if (target.patientId && apt.patientId === target.patientId) {
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
export function calculateEmergencyReserveSlots(shift, existingAppointments = []) {
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
    let bookedAppointmentId = null;
    for (const apt of existingAppointments) {
        if (apt.status === "cancelled" || apt.status === "no_show")
            continue;
        if (apt.doctorId !== shift.doctorId)
            continue;
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
export function calculateScheduleOverlapGroups(appointments) {
    const result = new Map();
    if (appointments.length === 0)
        return result;
    const activeAppointments = appointments.filter((a) => a.status !== "cancelled" && a.status !== "no_show");
    if (activeAppointments.length === 0)
        return result;
    const items = activeAppointments.map((apt) => ({
        apt,
        start: new Date(apt.startTime).getTime(),
        end: new Date(apt.endTime).getTime(),
    }));
    items.sort((a, b) => a.start - b.start || a.end - b.end);
    // DSU initialization
    const parent = new Array(items.length).fill(0).map((_, i) => i);
    const rank = new Array(items.length).fill(0);
    function find(i) {
        let curr = i;
        while (parent[curr] !== curr) {
            parent[curr] = parent[parent[curr]];
            curr = parent[curr];
        }
        return curr;
    }
    function union(a, b) {
        const ra = find(a);
        const rb = find(b);
        if (ra === rb)
            return;
        if (rank[ra] < rank[rb]) {
            parent[ra] = rb;
        }
        else if (rank[ra] > rank[rb]) {
            parent[rb] = ra;
        }
        else {
            parent[rb] = ra;
            rank[ra]++;
        }
    }
    // Active intervals sweep-line
    const active = [];
    for (let i = 0; i < items.length; i++) {
        const cur = items[i];
        while (active.length && items[active[0]].end <= cur.start) {
            active.shift();
        }
        for (const j of active) {
            union(i, j);
        }
        active.push(i);
        active.sort((x, y) => items[x].end - items[y].end);
    }
    // Materialize groups
    const groups = new Map();
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
        g.sort((a, b) => items[a].start - items[b].start);
        const total = g.length;
        const rootId = items[rootIdx]?.apt.id || `group-${rootIdx}`;
        g.forEach((idx, columnIndex) => {
            result.set(items[idx].apt.id, {
                columnIndex,
                totalColumns: total,
                groupRootId: rootId,
            });
        });
    }
    return result;
}
/**
 * Finds available free slot intervals within a doctor's shift by subtracting
 * booked appointments, breaks, and emergency reserves.
 */
export function findAvailableSlots(shift, appointments, options = {}) {
    const { minDurationMinutes = 30, excludeEmergencyReserves = true } = options;
    const shiftStart = new Date(shift.startTime).getTime();
    const shiftEnd = new Date(shift.endTime).getTime();
    if (shiftEnd <= shiftStart)
        return [];
    const busySpans = [];
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
        if (apt.doctorId !== shift.doctorId)
            continue;
        if (apt.status === "cancelled" || apt.status === "no_show")
            continue;
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
    const mergedBusy = [];
    let current = { ...busySpans[0] };
    for (let i = 1; i < busySpans.length; i++) {
        const next = busySpans[i];
        if (next.start <= current.end) {
            current.end = Math.max(current.end, next.end);
        }
        else {
            mergedBusy.push(current);
            current = { ...next };
        }
    }
    mergedBusy.push(current);
    // Compute complement (free spans)
    const freeIntervals = [];
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
