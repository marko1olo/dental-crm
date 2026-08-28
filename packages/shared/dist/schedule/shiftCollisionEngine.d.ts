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
export declare const appointmentScheduleStatusSchema: z.ZodEnum<["planned", "scheduled", "confirmed", "checked_in", "in_treatment", "completed", "cancelled", "no_show"]>;
export type AppointmentScheduleStatus = z.infer<typeof appointmentScheduleStatusSchema>;
export declare const scheduleCollisionTypeSchema: z.ZodEnum<["doctor_overlap", "cabinet_overlap", "patient_double_booking", "outside_shift_bounds", "emergency_reserve_blocked"]>;
export type ScheduleCollisionType = z.infer<typeof scheduleCollisionTypeSchema>;
export declare const timeIntervalSchema: z.ZodObject<{
    startTime: z.ZodString;
    endTime: z.ZodString;
}, "strip", z.ZodTypeAny, {
    startTime: string;
    endTime: string;
}, {
    startTime: string;
    endTime: string;
}>;
export type TimeInterval = z.infer<typeof timeIntervalSchema>;
export declare const scheduledAppointmentSchema: z.ZodObject<{
    id: z.ZodString;
    clinicId: z.ZodString;
    doctorId: z.ZodString;
    cabinetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cabinetName: z.ZodOptional<z.ZodString>;
    patientId: z.ZodString;
    patientFullName: z.ZodOptional<z.ZodString>;
    startTime: z.ZodString;
    endTime: z.ZodString;
    status: z.ZodEnum<["planned", "scheduled", "confirmed", "checked_in", "in_treatment", "completed", "cancelled", "no_show"]>;
    isEmergency: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "scheduled" | "confirmed" | "cancelled" | "planned" | "in_treatment" | "no_show" | "checked_in";
    id: string;
    patientId: string;
    doctorId: string;
    clinicId: string;
    startTime: string;
    endTime: string;
    isEmergency: boolean;
    notes?: string | null | undefined;
    patientFullName?: string | undefined;
    cabinetName?: string | undefined;
    cabinetId?: string | null | undefined;
}, {
    status: "completed" | "scheduled" | "confirmed" | "cancelled" | "planned" | "in_treatment" | "no_show" | "checked_in";
    id: string;
    patientId: string;
    doctorId: string;
    clinicId: string;
    startTime: string;
    endTime: string;
    notes?: string | null | undefined;
    patientFullName?: string | undefined;
    cabinetName?: string | undefined;
    cabinetId?: string | null | undefined;
    isEmergency?: boolean | undefined;
}>;
export type ScheduledAppointment = z.input<typeof scheduledAppointmentSchema>;
export declare const doctorShiftScheduleSchema: z.ZodObject<{
    id: z.ZodString;
    clinicId: z.ZodString;
    doctorId: z.ZodString;
    doctorFullName: z.ZodOptional<z.ZodString>;
    cabinetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    shiftDate: z.ZodString;
    startTime: z.ZodString;
    endTime: z.ZodString;
    breakStartTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    breakEndTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isEmergencyReserveEnabled: z.ZodDefault<z.ZodBoolean>;
    emergencyReserveMinutes: z.ZodDefault<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    shiftDate: string;
    doctorId: string;
    clinicId: string;
    startTime: string;
    endTime: string;
    isEmergencyReserveEnabled: boolean;
    emergencyReserveMinutes: number;
    notes?: string | null | undefined;
    doctorFullName?: string | undefined;
    cabinetId?: string | null | undefined;
    breakStartTime?: string | null | undefined;
    breakEndTime?: string | null | undefined;
}, {
    id: string;
    shiftDate: string;
    doctorId: string;
    clinicId: string;
    startTime: string;
    endTime: string;
    notes?: string | null | undefined;
    doctorFullName?: string | undefined;
    cabinetId?: string | null | undefined;
    breakStartTime?: string | null | undefined;
    breakEndTime?: string | null | undefined;
    isEmergencyReserveEnabled?: boolean | undefined;
    emergencyReserveMinutes?: number | undefined;
}>;
export type DoctorShiftSchedule = z.input<typeof doctorShiftScheduleSchema>;
export declare const emergencyReserveSlotSchema: z.ZodObject<{
    id: z.ZodString;
    shiftId: z.ZodString;
    clinicId: z.ZodString;
    doctorId: z.ZodString;
    cabinetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    startTime: z.ZodString;
    endTime: z.ZodString;
    durationMinutes: z.ZodNumber;
    isBooked: z.ZodDefault<z.ZodBoolean>;
    bookedAppointmentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reason: z.ZodLiteral<"acute_pain_buffer">;
}, "strip", z.ZodTypeAny, {
    id: string;
    reason: "acute_pain_buffer";
    durationMinutes: number;
    doctorId: string;
    clinicId: string;
    startTime: string;
    endTime: string;
    shiftId: string;
    isBooked: boolean;
    cabinetId?: string | null | undefined;
    bookedAppointmentId?: string | null | undefined;
}, {
    id: string;
    reason: "acute_pain_buffer";
    durationMinutes: number;
    doctorId: string;
    clinicId: string;
    startTime: string;
    endTime: string;
    shiftId: string;
    cabinetId?: string | null | undefined;
    isBooked?: boolean | undefined;
    bookedAppointmentId?: string | null | undefined;
}>;
export type EmergencyReserveSlot = z.infer<typeof emergencyReserveSlotSchema>;
export declare const scheduleCollisionDetailSchema: z.ZodObject<{
    type: z.ZodEnum<["doctor_overlap", "cabinet_overlap", "patient_double_booking", "outside_shift_bounds", "emergency_reserve_blocked"]>;
    conflictingAppointmentId: z.ZodOptional<z.ZodString>;
    conflictingShiftId: z.ZodOptional<z.ZodString>;
    descriptionRu: z.ZodString;
    overlapDurationMinutes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "doctor_overlap" | "cabinet_overlap" | "patient_double_booking" | "outside_shift_bounds" | "emergency_reserve_blocked";
    descriptionRu: string;
    overlapDurationMinutes: number;
    conflictingAppointmentId?: string | undefined;
    conflictingShiftId?: string | undefined;
}, {
    type: "doctor_overlap" | "cabinet_overlap" | "patient_double_booking" | "outside_shift_bounds" | "emergency_reserve_blocked";
    descriptionRu: string;
    overlapDurationMinutes: number;
    conflictingAppointmentId?: string | undefined;
    conflictingShiftId?: string | undefined;
}>;
export type ScheduleCollisionDetail = z.infer<typeof scheduleCollisionDetailSchema>;
export declare const scheduleCollisionResultSchema: z.ZodObject<{
    hasConflict: z.ZodBoolean;
    conflicts: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["doctor_overlap", "cabinet_overlap", "patient_double_booking", "outside_shift_bounds", "emergency_reserve_blocked"]>;
        conflictingAppointmentId: z.ZodOptional<z.ZodString>;
        conflictingShiftId: z.ZodOptional<z.ZodString>;
        descriptionRu: z.ZodString;
        overlapDurationMinutes: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "doctor_overlap" | "cabinet_overlap" | "patient_double_booking" | "outside_shift_bounds" | "emergency_reserve_blocked";
        descriptionRu: string;
        overlapDurationMinutes: number;
        conflictingAppointmentId?: string | undefined;
        conflictingShiftId?: string | undefined;
    }, {
        type: "doctor_overlap" | "cabinet_overlap" | "patient_double_booking" | "outside_shift_bounds" | "emergency_reserve_blocked";
        descriptionRu: string;
        overlapDurationMinutes: number;
        conflictingAppointmentId?: string | undefined;
        conflictingShiftId?: string | undefined;
    }>, "many">;
    canForceSchedule: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    hasConflict: boolean;
    conflicts: {
        type: "doctor_overlap" | "cabinet_overlap" | "patient_double_booking" | "outside_shift_bounds" | "emergency_reserve_blocked";
        descriptionRu: string;
        overlapDurationMinutes: number;
        conflictingAppointmentId?: string | undefined;
        conflictingShiftId?: string | undefined;
    }[];
    canForceSchedule: boolean;
}, {
    hasConflict: boolean;
    conflicts: {
        type: "doctor_overlap" | "cabinet_overlap" | "patient_double_booking" | "outside_shift_bounds" | "emergency_reserve_blocked";
        descriptionRu: string;
        overlapDurationMinutes: number;
        conflictingAppointmentId?: string | undefined;
        conflictingShiftId?: string | undefined;
    }[];
    canForceSchedule: boolean;
}>;
export type ScheduleCollisionResult = z.infer<typeof scheduleCollisionResultSchema>;
export declare const freeSlotIntervalSchema: z.ZodObject<{
    startTime: z.ZodString;
    endTime: z.ZodString;
    durationMinutes: z.ZodNumber;
    doctorId: z.ZodString;
    cabinetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    qualifiesForTargetDuration: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    durationMinutes: number;
    doctorId: string;
    startTime: string;
    endTime: string;
    qualifiesForTargetDuration: boolean;
    cabinetId?: string | null | undefined;
}, {
    durationMinutes: number;
    doctorId: string;
    startTime: string;
    endTime: string;
    qualifiesForTargetDuration: boolean;
    cabinetId?: string | null | undefined;
}>;
export type FreeSlotInterval = z.infer<typeof freeSlotIntervalSchema>;
export declare const overlapLayoutPositionSchema: z.ZodObject<{
    columnIndex: z.ZodNumber;
    totalColumns: z.ZodNumber;
    groupRootId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    columnIndex: number;
    totalColumns: number;
    groupRootId: string;
}, {
    columnIndex: number;
    totalColumns: number;
    groupRootId: string;
}>;
export type OverlapLayoutPosition = z.infer<typeof overlapLayoutPositionSchema>;
export interface ScheduleOverlapOptions {
    readonly ignoreCancelled?: boolean;
    readonly ignoreSelfId?: string | undefined;
    readonly allowCabinetDoubleBooking?: boolean;
}
/**
 * Validates whether two time intervals overlap.
 * Overlap exists if max(start1, start2) < min(end1, end2).
 */
