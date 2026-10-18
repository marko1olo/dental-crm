/**
 * DENTE CRM — Treatment Plan Presenter Formula Header
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React, { memo } from "react";

export interface TreatmentPlanPresenterFormulaHeaderProps {
	readonly totalTreatedTeeth: number;
}

export const TreatmentPlanPresenterFormulaHeader: React.FC<TreatmentPlanPresenterFormulaHeaderProps> = memo(({
	totalTreatedTeeth,
}) => {
	return (
		<div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
			<div className="flex items-center gap-2 flex-wrap">
				<span className="text-xs font-bold text-[var(--tp-text-main)] uppercase tracking-wider">
					Анатомическая зубная формула FDI (11–48)
				</span>
				<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20">
					В тарифе задействовано: {totalTreatedTeeth} зубов
				</span>
			</div>

			<div className="flex items-center gap-3 text-[11px] text-[var(--tp-text-muted)] flex-wrap">
				<div className="flex items-center gap-1.5">
					<span className="w-2.5 h-2.5 rounded-xs bg-teal-500/20 border border-teal-500" />
					<span>В плане лечения</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="w-2.5 h-2.5 rounded-xs bg-amber-500/20 border border-amber-400" />
					<span>Патология</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="w-2.5 h-2.5 rounded-xs bg-[var(--tp-bg)] border border-[var(--tp-border)]" />
					<span>Здоров / Интактный</span>
				</div>
			</div>
		</div>
	);
});

TreatmentPlanPresenterFormulaHeader.displayName = "TreatmentPlanPresenterFormulaHeader";
