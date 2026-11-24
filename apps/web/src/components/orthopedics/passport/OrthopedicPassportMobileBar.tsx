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
		<div className="sm:hidden p-3 border-t border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md flex items-center gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] no-print shrink-0">
			<button
				type="button"
				onClick={onCopyText}
				className="min-h-[44px] h-11 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-sm font-medium text-[var(--ink)] inline-flex items-center justify-center gap-1.5 active:scale-95"
			>
				<Copy size={16} className="shrink-0 text-[var(--primary)]" />
				<span>Копия</span>
			</button>

			<button
				type="button"
				onClick={onPrint}
				className="min-h-[44px] h-11 flex-1 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-medium inline-flex items-center justify-center gap-2 shadow-sm active:scale-95"
			>
				<Printer size={16} className="shrink-0" />
				<span>Распечатать паспорт (А4)</span>
			</button>

			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] h-11 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] inline-flex items-center justify-center active:scale-95"
			>
				Закрыть
			</button>
		</div>
	);
}
