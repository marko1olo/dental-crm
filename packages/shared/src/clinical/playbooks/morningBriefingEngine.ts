/**
 * packages/shared/src/clinical/playbooks/morningBriefingEngine.ts
 * Playbook 1: Doctor Morning Briefing & Mandate 8e Red Flags (Wave 132 / Mandates 8b, 8e, 8x).
 */

import { z } from "zod";
import { formatKopecksRu } from "../../utils/money.js";
import {
	type AppointmentBrief,
	type BudgetBrief,
	calculateDaysBetween,
	type PlaybookRecallItem,
	playbookRecallPrioritySchema,
} from "./playbookTypes.js";

export const morningBriefingAppointmentSchema = z.object({
	id: z.string(), patientId: z.string(), patientFullName: z.string(), patientPhone: z.string().nullable(),
	time: z.string(), chairName: z.string(), reason: z.string(), durationMinutes: z.number().int().positive(),
	criticalAllergies: z.array(z.string()), somaticRiskFactors: z.array(z.string()),
	isFirstVisit: z.boolean(), unpaidKopecks: z.number().int(),
});
export type MorningBriefingAppointment = z.infer<typeof morningBriefingAppointmentSchema>;

export const morningBriefingAlertSchema = z.object({
	patientId: z.string(), patientFullName: z.string(), appointmentTime: z.string(), chairName: z.string(),
	alertType: z.enum(["allergy", "somatic", "hemostasis"]), description: z.string(), actionRequiredRu: z.string(),
});
export type MorningBriefingAlert = z.infer<typeof morningBriefingAlertSchema>;

export const morningBriefingRecallSchema = z.object({
	patientId: z.string(), patientFullName: z.string(), patientPhone: z.string().nullable(), recallType: z.string(),
	dueDate: z.string(), overdueDays: z.number().int().nonnegative(), priority: playbookRecallPrioritySchema, recommendedAction: z.string(),
});
export type MorningBriefingRecall = z.infer<typeof morningBriefingRecallSchema>;

export const morningBriefingBudgetSchema = z.object({
	budgetId: z.string(), patientId: z.string(), patientFullName: z.string(), title: z.string(), status: z.string(),
	totalKopecks: z.number().int().nonnegative(), totalRub: z.string(), pendingDays: z.number().int().nonnegative(), stageCount: z.number().int().nonnegative(),
});
export type MorningBriefingBudget = z.infer<typeof morningBriefingBudgetSchema>;

export const doctorMorningBriefingSchema = z.object({
	date: z.string(), doctorId: z.string(), doctorFullName: z.string(),
	appointments: z.array(morningBriefingAppointmentSchema), appointmentsCount: z.number().int().nonnegative(),
	criticalAlerts: z.array(morningBriefingAlertSchema), hasCriticalAlerts: z.boolean(),
	overdueRecalls: z.array(morningBriefingRecallSchema), overdueRecallsCount: z.number().int().nonnegative(),
	unansweredBudgets: z.array(morningBriefingBudgetSchema), unansweredBudgetsCount: z.number().int().nonnegative(),
	totalPendingBudgetsKopecks: z.number().int().nonnegative(), totalPendingBudgetsRub: z.string(), summaryChairsideNote: z.string(),
});
export type DoctorMorningBriefing = z.infer<typeof doctorMorningBriefingSchema>;

