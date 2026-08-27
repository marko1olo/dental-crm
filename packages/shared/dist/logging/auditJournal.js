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
export const journalEventScopeSchema = z.enum([
    "clinical",
    "financial",
    "schedule",
    "radiology_3d",
    "security",
    "system",
    "inventory",
]);
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
/**
 * Strips sensitive keys from audit payload before logging.
 */
export function sanitizeAuditPayload(payload, redactedKeys = ["password", "token", "secret", "cvv", "pin", "apiKey", "refreshToken"]) {
    const sanitized = {};
    const keySet = new Set(redactedKeys.map((k) => k.toLowerCase()));
    for (const [key, value] of Object.entries(payload)) {
        if (keySet.has(key.toLowerCase())) {
            sanitized[key] = "[REDACTED]";
        }
        else if (value && typeof value === "object" && !Array.isArray(value)) {
            sanitized[key] = sanitizeAuditPayload(value, redactedKeys);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
