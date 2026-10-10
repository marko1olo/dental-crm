import React from "react";
import { Check, Copy, Printer, Receipt, Calendar } from "lucide-react";
import type { OrthodonticProtocolFooterProps } from "./types";

export const OrthodonticProtocolFooter: React.FC<OrthodonticProtocolFooterProps> = ({
	onPrintOrthodonticCard,
	onCopyPatientMemo,
	onPrintPatientMemo,
	onAddServicesToInvoice,
	onApplyToVisitNote,
	onClose,
	calculatedServicesCount,
	nextAlignerDateStr,
}) => {
	return (
		<div
			data-testid="ortho-protocol-footer"
			className="flex flex-col gap-2 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800"
		>
			{nextAlignerDateStr && (
				<div className="flex items-center justify-between px-1 text-[11.5px] text-[var(--muted,#64748b)] dark:text-slate-400">
					<span className="flex items-center gap-1">
						<Calendar size={13} className="text-teal-600 dark:text-teal-400" />
						Следующий плановый визит / смена:
					</span>
					<span className="font-bold text-teal-700 dark:text-teal-300">
						{nextAlignerDateStr}
					</span>
				</div>
			)}

			<div className="grid grid-cols-2 gap-2">
				<button
					type="button"
					onClick={onCopyPatientMemo}
					data-testid="ortho-copy-patient-memo-btn"
					className="secondary-button min-h-[44px] px-3.5 py-2 rounded-xl w-full justify-center shrink-0 cursor-pointer"
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
					className="secondary-button min-h-[44px] w-full justify-center shrink-0 cursor-pointer"
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
					className="secondary-button shrink-0 min-h-[40px] cursor-pointer"
					data-testid="bottom-print-protocol-btn"
					title="Распечатать медицинскую карту"
					aria-label="Печать протокола"
				>
					<Printer size={15} />
					<span>Печать</span>
				</button>

				<button
					type="button"
					onClick={onAddServicesToInvoice}
					className="secondary-button shrink-0 min-h-[40px] cursor-pointer"
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
					className="primary-button flex-1 justify-center shrink-0 whitespace-nowrap min-w-fit min-h-[40px] cursor-pointer"
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
					className="secondary-button shrink-0 min-h-[40px] cursor-pointer"
				>
					<span>Отмена</span>
				</button>
			</div>
		</div>
	);
};
