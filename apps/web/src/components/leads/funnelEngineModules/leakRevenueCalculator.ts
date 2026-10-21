/**
 * DENTE Dental CRM — Leads Leak & Revenue Loss Calculations
 */

import { evaluateFunnelLeakState } from "./evaluateFunnelLeakState.js";
import { detectLeadStage } from "./funnelConversionCalculator.js";
import {
	calculateAdminLeakImpact,
	extractPotentialLeadRevenueRub,
} from "./leakImpactMath.js";
import {
	type CrmFunnelLeak,
	type CrmFunnelLeakReport,
	type FunnelLead,
	type LeadFunnelStageKey,
	normalizeMarketingChannel,
} from "./types.js";

export { calculateAdminLeakImpact, extractPotentialLeadRevenueRub };

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

		const evalResult = evaluateFunnelLeakState(
			stage,
			hoursStalled,
			maxIdleHoursNew,
			maxIdleHoursContacted,
		);

		if (evalResult.isLeak) {
			leaksByStage[stage] += 1;
			totalLeakedRevenueRub += potentialRevenueRub;
			if (evalResult.severity === "critical") criticalLeaksCount += 1;
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
				severity: evalResult.severity,
				reason: evalResult.reason,
				suggestedAction: evalResult.suggestedAction,
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


