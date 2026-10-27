/**
 * packages/shared/src/clinical/playbooks/preVisitSummaryEngine.ts
 * Playbook 3: 1-Screen Pre-Appointment Summary (Wave 132 / Mandates 8b, 8e, 8x, 8ap).
 */

import { z } from "zod";
import { formatKopecksRu } from "../../utils/money.js";
import {
	type BudgetBrief,
	type PatientBrief,
	patientBriefSchema,
	type VisitBrief,
	visitCompletedServiceSchema,
} from "./playbookTypes.js";

export const preAppointmentSummarySchema = z.object({
	patient: patientBriefSchema,
	visitType: z.enum(["primary", "repeat"]),
	isFirstVisit: z.boolean(),
	hasCriticalAlerts: z.boolean(),
	criticalAlerts: z.array(z.string()),
	lastVisit: z.object({
		visitDate: z.string(),
		doctorName: z.string(),
		diagnosis: z.string().optional(),
		completedServices: z.array(visitCompletedServiceSchema),
	}).nullable(),
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

export function generatePreAppointmentSummary(input: {
	patient: PatientBrief;
	lastVisit?: VisitBrief | undefined;
	pendingBudgets?: BudgetBrief[] | undefined;
	unpaidKopecks: number;
}): PreAppointmentSummary {
	const isFirstVisit = !input.lastVisit;
	const visitType: "primary" | "repeat" = isFirstVisit ? "primary" : "repeat";

	const criticalAlerts: string[] = [];
	if (input.patient.criticalAllergies?.length) criticalAlerts.push(...input.patient.criticalAllergies);
	if (input.patient.somaticRiskFactors?.length) criticalAlerts.push(...input.patient.somaticRiskFactors);
	if (input.patient.bloodCoagulationRisk) criticalAlerts.push("Риск кровотечения (антикоагулянты / гемостаз)");
	if (input.patient.anestheticToleranceRisk) criticalAlerts.push("Непереносимость местных анестетиков");
	const hasCriticalAlerts = criticalAlerts.length > 0;

	const agreedBudgetStages: PreAppointmentSummary["agreedBudgetStages"] = [];
	if (input.pendingBudgets) {
		for (const budget of input.pendingBudgets) {
			if (!budget.stages) continue;
			for (const stage of budget.stages) {
				if (stage.status === "accepted" || stage.status === "in_progress") {
					agreedBudgetStages.push({
						budgetId: budget.id, stageNumber: stage.stageNumber, title: stage.title,
						totalPriceKopecks: stage.totalPriceKopecks, totalPriceRub: formatKopecksRu(stage.totalPriceKopecks), status: stage.status,
					});
				}
			}
		}
	}

	const unpaidKopecks = input.unpaidKopecks;
	const unpaidRub = formatKopecksRu(unpaidKopecks);
	const hasOverdueDebt = unpaidKopecks > 0;
	const financialStatusRu = unpaidKopecks > 0
		? `Задолженность: ${unpaidRub}`
		: unpaidKopecks < 0
			? `Аванс на счете: ${formatKopecksRu(Math.abs(unpaidKopecks))}`
			: "Оплачено 100% (задолженности нет)";

	const lastVisitInfo: PreAppointmentSummary["lastVisit"] = input.lastVisit
		? {
			visitDate: input.lastVisit.visitDate, doctorName: input.lastVisit.doctorName,
			diagnosis: input.lastVisit.diagnosis, completedServices: input.lastVisit.completedServices ?? [],
		}
		: null;

	let chairsideTip = "Пациент готов к приему. Физиологическая норма активна по умолчанию.";
	if (hasCriticalAlerts) {
		chairsideTip = `[СТОП-ФАКТОР] Внимание: ${criticalAlerts.join("; ")}. Подобрать безопасный анестетик, контролировать гемостаз.`;
	} else if (isFirstVisit) {
		chairsideTip = "Первичный пациент: активна норма в 1 клик по Мандату 8e. Заполните зубную формулу и проведите фотопротокол.";
	} else if (agreedBudgetStages.length > 0 && agreedBudgetStages[0]) {
		const next = agreedBudgetStages[0];
		chairsideTip = `Согласован план лечения: этап №${next.stageNumber} «${next.title}» (${next.totalPriceRub}). Материалы подготовлены.`;
	} else if (input.lastVisit) {
		const serviceNames = input.lastVisit.completedServices.map((s) => s.name).join(", ");
		chairsideTip = `Повторный прием: предыдущий визит ${input.lastVisit.visitDate} (${input.lastVisit.doctorName}) — ${serviceNames || "осмотр"}. Оценить динамику заживления.`;
	}

	return preAppointmentSummarySchema.parse({
		patient: input.patient, visitType, isFirstVisit, hasCriticalAlerts, criticalAlerts,
		lastVisit: lastVisitInfo, agreedBudgetStages,
		financialSummary: { unpaidKopecks, unpaidRub, hasOverdueDebt, financialStatusRu },
		chairsideTip,
	});
}
