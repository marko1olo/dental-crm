import React from "react";
import { Receipt, ShieldCheck, X } from "lucide-react";
import type { FiscalReceipt54FzResult } from "../fiscalReceiptEngine.js";

export interface CashReceiptModalHeaderProps {
	readonly effectiveReceipt: FiscalReceipt54FzResult;
	readonly format: "80mm" | "a4";
	readonly onSetFormat: (f: "80mm" | "a4") => void;
	readonly onClose: () => void;
}

export const CashReceiptModalHeader: React.FC<CashReceiptModalHeaderProps> = ({
	effectiveReceipt,
	format,
	onSetFormat,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
			<div className="flex items-center gap-2.5">
				{effectiveReceipt.isWarrantyZeroAct ? (
					<ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
				) : (
					<Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
				)}
				<div>
					<h3
						id="cash-receipt-modal-title"
						className="text-sm font-bold m-0 text-[var(--ink)] flex items-center gap-2"
					>
						<span>
							{effectiveReceipt.isWarrantyZeroAct
								? "Гарантийный акт (0 ₽)"
								: "Кассовый чек и слип"}
						</span>
						<span
							className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
								effectiveReceipt.isWarrantyZeroAct
									? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
									: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
							}`}
						>
							{effectiveReceipt.isWarrantyZeroAct ? "Гарантия 100%" : "Онлайн-чек"}
						</span>
					</h3>
					<p className="text-[11px] text-[var(--muted)] m-0">
						{effectiveReceipt.isWarrantyZeroAct ? "Акт" : "Чек"} №{effectiveReceipt.receiptNumber} · {effectiveReceipt.receiptDateRu}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1 bg-[var(--paper)] p-1 rounded-lg border border-[var(--line)] text-xs font-semibold">
					<button
						type="button"
						onClick={() => onSetFormat("80mm")}
						style={format === "80mm" ? { color: "#ffffff", backgroundColor: "#0d9488" } : undefined}
						className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
							format === "80mm"
								? "bg-teal-600 text-white shadow-2xs font-bold"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="format-80mm-btn"
					>
						Лента 80мм
					</button>
					<button
						type="button"
						onClick={() => onSetFormat("a4")}
						style={format === "a4" ? { color: "#ffffff", backgroundColor: "#0d9488" } : undefined}
						className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
							format === "a4"
								? "bg-teal-600 text-white shadow-2xs font-bold"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="format-a4-btn"
					>
						А4 Товарный чек
					</button>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="w-8 h-8 rounded-lg border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shrink-0"
					aria-label="Закрыть окно чека"
					data-testid="btn-close-receipt-modal"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
};
