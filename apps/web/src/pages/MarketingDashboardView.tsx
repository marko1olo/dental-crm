/**
 * MarketingDashboardView.tsx — Comprehensive 2-Column Dental Marketing & Funnel Analytics Dashboard.
 *
 * Mandate 8b (Strict <= 120 lines per file)
 * Mandate 8c (Visual Quality & Design System Tokens)
 * Mandate 8d (Quiet Telemetry & 0 Carnival Colors)
 * Mandate 8e & 8n (Solo Doctor Autonomy & Zero Dead-Ends)
 */

import React from "react";
import {
	type MarketingDashboardViewProps,
	MarketingChannelAttributionTable,
	MarketingDashboardHeader,
	MarketingDashboardModals,
	MarketingFunnelStagesChart,
	MarketingKpiCardsGrid,
	MarketingRoiAndSegmentsPanel,
	useMarketingDashboardData,
} from "./marketingDashboardModules";
import "./MarketingDashboardView.css";

export type { MarketingDashboardViewProps };

export function MarketingDashboardView({
	clinicName = "Стоматология ДЕНТЕ",
	onNavigateToRecalls,
	embedded = false,
}: MarketingDashboardViewProps) {
	const {
		period,
		setPeriod,
		summary,
		channels,
		stages,
		intakeSplit,
		topChannel,
		handleExportCsv,
		leads,
		isFullAnalyticsOpen,
		setIsFullAnalyticsOpen,
		isLeakDetectorOpen,
		setIsLeakDetectorOpen,
		isNewPromoModalOpen,
		setIsNewPromoModalOpen,
	} = useMarketingDashboardData();

	return (
		<section
			className={`marketing-dashboard-page ${embedded ? "marketing-dashboard-page--embedded" : ""}`}
			data-testid="marketing-dashboard-page"
			aria-label="Маркетинговая аналитика и воронка"
		>
			<MarketingDashboardHeader
				embedded={embedded}
				period={period}
				onPeriodChange={setPeriod}
				onExportCsv={handleExportCsv}
				onOpenNewPromoModal={() => setIsNewPromoModalOpen(true)}
			/>

			<MarketingKpiCardsGrid summary={summary} />

			<div className="marketing-dashboard-grid">
				<div className="marketing-col">
					<MarketingChannelAttributionTable channels={channels} />
					<MarketingFunnelStagesChart
						stages={stages}
						intakeSplit={intakeSplit}
						onOpenDetailedAudit={() => setIsFullAnalyticsOpen(true)}
					/>
				</div>

				<MarketingRoiAndSegmentsPanel
					summary={summary}
					topChannel={topChannel}
					onOpenLeakDetector={() => setIsLeakDetectorOpen(true)}
					onNavigateToRecalls={onNavigateToRecalls}
				/>
			</div>

			<MarketingDashboardModals
				leads={leads}
				isFullAnalyticsOpen={isFullAnalyticsOpen}
				onCloseFullAnalytics={() => setIsFullAnalyticsOpen(false)}
				isLeakDetectorOpen={isLeakDetectorOpen}
				onCloseLeakDetector={() => setIsLeakDetectorOpen(false)}
				isNewPromoModalOpen={isNewPromoModalOpen}
				onCloseNewPromoModal={() => setIsNewPromoModalOpen(false)}
			/>
		</section>
	);
}

export default MarketingDashboardView;
