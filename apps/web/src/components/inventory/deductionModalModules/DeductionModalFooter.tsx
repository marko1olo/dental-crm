import { Check, Syringe } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers.js";
import type { DeductionTotals } from "./deductionModalTypes.js";

export interface DeductionModalFooterProps {
	readonly totals: DeductionTotals;
	readonly isSubmitting: boolean;
	readonly onClose: () => void;
	readonly onConfirm: () => void;
}

export const DeductionModalFooter: React.FC<DeductionModalFooterProps> = ({
	totals,
	isSubmitting,
	onClose,
	onConfirm,
}) => (
	<>
		{(totals.carpulesCount > 0 || totals.sharpsCount > 0) && (
			<div className="px-4 py-2 border-t border-[var(--line-subtle)] bg-[var(--paper-soft)] flex items-center justify-between text-xs text-[var(--muted)] shrink-0">
				<div className="flex items-center gap-2">
					<Syringe size={13} className="text-amber-600 dark:text-amber-400" />
					<span>
						Отходы Класса Б (СанПиН):{" "}
						<strong>{totals.carpulesCount} карпул, {totals.sharpsCount} игл</strong>
					</span>
				</div>
				<span className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">
					Автоучёт в журнале дезинфекции
				</span>
			</div>
		)}
		<div className="p-3.5 sm:p-4 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap items-center justify-between gap-3 shrink-0">
			<div>
				<div className="text-xs text-[var(--muted)]">Итого по расходу:</div>
				<div className="text-base sm:text-lg font-bold text-teal-700 dark:text-teal-300 leading-tight">
					{money(totals.totalCostRub)}{" "}
					<span className="text-xs font-normal text-[var(--muted)]">
						({totals.activeItemsCount} поз.)
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2.5 shrink-0">
				<button
					type="button"
					onClick={onClose}
					className="h-9 min-h-[36px] px-4 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] shadow-xs flex items-center justify-center"
					data-testid="btn-cancel-deduction"
				>
					Отмена
				</button>
				<button
					type="button"
					onClick={onConfirm}
					disabled={isSubmitting}
					className={`h-9 min-h-[36px] px-4 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 whitespace-nowrap text-white border border-transparent ${
						totals.hasOverdraft
							? "bg-[var(--warning)] hover:brightness-105"
							: "bg-[var(--teal)] hover:brightness-105"
					}`}
					data-testid="btn-confirm-deduction"
					title={
						totals.hasOverdraft
							? `Списание с мягким овердрафтом (${totals.overdraftItemsCount} поз.). Приём не блокируется.`
							: "Подтвердить списание расходных материалов по протоколу"
					}
				>
					<Check size={16} className="shrink-0" />
					<span className="whitespace-nowrap">
						{isSubmitting
							? "Списание..."
							: totals.hasOverdraft
								? `Списать (овердрафт: ${totals.overdraftItemsCount})`
								: "Подтвердить списание"}
					</span>
				</button>
			</div>
		</div>
	</>
);
