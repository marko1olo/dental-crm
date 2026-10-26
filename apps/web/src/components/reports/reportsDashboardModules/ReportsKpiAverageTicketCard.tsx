import { Activity } from "lucide-react";
import type React from "react";
import { money } from "../../../AppHelpers";
import { formatRub as shortRub } from "../../../pages/analyticsDoctorMetrics.js";
import type { FunnelMetrics } from "./reportsDashboardKpiTypes";

export interface ReportsKpiAverageTicketCardProps {
	readonly clinicAverageTicketRub: number;
	readonly funnelStats: FunnelMetrics;
}

export const ReportsKpiAverageTicketCard: React.FC<ReportsKpiAverageTicketCardProps> = ({
	clinicAverageTicketRub,
	funnelStats,
}) => {
	const { completedApts } = funnelStats;

	return (
		<div className="p-4 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-surface,#ccfbf1)]/20 shadow-2xs">
			<div className="flex items-center justify-between text-xs text-[var(--teal,#0d9488)] mb-1">
				<span className="font-bold uppercase tracking-wider">
					Средний чек клиники
				</span>
				<Activity className="w-4 h-4 text-[var(--teal,#0d9488)]" />
			</div>
			<div
				className="text-2xl font-extrabold text-[var(--ink)]"
				title={money(clinicAverageTicketRub)}
			>
				{shortRub(clinicAverageTicketRub)}
			</div>
			<div className="text-xs text-[var(--muted)] mt-1 flex items-center justify-between">
				<span>Завершено: {completedApts} виз.</span>
				<span className="text-[11px] text-[var(--teal,#0d9488)]">Качество приёма</span>
			</div>
		</div>
	);
};
