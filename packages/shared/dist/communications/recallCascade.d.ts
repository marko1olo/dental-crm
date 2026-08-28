/**
 * Recall Cascade & Multi-Channel Reminder Automation
 *
 * Implements automated preventive dental recall intervals (3, 6, 12 months),
 * multi-variable template interpolation, and multi-channel escalation cascades
 * (WhatsApp -> SMS -> Push -> Call task).
 */
import { z } from "zod";
export declare const RECALL_INTERVAL_MONTHS: Record<string, number>;
export declare const recallReasonSchema: z.ZodEnum<["hygiene", "checkup", "ortho_review", "implant_review", "post_op", "treatment_followup", "preventive", "surgery", "endodontics", "other"]>;
export type RecallReason = z.infer<typeof recallReasonSchema>;
export declare const recallPrioritySchema: z.ZodEnum<["low", "normal", "high"]>;
export type RecallPriority = z.infer<typeof recallPrioritySchema>;
export declare const recallStatusSchema: z.ZodEnum<["pending", "contacted_no_answer", "contacted_scheduled", "contacted_declined", "done", "cancelled", "needs_review", "snoozed"]>;
export type RecallStatus = z.infer<typeof recallStatusSchema>;
export declare const recallChannelSchema: z.ZodEnum<["whatsapp", "sms", "telegram", "push", "call_task", "email", "phone"]>;
export type RecallChannel = z.infer<typeof recallChannelSchema>;
export declare const recallOutcomeSchema: z.ZodEnum<["no_answer", "voicemail", "scheduled", "declined", "wrong_number", "callback_requested"]>;
export type RecallOutcome = z.infer<typeof recallOutcomeSchema>;
export declare const recallCreateSchema: z.ZodObject<{
    patientId: z.ZodString;
    dueMonth: z.ZodString;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reason: z.ZodEnum<["hygiene", "checkup", "ortho_review", "implant_review", "post_op", "treatment_followup", "preventive", "surgery", "endodontics", "other"]>;
    reasonNote: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    priority: z.ZodDefault<z.ZodEnum<["low", "normal", "high"]>>;
    assignedProfessionalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    linkedTreatmentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    linkedTreatmentCategoryKey: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    reason: "other" | "endodontics" | "surgery" | "hygiene" | "preventive" | "post_op" | "checkup" | "ortho_review" | "implant_review" | "treatment_followup";
    dueMonth: string;
    priority: "normal" | "low" | "high";
    dueDate?: string | null | undefined;
    reasonNote?: string | null | undefined;
    assignedProfessionalId?: string | null | undefined;
    linkedTreatmentId?: string | null | undefined;
    linkedTreatmentCategoryKey?: string | null | undefined;
}, {
    patientId: string;
    reason: "other" | "endodontics" | "surgery" | "hygiene" | "preventive" | "post_op" | "checkup" | "ortho_review" | "implant_review" | "treatment_followup";
    dueMonth: string;
    dueDate?: string | null | undefined;
    reasonNote?: string | null | undefined;
    priority?: "normal" | "low" | "high" | undefined;
    assignedProfessionalId?: string | null | undefined;
    linkedTreatmentId?: string | null | undefined;
    linkedTreatmentCategoryKey?: string | null | undefined;
}>;
export type RecallCreate = z.infer<typeof recallCreateSchema>;
export declare const recallUpdateSchema: z.ZodObject<{
    dueMonth: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    reason: z.ZodOptional<z.ZodEnum<["hygiene", "checkup", "ortho_review", "implant_review", "post_op", "treatment_followup", "preventive", "surgery", "endodontics", "other"]>>;
    reasonNote: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    priority: z.ZodOptional<z.ZodEnum<["low", "normal", "high"]>>;
    assignedProfessionalId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    reason?: "other" | "endodontics" | "surgery" | "hygiene" | "preventive" | "post_op" | "checkup" | "ortho_review" | "implant_review" | "treatment_followup" | undefined;
    dueMonth?: string | undefined;
    dueDate?: string | null | undefined;
    reasonNote?: string | null | undefined;
    priority?: "normal" | "low" | "high" | undefined;
    assignedProfessionalId?: string | null | undefined;
}, {
    reason?: "other" | "endodontics" | "surgery" | "hygiene" | "preventive" | "post_op" | "checkup" | "ortho_review" | "implant_review" | "treatment_followup" | undefined;
    dueMonth?: string | undefined;
    dueDate?: string | null | undefined;
    reasonNote?: string | null | undefined;
    priority?: "normal" | "low" | "high" | undefined;
    assignedProfessionalId?: string | null | undefined;
}>;
export type RecallUpdate = z.infer<typeof recallUpdateSchema>;
export declare const recallSnoozeSchema: z.ZodObject<{
    months: z.ZodNumber;
    reasonNote: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    months: number;
    reasonNote?: string | null | undefined;
}, {
    months: number;
    reasonNote?: string | null | undefined;
}>;
export type RecallSnooze = z.infer<typeof recallSnoozeSchema>;
export declare const recallAttemptSchema: z.ZodObject<{
    channel: z.ZodEnum<["whatsapp", "sms", "telegram", "push", "call_task", "email", "phone"]>;
    outcome: z.ZodEnum<["no_answer", "voicemail", "scheduled", "declined", "wrong_number", "callback_requested"]>;
    note: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    linkedAppointmentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    channel: "push" | "phone" | "email" | "whatsapp" | "sms" | "telegram" | "call_task";
    outcome: "scheduled" | "no_answer" | "voicemail" | "declined" | "wrong_number" | "callback_requested";
    note?: string | null | undefined;
    linkedAppointmentId?: string | null | undefined;
}, {
    channel: "push" | "phone" | "email" | "whatsapp" | "sms" | "telegram" | "call_task";
    outcome: "scheduled" | "no_answer" | "voicemail" | "declined" | "wrong_number" | "callback_requested";
    note?: string | null | undefined;
    linkedAppointmentId?: string | null | undefined;
}>;
export type RecallAttempt = z.infer<typeof recallAttemptSchema>;
export declare const cascadeStepSchema: z.ZodObject<{
    stepNumber: z.ZodNumber;
    channel: z.ZodEnum<["whatsapp", "sms", "telegram", "push", "call_task", "email", "phone"]>;
    delayHoursAfterPrevious: z.ZodNumber;
    templateKey: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    channel: "push" | "phone" | "email" | "whatsapp" | "sms" | "telegram" | "call_task";
    stepNumber: number;
    delayHoursAfterPrevious: number;
    templateKey: string;
    description?: string | undefined;
}, {
    channel: "push" | "phone" | "email" | "whatsapp" | "sms" | "telegram" | "call_task";
    stepNumber: number;
    delayHoursAfterPrevious: number;
    templateKey: string;
    description?: string | undefined;
}>;
export type CascadeStep = z.infer<typeof cascadeStepSchema>;
export declare const channelCascadeConfigSchema: z.ZodObject<{
    organizationId: z.ZodString;
    name: z.ZodString;
    isActive: z.ZodDefault<z.ZodBoolean>;
    steps: z.ZodArray<z.ZodObject<{
        stepNumber: z.ZodNumber;
        channel: z.ZodEnum<["whatsapp", "sms", "telegram", "push", "call_task", "email", "phone"]>;
        delayHoursAfterPrevious: z.ZodNumber;
        templateKey: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        channel: "push" | "phone" | "email" | "whatsapp" | "sms" | "telegram" | "call_task";
        stepNumber: number;
        delayHoursAfterPrevious: number;
        templateKey: string;
        description?: string | undefined;
    }, {
        channel: "push" | "phone" | "email" | "whatsapp" | "sms" | "telegram" | "call_task";
        stepNumber: number;
        delayHoursAfterPrevious: number;
        templateKey: string;
        description?: string | undefined;
    }>, "many">;
    quietHoursStartMinute: z.ZodDefault<z.ZodNumber>;
    quietHoursEndMinute: z.ZodDefault<z.ZodNumber>;
    stopOnAnyResponse: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    organizationId: string;
    isActive: boolean;
    steps: {
        channel: "push" | "phone" | "email" | "whatsapp" | "sms" | "telegram" | "call_task";
        stepNumber: number;
        delayHoursAfterPrevious: number;
        templateKey: string;
        description?: string | undefined;
    }[];
    quietHoursStartMinute: number;
    quietHoursEndMinute: number;
    stopOnAnyResponse: boolean;
}, {
    name: string;
    organizationId: string;
    steps: {
        channel: "push" | "phone" | "email" | "whatsapp" | "sms" | "telegram" | "call_task";
        stepNumber: number;
        delayHoursAfterPrevious: number;
        templateKey: string;
        description?: string | undefined;
    }[];
    isActive?: boolean | undefined;
    quietHoursStartMinute?: number | undefined;
    quietHoursEndMinute?: number | undefined;
    stopOnAnyResponse?: boolean | undefined;
}>;
export type ChannelCascadeConfig = z.infer<typeof channelCascadeConfigSchema>;
export declare const plannedDispatchStepSchema: z.ZodObject<{
    stepNumber: z.ZodNumber;
    channel: z.ZodEnum<["whatsapp", "sms", "telegram", "push", "call_task", "email", "phone"]>;
    scheduledAt: z.ZodString;
    templateKey: z.ZodString;
    status: z.ZodEnum<["pending", "dispatched", "skipped", "failed"]>;
}, "strip", z.ZodTypeAny, {
    status: "failed" | "pending" | "dispatched" | "skipped";
    channel: "push" | "phone" | "email" | "whatsapp" | "sms" | "telegram" | "call_task";
    stepNumber: number;
    templateKey: string;
    scheduledAt: string;
}, {
    status: "failed" | "pending" | "dispatched" | "skipped";
    channel: "push" | "phone" | "email" | "whatsapp" | "sms" | "telegram" | "call_task";
    stepNumber: number;
    templateKey: string;
    scheduledAt: string;
}>;
export type PlannedDispatchStep = z.infer<typeof plannedDispatchStepSchema>;
/**
 * Normalizes any Date to standard YYYY-MM-01 string.
 */
export declare function normalizeDueMonthString(d?: Date): string;
/**
 * Calculates next recall due month string (YYYY-MM-01) by treatment category interval.
 */
export declare function calculateNextRecallDueMonth(fromDate?: Date, categoryKey?: string): string;
/**
 * Interpolates variables in format `{patient_name}` or `{{patient_name}}`.
 */
export declare function renderRecallReminderTemplate(templateText: string, context?: Record<string, unknown>): string;
/**
 * Plans a timeline schedule for multi-channel cascade dispatch, taking delays into account.
 */
export declare function planCascadeDispatchSchedule(config: ChannelCascadeConfig, baseDate?: Date): PlannedDispatchStep[];
/**
 * Evaluates whether cascade should proceed to next step or terminate based on outcome.
 */
export declare function evaluateCascadeStepAdvance(outcome: RecallOutcome, stopOnAnyResponse?: boolean): {
    shouldContinue: boolean;
    finalStatus: RecallStatus;
};
