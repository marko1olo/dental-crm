import React, { lazy, Suspense, useCallback, useState } from "react";
import { Filter, Layers } from "lucide-react";
import { ExecutiveFunnelMetrics } from "../ExecutiveFunnelMetrics";
import { ExecutivePnlWidget } from "../ExecutivePnlWidget";
import { DesktopChairUtilizationSection } from "./DesktopChairUtilizationSection";
import { DesktopExecutiveEmptyStateBanner } from "./ExecutiveChairUtilizationChart";
import { DesktopExecutiveHeader } from "./DesktopExecutiveHeader";
import { DesktopExecutiveLoadingState, DesktopExecutiveErrorState } from "./DesktopExecutiveStates";
import { DesktopExecutiveKpiCards } from "./DesktopExecutiveKpiCards";
import { DesktopExecutiveTelemetryBar } from "./ExecutiveDoctorPerformanceTable";
import { DesktopExecutiveFunnelPanel } from "./DesktopExecutiveFunnelPanel";
import { DesktopTopDoctorsSection } from "./DesktopTopDoctorsSection";
import { DesktopTopProceduresSection } from "./DesktopTopProceduresSection";
import type { UseExecutiveDashboardDataResult } from "./useExecutiveDashboardData";

const FinancialAnalyticsModal = lazy(() =>
	import("../FinancialAnalyticsModal").then((m) => ({ default: m.FinancialAnalyticsModal })),
);

export interface DesktopExecutiveViewProps extends UseExecutiveDashboardDataResult {
	readonly hideHeaderToolbar?: boolean | undefined;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
	readonly onOpenFinancialAnalytics?: (() => void) | undefined;
}

export const DesktopExecutiveView: React.FC<DesktopExecutiveViewProps> = ({
	period,
	setPeriod,
	loading,
	error,
	payload,
	chairsData,
	reload,
	handleExportCsv,
	hideHeaderToolbar = false,
	onNavigateToSection,
	onOpenFinancialAnalytics,
}) => {
	const [isInternalPnlOpen, setIsInternalPnlOpen] = useState(false);

	const handleOpenPnl = useCallback(() => {
		if (onOpenFinancialAnalytics) onOpenFinancialAnalytics();
		else if (onNavigateToSection) onNavigateToSection("financial_analytics");
		else setIsInternalPnlOpen(true);
	}, [onOpenFinancialAnalytics, onNavigateToSection]);

	if (loading && !payload) return <DesktopExecutiveLoadingState />;
	if (!payload) return <DesktopExecutiveErrorState error={error} reload={reload} />;

	const { kpis, funnelStages, departments, topDoctors = [], topProcedures = [] } = payload;
	const chairCostRub = chairsData?.chairHourlyCostRub ?? 1850;
	const chairOccupancy = chairsData?.chairOccupancyRatePercent ?? kpis.chairOccupancyRatePercent ?? 0;
	const chairItems = chairsData?.chairUtilizationJson ?? [];

	return (
		<div className="executive-dashboard" role="main" aria-label="Аналитика клиники">
			{!hideHeaderToolbar && (
				<DesktopExecutiveHeader
					period={period}
					setPeriod={setPeriod}
					loading={loading}
					reload={reload}
					handleExportCsv={handleExportCsv}
					handleOpenPnl={handleOpenPnl}
				/>
			)}

			<DesktopExecutiveEmptyStateBanner
				isEmpty={payload.isEmpty}
				period={period}
				kpis={kpis}
				onSelectPeriod={setPeriod}
				onNavigateToSection={onNavigateToSection}
			/>

			<DesktopExecutiveKpiCards kpis={kpis} onOpenPnl={handleOpenPnl} onNavigateToSection={onNavigateToSection} />

			<div className="executive-content-grid">
				<section className="executive-panel" aria-label="План/факт выручки по отделениям">
					<div className="executive-panel-header">
						<h2 className="executive-panel-title">
							<Layers size={18} style={{ color: "var(--teal, #0d9488)" }} aria-hidden="true" />
							План / факт выручки по 5 отделениям
						</h2>
						<span className="executive-panel-badge">Структура P&amp;L</span>
					</div>
					<ExecutivePnlWidget
						departments={departments}
						totalRevenueFormatted={kpis.totalRevenueFormatted}
						totalPlanFormatted={kpis.totalRevenuePlanFormatted}
						overallFulfillmentPercent={kpis.overallPlanFulfillmentPercent}
						onOpenPnl={handleOpenPnl}
					/>
				</section>

				<DesktopChairUtilizationSection chairCostRub={chairCostRub} chairOccupancy={chairOccupancy} chairItems={chairItems} kpis={kpis} />
			</div>

			<div className="executive-content-grid">
				<DesktopTopDoctorsSection topDoctors={topDoctors} />
				<DesktopTopProceduresSection topProcedures={topProcedures} />
			</div>

			<DesktopExecutiveFunnelPanel stages={funnelStages} />

			<DesktopExecutiveTelemetryBar kpis={kpis} />

			{isInternalPnlOpen && (
				<Suspense fallback={null}>
					<FinancialAnalyticsModal
						isOpen={isInternalPnlOpen}
						onClose={() => setIsInternalPnlOpen(false)}
						initialPeriod={period === "day" || (period as string) === "week" ? "month" : (period as any)}
					/>
				</Suspense>
			)}
		</div>
	);
};
