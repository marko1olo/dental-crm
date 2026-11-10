import { lazy, Suspense } from "react";
import { CuratorDashboard } from "../../components/analytics/CuratorDashboard";
import { ExecutiveDashboard } from "../../components/analytics/ExecutiveDashboard";
import { LostPatientsPanel } from "../../components/analytics/LostPatientsPanel";
import { MarketingAttributionDashboard } from "../../components/analytics/MarketingAttributionDashboard";
import { RecallListPanel } from "../../components/patients/RecallListPanel";
import { FreedSlotsPanel } from "../../components/schedule/FreedSlotsPanel";
import type { AnalyticsSubDashboardsProps } from "./types";

const MarketingDashboardView = lazy(() =>
	import("../MarketingDashboardView").then((module) => ({
		default: module.MarketingDashboardView,
	})),
);

const ManagerialPnlDashboardModal = lazy(() =>
	import("../../components/finance/pnl/ManagerialPnlDashboardModal").then((module) => ({
		default: module.ManagerialPnlDashboardModal,
	})),
);

const ManagerReportsPanel = lazy(() =>
	import("../../components/reports/ManagerReportsPanel").then((module) => ({
		default: module.ManagerReportsPanel,
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
			{(analyticsSection === "executive" || analyticsSection === "clinic") && (
				<ExecutiveDashboard
					hideHeaderToolbar={false}
					period={
						dateRange === "today"
							? "day"
							: dateRange === "yesterday"
								? "yesterday"
								: dateRange === "week"
									? "week"
									: dateRange === "quarter"
										? "quarter"
										: dateRange === "year"
											? "year"
											: "month"
					}
					onPeriodChange={(p) => {
						if (p === "day") setDateRange("today");
						else if (p === "yesterday") setDateRange("yesterday");
						else if (p === "week") setDateRange("week");
						else if (p === "month") setDateRange("month");
						else if (p === "quarter") setDateRange("quarter");
						else if (p === "year") setDateRange("year");
					}}
					onNavigateToSection={(s) => {
						if (s === "financial_analytics") {
							setIsFinancialAnalyticsOpen(true);
						} else {
							setAnalyticsSection(s as any);
						}
					}}
					onOpenFinancialAnalytics={() => setIsFinancialAnalyticsOpen(true)}
				/>
			)}

			{analyticsSection === "reports" && (
				<Suspense fallback={<div className="p-8 text-center text-[var(--muted)]">Загрузка отчётов управляющего...</div>}>
					<ManagerReportsPanel />
				</Suspense>
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

			{isMarketingRoiOpen && (
				<Suspense fallback={null}>
					<div
						className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-2 sm:p-4 flex items-center justify-center animate-in fade-in"
						data-testid="marketing-roi-modal-overlay"
						role="dialog"
						aria-modal="true"
					>
						<div className="w-full max-w-7xl h-[92vh] flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl overflow-hidden relative">
							<div className="flex items-center justify-between p-4 border-b border-[var(--line)] bg-[var(--paper-soft)]">
								<h3 className="font-semibold text-base">Сквозная аналитика маркетинга и воронки</h3>
								<button
									type="button"
									onClick={() => setIsMarketingRoiOpen(false)}
									className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
									aria-label="Закрыть"
									data-testid="marketing-roi-close-btn"
								>
									✕
								</button>
							</div>
							<div className="flex-1 overflow-y-auto p-4">
								<MarketingDashboardView embedded={true} />
							</div>
						</div>
					</div>
				</Suspense>
			)}

			{isFinancialAnalyticsOpen && (
				<Suspense fallback={null}>
					<ManagerialPnlDashboardModal
						isOpen={isFinancialAnalyticsOpen}
						onClose={() => setIsFinancialAnalyticsOpen(false)}
					/>
				</Suspense>
			)}
		</>
	);
}