export function generateMorningBriefing(input: {
	doctorId: string; doctorName?: string | undefined; date: string;
	appointments: AppointmentBrief[]; recalls: PlaybookRecallItem[]; budgets: BudgetBrief[];
}): DoctorMorningBriefing {
	const doctorFullName = input.doctorName ?? "д-р Стоматолог";
	const appointments: MorningBriefingAppointment[] = input.appointments.map((a) => ({
		id: a.id, patientId: a.patientId, patientFullName: a.patientFullName,
		patientPhone: a.patientPhone ?? null, time: a.time, chairName: a.chairName,
		reason: a.reason, durationMinutes: a.durationMinutes ?? 30,
		criticalAllergies: a.criticalAllergies ?? [], somaticRiskFactors: a.somaticRiskFactors ?? [],
		isFirstVisit: a.isFirstVisit ?? false, unpaidKopecks: a.unpaidKopecks ?? 0,
	}));

	const criticalAlerts: MorningBriefingAlert[] = [];
	for (const a of appointments) {
		if (a.criticalAllergies.length > 0) {
			criticalAlerts.push({
				patientId: a.patientId, patientFullName: a.patientFullName, appointmentTime: a.time, chairName: a.chairName,
				alertType: "allergy", description: `Аллергологический статус: ${a.criticalAllergies.join(", ")}`,
				actionRequiredRu: "Мандат 8e: исключить аллергенный анестетик / безадреналиновый протокол.",
			});
		}
		if (a.somaticRiskFactors.length > 0) {
			criticalAlerts.push({
				patientId: a.patientId, patientFullName: a.patientFullName, appointmentTime: a.time, chairName: a.chairName,
				alertType: "somatic", description: `Соматический стоп-фактор: ${a.somaticRiskFactors.join(", ")}`,
				actionRequiredRu: "Мандат 8e: щадящий гемостаз / контроль давления перед анестезией.",
			});
		}
	}

	const overdueRecalls: MorningBriefingRecall[] = input.recalls
		.filter((r) => r.status !== "completed" && r.status !== "cancelled" && r.dueDate < input.date)
		.map((r) => ({
			patientId: r.patientId, patientFullName: r.patientFullName, patientPhone: r.patientPhone ?? null,
			recallType: r.recallType ?? "hygiene_recall", dueDate: r.dueDate,
			overdueDays: calculateDaysBetween(r.dueDate, input.date), priority: r.priority ?? "normal",
			recommendedAction: `Связаться для записи: ${r.reasonNote ?? r.diagnosis ?? "плановый диспансерный осмотр"}`,
		}))
		.sort((a, b) => b.overdueDays - a.overdueDays);

	const unansweredBudgets: MorningBriefingBudget[] = input.budgets
		.filter((b) => b.status === "sent" || b.status === "proposed")
		.map((b) => ({
			budgetId: b.id, patientId: b.patientId, patientFullName: b.patientFullName ?? "Пациент",
			title: b.title, status: b.status, totalKopecks: b.totalKopecks, totalRub: formatKopecksRu(b.totalKopecks),
			pendingDays: calculateDaysBetween(b.createdAt, input.date), stageCount: b.stages ? b.stages.length : 0,
		}))
		.sort((a, b) => b.totalKopecks - a.totalKopecks);

	const totalPendingBudgetsKopecks = unansweredBudgets.reduce((acc, b) => acc + b.totalKopecks, 0);
	const totalPendingBudgetsRub = formatKopecksRu(totalPendingBudgetsKopecks);
	const alertsText = criticalAlerts.length > 0
		? `ВНИМАНИЕ: ${criticalAlerts.length} пациентов с соматическими/аллергологическими стоп-факторами.`
		: "Критические стоп-факторы отсутствуют. Физиологическая норма активна по умолчанию в 1 клик.";
	const summaryChairsideNote = `Брифинг врача на ${input.date}: приемов ${appointments.length}. ${alertsText} Просроченных диспансерных вызовов: ${overdueRecalls.length}. Неотвеченных смет: ${unansweredBudgets.length} на сумму ${totalPendingBudgetsRub}.`;

	return doctorMorningBriefingSchema.parse({
		date: input.date, doctorId: input.doctorId, doctorFullName, appointments, appointmentsCount: appointments.length,
		criticalAlerts, hasCriticalAlerts: criticalAlerts.length > 0, overdueRecalls, overdueRecallsCount: overdueRecalls.length,
		unansweredBudgets, unansweredBudgetsCount: unansweredBudgets.length, totalPendingBudgetsKopecks, totalPendingBudgetsRub, summaryChairsideNote,
	});
}
