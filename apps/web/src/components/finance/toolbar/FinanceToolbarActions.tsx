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
					className="secondary-button min-h-[44px] sm:min-h-[28px] sm:h-7 inline-flex items-center gap-1 font-bold text-xs px-2 sm:px-2.5 py-0 cursor-pointer bg-[var(--teal-surface,rgba(13,148,136,0.08))] text-[var(--teal-strong,#0f766e)] dark:text-[var(--teal,#2dd4bf)] border border-[var(--teal,#0d9488)]/30 hover:bg-[var(--teal-surface,rgba(13,148,136,0.15))] active:scale-95 transition-all rounded-lg shrink-0"
					type="button"
					onClick={onPayDebtQuick}
					title={`Быстрая оплата остатка долга: ${money(billingSummary.totalDueRub)}`}
					aria-label="Оплатить долг"
					data-testid="btn-finance-pay-debt-quick"
					data-tour="cashier-pay"
				>
					<CreditCard size={13} className="shrink-0 text-[var(--teal,#0d9488)] dark:text-[var(--teal,#2dd4bf)]" />
					<span className="truncate hidden sm:inline">
						Оплатить долг ({money(billingSummary.totalDueRub)})
					</span>
					<span className="truncate sm:hidden">
						{money(billingSummary.totalDueRub)}
					</span>
				</button>
			)}
			<button
				className="secondary-button min-h-[44px] sm:min-h-[28px] sm:h-7 inline-flex items-center gap-1 font-semibold text-xs px-2 sm:px-2.5 py-0 cursor-pointer rounded-lg shrink-0 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors"
				type="button"
				onClick={onOpenInvoices}
				aria-label="Счета и акты"
				data-testid="btn-finance-open-invoices"
				title="Счета и акты"
			>
				<ReceiptText size={13} className="shrink-0 text-[var(--muted)]" />
				<span className="truncate hidden sm:inline">Счета и акты</span>
			</button>
			{onOpenQuickExpense && (
				<button
					className="secondary-button hidden sm:inline-flex min-h-[44px] sm:min-h-[28px] sm:h-7 items-center gap-1 font-semibold text-xs px-2 sm:px-2.5 py-0 cursor-pointer rounded-lg shrink-0 text-[var(--ink)] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all"
					type="button"
					onClick={onOpenQuickExpense}
					aria-label="Внести расход"
					data-testid="btn-finance-open-quick-expense"
					title="Внесение чека расхода (аренда, материалы, коммуналка)"
				>
					<PlusCircle size={13} className="shrink-0 text-[var(--muted)]" />
					<span className="truncate">+ Расход</span>
				</button>
			)}
			{children}
		</div>
	);
}
