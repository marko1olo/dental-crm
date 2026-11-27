/**
 * Canonical Recalls & Prophylactic Checkup Schemas and DTO Contracts.
 * Conforms to Russian clinical standards (Order 804n, Form 043/u) and DENTE architecture.
 */

import { z } from "zod";
import {
	recallPrioritySchema,
	recallStatusSchema,
	type RecallStatus,
} from "../communications/recallCascade.js";

/**
 * Насколько давно человек был в клинике (интервал планового профосмотра / гигиены).
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

export const recallCohortSchema = z.enum([
	"hygiene_therapy",
	"implant",
	"orthodontic_retention",
	"periodontal",
	"endodontic",
	"surgical_suture_removal",
	"general",
]);
export type RecallCohort = z.infer<typeof recallCohortSchema>;

/**
 * Канонический статус обработки кандидата на профосмотр в канбан-панели.
 */
export const recallCandidateStatusSchema = z.enum([
	"due_now",
	"contacted",
	"scheduled",
	"declined",
]);
export type RecallCandidateStatus = z.infer<typeof recallCandidateStatusSchema>;

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
	/** Дней с последнего визита (для краткосрочных циклов: хирургия 7–10 дней). */
	daysSinceLastVisit: z.number().int().nonnegative().nullable().optional(),
	band: recallBandSchema,
	/** Человекочитаемая причина, почему пациент в списке. */
	reason: z.string(),
	cohortType: recallCohortSchema.optional(),
	suggestedIntervalMonths: z.number().int().nonnegative().optional(),
	suggestedIntervalDays: z.number().int().positive().optional(),
	status: recallCandidateStatusSchema.optional(),
	notes: z.string().nullable().optional(),
	lastContactChannel: z.string().nullable().optional(),
	attendingDoctorId: z.string().uuid().nullable().optional(),
	attendingDoctorName: z.string().nullable().optional(),
	lastProcedureCategory: z.string().nullable().optional(),
}).strict();
export type RecallCandidate = z.infer<typeof recallCandidateSchema>;

/**
 * Сводный отчёт по плановым профосмотрам и профилактике (реколлам).
 */
export const recallReportSchema = z.object({
	candidates: z.array(recallCandidateSchema),
	byBand: z.record(recallBandSchema, z.number().int().nonnegative()),
	/** Сколько активных пациентов просмотрено. */
	examinedPatients: z.number().int().nonnegative(),
	note: z.string(),
}).strict();
export type RecallReport = z.infer<typeof recallReportSchema>;

/**
 * Запрос на отправку приглашения на плановый профосмотр / профгигиену.
 */
export const recallInviteSchema = z.object({
	patientId: z.string().min(1),
	channel: z.string().min(2).max(30),
	/** Текст готовит вызывающий: подстановка переменных уже выполнена. */
	body: z.string().trim().min(5).max(2000),
}).strict();
export type RecallInviteRequest = z.infer<typeof recallInviteSchema>;

/**
 * Ответ сервера на отправку приглашения.
 */
export const recallInviteResultSchema = z.object({
	ok: z.boolean(),
	outboxId: z.string().optional(),
	duplicate: z.boolean().optional(),
	message: z.string(),
}).strict();
export type RecallInviteResponse = z.infer<typeof recallInviteResultSchema>;

export const recallTypeSchema = z.enum([
	"hygiene_recall",
	"implant_check",
	"ortho_adjustment",
	"caries_control",
	"perio_maintenance",
	"prosthetic_check",
	"surgical_suture_removal",
	"other",
]);
export type RecallType = z.infer<typeof recallTypeSchema>;

export const recallItemSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	clinicId: z.string().uuid().optional().nullable(),
	patientId: z.string().uuid(),
	patientFullName: z.string().min(1),
	patientPhone: z.string().optional().nullable(),
	recallType: recallTypeSchema,
	reasonNote: z.string().max(500).optional().nullable(),
	dueDate: z.string(),
	priority: recallPrioritySchema.default("normal"),
	status: recallStatusSchema.default("pending"),
	assignedDoctorId: z.string().uuid().optional().nullable(),
	assignedDoctorName: z.string().optional().nullable(),
	linkedAppointmentId: z.string().uuid().optional().nullable(),
	contactAttemptCount: z.number().int().nonnegative().default(0),
	lastContactAttemptAt: z.string().datetime().optional().nullable(),
	completedAt: z.string().datetime().optional().nullable(),
	createdAt: z.string().datetime().optional(),
	updatedAt: z.string().datetime().optional(),
}).strict();
export type RecallItem = z.infer<typeof recallItemSchema>;

