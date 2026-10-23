import React from "react";
import { Printer, Copy } from "lucide-react";

export interface OrthopedicPassportMobileBarProps {
	readonly onCopyText: () => void;
	readonly onPrint: () => void;
	readonly onClose: () => void;
}

export function OrthopedicPassportMobileBar({
	onCopyText,
	onPrint,
	onClose,
}: OrthopedicPassportMobileBarProps) {
	return (
		<div className="sm:hidden p-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)]/95 backdrop-blur-md flex items-center gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] no-print shrink-0">
			<button
				type="button"
				onClick={onCopyText}
				className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 active:scale-95"
			>
				<Copy size={15} className="text-teal-600 dark:text-teal-400" />
				<span>Копия</span>
			</button>

			<button
				type="button"
				onClick={onPrint}
				className="min-h-[44px] flex-1 rounded-xl bg-teal-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md active:scale-95"
			>
				<Printer size={15} />
				<span>Распечатать паспорт (А4)</span>
			</button>

			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 active:scale-95"
			>
				Закрыть
			</button>
		</div>
	);
}
