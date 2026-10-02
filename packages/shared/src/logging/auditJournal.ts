/**
 * Activity Journal & Audit Trail Event Logging Engine.
 * Adapted from dentalpin activity_journal module for DENTE Dental CRM.
 *
 * Implements immutable event schema definitions, actor and patient attribution,
 * event taxonomy classifications, and sensitive payload sanitization.
 */

import { z } from "zod";

export const journalEventActionSchema = z.enum([
	"create",
	"update",
	"delete",
	"view",
	"export",
	"auth",
	"sign",
	"state_change",
]);
export type JournalEventAction = z.infer<typeof journalEventActionSchema>;

export const journalEventScopeSchema = z.enum([
	"clinical",
	"financial",
	"schedule",
	"radiology_3d",
	"security",
	"system",
	"inventory",
]);
export type JournalEventScope = z.infer<typeof journalEventScopeSchema>;

export const activityJournalEntrySchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	clinicId: z.string().uuid().optional().nullable(),
	eventType: z.string().min(1).max(100), // e.g. appointment.scheduled, emr.signed
	scope: journalEventScopeSchema,
	action: journalEventActionSchema,
	actorId: z.string().uuid().optional().nullable(),
	actorName: z.string().optional().nullable(),
	actorRole: z.string().optional().nullable(),
	patientId: z.string().uuid().optional().nullable(),
	sourceTable: z.string().min(1).max(50),
	sourceEntityId: z.string().uuid().optional().nullable(),
	payload: z.record(z.unknown()).default({}),
	occurredAt: z.string().datetime().optional(),
	ipAddress: z.string().optional().nullable(),
	userAgent: z.string().optional().nullable(),
});
export type ActivityJournalEntry = z.infer<typeof activityJournalEntrySchema>;

/**
 * Granular staff action types across the clinic lifecycle (Doctor, Admin, Cashier, Assistant, Director).
 */
export const staffActionTypeSchema = z.enum([
	"emr_open",
	"diagnosis_change",
	"service_add",
	"service_remove",
	"discount_apply",
	"payment_receive",
	"payment_refund",
	"shift_open",
	"shift_close",
	"appointment_cancel",
	"document_print",
	"document_export",
	"custom_action",
]);
export type StaffActionType = z.infer<typeof staffActionTypeSchema>;

/**
 * Audit entry details containing before/after diffs, exact kopecks, ICD codes, and justifications.
 */
export const staffActionDetailsSchema = z
	.object({
		oldState: z.record(z.unknown()).nullable().optional(),
		newState: z.record(z.unknown()).nullable().optional(),
		reason: z.string().nullable().optional(),
		amountKopecks: z.number().int().nullable().optional(),
		discountPercent: z.number().nullable().optional(),
		icdCode: z.string().nullable().optional(),
		serviceCode: z.string().nullable().optional(),
		serviceName: z.string().nullable().optional(),
		shiftNumber: z.string().nullable().optional(),
		documentType: z.string().nullable().optional(),
		documentId: z.string().nullable().optional(),
		recordCount: z.number().int().nullable().optional(),
		meta: z.record(z.unknown()).optional(),
	})
	.passthrough();
export type StaffActionDetails = z.infer<typeof staffActionDetailsSchema>;

/**
 * Validated schema for staff audit telemetry (offline-first syncable).
 */
export const staffActionAuditEntrySchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid().optional().nullable(),
	actorRole: z.string().optional().nullable(),
	actorName: z.string().optional().nullable(),
	actionType: staffActionTypeSchema,
	entityType: z.string().min(1).max(100),
	entityId: z.string().min(1).max(255),
	patientId: z.string().uuid().optional().nullable(),
	details: z.record(z.unknown()).default({}),
	reason: z.string().max(1000).optional().nullable(),
	clientTimestamp: z.string().datetime().optional(),
	ipAddress: z.string().optional().nullable(),
	userAgent: z.string().optional().nullable(),
});
export type StaffActionAuditEntry = z.infer<typeof staffActionAuditEntrySchema>;

/**
 * Batch payload for multi-event ingestion from offline queue.
 */
export const staffActionBatchSchema = z.object({
	events: z.array(staffActionAuditEntrySchema).min(1).max(100),
});
export type StaffActionBatch = z.infer<typeof staffActionBatchSchema>;

const DEFAULT_REDACTED_KEYS: readonly string[] = [
	"password",
	"pwd",
	"passphrase",
	"token",
	"jwt",
	"bearer",
	"secret",
	"cvv",
	"cvc",
	"pin",
	"apiKey",
	"refreshToken",
	"sessionSecret",
	"session_secret",
	"cookie",
	"authHeader",
	"authorization",
	"cardNumber",
	"card_number",
	"pan",
	"bankAccount",
	"accountNumber",
];

const JWT_REGEX = /ey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{2,}/g;
const BEARER_REGEX = /Bearer\s+([A-Za-z0-9\-_.~+/]+=*)/gi;
const CARD_16_DIGITS_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;

/**
 * Strips sensitive strings (JWTs, Bearer tokens, raw PAN cards) from text without touching ICD diagnoses or amounts.
 */
function sanitizeAuditString(val: string): string {
	if (!val || typeof val !== "string") return val;
	let res = val;
	res = res.replace(BEARER_REGEX, "Bearer [REDACTED_TOKEN]");
	res = res.replace(JWT_REGEX, "[REDACTED_JWT]");
	res = res.replace(CARD_16_DIGITS_REGEX, (match) => {
		const digits = match.replace(/\D/g, "");
		if (digits.length === 16) {
			return `${digits.slice(0, 4)} **** **** ${digits.slice(12)}`;
		}
		return "[REDACTED_CARD]";
	});
	return res;
}

/**
 * Recursively strips sensitive keys and values from audit payload before logging (152-ФЗ compliant).
 * Preserves clinical data (ICD-10 codes, tooth numbers, kopeck amounts, clinical notes).
 */
export function sanitizeAuditPayload(
	payload: Record<string, unknown>,
	redactedKeys: readonly string[] = DEFAULT_REDACTED_KEYS,
): Record<string, unknown> {
	const sanitized: Record<string, unknown> = {};
	const keySet = new Set(redactedKeys.map((k) => k.toLowerCase()));

	for (const [key, value] of Object.entries(payload)) {
		if (keySet.has(key.toLowerCase())) {
			sanitized[key] = "[REDACTED]";
		} else if (value && typeof value === "object") {
			if (Array.isArray(value)) {
				sanitized[key] = value.map((item) => {
					if (item && typeof item === "object") {
						return sanitizeAuditPayload(
							item as Record<string, unknown>,
							redactedKeys,
						);
					}
					if (typeof item === "string") {
						return sanitizeAuditString(item);
					}
					return item;
				});
			} else {
				sanitized[key] = sanitizeAuditPayload(
					value as Record<string, unknown>,
					redactedKeys,
				);
			}
		} else if (typeof value === "string") {
			sanitized[key] = sanitizeAuditString(value);
		} else {
			sanitized[key] = value;
		}
	}
	return sanitized;
}
