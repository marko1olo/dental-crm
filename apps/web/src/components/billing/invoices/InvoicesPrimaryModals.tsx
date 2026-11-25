/**
 * apps/web/src/components/billing/invoices/InvoicesPrimaryModals.tsx
 *
 * Primary modals for InvoicesView: QuickCreate, Installments.
 * CashRegisterStudioModal is unified exclusively in InvoicesModalsLayer (Mandate 8b, 8bf).
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { QuickCreateInvoiceModal } from "../QuickCreateInvoiceModal.js";
import { PatientInstallmentsModal } from "../PatientInstallmentsModal.js";
import type { BillingInvoice } from "../invoiceTypes.js";

interface InvoicesPrimaryModalsProps {
	readonly isCreateModalOpen: boolean;
	readonly setIsCreateModalOpen: (open: boolean) => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly currentDoctorName: string;
	readonly clinicLegalName: string;
	readonly invoices: BillingInvoice[];
	readonly activePaymentInvoice?: BillingInvoice | null | undefined;
	readonly onCloseShiftAction?: (() => Promise<void> | void) | undefined;
	readonly handleCreateInvoice: (params: {
		patientName: string; serviceName: string; servicePriceRub: number; isWarranty100: boolean;
	}) => void;
	readonly isInstallmentsModalOpen: boolean;
	readonly setIsInstallmentsModalOpen: (open: boolean) => void;
	readonly setBankInstallmentInvoice: (inv: BillingInvoice | null) => void;
	readonly isShiftModalOpen?: boolean | undefined;
	readonly setIsShiftModalOpen?: ((open: boolean) => void) | undefined;
	readonly isRegisterDrawerOpen?: boolean | undefined;
	readonly setIsRegisterDrawerOpen?: ((open: boolean) => void) | undefined;
	readonly setActivePaymentInvoice?: ((inv: BillingInvoice | null) => void) | undefined;
	readonly onUpdateInvoice?: ((inv: BillingInvoice) => void) | undefined;
}

export const InvoicesPrimaryModals: React.FC<InvoicesPrimaryModalsProps> = (props) => {
	const {
		isCreateModalOpen, setIsCreateModalOpen, patientId, patientName,
		currentDoctorName, clinicLegalName, invoices, activePaymentInvoice,
		handleCreateInvoice, isInstallmentsModalOpen,
		setIsInstallmentsModalOpen, setBankInstallmentInvoice,
	} = props;

	const selectedInvoice = activePaymentInvoice ?? invoices[0] ?? null;

	return (
		<>
			<QuickCreateInvoiceModal
				isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}
				patientName={patientName} currentDoctorName={currentDoctorName} onCreateInvoice={handleCreateInvoice}
			/>

			{isInstallmentsModalOpen && (
				<PatientInstallmentsModal
					key={patientId || "no-patient"}
					isOpen={isInstallmentsModalOpen} onClose={() => setIsInstallmentsModalOpen(false)}
					patientId={patientId} patientName={patientName} clinicName={clinicLegalName}
					onOpenBankInstallment={() => {
						setIsInstallmentsModalOpen(false);
						setBankInstallmentInvoice(selectedInvoice ?? null);
					}}
				/>
			)}
		</>
	);
};
