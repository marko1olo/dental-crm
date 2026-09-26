import React from "react";
import type {
	ClinicProfileDraft,
	DocumentKind,
	GeneratedDocument,
	Patient,
	Payment,
	StaffMember,
} from "@dental/shared";

// Modular Forms
import { AnesthesiaConsentLogForm } from "../forms/AnesthesiaConsentLogForm";
import { CompletedWorksActForm } from "../forms/CompletedWorksActForm";
import { DailyDentistWorkSheet037uForm } from "../forms/DailyDentistWorkSheet037uForm";
import { DentalMedicalCard043uForm } from "../forms/DentalMedicalCard043uForm";
import { InformedConsentForm } from "../forms/InformedConsentForm";
import { InstallmentScheduleForm } from "../forms/InstallmentScheduleForm";
import { LabWorkOrderForm } from "../forms/LabWorkOrderForm";
import { MedicalCardExtract003vuForm } from "../forms/MedicalCardExtract003vuForm";
import { MedicalDocumentReleaseReceiptForm } from "../forms/MedicalDocumentReleaseReceiptForm";
import { MedicalInterventionRefusalForm } from "../forms/MedicalInterventionRefusalForm";
import { MedicalRecordCopyRequestForm } from "../forms/MedicalRecordCopyRequestForm";
import { MinorLegalRepresentativeConsentForm } from "../forms/MinorLegalRepresentativeConsentForm";
import { OrthodonticCard043_1uForm } from "../forms/OrthodonticCard043_1uForm";
import { PaidServiceContractForm } from "../forms/PaidServiceContractForm";
import { PatientIntakeQuestionnaireForm } from "../forms/PatientIntakeQuestionnaireForm";
import { PaymentInvoiceDocumentForm } from "../forms/PaymentInvoiceDocumentForm";
import { PaymentReceiptForm } from "../forms/PaymentReceiptForm";
import { PaymentRefundCorrectionRequestForm } from "../forms/PaymentRefundCorrectionRequestForm";
import { PersonalDataProcessingConsentForm } from "../forms/PersonalDataProcessingConsentForm";
import { PhotoVideoConsentForm } from "../forms/PhotoVideoConsentForm";
import { PostVisitRecommendationsForm } from "../forms/PostVisitRecommendationsForm";
import { PrescriptionOrderForm } from "../forms/PrescriptionOrderForm";
import { ProcedureSpecificConsentForm } from "../forms/ProcedureSpecificConsentForm";
import { RadiationDoseSheetForm } from "../forms/RadiationDoseSheetForm";
import { SummaryWorkStatement039uForm } from "../forms/SummaryWorkStatement039uForm";
import { TaxDeductionApplicationForm } from "../forms/TaxDeductionApplicationForm";
import { TreatmentCostEstimateForm } from "../forms/TreatmentCostEstimateForm";
import { TreatmentPlanAcceptanceForm } from "../forms/TreatmentPlanAcceptanceForm";
import { TreatmentPlanDocumentForm } from "../forms/TreatmentPlanDocumentForm";
import { VisitAttendanceCertificateForm } from "../forms/VisitAttendanceCertificateForm";
import { WarrantyServiceMemoForm } from "../forms/WarrantyServiceMemoForm";
import { XrayCbctReferralForm } from "../forms/XrayCbctReferralForm";

