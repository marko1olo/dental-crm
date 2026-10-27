import React from "react";
import type { Dashboard } from "@dental/shared";
import { CreditCard, ReceiptText, PlusCircle } from "lucide-react";

export interface FinanceToolbarActionsProps {
	readonly billingSummary: Dashboard["billingSummary"] | null;
	readonly onPayDebtQuick: () => void;
	readonly money: (val: number | null) => string;
	readonly onOpenInvoices: () => void;
	readonly onOpenQuickExpense?: (() => void) | undefined;
	readonly children?: React.ReactNode;
}

export function FinanceToolbarActions({
	billingSummary,
	onPayDebtQuick,
	money,
	onOpenInvoices,
	onOpenQuickExpense,
	children,
}: FinanceToolbarActionsProps): React.JSX.Element {
	return (
		<div className="finance-header-actions flex items-center gap-1.5 shrink-0 flex-nowrap">
			{billingSummary && billingSummary.totalDueRub > 0 && (
				<button
					className="secondary-button min-h-[36px] sm:min-h-0 sm:h-7 inline-flex items-center gap-1 font-bold text-xs px-2 sm:px-2.5 py-0 cursor-pointer bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/20 active:scale-95 transition-all rounded-lg shrink-0"
					type="button"
					onClick={onPayDebtQuick}
					title={`Быстрая оплата остатка долга: ${money(billingSummary.totalDueRub)}`}
					aria-label="Оплатить долг"
					data-testid="btn-finance-pay-debt-quick"
					data-tour="cashier-pay"
				>
					<CreditCard size={13} className="shrink-0 text-rose-600 dark:text-rose-400" />
					<span className="truncate hidden sm:inline">
						Оплатить долг ({money(billingSummary.totalDueRub)})
					</span>
					<span className="truncate sm:hidden">
						{money(billingSummary.totalDueRub)}
					</span>
				</button>
			)}
			<button
				className="secondary-button min-h-[36px] sm:min-h-0 sm:h-7 inline-flex items-center gap-1 font-semibold text-xs px-2 sm:px-2.5 py-0 cursor-pointer rounded-lg shrink-0"
				type="button"
				onClick={onOpenInvoices}
				aria-label="Счета и акты"
				data-testid="btn-finance-open-invoices"
				title="Счета и акты"
			>
				<ReceiptText size={13} className="shrink-0" />
				<span className="truncate hidden sm:inline">Счета и акты</span>
			</button>
			{onOpenQuickExpense && (
				<button
					className="secondary-button hidden sm:inline-flex min-h-[36px] sm:min-h-0 sm:h-7 items-center gap-1 font-semibold text-xs px-2 sm:px-2.5 py-0 cursor-pointer rounded-lg shrink-0 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/10 active:scale-95 transition-all"
					type="button"
					onClick={onOpenQuickExpense}
					aria-label="Внести расход"
					data-testid="btn-finance-open-quick-expense"
					title="Внесение чека расхода (аренда, материалы, коммуналка)"
				>
					<PlusCircle size={13} className="shrink-0 text-rose-600 dark:text-rose-400" />
					<span className="truncate">+ Расход</span>
				</button>
			)}
			{children}
		</div>
	);
}
