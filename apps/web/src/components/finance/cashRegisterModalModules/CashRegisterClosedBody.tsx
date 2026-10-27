import { Unlock, Zap } from "lucide-react";
import type React from "react";

export interface CashRegisterClosedBodyProps {
	readonly isProcessing: boolean;
	readonly onOpenShift: () => void;
}

export const CashRegisterClosedBody: React.FC<CashRegisterClosedBodyProps> = ({
	isProcessing,
	onOpenShift,
}) => (
	<div className="p-6 sm:p-8 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] text-center space-y-4">
		<div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center">
			<Zap className="w-8 h-8" />
		</div>
		<div className="max-w-md mx-auto space-y-1">
			<h3 className="text-base sm:text-lg font-bold text-[var(--ink)] m-0">
				Кассовая смена закрыта
			</h3>
			<p className="text-xs sm:text-sm text-[var(--muted)] m-0">
				Откройте кассовую смену для формирования чеков, приема оплат наличными,
				банковскими картами и СБП.
			</p>
		</div>
		<div className="pt-2 flex justify-center">
			<button
				type="button"
				onClick={onOpenShift}
				aria-busy={isProcessing}
				className="primary-button min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-[0.99]"
				data-testid="btn-1click-open-shift"
			>
				<Unlock size={16} />
				<span>Открыть кассовую смену</span>
			</button>
		</div>
	</div>
);
