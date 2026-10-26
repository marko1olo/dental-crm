/**
 * tabs/formSwitch/FinancialDocumentForms.tsx
 * Financial and warranty document forms dispatcher (Mandate 8b <= 120 lines, Mandate 8e, Mandate 8x)
 */

import React from "react";
import { CompletedWorksActForm } from "../../forms/CompletedWorksActForm";
import { InstallmentScheduleForm } from "../../forms/InstallmentScheduleForm";
import { PaidServiceContractForm } from "../../forms/PaidServiceContractForm";
import { PaymentInvoiceDocumentForm } from "../../forms/PaymentInvoiceDocumentForm";
import { PaymentReceiptForm } from "../../forms/PaymentReceiptForm";
import { PaymentRefundCorrectionRequestForm } from "../../forms/PaymentRefundCorrectionRequestForm";
import { TaxDeductionApplicationForm } from "../../forms/TaxDeductionApplicationForm";
import { TreatmentCostEstimateForm } from "../../forms/TreatmentCostEstimateForm";
import { TreatmentPlanAcceptanceForm } from "../../forms/TreatmentPlanAcceptanceForm";
import { WarrantyServiceMemoForm } from "../../forms/WarrantyServiceMemoForm";
import type { DocumentFormSwitchProps } from "./documentFormSwitchTypes";

export const FinancialDocumentForms: React.FC<DocumentFormSwitchProps> = React.memo(
	function FinancialDocumentForms(props) {
		const { selectedDocumentKind } = props;

		return (
			<>
				{((selectedDocumentKind as any) === "paid_medical_services_contract" || (selectedDocumentKind as any) === "paid_service_contract") && (
					<PaidServiceContractForm
						documentPatientFullName={props.documentPatient?.fullName ?? props.activePatient?.fullName ?? null}
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						totalRubValue={props.paidContractTotalRubValue ? props.paidContractTotalRubValue() : 0}
						totalRubFormatted={props.money && props.paidContractTotalRubValue ? props.money(props.paidContractTotalRubValue()) : "0 ₽"}
					/>
				)}
				{selectedDocumentKind === "completed_works_act" && (
					<CompletedWorksActForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null} dashboard={props.dashboard} money={props.money}
						completedActContractReferenceForUi={props.completedActContractReferenceForUi}
						completedActFiscalReceiptLines={props.completedActFiscalReceiptLines}
						completedActPaidRubValue={props.completedActPaidRubValue}
						selectedCompletedActContractDocumentId={props.selectedCompletedActContractDocumentId}
					/>
				)}
				{selectedDocumentKind === "payment_receipt" && (
					<PaymentReceiptForm
						money={props.money} paymentFiscalReceiptLabelForUi={props.paymentFiscalReceiptLabelForUi}
						paymentReceiptFiscalReceiptLines={props.paymentReceiptFiscalReceiptLines}
						paymentReceiptIssuedByValue={props.paymentReceiptIssuedByValue}
						paymentReceiptPayerBirthDateValue={props.paymentReceiptPayerBirthDateValue}
						paymentReceiptPayerFullNameValue={props.paymentReceiptPayerFullNameValue}
						paymentReceiptPayerIdentityDocumentValue={props.paymentReceiptPayerIdentityDocumentValue}
						paymentReceiptPayerInnValue={props.paymentReceiptPayerInnValue}
						paymentReceiptPayerRelationshipValue={props.paymentReceiptPayerRelationshipValue}
						selectedPaymentReceiptPayments={props.selectedPaymentReceiptPayments}
						selectedPaymentReceiptTotalRub={props.selectedPaymentReceiptTotalRub}
					/>
				)}
				{((selectedDocumentKind as any) === "installment_payment_schedule" || (selectedDocumentKind as any) === "installment_schedule") && (
					<InstallmentScheduleForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						documentPatient={props.documentPatient ?? props.activePatient ?? null}
						installmentScheduleBaseDocumentTitleValue={props.installmentScheduleBaseDocumentTitleValue}
						installmentScheduleInstallmentRows={props.installmentScheduleInstallmentRows}
						installmentSchedulePrepaidRubValue={props.installmentSchedulePrepaidRubValue}
						installmentScheduleRemainingRubValue={props.installmentScheduleRemainingRubValue}
						installmentScheduleTotalRubValue={props.installmentScheduleTotalRubValue} money={props.money}
					/>
				)}
				{selectedDocumentKind === "treatment_cost_estimate" && (
					<TreatmentCostEstimateForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null} money={props.money}
						treatmentEstimatePatientOrPayerFullNameValue={props.treatmentEstimatePatientOrPayerFullNameValue}
						treatmentEstimateTotalRubValue={props.treatmentEstimateTotalRubValue}
						treatmentEstimateTreatmentBasisValue={props.treatmentEstimateTreatmentBasisValue}
					/>
				)}
				{selectedDocumentKind === "treatment_plan_acceptance" && (
					<TreatmentPlanAcceptanceForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null} inferredTreatmentArea={props.inferredTreatmentArea}
						money={props.money} normalizedTreatmentPlanAcceptanceVariant={props.normalizedTreatmentPlanAcceptanceVariant}
						treatmentAcceptancePlannedTotalRub={props.treatmentAcceptancePlannedTotalRub}
					/>
				)}
				{selectedDocumentKind === "payment_invoice" && (
					<PaymentInvoiceDocumentForm
						documentPatientFullName={props.documentPatient?.fullName ?? props.activePatient?.fullName ?? null}
						totalRubFormatted={props.money && props.paymentInvoiceTotalRubValue ? props.money(props.paymentInvoiceTotalRubValue()) : "0 ₽"}
					/>
				)}
				{selectedDocumentKind === "payment_refund_correction_request" && (
					<PaymentRefundCorrectionRequestForm
						activePatient={props.activePatient ?? null} eligiblePayments={props.typedEligibleRefundCorrectionPayments}
						selectedRefundCorrectionPayment={props.selectedRefundCorrectionPayment ?? null} onSelectOriginalPayment={props.selectRefundOriginalPayment}
						paymentPayerFullName={props.paymentPayerFullName} paymentPayerIdentityDocument={props.paymentPayerIdentityDocument}
						paymentFiscalReceiptNumber={props.paymentFiscalReceiptNumber}
					/>
				)}
				{selectedDocumentKind === "tax_deduction_application" && (
					<TaxDeductionApplicationForm
						relationshipOptions={props.taxApplicationRelationshipOptions ?? []} formOptions={props.taxApplicationFormOptions ?? []}
						deliveryChannelOptions={props.taxApplicationDeliveryChannelOptions ?? []}
						normalizeRelationship={props.normalizedTaxApplicationRelationshipSelect ?? ((v) => v as any)}
						normalizeForm={props.normalizedTaxApplicationForm ?? ((v) => v as any)}
						normalizeDeliveryChannel={props.normalizedTaxApplicationDeliveryChannel ?? ((v) => v as any)}
					/>
				)}
				{selectedDocumentKind === "warranty_service_memo" && (
					<WarrantyServiceMemoForm activeDoctorFullName={props.activeDoctor?.fullName ?? null} warrantyTeethOrAreaValue={props.warrantyTeethOrAreaValue} warrantyServiceOrWorkNameValue={props.warrantyServiceOrWorkNameValue} />
				)}
			</>
		);
	},
);
