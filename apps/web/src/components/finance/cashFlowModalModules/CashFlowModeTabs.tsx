import { MinusCircle, PlusCircle } from "lucide-react";
import type React from "react";

interface CashFlowModeTabsProps {
	readonly cashFlowMode: "cash_in" | "cash_out";
	readonly onSelectMode: (mode: "cash_in" | "cash_out") => void;
}

export const CashFlowModeTabs: React.FC<CashFlowModeTabsProps> = ({
	cashFlowMode,
	onSelectMode,
}) => {
	const isCashIn = cashFlowMode === "cash_in";
	return (
		<div className="grid grid-cols-2 gap-2 p-1 bg-[var(--paper-soft,#f1f5f9)] rounded-xl border border-[var(--line,rgba(0,0,0,0.06))]">
			<button
				type="button"
				onClick={() => onSelectMode("cash_in")}
				data-testid="tab-cash-in-mode"
				className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
					isCashIn
						? "bg-[var(--paper,#ffffff)] text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-500/30"
						: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
				}`}
			>
				<PlusCircle size={16} />
				<span>Внесение наличных в кассу</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectMode("cash_out")}
				data-testid="tab-cash-out-mode"
				className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
					!isCashIn
						? "bg-[var(--paper,#ffffff)] text-rose-700 dark:text-rose-400 shadow-xs border border-rose-500/30"
						: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
				}`}
			>
				<MinusCircle size={16} />
				<span>Инкассация / Выемка</span>
			</button>
		</div>
	);
};
