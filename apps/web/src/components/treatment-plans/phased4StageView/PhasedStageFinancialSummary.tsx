/**
 * PhasedStageFinancialSummary.tsx — Финансовая сводка по этапам лечения
 * (согласовано / остаток / 30-40-30 эскроу / рассрочка 0% на 6, 12 и 24 мес).
 */

import React from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import {
	CATEGORY_ORDER,
	type CategorizedPhasedPlanData,
	type InstallmentMonthsOption,
	type PhasedStageStatus,
} from "./types.js";
import { PhasedFinancialMetricsGrid } from "./financialSummary/PhasedFinancialMetricsGrid.js";
import { PhasedInstallmentPartnersGrid } from "./financialSummary/PhasedInstallmentPartnersGrid.js";

export interface PhasedStageFinancialSummaryProps {
	readonly categorized: CategorizedPhasedPlanData;
	readonly stageStatuses: Readonly<Record<TreatmentPlanStageCategory, PhasedStageStatus>>;
	readonly installmentMonths: InstallmentMonthsOption;
	readonly installmentMonthlyRub: number;
	readonly onChangeInstallmentMonths: (months: InstallmentMonthsOption) => void;
}

const INSTALLMENT_TERMS: readonly InstallmentMonthsOption[] = [6, 12, 24];

export const PhasedStageFinancialSummary: React.FC<PhasedStageFinancialSummaryProps> = ({
	categorized,
	stageStatuses,
	installmentMonths,
	installmentMonthlyRub,
	onChangeInstallmentMonths,
}) => {
	const agreedTotalRub = CATEGORY_ORDER.reduce((sum, cat) => {
		const status = stageStatuses[cat];
		if (status === "agreed" || status === "in_progress" || status === "completed") {
			return sum + categorized.map[cat].subtotalRub;
		}
		return sum;
	}, 0);

	const completedTotalRub = CATEGORY_ORDER.reduce((sum, cat) => {
		if (stageStatuses[cat] === "completed") {
			return sum + categorized.map[cat].subtotalRub;
		}
		return sum;
	}, 0);

	const remainingRub = Math.max(0, categorized.grandTotalRub - completedTotalRub);

	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-sm space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="text-xs font-bold uppercase tracking-wider text-[var(--teal)]">
						Финансовая сводка и график оплаты по этапам
					</div>
					<p className="text-xs text-[var(--ink-muted)] mt-0.5">
						Выберите срок рассрочки без переплат или поэтапный график 30% / 40% / 30% по мере закрытия клинических фаз.
					</p>
				</div>

				<div className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-0.5">
					{INSTALLMENT_TERMS.map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => onChangeInstallmentMonths(m)}
							className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer min-h-[32px] ${
								installmentMonths === m
									? "bg-[var(--teal)] text-white shadow-sm"
									: "text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							{m} мес
						</button>
					))}
				</div>
			</div>

			<PhasedFinancialMetricsGrid
				grandTotalRub={categorized.grandTotalRub}
				agreedTotalRub={agreedTotalRub}
				remainingRub={remainingRub}
				installmentMonths={installmentMonths}
				installmentMonthlyRub={installmentMonthlyRub}
			/>

			<PhasedInstallmentPartnersGrid
				installmentMonthlyRub={installmentMonthlyRub}
				grandTotalRub={categorized.grandTotalRub}
			/>
		</div>
	);
};
