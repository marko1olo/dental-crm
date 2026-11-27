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
		<div className="flex items-center justify-between sm:justify-end px-4 sm:px-6 py-3 sm:py-0 sm:h-16 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]/50 shrink-0 gap-3">
			{activeTab === "form" ? (
				<>
					<button
						type="button"
						onClick={onClose}
						className="h-9 max-sm:min-h-[44px] max-sm:h-11 px-3.5 max-sm:px-4 rounded-lg max-sm:rounded-xl text-sm font-medium bg-[var(--paper,#ffffff)] dark:bg-white/5 border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] inline-flex items-center justify-center shrink-0 whitespace-nowrap cursor-pointer transition-colors"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={isProcessing ? undefined : handleExecuteRefund}
						className="flex-1 sm:flex-none h-9 max-sm:min-h-[44px] max-sm:h-11 px-4 rounded-lg max-sm:rounded-xl text-xs sm:text-sm font-medium bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white transition-colors shadow-sm inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap cursor-pointer"
					>
						<RotateCcw className="w-4 h-4 shrink-0" />
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
						className="h-9 max-sm:min-h-[44px] max-sm:h-11 px-3.5 max-sm:px-4 rounded-lg max-sm:rounded-xl text-sm font-medium bg-[var(--paper,#ffffff)] dark:bg-white/5 border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] transition-colors inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap cursor-pointer"
					>
						<ArrowLeftRight className="w-4 h-4 shrink-0" />
						<span>К параметрам</span>
					</button>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={() => window.print()}
							className="h-9 max-sm:min-h-[44px] max-sm:h-11 px-3.5 max-sm:px-4 rounded-lg max-sm:rounded-xl text-sm font-medium bg-[var(--paper,#ffffff)] dark:bg-white/5 border border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] transition-colors inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap cursor-pointer"
						>
							<Printer className="w-4 h-4 shrink-0" />
							<span>Печать</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="h-9 max-sm:min-h-[44px] max-sm:h-11 px-4 rounded-lg max-sm:rounded-xl text-sm font-medium bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white transition-colors shadow-sm inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap cursor-pointer"
						>
							<Check className="w-4 h-4 shrink-0" />
							<span>Готово</span>
						</button>
					</div>
				</>
			)}
		</div>
	);
};
