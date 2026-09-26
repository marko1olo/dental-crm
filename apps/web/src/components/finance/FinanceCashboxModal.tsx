import { lazy, Suspense } from "react";
import { Banknote, X } from "lucide-react";

const CashboxViewModal = lazy(() =>
	import("../cashbox/CashboxView.js").then((m) => ({
		default: m.CashboxView,
	})),
);

export interface FinanceCashboxModalProps {
	isOpen: boolean;
	onClose: () => void;
	isShiftOpen: boolean;
	cashierName: string;
	clinicName: string;
	clinicInn?: string;
	onPaymentComplete: () => void;
}

export function FinanceCashboxModal({
	isOpen,
	onClose,
	isShiftOpen,
	cashierName,
	clinicName,
	clinicInn,
	onPaymentComplete,
}: FinanceCashboxModalProps) {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-label="Касса 54-ФЗ и расчеты с пациентами"
			data-testid="modal-finance-cashbox"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="w-full max-w-5xl h-[92vh] max-h-[920px] rounded-2xl overflow-hidden shadow-2xl border border-[var(--line)] flex flex-col bg-[var(--paper)]">
				<header className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] shrink-0 bg-[var(--paper-soft)]">
					<div className="flex items-center gap-2">
						<Banknote className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<h2 className="text-sm font-bold text-[var(--ink)]">
							АРМ Кассира · 54-ФЗ
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
					<Suspense
						fallback={
							<div className="p-8 text-center text-xs text-[var(--muted)]">
								Загрузка АРМ кассы 54-ФЗ...
							</div>
						}
					>
						<CashboxViewModal
							initialShiftOpen={isShiftOpen}
							cashierName={cashierName || "Врач-стоматолог / Кассир"}
							clinicName={clinicName || "Стоматология ДЕНТЕ Премиум"}
							{...(clinicInn ? { clinicInn } : {})}
							onPaymentComplete={onPaymentComplete}
						/>
					</Suspense>
				</div>
			</div>
		</div>
	);
}
