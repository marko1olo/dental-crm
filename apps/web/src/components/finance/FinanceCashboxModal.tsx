import { createPortal } from "react-dom";
import { Banknote, X } from "lucide-react";
import { CashboxView } from "../cashbox/CashboxView.js";

export interface FinanceCashboxModalProps {
	isOpen: boolean;
	onClose: () => void;
	isShiftOpen: boolean;
	cashierName: string;
	clinicName: string;
	clinicInn?: string;
	patientId?: string;
	patientName?: string;
	patientPhone?: string;
	patientDepositRub?: number;
	patientFamilyBalanceRub?: number;
	onPaymentComplete: () => void;
}

export function FinanceCashboxModal({
	isOpen,
	onClose,
	isShiftOpen,
	cashierName,
	clinicName,
	clinicInn,
	patientId,
	patientName,
	patientPhone,
	patientDepositRub,
	patientFamilyBalanceRub,
	onPaymentComplete,
}: FinanceCashboxModalProps) {
	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-label="Окно кассы и расчетов с пациентами"
			data-testid="modal-finance-cashbox"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="w-full max-w-5xl h-[92dvh] sm:h-[92vh] max-h-[920px] rounded-t-[24px] sm:rounded-2xl overflow-hidden shadow-2xl border-t sm:border border-[var(--line)] flex flex-col bg-[var(--paper)]">
				<header className="relative flex items-center justify-between px-4 py-3 sm:py-2.5 border-b border-[var(--line)] shrink-0 bg-[var(--paper-soft)]">
					<div className="sm:hidden absolute top-1.5 left-1/2 -translate-x-1/2 w-9 h-1 rounded-full bg-[var(--line,#cbd5e1)]" aria-hidden="true" />
					<div className="flex items-center gap-2">
						<Banknote className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<h2 className="text-sm font-bold text-[var(--ink)]">
							Касса клиники · Приём оплаты
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
						aria-label="Закрыть окно кассы"
						data-testid="btn-close-cashbox-modal"
					>
						<X size={16} />
					</button>
				</header>
				<div className="flex-1 overflow-y-auto p-2 sm:p-4">
					<CashboxView
						initialShiftOpen={isShiftOpen}
						cashierName={cashierName || "Врач-стоматолог / Кассир"}
						clinicName={clinicName || "Стоматология ДЕНТЕ Премиум"}
						patientId={patientId}
						patientName={patientName}
						patientPhone={patientPhone}
						patientDepositRub={patientDepositRub}
						patientFamilyBalanceRub={patientFamilyBalanceRub}
						{...(clinicInn ? { clinicInn } : {})}
						onPaymentComplete={onPaymentComplete}
					/>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
