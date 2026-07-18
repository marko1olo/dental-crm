import type React from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { PaidMedicalServicesContractForm } from "./PaidMedicalServicesContractForm";
import { CompletedWorksActForm } from "./CompletedWorksActForm";
import { TreatmentCostEstimateForm } from "./TreatmentCostEstimateForm";
import { PaymentInvoiceForm } from "./PaymentInvoiceForm";
import { PaymentReceiptForm } from "./PaymentReceiptForm";
import { InstallmentPaymentScheduleForm } from "./InstallmentPaymentScheduleForm";
import { MinorLegalRepresentativeConsentForm } from "./MinorLegalRepresentativeConsentForm";
import { WarrantyServiceMemoForm } from "./WarrantyServiceMemoForm";
import { PatientIntakeQuestionnaireForm } from "./PatientIntakeQuestionnaireForm";
import { TaxDeductionApplicationForm } from "./TaxDeductionApplicationForm";
import { InformedConsentForm } from "./InformedConsentForm";
import { ProcedureSpecificConsentPacketForm } from "./ProcedureSpecificConsentPacketForm";
import { TreatmentPlanForm } from "./TreatmentPlanForm";
import { TreatmentPlanAcceptanceForm } from "./TreatmentPlanAcceptanceForm";
import { PostVisitRecommendationsForm } from "./PostVisitRecommendationsForm";
import { AnesthesiaConsentLogForm } from "./AnesthesiaConsentLogForm";
import { PrescriptionMedicationOrderForm } from "./PrescriptionMedicationOrderForm";
import { LabWorkOrderForm } from "./LabWorkOrderForm";
import { PhotoVideoConsentForm } from "./PhotoVideoConsentForm";
import { XrayCbctReferralForm } from "./XrayCbctReferralForm";
import { OutpatientMedicalCard025uForm } from "./OutpatientMedicalCard025uForm";
import { MedicalRecordExtractForm } from "./MedicalRecordExtractForm";
import { MedicalRecordCopyRequestForm } from "./MedicalRecordCopyRequestForm";
import { VisitAttendanceCertificateForm } from "./VisitAttendanceCertificateForm";
import { MedicalDocumentReleaseReceiptForm } from "./MedicalDocumentReleaseReceiptForm";
import { PersonalDataProcessingConsentForm } from "./PersonalDataProcessingConsentForm";
import { MedicalInterventionRefusalForm } from "./MedicalInterventionRefusalForm";
import { PaymentRefundCorrectionRequestForm } from "./PaymentRefundCorrectionRequestForm";

