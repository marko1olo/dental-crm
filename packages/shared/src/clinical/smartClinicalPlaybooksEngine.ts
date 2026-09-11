/**
 * packages/shared/src/clinical/smartClinicalPlaybooksEngine.ts
 *
 * DENTE Dental CRM — Smart Clinical Playbooks Engine (Wave 132).
 * Reverse-engineered and adapted from DentalPin Copilot Bridge playbooks
 * (backend/app/modules/copilot/bridge.py).
 *
 * Clinical & Regulatory Standards:
 * - Playbook 1 (Briefing del dia): Daily doctor overview -> appointments, due/overdue recalls,
 *   unanswered treatment budgets (status 'sent' / 'proposed'), plus Mandate 8e somatic & allergy red flags.
 * - Playbook 2 (Cubrir un hueco por cancelacion): Cancellation gap recovery -> find overdue recalls,
 *   prioritize urgent pathology + timing fit + overdue days, propose top ranked candidates with phone.
 * - Playbook 3 (Preparar visita de un paciente): 1-screen pre-appointment summary -> patient brief,
 *   critical allergies/somatic stop-factors (Mandate 8e), primary vs repeat status, previous visit services,
 *   agreed budget stages, unpaid balance in kopecks, 0-click chairside guidance note.
 * - Official Russian Ministry of Health Form 043/u Ambulatory Card Protocol (Strictly 0 emojis per Mandate 8d item 7).
 * - Kopeck-exact integer financial balances without floating-point drift.
 */

import { z } from "zod";
import { formatKopecksRu as formatMoneyKopecksRu } from "../utils/money.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ZOD SCHEMAS & DOMAIN TYPES: CORE BRIEFS & RECALLS
// ─────────────────────────────────────────────────────────────────────────────

export const playbookRecallPrioritySchema = z.enum(["low", "medium", "normal", "high", "urgent"]);
export type PlaybookRecallPriority = z.infer<typeof playbookRecallPrioritySchema>;
type RecallPriority = PlaybookRecallPriority;

export const recallPathologyUrgencySchema = z.enum(["acute", "high", "routine"]);
export type RecallPathologyUrgency = z.infer<typeof recallPathologyUrgencySchema>;

export const playbookRecallItemSchema = z.object({
	id: z.string().optional(),
	organizationId: z.string().optional(),
	patientId: z.string(),
	patientFullName: z.string().min(1),
	patientPhone: z.string().optional().nullable(),
	recallType: z.string().optional().default("hygiene_recall"),
	reasonNote: z.string().optional().nullable(),
	dueDate: z.string(), // YYYY-MM-DD
	priority: playbookRecallPrioritySchema.default("normal"),
	diagnosis: z.string().optional().nullable(),
	toothNumber: z.number().int().min(11).max(85).optional().nullable(),
	estimatedDurationMinutes: z.number().int().positive().optional().default(30),
	pathologyUrgency: recallPathologyUrgencySchema.optional().default("routine"),
	status: z.enum(["pending", "scheduled", "completed", "cancelled", "overdue"]).optional().default("pending"),
	assignedDoctorId: z.string().optional().nullable(),
	assignedDoctorName: z.string().optional().nullable(),
});
export type PlaybookRecallItem = z.input<typeof playbookRecallItemSchema>;
type RecallItem = PlaybookRecallItem;

export const appointmentBriefSchema = z.object({
	id: z.string(),
	patientId: z.string(),
	patientFullName: z.string().min(1),
	patientPhone: z.string().optional().nullable(),
	time: z.string(), // e.g. "09:00" or "09:00 - 10:00"
	chairName: z.string(),
	chairId: z.string().optional().nullable(),
	doctorId: z.string().optional().nullable(),
	durationMinutes: z.number().int().positive().optional().default(30),
	reason: z.string(),
	criticalAllergies: z.array(z.string()).optional().default([]),
	somaticRiskFactors: z.array(z.string()).optional().default([]),
	isFirstVisit: z.boolean().optional().default(false),
	unpaidKopecks: z.number().int().optional().default(0),
});
export type AppointmentBrief = z.input<typeof appointmentBriefSchema>;

