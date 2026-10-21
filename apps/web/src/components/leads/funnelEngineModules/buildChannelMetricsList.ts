/**
 * DENTE Dental CRM — Build Channel Funnel Metrics List
 * Mandate 8b (<= 120 lines)
 */

import { hasLeadPassedStage } from "./funnelCohortCalculator.js";
import { buildChannelFunnelMetric } from "./funnelRoiEngine.js";
import {
	type CanonicalMarketingChannelKey,
	type ChannelFunnelMetric,
	type LeadFunnelStageKey,
	MARKETING_CHANNELS,
} from "./types.js";

interface LeadStageItem {
	stage: LeadFunnelStageKey;
	channel: CanonicalMarketingChannelKey;
	revenueRub: number;
}

export function buildChannelMetricsList(
	leadsWithStages: LeadStageItem[],
	channelSpends: Record<CanonicalMarketingChannelKey, number>,
): ChannelFunnelMetric[] {
	return MARKETING_CHANNELS.map((ch) => {
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
			if (hasLeadPassedStage(item.stage, "treatment_plan_accepted")) agreedCount += 1;
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
}