export interface DocumentFormSwitchProps {
	selectedDocumentKind: DocumentKind;
	activeDoctor?: StaffMember | null;
	activePatient?: Patient | null;
	documentPatient?: Patient | null;
	dashboard?: any;
	clinicProfileDraft?: ClinicProfileDraft;
	inferredTreatmentArea?: string;
	activeAppointment?: any;
	activeIssuedPaidContracts?: any;
	compactDocumentText?: any;
	completedActContractReferenceForUi?: any;
	completedActFiscalReceiptLines?: any;
	completedActPaidRubValue?: any;
	formatDateTime?: (dt: string) => string;
	formatShortDate?: (d: string) => string;
	money?: (v: number | null | undefined) => string;
	paidContractTotalRubValue?: () => number;
	selectedCompletedActContractDocumentId?: string;
	eligiblePaymentReceiptPayments?: Payment[];
	paymentFiscalReceiptLabelForUi?: (p: any) => string;
	paymentReceiptFiscalReceiptLines?: any;
	paymentReceiptIssuedByValue?: any;
	paymentReceiptPayerBirthDateValue?: any;
	paymentReceiptPayerFullNameValue?: any;
	paymentReceiptPayerIdentityDocumentValue?: any;
	paymentReceiptPayerInnValue?: any;
	paymentReceiptPayerRelationshipValue?: any;
	selectedPaymentReceiptIdSet?: Set<string>;
	selectedPaymentReceiptTotalRub?: number;
	installmentScheduleBaseDocumentTitleValue?: any;
	installmentScheduleInstallmentRows?: any;
	installmentSchedulePrepaidRubValue?: any;
	installmentScheduleRemainingRubValue?: any;
	installmentScheduleTotalRubValue?: any;
	treatmentEstimatePatientOrPayerFullNameValue?: any;
	treatmentEstimateTotalRubValue?: any;
	treatmentEstimateTreatmentBasisValue?: any;
	plannedServiceLinesForFinancialPayload?: any;
	normalizedTreatmentPlanAcceptanceVariant?: any;
	treatmentAcceptancePlannedTotalRub?: any;
	applyPostVisitCarePreset?: any;
	changePostVisitCareTopic?: any;
	markPostVisitManualEdited?: any;
	normalizedPostVisitCareTopic?: any;
	postVisitCareTopicOptions?: any;
	normalizedXrayPregnancyStatus?: any;
	normalizedXrayPriority?: any;
	normalizedXrayStudyType?: any;
	xrayPregnancyStatusOptions?: any;
	xrayStudyTypeOptions?: any;
	typedIssuedMedicalCopyRequestDocuments?: any[];
	releaseProtectionNote?: string;
	setReleaseProtectionNote?: (v: string) => void;
	typedEligibleRefundCorrectionPayments?: Payment[];
	selectedRefundCorrectionPayment?: Payment | null;
	selectRefundOriginalPayment?: (id: string) => void;
	paymentPayerFullName?: string;
	paymentPayerIdentityDocument?: string;
	paymentFiscalReceiptNumber?: string;
	paymentInvoiceTotalRubValue?: () => number;
	procedureSpecificConsentProcedureOptions?: any;
	normalizedProcedureSpecificConsentProcedure?: any;
	renderClinicalToothRowsEditor?: any;
	photoVideoMaterialOptions?: any;
	togglePhotoVideoMaterial?: any;
	taxApplicationFormOptions?: any;
	normalizedTaxApplicationForm?: any;
	taxApplicationRelationshipOptions?: any;
	normalizedTaxApplicationRelationshipSelect?: any;
	taxApplicationDeliveryChannelOptions?: any;
	normalizedTaxApplicationDeliveryChannel?: any;
	eligibleTaxPayments?: any;
	selectedTaxPaymentIdSet?: Set<string>;
	selectAllEligibleTaxPaymentsForCurrentDocument?: any;
	selectedTaxPaymentTotalRub?: number;
	selectedDocumentUsesTaxPaymentSelection?: boolean;
	minorConsentPatientFullNameValue?: string;
	minorConsentPatientBirthDateValue?: string;
	minorRepresentativeFullNameValue?: string;
	minorRepresentativeRelationshipValue?: string;
	minorRepresentativePhoneValue?: string;
	minorRepresentativeIdentityDocumentValue?: string;
	minorConsentInterventionScopeValue?: string;
	minorConsentDiagnosisOrIndicationValue?: string;
	warrantyTeethOrAreaValue?: string;
	warrantyServiceOrWorkNameValue?: string;
	warrantyLinkedActOrContractValue?: string;
	patientIntakePregnancyStatusOptions?: any;
	normalizedPatientIntakePregnancyStatus?: any;
}

