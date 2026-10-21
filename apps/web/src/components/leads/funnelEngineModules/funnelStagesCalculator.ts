/**
 * FUNNEL ENGINE MODULES: STAGES & SUMMARY METRICS BUILDER
 * Mandate 8b (<= 120 lines), Mandate 8s (Modular Architecture)
 */

import { safeDivide, safePercent } from "./funnelRoiEngine.js";
import {
	FUNNEL_STAGES,
	type FunnelStageMetric,
	type LeadFunnelStageKey,
	type MarketingMetricsSummary,
} from "./types.js";

export function buildStagesMetrics(
	stageCounts: Record<LeadFunnelStageKey, number>,
	totalLeadsCount: number,
): FunnelStageMetric[] {
	return FUNNEL_STAGES.map((cfg, idx) => {
		const count = stageCounts[cfg.key] ?? 0;
		const nextStageCfg = FUNNEL_STAGES[idx + 1];
		const nextCount = nextStageCfg ? (stageCounts[nextStageCfg.key] ?? 0) : 0;
		const dropCount =
			idx < FUNNEL_STAGES.length - 1 ? Math.max(0, count - nextCount) : 0;
		const dropRatePercent = safePercent(dropCount, count);

		const prevStageCfg = idx > 0 ? FUNNEL_STAGES[idx - 1] : undefined;
		const prevCount = prevStageCfg
			? (stageCounts[prevStageCfg.key] ?? count)
			: count;
		const conversionFromPrevPercent =
			idx === 0 ? 100 : safePercent(count, prevCount);
		const conversionFromFirstPercent = safePercent(count, totalLeadsCount);

		return {
			key: cfg.key,
			index: cfg.index,
			label: cfg.label,
			shortLabel: cfg.shortLabel,
			color: cfg.color,
			badgeColor: cfg.badgeColor,
			count,
			dropCount,
			dropRatePercent,
			conversionFromFirstPercent,
			conversionFromPrevPercent,
		};
	});
}

export function buildSummaryMetrics(params: {
	stageCounts: Record<LeadFunnelStageKey, number>;
	totalLeadsCount: number;
	totalRevenueRub: number;
	totalMarketingSpendRub: number;
}): MarketingMetricsSummary {
	const {
		stageCounts,
		totalLeadsCount,
		totalRevenueRub,
		totalMarketingSpendRub,
	} = params;
	const paidLeads = stageCounts.paid;
	const bookedLeads = stageCounts.consult_booked;
	const showUpLeads = stageCounts.showed_up;
	const contactedLeads = stageCounts.contacted;
	const agreedPlanLeads = stageCounts.treatment_plan_accepted;

	const showUpRatePercent = safePercent(showUpLeads, bookedLeads);
	const bookingRatePercent = safePercent(bookedLeads, totalLeadsCount);
	const planAcceptanceRatePercent = safePercent(agreedPlanLeads, showUpLeads);
	const overallConversionPercent = safePercent(paidLeads, totalLeadsCount);

	const avgBillRub = safeDivide(totalRevenueRub, paidLeads);
	const cplRub = safeDivide(totalMarketingSpendRub, totalLeadsCount);
	const cpsRub = safeDivide(totalMarketingSpendRub, showUpLeads);
	const cacRub = safeDivide(totalMarketingSpendRub, paidLeads);

	const netMarketingProfitRub = totalRevenueRub - totalMarketingSpendRub;
	const romiPercent =
		totalMarketingSpendRub > 0
			? safePercent(netMarketingProfitRub, totalMarketingSpendRub)
			: 0;
	const ltvEstimatedRub = avgBillRub;
	const ltvToCacRatio = cacRub > 0 ? safeDivide(ltvEstimatedRub, cacRub, 1) : 0;

	return {
		totalLeads: totalLeadsCount,
		contactedLeads,
		bookedLeads,
		showUpLeads,
		agreedPlanLeads,
		paidLeads,
		showUpRatePercent,
		bookingRatePercent,
		planAcceptanceRatePercent,
		overallConversionPercent,
		totalMarketingSpendRub,
		totalRevenueRub,
		totalRevenueKopecks: totalRevenueRub * 100,
		avgBillRub,
		netMarketingProfitRub,
		cplRub,
		cpsRub,
		cacRub,
		romiPercent,
		ltvEstimatedRub,
		ltvToCacRatio,
	};
}
