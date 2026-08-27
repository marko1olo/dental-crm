/**
 * Recall Cascade & Multi-Channel Reminder Automation
 *
 * Implements automated preventive dental recall intervals (3, 6, 12 months),
 * multi-variable template interpolation, and multi-channel escalation cascades
 * (WhatsApp -> SMS -> Push -> Call task).
 */

import { z } from "zod";

// --- Recall Reasons & Standard Medical Intervals (Months) ---

export const RECALL_INTERVAL_MONTHS: Record<string, number> = {
	hygiene: 6,
	checkup: 12,
	ortho_review: 1,
	implant_review: 6,
	post_op: 1,
	treatment_followup: 3,
	preventive: 6,
	surgery: 1,
	endodontics: 3,
	other: 6,
};

export const recallReasonSchema = z.enum([
	"hygiene",
	"checkup",
	"ortho_review",
	"implant_review",
	"post_op",
	"treatment_followup",
	"preventive",
	"surgery",
	"endodontics",
	"other",
]);
export type RecallReason = z.infer<typeof recallReasonSchema>;

export const recallPrioritySchema = z.enum(["low", "normal", "high"]);
export type RecallPriority = z.infer<typeof recallPrioritySchema>;

export const recallStatusSchema = z.enum([
	"pending",
	"contacted_no_answer",
	"contacted_scheduled",
	"contacted_declined",
	"done",
	"cancelled",
	"needs_review",
	"snoozed",
]);
export type RecallStatus = z.infer<typeof recallStatusSchema>;

export const recallChannelSchema = z.enum([
	"whatsapp",
	"sms",
	"telegram",
	"push",
	"call_task",
	"email",
	"phone",
]);
export type RecallChannel = z.infer<typeof recallChannelSchema>;

export const recallOutcomeSchema = z.enum([
	"no_answer",
	"voicemail",
	"scheduled",
	"declined",
	"wrong_number",
	"callback_requested",
]);
export type RecallOutcome = z.infer<typeof recallOutcomeSchema>;

// --- Schemas for CRUD & Actions ---

export const recallCreateSchema = z.object({
	patientId: z.string().uuid(),
	dueMonth: z.string().regex(/^\d{4}-\d{2}-01$/, "dueMonth must be formatted as YYYY-MM-01"),
	dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
	reason: recallReasonSchema,
	reasonNote: z.string().max(500).optional().nullable(),
	priority: recallPrioritySchema.default("normal"),
	assignedProfessionalId: z.string().uuid().optional().nullable(),
	linkedTreatmentId: z.string().uuid().optional().nullable(),
	linkedTreatmentCategoryKey: z.string().max(80).optional().nullable(),
});
export type RecallCreate = z.infer<typeof recallCreateSchema>;

export const recallUpdateSchema = z.object({
	dueMonth: z.string().regex(/^\d{4}-\d{2}-01$/).optional(),
	dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
	reason: recallReasonSchema.optional(),
	reasonNote: z.string().max(500).optional().nullable(),
	priority: recallPrioritySchema.optional(),
	assignedProfessionalId: z.string().uuid().optional().nullable(),
});
export type RecallUpdate = z.infer<typeof recallUpdateSchema>;

export const recallSnoozeSchema = z.object({
	months: z.number().int().min(1).max(24),
	reasonNote: z.string().max(500).optional().nullable(),
});
export type RecallSnooze = z.infer<typeof recallSnoozeSchema>;

export const recallAttemptSchema = z.object({
	channel: recallChannelSchema,
	outcome: recallOutcomeSchema,
	note: z.string().max(1000).optional().nullable(),
	linkedAppointmentId: z.string().uuid().optional().nullable(),
});
export type RecallAttempt = z.infer<typeof recallAttemptSchema>;

// --- Multi-Channel Cascade Escalation Contracts ---

