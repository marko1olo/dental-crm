/**
 * packages/shared/src/clinical/playbooks/cancellationGapRecovery.ts
 * Playbook 2: Cancellation Gap Recovery & Patient Recall Scoring (Wave 132 / Mandates 8b, 8e, 8x).
 */

import { z } from "zod";
import {
	calculateDaysBetween,
	type PlaybookRecallItem,
	playbookRecallPrioritySchema,
	type RecallPathologyUrgency,
	recallPathologyUrgencySchema,
} from "./playbookTypes.js";

export const cancellationSlotSchema = z.object({
	startTime: z.string(), endTime: z.string().optional(), durationMinutes: z.number().int().positive(),
	chairName: z.string(), chairId: z.string().optional().nullable(),
	doctorId: z.string().optional().nullable(), doctorName: z.string().optional().nullable(),
	cancelledPatientName: z.string().optional().nullable(),
});
export type CancellationSlot = z.infer<typeof cancellationSlotSchema>;

export const rankedGapCandidateSchema = z.object({
	patientId: z.string(), patientFullName: z.string(), patientPhone: z.string(),
	priority: playbookRecallPrioritySchema, diagnosis: z.string(),
	toothNumber: z.number().int().min(11).max(85).nullable().optional(),
	overdueDays: z.number().int().nonnegative(), matchScore: z.number().int().nonnegative(),
	scoreBreakdown: z.object({
		priorityScore: z.number().nonnegative(), pathologyUrgencyScore: z.number().nonnegative(),
		timingFitScore: z.number().nonnegative(), overdueDaysScore: z.number().nonnegative(),
	}),
	recommendedProcedure: z.string(), estimatedMinutes: z.number().int().positive(), recommendationReason: z.string(),
});
export type RankedGapCandidate = z.infer<typeof rankedGapCandidateSchema>;

export const cancellationGapRecoverySchema = z.object({
	slot: cancellationSlotSchema, candidates: z.array(rankedGapCandidateSchema),
	totalCandidatesFound: z.number().int().nonnegative(), actionPromptRu: z.string(),
});
export type CancellationGapRecovery = z.infer<typeof cancellationGapRecoverySchema>;

export function evaluateDentalPathologyUrgency(
	diagnosisText?: string | null, explicitUrgency?: RecallPathologyUrgency,
): { urgency: RecallPathologyUrgency; score: number } {
	if (explicitUrgency === "acute") return { urgency: "acute", score: 35 };
	if (explicitUrgency === "high") return { urgency: "high", score: 25 };
	if (explicitUrgency === "routine") return { urgency: "routine", score: 15 };
	const text = (diagnosisText ?? "").toLowerCase();
	if (["острая", "боль", "пульпит", "периодонтит", "швов", "выпала", "раскол", "абсцесс", "травм", "к04.0", "к04.4"].some((k) => text.includes(k))) return { urgency: "acute", score: 35 };
	if (["глубокий кариес", "кариес", "к02", "активац", "скол", "периимплант", "десневой"].some((k) => text.includes(k))) return { urgency: "high", score: 25 };
	return { urgency: "routine", score: ["гигиен", "осмотр", "чистк", "профилактик", "контрол"].some((k) => text.includes(k)) ? 15 : 10 };
}

const RECALL_PRIORITY_SCORES = { urgent: 35, high: 30, medium: 20, normal: 15, low: 10 } as const;

export function calculateCandidateMatchScore(
	slotMinutes: number, recall: PlaybookRecallItem, referenceDateStr: string,
) {
	const priorityScore = recall.priority ? (RECALL_PRIORITY_SCORES[recall.priority] ?? 15) : 15;
	const pathology = evaluateDentalPathologyUrgency(`${recall.diagnosis ?? ""} ${recall.reasonNote ?? ""}`, recall.pathologyUrgency);
	const estimatedMinutes = recall.estimatedDurationMinutes ?? 30;
	const diff = Math.abs(estimatedMinutes - slotMinutes);
	const timingFitScore = diff === 0 ? 20 : diff <= 15 ? 16 : estimatedMinutes < slotMinutes ? 12 : 6;
	const overdueDays = calculateDaysBetween(recall.dueDate, referenceDateStr);
	const overdueDaysScore = overdueDays > 60 ? 10 : overdueDays >= 30 ? 8 : overdueDays >= 14 ? 6 : overdueDays >= 1 ? 4 : 2;
	return {
		matchScore: Math.min(100, priorityScore + pathology.score + timingFitScore + overdueDaysScore),
		scoreBreakdown: { priorityScore, pathologyUrgencyScore: pathology.score, timingFitScore, overdueDaysScore },
		overdueDays, urgency: pathology.urgency,
	};
}

