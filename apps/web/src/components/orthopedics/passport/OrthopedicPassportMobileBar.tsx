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
				className="min-h-[44px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)] flex items-center justify-center gap-1.5 active:scale-95"
			>
				<Copy size={15} className="text-[var(--primary)]" />
				<span>Копия</span>
			</button>

			<button
				type="button"
				onClick={onPrint}
				className="min-h-[44px] flex-1 rounded-xl bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95"
			>
				<Printer size={15} />
				<span>Распечатать паспорт (А4)</span>
			</button>

			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] px-3 rounded-xl border border-[var(--line)] text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] active:scale-95"
			>
				Закрыть
			</button>
		</div>
	);
}
