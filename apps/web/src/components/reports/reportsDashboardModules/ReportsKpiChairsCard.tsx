import { Armchair } from "lucide-react";
import type React from "react";
import type { ReportsSummary } from "../ManagerReportsTypes";
import { formatPercent } from "../managerReportsHelpers";

export interface ReportsKpiChairsCardProps {
	readonly summary: ReportsSummary | null;
}

export const ReportsKpiChairsCard: React.FC<ReportsKpiChairsCardProps> = ({
	summary,
}) => {
	const chairRows = summary?.chairs?.rows ?? [];
	const totalBookedMinutes = chairRows.reduce((acc, c) => acc + c.bookedMinutes, 0);
	const avgUtilization =
		chairRows.length > 0
			? chairRows.reduce((acc, c) => acc + (c.utilization ?? 0), 0) / chairRows.length
			: 0;

	return (
		<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs">
			<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
				<span className="font-semibold uppercase tracking-wider">
					2. Загрузка кресел
				</span>
				<Armchair className="w-4 h-4 text-[var(--teal,#0d9488)]" />
			</div>
			<div className="text-2xl font-extrabold text-[var(--ink)]">
				{formatPercent(avgUtilization || null)}
			</div>
			<div className="text-xs text-[var(--muted)] mt-1 flex items-center justify-between">
				<span>Кресел: {chairRows.length}</span>
				<span>{Math.round(totalBookedMinutes / 60)} ч приёма</span>
			</div>
		</div>
	);
};