export const cascadeStepSchema = z.object({
	stepNumber: z.number().int().min(1),
	channel: recallChannelSchema,
	delayHoursAfterPrevious: z.number().min(0),
	templateKey: z.string(),
	description: z.string().optional(),
});
export type CascadeStep = z.infer<typeof cascadeStepSchema>;

export const channelCascadeConfigSchema = z.object({
	organizationId: z.string().uuid(),
	name: z.string().min(1),
	isActive: z.boolean().default(true),
	steps: z.array(cascadeStepSchema).min(1),
	quietHoursStartMinute: z.number().int().min(0).max(1439).default(1260), // 21:00
	quietHoursEndMinute: z.number().int().min(0).max(1439).default(540),   // 09:00
	stopOnAnyResponse: z.boolean().default(true),
});
export type ChannelCascadeConfig = z.infer<typeof channelCascadeConfigSchema>;

export const plannedDispatchStepSchema = z.object({
	stepNumber: z.number().int(),
	channel: recallChannelSchema,
	scheduledAt: z.string().datetime(),
	templateKey: z.string(),
	status: z.enum(["pending", "dispatched", "skipped", "failed"]),
});
export type PlannedDispatchStep = z.infer<typeof plannedDispatchStepSchema>;

// --- Pure Domain Calculation Routines ---

/**
 * Normalizes any Date to standard YYYY-MM-01 string.
 */
export function normalizeDueMonthString(d: Date = new Date()): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}-01`;
}

/**
 * Calculates next recall due month string (YYYY-MM-01) by treatment category interval.
 */
export function calculateNextRecallDueMonth(
	fromDate: Date = new Date(),
	categoryKey = "checkup",
): string {
	const intervalMonths = RECALL_INTERVAL_MONTHS[categoryKey] ?? 6;
	let year = fromDate.getFullYear();
	let month = fromDate.getMonth() + intervalMonths;

	year += Math.floor(month / 12);
	month = ((month % 12) + 12) % 12;

	return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

/**
 * Interpolates variables in format `{patient_name}` or `{{patient_name}}`.
 */
export function renderRecallReminderTemplate(
	templateText: string,
	context: Record<string, unknown> = {},
): string {
	return templateText.replace(/\{{1,2}\s*([a-zA-Z0-9_-]+)\s*\}{1,2}/g, (match, key) => {
		const val = context[key];
		if (val === undefined || val === null) {
			return match;
		}
		return String(val);
	});
}

/**
 * Plans a timeline schedule for multi-channel cascade dispatch, taking delays into account.
 */
export function planCascadeDispatchSchedule(
	config: ChannelCascadeConfig,
	baseDate: Date = new Date(),
): PlannedDispatchStep[] {
	const steps: PlannedDispatchStep[] = [];
	let cumulativeHours = 0;

	for (const step of config.steps) {
		cumulativeHours += step.delayHoursAfterPrevious;
		const scheduledTime = new Date(baseDate.getTime() + cumulativeHours * 3600 * 1000);

		steps.push({
			stepNumber: step.stepNumber,
			channel: step.channel,
			scheduledAt: scheduledTime.toISOString(),
			templateKey: step.templateKey,
			status: "pending",
		});
	}

	return steps;
}

/**
 * Evaluates whether cascade should proceed to next step or terminate based on outcome.
 */
export function evaluateCascadeStepAdvance(
	outcome: RecallOutcome,
	stopOnAnyResponse = true,
): { shouldContinue: boolean; finalStatus: RecallStatus } {
	if (outcome === "scheduled") {
		return { shouldContinue: false, finalStatus: "contacted_scheduled" };
	}
	if (outcome === "declined") {
		return { shouldContinue: false, finalStatus: "contacted_declined" };
	}
	if (outcome === "wrong_number") {
		return { shouldContinue: false, finalStatus: "needs_review" };
	}
	if (outcome === "callback_requested") {
		return { shouldContinue: false, finalStatus: "needs_review" };
	}

	// no_answer / voicemail -> escalate to next channel in cascade
	return { shouldContinue: true, finalStatus: "contacted_no_answer" };
}
