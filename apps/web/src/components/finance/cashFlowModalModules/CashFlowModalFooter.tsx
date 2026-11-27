import { ArrowLeftRight, MinusCircle, PlusCircle } from "lucide-react";
import React from "react";
import type { CashFlowMode } from "./types";

interface CashFlowModalFooterProps {
	readonly cashFlowMode: CashFlowMode;
	readonly isProcessing: boolean;
	readonly onClose: () => void;
	readonly onSubmit: () => void;
}

export const CashFlowModalFooter: React.FC<CashFlowModalFooterProps> = ({
	cashFlowMode,
	isProcessing,
	onClose,
	onSubmit,
}) => {
	const isCashIn = cashFlowMode === "cash_in";
	const isTransfer = cashFlowMode === "transfer";
	return (
		<div className="flex items-center justify-end gap-3 min-h-16 py-3 px-4 sm:px-6 border-t border-[var(--line)] bg-[var(--paper-soft)]/50 shrink-0">
			<button
				type="button"
				onClick={onClose}
				data-testid="btn-cancel-cash-operation"
				className="h-11 sm:h-9 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-sm font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer shrink-0"
			>
				Отмена
			</button>

			<button
				type="button"
				onClick={() => {
					if (!isProcessing) onSubmit();
				}}
				aria-busy={isProcessing}
				data-testid="btn-confirm-cash-operation"
				className={`h-11 sm:h-9 px-4 rounded-lg text-sm font-medium text-white shadow-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 flex-1 sm:flex-initial whitespace-nowrap ${
					cashFlowMode === "cash_out"
						? "bg-[var(--danger)] hover:opacity-90"
						: "bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
				}`}
			>
				{isTransfer ? (
					<ArrowLeftRight size={16} className="shrink-0" />
				) : isCashIn ? (
					<PlusCircle size={16} className="shrink-0" />
				) : (
					<MinusCircle size={16} className="shrink-0" />
				)}
				<span>
					{isTransfer
						? "Перевести между кассами"
						: isCashIn
							? "Провести внесение"
							: "Провести изъятие"}
				</span>
			</button>
		</div>
	);
};