export const DocumentFormsRenderer: React.FC = () => {
	const {
		selectedDocumentKind,
		dashboard,
		documentPatient,
		activeDoctor,
		paidContractTotalRubValue,
		treatmentAcceptancePlannedTotalRub,
		typedActiveIssuedPaidContracts,
		money,
		plannedServiceLinesForFinancialPayload,
		treatmentEstimatePatientOrPayerFullNameValue,
		treatmentEstimateTotalRubValue,
		treatmentEstimateTreatmentBasisValue,
		paymentInvoiceTotalRubValue,
		paymentFiscalReceiptLabelForUi,
		paymentReceiptFiscalReceiptLines,
		paymentReceiptIssuedByValue,
		paymentReceiptPayerBirthDateValue,
		paymentReceiptPayerFullNameValue,
		paymentReceiptPayerIdentityDocumentValue,
		paymentReceiptPayerInnValue,
		paymentReceiptPayerRelationshipValue,
		selectedPaymentReceiptIdSet,
		selectedPaymentReceiptPayments,
		selectedPaymentReceiptTotalRub,
		eligiblePaymentReceiptPayments,
		typedEligiblePaymentReceiptPayments,
		minorConsentDiagnosisOrIndicationValue,
		minorConsentInterventionScopeValue,
		minorConsentPatientBirthDateValue,
		minorConsentPatientFullNameValue,
		minorRepresentativeFullNameValue,
		minorRepresentativeIdentityDocumentValue,
		minorRepresentativePhoneValue,
		minorRepresentativeRelationshipValue,
		warrantyLinkedActOrContractValue,
		warrantyServiceOrWorkNameValue,
		warrantyTeethOrAreaValue,
		normalizedPatientIntakePregnancyStatus,
		patientIntakePregnancyStatusOptions,
		typedPatientIntakePregnancyStatusOptions,
		normalizedTaxApplicationDeliveryChannel,
		normalizedTaxApplicationForm,
		normalizedTaxApplicationRelationshipSelect,
		taxApplicationRelationshipOptions,
		taxApplicationFormOptions,
		taxApplicationDeliveryChannelOptions,
		inferredTreatmentArea,
		normalizedProcedureSpecificConsentProcedure,
		renderClinicalToothRowsEditor,
		typedProcedureSpecificConsentProcedureOptions,
		normalizedPostVisitCareTopic,
		postVisitCareTopicOptions,
		applyPostVisitCarePreset,
		changePostVisitCareTopic,
		markPostVisitManualEdited,
		typedPostVisitCareTopicOptions,
		togglePhotoVideoMaterial,
		photoVideoMaterialOptions,
		typedPhotoVideoMaterialOptions,
		normalizedXrayPregnancyStatus,
		normalizedXrayPriority,
		normalizedXrayStudyType,
		typedXrayStudyTypeOptions,
		typedXrayPregnancyStatusOptions,
		normalizedMedicalDocumentReleaseChannel,
		medicalDocumentReleaseChannelLabels,
		formatDateTime,
		activeAppointment,
		typedIssuedMedicalCopyRequestDocuments,
		releaseSourceRequestOptionLabel,
		clinicProfileDraft,
		activePatient,
		normalizedPaymentRefundCorrectionAction,
		normalizedPaymentRefundCorrectionMethod,
		selectedRefundCorrectionPayment,
		selectRefundOriginalPayment,
		eligibleRefundCorrectionPayments,
		typedEligibleRefundCorrectionPayments,
	} = useAppLogicContext();

	return (
		<section
			className="document-factory-form"
			aria-label="Данные для документов с обязательными полями"
		>
			{selectedDocumentKind === "paid_medical_services_contract" ? (
				<PaidMedicalServicesContractForm
					dashboard={dashboard}
					documentPatient={documentPatient}
					activeDoctor={activeDoctor}
					paidContractTotalRubValue={paidContractTotalRubValue}
				/>
			) : null}

			{selectedDocumentKind === "completed_works_act" ? (
				<CompletedWorksActForm
					dashboard={dashboard}
					activeDoctor={activeDoctor}
					treatmentAcceptancePlannedTotalRub={
						treatmentAcceptancePlannedTotalRub
					}
					typedActiveIssuedPaidContracts={typedActiveIssuedPaidContracts}
				/>
			) : null}

			{selectedDocumentKind === "treatment_cost_estimate" ? (
				<TreatmentCostEstimateForm
					activeDoctor={activeDoctor}
					money={money}
					plannedServiceLinesForFinancialPayload={
						plannedServiceLinesForFinancialPayload
					}
					treatmentEstimatePatientOrPayerFullNameValue={
						treatmentEstimatePatientOrPayerFullNameValue
					}
					treatmentEstimateTotalRubValue={treatmentEstimateTotalRubValue}
					treatmentEstimateTreatmentBasisValue={
						treatmentEstimateTreatmentBasisValue
					}
				/>
			) : null}

			{selectedDocumentKind === "payment_invoice" ? (
				<PaymentInvoiceForm
					dashboard={dashboard}
					documentPatient={documentPatient}
					money={money}
					plannedServiceLinesForFinancialPayload={
						plannedServiceLinesForFinancialPayload
					}
					paymentInvoiceTotalRubValue={paymentInvoiceTotalRubValue}
				/>
			) : null}

			{selectedDocumentKind === "payment_receipt" ? (
				<PaymentReceiptForm
					money={money}
					paymentFiscalReceiptLabelForUi={paymentFiscalReceiptLabelForUi}
					paymentReceiptFiscalReceiptLines={
						paymentReceiptFiscalReceiptLines
					}
					paymentReceiptIssuedByValue={paymentReceiptIssuedByValue}
					paymentReceiptPayerBirthDateValue={
						paymentReceiptPayerBirthDateValue
					}
					paymentReceiptPayerFullNameValue={
						paymentReceiptPayerFullNameValue
					}
					paymentReceiptPayerIdentityDocumentValue={
						paymentReceiptPayerIdentityDocumentValue
					}
					paymentReceiptPayerInnValue={paymentReceiptPayerInnValue}
					paymentReceiptPayerRelationshipValue={
						paymentReceiptPayerRelationshipValue
					}
					selectedPaymentReceiptIdSet={selectedPaymentReceiptIdSet}
					selectedPaymentReceiptPayments={selectedPaymentReceiptPayments}
					selectedPaymentReceiptTotalRub={selectedPaymentReceiptTotalRub}
					eligiblePaymentReceiptPayments={eligiblePaymentReceiptPayments}
					typedEligiblePaymentReceiptPayments={
						typedEligiblePaymentReceiptPayments
					}
				/>
			) : null}

			{selectedDocumentKind === "installment_payment_schedule" ? (
				<InstallmentPaymentScheduleForm
					documentPatient={documentPatient}
					activeDoctor={activeDoctor}
					money={money}
				/>
			) : null}

			{selectedDocumentKind === "minor_legal_representative_consent" ? (
				<MinorLegalRepresentativeConsentForm
					activeDoctor={activeDoctor}
					minorConsentDiagnosisOrIndicationValue={
						minorConsentDiagnosisOrIndicationValue
					}
					minorConsentInterventionScopeValue={
						minorConsentInterventionScopeValue
					}
					minorConsentPatientBirthDateValue={
						minorConsentPatientBirthDateValue
					}
					minorConsentPatientFullNameValue={
						minorConsentPatientFullNameValue
					}
					minorRepresentativeFullNameValue={
						minorRepresentativeFullNameValue
					}
					minorRepresentativeIdentityDocumentValue={
						minorRepresentativeIdentityDocumentValue
					}
					minorRepresentativePhoneValue={minorRepresentativePhoneValue}
					minorRepresentativeRelationshipValue={
						minorRepresentativeRelationshipValue
					}
				/>
			) : null}

			{selectedDocumentKind === "warranty_service_memo" ? (
				<WarrantyServiceMemoForm
					activeDoctor={activeDoctor}
					warrantyLinkedActOrContractValue={
						warrantyLinkedActOrContractValue
					}
					warrantyServiceOrWorkNameValue={warrantyServiceOrWorkNameValue}
					warrantyTeethOrAreaValue={warrantyTeethOrAreaValue}
				/>
			) : null}

			{selectedDocumentKind === "patient_intake_questionnaire" ? (
				<PatientIntakeQuestionnaireForm
					dashboard={dashboard}
					normalizedPatientIntakePregnancyStatus={
						normalizedPatientIntakePregnancyStatus
					}
					patientIntakePregnancyStatusOptions={
						patientIntakePregnancyStatusOptions
					}
					typedPatientIntakePregnancyStatusOptions={
						typedPatientIntakePregnancyStatusOptions
					}
				/>
			) : null}

			{selectedDocumentKind === "tax_deduction_application" ? (
				<TaxDeductionApplicationForm
					normalizedTaxApplicationDeliveryChannel={
						normalizedTaxApplicationDeliveryChannel
					}
					normalizedTaxApplicationForm={normalizedTaxApplicationForm}
					normalizedTaxApplicationRelationshipSelect={
						normalizedTaxApplicationRelationshipSelect
					}
					taxApplicationRelationshipOptions={
						taxApplicationRelationshipOptions
					}
					taxApplicationFormOptions={taxApplicationFormOptions}
					taxApplicationDeliveryChannelOptions={
						taxApplicationDeliveryChannelOptions
					}
				/>
			) : null}

			{selectedDocumentKind === "informed_consent" ? (
				<InformedConsentForm
					dashboard={dashboard}
					activeDoctor={activeDoctor}
					inferredTreatmentArea={inferredTreatmentArea}
				/>
			) : null}

			{selectedDocumentKind === "procedure_specific_consent_packet" ? (
				<ProcedureSpecificConsentPacketForm
					dashboard={dashboard}
					activeDoctor={activeDoctor}
					inferredTreatmentArea={inferredTreatmentArea}
					normalizedProcedureSpecificConsentProcedure={
						normalizedProcedureSpecificConsentProcedure
					}
					renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
					typedProcedureSpecificConsentProcedureOptions={
						typedProcedureSpecificConsentProcedureOptions
					}
				/>
			) : null}

			{selectedDocumentKind === "treatment_plan" ? (
				<TreatmentPlanForm
					dashboard={dashboard}
					activeDoctor={activeDoctor}
					inferredTreatmentArea={inferredTreatmentArea}
					renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
					treatmentAcceptancePlannedTotalRub={
						treatmentAcceptancePlannedTotalRub
					}
				/>
			) : null}

			{selectedDocumentKind === "treatment_plan_acceptance" ? (
				<TreatmentPlanAcceptanceForm
					dashboard={dashboard}
					documentPatient={documentPatient}
					activeDoctor={activeDoctor}
				/>
			) : null}

			{selectedDocumentKind === "post_visit_recommendations" ? (
				<PostVisitRecommendationsForm
					dashboard={dashboard}
					activeDoctor={activeDoctor}
					inferredTreatmentArea={inferredTreatmentArea}
					normalizedPostVisitCareTopic={normalizedPostVisitCareTopic}
					postVisitCareTopicOptions={postVisitCareTopicOptions}
					applyPostVisitCarePreset={applyPostVisitCarePreset}
					changePostVisitCareTopic={changePostVisitCareTopic}
					markPostVisitManualEdited={markPostVisitManualEdited}
					typedPostVisitCareTopicOptions={typedPostVisitCareTopicOptions}
				/>
			) : null}

			{selectedDocumentKind === "anesthesia_consent_log" ? (
				<AnesthesiaConsentLogForm
					inferredTreatmentArea={inferredTreatmentArea}
				/>
			) : null}

			{selectedDocumentKind === "prescription_medication_order" ? (
				<PrescriptionMedicationOrderForm
					renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
				/>
			) : null}

			{selectedDocumentKind === "lab_work_order" ? (
				<LabWorkOrderForm
					inferredTreatmentArea={inferredTreatmentArea}
					renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
				/>
			) : null}

			{selectedDocumentKind === "photo_video_consent" ? (
				<PhotoVideoConsentForm
					togglePhotoVideoMaterial={togglePhotoVideoMaterial}
					photoVideoMaterialOptions={photoVideoMaterialOptions}
					typedPhotoVideoMaterialOptions={typedPhotoVideoMaterialOptions}
				/>
			) : null}

			{selectedDocumentKind === "xray_cbct_referral" ? (
				<XrayCbctReferralForm
					activeDoctor={activeDoctor}
					inferredTreatmentArea={inferredTreatmentArea}
					normalizedXrayPregnancyStatus={normalizedXrayPregnancyStatus}
					normalizedXrayPriority={normalizedXrayPriority}
					normalizedXrayStudyType={normalizedXrayStudyType}
					renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
					typedXrayStudyTypeOptions={typedXrayStudyTypeOptions}
					typedXrayPregnancyStatusOptions={typedXrayPregnancyStatusOptions}
				/>
			) : null}

			{selectedDocumentKind === "outpatient_medical_card_025u" ? (
				<OutpatientMedicalCard025uForm
					dashboard={dashboard}
					documentPatient={documentPatient}
					activeDoctor={activeDoctor}
				/>
			) : null}

			{selectedDocumentKind === "medical_record_extract" ? (
				<MedicalRecordExtractForm
					dashboard={dashboard}
					documentPatient={documentPatient}
					activeDoctor={activeDoctor}
					renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
				/>
			) : null}

			{selectedDocumentKind === "medical_record_copy_request" ? (
				<MedicalRecordCopyRequestForm
					documentPatient={documentPatient}
					normalizedMedicalDocumentReleaseChannel={
						normalizedMedicalDocumentReleaseChannel
					}
					medicalDocumentReleaseChannelLabels={
						medicalDocumentReleaseChannelLabels
					}
				/>
			) : null}

			{selectedDocumentKind === "visit_attendance_certificate" ? (
				<VisitAttendanceCertificateForm
					activeDoctor={activeDoctor}
					formatDateTime={formatDateTime}
					activeAppointment={activeAppointment}
				/>
			) : null}

			{selectedDocumentKind === "medical_document_release_receipt" ? (
				<MedicalDocumentReleaseReceiptForm
					documentPatient={documentPatient}
					typedIssuedMedicalCopyRequestDocuments={
						typedIssuedMedicalCopyRequestDocuments
					}
					releaseSourceRequestOptionLabel={releaseSourceRequestOptionLabel}
				/>
			) : null}

			{selectedDocumentKind === "personal_data_processing_consent" ? (
				<PersonalDataProcessingConsentForm
					clinicProfileDraft={clinicProfileDraft}
				/>
			) : null}

			{selectedDocumentKind === "medical_intervention_refusal" ? (
				<MedicalInterventionRefusalForm
					dashboard={dashboard}
					activeDoctor={activeDoctor}
					inferredTreatmentArea={inferredTreatmentArea}
				/>
			) : null}

			{selectedDocumentKind === "payment_refund_correction_request" ? (
				<PaymentRefundCorrectionRequestForm
					money={money}
					activePatient={activePatient}
					normalizedPaymentRefundCorrectionAction={
						normalizedPaymentRefundCorrectionAction
					}
					normalizedPaymentRefundCorrectionMethod={
						normalizedPaymentRefundCorrectionMethod
					}
					paymentFiscalReceiptLabelForUi={paymentFiscalReceiptLabelForUi}
					selectedRefundCorrectionPayment={selectedRefundCorrectionPayment}
					selectRefundOriginalPayment={selectRefundOriginalPayment}
					eligibleRefundCorrectionPayments={
						eligibleRefundCorrectionPayments
					}
					typedEligibleRefundCorrectionPayments={
						typedEligibleRefundCorrectionPayments
					}
				/>
			) : null}
		</section>
	);
};
