/**
 * ShiftCloseReconciliationTab.tsx — Cash Summary Breakdown for Shift Close.
 * Mandate 8x: Living clinical & cash terminology without Soviet bureaucracy.
 * Anti-All-Caps: Clean sentence case typography.
 */

import React from "react";
import type { Ffd12ShiftCloseZReportSummary } from "../fiscal54fzEngine";
import { CashShiftKpiCards } from "../CashShiftReconciliationComponents";

export interface ShiftCloseReconciliationTabProps {
	readonly reportSummary: Ffd12ShiftCloseZReportSummary;
	readonly cardSumRub: number;
	readonly calculatedSbpRub: number;
}

export const ShiftCloseReconciliationTab: React.FC<ShiftCloseReconciliationTabProps> = ({
	reportSummary,
	cardSumRub,
	calculatedSbpRub,
}) => {
	return (
		<div className="space-y-6">
			{/* Top Metric Cards */}
			<CashShiftKpiCards
				netRevenueRub={reportSummary.netRevenueRub}
				cashInDrawerRub={reportSummary.cashInDrawerRub}
				cardSumRub={cardSumRub}
				sbpSumRub={calculatedSbpRub}
				advanceOffsetRub={reportSummary.incomeAdvanceOffsetRub}
				incomeTotalRub={reportSummary.incomeTotalRub}
				incomeReturnTotalRub={reportSummary.incomeReturnTotalRub}
			/>

			{/* Breakdown Table */}
			<div className="p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
				<h4 className="text-xs font-semibold text-[var(--muted)] m-0">
					Сводная детализация кассовых операций
				</h4>

				<div className="space-y-2 text-xs">
					{/* Section 1: Income */}
					<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-2">
						<div className="flex justify-between items-center font-bold text-emerald-700 dark:text-emerald-300 text-sm">
							<span>1. Принято оплат (услуги клиники)</span>
							<span className="font-mono font-bold">
								Чеков: {reportSummary.incomeCount} · {reportSummary.incomeTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
							</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[var(--line)] text-[var(--ink)]">
							<div className="flex justify-between">
								<span>• Наличными:</span>
								<strong className="font-mono">{reportSummary.incomeCashRub.toLocaleString("ru-RU")} ₽</strong>
							</div>
							<div className="flex justify-between">
								<span>• Безналичными:</span>
								<strong className="font-mono">{reportSummary.incomeElectronicRub.toLocaleString("ru-RU")} ₽</strong>
							</div>
							<div className="flex justify-between">
								<span>• Зачет аванса:</span>
								<strong className="font-mono">{reportSummary.incomeAdvanceOffsetRub.toLocaleString("ru-RU")} ₽</strong>
							</div>
						</div>
					</div>

					{/* Section 2: Returns */}
					<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-2">
						<div className="flex justify-between items-center font-bold text-rose-700 dark:text-rose-300 text-sm">
							<span>2. Возвраты оплат пациентам</span>
							<span className="font-mono font-bold">
								Чеков: {reportSummary.incomeReturnCount} · −{reportSummary.incomeReturnTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
							</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[var(--line)] text-[var(--ink)]">
							<div className="flex justify-between">
								<span>• Наличными из кассы:</span>
								<strong className="font-mono">−{reportSummary.incomeReturnCashRub.toLocaleString("ru-RU")} ₽</strong>
							</div>
							<div className="flex justify-between">
								<span>• Банковской картой:</span>
								<strong className="font-mono">−{reportSummary.incomeReturnElectronicRub.toLocaleString("ru-RU")} ₽</strong>
							</div>
							<div className="flex justify-between">
								<span>• На депозит пациента:</span>
								<strong className="font-mono">−{reportSummary.incomeReturnAdvanceOffsetRub.toLocaleString("ru-RU")} ₽</strong>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
