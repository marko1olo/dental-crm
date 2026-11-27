import { ArrowLeftRight, MinusCircle, PlusCircle } from "lucide-react";
import React from "react";
import type { CashFlowMode } from "./types";

interface CashFlowModeTabsProps {
	readonly cashFlowMode: CashFlowMode;
	readonly onSelectMode: (mode: CashFlowMode) => void;
}

export const CashFlowModeTabs: React.FC<CashFlowModeTabsProps> = ({
	cashFlowMode,
	onSelectMode,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-1 p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
			<button
				type="button"
				onClick={() => onSelectMode("cash_in")}
				data-testid="tab-cash-in-mode"
				className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border ${
					cashFlowMode === "cash_in"
						? "bg-[var(--paper)] text-[var(--success)] shadow-xs border-[var(--line)]"
						: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
				}`}
			>
				<PlusCircle size={16} className="shrink-0" />
				<span>Внесение в кассу</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectMode("cash_out")}
				data-testid="tab-cash-out-mode"
				className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border ${
					cashFlowMode === "cash_out"
						? "bg-[var(--paper)] text-[var(--danger)] shadow-xs border-[var(--line)]"
						: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
				}`}
			>
				<MinusCircle size={16} className="shrink-0" />
				<span>Инкассация / Выемка</span>
			</button>

			<button
				type="button"
				onClick={() => onSelectMode("transfer")}
				data-testid="tab-cash-transfer-mode"
				className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border ${
					cashFlowMode === "transfer"
						? "bg-[var(--paper)] text-[var(--primary)] shadow-xs border-[var(--line)]"
						: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
				}`}
			>
				<ArrowLeftRight size={16} className="shrink-0" />
				<span>Межкассовый перевод</span>
			</button>
		</div>
	);
};
