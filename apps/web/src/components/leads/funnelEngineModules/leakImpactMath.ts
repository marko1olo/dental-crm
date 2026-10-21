/**
 * DENTE Dental CRM — Leads Leak Impact Math
 * Mandate 8b (<= 120 lines)
 */

import { extractLeadRevenueRub } from "./funnelConversionCalculator.js";
import type { CrmFunnelLeak, FunnelLead, LeadFunnelStageKey } from "./types.js";

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
