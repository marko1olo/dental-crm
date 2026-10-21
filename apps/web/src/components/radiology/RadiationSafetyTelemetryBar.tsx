import type React from "react";

export interface RadiationSafetyTelemetryBarProps {
	currentYear: number;
	recordsCount: number;
	totalDoseMsv: number;
	totalDoseMicrosv: number;
}

export const RadiationSafetyTelemetryBar: React.FC<
	RadiationSafetyTelemetryBarProps
> = ({ currentYear, recordsCount, totalDoseMsv, totalDoseMicrosv }) => {
	return (
		<div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--paper)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="text-[11px] text-[var(--muted)] font-medium">
					Процедур за {currentYear} г.
				</div>
				<div
					className="text-base font-bold text-[var(--ink)] mt-0.5"
					data-testid="metric-studies-count"
				>
					{recordsCount}
				</div>
			</div>
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="text-[11px] text-[var(--muted)] font-medium">
					Суммарная доза за год
				</div>
				<div
					className="text-base font-bold text-teal-600 mt-0.5"
					data-testid="metric-total-dose"
				>
					{totalDoseMsv.toFixed(4)} мЗв{" "}
					<span className="text-xs text-[var(--muted)] font-normal">
						({totalDoseMicrosv} мкЗв)
					</span>
				</div>
			</div>
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="text-[11px] text-[var(--muted)] font-medium">
					Нормативный статус
				</div>
				<div
					className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1.5"
					data-testid="metric-safety-status"
				>
					<span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
					<span>Безопасный фоновый уровень</span>
				</div>
			</div>
		</div>
	);
};
