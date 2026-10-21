/**
 * DENTE Dental CRM — Leads Leak & Revenue Loss Calculations
 */

import {
	detectLeadStage,
	extractLeadRevenueRub,
} from "./funnelConversionCalculator.js";
import {
	type CrmFunnelLeak,
	type CrmFunnelLeakReport,
	type FunnelLead,
	type LeadFunnelStageKey,
	normalizeMarketingChannel,
} from "./types.js";

export function extractPotentialLeadRevenueRub(
	lead: FunnelLead,
	fallbackTicketRub = 0,
): number {
	const expected = Number(lead.expectedRevenue);
	if (!Number.isNaN(expected) && expected > 0) return Math.round(expected);
	const base = extractLeadRevenueRub(lead);
	if (base > 0) return base;
	return fallbackTicketRub > 0 ? fallbackTicketRub : 0;
}

export function detectCrmFunnelLeaks(
	leads: readonly FunnelLead[],
	options: {
		maxIdleHoursNew?: number;
		maxIdleHoursContacted?: number;
		defaultEstimatedTicketRub?: number;
		now?: Date;
	} = {},
): CrmFunnelLeakReport {
	const {
		maxIdleHoursNew = 2,
		maxIdleHoursContacted = 24,
		defaultEstimatedTicketRub = 0,
		now = new Date(),
	} = options;
	const nowMs = now.getTime();
	const leaks: CrmFunnelLeak[] = [];
	const leaksByStage: Record<LeadFunnelStageKey, number> = {
		new: 0,
		contacted: 0,
		consult_booked: 0,
		showed_up: 0,
		treatment_plan_accepted: 0,
		paid: 0,
	};
	let totalLeakedRevenueRub = 0;
	let criticalLeaksCount = 0;
	let warningLeaksCount = 0;

	for (const lead of leads) {
		const stage = detectLeadStage(lead);
		if (stage === "paid") continue;
		const rawDate = lead.stageEnteredAt || lead.createdAt;
		const leadTime = rawDate ? new Date(rawDate).getTime() : NaN;
		if (Number.isNaN(leadTime)) continue;

		const hoursStalled = Math.max(
			0,
			Math.floor((nowMs - leadTime) / (3600 * 1000)),
		);
		const channelKey = normalizeMarketingChannel(lead.source);
		const potentialRevenueRub = extractPotentialLeadRevenueRub(
			lead,
			defaultEstimatedTicketRub,
		);

		let isLeak = false;
		let severity: "critical" | "warning" = "warning";
		let reason = "";
		let suggestedAction = "";

		if (stage === "new" && hoursStalled >= maxIdleHoursNew) {
			isLeak = true;
			severity = hoursStalled >= 12 ? "critical" : "warning";
			reason = `Новое обращение без первичного звонка уже ${hoursStalled} ч.`;
			suggestedAction =
				"Связаться с пациентом в течение 10 минут либо передать дежурному администратору.";
		} else if (stage === "contacted" && hoursStalled >= maxIdleHoursContacted) {
			isLeak = true;
			severity = hoursStalled >= 48 ? "critical" : "warning";
			reason = `Лид в работе без назначенной консультации более ${hoursStalled} ч.`;
			suggestedAction =
				"Повторный звонок администратора для согласования удобного времени визита.";
		} else if (stage === "treatment_plan_accepted" && hoursStalled >= 72) {
			isLeak = true;
			severity = "critical";
			reason = `План лечения согласован, но нет записи на приём и оплаты более ${hoursStalled} ч.`;
			suggestedAction =
				"Связаться куратору лечения для бронирования даты первого визита.";
		}

		if (isLeak) {
			leaksByStage[stage] += 1;
			totalLeakedRevenueRub += potentialRevenueRub;
			if (severity === "critical") criticalLeaksCount += 1;
			else warningLeaksCount += 1;
			leaks.push({
				leadId: lead.id ?? null,
				leadName: lead.name || "Лид без имени",
				phone: lead.phone ?? null,
				currentStage: stage,
				source: lead.source || "Не указан",
				channelKey,
				hoursStalled,
				potentialRevenueRub,
				severity,
				reason,
				suggestedAction,
			});
		}
	}

	const totalLeakedCount = leaks.length;
	const summaryText =
		totalLeakedCount > 0
			? `Обнаружено ${totalLeakedCount} зависших лидов (${criticalLeaksCount} критических). Потенциальная утечка: ${totalLeakedRevenueRub.toLocaleString("ru-RU")} ₽.`
			: "Утечек воронки не обнаружено. Все лиды в активной работе.";

	return {
		totalLeakedCount,
		totalLeakedRevenueRub,
		criticalLeaksCount,
		warningLeaksCount,
		leaksByStage,
		leaks,
		summaryText,
	};
}

export function calculateAdminLeakImpact(leaks: readonly CrmFunnelLeak[]): {
	totalLossRub: number;
	criticalCount: number;
	stageBreakdown: Record<LeadFunnelStageKey, number>;
} {
	const stageBreakdown: Record<LeadFunnelStageKey, number> = {
		new: 0,
		contacted: 0,
		consult_booked: 0,
		showed_up: 0,
		treatment_plan_accepted: 0,
		paid: 0,
	};
	let totalLossRub = 0;
	let criticalCount = 0;
	for (const leak of leaks) {
		totalLossRub += leak.potentialRevenueRub;
		if (leak.severity === "critical") criticalCount += 1;
		stageBreakdown[leak.currentStage] =
			(stageBreakdown[leak.currentStage] ?? 0) + 1;
	}
	return { totalLossRub, criticalCount, stageBreakdown };
}
