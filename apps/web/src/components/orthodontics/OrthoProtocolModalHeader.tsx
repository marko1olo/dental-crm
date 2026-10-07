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
}

export const OrthoProtocolModalHeader: React.FC<OrthoProtocolModalHeaderProps> = ({
	patientName,
	onPrintOrthodonticCard,
	onAddServicesToInvoice,
	onApplyToVisitNote,
	onClose,
	calculatedServicesCount,
}) => {
	return (
		<div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface,#f8fafc)] dark:bg-slate-900 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 shrink-0">
			<div className="flex items-center gap-2.5 min-w-0 mr-3">
				<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30 shrink-0">
					<BracesBracket size={18} />
				</div>
				<div className="min-w-0">
					<h2 id="ortho-protocol-title" className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white m-0 truncate">
						Ортодонтический протокол приёма
					</h2>
					<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0 truncate">
						Выбор брекетов, дуг, сечений и эластиков · {patientName}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={onPrintOrthodonticCard}
					className="secondary-button shrink-0"
					data-testid="top-print-ortho-protocol-btn"
					title="Распечатать карту"
					aria-label="Печать протокола"
				>
					<Printer size={15} />
					<span className="hidden sm:inline">Печать протокола</span>
				</button>

				<button
					type="button"
					onClick={onAddServicesToInvoice}
					className="secondary-button shrink-0"
					data-testid="add-ortho-services-to-invoice-btn"
					title="Начислить услуги в чек/смету визита"
					aria-label="Начислить услуги в чек/смету"
				>
					<Receipt size={15} />
					<span>Начислить услуги в чек</span>
					<span
						className="px-1.5 py-0.2 rounded-full text-[12px] font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 border border-[var(--line,#e2e8f0)] dark:border-slate-600 min-w-[20px] text-center"
						data-testid="ortho-services-count-badge"
					>
						{calculatedServicesCount}
					</span>
				</button>

				{/* Single Primary CTA for Ortho Protocol */}
				<button
					type="button"
					onClick={onApplyToVisitNote}
					className="primary-button shrink-0"
					data-testid="apply-to-form-043-btn"
					title="Вставить протокол в медицинскую карту"
					aria-label="В медицинскую карту"
				>
					<CheckCircle2 size={15} />
					<span>В карту</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					className="secondary-button !w-8 !h-8 !p-0 shrink-0"
					aria-label="Закрыть"
					data-testid="close-ortho-protocol-btn"
				>
					<X size={16} />
				</button>
			</div>
		</div>
	);
};
