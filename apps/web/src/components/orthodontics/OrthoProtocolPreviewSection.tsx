import React from "react";
import { Check, Copy, FileText, Printer, Receipt } from "lucide-react";

export interface OrthoProtocolPreviewSectionProps {
	readonly generatedProtocol: string;
	readonly onPrintOrthodonticCard: () => void;
	readonly onCopyClipboard: () => void;
	readonly onCopyPatientMemo: () => void;
	readonly onPrintPatientMemo: () => void;
	readonly onAddServicesToInvoice: () => void;
	readonly onApplyToVisitNote: () => void;
	readonly onClose: () => void;
	readonly calculatedServicesCount: number;
}

export const OrthoProtocolPreviewSection: React.FC<OrthoProtocolPreviewSectionProps> = ({
	generatedProtocol,
	onPrintOrthodonticCard,
	onCopyClipboard,
	onCopyPatientMemo,
	onPrintPatientMemo,
	onAddServicesToInvoice,
	onApplyToVisitNote,
	onClose,
	calculatedServicesCount,
}) => {
	return (
		<div className="lg:col-span-5 p-4 sm:p-5 flex flex-col gap-3 bg-[var(--surface,#f8fafc)]/60 dark:bg-slate-900/60 overflow-y-auto" data-testid="ortho-protocol-preview-section">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FileText size={16} className="text-amber-500" />
					<span className="text-xs font-black uppercase tracking-wider text-[var(--ink,#0f172a)] dark:text-slate-200">
						Дневник приёма
					</span>
				</div>

				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={onPrintOrthodonticCard}
						className="min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
						data-testid="print-ortho-protocol-btn"
						title="Распечатать карту"
						aria-label="Печать протокола"
					>
						<Printer size={13} />
						<span>Печать протокола</span>
					</button>
					<button
						type="button"
						onClick={onCopyClipboard}
						className="min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
						title="Скопировать протокол в буфер"
					>
						<Copy size={13} />
						<span>Копировать</span>
					</button>
				</div>
			</div>

			{/* Preformatted Protocol Text Box */}
			<div className="flex-1 min-h-[300px] max-h-[460px] p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text shadow-inner">
				{generatedProtocol}
			</div>

			{/* 1-Click Action Bar */}
			<div className="flex flex-col gap-2 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={onCopyPatientMemo}
						data-testid="ortho-copy-patient-memo-btn"
						className="min-h-[48px] px-3.5 py-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
						title="Скопировать памятку по эластикам и уходу для отправки пациенту в WhatsApp/Telegram"
					>
						<Copy size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="hidden sm:inline">Скопировать для пациента</span>
						<span className="sm:hidden">Памятка</span>
					</button>

					<button
						type="button"
						onClick={onPrintPatientMemo}
						data-testid="ortho-print-patient-memo-btn"
						className="min-h-[48px] px-3 py-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
						title="Распечатать памятку пациенту (A4)"
					>
						<Printer size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Печать памятки A4</span>
					</button>
				</div>

				<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
					<button
						type="button"
						onClick={onPrintOrthodonticCard}
						className="min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
						data-testid="bottom-print-protocol-btn"
						title="Распечатать карту"
						aria-label="Печать протокола"
					>
						<Printer size={15} />
						<span>Печать</span>
					</button>

					<button
						type="button"
						onClick={onAddServicesToInvoice}
						className="min-h-[44px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
						data-testid="bottom-add-services-to-invoice-btn"
						title="Начислить услуги в чек/смету"
						aria-label="Начислить услуги в чек/смету"
					>
						<Receipt size={15} />
						<span>Услуги ({calculatedServicesCount})</span>
					</button>

					<button
						type="button"
						onClick={onApplyToVisitNote}
						className="flex-1 min-h-[44px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
						data-testid="bottom-apply-protocol-btn"
						title="Вставить в медицинскую карту"
						aria-label="В медицинскую карту"
					>
						<Check size={16} />
						<span>Вставить в карту</span>
					</button>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
					>
						Отмена
					</button>
				</div>
			</div>
		</div>
	);
};
