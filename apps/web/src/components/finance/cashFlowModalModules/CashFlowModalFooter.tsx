import { MinusCircle, PlusCircle } from "lucide-react";
import type React from "react";

interface CashFlowModalFooterProps {
	readonly cashFlowMode: "cash_in" | "cash_out";
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
	return (
		<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--line,rgba(0,0,0,0.1))] bg-[var(--paper-soft,#f8fafc)] shrink-0">
			<button
				type="button"
				onClick={onClose}
				data-testid="btn-cancel-cash-operation"
				className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line,rgba(0,0,0,0.15))] text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--glass-hover)] transition-all cursor-pointer"
			>
				Отмена
			</button>

			<button
				type="button"
				onClick={onSubmit}
				disabled={isProcessing}
				data-testid="btn-confirm-cash-operation"
				className={`min-h-[44px] px-6 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
					isCashIn
						? "bg-emerald-600 hover:bg-emerald-700"
						: "bg-rose-600 hover:bg-rose-700"
				}`}
			>
				{isCashIn ? <PlusCircle size={16} /> : <MinusCircle size={16} />}
				<span>
					{isCashIn
						? "Подтвердить внесение в кассу"
						: "Подтвердить изъятие / инкассацию"}
				</span>
			</button>
		</div>
	);
};
