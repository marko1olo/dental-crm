/**
 * crmLeakDetectorEngine.ts — 210-Day Clinical Hygiene & Warranty Churn Detection Engine.
 *
 * КЛИНИЧЕСКОЕ ОБОСНОВАНИЕ ПОРОГА 210 ДНЕЙ:
 * • 180 дней (6 месяцев): нормативный срок гарантии на терапевтические реставрации (пломбы, штифты)
 *   по Положению о гарантийных обязательствах СтАР (Стоматологической Ассоциации России).
 * • 210 дней (7 месяцев): критическая точка угасания эффекта профессиональной гигиены полости рта.
 *   Минерализация мягкого зубного налета в поддесневой зубной камень, возникновение гингивита,
 *   высокий риск скрытого вторичного кариеса контактных поверхностей.
 *
 * ФИЛЬТРЫ ИСКЛЮЧЕНИЯ:
 * • Пациенты с УЖЕ запланированным будущим визитом (starts_at > now) ИСКЛЮЧАЮТСЯ из обзвона.
 * • Пациенты с активным ожиданием в waitlist ИСКЛЮЧАЮТСЯ.
 * • Пациенты, объединенные в дубликаты (merged_into_patient_id != null) ИСКЛЮЧАЮТСЯ.
 */

import { z } from "zod";

export const CLINICAL_LEAK_THRESHOLD_DAYS = 210;

export const crmLeadStatusSchema = z.enum([
	"new",          // Выявлен отток >210 дней, ожидает распределения
	"in_progress",  // Взят в работу администратором
	"contacted",    // Совершен звонок / отправлено персонализированное сообщение
	"rebooked",     // Успех: записан на повторный прием / контрольный осмотр
	"declined",     // Отказ: пациент уехал, лечится в другом месте, отложил
	"archived",     // Архив: пациент перестал отвечать
]);
export type CrmLeadStatus = z.infer<typeof crmLeadStatusSchema>;

export const crmDeclineReasonSchema = z.enum([
	"too_expensive",
	"moved_away",
	"treated_elsewhere",
	"dissatisfied_with_doctor",
	"postponed_temporarily",
	"no_answer_3_times",
	"other",
]);
export type CrmDeclineReason = z.infer<typeof crmDeclineReasonSchema>;

export const DECLINE_REASON_LABELS_RU: Record<CrmDeclineReason, string> = {
	too_expensive: "Высокая стоимость лечения",
	moved_away: "Сменил место жительства / переехал",
	treated_elsewhere: "Проходит лечение в другой клинике",
	dissatisfied_with_doctor: "Недоволен качеством прошлого лечения / врачом",
	postponed_temporarily: "Отложил лечение по личным причинам",
	no_answer_3_times: "Не берет трубку (3 попытки контакта)",
	other: "Другая причина",
};

export interface CrmLeakDetectorCandidate {
	patientId: string;
	patientFullName: string;
	phone: string;
	lastCompletedVisitDate: string; // ISO
	daysSinceLastVisit: number;
	lastDoctorId: string | null;
	lastDoctorName: string | null;
	lastSpecialty: string | null;
	hasFutureAppointment: boolean;
	hasActiveWaitlist: boolean;
	hasUncompletedPlan: boolean;
	uncompletedPlanRub: number;
	lastVisitServiceTitle?: string | null;
}

export interface CrmLeakLeadItem {
	id: string;
	organizationId: string;
	patientId: string;
	patientFullName: string;
	phone: string;
	daysSinceLastVisit: number;
	lastVisitDate: string;
	lastDoctorId: string | null;
	lastDoctorName: string | null;
	lastSpecialty: string | null;
	uncompletedPlanSumRub: number;
	hasUncompletedPlan: boolean;
	clinicalRiskReason: string;
	leadStatus: CrmLeadStatus;
	assignedAdminUserId: string | null;
	assignedAdminName: string | null;
	contactAttemptsCount: number;
	lastContactAt: string | null;
	lastContactChannel: "call" | "whatsapp" | "telegram" | "sms" | null;
	lastContactNotes: string | null;
	rebookedAppointmentId: string | null;
	rebookedDate: string | null;
	declineReason: CrmDeclineReason | null;
	declineComment: string | null;
	aiReactivationSuggestion: string;
	createdAt: string;
	updatedAt: string;
}

export interface CrmLeakFunnelMetrics {
	totalIdentifiedLeads: number;
	inProgressCount: number;
	contactedCount: number;
	rebookedCount: number;
	declinedCount: number;
	archivedCount: number;
	reactivationConversionPct: number; // rebooked / (rebooked + declined + contacted + in_progress)
	rebookedRevenuePotentialRub: number; // potential revenue from rebooked patients
	totalUncompletedPlanSumRub: number; // total revenue locked in uncompleted plans of churned patients
	averageDaysSinceVisit: number;
	topChurnDoctors: Array<{ doctorName: string; leadCount: number }>;
	topChurnSpecialties: Array<{ specialty: string; leadCount: number }>;
}

/**
 * Проверяет, квалифицируется ли пациент как клиническая утечка (отток > 210 дней).
 */
export function isQualifiedForLeakLead(candidate: CrmLeakDetectorCandidate): boolean {
	if (candidate.hasFutureAppointment) return false;
	if (candidate.hasActiveWaitlist) return false;
	return candidate.daysSinceLastVisit >= CLINICAL_LEAK_THRESHOLD_DAYS;
}

/**
 * Генерирует клиническое обоснование необходимости визита (Risk Reason).
 */
