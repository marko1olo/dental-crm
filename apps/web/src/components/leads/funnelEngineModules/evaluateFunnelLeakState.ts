/**
 * DENTE Dental CRM — Single Funnel Leak Stage Evaluator
 * Mandate 8b (<= 120 lines)
 */

import type { LeadFunnelStageKey } from "./types.js";

export interface FunnelLeakEvaluation {
	isLeak: boolean;
	severity: "critical" | "warning";
	reason: string;
	suggestedAction: string;
}

export function evaluateFunnelLeakState(
	stage: LeadFunnelStageKey,
	hoursStalled: number,
	maxIdleHoursNew: number,
	maxIdleHoursContacted: number,
): FunnelLeakEvaluation {
	if (stage === "new" && hoursStalled >= maxIdleHoursNew) {
		return {
			isLeak: true,
			severity: hoursStalled >= 12 ? "critical" : "warning",
			reason: `Новое обращение без первичного звонка уже ${hoursStalled} ч.`,
			suggestedAction: "Связаться с пациентом в течение 10 минут либо передать дежурному администратору.",
		};
	}
	if (stage === "contacted" && hoursStalled >= maxIdleHoursContacted) {
		return {
			isLeak: true,
			severity: hoursStalled >= 48 ? "critical" : "warning",
			reason: `Лид в работе без назначенной консультации более ${hoursStalled} ч.`,
			suggestedAction: "Повторный звонок администратора для согласования удобного времени визита.",
		};
	}
	if (stage === "treatment_plan_accepted" && hoursStalled >= 72) {
		return {
			isLeak: true,
			severity: "critical",
			reason: `План лечения согласован, но нет записи на приём и оплаты более ${hoursStalled} ч.`,
			suggestedAction: "Связаться куратору лечения для бронирования даты первого визита.",
		};
	}
	return { isLeak: false, severity: "warning", reason: "", suggestedAction: "" };
}
