import React, { useMemo } from "react";
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

	const isEmpty =
		Boolean(summary?.isEmpty) ||
		(Boolean(summary) &&
			Number(summary?.revenue?.totalRub ?? 0) === 0 &&
			Number(summary?.appointments?.total ?? 0) === 0);

	return (
		<div
			className="reports-dashboard space-y-6"
			data-testid="reports-dashboard"
			style={{ color: "var(--ink)" }}
		>
			{/* SSOT Консолидация: переход в единую Студию управленческой аналитики */}
			<div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal,#0d9488)]/5 text-xs text-[var(--ink)]">
				<div className="flex items-center gap-2">
					<span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)]" />
					<span className="font-semibold">Канонический центр управленческой аналитики (SSOT):</span>
					<span className="text-[var(--muted)]">Реальная касса 54-ФЗ, загрузка кресел и Recall пациентов в единой студии.</span>
				</div>
				<button
					type="button"
					onClick={() => {
						if (typeof window !== "undefined") {
							window.location.hash = "#analytics";
							window.dispatchEvent(new CustomEvent("dente:open-analytics"));
						}
					}}
					className="h-8 px-3 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 shrink-0"
				>
					<span>Открыть Студию аналитики</span>
				</button>
			</div>

			<ReportsDashboardHeader
				period={period}
				clinicName={clinicName}
				onRefresh={onRefresh}
				onExportCsv={onExportCsv}
				onPrint={handlePrint}
				isLoading={isLoading}
			/>

			{isEmpty && (
				<div
					className="p-6 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-center space-y-2"
					data-testid="reports-dashboard-empty"
				>
					<h3 className="text-sm sm:text-base font-bold text-[var(--ink)]">
						За выбранный период операций не зафиксировано
					</h3>
					<p className="text-xs text-[var(--muted)] max-w-md mx-auto">
						В базе данных клиники отсутствуют проведённые приёмы и фискальные чеки за период {period.from} — {period.to}.
					</p>
				</div>
			)}

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