export const budgetBriefStageSchema = z.object({
	stageNumber: z.number().int().positive(),
	title: z.string(),
	status: z.enum(["draft", "proposed", "sent", "accepted", "in_progress", "completed", "declined"]),
	totalPriceKopecks: z.number().int().nonnegative(),
	category: z.string().optional(),
});
export type BudgetBriefStage = z.infer<typeof budgetBriefStageSchema>;

export const budgetBriefSchema = z.object({
	id: z.string(),
	patientId: z.string(),
	patientFullName: z.string().optional(),
	title: z.string(),
	status: z.enum(["draft", "proposed", "sent", "accepted", "in_progress", "completed", "declined"]),
	totalKopecks: z.number().int().nonnegative(),
	createdAt: z.string(),
	stages: z.array(budgetBriefStageSchema).optional().default([]),
	notes: z.string().optional().nullable(),
});
export type BudgetBrief = z.input<typeof budgetBriefSchema>;

export const patientBriefSchema = z.object({
	id: z.string(),
	fullName: z.string().min(1),
	birthDate: z.string().optional(),
	phone: z.string().optional().nullable(),
	gender: z.enum(["male", "female", "unspecified"]).optional(),
	cardRecordNumber: z.string().optional(),
	criticalAllergies: z.array(z.string()).optional().default([]),
	somaticRiskFactors: z.array(z.string()).optional().default([]),
	somaticNorm: z.boolean().optional().default(false),
	bloodCoagulationRisk: z.boolean().optional().default(false),
	anestheticToleranceRisk: z.boolean().optional().default(false),
});
export type PatientBrief = z.input<typeof patientBriefSchema>;

export const visitCompletedServiceSchema = z.object({
	code804n: z.string().optional().nullable(),
	name: z.string(),
	toothNumber: z.number().int().min(11).max(85).optional().nullable(),
	totalPriceKopecks: z.number().int().nonnegative().optional(),
});
export type VisitCompletedService = z.infer<typeof visitCompletedServiceSchema>;

export const visitBriefSchema = z.object({
	id: z.string().optional(),
	visitDate: z.string(),
	doctorName: z.string(),
	diagnosis: z.string().optional(),
	diagnosisCodeMkb10: z.string().optional(),
	completedServices: z.array(visitCompletedServiceSchema).default([]),
	clinicalNotes: z.string().optional(),
});
export type VisitBrief = z.infer<typeof visitBriefSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. PLAYBOOK 1: DOCTOR MORNING BRIEFING TYPES & SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const morningBriefingAppointmentSchema = z.object({
	id: z.string(),
	patientId: z.string(),
	patientFullName: z.string(),
	patientPhone: z.string().nullable(),
	time: z.string(),
	chairName: z.string(),
	reason: z.string(),
	durationMinutes: z.number().int().positive(),
	criticalAllergies: z.array(z.string()),
	somaticRiskFactors: z.array(z.string()),
	isFirstVisit: z.boolean(),
	unpaidKopecks: z.number().int(),
});
export type MorningBriefingAppointment = z.infer<typeof morningBriefingAppointmentSchema>;

export const morningBriefingAlertSchema = z.object({
	patientId: z.string(),
	patientFullName: z.string(),
	appointmentTime: z.string(),
	chairName: z.string(),
	alertType: z.enum(["allergy", "somatic", "hemostasis"]),
	description: z.string(),
	actionRequiredRu: z.string(),
});
export type MorningBriefingAlert = z.infer<typeof morningBriefingAlertSchema>;

export const morningBriefingRecallSchema = z.object({
	patientId: z.string(),
	patientFullName: z.string(),
	patientPhone: z.string().nullable(),
	recallType: z.string(),
	dueDate: z.string(),
	overdueDays: z.number().int().nonnegative(),
	priority: playbookRecallPrioritySchema,
	recommendedAction: z.string(),
});
export type MorningBriefingRecall = z.infer<typeof morningBriefingRecallSchema>;

