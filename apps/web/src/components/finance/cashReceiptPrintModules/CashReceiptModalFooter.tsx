import React from "react";
import { Check, Copy, Printer } from "lucide-react";
import type { FiscalReceipt54FzResult } from "../fiscalReceiptEngine.js";

export interface CashReceiptModalFooterProps {
	readonly effectiveReceipt: FiscalReceipt54FzResult;
	readonly isCopied: boolean;
	readonly onPrint: () => void;
	readonly onCopyText: () => void;
	readonly onClose: () => void;
}

export const CashReceiptModalFooter: React.FC<CashReceiptModalFooterProps> = ({
	effectiveReceipt,
	isCopied,
	onPrint,
	onCopyText,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-3">
			<div className="text-xs text-[var(--muted)] flex items-center gap-1.5 font-mono">
				<span>ИТОГО:</span>
				<strong className="text-sm font-bold text-[var(--ink)]">
					{effectiveReceipt.totalRub.toLocaleString("ru-RU")} ₽
				</strong>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onCopyText}
					className="h-9 px-3 rounded-xl border border-[var(--line)] font-bold text-xs bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
					data-testid="btn-copy-receipt-text"
				>
					{isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
					<span>{isCopied ? "Скопировано!" : "Скопировать"}</span>
				</button>

				<button
					type="button"
					onClick={onPrint}
					className="h-9 px-4 rounded-xl font-bold text-xs bg-[var(--teal,#0d9488)] text-white hover:opacity-90 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
					data-testid="btn-print-receipt-final"
				>
					<Printer className="w-3.5 h-3.5" />
					<span>Печать</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					className="h-9 px-3.5 rounded-xl border border-[var(--line)] font-bold text-xs bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
				>
					Закрыть
				</button>
			</div>
		</div>
	);
};
