import { UserPlus } from "lucide-react";
import type React from "react";
import type { PatientFlowMetrics } from "./reportsDashboardKpiTypes";

export interface ReportsKpiFlowCardProps {
	readonly patientFlowStats: PatientFlowMetrics;
}

export const ReportsKpiFlowCard: React.FC<ReportsKpiFlowCardProps> = ({
	patientFlowStats,
}) => {
	const { primarySharePct, newPatients, totalFlow, returningPatients } =
		patientFlowStats;

	return (
		<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs">
			<div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1">
				<span className="font-semibold uppercase tracking-wider">
					3. Первичные пациенты
				</span>
				<UserPlus className="w-4 h-4 text-[var(--teal,#0d9488)]" />
			</div>
			<div className="flex items-baseline gap-2">
				<span className="text-2xl font-extrabold text-[var(--ink)]">
					{primarySharePct}%
				</span>
				<span className="text-xs text-[var(--muted)]">
					({newPatients} из {totalFlow})
				</span>
			</div>
			<div className="text-xs text-[var(--muted)] mt-1 flex items-center justify-between">
				<span>Повторных: {returningPatients}</span>
				<span className="text-[11px] text-[var(--muted)]">планы лечения</span>
			</div>
		</div>
	);
};
