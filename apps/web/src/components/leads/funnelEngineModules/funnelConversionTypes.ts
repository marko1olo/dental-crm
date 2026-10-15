/**
 * FUNNEL ENGINE MODULES: CONVERSION TYPES
 *
 * Layer 0: Типы данных для срезов когорт, временных окон, когортной доходимости
 * и юнит-экономики маркетинговых кампаний клиники.
 */

import type {
	CanonicalMarketingChannelKey,
	ChannelEfficiencyRating,
	ChannelFunnelMetric,
	ChannelSpendMap,
	FunnelAnalysisResult,
	FunnelLead,
	FunnelStageMetric,
	FunnelTimePeriod,
	LeadFunnelStageKey,
	MarketingMetricsSummary,
	SourceShowUpPrediction,
} from "./types.js";

export type {
	CanonicalMarketingChannelKey,
	ChannelEfficiencyRating,
	ChannelFunnelMetric,
	ChannelSpendMap,
	FunnelAnalysisResult,
	FunnelLead,
	FunnelStageMetric,
	FunnelTimePeriod,
	LeadFunnelStageKey,
	MarketingMetricsSummary,
	SourceShowUpPrediction,
};

/**
 * Временные окна когортного анализа лидов и пациентов
 */
export type FunnelCohortWindow = "day" | "week" | "month" | "quarter" | "all";

/**
 * Срез когортной доходимости пациентов
 */
export interface FunnelCohortSlice {
	readonly cohortId: string;
	readonly periodLabel: string;
	readonly startDate: string;
	readonly endDate: string;
	readonly totalLeads: number;
	readonly bookedCount: number;
	readonly showUpCount: number;
	readonly treatedCount: number;
	readonly paidCount: number;
	readonly totalRevenueRub: number;
	readonly showUpRatePercent: number;
	readonly repeatVisitsCount: number;
	readonly repeatRetentionRatePercent: number;
}

/**
 * Сводка окупаемости конкретной маркетинговой кампании / канала
 */
export interface FunnelCampaignRoiMetrics {
	readonly channelKey: CanonicalMarketingChannelKey;
	readonly spendRub: number;
	readonly revenueRub: number;
	readonly netProfitRub: number;
	readonly romiPercent: number;
	readonly cplRub: number;
	readonly cacRub: number;
	readonly rating: ChannelEfficiencyRating;
	readonly recommendation: string;
}
