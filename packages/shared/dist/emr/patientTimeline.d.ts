/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PATIENT TIMELINE & CLINICAL AUDIT EVENT AGGREGATOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements a denormalized chronological timeline of patient-scoped events
 * across clinical, operational, financial, and diagnostic modules.
 */
import { z } from "zod";
export declare const TIMELINE_CATEGORIES: readonly ["visit", "treatment", "financial", "clinical", "diagnostic", "legal", "communication"];
export type TimelineCategory = (typeof TIMELINE_CATEGORIES)[number];
export declare const TIMELINE_EVENT_TYPES: readonly ["appointment.scheduled", "appointment.confirmed", "appointment.checked_in", "appointment.in_treatment", "appointment.completed", "appointment.no_show", "appointment.cancelled", "treatment.performed", "treatment_plan.created", "treatment_plan.approved", "treatment_plan.item_completed", "treatment_plan.recalculated", "budget.sent", "budget.accepted", "budget.rejected", "budget.expired", "invoice.issued", "payment.received", "refund.processed", "odontogram.state_changed", "periodontogram.snapshot_closed", "anamnesis.updated", "allergy.recorded", "vital_signs.measured", "dicom.uploaded", "xray.captured", "lab_order.created", "lab_result.received", "consent.signed", "contract.executed", "legal_guardian.assigned", "message.sms_sent", "message.whatsapp_sent", "reminder.delivered"];
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];
export declare const timelineCategorySchema: z.ZodEnum<["visit", "treatment", "financial", "clinical", "diagnostic", "legal", "communication"]>;
export declare const timelineEventTypeSchema: z.ZodString;
export declare const patientTimelineEntrySchema: z.ZodObject<{
    id: z.ZodString;
    clinicId: z.ZodString;
    patientId: z.ZodString;
    eventType: z.ZodString;
    eventCategory: z.ZodEnum<["visit", "treatment", "financial", "clinical", "diagnostic", "legal", "communication"]>;
    sourceTable: z.ZodString;
    sourceId: z.ZodString;
    title: z.ZodString;
    description: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    eventData: z.ZodDefault<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    occurredAt: z.ZodString;
    createdBy: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    createdByName: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    patientId: string;
    title: string;
    clinicId: string;
    eventType: string;
    eventCategory: "visit" | "treatment" | "financial" | "clinical" | "diagnostic" | "legal" | "communication";
    sourceTable: string;
    sourceId: string;
    description: string | null;
    eventData: Record<string, unknown> | null;
    occurredAt: string;
    createdBy: string | null;
    createdByName: string | null;
    createdAt?: string | undefined;
}, {
    id: string;
    patientId: string;
    title: string;
    clinicId: string;
    eventType: string;
    eventCategory: "visit" | "treatment" | "financial" | "clinical" | "diagnostic" | "legal" | "communication";
    sourceTable: string;
    sourceId: string;
    occurredAt: string;
    createdAt?: string | undefined;
    description?: string | null | undefined;
    eventData?: Record<string, unknown> | null | undefined;
    createdBy?: string | null | undefined;
    createdByName?: string | null | undefined;
}>;
export type PatientTimelineEntry = z.infer<typeof patientTimelineEntrySchema>;
export declare const createPatientTimelineEntrySchema: z.ZodObject<{
    clinicId: z.ZodString;
    patientId: z.ZodString;
    eventType: z.ZodString;
    eventCategory: z.ZodEnum<["visit", "treatment", "financial", "clinical", "diagnostic", "legal", "communication"]>;
    sourceTable: z.ZodString;
    sourceId: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    eventData: z.ZodNullable<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    occurredAt: z.ZodOptional<z.ZodString>;
    createdBy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    title: string;
    clinicId: string;
    eventType: string;
    eventCategory: "visit" | "treatment" | "financial" | "clinical" | "diagnostic" | "legal" | "communication";
    sourceTable: string;
    sourceId: string;
    description?: string | null | undefined;
    eventData?: Record<string, unknown> | null | undefined;
    occurredAt?: string | undefined;
    createdBy?: string | null | undefined;
}, {
    patientId: string;
    title: string;
    clinicId: string;
    eventType: string;
    eventCategory: "visit" | "treatment" | "financial" | "clinical" | "diagnostic" | "legal" | "communication";
    sourceTable: string;
    sourceId: string;
    description?: string | null | undefined;
    eventData?: Record<string, unknown> | null | undefined;
    occurredAt?: string | undefined;
    createdBy?: string | null | undefined;
}>;
export type CreatePatientTimelineEntryInput = z.infer<typeof createPatientTimelineEntrySchema>;
export declare const patientTimelineFilterSchema: z.ZodObject<{
    patientId: z.ZodString;
    categories: z.ZodOptional<z.ZodArray<z.ZodEnum<["visit", "treatment", "financial", "clinical", "diagnostic", "legal", "communication"]>, "many">>;
    eventTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
    searchQuery: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    limit: number;
    offset: number;
    categories?: ("visit" | "treatment" | "financial" | "clinical" | "diagnostic" | "legal" | "communication")[] | undefined;
    eventTypes?: string[] | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
    searchQuery?: string | undefined;
}, {
    patientId: string;
    categories?: ("visit" | "treatment" | "financial" | "clinical" | "diagnostic" | "legal" | "communication")[] | undefined;
    eventTypes?: string[] | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
    searchQuery?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export type PatientTimelineFilter = z.infer<typeof patientTimelineFilterSchema>;
export interface TimelineGroupedByDate {
    readonly date: string;
    readonly dateFormattedRu: string;
    readonly totalEvents: number;
    readonly entries: readonly PatientTimelineEntry[];
}
export interface TimelineCategoryMetadata {
    readonly category: TimelineCategory;
    readonly labelRu: string;
    readonly badgeColor: string;
    readonly badgeBg: string;
    readonly iconName: string;
}
export declare const TIMELINE_CATEGORY_META: Record<TimelineCategory, TimelineCategoryMetadata>;
/**
 * Groups raw timeline entries into ascending or descending date clusters (YYYY-MM-DD).
 */
export declare function groupTimelineEntriesByDate(entries: readonly PatientTimelineEntry[], order?: "desc" | "asc"): TimelineGroupedByDate[];
/**
 * Filters timeline entries in-memory by category, date range, or text search query.
 */
export declare function filterTimelineEntries(entries: readonly PatientTimelineEntry[], filter: Partial<PatientTimelineFilter>): PatientTimelineEntry[];