export const morningBriefingBudgetSchema = z.object({
	budgetId: z.string(),
	patientId: z.string(),
	patientFullName: z.string(),
	title: z.string(),
	status: z.string(),
	totalKopecks: z.number().int().nonnegative(),
	totalRub: z.string(),
	pendingDays: z.number().int().nonnegative(),
	stageCount: z.number().int().nonnegative(),
});
export type MorningBriefingBudget = z.infer<typeof morningBriefingBudgetSchema>;

export const doctorMorningBriefingSchema = z.object({
	date: z.string(),
	doctorId: z.string(),
	doctorFullName: z.string(),
	appointments: z.array(morningBriefingAppointmentSchema),
	appointmentsCount: z.number().int().nonnegative(),
	criticalAlerts: z.array(morningBriefingAlertSchema),
	hasCriticalAlerts: z.boolean(),
	overdueRecalls: z.array(morningBriefingRecallSchema),
	overdueRecallsCount: z.number().int().nonnegative(),
	unansweredBudgets: z.array(morningBriefingBudgetSchema),
	unansweredBudgetsCount: z.number().int().nonnegative(),
	totalPendingBudgetsKopecks: z.number().int().nonnegative(),
	totalPendingBudgetsRub: z.string(),
	summaryChairsideNote: z.string(),
});
export type DoctorMorningBriefing = z.infer<typeof doctorMorningBriefingSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 3. PLAYBOOK 2: CANCELLATION GAP RECOVERY TYPES & SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const cancellationSlotSchema = z.object({
	startTime: z.string(),
	endTime: z.string().optional(),
	durationMinutes: z.number().int().positive(),
	chairName: z.string(),
	chairId: z.string().optional().nullable(),
	doctorId: z.string().optional().nullable(),
	doctorName: z.string().optional().nullable(),
	cancelledPatientName: z.string().optional().nullable(),
});
export type CancellationSlot = z.infer<typeof cancellationSlotSchema>;

export const rankedGapCandidateSchema = z.object({
	patientId: z.string(),
	patientFullName: z.string(),
	patientPhone: z.string(),
	priority: playbookRecallPrioritySchema,
	diagnosis: z.string(),
	toothNumber: z.number().int().min(11).max(85).nullable().optional(),
	overdueDays: z.number().int().nonnegative(),
	matchScore: z.number().int().nonnegative(),
	scoreBreakdown: z.object({
		priorityScore: z.number().nonnegative(),
		pathologyUrgencyScore: z.number().nonnegative(),
		timingFitScore: z.number().nonnegative(),
		overdueDaysScore: z.number().nonnegative(),
	}),
	recommendedProcedure: z.string(),
	estimatedMinutes: z.number().int().positive(),
	recommendationReason: z.string(),
});
export type RankedGapCandidate = z.infer<typeof rankedGapCandidateSchema>;

export const cancellationGapRecoverySchema = z.object({
	slot: cancellationSlotSchema,
	candidates: z.array(rankedGapCandidateSchema),
	totalCandidatesFound: z.number().int().nonnegative(),
	actionPromptRu: z.string(),
});
export type CancellationGapRecovery = z.infer<typeof cancellationGapRecoverySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 4. PLAYBOOK 3: PRE-APPOINTMENT SUMMARY TYPES & SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const preAppointmentSummarySchema = z.object({
	patient: patientBriefSchema,
	visitType: z.enum(["primary", "repeat"]),
	isFirstVisit: z.boolean(),
	hasCriticalAlerts: z.boolean(),
	criticalAlerts: z.array(z.string()),
	lastVisit: z
		.object({
			visitDate: z.string(),
			doctorName: z.string(),
			diagnosis: z.string().optional(),
			completedServices: z.array(visitCompletedServiceSchema),
		})
		.nullable(),
	agreedBudgetStages: z.array(
		z.object({
			budgetId: z.string(),
			stageNumber: z.number().int().positive(),
			title: z.string(),
			totalPriceKopecks: z.number().int().nonnegative(),
			totalPriceRub: z.string(),
			status: z.string(),
		}),
	),
	financialSummary: z.object({
		unpaidKopecks: z.number().int(),
		unpaidRub: z.string(),
		hasOverdueDebt: z.boolean(),
		financialStatusRu: z.string(),
	}),
	chairsideTip: z.string(),
});
export type PreAppointmentSummary = z.infer<typeof preAppointmentSummarySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 5. HELPER UTILITIES: MONEY, DATES & SCORING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats integer kopecks to Russian ruble currency string without floating point drift.
 * Uses shared money utility.
 */
