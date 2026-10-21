/**
 * FUNNEL ENGINE MODULES: SPEED-TO-LEAD SLA TRACKER FACADE
 * Mandate 8b (<= 120 lines), Mandate 8s (Modular Architecture)
 */

import { safePercent } from "./funnelConversionCalculator.js";
import { evaluateLeadSla } from "./speedToLeadSlaEvaluator.js";
import type { FunnelLead, SpeedToLeadMetrics } from "./types.js";

export * from "./speedToLeadSlaEvaluator.js";

/**
 * Оценка рейтинга соблюдения регламента
 */
export function calculateAdminSlaRating(
	complianceRatePercent: number,
): "excellent" | "good" | "warning" | "critical" {
	if (complianceRatePercent >= 95) return "excellent";
	if (complianceRatePercent >= 85) return "good";
	if (complianceRatePercent >= 70) return "warning";
	return "critical";
}

/**
 * Комплексный расчет метрик скорости ответа и штрафов администраторов
 */
export function calculateSpeedToLeadMetrics(
	leads: readonly FunnelLead[],
	now: Date = new Date(),
): SpeedToLeadMetrics {
	if (leads.length === 0) {
		return {
			totalLeads: 0,
			freshCount: 0,
			warningCount: 0,
			breachedCount: 0,
			slaComplianceRatePercent: 100,
			averageFirstResponseMinutes: 0,
			medianFirstResponseMinutes: 0,
			totalPenaltyPoints: 0,
			adminPerformanceRating: "excellent",
			summaryText: "Нет обращений для анализа SLA.",
		};
	}

	let freshCount = 0;
	let warningCount = 0;
	let breachedCount = 0;
	let totalMinutes = 0;
	let totalPenaltyPoints = 0;
	const minutesList: number[] = [];

	for (const lead of leads) {
		const res = evaluateLeadSla(lead, now);
		if (res.status === "fresh") freshCount += 1;
		else if (res.status === "warning") warningCount += 1;
		else breachedCount += 1;

		totalMinutes += res.minutesElapsed;
		totalPenaltyPoints += res.penaltyPoints;
		minutesList.push(res.minutesElapsed);
	}

	const totalLeads = leads.length;
	const slaComplianceRatePercent = safePercent(freshCount, totalLeads);
	const averageFirstResponseMinutes = Math.round(totalMinutes / totalLeads);

	minutesList.sort((a, b) => a - b);
	const mid = Math.floor(minutesList.length / 2);
	const medianFirstResponseMinutes =
		minutesList.length % 2 === 0
			? Math.round(((minutesList[mid - 1] ?? 0) + (minutesList[mid] ?? 0)) / 2)
			: (minutesList[mid] ?? 0);

	const adminPerformanceRating = calculateAdminSlaRating(
		slaComplianceRatePercent,
	);

	const summaryText =
		breachedCount > 0
			? `Просрочен SLA у ${breachedCount} из ${totalLeads} обращений (${slaComplianceRatePercent}% в норме). Штрафных баллов: ${totalPenaltyPoints}.`
			: warningCount > 0
				? `${warningCount} обращений в зоне риска (15–60 мин). Общий SLA: ${slaComplianceRatePercent}%.`
				: `Отличная скорость реакции: 100% обращений обработаны в пределах регламента (15 мин).`;

	return {
		totalLeads,
		freshCount,
		warningCount,
		breachedCount,
		slaComplianceRatePercent,
		averageFirstResponseMinutes,
		medianFirstResponseMinutes,
		totalPenaltyPoints,
		adminPerformanceRating,
		summaryText,
	};
}
