/**
 * apps/web/src/components/billing/InvoicesModalsLayer.tsx
 *
 * Dedicated modal and drawer sub-layer for InvoicesView.
 * Decomposed under Mandate 8b (file length <= 800 lines) and Mandate 8d (Studio Clinical HIG).
 */

import React from "react";
import { rubToKopecks } from "@dental/shared";
import { showToast } from "../GlobalToast.js";
import { QuickCreateInvoiceModal } from "./QuickCreateInvoiceModal.js";
import { PatientInstallmentsModal } from "./PatientInstallmentsModal.js";
import { CashboxShiftModal } from "../finance/CashboxShiftModal.js";
import { CashRegisterDrawer } from "./CashRegisterDrawer.js";
import { PaymentModal } from "../finance/PaymentModal.js";
import { CashReceiptPrintModal } from "../finance/CashReceiptPrintModal.js";
import { RefundServiceModal } from "../finance/refunds/RefundServiceModal.js";
import { BankInstallmentQrModal } from "../payments/BankInstallmentQrModal.js";
import type { BillingInvoice } from "./invoiceTypes.js";

export interface InvoicesModalsLayerProps {
	readonly isCreateModalOpen: boolean;
	readonly setIsCreateModalOpen: (open: boolean) => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly currentDoctorName: string;
	readonly clinicLegalName: string;
	readonly invoices: BillingInvoice[];
	readonly handleCreateInvoice: (params: {
		patientName: string;
		serviceName: string;
		servicePriceRub: number;
		isWarranty100: boolean;
	}) => void;
	readonly isInstallmentsModalOpen: boolean;
	readonly setIsInstallmentsModalOpen: (open: boolean) => void;
	readonly setBankInstallmentInvoice: (inv: BillingInvoice | null) => void;
	readonly isShiftModalOpen: boolean;
	readonly setIsShiftModalOpen: (open: boolean) => void;
	readonly isRegisterDrawerOpen: boolean;
	readonly setIsRegisterDrawerOpen: (open: boolean) => void;
	readonly setActivePaymentInvoice: (inv: BillingInvoice | null) => void;
	readonly activeSplitInvoice: BillingInvoice | null;
	readonly setActiveSplitInvoice: (inv: BillingInvoice | null) => void;
	readonly receiptToPrint: BillingInvoice | null;
	readonly setReceiptToPrint: (inv: BillingInvoice | null) => void;
	readonly refundInvoice: BillingInvoice | null;
	readonly setRefundInvoice: (inv: BillingInvoice | null) => void;
	readonly bankInstallmentInvoice: BillingInvoice | null;
	readonly onUpdateInvoice?: ((inv: BillingInvoice) => void) | undefined;
}

