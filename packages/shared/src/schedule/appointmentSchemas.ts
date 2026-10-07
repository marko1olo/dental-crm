/**
 * packages/shared/src/schedule/appointmentSchemas.ts
 *
 * DENTE Dental CRM — Canonical Appointment Contracts & Zod Schemas.
 * Single Source of Truth (SSOT) for Appointments, Status Lifecycles,
 * Creation/Update DTOs, and Unified Booking Slots.
 *
 * Compliant with:
 * - Mandate 8e: Doctor Autonomy & Soft Overbooking
 * - Emergency Override Flag Support
 * - ISO 8601 Strict DateTime Parsing & Overlap Bounds
 */

import { z } from "zod";
import { isValidDateParts } from "../datetime/index.js";

// ─── 1. STATUS LIFECYCLE ─────────────────────────────────────────────────────

export const appointmentStatusSchema = z.enum([
	"planned",
	"confirmed",
	"arrived",
	"in_treatment",
	"completed",
	"cancelled",
	"no_show",
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

// ─── 2. TIME PARSING HELPER ──────────────────────────────────────────────────

export function parseStrictAppointmentDateTimeMs(value: string): number | null {
	const trimmed = value.trim();
	const match =
		/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(
			trimmed,
		);
	if (!match) return null;

	const [
		,
		yearPart,
		monthPart,
		dayPart,
		hourPart,
		minutePart,
		secondPart = "00",
	] = match;
	const year = Number(yearPart);
	const month = Number(monthPart);
	const day = Number(dayPart);
	const hour = Number(hourPart);
	const minute = Number(minutePart);
	const second = Number(secondPart);

	if (!isValidDateParts(year, month, day)) return null;
	if (
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59 ||
		second < 0 ||
		second > 59
	) {
		return null;
	}

	const parsed = Date.parse(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

// ─── 3. CORE APPOINTMENT SCHEMA ──────────────────────────────────────────────

export const appointmentSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid().nullable(),
	doctorUserId: z.string().uuid().nullable(),
	assistantUserId: z.string().uuid().nullable().optional(),
	chairId: z.string().uuid().nullable(),
	status: appointmentStatusSchema,
	startsAt: z.string(),
	endsAt: z.string(),
	reason: z.string().nullable(),
	comment: z.string().nullable(),
});
export type Appointment = z.infer<typeof appointmentSchema>;

// ─── 4. DTO SCHEMAS (CREATE & UPDATE) ─────────────────────────────────────────

export const createAppointmentSchema = z
	.object({
		patientId: z.string().uuid().nullable().optional(),
		doctorUserId: z.string().uuid(),
		assistantUserId: z.string().uuid().nullable().optional(),
		chairId: z.string().uuid(),
		status: appointmentStatusSchema.default("planned"),
		startsAt: z.string().trim().min(1),
		endsAt: z.string().trim().min(1),
		reason: z.string().trim().max(500).nullable().optional(),
		comment: z.string().trim().max(1000).nullable().optional(),
		allowOverbooking: z.boolean().optional(),
		allowEmergencyOverride: z.boolean().optional(),
		invoice_items: z.array(z.record(z.string(), z.any())).optional(),
		invoiceItems: z.array(z.record(z.string(), z.any())).optional(),
		completedServices: z.array(z.record(z.string(), z.any())).optional(),
	})
	.superRefine((value, context) => {
		const startsAt = parseStrictAppointmentDateTimeMs(value.startsAt);
		const endsAt = parseStrictAppointmentDateTimeMs(value.endsAt);
		if (startsAt === null) {
			context.addIssue({
				code: "custom",
				path: ["startsAt"],
				message:
					"Начало записи должно быть реальной датой и временем в ISO-формате с часовым поясом",
			});
		}
		if (endsAt === null) {
			context.addIssue({
				code: "custom",
				path: ["endsAt"],
				message:
					"Окончание записи должно быть реальной датой и временем в ISO-формате с часовым поясом",
			});
		}
		if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
			context.addIssue({
				code: "custom",
				path: ["endsAt"],
				message: "Окончание записи должно быть позже начала",
			});
		}
	});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z
	.object({
		patientId: z.string().uuid().nullable().optional(),
		doctorUserId: z.string().uuid().nullable().optional(),
		assistantUserId: z.string().uuid().nullable().optional(),
		chairId: z.string().uuid().nullable().optional(),
		status: appointmentStatusSchema.optional(),
		startsAt: z.string().trim().min(1).optional(),
		endsAt: z.string().trim().min(1).optional(),
		reason: z.string().trim().max(500).nullable().optional(),
		comment: z.string().trim().max(1000).nullable().optional(),
		allowOverbooking: z.boolean().optional(),
		allowEmergencyOverride: z.boolean().optional(),
		expectedCurrentStatus: z.array(appointmentStatusSchema).optional(),
		invoice_items: z.array(z.record(z.string(), z.any())).optional(),
		invoiceItems: z.array(z.record(z.string(), z.any())).optional(),
		completedServices: z.array(z.record(z.string(), z.any())).optional(),
	})
	.superRefine((value, context) => {
		const startsAt =
			value.startsAt !== undefined
				? parseStrictAppointmentDateTimeMs(value.startsAt)
				: null;
		const endsAt =
			value.endsAt !== undefined
				? parseStrictAppointmentDateTimeMs(value.endsAt)
				: null;

		if (value.startsAt !== undefined && startsAt === null) {
			context.addIssue({
				code: "custom",
				path: ["startsAt"],
				message:
					"Начало записи должно быть реальной датой и временем в ISO-формате с часовым поясом",
			});
		}
		if (value.endsAt !== undefined && endsAt === null) {
			context.addIssue({
				code: "custom",
				path: ["endsAt"],
				message:
					"Окончание записи должно быть реальной датой и временем в ISO-формате с часовым поясом",
			});
		}
		if (value.startsAt !== undefined && value.endsAt !== undefined) {
			if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
				context.addIssue({
					code: "custom",
					path: ["endsAt"],
					message: "Окончание записи должно быть позже начала",
				});
			}
		}
	});
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

