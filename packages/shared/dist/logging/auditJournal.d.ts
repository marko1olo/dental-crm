/**
 * Activity Journal & Audit Trail Event Logging Engine.
 * Adapted from dentalpin activity_journal module for DENTE Dental CRM.
 *
 * Implements immutable event schema definitions, actor and patient attribution,
 * event taxonomy classifications, and sensitive payload sanitization.
 */
import { z } from "zod";
export declare const journalEventActionSchema: z.ZodEnum<["create", "update", "delete", "view", "export", "auth", "sign", "state_change"]>;
export type JournalEventAction = z.infer<typeof journalEventActionSchema>;
export declare const journalEventScopeSchema: z.ZodEnum<["clinical", "financial", "schedule", "radiology_3d", "security", "system", "inventory"]>;
export type JournalEventScope = z.infer<typeof journalEventScopeSchema>;
export declare const activityJournalEntrySchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodString;
    clinicId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    eventType: z.ZodString;
    scope: z.ZodEnum<["clinical", "financial", "schedule", "radiology_3d", "security", "system", "inventory"]>;
    action: z.ZodEnum<["create", "update", "delete", "view", "export", "auth", "sign", "state_change"]>;
    actorId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    actorName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    actorRole: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    patientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sourceTable: z.ZodString;
    sourceEntityId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    payload: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    occurredAt: z.ZodOptional<z.ZodString>;
    ipAddress: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    userAgent: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    organizationId: string;
    eventType: string;
    sourceTable: string;
    action: "sign" | "create" | "update" | "delete" | "view" | "export" | "auth" | "state_change";
    payload: Record<string, unknown>;
    scope: "financial" | "clinical" | "schedule" | "radiology_3d" | "security" | "system" | "inventory";
    id?: string | undefined;
    patientId?: string | null | undefined;
    clinicId?: string | null | undefined;
    occurredAt?: string | undefined;
    actorId?: string | null | undefined;
    actorName?: string | null | undefined;
    actorRole?: string | null | undefined;
    sourceEntityId?: string | null | undefined;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
}, {
    organizationId: string;
    eventType: string;
    sourceTable: string;
    action: "sign" | "create" | "update" | "delete" | "view" | "export" | "auth" | "state_change";
    scope: "financial" | "clinical" | "schedule" | "radiology_3d" | "security" | "system" | "inventory";
    id?: string | undefined;
    patientId?: string | null | undefined;
    clinicId?: string | null | undefined;
    occurredAt?: string | undefined;
    payload?: Record<string, unknown> | undefined;
    actorId?: string | null | undefined;
    actorName?: string | null | undefined;
    actorRole?: string | null | undefined;
    sourceEntityId?: string | null | undefined;
    ipAddress?: string | null | undefined;
    userAgent?: string | null | undefined;
}>;
export type ActivityJournalEntry = z.infer<typeof activityJournalEntrySchema>;
/**
 * Strips sensitive keys from audit payload before logging.
 */
export declare function sanitizeAuditPayload(payload: Record<string, unknown>, redactedKeys?: readonly string[]): Record<string, unknown>;
