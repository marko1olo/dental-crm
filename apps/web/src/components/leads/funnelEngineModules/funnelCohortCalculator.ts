/**
 * FUNNEL ENGINE MODULES: COHORT CALCULATOR FACADE & SHOW-UP PREDICTOR
 * Mandate 8b (<= 120 lines), Mandate 8s (Modular Architecture)
 */

import { safePercent } from "./funnelRoiEngine.js";
import { detectLeadStage, hasLeadPassedStage } from "./leadStageDetector.js";
import {
	type FunnelLead,
	MARKETING_CHANNELS,
	normalizeMarketingChannel,
	type SourceShowUpPrediction,
} from "./types.js";

export * from "./cohortRetentionCalculator.js";
export * from "./leadStageDetector.js";

/**
 * Прогнозирование доходимости по рекламным источникам на основе исторических конверсий.
 */
export function predictShowUpBySource(
	historicalLeads: readonly FunnelLead[],
	currentBookedLeads: readonly FunnelLead[],
): SourceShowUpPrediction[] {
	return MARKETING_CHANNELS.map((ch) => {
		const histChannelLeads = historicalLeads.filter(
			(l) => normalizeMarketingChannel(l.source) === ch.key,
		);

		let histBooked = 0;
		let histShowUp = 0;

		for (const l of histChannelLeads) {
			const stage = detectLeadStage(l);
			if (hasLeadPassedStage(stage, "consult_booked")) histBooked += 1;
			if (hasLeadPassedStage(stage, "showed_up")) histShowUp += 1;
		}

		const currentBookedForChannel = currentBookedLeads.filter(
			(l) => normalizeMarketingChannel(l.source) === ch.key,
		).length;

		const historicalRate =
			histBooked > 0 ? safePercent(histShowUp, histBooked) : 0;
		const predictedShowUpCount = Math.round(
			(currentBookedForChannel * historicalRate) / 100,
		);

		let confidence: "high" | "medium" | "low" = "low";
		if (histBooked >= 20) confidence = "high";
		else if (histBooked >= 5) confidence = "medium";

		return {
			channelKey: ch.key,
			channelLabel: ch.label,
			bookedCount: currentBookedForChannel,
			predictedShowUpCount,
			predictedShowUpRatePercent: historicalRate,
			confidence,
		};
	});
}