export const InvoicesModalsLayer: React.FC<InvoicesModalsLayerProps> = ({
	isCreateModalOpen,
	setIsCreateModalOpen,
	patientId,
	patientName,
	currentDoctorName,
	clinicLegalName,
	invoices,
	handleCreateInvoice,
	isInstallmentsModalOpen,
	setIsInstallmentsModalOpen,
	setBankInstallmentInvoice,
	isShiftModalOpen,
	setIsShiftModalOpen,
	isRegisterDrawerOpen,
	setIsRegisterDrawerOpen,
	setActivePaymentInvoice,
	activeSplitInvoice,
	setActiveSplitInvoice,
	receiptToPrint,
	setReceiptToPrint,
	refundInvoice,
	setRefundInvoice,
	bankInstallmentInvoice,
	onUpdateInvoice,
}) => {
	return (
		<>
			{/* Quick Create Invoice Modal (Modal Depth strictly 1) */}
			<QuickCreateInvoiceModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				patientName={patientName}
				currentDoctorName={currentDoctorName}
				onCreateInvoice={handleCreateInvoice}
			/>

			{isInstallmentsModalOpen && (
				<PatientInstallmentsModal
					isOpen={isInstallmentsModalOpen}
					onClose={() => setIsInstallmentsModalOpen(false)}
					patientId={patientId}
					patientName={patientName}
					clinicName={clinicLegalName}
					onOpenBankInstallment={() => {
						setIsInstallmentsModalOpen(false);
						setBankInstallmentInvoice(invoices[0] || null);
					}}
				/>
			)}

			{isShiftModalOpen && (
				<CashboxShiftModal
					isOpen={isShiftModalOpen}
					onClose={() => setIsShiftModalOpen(false)}
					clinicLegalName={clinicLegalName}
					cashierFullName={currentDoctorName}
				/>
			)}

			{isRegisterDrawerOpen && (
				<CashRegisterDrawer
					isOpen={isRegisterDrawerOpen}
					onClose={() => setIsRegisterDrawerOpen(false)}
					cashierFullName={currentDoctorName}
					clinicLegalName={clinicLegalName}
					invoices={invoices}
					onOpenPaymentModal={() => {
						if (invoices.length > 0 && invoices[0]) {
							setActivePaymentInvoice(invoices[0]);
						} else {
							setIsCreateModalOpen(true);
						}
					}}
				/>
			)}

			{activeSplitInvoice && (
				<PaymentModal
					isOpen={Boolean(activeSplitInvoice)}
					onClose={() => setActiveSplitInvoice(null)}
					amountRub={activeSplitInvoice.totalAmountRub}
					patientId={activeSplitInvoice.patientId}
					patientName={activeSplitInvoice.patientName}
					patientPhone={activeSplitInvoice.patientPhone}
					doctorName={activeSplitInvoice.doctorName}
					cashierName={currentDoctorName}
					invoiceId={activeSplitInvoice.id}
					defaultMethod="split"
					onSuccess={(payload) => {
						const isOffline = Boolean((payload as any)?.offlineBuffered);
						onUpdateInvoice?.({
							...activeSplitInvoice,
							status: "paid",
							paidAmountRub: activeSplitInvoice.totalAmountRub,
							paidAt: new Date().toISOString(),
							paymentMethod: "split",
							fiscalStatus: isOffline ? "pending_fiscal_sync" : "fiscalized",
							isOfflineQueued: isOffline,
						});
						setActiveSplitInvoice(null);
						showToast(
							`Сплит-оплата по счету ${activeSplitInvoice.number} успешно проведена`,
							"success",
						);
					}}
				/>
			)}

			{receiptToPrint && (
				<CashReceiptPrintModal
					isOpen={Boolean(receiptToPrint)}
					onClose={() => setReceiptToPrint(null)}
					invoice={receiptToPrint}
					clinicName={clinicLegalName}
					attendingDoctorName={receiptToPrint.doctorName}
					cashierFullName={currentDoctorName}
				/>
			)}

			{refundInvoice && (
				<RefundServiceModal
					isOpen={Boolean(refundInvoice)}
					onClose={() => setRefundInvoice(null)}
					invoiceId={refundInvoice.id}
					invoiceNumber={refundInvoice.number}
					patientId={refundInvoice.patientId}
					patientName={refundInvoice.patientName}
					patientPhone={refundInvoice.patientPhone || ""}
					doctorName={refundInvoice.doctorName}
					services={(refundInvoice.items || []).map((it) => ({
						id: it.id,
						name: it.name,
						code804n: it.code || "",
						toothNumber: undefined,
						priceRub: it.priceRub,
						quantity: it.quantity,
						doctorName: refundInvoice.doctorName,
						commissionPct: 30,
					}))}
					onRefundSuccess={(res) => {
						setRefundInvoice(null);
						showToast(
							`Возврат по счету ${refundInvoice.number} на сумму ${res.totalRefundRub} ₽ успешно проведен по 54-ФЗ`,
							"success",
						);
					}}
				/>
			)}

			{bankInstallmentInvoice && (
				<BankInstallmentQrModal
					isOpen={Boolean(bankInstallmentInvoice)}
					onClose={() => setBankInstallmentInvoice(null)}
					stageTitle={`Оплата по счету ${bankInstallmentInvoice.number}`}
					stageAmountKopecks={rubToKopecks(bankInstallmentInvoice.totalAmountRub)}
					patientId={bankInstallmentInvoice.patientId}
					patientName={bankInstallmentInvoice.patientName}
					patientPhone={bankInstallmentInvoice.patientPhone || ""}
					clinicName={clinicLegalName}
					onInstallmentApproved={(appr) => {
						setBankInstallmentInvoice(null);
						showToast(
							`Рассрочка одобрена! Сумма: ${(appr.approvedAmountKopecks / 100).toLocaleString("ru-RU")} ₽ (${appr.monthlyPaymentRub.toLocaleString("ru-RU")} ₽/мес)`,
							"success",
						);
					}}
				/>
			)}
		</>
	);
};
