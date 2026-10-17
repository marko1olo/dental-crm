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
	readonly className?: string | undefined;
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
	className = "",
}) => {
	return (
		<div className={`lg:col-span-5 p-4 sm:p-5 flex flex-col gap-3 bg-[var(--paper-soft)] overflow-y-auto ${className}`} data-testid="ortho-protocol-preview-section">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FileText size={16} className="text-[var(--primary)]" />
					<span className="text-xs font-black uppercase tracking-wider text-[var(--ink)]">
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
						<span className="hidden sm:inline">Печать протокола</span>
						<span className="sm:hidden">Печать</span>
					</button>
					<button
						type="button"
						onClick={onCopyClipboard}
						className="secondary-button shrink-0 min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border border-[var(--line)]"
						title="Скопировать протокол в буфер"
					>
						<Copy size={13} />
						<span>Копировать</span>
					</button>
				</div>
			</div>

			{/* Preformatted Protocol Text Box */}
			<div className="flex-1 min-h-[300px] max-h-[460px] p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] font-mono text-xs text-[var(--ink)] overflow-y-auto whitespace-pre-wrap leading-relaxed select-text shadow-inner">
				{generatedProtocol}
			</div>

			{/* 1-Click Action Bar */}
			<div className="flex flex-col gap-2 pt-2 border-t border-[var(--line)]">
				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={onCopyPatientMemo}
						data-testid="ortho-copy-patient-memo-btn"
						className="secondary-button min-h-[48px] px-3.5 py-2 rounded-xl w-full justify-center shrink-0"
						title="Скопировать памятку по эластикам и уходу для отправки пациенту в WhatsApp/Telegram"
					>
						<Copy size={15} className="text-[var(--primary)] shrink-0" />
						<span className="hidden sm:inline">Скопировать для пациента</span>
						<span className="sm:hidden text-xs">Памятка</span>
					</button>

					<button
						type="button"
						onClick={onPrintPatientMemo}
						data-testid="ortho-print-patient-memo-btn"
						className="secondary-button min-h-[48px] px-3 py-2 rounded-xl w-full justify-center shrink-0"
						title="Распечатать памятку пациенту (A4)"
					>
						<Printer size={15} className="text-[var(--primary)] shrink-0" />
						<span className="hidden sm:inline">Печать памятки A4</span>
						<span className="sm:hidden text-xs">Печать A4</span>
					</button>
				</div>

				{/* Desktop action row; on mobile, handled by floating sticky bottom bar */}
				<div className="!hidden sm:!flex items-center gap-2">
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
