import { MinusCircle, PlusCircle, X } from "lucide-react";
import type React from "react";

interface CashFlowModalHeaderProps {
	readonly cashFlowMode: "cash_in" | "cash_out";
	readonly onClose: () => void;
}

export const CashFlowModalHeader: React.FC<CashFlowModalHeaderProps> = ({
	cashFlowMode,
	onClose,
}) => {
	const isCashIn = cashFlowMode === "cash_in";
	return (
		<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line,rgba(0,0,0,0.1))] bg-[var(--paper-soft,#f8fafc)] shrink-0">
			<div className="flex items-center gap-2.5">
				<div
					className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
						isCashIn
							? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
							: "bg-rose-500/15 text-rose-600 dark:text-rose-400"
					}`}
				>
					{isCashIn ? <PlusCircle size={20} /> : <MinusCircle size={20} />}
				</div>
				<div>
					<h3 className="text-base font-extrabold text-[var(--ink,#0f172a)]">
						{isCashIn
							? "Внесение наличных в кассу (Приход)"
							: "Инкассация / Выемка из кассы (Расход)"}
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)]">
						Кассовый ордер и операции клиники
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				data-testid="btn-close-cash-flow-modal"
				className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--glass-hover)] transition-colors cursor-pointer"
				title="Закрыть"
			>
				<X size={20} />
			</button>
		</div>
	);
};
