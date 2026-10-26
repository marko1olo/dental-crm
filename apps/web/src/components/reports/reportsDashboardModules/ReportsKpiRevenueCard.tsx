import { DollarSign } from "lucide-react";
import type React from "react";
import { money } from "../../../AppHelpers";
import { formatRub as shortRub } from "../../../pages/analyticsDoctorMetrics.js";
import type { ReportsSummary } from "../ManagerReportsTypes";

export interface ReportsKpiRevenueCardProps {
	readonly summary: ReportsSummary | null;
}

export const ReportsKpiRevenueCard: React.FC<ReportsKpiRevenueCardProps> = ({
	summary,
}) => {
	const totalRub = summary?.revenue?.totalRub ?? 0;
	const paymentCount =
		summary?.revenue?.points?.reduce((acc, p) => acc + p.paymentCount, 0) ?? 0;

	return (
		<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs">
			<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
				<span className="font-semibold uppercase tracking-wider">
					1. Выручка клиники
				</span>
				<DollarSign className="w-4 h-4 text-[var(--teal,#0d9488)]" />
			</div>
			<div
				className="text-2xl font-extrabold text-[var(--ink)]"
				title={money(totalRub)}
			>
				{shortRub(totalRub)}
			</div>
			<div className="text-xs text-[var(--muted)] mt-1 flex items-center justify-between">
				<span>Оплат: {paymentCount}</span>
				<span className="text-[11px] text-[var(--teal,#0d9488)] font-medium">Безнал · Нал · СБП</span>
			</div>
		</div>
	);
};
