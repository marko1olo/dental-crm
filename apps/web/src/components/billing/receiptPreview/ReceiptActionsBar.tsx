/**
 * apps/web/src/components/billing/receiptPreview/ReceiptActionsBar.tsx
 *
 * Action buttons bar for ReceiptPreview: Format switcher (80mm vs A4), Print, Copy.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Printer, Copy, Check, FileText, Receipt } from "lucide-react";
import { showToast } from "../../GlobalToast.js";

interface ReceiptActionsBarProps {
	readonly format: "80mm" | "a4";
	readonly setFormat: (f: "80mm" | "a4") => void;
	readonly onPrint: () => void;
	readonly isCopied: boolean;
	readonly onCopy: () => void;
}

export const ReceiptActionsBar: React.FC<ReceiptActionsBarProps> = ({
	format,
	setFormat,
	onPrint,
	isCopied,
	onCopy,
}) => {
	return (
		<div className="flex items-center justify-between gap-1.5 p-1.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] min-w-0">
			{/* Format Switcher */}
			<div className="receipt-format-segmented shrink-0" role="tablist">
				<button
					type="button"
					onClick={() => setFormat("80mm")}
					className={`receipt-format-btn ${format === "80mm" ? "is-active" : ""}`}
					data-testid="btn-format-80mm"
					title="Термолента 80мм"
				>
					<Receipt size={13} className="mr-1 shrink-0" />
					<span>80мм</span>
				</button>
				<button
					type="button"
					onClick={() => setFormat("a4")}
					className={`receipt-format-btn ${format === "a4" ? "is-active" : ""}`}
					data-testid="btn-format-a4"
					title="Товарный чек в формате А4"
				>
					<FileText size={13} className="mr-1 shrink-0" />
					<span>А4</span>
				</button>
			</div>

			{/* Action buttons */}
			<div className="flex items-center gap-1 shrink-0">
				<button
					type="button"
					onClick={onCopy}
					className="h-7 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1 cursor-pointer transition-colors shrink-0"
					data-testid="btn-copy-receipt-text"
					title="Скопировать реквизиты чека"
				>
					{isCopied ? (
						<>
							<Check size={12} className="text-emerald-600 shrink-0" />
							<span className="text-emerald-600">Скопировано</span>
						</>
					) : (
						<>
							<Copy size={12} className="text-[var(--muted,#64748b)] shrink-0" />
							<span>Копия</span>
						</>
					)}
				</button>
				<button
					type="button"
					onClick={onPrint}
					className="h-7 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all shrink-0"
					data-testid="btn-print-receipt-tape"
					title="Распечатать чек на термопринтере или А4"
				>
					<Printer size={12} className="shrink-0" />
					<span>Печать</span>
				</button>
			</div>
		</div>
	);
};
