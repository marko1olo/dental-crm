import { Suspense } from "react";
import { InvoicesView } from "../billing/InvoicesView.js";

export interface FinanceInvoicesModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string | null;
	patientName?: string | null;
}

export function FinanceInvoicesModal({
	isOpen,
	onClose,
	patientId,
	patientName,
}: FinanceInvoicesModalProps) {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-label="Счета и акты выполненных работ"
			data-testid="modal-finance-invoices"
		>
			<div className="w-full h-full sm:h-[92vh] max-w-5xl sm:max-h-[920px] rounded-none sm:rounded-2xl overflow-hidden shadow-2xl border-0 sm:border border-[var(--line)] flex flex-col bg-[var(--paper)]">
				<Suspense
					fallback={
						<div className="p-8 text-center text-xs text-[var(--muted)]">
							Загрузка счетов и актов...
						</div>
					}
				>
					<InvoicesView
						currentDoctorName="Врач-стоматолог"
						{...(patientId ? { patientId } : {})}
						{...(patientName ? { patientName } : {})}
						onClose={onClose}
					/>
				</Suspense>
			</div>
		</div>
	);
}
