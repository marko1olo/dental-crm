import React from "react";
import type { CategorizedPhasedPlanData, InstallmentMonthsOption } from "../types.js";

export interface PhasedStepperHeaderProps {
	readonly categorized: CategorizedPhasedPlanData;
	readonly planTierTitle: string;
	readonly patientName?: string | undefined;
	readonly formattedPlanAgeBadge: string;
	readonly isExpired: boolean;
	readonly installmentMonths: InstallmentMonthsOption;
	readonly installmentMonthlyRub: number;
}

export const PhasedStepperHeader: React.FC<PhasedStepperHeaderProps> = ({
	categorized,
	planTierTitle,
	patientName,
	formattedPlanAgeBadge,
	isExpired,
	installmentMonths,
	installmentMonthlyRub,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-4">
			<div>
				<div className="flex items-center gap-2 flex-wrap">
					<span className="inline-flex items-center rounded-md bg-[color-mix(in_srgb,var(--teal)_12%,var(--paper))] px-2.5 py-0.5 text-xs font-semibold text-[var(--teal)] border border-[color-mix(in_srgb,var(--teal)_28%,transparent)]">
						4 клинических этапа: Пошаговая реабилитация
					</span>
					{patientName && (
						<span className="text-xs font-medium text-[var(--ink-muted)]">
							Пациент: <strong className="text-[var(--ink)]">{patientName}</strong>
						</span>
					)}
					<span
						data-testid="phased-expired-unblocked-badge"
						className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
							isExpired
								? "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
								: "bg-[var(--paper-soft)] text-[var(--ink-muted)] border-[var(--line)]"
						}`}
					>
						<svg className="w-3 h-3 shrink-0 text-[var(--teal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{formattedPlanAgeBadge}
					</span>
				</div>
				<h3 className="mt-1 text-base font-bold text-[var(--ink)]">
					{planTierTitle} — Разбивка по этапам лечения (Каталог стоматологических услуг)
				</h3>
				<p className="text-xs text-[var(--ink-muted)] mt-0.5">
					Оплата и запись производятся поэтапно по мере приживления и завершения предыдущей клинической фазы.
				</p>
			</div>

			<div className="flex items-center gap-4">
				<div className="text-right">
					<div className="text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
						Итоговая смета 4 этапов
					</div>
					<div className="text-xl font-extrabold text-[var(--ink)] tabular-nums">
						{categorized.grandTotalRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[11px] font-medium text-[var(--teal)] tabular-nums">
						Рассрочка 0% ({installmentMonths} мес): {installmentMonthlyRub.toLocaleString("ru-RU")} ₽/мес
					</div>
				</div>
			</div>
		</div>
	);
};
