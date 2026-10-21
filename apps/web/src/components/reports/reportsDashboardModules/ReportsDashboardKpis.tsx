import { Activity, CheckCircle2, DollarSign, UserPlus } from "lucide-react";
import type React from "react";
import { money } from "../../../AppHelpers";
import { formatRub as shortRub } from "../../../pages/analyticsDoctorMetrics.js";
import type { ReportsSummary } from "../ManagerReportsTypes";
import { formatPercent } from "../managerReportsHelpers";

export interface PatientFlowMetrics {
	readonly newPatients: number;
	readonly returningPatients: number;
	readonly totalFlow: number;
	readonly primarySharePct: number;
}

export interface FunnelMetrics {
	readonly completedApts: number;
}

export interface ReportsDashboardKpisProps {
	readonly summary: ReportsSummary | null;
	readonly clinicAverageTicketRub: number;
	readonly patientFlowStats: PatientFlowMetrics;
	readonly funnelStats: FunnelMetrics;
}

export const ReportsDashboardKpis: React.FC<ReportsDashboardKpisProps> = ({
	summary,
	clinicAverageTicketRub,
	patientFlowStats,
	funnelStats,
}) => {
	const { completedApts } = funnelStats;
	const { primarySharePct, newPatients, totalFlow, returningPatients } =
		patientFlowStats;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
			{/* KPI 1: Total Revenue */}
			<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs">
				<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1">
					<span className="font-semibold uppercase tracking-wider">
						Выручка
					</span>
					<DollarSign className="w-4 h-4 text-teal-600" />
				</div>
				<div
					className="text-2xl font-extrabold text-[var(--ink,#0f172a)]"
					title={money(summary?.revenue?.totalRub ?? 0)}
				>
					{shortRub(summary?.revenue?.totalRub ?? 0)}
				</div>
				<div className="text-xs text-[var(--muted,#64748b)] mt-1">
					Платежей за период:{" "}
					{summary?.revenue?.points?.reduce(
						(acc, p) => acc + p.paymentCount,
						0,
					) ?? 0}
				</div>
			</div>

			{/* KPI 2: Overall Clinic Average Ticket */}
			<div className="p-4 rounded-xl border border-teal-500/30 bg-teal-50/30 dark:bg-teal-950/10 shadow-2xs">
				<div className="flex items-center justify-between text-xs text-teal-800 dark:text-teal-300 mb-1">
					<span className="font-bold uppercase tracking-wider">
						Средний чек клиники
					</span>
					<Activity className="w-4 h-4 text-teal-600" />
				</div>
				<div
					className="text-2xl font-extrabold text-teal-900 dark:text-teal-100"
					title={money(clinicAverageTicketRub)}
				>
					{shortRub(clinicAverageTicketRub)}
				</div>
				<div className="text-xs text-teal-700/80 dark:text-teal-400 mt-1">
					По завершенным приемам ({completedApts} виз.)
				</div>
			</div>

			{/* KPI 3: Patient Primary vs Returning Share */}
			<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs">
				<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1">
					<span className="font-semibold uppercase tracking-wider">
						Первичные пациенты
					</span>
					<UserPlus className="w-4 h-4 text-indigo-600" />
				</div>
				<div className="flex items-baseline gap-2">
					<span className="text-2xl font-extrabold text-[var(--ink,#0f172a)]">
						{primarySharePct}%
					</span>
					<span className="text-xs text-[var(--muted,#64748b)]">
						({newPatients} из {totalFlow})
					</span>
				</div>
				<div className="text-xs text-[var(--muted,#64748b)] mt-1">
					Повторных визитов: {returningPatients}
				</div>
			</div>

			{/* KPI 4: Appointment Conversion */}
			<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs">
				<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1">
					<span className="font-semibold uppercase tracking-wider">
						Доходимость приемов
					</span>
					<CheckCircle2 className="w-4 h-4 text-emerald-600" />
				</div>
				<div className="text-2xl font-extrabold text-[var(--ink,#0f172a)]">
					{formatPercent(summary?.appointments?.completionRate ?? null)}
				</div>
				<div className="text-xs text-[var(--muted,#64748b)] mt-1">
					Неявки: {formatPercent(summary?.appointments?.noShowRate ?? null)} (
					{summary?.appointments?.lostAppointments ?? 0} потерь)
				</div>
			</div>
		</div>
	);
};
