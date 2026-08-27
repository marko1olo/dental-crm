/**
 * Preventive Dental Checkup & Patient Recall Engine.
 * Adapted from dentalpin recalls & recall_reminders modules for DENTE Dental CRM.
 *
 * Implements clinical recall cadences, automated due date calculations,
 * status state machine, and multi-channel message templating.
 */
import { z } from "zod";
import { type RecallStatus } from "../communications/recallCascade.js";
export declare const recallTypeSchema: z.ZodEnum<["hygiene_recall", "implant_check", "ortho_adjustment", "caries_control", "perio_maintenance", "prosthetic_check", "other"]>;
export type RecallType = z.infer<typeof recallTypeSchema>;
export declare const recallItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodString;
    clinicId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    patientId: z.ZodString;
    patientFullName: z.ZodString;
    patientPhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    recallType: z.ZodEnum<["hygiene_recall", "implant_check", "ortho_adjustment", "caries_control", "perio_maintenance", "prosthetic_check", "other"]>;
    reasonNote: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    dueDate: z.ZodString;
    priority: z.ZodDefault<z.ZodEnum<["low", "normal", "high"]>>;
    status: z.ZodDefault<z.ZodEnum<["pending", "contacted_no_answer", "contacted_scheduled", "contacted_declined", "done", "cancelled", "needs_review", "snoozed"]>>;
    assignedDoctorId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    assignedDoctorName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    linkedAppointmentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    contactAttemptCount: z.ZodDefault<z.ZodNumber>;
    lastContactAttemptAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    completedAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "done" | "pending" | "cancelled" | "contacted_no_answer" | "contacted_scheduled" | "contacted_declined" | "needs_review" | "snoozed";
    patientId: string;
    organizationId: string;
    patientFullName: string;
    dueDate: string;
    priority: "normal" | "low" | "high";
    recallType: "other" | "hygiene_recall" | "implant_check" | "ortho_adjustment" | "caries_control" | "perio_maintenance" | "prosthetic_check";
    contactAttemptCount: number;
    id?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    patientPhone?: string | null | undefined;
    clinicId?: string | null | undefined;
    assignedDoctorId?: string | null | undefined;
    completedAt?: string | null | undefined;
    reasonNote?: string | null | undefined;
    linkedAppointmentId?: string | null | undefined;
    assignedDoctorName?: string | null | undefined;
    lastContactAttemptAt?: string | null | undefined;
}, {
    patientId: string;
    organizationId: string;
    patientFullName: string;
    dueDate: string;
    recallType: "other" | "hygiene_recall" | "implant_check" | "ortho_adjustment" | "caries_control" | "perio_maintenance" | "prosthetic_check";
    status?: "done" | "pending" | "cancelled" | "contacted_no_answer" | "contacted_scheduled" | "contacted_declined" | "needs_review" | "snoozed" | undefined;
    id?: string | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    patientPhone?: string | null | undefined;
    clinicId?: string | null | undefined;
    assignedDoctorId?: string | null | undefined;
    completedAt?: string | null | undefined;
    reasonNote?: string | null | undefined;
    priority?: "normal" | "low" | "high" | undefined;
    linkedAppointmentId?: string | null | undefined;
    assignedDoctorName?: string | null | undefined;
    contactAttemptCount?: number | undefined;
    lastContactAttemptAt?: string | null | undefined;
}>;
export type RecallItem = z.infer<typeof recallItemSchema>;
/**
 * Standard clinical intervals (in days) for routine dental recalls.
 */
export declare const DEFAULT_RECALL_INTERVALS_DAYS: Record<RecallType, number>;
/**
 * Clinical descriptions in Russian for recall types.
 */
export declare const RECALL_TYPE_LABELS_RU: Record<RecallType, string>;
/**
 * Calculates the next due date for a given recall type.
 */
export declare function calculateNextRecallDate(baseDate: Date | string, recallType: RecallType, customDays?: number): Date;
/**
 * Filters recalls that are due or overdue up to target date.
 */
export declare function filterDueRecalls(recalls: readonly RecallItem[], targetDate?: Date, overdueOnly?: boolean): RecallItem[];
/**
 * Formats a patient-facing notification message for a recall.
 */
export declare function formatRecallMessage(recall: RecallItem, clinicName?: string): {
    title: string;
    bodyRu: string;
};
/**
 * Validates allowed state transitions for patient recalls.
 */
export declare function canTransitionRecallStatus(current: RecallStatus, target: RecallStatus): boolean;