export const DEFAULT_RECALL_INTERVALS_DAYS: Record<RecallType, number> = {
	hygiene_recall: 180,
	implant_check: 90,
	ortho_adjustment: 30,
	caries_control: 180,
	perio_maintenance: 90,
	prosthetic_check: 180,
	surgical_suture_removal: 7,
	other: 180,
};

export const RECALL_TYPE_LABELS_RU: Record<RecallType, string> = {
	hygiene_recall: "Профессиональная гигиена и профилактический осмотр",
	implant_check: "Контрольный осмотр дентальных имплантатов",
	ortho_adjustment: "Плановая активация ортодонтической аппаратуры",
	caries_control: "Контрольный осмотр и кариес-мониторинг",
	perio_maintenance: "Пародонтологический поддерживающий визит",
	prosthetic_check: "Контроль состояния ортопедических конструкций",
	surgical_suture_removal: "Контрольный осмотр и снятие швов",
	other: "Профилактический визит",
};

export function calculateNextRecallDate(
	baseDate: Date | string,
	recallType: RecallType,
	customDays?: number,
): Date {
	const start = typeof baseDate === "string" ? new Date(baseDate) : new Date(baseDate.getTime());
	const days = customDays ?? DEFAULT_RECALL_INTERVALS_DAYS[recallType] ?? 180;
	const result = new Date(start.getTime());
	result.setDate(result.getDate() + days);
	return result;
}

export function filterDueRecalls(
	recalls: readonly RecallItem[],
	targetDate: Date = new Date(),
	overdueOnly = false,
): RecallItem[] {
	const targetIso = targetDate.toISOString().slice(0, 10);
	const activeStatuses = new Set<RecallStatus>(["pending", "contacted_no_answer", "snoozed"]);

	return recalls.filter((item) => {
		if (!activeStatuses.has(item.status)) return false;
		if (overdueOnly) {
			return item.dueDate < targetIso;
		}
		return item.dueDate <= targetIso;
	});
}

export function formatRecallMessage(
	recall: RecallItem,
	clinicName = "Стоматологическая клиника ДЕНТЕ",
): { title: string; bodyRu: string } {
	const label = RECALL_TYPE_LABELS_RU[recall.recallType] || "Профилактический осмотр";
	const patientFirst = recall.patientFullName.split(" ")[0] || "Уважаемый пациент";

	let specificAdvice = "";
	switch (recall.recallType) {
		case "hygiene_recall":
			specificAdvice = "Регулярная профгигиена раз в 6 месяцев предотвращает образование зубного камня и воспаление десен.";
			break;
		case "implant_check":
			specificAdvice = "Плановый осмотр и рентген-контроль необходимы для оценки остеоинтеграции имплантатов.";
			break;
		case "ortho_adjustment":
			specificAdvice = "Напоминаем о необходимости плановой активации брекет-системы или смены элайнеров.";
			break;
		case "caries_control":
			specificAdvice = "Плановый контрольный осмотр позволяет вовремя выявить кариес на стадии пятна и сохранить здоровье зубов.";
			break;
		case "perio_maintenance":
			specificAdvice = "Поддерживающая пародонтальная терапия защищает опорные ткани зубов.";
			break;
		case "surgical_suture_removal":
			specificAdvice = "После хирургического вмешательства необходим контрольный осмотр врача и своевременное снятие швов (7–10 дней).";
			break;
		default:
			specificAdvice = "Рекомендуем запланировать визит для сохранения здоровья полости рта.";
	}

	const bodyRu = `Здравствуйте, ${patientFirst}! В ${clinicName} подошел срок планового визита: ${label}. ${specificAdvice} Пожалуйста, выберите удобное время для записи.`;

	return {
		title: `Напоминание о визите: ${label}`,
		bodyRu,
	};
}

export function canTransitionRecallStatus(
	current: RecallStatus,
	target: RecallStatus,
): boolean {
	if (current === target) return true;

	const transitions: Record<RecallStatus, RecallStatus[]> = {
		pending: ["contacted_no_answer", "contacted_scheduled", "contacted_declined", "done", "cancelled", "snoozed"],
		contacted_no_answer: ["contacted_scheduled", "contacted_declined", "done", "cancelled", "snoozed", "pending"],
		contacted_scheduled: ["done", "cancelled", "pending"],
		contacted_declined: ["pending", "cancelled", "snoozed"],
		snoozed: ["pending", "contacted_scheduled", "cancelled"],
		needs_review: ["pending", "contacted_scheduled", "cancelled", "snoozed"],
		done: ["pending"],
		cancelled: ["pending"],
	};

	return transitions[current]?.includes(target) ?? false;
}
