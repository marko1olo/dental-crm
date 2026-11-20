/**
 * apps/web/src/components/billing/invoices/InvoicesSecondaryModals.tsx
 *
 * Secondary modals for InvoicesView: Print receipt, Refund, Installment QR.
 * CashRegisterStudioModal is unified exclusively in InvoicesModalsLayer (Mandate 8b, 8bf).
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { rubToKopecks, kopecksToRubles } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { CashReceiptPrintModal } from "../../finance/CashReceiptPrintModal.js";
import { RefundServiceModal } from "../../finance/refunds/RefundServiceModal.js";
import { BankInstallmentQrModal } from "../../payments/BankInstallmentQrModal.js";
import type { BillingInvoice } from "../invoiceTypes.js";

interface InvoicesSecondaryModalsProps {
	readonly clinicLegalName: string;
	readonly currentDoctorName: string;
	readonly activeSplitInvoice?: BillingInvoice | null | undefined;
	readonly setActiveSplitInvoice?: ((inv: BillingInvoice | null) => void) | undefined;
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
		clinicLegalName, currentDoctorName,
		receiptToPrint, setReceiptToPrint, refundInvoice, setRefundInvoice,
		bankInstallmentInvoice, setBankInstallmentInvoice,
	} = props;

	return (
		<>
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
						showToast(`Рассрочка одобрена! Сумма: ${kopecksToRubles(appr.approvedAmountKopecks).toLocaleString("ru-RU")} ₽ (${appr.monthlyPaymentRub.toLocaleString("ru-RU")} ₽/мес)`, "success");
					}}
				/>
			)}
		</>
	);
};
