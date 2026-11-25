import { z } from "zod";
import {
	appointmentStatusSchema,
	type AppointmentStatus,
} from "../appointmentSchemas.js";


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