export declare function areIntervalsOverlapping(start1: Date | string | number, end1: Date | string | number, start2: Date | string | number, end2: Date | string | number): boolean;
/**
 * Calculates overlap duration in minutes between two intervals.
 */
export declare function calculateOverlapDurationMinutes(start1: Date | string | number, end1: Date | string | number, start2: Date | string | number, end2: Date | string | number): number;
/**
 * Checks for scheduling collisions across Doctor, Cabinet, and Patient.
 */
export declare function checkScheduleOverlap(target: {
    readonly id?: string | undefined;
    readonly doctorId: string;
    readonly cabinetId?: string | null | undefined;
    readonly patientId?: string | undefined;
    readonly startTime: string;
    readonly endTime: string;
}, existingAppointments: readonly ScheduledAppointment[], options?: ScheduleOverlapOptions): ScheduleCollisionResult;
/**
 * Computes the dedicated emergency reserve slot buffer for acute toothache in a shift.
 * Default strategy places the buffer in the last 30-45 minutes of the doctor's shift.
 */
export declare function calculateEmergencyReserveSlots(shift: DoctorShiftSchedule, existingAppointments?: readonly ScheduledAppointment[]): EmergencyReserveSlot[];
/**
 * Groups overlapping appointments using Disjoint Set Union (DSU) and assigns
 * zero-indexed column positions (columnIndex) and total group columns (totalColumns).
 * Ideal for multi-chair and daily calendar side-by-side rendering.
 */
export declare function calculateScheduleOverlapGroups(appointments: readonly ScheduledAppointment[]): Map<string, OverlapLayoutPosition>;
export interface FreeSlotDiscoveryOptions {
    readonly minDurationMinutes?: number;
    readonly excludeEmergencyReserves?: boolean;
}
/**
 * Finds available free slot intervals within a doctor's shift by subtracting
 * booked appointments, breaks, and emergency reserves.
 */
export declare function findAvailableSlots(shift: DoctorShiftSchedule, appointments: readonly ScheduledAppointment[], options?: FreeSlotDiscoveryOptions): FreeSlotInterval[];
