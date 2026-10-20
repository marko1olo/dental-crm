/**
 * apps/web/src/components/billing/invoices/InvoicesSecondaryModals.tsx
 *
 * Secondary modals for InvoicesView: Split payment, Print receipt, Refund, Installment QR.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { rubToKopecks } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { PaymentModal } from "../../finance/PaymentModal.js";
import { CashReceiptPrintModal } from "../../finance/CashReceiptPrintModal.js";
import { RefundServiceModal } from "../../finance/refunds/RefundServiceModal.js";
import { BankInstallmentQrModal } from "../../payments/BankInstallmentQrModal.js";
import type { BillingInvoice } from "../invoiceTypes.js";

interface InvoicesSecondaryModalsProps {
	readonly clinicLegalName: string;
	readonly currentDoctorName: string;
	readonly activeSplitInvoice: BillingInvoice | null;
	readonly setActiveSplitInvoice: (inv: BillingInvoice | null) => void;
	readonly receiptToPrint: BillingInvoice | null;
	readonly setReceiptToPrint: (inv: BillingInvoice | null) => void;
	readonly refundInvoice: BillingInvoice | null;
	readonly setRefundInvoice: (inv: BillingInvoice | null) => void;
	readonly bankInstallmentInvoice: BillingInvoice | null;
	readonly setBankInstallmentInvoice: (inv: BillingInvoice | null) => void;
	readonly onUpdateInvoice?: ((inv: BillingInvoice) => void) | undefined;
}

export const InvoicesSecondaryModals: React.FC<InvoicesSecondaryModalsProps> = (props) => {
	const {
		clinicLegalName, currentDoctorName, activeSplitInvoice, setActiveSplitInvoice,
		receiptToPrint, setReceiptToPrint, refundInvoice, setRefundInvoice,
		bankInstallmentInvoice, setBankInstallmentInvoice, onUpdateInvoice,
	} = props;

	return (
		<>
			{activeSplitInvoice && (
				<PaymentModal
					isOpen={Boolean(activeSplitInvoice)} onClose={() => setActiveSplitInvoice(null)}
					amountRub={activeSplitInvoice.totalAmountRub} patientId={activeSplitInvoice.patientId}
					patientName={activeSplitInvoice.patientName} patientPhone={activeSplitInvoice.patientPhone}
					doctorName={activeSplitInvoice.doctorName} cashierName={currentDoctorName}
					invoiceId={activeSplitInvoice.id} defaultMethod="split"
					onSuccess={(payload) => {
						const isOffline = Boolean((payload as any)?.offlineBuffered);
						onUpdateInvoice?.({
							...activeSplitInvoice, status: "paid", paidAmountRub: activeSplitInvoice.totalAmountRub,
							paidAt: new Date().toISOString(), paymentMethod: "split",
							fiscalStatus: isOffline ? "pending_fiscal_sync" : "fiscalized", isOfflineQueued: isOffline,
						});
						setActiveSplitInvoice(null);
						showToast(`Сплит-оплата по счету ${activeSplitInvoice.number} успешно проведена`, "success");
					}}
				/>
			)}

			{receiptToPrint && (
				<CashReceiptPrintModal
					isOpen={Boolean(receiptToPrint)} onClose={() => setReceiptToPrint(null)}
					invoice={receiptToPrint} clinicName={clinicLegalName} attendingDoctorName={receiptToPrint.doctorName}
					cashierFullName={currentDoctorName}
				/>
			)}

			{refundInvoice && (
				<RefundServiceModal
					isOpen={Boolean(refundInvoice)} onClose={() => setRefundInvoice(null)}
					invoiceId={refundInvoice.id} invoiceNumber={refundInvoice.number}
					patientId={refundInvoice.patientId} patientName={refundInvoice.patientName}
					patientPhone={refundInvoice.patientPhone || ""} doctorName={refundInvoice.doctorName}
					services={(refundInvoice.items || []).map((it) => ({
						id: it.id, name: it.name, code804n: it.code || "", toothNumber: undefined,
						priceRub: it.priceRub, quantity: it.quantity, doctorName: refundInvoice.doctorName, commissionPct: 30,
					}))}
					onRefundSuccess={(res) => {
						setRefundInvoice(null);
						showToast(`Возврат по счету ${refundInvoice.number} на сумму ${res.totalRefundRub} ₽ успешно проведен, чек возврата сформирован`, "success");
					}}
				/>
			)}

			{bankInstallmentInvoice && (
				<BankInstallmentQrModal
					isOpen={Boolean(bankInstallmentInvoice)} onClose={() => setBankInstallmentInvoice(null)}
					stageTitle={`Оплата по счету ${bankInstallmentInvoice.number}`}
					stageAmountKopecks={rubToKopecks(bankInstallmentInvoice.totalAmountRub)}
					patientId={bankInstallmentInvoice.patientId} patientName={bankInstallmentInvoice.patientName}
					patientPhone={bankInstallmentInvoice.patientPhone || ""} clinicName={clinicLegalName}
					onInstallmentApproved={(appr) => {
						setBankInstallmentInvoice(null);
						showToast(`Рассрочка одобрена! Сумма: ${(appr.approvedAmountKopecks / 100).toLocaleString("ru-RU")} ₽ (${appr.monthlyPaymentRub.toLocaleString("ru-RU")} ₽/мес)`, "success");
					}}
				/>
			)}
		</>
	);
};
