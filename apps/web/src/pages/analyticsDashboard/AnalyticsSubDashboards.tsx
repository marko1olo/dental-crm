import { lazy, Suspense } from "react";
import { Sparkles } from "lucide-react";
import { CuratorDashboard } from "../../components/analytics/CuratorDashboard";
import { ExecutiveDashboard } from "../../components/analytics/ExecutiveDashboard";
import { LostPatientsPanel } from "../../components/analytics/LostPatientsPanel";
import { MarketingAttributionDashboard } from "../../components/analytics/MarketingAttributionDashboard";
import { FreedSlotsPanel } from "../../components/schedule/FreedSlotsPanel";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
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
			{(analyticsSection === "executive" || analyticsSection === "clinic" || analyticsSection === "operational" || analyticsSection === "reports") && (
				<ExecutiveDashboard
					hideHeaderToolbar={false}
					initialTab={analyticsSection === "operational" ? "chairs" : (analyticsSection === "reports" ? "financial" : undefined)}
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
						} else if (
							s === "executive" ||
							s === "reports" ||
							s === "operational" ||
							s === "curators" ||
							s === "lost_patients" ||
							s === "freed_slots" ||
							s === "marketing" ||
							s === "clinic"
						) {
							setAnalyticsSection(s);
						}
					}}
					onOpenFinancialAnalytics={() => setIsFinancialAnalyticsOpen(true)}
				/>
			)}

			{analyticsSection === "marketing" && (
				<div className="space-y-6">
					<MarketingAttributionDashboard />
				</div>
			)}

			{analyticsSection === "curators" && (
				<CuratorDashboard
					onOpenPatientCard={(patientId) => {
						usePatientStore.getState().setSelectedPatientId(patientId);
						useAppStore.getState().setCurrentView("patients");
					}}
					onOpenPatientPlan={(patientId, planId) => {
						usePatientStore.getState().setSelectedPatientId(patientId);
						useAppStore.getState().setCurrentView("pipeline");
						if (typeof window !== "undefined") {
							window.dispatchEvent(
								new CustomEvent("dente:open-treatment-plan", {
									detail: { patientId, planId },
								}),
							);
						}
					}}
				/>
			)}

			{analyticsSection === "lost_patients" && (
				<div className="space-y-6">
					<LostPatientsPanel />
					<div
						className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
						data-testid="analytics-recalls-hub-cta"
					>
						<div className="space-y-1">
							<h3 className="font-semibold text-base flex items-center gap-2">
								<Sparkles className="w-4 h-4 text-[var(--primary)]" />
								Централизованный хаб профосмотров и реколлов
							</h3>
							<p className="text-xs sm:text-sm text-[var(--muted)]">
								Единый клинический центр повторных вызовов, контроля имплантации и приглашений пациентов.
							</p>
						</div>
						<button
							type="button"
							className="dente-btn-primary shrink-0"
							onClick={() => window.dispatchEvent(new CustomEvent("dente:open-recalls"))}
						>
							Открыть хаб профосмотров
						</button>
					</div>
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
