import React from "react";

export interface PhasedFinancialMetricsGridProps {
	readonly grandTotalRub: number;
	readonly agreedTotalRub: number;
	readonly remainingRub: number;
	readonly installmentMonths: number;
	readonly installmentMonthlyRub: number;
}

export const PhasedFinancialMetricsGrid: React.FC<PhasedFinancialMetricsGridProps> = ({
	grandTotalRub,
	agreedTotalRub,
	remainingRub,
	installmentMonths,
	installmentMonthlyRub,
}) => {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
			<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
				<div className="text-[11px] font-medium text-[var(--ink-muted)]">
					Общий бюджет 4 фаз
				</div>
				<div className="mt-0.5 text-sm font-extrabold text-[var(--ink)] tabular-nums">
					{grandTotalRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>
			<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
				<div className="text-[11px] font-medium text-[var(--ink-muted)]">
					Согласовано этапов
				</div>
				<div className="mt-0.5 text-sm font-extrabold text-[var(--teal)] tabular-nums">
					{agreedTotalRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>
			<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
				<div className="text-[11px] font-medium text-[var(--ink-muted)]">
					Остаток к оплате
				</div>
				<div className="mt-0.5 text-sm font-extrabold text-[var(--ink)] tabular-nums">
					{remainingRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>
			<div className="rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-2.5">
				<div className="text-[11px] font-medium text-[var(--ink-muted)]">
					Платёж ({installmentMonths} мес, 0%)
				</div>
				<div className="mt-0.5 text-sm font-extrabold text-[var(--teal)] tabular-nums">
					{installmentMonthlyRub.toLocaleString("ru-RU")} ₽/мес
				</div>
			</div>
		</div>
	);
};