function formatKopecksRu(kopecks: number): string {
	return formatMoneyKopecksRu(kopecks);
}

export const formatPlaybookKopecksRu = formatKopecksRu;

/**
 * Calculates calendar day difference between two YYYY-MM-DD date strings safely.
 */
export function calculateDaysBetween(fromDateStr: string, toDateStr: string): number {
	const fromClean = fromDateStr.slice(0, 10);
	const toClean = toDateStr.slice(0, 10);
	const fromMs = Date.parse(`${fromClean}T00:00:00Z`);
	const toMs = Date.parse(`${toClean}T00:00:00Z`);
	if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
		return 0;
	}
	return Math.max(0, Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24)));
}

/**
 * Evaluates urgency of dental pathology based on diagnosis text or explicit classification.
 */
export function evaluateDentalPathologyUrgency(
	diagnosisText?: string | null,
	explicitUrgency?: RecallPathologyUrgency,
): { urgency: RecallPathologyUrgency; score: number } {
	if (explicitUrgency === "acute") {
		return { urgency: "acute", score: 35 };
	}
	if (explicitUrgency === "high") {
		return { urgency: "high", score: 25 };
	}
	if (explicitUrgency === "routine") {
		return { urgency: "routine", score: 15 };
	}

	const text = (diagnosisText ?? "").toLowerCase();
	const ACUTE_KW = ["острая", "боль", "пульпит", "периодонтит", "швов", "выпала", "раскол", "абсцесс", "травм", "к04.0", "к04.4"];
	if (ACUTE_KW.some((k) => text.includes(k))) return { urgency: "acute", score: 35 };

	const HIGH_KW = ["глубокий кариес", "кариес", "к02", "активац", "скол", "периимплант", "десневой"];
	if (HIGH_KW.some((k) => text.includes(k))) return { urgency: "high", score: 25 };

	const ROUTINE_KW = ["гигиен", "осмотр", "чистк", "профилактик", "контрол"];
	if (ROUTINE_KW.some((k) => text.includes(k))) return { urgency: "routine", score: 15 };

	return { urgency: "routine", score: 10 };
}

const RECALL_PRIORITY_SCORES: Record<PlaybookRecallPriority, number> = {
	urgent: 35,
	high: 30,
	medium: 20,
	normal: 15,
	low: 10,
};

/**
 * Calculates weighted match score for filling a cancellation gap.
 * Max score is 100 points:
 * - Priority: up to 35 points
 * - Pathology urgency: up to 35 points
 * - Timing fit: up to 20 points
 * - Overdue days: up to 10 points
 */
