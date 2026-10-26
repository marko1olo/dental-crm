import type React from "react";
import { ReportsKpiAverageTicketCard } from "./ReportsKpiAverageTicketCard";
import { ReportsKpiFlowCard } from "./ReportsKpiFlowCard";
import { ReportsKpiReceivablesCard } from "./ReportsKpiReceivablesCard";
import { ReportsKpiRevenueCard } from "./ReportsKpiRevenueCard";
import type {
	FunnelMetrics,
	PatientFlowMetrics,
	ReportsDashboardKpisProps,
} from "./reportsDashboardKpiTypes";

export type { FunnelMetrics, PatientFlowMetrics, ReportsDashboardKpisProps };

export const ReportsDashboardKpis: React.FC<ReportsDashboardKpisProps> = ({
	summary,
	clinicAverageTicketRub,
	patientFlowStats,
	funnelStats,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
			<ReportsKpiRevenueCard summary={summary} />
			<ReportsKpiAverageTicketCard
				clinicAverageTicketRub={clinicAverageTicketRub}
				funnelStats={funnelStats}
			/>
			<ReportsKpiFlowCard patientFlowStats={patientFlowStats} />
			<ReportsKpiReceivablesCard summary={summary} />
		</div>
	);
};
