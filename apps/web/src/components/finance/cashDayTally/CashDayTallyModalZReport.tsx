import React, { useState } from "react";
import { CheckCheck, Copy, FileText, Printer, X } from "lucide-react";
import type { ShiftCloseZReport54FzResult } from "../fiscalReceiptEngine";
import { CashDayTallyZReportReceipt } from "./CashDayTallyZReportReceipt";

interface CashDayTallyModalZReportProps {
	readonly isOpen: boolean;
	readonly zReportData: ShiftCloseZReport54FzResult | null;
	readonly onClose: () => void;
	readonly onCopyText: () => Promise<void>;
	readonly isCopied: boolean;
}

export function CashDayTallyModalZReport({
	isOpen,
	zReportData,
	onClose,
	onCopyText,
	isCopied,
}: CashDayTallyModalZReportProps) {
	const [isPrinting, setIsPrinting] = useState(false);

	if (!isOpen || !zReportData) return null;

	const handlePrint = () => {
		setIsPrinting(true);
		setTimeout(() => {
			window.print();
			setIsPrinting(false);
		}, 300);
	};

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="z-report-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper)] text-[var(--ink,#0f172a)] overflow-hidden">
				{/* Заголовок модалки */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-2">
						<FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
						<div>
							<h3 id="z-report-modal-title" className="text-base sm:text-lg font-bold m-0 text-[var(--ink,#0f172a)]">
								Отчет о закрытии смены (Фискальный Z-отчет)
							</h3>
							<span className="text-xs text-[var(--muted,#64748b)]">
								Кассовый чек • Смена №{zReportData.shiftNumber} • ФД №{zReportData.fiscalDocumentNumber}
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Тело Z-отчета */}
				<div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-[var(--paper-soft,#f8fafc)]">
					<CashDayTallyZReportReceipt zReportData={zReportData} />
				</div>

				{/* Футер с кнопками печати и копирования */}
				<div className="sticky bottom-0 z-10 p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between flex-wrap gap-2 bg-[var(--paper-soft,#f8fafc)] shadow-lg">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onCopyText}
							className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] text-xs font-bold bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] dark:hover:bg-[var(--paper)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
						>
							{isCopied ? <CheckCheck size={16} className="text-emerald-600" /> : <Copy size={16} />}
							<span>{isCopied ? "Скопировано!" : "Скопировать текст"}</span>
						</button>
						<button
							type="button"
							onClick={handlePrint}
							disabled={isPrinting}
							className="min-h-[44px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
						>
							<Printer size={16} />
							<span>{isPrinting ? "Печать..." : "Печать Z-отчета"}</span>
						</button>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper)] dark:bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] dark:hover:bg-[var(--paper)] cursor-pointer whitespace-nowrap"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}
