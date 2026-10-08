import { lazy, Suspense } from "react";
import { ClinicAnalyticsDashboard } from "../../components/analytics/ClinicAnalyticsDashboard";
import { CuratorDashboard } from "../../components/analytics/CuratorDashboard";
import { DirectorExecutiveDashboard } from "../../components/analytics/DirectorExecutiveDashboard";
import { LostPatientsPanel } from "../../components/analytics/LostPatientsPanel";
import { MarketingAttributionDashboard } from "../../components/analytics/MarketingAttributionDashboard";
import { RecallListPanel } from "../../components/patients/RecallListPanel";
import { FreedSlotsPanel } from "../../components/schedule/FreedSlotsPanel";
import type { AnalyticsSubDashboardsProps } from "./types";

const MarketingRoiModal = lazy(() =>
	import("../../components/analytics/MarketingRoiModal").then((module) => ({
		default: module.MarketingRoiModal,
	})),
);

const FinancialAnalyticsModal = lazy(() =>
	import("../../components/analytics/FinancialAnalyticsModal").then((module) => ({
		default: module.FinancialAnalyticsModal,
	})),
);

export function AnalyticsSubDashboards({
	analyticsSection,
	setAnalyticsSection,
	dateRange,
	setDateRange,
	isMarketingRoiOpen,
	setIsMarketingRoiOpen,
	isFinancialAnalyticsOpen,
	setIsFinancialAnalyticsOpen,
}: AnalyticsSubDashboardsProps) {
	return (
		<>
			{analyticsSection === "executive" && (
				<DirectorExecutiveDashboard
					hideHeaderToolbar={true}
					period={
						dateRange === "today"
							? "day"
							: dateRange === "quarter"
								? "quarter"
								: dateRange === "year"
									? "year"
									: "month"
					}
					onPeriodChange={(p) => {
						if (p === "day") setDateRange("today");
						else if (p === "month") setDateRange("month");
						else if (p === "quarter") setDateRange("quarter");
						else if (p === "year") setDateRange("year");
					}}
					onNavigateToSection={(s) => setAnalyticsSection(s as any)}
				/>
			)}

			{analyticsSection === "marketing" && (
				<div className="space-y-6">
					<MarketingAttributionDashboard />
				</div>
			)}

			{analyticsSection === "curators" && (
				<CuratorDashboard />
			)}

			{analyticsSection === "lost_patients" && (
				<div className="space-y-6">
					<LostPatientsPanel />
					<RecallListPanel />
				</div>
			)}

			{analyticsSection === "freed_slots" && (
				<FreedSlotsPanel />
			)}

			{analyticsSection === "clinic" && (
				<ClinicAnalyticsDashboard />
			)}

			{isMarketingRoiOpen && (
				<Suspense fallback={null}>
					<MarketingRoiModal
						isOpen={isMarketingRoiOpen}
						onClose={() => setIsMarketingRoiOpen(false)}
					/>
				</Suspense>
			)}

			{isFinancialAnalyticsOpen && (
				<Suspense fallback={null}>
					<FinancialAnalyticsModal
						isOpen={isFinancialAnalyticsOpen}
						onClose={() => setIsFinancialAnalyticsOpen(false)}
						initialPeriod={
							dateRange === "quarter"
								? "quarter"
								: dateRange === "year"
									? "year"
									: "month"
						}
					/>
				</Suspense>
			)}
		</>
	);
}
