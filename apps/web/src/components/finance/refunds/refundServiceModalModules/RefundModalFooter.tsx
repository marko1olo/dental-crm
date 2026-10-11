import React from "react";
import { ArrowLeftRight, Check, Printer, RotateCcw } from "lucide-react";
import type { PartialRefundCalculationResult } from "@dental/shared";
import type { RefundTabMode } from "./types";

export interface RefundModalFooterProps {
	readonly activeTab: RefundTabMode;
	readonly setActiveTab: (tab: RefundTabMode) => void;
	readonly onClose: () => void;
	readonly handleExecuteRefund: () => Promise<void>;
	readonly isProcessing: boolean;
	readonly hasSelection: boolean;
	readonly calculation: PartialRefundCalculationResult;
}

export const RefundModalFooter: React.FC<RefundModalFooterProps> = ({
	activeTab,
	setActiveTab,
	onClose,
	handleExecuteRefund,
	isProcessing,
	hasSelection,
	calculation,
}) => {
	return (
		<div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] shrink-0 gap-3">
			{activeTab === "form" ? (
				<>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-4 rounded-xl text-xs font-bold border border-[var(--border,#e2e8f0)] hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--muted,#64748b)] transition-all"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleExecuteRefund}
						disabled={isProcessing || !hasSelection}
						className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
					>
						<RotateCcw className="w-4 h-4" />
						<span>
							{isProcessing
								? "Проведение в кассе..."
								: `Провести возврат (${calculation.totalRefundRub.toLocaleString("ru-RU")} ₽)`}
						</span>
					</button>
				</>
			) : (
				<>
					<button
						type="button"
						onClick={() => setActiveTab("form")}
						className="min-h-[44px] px-4 rounded-xl text-xs font-bold border border-[var(--border,#e2e8f0)] hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--muted,#64748b)] transition-all flex items-center gap-2"
					>
						<ArrowLeftRight className="w-4 h-4" />
						<span>Вернуться к параметрам</span>
					</button>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => window.print()}
							className="min-h-[44px] px-4 rounded-xl text-xs font-bold border border-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] transition-all flex items-center gap-2"
						>
							<Printer className="w-4 h-4" />
							<span>Печать чека</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-md flex items-center gap-2"
						>
							<Check className="w-4 h-4" />
							<span>Готово</span>
						</button>
					</div>
				</>
			)}
		</div>
	);
};