// ─── 5. UNIFIED BOOKING SLOT CONTRACT ────────────────────────────────────────

export interface BookingSlot {
	time: string; // e.g. "10:30"
	startsAt: string; // ISO 8601
	endsAt: string; // ISO 8601
	availableDoctorIds?: string[] | undefined;
	period?: "morning" | "afternoon" | "evening" | undefined;
	slotId?: string | undefined;
	branchId?: string | undefined;
	cabinetId?: string | null | undefined;
	cabinetName?: string | null | undefined;
	isEmergencyBuffer?: boolean | undefined;
	isSoftLocked?: boolean | undefined;
}

export function toBookingSlot(raw: {
	startTime: string;
	endTime: string;
	displayTimeRu?: string;
	doctorId?: string;
	slotId?: string;
	branchId?: string;
	cabinetId?: string | null;
	cabinetName?: string | null;
	isEmergencyBuffer?: boolean;
	isSoftLocked?: boolean;
}): BookingSlot {
	const startHour = Number.parseInt(raw.startTime.slice(11, 13), 10) || 0;
	let period: "morning" | "afternoon" | "evening" = "afternoon";
	if (startHour < 12) period = "morning";
	else if (startHour >= 17) period = "evening";

	const time = raw.displayTimeRu || raw.startTime.slice(11, 16);

	return {
		time,
		startsAt: raw.startTime,
		endsAt: raw.endTime,
		availableDoctorIds: raw.doctorId ? [raw.doctorId] : [],
		period,
		slotId: raw.slotId,
		branchId: raw.branchId,
		cabinetId: raw.cabinetId,
		cabinetName: raw.cabinetName,
		isEmergencyBuffer: raw.isEmergencyBuffer,
		isSoftLocked: raw.isSoftLocked,
	};
}
