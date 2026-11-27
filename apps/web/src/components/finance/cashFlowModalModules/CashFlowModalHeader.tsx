import { ArrowLeftRight, MinusCircle, PlusCircle, X } from "lucide-react";
import React from "react";
import type { CashFlowMode } from "./types";

interface CashFlowModalHeaderProps {
	readonly cashFlowMode: CashFlowMode;
	readonly onClose: () => void;
}

export const CashFlowModalHeader: React.FC<CashFlowModalHeaderProps> = ({
	cashFlowMode,
	onClose,
}) => {
	const isCashIn = cashFlowMode === "cash_in";
	const isTransfer = cashFlowMode === "transfer";
	return (
		<div className="flex items-center justify-between min-h-14 py-3 px-4 sm:px-6 border-b border-[var(--line)] bg-[var(--paper-soft)]/50 shrink-0 gap-3">
			<div className="flex items-center gap-2.5">
				<div
					className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
						isTransfer
							? "bg-[var(--primary-soft)] text-[var(--primary)]"
							: isCashIn
								? "bg-[var(--success-soft)] text-[var(--success)]"
								: "bg-[var(--danger-soft)] text-[var(--danger)]"
					}`}
				>
					{isTransfer ? (
						<ArrowLeftRight size={18} />
					) : isCashIn ? (
						<PlusCircle size={18} />
					) : (
						<MinusCircle size={18} />
					)}
				</div>
				<div>
					<h3 className="text-base font-semibold text-[var(--ink)]">
						{isTransfer
							? "Межкассовый перевод средств"
							: isCashIn
								? "Внесение наличных в кассу"
								: "Инкассация / Выемка из кассы"}
					</h3>
					<p className="text-xs text-[var(--ink-muted)]">
						Кассовый ордер и операции клиники
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				data-testid="btn-close-cash-flow-modal"
				className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
				title="Закрыть"
			>
				<X size={18} />
			</button>
		</div>
	);
};
