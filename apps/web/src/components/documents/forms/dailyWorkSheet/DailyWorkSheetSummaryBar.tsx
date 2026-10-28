import React from "react";
import type { DailyWorkSheetSummaryBarProps } from "./DailyWorkSheetTypes";

export const DailyWorkSheetSummaryBar: React.FC<DailyWorkSheetSummaryBarProps> = ({
	totals,
}) => {
	return (
		<div className="p-3 mb-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs">
			<div className="font-bold text-[var(--ink)] mb-1.5">Сводка приёма за смену:</div>
			<div className="flex gap-4 flex-wrap text-[var(--muted)]">
				<span>
					Принято пациентов: <strong className="text-[var(--ink)]">{totals.totalPatientsCount}</strong>
				</span>
				<span>
					Первичных: <strong className="text-[var(--ink)]">{totals.totalPrimaryVisitsCount}</strong>
				</span>
				<span>
					Санировано: <strong className="text-[var(--ink)]">{totals.totalSanatedCount}</strong>
				</span>
				<span>
					Трудоёмкость (УЕТ):{" "}
					<strong className="text-[var(--primary,#0d9488)]">{totals.totalUetAccumulated.toFixed(2)}</strong>
				</span>
			</div>
		</div>
	);
};
