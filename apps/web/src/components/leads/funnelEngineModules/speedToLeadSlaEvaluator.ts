/**
 * FUNNEL ENGINE MODULES: SPEED-TO-LEAD SLA EVALUATOR
 * Mandate 8b (<= 120 lines), Mandate 8s (Modular Architecture)
 */

import type { FunnelLead, LeadSlaCheckResult, LeadSlaStatus } from "./types.js";

/**
 * Сводка просроченных регламентов ответа (Speed-to-Lead SLA)
 */
export function formatLeadSlaBreachSummary(
	leads: readonly FunnelLead[],
	now: Date = new Date(),
): {
	breachedCount: number;
	warningCount: number;
	freshCount: number;
	summaryText: string;
} {
	let breachedCount = 0;
	let warningCount = 0;
	let freshCount = 0;
	const nowTime = now.getTime();

	for (const lead of leads) {
		const rawDate = lead.stageEnteredAt || lead.createdAt;
		const leadTime = rawDate ? new Date(rawDate).getTime() : NaN;
		if (Number.isNaN(leadTime)) {
			freshCount += 1;
			continue;
		}

		const minutesElapsed = Math.max(
			0,
			Math.floor((nowTime - leadTime) / 60000),
		);
		if (minutesElapsed < 15) freshCount += 1;
		else if (minutesElapsed < 60) warningCount += 1;
		else breachedCount += 1;
	}

	const summaryText =
		breachedCount > 0
			? `Внимание: просрочен регламент ответа у ${breachedCount} обращений! Требуется реакция администратора.`
			: warningCount > 0
				? `Внимание: ${warningCount} обращений ожидают ответа от 15 до 60 минут.`
				: "Все обращения обработаны вовремя (SLA в норме).";

	return { breachedCount, warningCount, freshCount, summaryText };
}

/**
 * Расчет времени ожидания первого ответа администратора в минутах
 */
export function calculateFirstResponseTimeMinutes(
	lead: FunnelLead,
	now: Date = new Date(),
): number {
	const rawDate = lead.stageEnteredAt || lead.createdAt;
	if (!rawDate) return 0;
	const createdTime = new Date(rawDate).getTime();
	if (Number.isNaN(createdTime)) return 0;
	return Math.max(0, Math.floor((now.getTime() - createdTime) / 60000));
}

/**
 * Проверка превышения порога SLA (15 минут) для обращения
 */
export function isLeadSlaBreached(
	lead: FunnelLead,
	now: Date = new Date(),
): boolean {
	return calculateFirstResponseTimeMinutes(lead, now) >= 15;
}

/**
 * Определение категории SLA для лида ('fresh' | 'warning' | 'breached')
 */
export function getLeadSlaStatus(
	lead: FunnelLead,
	now: Date = new Date(),
): LeadSlaStatus {
	const minutes = calculateFirstResponseTimeMinutes(lead, now);
	if (minutes < 15) return "fresh";
	if (minutes < 60) return "warning";
	return "breached";
}

/**
 * Расчет штрафных баллов за задержку первого ответа
 */
export function calculateSlaPenaltyPoints(minutesElapsed: number): number {
	if (minutesElapsed < 15) return 0;
	if (minutesElapsed < 30) return 1;
	if (minutesElapsed < 60) return 3;
	const extraHours = Math.floor((minutesElapsed - 60) / 60);
	return 5 + Math.min(10, extraHours);
}

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
 * Проверка отдельного лида по шкале SLA с расчетом штрафов
 */
export function evaluateLeadSla(
	lead: FunnelLead,
	now: Date = new Date(),
): LeadSlaCheckResult {
	const minutesElapsed = calculateFirstResponseTimeMinutes(lead, now);
	const status = getLeadSlaStatus(lead, now);
	const isBreached = minutesElapsed >= 15;
	const penaltyPoints = calculateSlaPenaltyPoints(minutesElapsed);
	return { leadId: lead.id, status, minutesElapsed, isBreached, penaltyPoints };
}