export function findCancellationGapCandidates(input: {
	slotMinutes: number; recalls: PlaybookRecallItem[]; candidateLimits?: number | undefined; currentDate?: string | undefined;
}): RankedGapCandidate[] {
	const refDate = input.currentDate ?? new Date().toISOString().slice(0, 10);
	const limit = input.candidateLimits ?? 3;
	const bestCandidateByPatient = new Map<string, RankedGapCandidate>();

	for (const recall of input.recalls) {
		if (recall.status === "completed" || recall.status === "cancelled") continue;
		const evaluated = calculateCandidateMatchScore(input.slotMinutes, recall, refDate);
		const estimatedMinutes = recall.estimatedDurationMinutes ?? 30;
		const procedureText = recall.reasonNote ?? recall.diagnosis ?? "Плановая профгигиена и осмотр";
		const urgencyLabel = evaluated.urgency === "acute" ? "неотложный (острая патология)" : evaluated.urgency === "high" ? "высокий (кариес / дефект)" : "плановый";
		const candidate: RankedGapCandidate = {
			patientId: recall.patientId, patientFullName: recall.patientFullName, patientPhone: recall.patientPhone ?? "Телефон не указан",
			priority: recall.priority ?? "normal", diagnosis: recall.diagnosis ?? procedureText, toothNumber: recall.toothNumber ?? null,
			overdueDays: evaluated.overdueDays, matchScore: evaluated.matchScore, scoreBreakdown: evaluated.scoreBreakdown,
			recommendedProcedure: procedureText, estimatedMinutes,
			recommendationReason: `Приоритет: ${recall.priority}, статус: ${urgencyLabel}. Просрочка: ${evaluated.overdueDays} дн. Оценка окна ${input.slotMinutes} мин: ${evaluated.matchScore}/100.`,
		};
		const existing = bestCandidateByPatient.get(recall.patientId);
		if (!existing || candidate.matchScore > existing.matchScore) bestCandidateByPatient.set(recall.patientId, candidate);
	}
	return Array.from(bestCandidateByPatient.values()).sort((a, b) => b.matchScore !== a.matchScore ? b.matchScore - a.matchScore : b.overdueDays - a.overdueDays).slice(0, limit);
}

export function recoverCancellationGap(input: {
	slot: CancellationSlot; recalls: PlaybookRecallItem[]; candidateLimits?: number | undefined; referenceDate?: string | undefined;
}): CancellationGapRecovery {
	const candidates = findCancellationGapCandidates({
		slotMinutes: input.slot.durationMinutes, recalls: input.recalls,
		...(input.candidateLimits !== undefined ? { candidateLimits: input.candidateLimits } : {}),
		...(input.referenceDate !== undefined ? { currentDate: input.referenceDate } : {}),
	});
	const top = candidates[0];
	const actionPromptRu = top
		? `Окно ${input.slot.startTime} (${input.slot.durationMinutes} мин, ${input.slot.chairName}): рекомендуется связаться с пациентом ${top.patientFullName} (${top.patientPhone ?? ""}). Процедура: ${top.recommendedProcedure}. Скоринг соответствия: ${top.matchScore}/100.`
		: `Окно ${input.slot.startTime} (${input.slot.durationMinutes} мин, ${input.slot.chairName}): кандидатов не найдено.`;
	return cancellationGapRecoverySchema.parse({ slot: input.slot, candidates, totalCandidatesFound: candidates.length, actionPromptRu });
}
