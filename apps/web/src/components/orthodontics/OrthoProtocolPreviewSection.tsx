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
						className="secondary-button shrink-0"
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
						className="secondary-button shrink-0 min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border"
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
						className="secondary-button min-h-[48px] px-3.5 py-2 rounded-xl w-full justify-center shrink-0"
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
						className="secondary-button w-full justify-center shrink-0"
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
						className="secondary-button shrink-0"
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
						className="secondary-button shrink-0"
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
						className="primary-button flex-1 justify-center shrink-0 whitespace-nowrap min-w-fit"
						data-testid="bottom-apply-protocol-btn"
						title="Вставить протокол в медицинскую карту"
						aria-label="В медицинскую карту"
					>
						<Check size={16} />
						<span>В карту</span>
					</button>

					<button
						type="button"
						onClick={onClose}
						className="secondary-button shrink-0"
					>
						<span>Отмена</span>
					</button>
				</div>
			</div>
		</div>
	);
};
