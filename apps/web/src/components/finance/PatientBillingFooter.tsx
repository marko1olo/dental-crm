import React from "react";
import {
	FileSpreadsheet,
	MessageSquare,
	MoreHorizontal,
	Printer,
	Receipt,
	RotateCcw,
	X,
} from "lucide-react";
import {
	type CompletedWorksActParams,
	type CompletedWorksActSummary,
} from "./invoiceEngine";
import { OneCExportButton } from "./OneCExportButton";

export interface PatientBillingFooterProps {
	readonly onPrint: () => void;
	readonly summary: CompletedWorksActSummary;
	readonly actParams: CompletedWorksActParams;
	readonly patient?: {
		readonly id?: string | undefined;
		readonly fullName?: string | null | undefined;
		readonly phone?: string | null | undefined;
		readonly address?: string | null | undefined;
	} | null | undefined;
	readonly onSendWhatsApp: () => void;
	readonly onOpenRefund: () => void;
	readonly onOpenTaxModal: () => void;
	readonly isMobileActionsOpen: boolean;
	readonly onSetIsMobileActionsOpen: (open: boolean) => void;
	readonly totalAmountRubFormatted: string;
	readonly onFiscalizeAction: () => void;
	readonly onClose: () => void;
}

export const PatientBillingFooter: React.FC<PatientBillingFooterProps> = ({
	onPrint,
	summary,
	actParams,
	patient,
	onSendWhatsApp,
	onOpenRefund,
	onOpenTaxModal,
	isMobileActionsOpen,
	onSetIsMobileActionsOpen,
	totalAmountRubFormatted,
	onFiscalizeAction,
	onClose,
}) => {
	return (
		<div className="sticky bottom-0 z-50 bg-[var(--paper)] border-t border-[var(--line)] px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 shrink-0 shadow-lg max-w-full">
			{/* Desktop Left Group: Secondary Actions (Print A4, 1C, WhatsApp, Refund) */}
			<div className="hidden sm:flex sm:items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
				{/* Secondary: Print A4 (GOST) */}
				<button
					type="button"
					onClick={onPrint}
					className="min-h-[44px] px-2.5 sm:px-3.5 rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] text-white hover:opacity-90 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 whitespace-nowrap"
					data-testid="btn-print-billing-act"
				>
					<Printer className="w-3.5 h-3.5 shrink-0" />
					<span className="whitespace-nowrap">Печать бланка А4 (ГОСТ)</span>
				</button>

				{/* Secondary: 1C Export (XML) */}
				<OneCExportButton
					actNumber={summary.actNumber}
					documentDate={new Date().toISOString().slice(0, 10)}
					docType="act"
					patientName={actParams.patient.fullName}
					patientId={patient?.id || "00000000-0000-0000-0000-000000000001"}
					patientPhone={patient?.phone || ""}
					patientAddress={patient?.address || ""}
					doctorName={actParams.doctor.fullName}
					clinicName={actParams.clinic.legalName}
					clinicInn={actParams.clinic.inn}
					clinicKpp={actParams.clinic.kpp || ""}
					items={summary.items.map((it) => {
						const itemObj: {
							id: string;
							code804n: string;
							name: string;
							quantity: number;
							priceRub: number;
							toothNumber?: number;
							discountRub?: number;
						} = {
							id: it.id,
							code804n: it.code804n || "A16.07.002",
							name: it.name,
							quantity: it.quantity,
							priceRub: it.priceRub,
						};
						if (it.toothNumber) {
							itemObj.toothNumber = Number(it.toothNumber);
						}
						if (it.discountRub !== undefined) {
							itemObj.discountRub = it.discountRub;
						}
						return itemObj;
					})}
					totalRub={summary.totalNetRub}
					contractNumber={actParams.contractNumber}
					contractDate={actParams.contractDateIso?.split("T")[0] || new Date().toISOString().split("T")[0]}
					label="1С (XML)"
					variant="secondary"
					className="min-h-[44px] px-2.5 sm:px-3 text-xs font-bold justify-center whitespace-nowrap shrink-0 bg-[var(--paper-soft)] hover:bg-[var(--paper-hover)] border border-[var(--line)] text-[var(--ink)]"
				/>

				{/* Secondary: Send WhatsApp */}
				<button
					type="button"
					onClick={onSendWhatsApp}
					className="min-h-[44px] px-2.5 sm:px-3 rounded-xl text-xs font-bold bg-[var(--paper)] border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 whitespace-nowrap"
					data-testid="btn-footer-send-whatsapp"
				>
					<MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span className="whitespace-nowrap shrink-0">В WhatsApp</span>
				</button>

				{/* Secondary: Partial Refund */}
				<button
					type="button"
					onClick={onOpenRefund}
					className="min-h-[44px] px-2.5 sm:px-3 rounded-xl text-xs font-bold bg-[var(--paper)] border border-amber-600/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 whitespace-nowrap"
					data-testid="btn-footer-partial-refund"
				>
					<RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
					<span className="whitespace-nowrap shrink-0">Возврат</span>
				</button>
			</div>

			{/* Mobile Actions Dropdown Menu */}
			{isMobileActionsOpen && (
				<div
					className="sm:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-xs flex items-end justify-center p-3 animate-in fade-in"
					onClick={() => onSetIsMobileActionsOpen(false)}
				>
					<div
						className="w-full bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl p-3 shadow-2xl space-y-2 animate-in slide-in-from-bottom-4 duration-150"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between pb-2 border-b border-[var(--line)] text-xs font-bold text-[var(--muted)]">
							<span>Дополнительные действия</span>
							<button
								type="button"
								onClick={() => onSetIsMobileActionsOpen(false)}
								className="p-1 text-[var(--muted)] hover:text-[var(--ink)] min-h-[44px] min-w-[44px] flex items-center justify-center"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
						<div className="grid grid-cols-1 gap-1.5 text-xs font-bold">
							<button
								type="button"
								onClick={() => {
									onSetIsMobileActionsOpen(false);
									onPrint();
								}}
								className="w-full py-2.5 px-3 min-h-[44px] rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] flex items-center gap-2 text-left"
							>
								<Printer className="w-4 h-4 text-[var(--muted)]" />
								<span>Печать бланка А4 (ГОСТ)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onSetIsMobileActionsOpen(false);
									onSendWhatsApp();
								}}
								className="w-full py-2.5 px-3 min-h-[44px] rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] flex items-center gap-2 text-left text-emerald-700 dark:text-emerald-400"
							>
								<MessageSquare className="w-4 h-4 text-emerald-600" />
								<span>Отправить в WhatsApp</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onSetIsMobileActionsOpen(false);
									onOpenTaxModal();
								}}
								className="w-full py-2.5 px-3 min-h-[44px] rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] flex items-center gap-2 text-left text-teal-700 dark:text-teal-400"
							>
								<FileSpreadsheet className="w-4 h-4 text-teal-600" />
								<span>Справка для налогового вычета (13% НДФЛ)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onSetIsMobileActionsOpen(false);
									onOpenRefund();
								}}
								className="w-full py-2.5 px-3 min-h-[44px] rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] flex items-center gap-2 text-left text-amber-700 dark:text-amber-400"
							>
								<RotateCcw className="w-4 h-4 text-amber-600" />
								<span>Оформить возврат прихода</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Right / Main Group: Total Due & Primary Action */}
			<div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
				{/* Mobile More Actions Trigger Button */}
				<button
					type="button"
					onClick={() => onSetIsMobileActionsOpen(true)}
					className="sm:hidden min-h-[44px] min-w-[44px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center cursor-pointer shrink-0"
					title="Дополнительные действия..."
					aria-label="Дополнительные действия"
				>
					<MoreHorizontal className="w-5 h-5 text-[var(--muted)]" />
				</button>

				{/* PROMINENT TOTAL DUE BLOCK */}
				<div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/30 text-[var(--ink)] shrink-0 whitespace-nowrap shadow-2xs">
					<span className="text-[11px] sm:text-xs text-[var(--muted)] font-semibold">Итого к оплате:</span>
					<strong className="text-sm sm:text-base font-black text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal,#2dd4bf)] font-mono">
						{totalAmountRubFormatted}
					</strong>
				</div>

				{/* PRIMARY ACTION: Fiscalize 54-FZ */}
				<button
					type="button"
					onClick={onFiscalizeAction}
					className="flex-1 sm:flex-initial min-h-[44px] px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold bg-teal-600 hover:bg-teal-700 text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 whitespace-nowrap"
					data-testid="btn-fiscalize-54fz"
					title="Пробить чек"
					aria-label="Фискализировать (54-ФЗ)"
				>
					<Receipt className="w-4 h-4 text-white shrink-0" />
					<span className="whitespace-nowrap">Пробить чек</span>
				</button>

				{/* Secondary: Desktop Close */}
				<button
					type="button"
					onClick={onClose}
					className="hidden sm:flex min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-semibold bg-[var(--paper-soft)] border border-[var(--line)] hover:bg-[var(--paper-hover)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors items-center justify-center shrink-0 whitespace-nowrap"
				>
					Закрыть
				</button>
			</div>
		</div>
	);
};
