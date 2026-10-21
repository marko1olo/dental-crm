import {
	STOMX_CASH_EXPENSE_CATALOG,
	STOMX_CASH_RECEIPT_CATALOG,
} from "@dental/shared";
import { Check } from "lucide-react";
import type React from "react";

interface CashFlowCatalogPresetsProps {
	readonly cashFlowMode: "cash_in" | "cash_out";
	readonly selectedTypeAlias: string;
	readonly onSelectReceiptPreset: (alias: string) => void;
	readonly onSelectExpensePreset: (alias: string) => void;
}

export const CashFlowCatalogPresets: React.FC<CashFlowCatalogPresetsProps> = ({
	cashFlowMode,
	selectedTypeAlias,
	onSelectReceiptPreset,
	onSelectExpensePreset,
}) => {
	const isCashIn = cashFlowMode === "cash_in";
	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
					Тип операции (
					{isCashIn ? "Каталог приходов клиники" : "Каталог расходов клиники"}):
				</span>
				<span className="text-[11px] text-[var(--muted,#64748b)]">
					Быстрый выбор
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-[var(--line,rgba(0,0,0,0.06))] rounded-xl bg-[var(--paper-soft,#f8fafc)]">
				{isCashIn
					? STOMX_CASH_RECEIPT_CATALOG.map((receipt) => {
							const isSelected = selectedTypeAlias === receipt.alias;
							return (
								<button
									key={receipt.alias}
									type="button"
									onClick={() => onSelectReceiptPreset(receipt.alias)}
									data-testid={`preset-receipt-${receipt.alias}`}
									className={`min-h-[44px] p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
										isSelected
											? "bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs"
											: "bg-[var(--paper,#ffffff)] border-[var(--line,rgba(0,0,0,0.06))] hover:border-emerald-500/40 text-[var(--ink,#0f172a)]"
									}`}
								>
									<div className="flex items-center justify-between gap-2">
										<span className="text-xs font-semibold truncate">
											{receipt.name}
										</span>
										{isSelected && (
											<Check size={14} className="text-emerald-600 shrink-0" />
										)}
									</div>
									<div className="flex items-center gap-1.5 flex-wrap">
										<span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300">
											{receipt.ffdTag1054 !== null
												? "Кассовый ордер (приход)"
												: "Внутренний ордер"}
										</span>
									</div>
								</button>
							);
						})
					: STOMX_CASH_EXPENSE_CATALOG.map((expense) => {
							const isSelected = selectedTypeAlias === expense.alias;
							return (
								<button
									key={expense.alias}
									type="button"
									onClick={() => onSelectExpensePreset(expense.alias)}
									data-testid={`preset-expense-${expense.alias}`}
									className={`min-h-[44px] p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
										isSelected
											? "bg-rose-500/15 border-rose-500 text-rose-800 dark:text-rose-300 font-bold shadow-xs"
											: "bg-[var(--paper,#ffffff)] border-[var(--line,rgba(0,0,0,0.06))] hover:border-rose-500/40 text-[var(--ink,#0f172a)]"
									}`}
								>
									<div className="flex items-center justify-between gap-2">
										<span className="text-xs font-semibold truncate">
											{expense.name}
										</span>
										{isSelected && (
											<Check size={14} className="text-rose-600 shrink-0" />
										)}
									</div>
									<div className="flex items-center gap-1.5 flex-wrap">
										<span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300">
											{expense.ffdTag1054 !== null
												? expense.alias === "collection"
													? "Инкассация / Выемка"
													: `Кассовый ордер (${expense.ffdTag1054})`
												: "Внутренний ордер"}
										</span>
									</div>
								</button>
							);
						})}
			</div>
		</div>
	);
};