export function calculateCandidateMatchScore(
	slotMinutes: number,
	recall: RecallItem,
	referenceDateStr: string,
): {
	matchScore: number;
	scoreBreakdown: {
		priorityScore: number;
		pathologyUrgencyScore: number;
		timingFitScore: number;
		overdueDaysScore: number;
	};
	overdueDays: number;
	urgency: RecallPathologyUrgency;
} {
	// 1. Priority score (0..35)
	const priorityScore = recall.priority ? (RECALL_PRIORITY_SCORES[recall.priority] ?? 15) : 15;

	// 2. Pathology urgency score (0..35)
	const pathology = evaluateDentalPathologyUrgency(
		`${recall.diagnosis ?? ""} ${recall.reasonNote ?? ""}`,
		recall.pathologyUrgency,
	);
	const pathologyUrgencyScore = pathology.score;

	// 3. Timing fit score (0..20)
	const estimatedMinutes = recall.estimatedDurationMinutes ?? 30;
	const diff = Math.abs(estimatedMinutes - slotMinutes);
	let timingFitScore = 10;
	if (diff === 0) {
		timingFitScore = 20;
	} else if (diff <= 15) {
		timingFitScore = 16;
	} else if (estimatedMinutes < slotMinutes) {
		timingFitScore = 12;
	} else {
		// Overruns slot duration
		timingFitScore = 6;
	}

	// 4. Overdue days score (0..10)
	const overdueDays = calculateDaysBetween(recall.dueDate, referenceDateStr);
	let overdueDaysScore = 2;
	if (overdueDays > 60) {
		overdueDaysScore = 10;
	} else if (overdueDays >= 30) {
		overdueDaysScore = 8;
	} else if (overdueDays >= 14) {
		overdueDaysScore = 6;
	} else if (overdueDays >= 1) {
		overdueDaysScore = 4;
	} else {
		overdueDaysScore = 2;
	}

	const matchScore = Math.min(100, priorityScore + pathologyUrgencyScore + timingFitScore + overdueDaysScore);

	return {
		matchScore,
		scoreBreakdown: {
			priorityScore,
			pathologyUrgencyScore,
			timingFitScore,
			overdueDaysScore,
		},
		overdueDays,
		urgency: pathology.urgency,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PLAYBOOK 1 ENGINE: DOCTOR MORNING BRIEFING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates Doctor Morning Briefing for daily clinical preparedness.
 * Incorporates Mandate 8e: flags critical allergies, somatic risks, overdue recalls,
 * and unanswered treatment estimates.
 */
export function generateMorningBriefing(input: {
	doctorId: string;
	doctorName?: string | undefined;
	date: string;
	appointments: AppointmentBrief[];
	recalls: RecallItem[];
	budgets: BudgetBrief[];
}): DoctorMorningBriefing {
	const doctorFullName = input.doctorName ?? "д-р Стоматолог";
	const appointments: MorningBriefingAppointment[] = input.appointments.map((app) => ({
		id: app.id,
		patientId: app.patientId,
		patientFullName: app.patientFullName,
		patientPhone: app.patientPhone ?? null,
		time: app.time,
		chairName: app.chairName,
		reason: app.reason,
		durationMinutes: app.durationMinutes ?? 30,
		criticalAllergies: app.criticalAllergies ?? [],
		somaticRiskFactors: app.somaticRiskFactors ?? [],
		isFirstVisit: app.isFirstVisit ?? false,
		unpaidKopecks: app.unpaidKopecks ?? 0,
	}));

	// Extract critical alerts across today's schedule
	const criticalAlerts: MorningBriefingAlert[] = [];
	for (const app of appointments) {
		if (app.criticalAllergies.length > 0) {
			criticalAlerts.push({
				patientId: app.patientId,
				patientFullName: app.patientFullName,
				appointmentTime: app.time,
				chairName: app.chairName,
				alertType: "allergy",
				description: `Аллергологический статус: ${app.criticalAllergies.join(", ")}`,
				actionRequiredRu: "Мандат 8e: исключить аллергенный анестетик / безадреналиновый протокол.",
			});
		}
		if (app.somaticRiskFactors.length > 0) {
			criticalAlerts.push({
				patientId: app.patientId,
				patientFullName: app.patientFullName,
				appointmentTime: app.time,
				chairName: app.chairName,
				alertType: "somatic",
				description: `Соматический стоп-фактор: ${app.somaticRiskFactors.join(", ")}`,
				actionRequiredRu: "Мандат 8e: щадящий гемостаз / контроль давления перед анестезией.",
			});
		}
	}

	// Filter overdue recalls (dueDate < date and not completed/cancelled)
	const overdueRecalls: MorningBriefingRecall[] = input.recalls
		.filter((r) => r.status !== "completed" && r.status !== "cancelled" && r.dueDate < input.date)
		.map((r) => {
			const overdueDays = calculateDaysBetween(r.dueDate, input.date);
			return {
				patientId: r.patientId,
				patientFullName: r.patientFullName,
				patientPhone: r.patientPhone ?? null,
				recallType: r.recallType ?? "hygiene_recall",
				dueDate: r.dueDate,
				overdueDays,
				priority: r.priority ?? "normal",
				recommendedAction: `Связаться для записи: ${r.reasonNote ?? r.diagnosis ?? "плановый диспансерный осмотр"}`,
			};
		})
		.sort((a, b) => b.overdueDays - a.overdueDays);

	// Filter unanswered budgets (status 'sent' or 'proposed')
	const unansweredBudgets: MorningBriefingBudget[] = input.budgets
		.filter((b) => b.status === "sent" || b.status === "proposed")
		.map((b) => {
			const pendingDays = calculateDaysBetween(b.createdAt, input.date);
			return {
				budgetId: b.id,
				patientId: b.patientId,
				patientFullName: b.patientFullName ?? "Пациент",
				title: b.title,
				status: b.status,
				totalKopecks: b.totalKopecks,
				totalRub: formatMoneyKopecksRu(b.totalKopecks),
				pendingDays,
				stageCount: b.stages ? b.stages.length : 0,
			};
		})
		.sort((a, b) => b.totalKopecks - a.totalKopecks);

	const totalPendingBudgetsKopecks = unansweredBudgets.reduce((acc, b) => acc + b.totalKopecks, 0);
	const totalPendingBudgetsRub = formatMoneyKopecksRu(totalPendingBudgetsKopecks);

	const alertsText =
		criticalAlerts.length > 0
			? `ВНИМАНИЕ: ${criticalAlerts.length} пациентов с соматическими/аллергологическими стоп-факторами.`
			: "Критические стоп-факторы отсутствуют. Физиологическая норма активна по умолчанию в 1 клик.";

	const summaryChairsideNote = `Брифинг врача на ${input.date}: приемов ${appointments.length}. ${alertsText} Просроченных диспансерных вызовов: ${overdueRecalls.length}. Неотвеченных смет: ${unansweredBudgets.length} на сумму ${totalPendingBudgetsRub}.`;

	return doctorMorningBriefingSchema.parse({
		date: input.date,
		doctorId: input.doctorId,
		doctorFullName,
		appointments,
		appointmentsCount: appointments.length,
		criticalAlerts,
		hasCriticalAlerts: criticalAlerts.length > 0,
		overdueRecalls,
		overdueRecallsCount: overdueRecalls.length,
		unansweredBudgets,
		unansweredBudgetsCount: unansweredBudgets.length,
		totalPendingBudgetsKopecks,
		totalPendingBudgetsRub,
		summaryChairsideNote,
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PLAYBOOK 2 ENGINE: CANCELLATION GAP RECOVERY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds and ranks candidates for filling a cancellation gap in the schedule.
 * Applies weighted scoring: Priority + Pathology Urgency + Timing Fit + Overdue Days.
 * Performs patient deduplication and enforces candidate limit.
 */
export function findCancellationGapCandidates(input: {
	slotMinutes: number;
	recalls: RecallItem[];
	candidateLimits?: number | undefined;
	currentDate?: string | undefined;
}): RankedGapCandidate[] {
	const refDate = input.currentDate ?? new Date().toISOString().slice(0, 10);
	const limit = input.candidateLimits ?? 3;

	// Score candidates and group by patientId for deduplication
	const bestCandidateByPatient = new Map<string, RankedGapCandidate>();

	for (const recall of input.recalls) {
		if (recall.status === "completed" || recall.status === "cancelled") {
			continue;
		}

		const evaluated = calculateCandidateMatchScore(input.slotMinutes, recall, refDate);
		const estimatedMinutes = recall.estimatedDurationMinutes ?? 30;
		const procedureText = recall.reasonNote ?? recall.diagnosis ?? "Плановая профгигиена и осмотр";

		let urgencyLabel = "плановый";
		if (evaluated.urgency === "acute") {
			urgencyLabel = "неотложный (острая патология)";
		} else if (evaluated.urgency === "high") {
			urgencyLabel = "высокий (кариес / дефект)";
		}

		const recommendationReason = `Приоритет: ${recall.priority}, статус: ${urgencyLabel}. Просрочка: ${evaluated.overdueDays} дн. Оценка окна ${input.slotMinutes} мин: ${evaluated.matchScore}/100.`;

		const candidate: RankedGapCandidate = {
			patientId: recall.patientId,
			patientFullName: recall.patientFullName,
			patientPhone: recall.patientPhone ?? "Телефон не указан",
			priority: recall.priority ?? "normal",
			diagnosis: recall.diagnosis ?? procedureText,
			toothNumber: recall.toothNumber ?? null,
			overdueDays: evaluated.overdueDays,
			matchScore: evaluated.matchScore,
			scoreBreakdown: evaluated.scoreBreakdown,
			recommendedProcedure: procedureText,
			estimatedMinutes,
			recommendationReason,
		};

		const existing = bestCandidateByPatient.get(recall.patientId);
		if (!existing || candidate.matchScore > existing.matchScore) {
			bestCandidateByPatient.set(recall.patientId, candidate);
		}
	}

	const candidates = Array.from(bestCandidateByPatient.values()).sort((a, b) => {
		if (b.matchScore !== a.matchScore) {
			return b.matchScore - a.matchScore;
		}
		return b.overdueDays - a.overdueDays;
	});

	return candidates.slice(0, limit);
}

/**
 * Builds full Cancellation Gap Recovery object with action prompt.
 */
export function recoverCancellationGap(input: {
	slot: CancellationSlot;
	recalls: RecallItem[];
	candidateLimits?: number | undefined;
	referenceDate?: string | undefined;
}): CancellationGapRecovery {
	const candidates = findCancellationGapCandidates({
		slotMinutes: input.slot.durationMinutes,
		recalls: input.recalls,
		...(input.candidateLimits !== undefined ? { candidateLimits: input.candidateLimits } : {}),
		...(input.referenceDate !== undefined ? { currentDate: input.referenceDate } : {}),
	});

	let actionPromptRu = `Окно ${input.slot.startTime} (${input.slot.durationMinutes} мин, ${input.slot.chairName}): кандидатов не найдено.`;
	const topCandidate = candidates[0];
	if (topCandidate) {
		actionPromptRu = `Окно ${input.slot.startTime} (${input.slot.durationMinutes} мин, ${input.slot.chairName}): рекомендуется связаться с пациентом ${topCandidate.patientFullName} (${topCandidate.patientPhone ?? ""}). Процедура: ${topCandidate.recommendedProcedure}. Скоринг соответствия: ${topCandidate.matchScore}/100.`;
	}

	return cancellationGapRecoverySchema.parse({
		slot: input.slot,
		candidates,
		totalCandidatesFound: candidates.length,
		actionPromptRu,
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. PLAYBOOK 3 ENGINE: PRE-APPOINTMENT SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates 1-screen Pre-Appointment Summary for frictionless chairside care.
 * Provides instant 0-click clinical tip, flags critical allergies/somatic factors,
 * checks previous visit services, and highlights accepted budget stages.
 */
export function generatePreAppointmentSummary(input: {
	patient: PatientBrief;
	lastVisit?: VisitBrief | undefined;
	pendingBudgets?: BudgetBrief[] | undefined;
	unpaidKopecks: number;
}): PreAppointmentSummary {
	const isFirstVisit = !input.lastVisit;
	const visitType: "primary" | "repeat" = isFirstVisit ? "primary" : "repeat";

	// Critical red flags
	const criticalAlerts: string[] = [];
	if (input.patient.criticalAllergies && input.patient.criticalAllergies.length > 0) {
		criticalAlerts.push(...input.patient.criticalAllergies);
	}
	if (input.patient.somaticRiskFactors && input.patient.somaticRiskFactors.length > 0) {
		criticalAlerts.push(...input.patient.somaticRiskFactors);
	}
	if (input.patient.bloodCoagulationRisk) {
		criticalAlerts.push("Риск кровотечения (антикоагулянты / гемостаз)");
	}
	if (input.patient.anestheticToleranceRisk) {
		criticalAlerts.push("Непереносимость местных анестетиков");
	}

	const hasCriticalAlerts = criticalAlerts.length > 0;

	// Agreed budget stages (status 'accepted' or 'in_progress')
	const agreedBudgetStages: {
		budgetId: string;
		stageNumber: number;
		title: string;
		totalPriceKopecks: number;
		totalPriceRub: string;
		status: string;
	}[] = [];

	if (input.pendingBudgets) {
		for (const budget of input.pendingBudgets) {
			if (!budget.stages) continue;
			for (const stage of budget.stages) {
				if (stage.status === "accepted" || stage.status === "in_progress") {
					agreedBudgetStages.push({
						budgetId: budget.id,
						stageNumber: stage.stageNumber,
						title: stage.title,
						totalPriceKopecks: stage.totalPriceKopecks,
						totalPriceRub: formatMoneyKopecksRu(stage.totalPriceKopecks),
						status: stage.status,
					});
				}
			}
		}
	}

	// Financial status
	const unpaidKopecks = input.unpaidKopecks;
	const unpaidRub = formatMoneyKopecksRu(unpaidKopecks);
	const hasOverdueDebt = unpaidKopecks > 0;
	let financialStatusRu = "Оплачено 100% (задолженности нет)";
	if (unpaidKopecks > 0) {
		financialStatusRu = `Задолженность: ${unpaidRub}`;
	} else if (unpaidKopecks < 0) {
		financialStatusRu = `Аванс на счете: ${formatMoneyKopecksRu(Math.abs(unpaidKopecks))}`;
	}

	// Previous visit info
	let lastVisitInfo: PreAppointmentSummary["lastVisit"] = null;
	if (input.lastVisit) {
		lastVisitInfo = {
			visitDate: input.lastVisit.visitDate,
			doctorName: input.lastVisit.doctorName,
			diagnosis: input.lastVisit.diagnosis,
			completedServices: input.lastVisit.completedServices ?? [],
		};
	}

	// 0-Click chairside tip for doctor (Mandate 8e)
	let chairsideTip = "";
	if (hasCriticalAlerts) {
		chairsideTip = `[СТОП-ФАКТОР] Внимание: ${criticalAlerts.join("; ")}. Подобрать безопасный анестетик, контролировать гемостаз.`;
	} else if (isFirstVisit) {
		chairsideTip =
			"Первичный пациент: активна норма в 1 клик по Мандату 8e. Заполните зубную формулу и проведите фотопротокол.";
	} else if (agreedBudgetStages.length > 0) {
		const nextStage = agreedBudgetStages[0];
		if (nextStage) {
			chairsideTip = `Согласован план лечения: этап №${nextStage.stageNumber} «${nextStage.title}» (${nextStage.totalPriceRub}). Материалы подготовлены.`;
		}
	} else if (input.lastVisit) {
		const serviceNames = input.lastVisit.completedServices.map((s) => s.name).join(", ");
		chairsideTip = `Повторный прием: предыдущий визит ${input.lastVisit.visitDate} (${input.lastVisit.doctorName}) — ${serviceNames || "осмотр"}. Оценить динамику заживления.`;
	} else {
		chairsideTip = "Пациент готов к приему. Физиологическая норма активна по умолчанию.";
	}

	return preAppointmentSummarySchema.parse({
		patient: input.patient,
		visitType,
		isFirstVisit,
		hasCriticalAlerts,
		criticalAlerts,
		lastVisit: lastVisitInfo,
		agreedBudgetStages,
		financialSummary: {
			unpaidKopecks,
			unpaidRub,
			hasOverdueDebt,
			financialStatusRu,
		},
		chairsideTip,
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. FORM 043/U A4 PROTOCOL FORMATTER (STRICTLY 0 EMOJIS PER MANDATE 8D ITEM 7)
// ─────────────────────────────────────────────────────────────────────────────

export * from "./smartClinicalPlaybookProtocols.js";
import { formatPlaybookForm043A4Protocol } from "./smartClinicalPlaybookProtocols.js";

// ─────────────────────────────────────────────────────────────────────────────
// 10. ENGINE NAMESPACE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const smartClinicalPlaybooksEngine = {
	generateMorningBriefing,
	findCancellationGapCandidates,
	recoverCancellationGap,
	generatePreAppointmentSummary,
	formatPlaybookForm043A4Protocol,
	calculateCandidateMatchScore,
	evaluateDentalPathologyUrgency,
	formatKopecksRu,
	calculateDaysBetween,
} as const;
