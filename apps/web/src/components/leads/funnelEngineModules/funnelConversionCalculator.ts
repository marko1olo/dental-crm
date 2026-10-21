/**
 * FUNNEL ENGINE MODULES: CONVERSION CALCULATOR (FACADE)
 * Mandate 8b (<= 120 lines), Mandate 8s (Modular Architecture)
 */

import {
	detectLeadStage,
	filterLeadsByPeriod,
	hasLeadPassedStage,
} from "./funnelCohortCalculator.js";
import {
	buildChannelFunnelMetric,
	extractLeadRevenueRub,
	getDefaultChannelSpendMap,
} from "./funnelRoiEngine.js";
import {
	buildStagesMetrics,
	buildSummaryMetrics,
} from "./funnelStagesCalculator.js";
import {
	type CanonicalMarketingChannelKey,
	type ChannelFunnelMetric,
	type ChannelSpendMap,
	FUNNEL_STAGES,
	type FunnelAnalysisResult,
	type FunnelLead,
	type FunnelTimePeriod,
	type LeadFunnelStageKey,
	MARKETING_CHANNELS,
	normalizeMarketingChannel,
} from "./types.js";

export * from "./funnelCohortCalculator.js";
export * from "./funnelConversionTypes.js";
export * from "./funnelRoiEngine.js";
export * from "./funnelStagesCalculator.js";

export function calculateFunnelAnalysis(
	rawLeads: readonly FunnelLead[],
	period: FunnelTimePeriod = "all",
	customSpendMap?: ChannelSpendMap,
	referenceDate: Date = new Date(),
): FunnelAnalysisResult {
	const leads = filterLeadsByPeriod(rawLeads, period, referenceDate);
	const defaultSpends = getDefaultChannelSpendMap();
	const channelSpends: Record<CanonicalMarketingChannelKey, number> = {
		...defaultSpends,
		...(customSpendMap ?? {}),
	};

	const leadsWithStages = leads.map((lead) => ({
		lead,
		stage: detectLeadStage(lead),
		channel: normalizeMarketingChannel(lead.source),
		revenueRub: extractLeadRevenueRub(lead),
	}));

	const stageCounts: Record<LeadFunnelStageKey, number> = {
		new: 0,
		contacted: 0,
		consult_booked: 0,
		showed_up: 0,
		treatment_plan_accepted: 0,
		paid: 0,
	};
	for (const item of leadsWithStages) {
		for (const stageCfg of FUNNEL_STAGES) {
			if (hasLeadPassedStage(item.stage, stageCfg.key)) {
				stageCounts[stageCfg.key] += 1;
			}
		}
	}

	const totalLeadsCount = stageCounts.new;
	const stages = buildStagesMetrics(stageCounts, totalLeadsCount);

	let totalMarketingSpendRub = 0;
	for (const key of Object.keys(
		channelSpends,
	) as CanonicalMarketingChannelKey[]) {
		totalMarketingSpendRub += channelSpends[key];
	}

	let totalRevenueRub = 0;
	for (const item of leadsWithStages) {
		if (hasLeadPassedStage(item.stage, "paid"))
			totalRevenueRub += item.revenueRub;
	}

	const summary = buildSummaryMetrics({
		stageCounts,
		totalLeadsCount,
		totalRevenueRub,
		totalMarketingSpendRub,
	});

	const channels: ChannelFunnelMetric[] = MARKETING_CHANNELS.map((ch) => {
		const channelLeads = leadsWithStages.filter((l) => l.channel === ch.key);
		const spendRub = channelSpends[ch.key] ?? 0;
		let leadsCount = 0;
		let bookedCount = 0;
		let showUpCount = 0;
		let agreedCount = 0;
		let paidCount = 0;
		let revenueRub = 0;

		for (const item of channelLeads) {
			leadsCount += 1;
			if (hasLeadPassedStage(item.stage, "consult_booked")) bookedCount += 1;
			if (hasLeadPassedStage(item.stage, "showed_up")) showUpCount += 1;
			if (hasLeadPassedStage(item.stage, "treatment_plan_accepted"))
				agreedCount += 1;
			if (hasLeadPassedStage(item.stage, "paid")) {
				paidCount += 1;
				revenueRub += item.revenueRub;
			}
		}

		return buildChannelFunnelMetric({
			channelKey: ch.key,
			channelLabel: ch.label,
			color: ch.color,
			spendRub,
			leadsCount,
			bookedCount,
			showUpCount,
			agreedCount,
			paidCount,
			revenueRub,
		});
	});

	return {
		period,
		filteredLeadsCount: leads.length,
		stages,
		summary,
		channels,
	};
}
