import React from "react";
import { FiscalReceiptModal as Fiscal54FzReceiptModal } from "./FiscalReceiptModal";
import { RefundServiceModal } from "./refunds/RefundServiceModal";
import { TaxDeductionCertificateModal } from "./TaxDeductionCertificateModal";
import { PatientBillingDiscountsToolbar } from "./PatientBillingDiscountsToolbar";
import { PatientBillingFriendlyTab } from "./PatientBillingFriendlyTab";
import { PatientBillingActPreview } from "./PatientBillingActPreview";
import { PatientBillingFooter } from "./PatientBillingFooter";
import { PatientBillingQrPopover } from "./PatientBillingQrPopover";
import { PatientBillingHeader } from "./PatientBillingHeader";
import { usePatientBillingState } from "./usePatientBillingState";
import type { PatientBillingModalProps } from "./PatientBillingTypes";

export * from "./PatientBillingTypes";
export * from "./PatientBillingDiscountsToolbar";
export * from "./PatientBillingPlanStagePanel";
export * from "./PatientBillingTenderPanel";
export * from "./PatientBillingFriendlyTab";
export * from "./PatientBillingActPreview";
export * from "./PatientBillingFooter";
export * from "./PatientBillingQrPopover";

export const PatientBillingModal: React.FC<PatientBillingModalProps> = (props) => {
	const { isOpen, onClose, patient, initialServices = [], activeTreatmentPlan, onPayTreatmentPlanStage } = props;
	const s = usePatientBillingState(props);
	if (!isOpen) return null;

	if (s.isFiscalOpen) {
		return (
			<Fiscal54FzReceiptModal
				isOpen={s.isFiscalOpen}
				onClose={() => s.setIsFiscalOpen(false)}
				items={s.services.map((srv) => ({
					id: srv.id, name: srv.name, code804n: srv.code804n,
					toothFdiNumber: srv.toothNumber ? Number(srv.toothNumber) : undefined,
					quantity: srv.quantity, priceRub: srv.priceRub, discountRub: srv.discountRub,
					subject: "service" as const, method: "full_payment" as const, vatRate: "vat_none" as const,
					measure: "piece" as const, taxDeductionCategory: srv.category === "implantology" ? ("2" as const) : ("1" as const),
					isWarranty: srv.isWarranty, warrantyDiscountPercent: srv.warrantyDiscountPercent,
					warrantyPriceRub: srv.warrantyPriceRub, warrantySourceAppointmentId: srv.warrantySourceAppointmentId,
				}))}
				patientId={patient?.id || "00000000-0000-0000-0000-000000000001"}
				patientName={patient?.fullName || "Пациент"}
				patientPhone={patient?.phone || ""}
				patientDepositRub={s.effectiveDeposit}
				patientFamilyBalanceRub={s.effectiveFamilyBalance}
				clinicName={s.resolvedClinicLegalName}
				clinicLicense={s.resolvedClinicLicenseNumber}
			/>
		);
	}

	if (s.isRefundOpen) {
		return (
			<RefundServiceModal
				isOpen={s.isRefundOpen}
				onClose={() => s.setIsRefundOpen(false)}
				invoiceId={props.contractNumber || "inv-1"}
				invoiceNumber={s.summary.actNumber}
				patientId={patient?.id || "00000000-0000-0000-0000-000000000001"}
				patientName={s.actParams.patient.fullName}
				doctorName={s.actParams.doctor.fullName}
				doctorCommissionPct={30}
				services={s.summary.items.map((it) => ({
					id: it.id, name: it.name, code804n: it.code804n || undefined,
					toothNumber: it.toothNumber ? Number(it.toothNumber) : undefined,
					priceRub: it.priceRub, quantity: it.quantity, doctorName: s.actParams.doctor.fullName, commissionPct: 30,
				}))}
				onRefundSuccess={(res) => s.setToastMsg(`Чек возврата ${res.refundOperationNumber} на сумму ${res.totalRefundRub} ₽ сформирован.`)}
			/>
		);
	}

	if (s.isTaxModalOpen) {
		return (
			<TaxDeductionCertificateModal
				isOpen={s.isTaxModalOpen}
				onClose={() => s.setIsTaxModalOpen(false)}
				patientName={patient?.fullName || "Пациент"}
				patientBirthDate={patient?.birthDate || undefined}
				patientInn={patient?.inn || ""}
				clinicName={s.resolvedLegalName} clinicInn={s.resolvedInn} clinicKpp={s.resolvedKpp} clinicOgrn={s.resolvedOgrn}
				clinicLicenseNumber={s.resolvedClinicLicenseNumber} clinicLicenseDate={s.resolvedLicenseDate} clinicAddress={s.resolvedAddress} chiefDoctorName={s.resolvedChiefDoctor}
				payments={props.fiscalPayments && props.fiscalPayments.length > 0 ? props.fiscalPayments : s.services.map((srv, idx) => ({
					id: srv.id || `srv-${idx + 1}`, dateIso: props.contractDateIso || s.actParams.contractDateIso || s.actParams.actDateIso || "",
					receiptNumber: "", fiscalDocumentNumber: "", fiscalSign: "", serviceName: srv.name, code804n: srv.code804n || "A16.07.002",
					amountRub: (srv.priceRub || 0) * (srv.quantity || 1) - (srv.discountRub || 0),
					taxCode: srv.category === "implantology" || srv.category === "surgery" ? ("2" as const) : ("1" as const),
				}))}
			/>
		);
	}

	return (
		<div ref={s.modalRef} className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-label="Акт выполненных работ и гарантийный талон" data-testid="patient-billing-modal" tabIndex={-1}>
			<div className="relative bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
				<PatientBillingHeader toastMsg={s.toastMsg} onCloseToast={() => s.setToastMsg(null)} propClinicLicenseNumber={s.resolvedClinicLicenseNumber} onClose={onClose} activeTab={s.activeTab} onSetActiveTab={s.setActiveTab} onPrint={s.handlePrint} onCopyText={s.handleCopyText} copied={s.copied} onOpenTaxModal={() => s.setIsTaxModalOpen(true)} />
				<PatientBillingDiscountsToolbar discountPreset={s.discountPreset} onSetDiscountPreset={s.setDiscountPreset} customDiscountPercent={s.customDiscountPercent} onSetCustomDiscountPercent={s.setCustomDiscountPercent} customDiscountRub={s.customDiscountRub} onSetCustomDiscountRub={s.setCustomDiscountRub} discountResult={s.discountResult} totalNetRub={s.totalNetRub} onInputEnterKeyDown={s.handleInputEnterKeyDown} />
				<div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 pb-24">
					{s.activeTab === "friendly" ? (
						<PatientBillingFriendlyTab patientName={patient?.fullName || s.actParams.patient.fullName || "Пациент"} friendlyBreakdown={s.friendlyBreakdown} onOpenQr={() => s.setIsQrOpen(true)} planStages={s.planStages} activeTreatmentPlan={activeTreatmentPlan} isStageApplied={s.isStageApplied} onSetIsStageApplied={s.setIsStageApplied} selectedStage={s.selectedStage} initialServicesCount={initialServices.length} getStageAmountRub={s.getStageAmountRub} onSelectPlanStage={(stg) => { s.setSelectedStageId(stg.id); s.setIsStageApplied(true); const amt = s.getStageAmountRub(stg); onPayTreatmentPlanStage?.(stg.id, amt); }} onTenderPlanStage={(stg) => { const target = stg ?? s.selectedStage; if (target) { s.setSelectedStageId(target.id); s.setIsStageApplied(true); const amt = s.getStageAmountRub(target); onPayTreatmentPlanStage?.(target.id, amt); s.handleFiscalizeAction(); }}} selectedTender={s.selectedTender} onSelectTender={s.setSelectedTender} onFiscalizeAction={s.handleFiscalizeAction} totalNetRub={s.totalNetRub} receivedCashRub={s.receivedCashRub} onSetReceivedCashRub={s.setReceivedCashRub} cashChangeResult={s.cashChangeResult} primaryInputRef={s.primaryInputRef} onInputEnterKeyDown={s.handleInputEnterKeyDown} installmentSchedule={s.installmentSchedule} effectiveDeposit={s.effectiveDeposit} effectiveFamilyBalance={s.effectiveFamilyBalance} customServiceName={s.customServiceName} onSetCustomServiceName={s.setCustomServiceName} customAmountRub={s.customAmountRub} onSetCustomAmountRub={s.setCustomAmountRub} itemWarrantyMap={s.itemWarrantyMap} onToggleItemWarranty={s.toggleItemWarranty} />
					) : (
						<PatientBillingActPreview activeTab={s.activeTab} actParams={s.actParams} summary={s.summary} />
					)}
				</div>
				<PatientBillingFooter onPrint={s.handlePrint} summary={s.summary} actParams={s.actParams} patient={patient} onSendWhatsApp={s.handleSendWhatsApp} onOpenRefund={() => s.setIsRefundOpen(true)} onOpenTaxModal={() => s.setIsTaxModalOpen(true)} isMobileActionsOpen={s.isMobileActionsOpen} onSetIsMobileActionsOpen={s.setIsMobileActionsOpen} totalAmountRubFormatted={s.friendlyBreakdown.totalAmountRubFormatted} onFiscalizeAction={s.handleFiscalizeAction} onClose={onClose} />
				<PatientBillingQrPopover isOpen={s.isQrOpen} onClose={() => s.setIsQrOpen(false)} actNumber={s.summary.actNumber} totalAmountRub={s.friendlyBreakdown.totalAmountRub} totalAmountRubFormatted={s.friendlyBreakdown.totalAmountRubFormatted} patientFullName={s.actParams.patient.fullName} />
			</div>
		</div>
	);
};
