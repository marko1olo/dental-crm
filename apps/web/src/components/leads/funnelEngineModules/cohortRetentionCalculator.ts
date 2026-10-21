/**
 * FUNNEL ENGINE MODULES: COHORT RETENTION CALCULATOR
 * Mandate 8b (<= 120 lines), Mandate 8s (Modular Architecture)
 */

import type {
	FunnelCohortSlice,
	FunnelCohortWindow,
} from "./funnelConversionTypes.js";
import { safePercent } from "./funnelRoiEngine.js";
import { detectLeadStage, hasLeadPassedStage } from "./leadStageDetector.js";
import type { FunnelLead } from "./types.js";

function getCohortKey(date: Date, window: FunnelCohortWindow): string {
	const year = date.getFullYear();
	if (window === "day") {
		const m = String(date.getMonth() + 1).padStart(2, "0");
		const d = String(date.getDate()).padStart(2, "0");
		return `${year}-${m}-${d}`;
	}
	if (window === "week") {
		const weekNum = Math.ceil(
			((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7,
		);
		return `${year}-W${String(weekNum).padStart(2, "0")}`;
	}
	if (window === "quarter") {
		return `${year}-Q${Math.floor(date.getMonth() / 3) + 1}`;
	}
	const month = String(date.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
}

/**
 * Чистый когортный расчет доходимости пациентов и повторных визитов
 */
export function calculateCohortRetention(
	leads: readonly FunnelLead[],
	window: FunnelCohortWindow = "month",
): FunnelCohortSlice[] {
	if (leads.length === 0) return [];

	const cohortsMap = new Map<string, FunnelLead[]>();
	for (const lead of leads) {
		const date = lead.createdAt ? new Date(lead.createdAt) : new Date();
		const cohortKey = getCohortKey(date, window);
		const list = cohortsMap.get(cohortKey) ?? [];
		list.push(lead);
		cohortsMap.set(cohortKey, list);
	}

	const result: FunnelCohortSlice[] = [];
	for (const [cohortId, cohortLeads] of cohortsMap.entries()) {
		let bookedCount = 0;
		let showUpCount = 0;
		let treatedCount = 0;
		let paidCount = 0;
		let totalRevenueRub = 0;
		let repeatVisitsCount = 0;

		for (const lead of cohortLeads) {
			const stage = detectLeadStage(lead);
			if (hasLeadPassedStage(stage, "consult_booked")) bookedCount += 1;
			if (hasLeadPassedStage(stage, "showed_up")) showUpCount += 1;
			if (hasLeadPassedStage(stage, "treatment_plan_accepted"))
				treatedCount += 1;
			if (hasLeadPassedStage(stage, "paid")) {
				paidCount += 1;
				const rev =
					typeof lead.actualRevenueRub === "number" && lead.actualRevenueRub > 0
						? lead.actualRevenueRub
						: (lead.paidAmountRub ?? 0);
				totalRevenueRub += rev;
			}
			if (
				(lead as any).followUpStatus === "closed_won" ||
				((lead as any).visitsCount && (lead as any).visitsCount > 1)
			) {
				repeatVisitsCount += 1;
			}
		}

		result.push({
			cohortId,
			periodLabel: `Когорта ${cohortId}`,
			startDate: cohortId,
			endDate: cohortId,
			totalLeads: cohortLeads.length,
			bookedCount,
			showUpCount,
			treatedCount,
			paidCount,
			totalRevenueRub,
			showUpRatePercent: safePercent(showUpCount, bookedCount),
			repeatVisitsCount,
			repeatRetentionRatePercent: safePercent(repeatVisitsCount, showUpCount),
		});
	}

	return result.sort((a, b) => a.cohortId.localeCompare(b.cohortId));
}
