/**
 * CALDAV / iCALENDAR RFC 5545 SYNCHRONIZATION DATA TYPES & CONTRACTS
 * Feature #42: Schedule sync with Yandex Calendar, Google Calendar, Apple Calendar
 * Compliant with 152-FZ PII masking & RFC 5545 specifications.
 */

import { z } from "zod";

// ─── 1. APPOINTMENT ITEM FOR iCAL FEED ──────────────────────────────────────

export const icalAppointmentStatusSchema = z.enum([
	"planned",
	"scheduled",
	"confirmed",
	"in_treatment",
	"completed",
	"cancelled",
	"no_show",
]);
export type IcalAppointmentStatus = z.infer<typeof icalAppointmentStatusSchema>;

export const icalAppointmentItemSchema = z.object({
	id: z.string().uuid(),
	startsAt: z.union([z.date(), z.string()]),
	endsAt: z.union([z.date(), z.string()]),
	status: z.string(),
	reason: z.string().nullable().optional(),
	chairName: z.string().nullable().optional(),
	patientFullName: z.string().nullable().optional(),
	patientCardNumber: z.string().nullable().optional(),
	patientPhoneMasked: z.string().nullable().optional(),
	sequence: z.number().int().min(0).optional(),
	updatedAt: z.union([z.date(), z.string()]).nullable().optional(),
	clinicName: z.string().nullable().optional(),
	cabinetName: z.string().nullable().optional(),
	isEmergency: z.boolean().optional(),
});
export type IcalAppointmentItem = z.infer<typeof icalAppointmentItemSchema>;

// ─── 2. iCALENDAR GENERATION OPTIONS ────────────────────────────────────────

export const icalCalendarOptionsSchema = z.object({
	doctorName: z.string().min(1),
	doctorId: z.string().optional(),
	clinicName: z.string().optional().default("Стоматологическая клиника DENTE"),
	organizationName: z.string().optional().default("Dente Dental CRM"),
	appointments: z.array(icalAppointmentItemSchema),
	refreshIntervalMinutes: z.number().int().min(1).max(1440).optional().default(15),
	alarmMinutesBefore: z.number().int().min(0).max(1440).optional().default(15),
	includeAlarms: z.boolean().optional().default(true),
	calendarColorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#0ea5e9"),
	anonymizePatient: z.boolean().optional().default(true),
	includeCardNumber: z.boolean().optional().default(true),
});
export type IcalCalendarOptions = z.infer<typeof icalCalendarOptionsSchema>;
export type IcalCalendarOptionsInput = z.input<typeof icalCalendarOptionsSchema>;

// ─── 3. DOCTOR CALENDAR SYNC METADATA & STATUS ──────────────────────────────

export const doctorCalendarSyncInfoSchema = z.object({
	doctorId: z.string().uuid(),
	doctorName: z.string(),
	feedUrl: z.string(),
	webcalUrl: z.string(),
	directIcsUrl: z.string(),
	yandexCalendarUrl: z.string(),
	googleCalendarUrl: z.string(),
	tokenVersion: z.number().int().min(1).default(1),
	tokenCreatedAt: z.string().nullable().optional(),
	syncStatus: z.enum(["active", "pending", "error", "revoked", "synced"]).default("active"),
	lastSyncedAt: z.string().nullable().optional(),
	errorMessage: z.string().nullable().optional(),
});
export type DoctorCalendarSyncInfo = z.infer<typeof doctorCalendarSyncInfoSchema>;

// ─── 4. TOKEN ROTATION CONTRACTS ────────────────────────────────────────────

export const rotateCalendarTokenRequestSchema = z.object({
	doctorId: z.string().uuid().optional(),
	reason: z.string().max(300).optional().default("manual_user_rotation"),
});
export type RotateCalendarTokenRequest = z.infer<typeof rotateCalendarTokenRequestSchema>;

export const rotateCalendarTokenResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	doctorId: z.string().uuid(),
	feedUrl: z.string(),
	webcalUrl: z.string(),
	tokenVersion: z.number().int().min(1),
	rotatedAt: z.string(),
});
export type RotateCalendarTokenResponse = z.infer<typeof rotateCalendarTokenResponseSchema>;

// ─── 5. RFC 5545 VALIDATION RESULT ──────────────────────────────────────────

export interface RFC5545ValidationResult {
	isValid: boolean;
	eventCount: number;
	errors: string[];
	warnings: string[];
	prodId?: string;
	calName?: string;
	hasValidLineEndings: boolean;
	hasProperLineFolding: boolean;
}
