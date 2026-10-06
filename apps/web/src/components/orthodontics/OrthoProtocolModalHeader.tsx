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
		<div className="flex items-center justify-between px-4 py-3 bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 shrink-0">
			<div className="flex items-center gap-2.5">
				<div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
					<BracesBracket size={18} />
				</div>
				<div>
					<h2 id="ortho-protocol-title" className="text-base font-black text-[var(--ink,#0f172a)] dark:text-white m-0">
						Ортодонтический протокол приёма
					</h2>
					<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0">
						Выбор брекетов, дуг, сечений и эластиков · {patientName}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onPrintOrthodonticCard}
					className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-xs transition-all cursor-pointer whitespace-nowrap"
					data-testid="top-print-ortho-protocol-btn"
					title="Распечатать карту (Мандат 8e: печать со штампом в любой момент)"
					aria-label="Печать протокола"
				>
					<Printer size={16} />
					<span className="hidden sm:inline">Печать протокола</span>
				</button>

				<button
					type="button"
					onClick={onAddServicesToInvoice}
					className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
					data-testid="add-ortho-services-to-invoice-btn"
					title="Начислить услуги в чек/смету визита"
					aria-label="Начислить услуги в чек/смету"
				>
					<Receipt size={16} />
					<span>Начислить услуги в чек</span>
					<span
						className="px-1.5 py-0.5 rounded-full text-[11px] font-black bg-white/20 text-white min-w-[20px] text-center"
						data-testid="ortho-services-count-badge"
					>
						{calculatedServicesCount}
					</span>
				</button>

				<button
					type="button"
					onClick={onApplyToVisitNote}
					className="min-h-[48px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap"
					data-testid="apply-to-form-043-btn"
					title="Вставить протокол в медицинскую карту"
					aria-label="В медицинскую карту"
				>
					<CheckCircle2 size={16} />
					<span>В карту</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white transition-colors cursor-pointer"
					aria-label="Закрыть"
					data-testid="close-ortho-protocol-btn"
				>
					<X size={18} />
				</button>
			</div>
		</div>
	);
};
