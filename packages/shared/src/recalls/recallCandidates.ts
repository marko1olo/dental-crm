/**
 * Canonical Recalls & Prophylactic Checkup Schemas and DTO Contracts.
 * Conforms to Russian clinical standards (Order 804n, Form 043/u) and DENTE architecture.
 */

import { z } from "zod";

/**
 * Насколько давно человек был в клинике (полоса диспансеризации).
 * due: Полгода без осмотра — пора на плановую профилактику (6–12 мес).
 * overdue: Больше года не был: пропущен как минимум один осмотр (12–24 мес).
 * probably_lost: Больше двух лет не был — скорее всего лечится в другом месте (24+ мес).
 * never_arrived: Записывался, но ни разу не дошёл до кресла.
 */
export const recallBandSchema = z.enum([
	"due",
	"overdue",
	"probably_lost",
	"never_arrived",
]);
export type RecallBand = z.infer<typeof recallBandSchema>;

/**
 * Кандидат на возврат/профосмотр.
 * Совместим с SQL-запросом к PostgreSQL 18 на бэкенде
 * и с интерфейсом экрана «Пора пригласить» (RecallListPanel / PatientRecallsHubModal).
 */
export const recallCandidateSchema = z.object({
	patientId: z.string().min(1),
	fullName: z.string().min(1),
	phone: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
	/** ISO-8601 строка или Date (null — завершённых приёмов не было). */
	lastCompletedAt: z
		.union([
			z.string(),
			z.date().transform((d) => d.toISOString()),
		])
		.nullable(),
	/** Полных месяцев с последнего визита. null для never_arrived. */
	monthsSinceLastVisit: z.number().int().nonnegative().nullable(),
	band: recallBandSchema,
	/** Человекочитаемая причина, почему пациент в списке. */
	reason: z.string(),
});
export type RecallCandidate = z.infer<typeof recallCandidateSchema>;

/**
 * Сводный отчёт по диспансеризации.
 */
export const recallReportSchema = z.object({
	candidates: z.array(recallCandidateSchema),
	byBand: z.record(recallBandSchema, z.number().int().nonnegative()),
	/** Сколько активных пациентов просмотрено. */
	examinedPatients: z.number().int().nonnegative(),
	note: z.string(),
});
export type RecallReport = z.infer<typeof recallReportSchema>;
