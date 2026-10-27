/**
 * apps/web/src/components/finance/modal/payment/PaymentTerminalView.tsx
 *
 * Sber POS terminal integration and emergency manual terminal confirmation.
 */

import React from "react";
import { CheckCircle, ShieldCheck } from "lucide-react";
import type { SberPosTransactionResponse } from "@dental/shared";
import { SberPayIntegration } from "../../SberPayIntegration.js";
import type { PaymentMethodTab } from "./paymentModalTypes.js";

export interface PaymentTerminalViewProps {
	readonly patientId: string;
	readonly patientName: string;
	readonly totalDueKopecks: number;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly documentId?: string | undefined;
	readonly handleSberSuccess: (posRes: SberPosTransactionResponse) => void;
	readonly setActiveMethod: (m: PaymentMethodTab) => void;
	readonly handleManualCardTerminalConfirm: () => void;
	readonly isSubmittingManualCard: boolean;
}

export const PaymentTerminalView: React.FC<PaymentTerminalViewProps> = ({
	patientId,
	patientName,
	totalDueKopecks,
	invoiceId,
	visitId,
	documentId,
	handleSberSuccess,
	setActiveMethod,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
}) => {
	return (
		<div className="space-y-3">
			<SberPayIntegration
				patientId={patientId}
				patientName={patientName}
				amountKopecks={totalDueKopecks}
				invoiceId={invoiceId}
				visitId={visitId}
				documentId={documentId}
				onPaymentSuccess={handleSberSuccess}
				onSelectAlternativeMethod={(alt) => {
					if (alt === "cash") setActiveMethod("cash");
					if (alt === "deposit") setActiveMethod("family_deposit");
				}}
			/>
			{/* Standalone manual terminal fallback (Mandates 8e, 8n, 8am) */}
			<div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] flex items-center justify-between flex-wrap gap-2 text-xs">
				<div className="flex items-center gap-2">
					<ShieldCheck size={16} className="text-[var(--ink-muted)] shrink-0" />
					<span className="font-medium text-[var(--ink)]">
						Карта списана на автономном терминале или эквайринг подвис?
					</span>
				</div>
				<button
					type="button"
					onClick={() => handleManualCardTerminalConfirm()}
					disabled={isSubmittingManualCard}
					title={
						isSubmittingManualCard
							? "Идет фиксация..."
							: "Зафиксировать оплату в CRM без повторного списания с карты"
					}
					className="min-h-[36px] px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
					data-testid="btn-manual-terminal-confirm"
				>
					<CheckCircle size={14} />
					<span>Оплата картой подтверждена на терминале вручную</span>
				</button>
			</div>
		</div>
	);
};
