import React from "react";
import { Layers } from "lucide-react";

export interface TreatmentPlanHeaderBarProps {
	readonly patientName: string;
	readonly totalItemsCount: number;
}

export const TreatmentPlanHeaderBar: React.FC<TreatmentPlanHeaderBarProps> = ({
	patientName,
	totalItemsCount,
}) => {
	return (
		<div className="flex items-center justify-between gap-2 px-1 text-xs text-[var(--muted,#64748b)] pb-1 border-b border-[var(--line,var(--border,#cbd5e1))]/40">
			<div className="flex items-center gap-2 min-w-0 flex-wrap">
				<div className="p-1 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] shrink-0">
					<Layers size={13} />
				</div>
				<span className="font-bold text-[var(--ink,#0f172a)] whitespace-nowrap">
					Комплексный план лечения
				</span>
				<span className="hidden sm:inline text-[var(--line-subtle)]">·</span>
				<span className="truncate">
					Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong>
				</span>
			</div>
			<div className="flex items-center gap-1.5 shrink-0 text-[11px] font-medium">
				<span className="px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-mono font-bold border border-cyan-500/20">
					СтАР
				</span>
				<span className="hidden sm:inline">
					{totalItemsCount} процедур · 3 этапа
				</span>
			</div>
		</div>
	);
};

export default TreatmentPlanHeaderBar;
