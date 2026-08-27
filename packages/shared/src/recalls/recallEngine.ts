/**
 * Preventive Dental Checkup & Patient Recall Engine.
 * Adapted from dentalpin recalls & recall_reminders modules for DENTE Dental CRM.
 *
 * Implements clinical recall cadences, automated due date calculations,
 * status state machine, and multi-channel message templating.
 */

import { z } from "zod";
import {
	recallPrioritySchema,
	recallStatusSchema,
	type RecallPriority,
	type RecallStatus,
} from "../communications/recallCascade.js";

export const recallTypeSchema = z.enum([
	"hygiene_recall",     // Профгигиена раз в полгода (180 дней)
	"implant_check",      // Контроль остеоинтеграции (90 дней) / периимплантита (365 дней)
	"ortho_adjustment",   // Активация брекет-системы / смена элайнеров (30 дней)
	"caries_control",     // Диспансерный кариес-мониторинг детей (180 дней)
	"perio_maintenance",  // Пародонтологический поддерживающий визит (90 дней)
	"prosthetic_check",   // Контрольный осмотр ортопедических конструкций (180 дней)
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
	dueDate: z.string(), // YYYY-MM-DD
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
});
export type RecallItem = z.infer<typeof recallItemSchema>;

/**
 * Standard clinical intervals (in days) for routine dental recalls.
 */
export const DEFAULT_RECALL_INTERVALS_DAYS: Record<RecallType, number> = {
	hygiene_recall: 180,
	implant_check: 90,
	ortho_adjustment: 30,
	caries_control: 180,
	perio_maintenance: 90,
	prosthetic_check: 180,
	other: 180,
};

/**
 * Clinical descriptions in Russian for recall types.
 */
export const RECALL_TYPE_LABELS_RU: Record<RecallType, string> = {
	hygiene_recall: "Профессиональная гигиена и профилактический осмотр",
	implant_check: "Контрольный осмотр дентальных имплантатов",
	ortho_adjustment: "Плановая активация ортодонтической аппаратуры",
	caries_control: "Диспансерный осмотр и кариес-мониторинг",
	perio_maintenance: "Пародонтологический поддерживающий визит",
	prosthetic_check: "Контроль состояния ортопедических конструкций",
	other: "Профилактический визит",
};

/**
 * Calculates the next due date for a given recall type.
 */
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

/**
 * Filters recalls that are due or overdue up to target date.
 */
export function filterDueRecalls(
	recalls: readonly RecallItem[],
	targetDate: Date = new Date(),
	overdueOnly = false,
): RecallItem[] {
	const targetIso = targetDate.toISOString().slice(0, 10);
	const activeStatuses: Set<RecallStatus> = new Set(["pending", "contacted_no_answer", "snoozed"]);

	return recalls.filter((item) => {
		if (!activeStatuses.has(item.status)) return false;
		if (overdueOnly) {
			return item.dueDate < targetIso;
		}
		return item.dueDate <= targetIso;
	});
}

/**
 * Formats a patient-facing notification message for a recall.
 */
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
			specificAdvice = "Диспансерный осмотр позволяет выявить кариес на стадии пятна и сохранить здоровье зубов.";
			break;
		case "perio_maintenance":
			specificAdvice = "Поддерживающая пародонтальная терапия защищает опорные ткани зубов.";
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

/**
 * Validates allowed state transitions for patient recalls.
 */
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
		done: ["pending"], // Re-activating for next cycle
		cancelled: ["pending"],
	};

	return transitions[current]?.includes(target) ?? false;
}
