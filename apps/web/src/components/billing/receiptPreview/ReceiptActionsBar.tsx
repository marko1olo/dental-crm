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
		<div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)]">
			{/* Format Switcher */}
			<div className="receipt-format-segmented" role="tablist">
				<button
					type="button"
					onClick={() => setFormat("80mm")}
					className={`receipt-format-btn ${format === "80mm" ? "is-active" : ""}`}
					data-testid="btn-format-80mm"
				>
					<Receipt size={13} className="mr-1" />
					<span>Лента 80мм</span>
				</button>
				<button
					type="button"
					onClick={() => setFormat("a4")}
					className={`receipt-format-btn ${format === "a4" ? "is-active" : ""}`}
					data-testid="btn-format-a4"
				>
					<FileText size={13} className="mr-1" />
					<span>Товарный чек А4</span>
				</button>
			</div>

			{/* Action buttons */}
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={onCopy}
					className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1 cursor-pointer transition-colors"
					data-testid="btn-copy-receipt-text"
					title="Скопировать реквизиты чека"
				>
					{isCopied ? (
						<>
							<Check size={13} className="text-emerald-600" />
							<span className="text-emerald-600">Скопировано</span>
						</>
					) : (
						<>
							<Copy size={13} className="text-[var(--muted,#64748b)]" />
							<span>Копия</span>
						</>
					)}
				</button>
				<button
					type="button"
					onClick={onPrint}
					className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
					data-testid="btn-print-receipt-tape"
					title="Распечатать чек на термопринтере или А4"
				>
					<Printer size={13} />
					<span>Печать</span>
				</button>
			</div>
		</div>
	);
};
