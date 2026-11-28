/**
 * apps/web/src/components/analytics/__tests__/leadsCollapsiblePanels.test.ts
 * Mandate 8b: File <= 120 lines. Collapsible leads analytics panels test.
 */

import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { FunnelChannelsTableSection } from "../../leads/FunnelChannelsTableSection";
import { FunnelWaterfallSection } from "../../leads/FunnelWaterfallSection";
import type {
	ChannelFunnelMetric,
	FunnelStageMetric,
	MarketingMetricsSummary,
} from "../../leads/leadsFunnelTypes";

const SAMPLE_STAGES: FunnelStageMetric[] = [
	{
		key: "new",
		index: 0,
		label: "Новые обращения",
		shortLabel: "Лид получен",
		color: "var(--teal)",
		badgeColor: "rgba(15, 118, 110, 0.15)",
		count: 20,
		dropCount: 5,
		dropRatePercent: 25,
		conversionFromFirstPercent: 100,
		conversionFromPrevPercent: 100,
	},
	{
		key: "consult_booked",
		index: 2,
		label: "Записаны на прием",
		shortLabel: "Записан",
		color: "var(--primary)",
		badgeColor: "rgba(15, 118, 110, 0.15)",
		count: 15,
		dropCount: 0,
		dropRatePercent: 0,
		conversionFromFirstPercent: 75,
		conversionFromPrevPercent: 75,
	},
];

const SAMPLE_SUMMARY: MarketingMetricsSummary = {
	totalLeads: 20,
	contactedLeads: 18,
	bookedLeads: 15,
	showUpLeads: 12,
	agreedPlanLeads: 9,
	paidLeads: 8,
	showUpRatePercent: 80,
	bookingRatePercent: 75,
	planAcceptanceRatePercent: 75,
	overallConversionPercent: 40,
	totalMarketingSpendRub: 40000,
	totalRevenueRub: 240000,
	totalRevenueKopecks: 24000000,
	avgBillRub: 30000,
	netMarketingProfitRub: 200000,
	cplRub: 2000,
	cpsRub: 3333,
	cacRub: 5000,
	romiPercent: 500,
	ltvEstimatedRub: 60000,
	ltvToCacRatio: 12,
};

const SAMPLE_CHANNELS: ChannelFunnelMetric[] = [
	{
		channelKey: "yandex_direct",
		channelLabel: "Яндекс Директ",
		color: "#0f766e",
		spendRub: 40000,
		leadsCount: 20,
		bookedCount: 15,
		showUpCount: 12,
		agreedCount: 9,
		paidCount: 8,
		conversionRatePercent: 40,
		showUpRatePercent: 80,
		revenueRub: 240000,
		avgBillRub: 30000,
		cplRub: 2000,
		cacRub: 5000,
		romiPercent: 500,
		efficiencyRating: "excellent",
		recommendation: "Масштабировать кампанию",
	},
];

test("FunnelWaterfallSection & FunnelChannelsTableSection render collapsed strips and expanded panels by isOpen prop", () => {
	const waterfallCollapsed = renderToString(
		React.createElement(FunnelWaterfallSection, {
			stages: SAMPLE_STAGES,
			totalLeads: 20,
			isOpen: false,
			onToggle: () => {},
		}),
	);
	assert.ok(waterfallCollapsed.includes('data-testid="toggle-leads-waterfall-btn"'));
	assert.ok(waterfallCollapsed.includes('data-testid="leads-waterfall-compact-strip"'));
	assert.equal(waterfallCollapsed.includes('data-testid="leads-waterfall-expanded"'), false);

	const waterfallExpanded = renderToString(
		React.createElement(FunnelWaterfallSection, {
			stages: SAMPLE_STAGES,
			totalLeads: 20,
			isOpen: true,
			onToggle: () => {},
		}),
	);
	assert.ok(waterfallExpanded.includes('data-testid="leads-waterfall-expanded"'));
	assert.equal(waterfallExpanded.includes('data-testid="leads-waterfall-compact-strip"'), false);

	const channelsCollapsed = renderToString(
		React.createElement(FunnelChannelsTableSection, {
			channels: SAMPLE_CHANNELS,
			summary: SAMPLE_SUMMARY,
			isOpen: false,
			onToggle: () => {},
		}),
	);
	assert.ok(channelsCollapsed.includes('data-testid="toggle-channels-table-btn"'));
	assert.ok(channelsCollapsed.includes('data-testid="channels-compact-strip"'));
	assert.equal(channelsCollapsed.includes('data-testid="channels-table-expanded"'), false);

	const channelsExpanded = renderToString(
		React.createElement(FunnelChannelsTableSection, {
			channels: SAMPLE_CHANNELS,
			summary: SAMPLE_SUMMARY,
			isOpen: true,
			onToggle: () => {},
		}),
	);
	assert.ok(channelsExpanded.includes('data-testid="channels-table-expanded"'));
	assert.equal(channelsExpanded.includes('data-testid="channels-compact-strip"'), false);
});
