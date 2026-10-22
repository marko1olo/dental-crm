import type React from "react";
import type { TreatmentPlanItem } from "../treatment-plans/types";
import { InvoiceTaxDecreeBanner } from "./InvoiceTaxDecreeBanner";
import { InvoiceAdminPinDrawer } from "./InvoiceAdminPinDrawer";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceGenerationHeader } from "./InvoiceGenerationHeader";
import { InvoiceGenerationFooter } from "./InvoiceGenerationFooter";
import { useInvoiceGenerationState } from "./useInvoiceGenerationState";

export { InvoiceTaxDecreeBanner, InvoiceDecree659Banner } from "./InvoiceTaxDecreeBanner";
export { InvoiceAdminPinDrawer } from "./InvoiceAdminPinDrawer";
export { InvoiceItemsTable } from "./InvoiceItemsTable";
export { submitInvoiceFromPlan, createTaxAddendum, createDecree659Addendum } from "./invoiceGenerationOperations";
export { InvoiceGenerationHeader } from "./InvoiceGenerationHeader";
export { InvoiceGenerationFooter } from "./InvoiceGenerationFooter";
export { useInvoiceGenerationState } from "./useInvoiceGenerationState";

export interface InvoiceGenerationModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientBalanceRub?: number | undefined;
	readonly planId?: string | undefined;
	readonly planNumber?: string | undefined;
	readonly planTitle?: string | undefined;
	readonly planCreatedAtIso?: string | undefined;
	readonly approvedAtIso?: string | null | undefined;
	readonly isSignedWithPatient?: boolean | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorUserId?: string | undefined;
	readonly planItems: readonly TreatmentPlanItem[];
	readonly onInvoiceCreated?: ((data: any) => void) | undefined;
	readonly className?: string | undefined;
	readonly initialShowAdminPinDrawer?: boolean | undefined;
}

export const InvoiceGenerationModal: React.FC<InvoiceGenerationModalProps> = (props) => {
	const { isOpen, onClose, patientName = "Пациент", planNumber = "ПЛАН-01", planTitle = "Комплексный план лечения", doctorFullName = "Лечащий врач", className = "" } = props;
	const s = useInvoiceGenerationState(props);
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
			<div className={`w-full max-w-4xl max-h-[92vh] flex flex-col bg-[var(--paper)] rounded-2xl shadow-2xl border border-[var(--line)] overflow-hidden ${className}`}>
				<InvoiceGenerationHeader planNumber={planNumber} planTitle={planTitle} patientName={patientName} doctorFullName={doctorFullName} documentType={s.documentType} onSetDocumentType={s.setDocumentType} onLockAllPrices={s.handleLockAllPrices} onUpdateAllToCurrent={s.handleUpdateAllToCurrent} onClose={onClose} />
				<div className="flex-1 overflow-y-auto p-6 min-h-0 flex flex-col">
					<InvoiceTaxDecreeBanner unapprovedItems={s.unapprovedItems} isCreatingAddendum={s.isCreatingAddendum} onCreateAddendum={s.handleCreateAddendum} />
					<InvoiceItemsTable report={s.report} adminOverrideAuthorized={s.adminOverrideAuthorized} unapprovedItemIds={s.unapprovedItemIds} onItemResolutionChange={(itemId, resolution) => s.setItemResolutions((prev) => ({ ...prev, [itemId]: resolution }))} onSelectAnalogue={s.handleSelectAnalogue} />
				</div>
				<InvoiceAdminPinDrawer show={s.showAdminPinDrawer} adminPinInput={s.adminPinInput} setAdminPinInput={s.setAdminPinInput} adminReasonInput={s.adminReasonInput} setAdminReasonInput={s.setAdminReasonInput} isVerifyingPin={s.isVerifyingPin} onDoctorClinicalOverride={s.handleDoctorClinicalOverride} onVerifyAdminPin={s.handleVerifyAdminPin} onCloseDrawer={() => s.setShowAdminPinDrawer(false)} />
				<InvoiceGenerationFooter report={s.report} adminOverrideAuthorized={s.adminOverrideAuthorized} adminStaffName={s.adminStaffName} onDoctorClinicalOverride={s.handleDoctorClinicalOverride} onOpenAdminPinDrawer={() => s.setShowAdminPinDrawer(true)} onCreateInvoice={s.handleCreateInvoice} isSubmitting={s.isSubmitting} isCreatingAddendum={s.isCreatingAddendum} unapprovedItemsCount={s.unapprovedItems.length} documentType={s.documentType} />
			</div>
		</div>
	);
};

export default InvoiceGenerationModal;
