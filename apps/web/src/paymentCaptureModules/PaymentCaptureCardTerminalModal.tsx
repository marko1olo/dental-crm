import { rubToKopecks, type SberPosTransactionResponse } from "@dental/shared";
import { CreditCard, X } from "lucide-react";
import React from "react";
import { SberPayIntegration } from "../components/finance/SberPayIntegration";

export type PaymentCaptureCardTerminalModalProps = {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string | null;
	patientName: string;
	amountRub: number;
	orderId: string;
	onSuccess: (response: SberPosTransactionResponse) => void;
	onSelectAlternativeMethod?: (method: "sbp" | "cash" | "deposit") => void;
};

export function PaymentCaptureCardTerminalModal({
	isOpen,
	onClose,
	patientId,
	patientName,
	amountRub,
	orderId,
	onSuccess,
	onSelectAlternativeMethod,
}: PaymentCaptureCardTerminalModalProps) {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="card-terminal-modal-title"
		>
			<div className="w-full max-w-lg rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col">
				<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center gap-2">
						<CreditCard size={18} className="text-teal-600" />
						<h3 id="card-terminal-modal-title" className="text-sm font-bold">
							Оплата через POS-терминал
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{ minHeight: "44px", minWidth: "44px" }}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
						aria-label="Закрыть окно терминала"
					>
						<X size={18} />
					</button>
				</div>
				<div className="p-4">
					<SberPayIntegration
						patientId={patientId || "pat-walkin"}
						patientName={patientName}
						amountKopecks={rubToKopecks(amountRub)}
						orderId={orderId}
						autoStart={true}
						onPaymentSuccess={onSuccess}
						onSelectAlternativeMethod={onSelectAlternativeMethod}
					/>
				</div>
			</div>
		</div>
	);
}
