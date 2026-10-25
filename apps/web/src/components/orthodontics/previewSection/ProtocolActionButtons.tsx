import React from "react";
import { Check, Copy, Printer, Receipt } from "lucide-react";

export interface ProtocolActionButtonsProps {
	readonly onCopyPatientMemo: () => void;
	readonly onPrintPatientMemo: () => void;
	readonly onApplyToVisitNote: () => void;
	readonly onPrintOrthodonticCard: () => void;
	readonly onAddServicesToInvoice: () => void;
	readonly onClose: () => void;
	readonly calculatedServicesCount: number;
}

export const ProtocolActionButtons: React.FC<ProtocolActionButtonsProps> = ({
	onCopyPatientMemo,
	onPrintPatientMemo,
	onApplyToVisitNote,
	onPrintOrthodonticCard,
	onAddServicesToInvoice,
	onClose,
	calculatedServicesCount,
}) => {
	return (
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

			<div className="!hidden sm:!flex flex-col gap-2">
				<button
					type="button"
					onClick={onApplyToVisitNote}
					className="primary-button w-full h-10 min-h-[40px] px-4 rounded-xl text-xs sm:text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
					data-testid="bottom-apply-protocol-btn"
					title="Мгновенно зафиксировать ортодонтический протокол в дневник приёма (SOAP) и начислить услуги"
					aria-label="Зафиксировать ортодонтический протокол"
				>
					<Check size={16} />
					<span>Зафиксировать ортодонтический протокол</span>
				</button>

				<div className="flex items-center justify-between gap-1.5">
					<div className="flex items-center gap-1.5 min-w-0">
						<button
							type="button"
							onClick={onPrintOrthodonticCard}
							className="secondary-button h-8 px-2.5 rounded-lg text-xs font-semibold shrink-0"
							data-testid="bottom-print-protocol-btn"
							title="Распечатать карту"
							aria-label="Печать протокола"
						>
							<Printer size={14} />
							<span>Печать</span>
						</button>

						<button
							type="button"
							onClick={onAddServicesToInvoice}
							className="secondary-button h-8 px-2.5 rounded-lg text-xs font-semibold shrink-0"
							data-testid="bottom-add-services-to-invoice-btn"
							title="Начислить услуги в чек/смету"
							aria-label="Начислить услуги в чек/смету"
						>
							<Receipt size={14} />
							<span>Услуги ({calculatedServicesCount})</span>
						</button>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="secondary-button h-8 px-2.5 rounded-lg text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
						data-testid="bottom-close-widget-btn"
						title="Закрыть протокол"
					>
						<span>Закрыть</span>
					</button>
				</div>
			</div>
		</div>
	);
};
