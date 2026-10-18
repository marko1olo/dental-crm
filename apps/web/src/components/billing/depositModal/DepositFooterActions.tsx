/**
 * apps/web/src/components/billing/depositModal/DepositFooterActions.tsx
 *
 * Action buttons for DepositTopupModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { formatDisplayCurrency } from "@dental/shared";

interface DepositFooterActionsProps {
	readonly amountRub: number;
	readonly isSubmitting: boolean;
	readonly isCompleted: boolean;
	readonly onClose: () => void;
	readonly onExecute: () => void;
}

export const DepositFooterActions: React.FC<DepositFooterActionsProps> = ({
	amountRub,
	isSubmitting,
	isCompleted,
	onClose,
	onExecute,
}) => {
	return (
		<div className="px-4 py-3 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3 shrink-0">
			<button
				type="button"
				onClick={onClose}
				className="px-4 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-sm font-semibold text-[var(--ink,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
				data-testid="btn-cancel-deposit-topup"
			>
				Отмена
			</button>

			<button
				type="button"
				onClick={onExecute}
				disabled={amountRub <= 0 || isSubmitting || isCompleted}
				className="flex-1 md:flex-none md:min-w-[260px] h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
				data-testid="btn-submit-deposit-topup"
			>
				{isCompleted ? (
					<>
						<CheckCircle2 size={18} />
						<span>Баланс пополнен</span>
					</>
				) : isSubmitting ? (
					<span>Внесение аванса...</span>
				) : (
					<>
						<span>Пополнить на {formatDisplayCurrency(amountRub)}</span>
						<ArrowRight size={16} />
					</>
				)}
			</button>
		</div>
	);
};
