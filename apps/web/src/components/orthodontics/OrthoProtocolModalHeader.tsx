import React from "react";
import { CheckCircle2, Printer, Receipt, X } from "lucide-react";
import { BracesBracket } from "../icons/DentalIcons";

export interface OrthoProtocolModalHeaderProps {
	patientName: string;
	onPrintOrthodonticCard: () => void;
	onAddServicesToInvoice: () => void;
	onApplyToVisitNote: () => void;
	onClose: () => void;
	calculatedServicesCount: number;
	onSetMasterPhysiologicalNorm?: () => void;
}

export const OrthoProtocolModalHeader: React.FC<OrthoProtocolModalHeaderProps> = ({
	patientName,
	onPrintOrthodonticCard,
	onAddServicesToInvoice,
	onApplyToVisitNote,
	onClose,
	calculatedServicesCount,
	onSetMasterPhysiologicalNorm,
}) => {
	return (
		<div className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper)] border-b border-[var(--line)] shrink-0">
			<div className="flex items-center gap-2.5 min-w-0 mr-2 shrink-0">
				<div className="w-8 h-8 rounded-xl bg-[var(--paper-soft)] text-[var(--primary)] flex items-center justify-center border border-[var(--line)] shrink-0">
					<BracesBracket size={18} />
				</div>
				<div className="min-w-0">
					<h2 id="ortho-protocol-title" className="text-sm font-bold text-[var(--ink)] m-0 whitespace-nowrap">
						Ортодонтический протокол приёма
					</h2>
					<p className="text-xs text-[var(--muted)] m-0 truncate">
						{patientName} · Брекеты, дуги, сечения и эластики
					</p>
				</div>
			</div>

			<div className="flex items-center gap-1.5 shrink-0">
				{onSetMasterPhysiologicalNorm && (
					<button
						type="button"
						onClick={onSetMasterPhysiologicalNorm}
						className="secondary-button shrink-0 flex items-center gap-1.5 border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--primary)] font-bold text-xs cursor-pointer shadow-xs min-h-[32px] h-8 px-2.5"
						data-testid="ortho-toolbar-norm-btn"
						title="1-клик фиксация нормы (Мандат 8e): Физиологический ортогнатический прикус"
					>
						<CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
						<span className="hidden md:inline">Физиологический прикус</span>
						<span className="md:hidden">Норма</span>
					</button>
				)}

				<button
					type="button"
					onClick={onPrintOrthodonticCard}
					className="secondary-button shrink-0 !hidden xl:!inline-flex h-8 px-2.5 text-xs font-semibold"
					data-testid="top-print-ortho-protocol-btn"
					title="Распечатать карту"
					aria-label="Печать протокола"
				>
					<Printer size={14} />
					<span>Печать</span>
				</button>

				<button
					type="button"
					onClick={onAddServicesToInvoice}
					className="secondary-button shrink-0 !hidden xl:!inline-flex h-8 px-2.5 text-xs font-semibold"
					data-testid="add-ortho-services-to-invoice-btn"
					title="Начислить услуги в чек/смету визита"
					aria-label="Начислить услуги в чек/смету"
				>
					<Receipt size={14} />
					<span>Услуги</span>
					<span
						className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] min-w-[18px] text-center"
						data-testid="ortho-services-count-badge"
					>
						{calculatedServicesCount}
					</span>
				</button>

				{/* Header quick action: secondary so the Primary CTA is strictly unique in preview footer */}
				<button
					type="button"
					onClick={onApplyToVisitNote}
					className="secondary-button shrink-0 !hidden sm:!inline-flex h-8 px-3 text-xs font-bold"
					data-testid="apply-to-form-043-btn"
					title="Вставить протокол в медицинскую карту"
					aria-label="В медицинскую карту"
				>
					<CheckCircle2 size={14} className="text-teal-600 dark:text-teal-400" />
					<span>В карту</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					className="secondary-button min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] !w-auto !h-auto sm:!w-8 sm:!h-8 !p-0 shrink-0 flex items-center justify-center cursor-pointer rounded-xl"
					aria-label="Закрыть"
					data-testid="close-ortho-protocol-btn"
				>
					<X size={18} />
				</button>
			</div>
		</div>
	);
};
