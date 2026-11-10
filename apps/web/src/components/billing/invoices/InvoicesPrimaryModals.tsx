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
import { CashRegisterStudioModal } from "../../cashbox/CashRegisterStudioModal.js";
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
				<CashRegisterStudioModal
					isOpen={isShiftModalOpen}
					onClose={() => setIsShiftModalOpen(false)}
					mode="shift"
					initialTab="reconciliation"
					clinicLegalName={clinicLegalName}
					cashierFullName={currentDoctorName}
					containerTestId="cash-register-modal"
					submitButtonTestId="btn-confirm-close-shift-z-report"
					title="Касса и чеки · Управление сменой и Z-отчёт"
				/>
			)}

			{isRegisterDrawerOpen && (
				<CashRegisterStudioModal
					isOpen={isRegisterDrawerOpen}
					onClose={() => setIsRegisterDrawerOpen(false)}
					mode="studio"
					initialTab="checkout"
					cashierFullName={currentDoctorName}
					clinicLegalName={clinicLegalName}
					patientName={invoices[0]?.patientName}
					patientId={invoices[0]?.patientId}
					totalDueRub={invoices[0]?.totalAmountRub}
					invoiceId={invoices[0]?.id}
					onSuccess={() => {
						if (invoices[0] && onUpdateInvoice) {
							onUpdateInvoice({
								...invoices[0],
								status: "paid" as any,
								paidAmountRub: invoices[0].totalAmountRub,
								paidAt: new Date().toISOString(),
							});
						}
						showToast(`Оплата по счёту ${invoices[0]?.number || ""} успешно зафиксирована в кассе 54-ФЗ`, "success");
					}}
				/>
			)}
		</>
	);
};
