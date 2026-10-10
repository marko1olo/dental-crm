/**
 * FUNNEL ENGINE MODULES: SPEED-TO-LEAD SLA TRACKER
 *
 * Трекер времени первого ответа администратора, контроль соблюдения
 * клинического регламента SLA 15 минут, система штрафных баллов и рейтингов.
 *
 * СТАНДАРТ КАЧЕСТВА ДЕНТЕ:
 * - < 15 минут: норма (зеленый статус).
 * - 15–60 минут: предупреждение (желтый статус).
 * - > 60 минут: критическая просрочка (красный статус, срыв лида).
 */

import { safePercent } from "./funnelConversionCalculator.js";
import type {
	FunnelLead,
	LeadSlaStatus,
	LeadSlaCheckResult,
	SpeedToLeadMetrics,
} from "./types.js";

// ---------------------------------------------------------------------------
// 1. БАЗОВАЯ СВОДКА РЕГЛАМЕНТА SLA (ОБРАТНАЯ СОВМЕСТИМОСТЬ)
// ---------------------------------------------------------------------------

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

		const minutesElapsed = Math.max(0, Math.floor((nowTime - leadTime) / 60000));
		if (minutesElapsed < 15) {
			freshCount += 1;
		} else if (minutesElapsed < 60) {
			warningCount += 1;
		} else {
			breachedCount += 1;
		}
	}

	const summaryText =
		breachedCount > 0
			? `Внимание: просрочен регламент ответа у ${breachedCount} обращений! Требуется реакция администратора.`
			: warningCount > 0
				? `Внимание: ${warningCount} обращений ожидают ответа от 15 до 60 минут.`
				: "Все обращения обработаны вовремя (SLA в норме).";

	return {
		breachedCount,
		warningCount,
		freshCount,
		summaryText,
	};
}

// ---------------------------------------------------------------------------
// 2. ДЕТАЛЬНЫЙ ТРЕКИНГ ВРЕМЕНИ И СТАТУСА SLA
// ---------------------------------------------------------------------------

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

	const nowTime = now.getTime();
	return Math.max(0, Math.floor((nowTime - createdTime) / 60000));
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
 * Расчет штрафных баллов за задержку первого ответа:
 * - 0–14 мин: 0 баллов
 * - 15–29 мин: 1 балл
 * - 30–59 мин: 3 балла
 * - 60+ мин: 5 баллов + 1 балл за каждый полный час свыше
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

	return {
		leadId: lead.id,
		status,
		minutesElapsed,
		isBreached,
		penaltyPoints,
	};
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

	const adminPerformanceRating = calculateAdminSlaRating(slaComplianceRatePercent);

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
