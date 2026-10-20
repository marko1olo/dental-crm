/**
 * apps/web/src/components/billing/invoices/InvoicesPrimaryModals.tsx
 *
 * Primary modals for InvoicesView: QuickCreate, Installments, Shift, CashRegister.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { showToast } from "../../GlobalToast.js";
import { QuickCreateInvoiceModal } from "../QuickCreateInvoiceModal.js";
import { PatientInstallmentsModal } from "../PatientInstallmentsModal.js";
import { CashboxShiftModal } from "../../finance/CashboxShiftModal.js";
import { CashRegisterDrawer } from "../CashRegisterDrawer.js";
import type { BillingInvoice } from "../invoiceTypes.js";

interface InvoicesPrimaryModalsProps {
	readonly isCreateModalOpen: boolean;
	readonly setIsCreateModalOpen: (open: boolean) => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly currentDoctorName: string;
	readonly clinicLegalName: string;
	readonly invoices: BillingInvoice[];
	readonly handleCreateInvoice: (params: {
		patientName: string; serviceName: string; servicePriceRub: number; isWarranty100: boolean;
	}) => void;
	readonly isInstallmentsModalOpen: boolean;
	readonly setIsInstallmentsModalOpen: (open: boolean) => void;
	readonly setBankInstallmentInvoice: (inv: BillingInvoice | null) => void;
	readonly isShiftModalOpen: boolean;
	readonly setIsShiftModalOpen: (open: boolean) => void;
	readonly isRegisterDrawerOpen: boolean;
	readonly setIsRegisterDrawerOpen: (open: boolean) => void;
	readonly setActivePaymentInvoice: (inv: BillingInvoice | null) => void;
	readonly onUpdateInvoice?: ((inv: BillingInvoice) => void) | undefined;
}

export const InvoicesPrimaryModals: React.FC<InvoicesPrimaryModalsProps> = (props) => {
	const {
		isCreateModalOpen, setIsCreateModalOpen, patientId, patientName,
		currentDoctorName, clinicLegalName, invoices, handleCreateInvoice,
		isInstallmentsModalOpen, setIsInstallmentsModalOpen, setBankInstallmentInvoice,
		isShiftModalOpen, setIsShiftModalOpen, isRegisterDrawerOpen,
		setIsRegisterDrawerOpen, setActivePaymentInvoice, onUpdateInvoice,
	} = props;

	return (
		<>
			<QuickCreateInvoiceModal
				isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}
				patientName={patientName} currentDoctorName={currentDoctorName} onCreateInvoice={handleCreateInvoice}
			/>

			{isInstallmentsModalOpen && (
				<PatientInstallmentsModal
					isOpen={isInstallmentsModalOpen} onClose={() => setIsInstallmentsModalOpen(false)}
					patientId={patientId} patientName={patientName} clinicName={clinicLegalName}
					onOpenBankInstallment={() => {
						setIsInstallmentsModalOpen(false);
						setBankInstallmentInvoice(invoices[0] || null);
					}}
				/>
			)}

			{isShiftModalOpen && (
				<CashboxShiftModal
					isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)}
					clinicLegalName={clinicLegalName} cashierFullName={currentDoctorName}
				/>
			)}

			{isRegisterDrawerOpen && (
				<CashRegisterDrawer
					isOpen={isRegisterDrawerOpen} onClose={() => setIsRegisterDrawerOpen(false)}
					cashierFullName={currentDoctorName} clinicLegalName={clinicLegalName} invoices={invoices}
					onPaymentSuccess={(inv, receipt) => {
						if (inv && onUpdateInvoice) {
							onUpdateInvoice({
								...inv,
								status: (receipt.method === "warranty_100" || receipt.totalRub === 0 ? "warranty_100" : "paid") as any,
								paidAmountRub: receipt.totalRub,
								paidAt: new Date().toISOString(),
								paymentMethod: receipt.method,
							});
						}
						showToast(`Оплата по счёту ${inv?.number || ""} (${receipt.totalRub} ₽) успешно зафиксирована, чек сформирован`, "success");
					}}
					onOpenPaymentModal={() => {
						if (invoices.length > 0 && invoices[0]) setActivePaymentInvoice(invoices[0]);
						else setIsCreateModalOpen(true);
					}}
				/>
			)}
		</>
	);
};