export const DocumentFormSwitch: React.FC<DocumentFormSwitchProps> = React.memo(
	function DocumentFormSwitch(props) {
		const { selectedDocumentKind } = props;

		return (
			<section className="document-factory-form">
				{selectedDocumentKind === "dental_medical_card_043u" && (
					<DentalMedicalCard043uForm
						activeDoctorFullName={props.activeDoctor?.fullName}
						activePatient={props.activePatient}
						activeVisit={props.dashboard?.activeVisit}
					/>
				)}
				{selectedDocumentKind === "daily_dentist_worksheet_037u" && (
					<DailyDentistWorkSheet037uForm
						activeDoctorFullName={props.activeDoctor?.fullName}
					/>
				)}
				{selectedDocumentKind === "summary_work_statement_039u" && (
					<SummaryWorkStatement039uForm
						activeDoctorFullName={props.activeDoctor?.fullName}
					/>
				)}
				{selectedDocumentKind === "medical_card_extract_003vu" && (
					<MedicalCardExtract003vuForm
						activeDoctorFullName={props.activeDoctor?.fullName}
						documentPatient={props.documentPatient ?? props.activePatient}
					/>
				)}
				{selectedDocumentKind === "orthodontic_medical_card_043_1u" && (
					<OrthodonticCard043_1uForm
						activeDoctorFullName={props.activeDoctor?.fullName}
						activePatient={props.activePatient}
					/>
				)}
				{selectedDocumentKind === "patient_intake_questionnaire" && (
					<PatientIntakeQuestionnaireForm
						pregnancyStatusOptions={props.patientIntakePregnancyStatusOptions}
						normalizedPregnancyStatus={props.normalizedPatientIntakePregnancyStatus}
					/>
				)}
				{selectedDocumentKind === "radiation_dose_sheet" && (
					<RadiationDoseSheetForm
						activeDoctorFullName={props.activeDoctor?.fullName}
					/>
				)}
				{selectedDocumentKind === "minor_legal_representative_consent" && (
					<MinorLegalRepresentativeConsentForm
						patientFullNameValue={props.minorConsentPatientFullNameValue}
						patientBirthDateValue={props.minorConsentPatientBirthDateValue}
						representativeFullNameValue={props.minorRepresentativeFullNameValue}
						representativeRelationshipValue={props.minorRepresentativeRelationshipValue}
						representativePhoneValue={props.minorRepresentativePhoneValue}
						representativeIdentityDocumentValue={props.minorRepresentativeIdentityDocumentValue}
						interventionScopeValue={props.minorConsentInterventionScopeValue}
						diagnosisOrIndicationValue={props.minorConsentDiagnosisOrIndicationValue}
					/>
				)}
				{selectedDocumentKind === "warranty_service_memo" && (
					<WarrantyServiceMemoForm
						teethOrAreaValue={props.warrantyTeethOrAreaValue}
						serviceOrWorkNameValue={props.warrantyServiceOrWorkNameValue}
						linkedActOrContractValue={props.warrantyLinkedActOrContractValue}
					/>
				)}
				{selectedDocumentKind === "completed_works_act" && (
					<CompletedWorksActForm
						activeDoctor={props.activeDoctor}
						activeIssuedPaidContracts={props.activeIssuedPaidContracts}
						activePatient={props.activePatient}
						compactDocumentText={props.compactDocumentText}
						completedActContractReferenceForUi={props.completedActContractReferenceForUi}
						completedActFiscalReceiptLines={props.completedActFiscalReceiptLines}
						completedActPaidRubValue={props.completedActPaidRubValue}
						documentPatient={props.documentPatient}
						formatDateTime={props.formatDateTime}
						formatShortDate={props.formatShortDate}
						money={props.money}
						paidContractTotalRubValue={props.paidContractTotalRubValue}
						selectedCompletedActContractDocumentId={props.selectedCompletedActContractDocumentId}
					/>
				)}
				{selectedDocumentKind === "payment_receipt" && (
					<PaymentReceiptForm
						documentPatient={props.documentPatient}
						eligiblePaymentReceiptPayments={props.eligiblePaymentReceiptPayments}
						money={props.money}
						paymentFiscalReceiptLabelForUi={props.paymentFiscalReceiptLabelForUi}
						paymentReceiptFiscalReceiptLines={props.paymentReceiptFiscalReceiptLines}
						paymentReceiptIssuedByValue={props.paymentReceiptIssuedByValue}
						paymentReceiptPayerBirthDateValue={props.paymentReceiptPayerBirthDateValue}
						paymentReceiptPayerFullNameValue={props.paymentReceiptPayerFullNameValue}
						paymentReceiptPayerIdentityDocumentValue={props.paymentReceiptPayerIdentityDocumentValue}
						paymentReceiptPayerInnValue={props.paymentReceiptPayerInnValue}
						paymentReceiptPayerRelationshipValue={props.paymentReceiptPayerRelationshipValue}
						selectedPaymentReceiptIdSet={props.selectedPaymentReceiptIdSet}
						selectedPaymentReceiptTotalRub={props.selectedPaymentReceiptTotalRub}
					/>
				)}
				{selectedDocumentKind === "installment_schedule" && (
					<InstallmentScheduleForm
						activeDoctor={props.activeDoctor}
						documentPatient={props.documentPatient}
						installmentScheduleBaseDocumentTitleValue={props.installmentScheduleBaseDocumentTitleValue}
						installmentScheduleInstallmentRows={props.installmentScheduleInstallmentRows}
						installmentSchedulePrepaidRubValue={props.installmentSchedulePrepaidRubValue}
						installmentScheduleRemainingRubValue={props.installmentScheduleRemainingRubValue}
						installmentScheduleTotalRubValue={props.installmentScheduleTotalRubValue}
						money={props.money}
					/>
				)}
				{selectedDocumentKind === "treatment_cost_estimate" && (
					<TreatmentCostEstimateForm
						activeDoctor={props.activeDoctor}
						documentPatient={props.documentPatient}
						money={props.money}
						treatmentEstimatePatientOrPayerFullNameValue={props.treatmentEstimatePatientOrPayerFullNameValue}
						treatmentEstimateTotalRubValue={props.treatmentEstimateTotalRubValue}
						treatmentEstimateTreatmentBasisValue={props.treatmentEstimateTreatmentBasisValue}
					/>
				)}
				{selectedDocumentKind === "treatment_plan" && (
					<TreatmentPlanDocumentForm
						activeDoctorFullName={props.activeDoctor?.fullName}
						activeVisitComplaint={props.dashboard?.activeVisit?.complaint}
						inferredTreatmentArea={props.inferredTreatmentArea}
						plannedServiceLinesForFinancialPayload={props.plannedServiceLinesForFinancialPayload}
					/>
				)}
				{selectedDocumentKind === "treatment_plan_acceptance" && (
					<TreatmentPlanAcceptanceForm
						activeDoctor={props.activeDoctor}
						inferredTreatmentArea={props.inferredTreatmentArea}
						money={props.money}
						normalizedTreatmentPlanAcceptanceVariant={props.normalizedTreatmentPlanAcceptanceVariant}
						treatmentAcceptancePlannedTotalRub={props.treatmentAcceptancePlannedTotalRub}
					/>
				)}
				{selectedDocumentKind === "post_visit_recommendations" && (
					<PostVisitRecommendationsForm
						activeAppointment={props.activeAppointment}
						activeDoctor={props.activeDoctor}
						applyPostVisitCarePreset={props.applyPostVisitCarePreset}
						changePostVisitCareTopic={props.changePostVisitCareTopic}
						formatDateTime={props.formatDateTime}
						inferredTreatmentArea={props.inferredTreatmentArea}
						markPostVisitManualEdited={props.markPostVisitManualEdited}
						normalizedPostVisitCareTopic={props.normalizedPostVisitCareTopic}
						postVisitCareTopicOptions={props.postVisitCareTopicOptions}
					/>
				)}
				{selectedDocumentKind === "prescription_order" && (
					<PrescriptionOrderForm
						activeDoctorFullName={props.activeDoctor?.fullName}
					/>
				)}
				{selectedDocumentKind === "lab_work_order" && (
					<LabWorkOrderForm
						inferredTreatmentArea={props.inferredTreatmentArea}
					/>
				)}
				{selectedDocumentKind === "xray_cbct_referral" && (
					<XrayCbctReferralForm
						activeDoctorFullName={props.activeDoctor?.fullName}
						inferredTreatmentArea={props.inferredTreatmentArea}
						normalizedXrayPregnancyStatus={props.normalizedXrayPregnancyStatus}
						normalizedXrayPriority={props.normalizedXrayPriority}
						normalizedXrayStudyType={props.normalizedXrayStudyType}
						xrayPregnancyStatusOptions={props.xrayPregnancyStatusOptions}
						xrayStudyTypeOptions={props.xrayStudyTypeOptions}
					/>
				)}
				{selectedDocumentKind === "medical_record_copy_request" && (
					<MedicalRecordCopyRequestForm
						documentPatient={props.documentPatient ?? props.activePatient}
					/>
				)}
				{selectedDocumentKind === "visit_attendance_certificate" && (
					<VisitAttendanceCertificateForm
						activeAppointment={props.activeAppointment}
						activeDoctor={props.activeDoctor}
					/>
				)}
				{selectedDocumentKind === "medical_document_release_receipt" && (
					<MedicalDocumentReleaseReceiptForm
						documentPatient={props.documentPatient ?? props.activePatient}
						issuedMedicalCopyRequestDocuments={props.typedIssuedMedicalCopyRequestDocuments}
						releaseProtectionNote={props.releaseProtectionNote}
						setReleaseProtectionNote={props.setReleaseProtectionNote}
					/>
				)}
				{selectedDocumentKind === "payment_refund_correction_request" && (
					<PaymentRefundCorrectionRequestForm
						activePatient={props.activePatient}
						eligiblePayments={props.typedEligibleRefundCorrectionPayments}
						selectedRefundCorrectionPayment={props.selectedRefundCorrectionPayment}
						onSelectOriginalPayment={props.selectRefundOriginalPayment}
						paymentPayerFullName={props.paymentPayerFullName}
						paymentPayerIdentityDocument={props.paymentPayerIdentityDocument}
						paymentFiscalReceiptNumber={props.paymentFiscalReceiptNumber}
					/>
				)}
				{selectedDocumentKind === "paid_service_contract" && (
					<PaidServiceContractForm
						documentPatientFullName={props.documentPatient?.fullName}
						activeDoctorFullName={props.activeDoctor?.fullName}
						activeVisitComplaint={props.dashboard?.activeVisit?.complaint}
						activeVisitTreatmentPlan={props.dashboard?.activeVisit?.treatmentPlan}
						totalRubValue={props.paidContractTotalRubValue ? props.paidContractTotalRubValue() : 0}
						totalRubFormatted={props.money && props.paidContractTotalRubValue ? props.money(props.paidContractTotalRubValue()) : "0 ₽"}
					/>
				)}
				{selectedDocumentKind === "payment_invoice" && (
					<PaymentInvoiceDocumentForm
						documentPatientFullName={props.documentPatient?.fullName}
						activeDoctorFullName={props.activeDoctor?.fullName}
						clinicProfileDraft={props.clinicProfileDraft}
						totalRubValue={props.paymentInvoiceTotalRubValue ? props.paymentInvoiceTotalRubValue() : 0}
						totalRubFormatted={props.money && props.paymentInvoiceTotalRubValue ? props.money(props.paymentInvoiceTotalRubValue()) : "0 ₽"}
					/>
				)}
				{selectedDocumentKind === "informed_consent" && (
					<InformedConsentForm
						documentPatientFullName={props.documentPatient?.fullName}
						activeDoctorFullName={props.activeDoctor?.fullName}
					/>
				)}
				{selectedDocumentKind === "procedure_specific_consent" && (
					<ProcedureSpecificConsentForm
						procedureSpecificConsentProcedureOptions={props.procedureSpecificConsentProcedureOptions}
						normalizedProcedureSpecificConsentProcedure={props.normalizedProcedureSpecificConsentProcedure}
						renderClinicalToothRowsEditor={props.renderClinicalToothRowsEditor}
					/>
				)}
				{selectedDocumentKind === "anesthesia_consent_log" && (
					<AnesthesiaConsentLogForm
						inferredTreatmentArea={props.inferredTreatmentArea}
					/>
				)}
				{selectedDocumentKind === "photo_video_consent" && (
					<PhotoVideoConsentForm
						photoVideoMaterialOptions={props.photoVideoMaterialOptions}
						togglePhotoVideoMaterial={props.togglePhotoVideoMaterial}
					/>
				)}
				{selectedDocumentKind === "personal_data_processing_consent" && (
					<PersonalDataProcessingConsentForm
						clinicProfileDraft={props.clinicProfileDraft}
					/>
				)}
				{selectedDocumentKind === "tax_deduction_application" && (
					<TaxDeductionApplicationForm
						taxApplicationFormOptions={props.taxApplicationFormOptions}
						normalizedTaxApplicationForm={props.normalizedTaxApplicationForm}
						taxApplicationRelationshipOptions={props.taxApplicationRelationshipOptions}
						normalizedTaxApplicationRelationshipSelect={props.normalizedTaxApplicationRelationshipSelect}
						taxApplicationDeliveryChannelOptions={props.taxApplicationDeliveryChannelOptions}
						normalizedTaxApplicationDeliveryChannel={props.normalizedTaxApplicationDeliveryChannel}
						eligibleTaxPayments={props.eligibleTaxPayments}
						selectedTaxPaymentIdSet={props.selectedTaxPaymentIdSet}
						selectAllEligibleTaxPaymentsForCurrentDocument={props.selectAllEligibleTaxPaymentsForCurrentDocument}
						selectedTaxPaymentTotalRub={props.selectedTaxPaymentTotalRub}
						money={props.money}
						selectedDocumentUsesTaxPaymentSelection={props.selectedDocumentUsesTaxPaymentSelection}
					/>
				)}
				{selectedDocumentKind === "medical_intervention_refusal" && (
					<MedicalInterventionRefusalForm
						activeDoctorFullName={props.activeDoctor?.fullName}
						activeVisitComplaint={props.dashboard?.activeVisit?.complaint}
						inferredTreatmentArea={props.inferredTreatmentArea}
					/>
				)}
			</section>
		);
	},
);
