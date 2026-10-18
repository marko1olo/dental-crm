/**
 * apps/web/src/components/billing/InvoicesModalsLayer.tsx
 *
 * Dedicated modal and drawer sub-layer for InvoicesView.
 * Decomposed facade delegating to ./invoices/ in strict compliance with Mandate 8b.
 * Strictly <= 120 lines.
 */

import React from "react";
import { showToast } from "../GlobalToast.js";
import { PaymentModal } from "./PaymentModal.js";
import type { BillingInvoice } from "./invoiceTypes.js";
import { InvoicesPrimaryModals } from "./invoices/InvoicesPrimaryModals.js";
import { InvoicesSecondaryModals } from "./invoices/InvoicesSecondaryModals.js";

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
	readonly activePaymentInvoice: BillingInvoice | null;
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

export const InvoicesModalsLayer: React.FC<InvoicesModalsLayerProps> = (props) => {
	const {
		isCreateModalOpen, setIsCreateModalOpen, patientId, patientName,
		currentDoctorName, clinicLegalName, invoices, handleCreateInvoice,
		isInstallmentsModalOpen, setIsInstallmentsModalOpen, setBankInstallmentInvoice,
		isShiftModalOpen, setIsShiftModalOpen, isRegisterDrawerOpen,
		setIsRegisterDrawerOpen, activePaymentInvoice, setActivePaymentInvoice,
		activeSplitInvoice, setActiveSplitInvoice, receiptToPrint, setReceiptToPrint,
		refundInvoice, setRefundInvoice, bankInstallmentInvoice, onUpdateInvoice,
	} = props;

	return (
		<>
			<InvoicesPrimaryModals
				isCreateModalOpen={isCreateModalOpen} setIsCreateModalOpen={setIsCreateModalOpen}
				patientId={patientId} patientName={patientName} currentDoctorName={currentDoctorName}
				clinicLegalName={clinicLegalName} invoices={invoices} handleCreateInvoice={handleCreateInvoice}
				isInstallmentsModalOpen={isInstallmentsModalOpen} setIsInstallmentsModalOpen={setIsInstallmentsModalOpen}
				setBankInstallmentInvoice={setBankInstallmentInvoice} isShiftModalOpen={isShiftModalOpen}
				setIsShiftModalOpen={setIsShiftModalOpen} isRegisterDrawerOpen={isRegisterDrawerOpen}
				setIsRegisterDrawerOpen={setIsRegisterDrawerOpen} setActivePaymentInvoice={setActivePaymentInvoice}
				onUpdateInvoice={onUpdateInvoice}
			/>

			<InvoicesSecondaryModals
				clinicLegalName={clinicLegalName} currentDoctorName={currentDoctorName}
				activeSplitInvoice={activeSplitInvoice} setActiveSplitInvoice={setActiveSplitInvoice}
				receiptToPrint={receiptToPrint} setReceiptToPrint={setReceiptToPrint}
				refundInvoice={refundInvoice} setRefundInvoice={setRefundInvoice}
				bankInstallmentInvoice={bankInstallmentInvoice} setBankInstallmentInvoice={setBankInstallmentInvoice}
				onUpdateInvoice={onUpdateInvoice}
			/>

			{activePaymentInvoice && (
				<PaymentModal
					isOpen={Boolean(activePaymentInvoice)}
					onClose={() => setActivePaymentInvoice(null)}
					amountRub={activePaymentInvoice.totalAmountRub}
					patientId={activePaymentInvoice.patientId}
					patientName={activePaymentInvoice.patientName}
					patientPhone={activePaymentInvoice.patientPhone}
					doctorName={activePaymentInvoice.doctorName}
					cashierName={currentDoctorName}
					clinicLegalName={clinicLegalName}
					invoiceId={activePaymentInvoice.id}
					onSuccess={(payload) => {
						const isOffline = Boolean((payload as any)?.offlineBuffered);
						onUpdateInvoice?.({
							...activePaymentInvoice,
							status: ((payload as any)?.method === "warranty_100" || (payload as any)?.totalRub === 0 ? "warranty_100" : "paid") as any,
							paidAmountRub: (payload as any)?.totalRub ?? activePaymentInvoice.totalAmountRub,
							paidAt: new Date().toISOString(),
							paymentMethod: (payload as any)?.method,
							fiscalStatus: isOffline ? "pending_fiscal_sync" : "fiscalized",
							isOfflineQueued: isOffline,
						});
						setActivePaymentInvoice(null);
						showToast(`Счет ${activePaymentInvoice.number} успешно закрыт`, "success");
					}}
				/>
			)}
		</>
	);
};

export default InvoicesModalsLayer;
