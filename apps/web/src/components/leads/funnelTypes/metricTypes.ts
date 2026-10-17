/**
 * DENTE Dental CRM — Leads Funnel Metric Types
 */

import type { CanonicalMarketingChannelKey } from "./marketingChannelTypes";
import type { FunnelTimePeriod, LeadFunnelStageKey } from "./funnelStageTypes";

export interface FunnelStageMetric {
	readonly key: LeadFunnelStageKey;
	readonly index: number;
	readonly label: string;
	readonly shortLabel: string;
	readonly color: string;
	readonly badgeColor: string;
	readonly count: number;
	readonly dropCount: number;
	readonly dropRatePercent: number;
	readonly conversionFromFirstPercent: number;
	readonly conversionFromPrevPercent: number;
}

export interface MarketingMetricsSummary {
	readonly totalLeads: number;
	readonly contactedLeads: number;
	readonly bookedLeads: number;
	readonly showUpLeads: number;
	readonly agreedPlanLeads: number;
	readonly paidLeads: number;
	readonly showUpRatePercent: number;
	readonly bookingRatePercent: number;
	readonly planAcceptanceRatePercent: number;
	readonly overallConversionPercent: number;
	readonly totalMarketingSpendRub: number;
	readonly totalRevenueRub: number;
	readonly totalRevenueKopecks: number;
	readonly avgBillRub: number;
	readonly netMarketingProfitRub: number;
	readonly cplRub: number;
	readonly cpsRub: number;
	readonly cacRub: number;
	readonly romiPercent: number;
	readonly ltvEstimatedRub: number;
	readonly ltvToCacRatio: number;
}

export type ChannelEfficiencyRating =
	| "excellent"
	| "good"
	| "warning"
	| "critical"
	| "organic";

export interface ChannelFunnelMetric {
	readonly channelKey: CanonicalMarketingChannelKey;
	readonly channelLabel: string;
	readonly color: string;
	readonly spendRub: number;
	readonly leadsCount: number;
	readonly bookedCount: number;
	readonly showUpCount: number;
	readonly agreedCount: number;
	readonly paidCount: number;
	readonly conversionRatePercent: number;
	readonly showUpRatePercent: number;
	readonly revenueRub: number;
	readonly avgBillRub: number;
	readonly cplRub: number;
	readonly cacRub: number;
	readonly romiPercent: number;
	readonly efficiencyRating: ChannelEfficiencyRating;
	readonly recommendation: string;
}

export interface FunnelAnalysisResult {
	readonly period: FunnelTimePeriod;
	readonly filteredLeadsCount: number;
	readonly stages: readonly FunnelStageMetric[];
	readonly summary: MarketingMetricsSummary;
	readonly channels: readonly ChannelFunnelMetric[];
}

export type ChannelSpendMap = Partial<
	Record<CanonicalMarketingChannelKey | string, number>
>;
