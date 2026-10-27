import React from "react";
import { money } from "../../../utils/financeUtils";

export interface TreatmentPlansSummaryBarProps {
	readonly totalRub: number;
	readonly completedRub: number;
	readonly pendingRub: number;
}

export const TreatmentPlansSummaryBar: React.FC<TreatmentPlansSummaryBarProps> = React.memo(({
	totalRub,
	completedRub,
	pendingRub,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
			<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
				<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
					Общий бюджет плана:
				</span>
				<span className="text-xs font-mono font-black text-[var(--ink)]">
					{money(totalRub)}
				</span>
			</div>
			<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
				<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
					Выполнено:
				</span>
				<span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
					{money(completedRub)}
				</span>
			</div>
			<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
				<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
					Остаток к реализации:
				</span>
				<span className="text-xs font-mono font-black text-[var(--teal)]">
					{money(pendingRub)}
				</span>
			</div>
		</div>
	);
});

TreatmentPlansSummaryBar.displayName = "TreatmentPlansSummaryBar";
