import type React from "react";
import { useMemo } from "react";
import type {
	CalendarPeriod,
	ReportsSummary,
	ScheduleLoadReport,
	ServiceSalesReport,
} from "./ManagerReportsTypes";
import { ReportsDashboardDoctorsTable } from "./reportsDashboardModules/ReportsDashboardDoctorsTable";
import { ReportsDashboardHeader } from "./reportsDashboardModules/ReportsDashboardHeader";
import { ReportsDashboardKpis } from "./reportsDashboardModules/ReportsDashboardKpis";
import { ReportsDashboardScheduleLoad } from "./reportsDashboardModules/ReportsDashboardScheduleLoad";
import { handlePrintDashboard } from "./reportsDashboardModules/reportsDashboardPrint";

export interface ReportsDashboardProps {
	readonly summary: ReportsSummary | null;
	readonly scheduleLoad?: ScheduleLoadReport | null | undefined;
	readonly serviceSales?: ServiceSalesReport | null | undefined;
	readonly period: CalendarPeriod;
	readonly clinicName?: string | undefined;
	readonly onExportCsv?: () => void;
	readonly onRefresh?: () => void;
	readonly isLoading?: boolean | undefined;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
	summary,
	scheduleLoad,
	serviceSales: _serviceSales,
	period,
	clinicName = "ООО «Денте Стоматология»",
	onExportCsv,
	onRefresh,
	isLoading = false,
}) => {
	const clinicAverageTicketRub = useMemo(() => {
		if (!summary?.appointments || !summary?.revenue) return 0;
		const totalRevenue = summary.revenue.totalRub ?? 0;
		const completedApts = Math.max(
			0,
			(summary.appointments.total ?? 0) -
				(summary.appointments.lostAppointments ?? 0),
		);
		return completedApts === 0 ? 0 : Math.round(totalRevenue / completedApts);
	}, [summary]);

	const patientFlowStats = useMemo(() => {
		const newPatients = summary?.patientFlow?.newTotal ?? 0;
		const returningPatients = summary?.patientFlow?.returningTotal ?? 0;
		const totalFlow = newPatients + returningPatients;
		return {
			newPatients,
			returningPatients,
			totalFlow,
			primarySharePct:
				totalFlow > 0 ? Math.round((newPatients / totalFlow) * 100) : 0,
		};
	}, [summary?.patientFlow]);

	const funnelStats = useMemo(() => {
		const totalApts = summary?.appointments?.total ?? 0;
		const completedApts = Math.max(
			0,
			totalApts - (summary?.appointments?.lostAppointments ?? 0),
		);
		return { completedApts };
	}, [summary]);

	const handlePrint = () => {
		handlePrintDashboard({
			clinicName,
			period,
			summary,
			clinicAverageTicketRub,
			completedApts: funnelStats.completedApts,
			primarySharePct: patientFlowStats.primarySharePct,
			newPatients: patientFlowStats.newPatients,
			scheduleLoad,
		});
	};

	return (
		<div
			className="reports-dashboard space-y-6"
			data-testid="reports-dashboard"
			style={{ color: "var(--ink)" }}
		>
			<ReportsDashboardHeader
				period={period}
				clinicName={clinicName}
				onRefresh={onRefresh}
				onExportCsv={onExportCsv}
				onPrint={handlePrint}
				isLoading={isLoading}
			/>

			<ReportsDashboardKpis
				summary={summary}
				clinicAverageTicketRub={clinicAverageTicketRub}
				patientFlowStats={patientFlowStats}
				funnelStats={funnelStats}
			/>

			<ReportsDashboardScheduleLoad scheduleLoad={scheduleLoad} />

			<ReportsDashboardDoctorsTable summary={summary} />
		</div>
	);
};