export function generateClinicalRiskReason(
	daysSinceLastVisit: number,
	hasUncompletedPlan: boolean,
	lastSpecialty: string | null,
): string {
	const months = Math.floor(daysSinceLastVisit / 30);

	if (hasUncompletedPlan) {
		return `Пациент не посещал клинику ${daysSinceLastVisit} дн. (${months} мес.). Имеются незавершенные этапы комплексного плана лечения! Риск деформации зубного ряда и потери результатов предыдущего этапа.`;
	}

	if (lastSpecialty === "orthopedics") {
		return `Прошло ${daysSinceLastVisit} дн. (${months} мес.) после сдачи ортопедической конструкции. Необходим контрольный осмотр окклюзии и краевого прилегания коронок.`;
	}

	if (lastSpecialty === "surgery") {
		return `Прошло ${daysSinceLastVisit} дн. (${months} мес.) после хирургического вмешательства / имплантации. Требуется рентген-контроль остеоинтеграции и состояния костной ткани.`;
	}

	return `Прошло ${daysSinceLastVisit} дн. (${months} мес.) с момента последнего визита. Истек срок гарантии на пломбы (6 мес.) и угас эффект профгигиены. Высокий риск поддесневого камня и скрытого кариеса.`;
}

/**
 * Генерирует готовый персонализированный скрипт для администратора (звонок / WhatsApp).
 */
export function generateReactivationScript(
	patientFullName: string,
	clinicName: string,
	doctorName: string | null,
	daysSinceLastVisit: number,
	hasUncompletedPlan: boolean,
): string {
	const firstName = patientFullName.split(" ")[1] || patientFullName;

	if (hasUncompletedPlan) {
		return (
			`Здравствуйте, ${firstName}! Вас беспокоит служба заботы клиники «${clinicName}».\n\n` +
			`Ваш лечащий врач ${doctorName || "клиники"} обратил внимание, что вы не завершили согласованный план лечения. ` +
			`Прошло уже больше ${Math.floor(daysSinceLastVisit / 30)} месяцев с вашего последнего визита. ` +
			`Чтобы зафиксированные результаты не были потеряны и зубы не сместились, предлагаем выбрать удобное время для продолжения этапа лечения. ` +
			`Подскажите, в будни или выходные вам удобнее подойти?`
		);
	}

	return (
		`Здравствуйте, ${firstName}! Стоматологическая клиника «${clinicName}».\n\n` +
		`Напоминаем, что с момента вашего последнего визита к доктору ${doctorName || "нашему специалисту"} прошло уже 7 месяцев. ` +
		`Для сохранения здоровья десен и гарантии на ранее пролеченные зубы подошло время контрольного осмотра и профессиональной гигиены. ` +
		`Доктор с удовольствием проведет диагностику и оценит состояние эмали. Записать вас на этой неделе?`
	);
}

/**
 * Рассчитывает сводную воронку реактивации пациентов из списка лидов.
 */
export function calculateLeakFunnelMetrics(leads: readonly CrmLeakLeadItem[]): CrmLeakFunnelMetrics {
	let inProgressCount = 0;
	let contactedCount = 0;
	let rebookedCount = 0;
	let declinedCount = 0;
	let archivedCount = 0;
	let totalDays = 0;
	let totalUncompletedPlanSumRub = 0;

	const doctorCounts: Record<string, number> = {};
	const specialtyCounts: Record<string, number> = {};

	for (const lead of leads) {
		totalDays += lead.daysSinceLastVisit;
		totalUncompletedPlanSumRub += lead.uncompletedPlanSumRub;

		if (lead.leadStatus === "in_progress") inProgressCount++;
		else if (lead.leadStatus === "contacted") contactedCount++;
		else if (lead.leadStatus === "rebooked") rebookedCount++;
		else if (lead.leadStatus === "declined") declinedCount++;
		else if (lead.leadStatus === "archived") archivedCount++;

		const doc = lead.lastDoctorName || "Не назначен";
		doctorCounts[doc] = (doctorCounts[doc] || 0) + 1;

		const spec = lead.lastSpecialty || "Общая стоматология";
		specialtyCounts[spec] = (specialtyCounts[spec] || 0) + 1;
	}

	const touchedCount = inProgressCount + contactedCount + rebookedCount + declinedCount;
	const reactivationConversionPct = touchedCount > 0
		? Math.round((rebookedCount / touchedCount) * 1000) / 10
		: 0;

	// Средний чек повторного визита в клинике ~7500 ₽
	const rebookedRevenuePotentialRub = rebookedCount * 7500;

	const topChurnDoctors = Object.entries(doctorCounts)
		.map(([doctorName, leadCount]) => ({ doctorName, leadCount }))
		.sort((a, b) => b.leadCount - a.leadCount)
		.slice(0, 5);

	const topChurnSpecialties = Object.entries(specialtyCounts)
		.map(([specialty, leadCount]) => ({ specialty, leadCount }))
		.sort((a, b) => b.leadCount - a.leadCount)
		.slice(0, 5);

	return {
		totalIdentifiedLeads: leads.length,
		inProgressCount,
		contactedCount,
		rebookedCount,
		declinedCount,
		archivedCount,
		reactivationConversionPct,
		rebookedRevenuePotentialRub,
		totalUncompletedPlanSumRub: Math.round(totalUncompletedPlanSumRub * 100) / 100,
		averageDaysSinceVisit: leads.length > 0 ? Math.round(totalDays / leads.length) : 0,
		topChurnDoctors,
		topChurnSpecialties,
	};
}
