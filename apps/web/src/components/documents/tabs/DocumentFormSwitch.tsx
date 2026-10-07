import React from "react";
import type {
	DocumentKind,
	GeneratedDocument,
	Patient,
	Payment,
	StaffMember,
} from "@dental/shared";
import type { ClinicProfileDraft } from "../../../AppHelpers";
import { useDocumentStore } from "../../../store/documentStore";

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
	selectedPaymentReceiptPayments?: Payment[];
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
				{(selectedDocumentKind === "dental_medical_card_043u" ||
					(selectedDocumentKind as any) === "outpatient_medical_card_025u") && (
					<DentalMedicalCard043uForm
						initialPayload={
							props.activeDoctor?.fullName
								? {
										attendingDoctorFullName: props.activeDoctor.fullName,
										patientFullName: props.activePatient?.fullName ?? "",
								  }
								: undefined
						}
					/>
				)}
				{((selectedDocumentKind as any) === "daily_dentist_diary_037u" ||
					(selectedDocumentKind as any) === "daily_dentist_worksheet_037u") && (
					<DailyDentistWorkSheet037uForm
						initialPayload={
							props.activeDoctor?.fullName
								? {
										doctorFullName: props.activeDoctor.fullName,
								  }
								: undefined
						}
					/>
				)}
				{((selectedDocumentKind as any) === "summary_dentist_statement_039u" ||
					(selectedDocumentKind as any) === "summary_work_statement_039u") && (
					<SummaryWorkStatement039uForm
						initialPayload={
							props.activeDoctor?.fullName
								? {
										doctorFullName: props.activeDoctor.fullName,
								  }
								: undefined
						}
					/>
				)}
				{((selectedDocumentKind as any) === "medical_record_extract" ||
					(selectedDocumentKind as any) === "medical_card_extract_003vu") && (
					<MedicalCardExtract003vuForm
						initialPayload={
							props.activeDoctor?.fullName
								? {
										attendingDoctorFullName: props.activeDoctor.fullName,
										patientFullName:
											(props.documentPatient ?? props.activePatient)?.fullName ?? "",
								  }
								: undefined
						}
					/>
				)}
				{selectedDocumentKind === "orthodontic_medical_card_043_1u" && (
					<OrthodonticCard043_1uForm />
				)}
				{selectedDocumentKind === "patient_intake_questionnaire" && (
					<PatientIntakeQuestionnaireForm
						activeVisitComplaint={props.dashboard?.activeVisit?.complaint ?? null}
					/>
				)}
				{selectedDocumentKind === "radiation_dose_sheet" && (
					<RadiationDoseSheetForm />
				)}
				{selectedDocumentKind === "minor_legal_representative_consent" && (
					<MinorLegalRepresentativeConsentForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						minorConsentPatientFullNameValue={props.minorConsentPatientFullNameValue}
						minorConsentPatientBirthDateValue={props.minorConsentPatientBirthDateValue}
						minorConsentInterventionScopeValue={props.minorConsentInterventionScopeValue}
						minorConsentDiagnosisOrIndicationValue={props.minorConsentDiagnosisOrIndicationValue}
					/>
				)}
				{selectedDocumentKind === "warranty_service_memo" && (
					<WarrantyServiceMemoForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						warrantyTeethOrAreaValue={props.warrantyTeethOrAreaValue}
						warrantyServiceOrWorkNameValue={props.warrantyServiceOrWorkNameValue}
					/>
				)}
				{selectedDocumentKind === "completed_works_act" && (
					<CompletedWorksActForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						dashboard={props.dashboard}
						money={props.money}
						completedActContractReferenceForUi={props.completedActContractReferenceForUi}
						completedActFiscalReceiptLines={props.completedActFiscalReceiptLines}
						completedActPaidRubValue={props.completedActPaidRubValue}
						selectedCompletedActContractDocumentId={props.selectedCompletedActContractDocumentId}
					/>
				)}
				{selectedDocumentKind === "payment_receipt" && (
					<PaymentReceiptForm
						money={props.money}
						paymentFiscalReceiptLabelForUi={props.paymentFiscalReceiptLabelForUi}
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
				{((selectedDocumentKind as any) === "installment_payment_schedule" ||
					(selectedDocumentKind as any) === "installment_schedule") && (
					<InstallmentScheduleForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						documentPatient={props.documentPatient ?? props.activePatient ?? null}
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
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						money={props.money}
						treatmentEstimatePatientOrPayerFullNameValue={props.treatmentEstimatePatientOrPayerFullNameValue}
						treatmentEstimateTotalRubValue={props.treatmentEstimateTotalRubValue}
						treatmentEstimateTreatmentBasisValue={props.treatmentEstimateTreatmentBasisValue}
					/>
				)}
				{selectedDocumentKind === "treatment_plan" && (
					<TreatmentPlanDocumentForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						activeVisitComplaint={props.dashboard?.activeVisit?.complaint ?? null}
						inferredTreatmentArea={props.inferredTreatmentArea ?? null}
					/>
				)}
				{selectedDocumentKind === "treatment_plan_acceptance" && (
					<TreatmentPlanAcceptanceForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						inferredTreatmentArea={props.inferredTreatmentArea}
						money={props.money}
						normalizedTreatmentPlanAcceptanceVariant={props.normalizedTreatmentPlanAcceptanceVariant}
						treatmentAcceptancePlannedTotalRub={props.treatmentAcceptancePlannedTotalRub}
					/>
				)}
				{selectedDocumentKind === "post_visit_recommendations" && (
					<PostVisitRecommendationsForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						applyPostVisitCarePreset={props.applyPostVisitCarePreset}
						changePostVisitCareTopic={props.changePostVisitCareTopic}
						inferredTreatmentArea={props.inferredTreatmentArea}
						markPostVisitManualEdited={props.markPostVisitManualEdited}
						normalizedPostVisitCareTopic={props.normalizedPostVisitCareTopic}
					/>
				)}
				{((selectedDocumentKind as any) === "prescription_medication_order" ||
					(selectedDocumentKind as any) === "prescription_order") && (
					<PrescriptionOrderForm />
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
						typedXrayPregnancyStatusOptions={props.xrayPregnancyStatusOptions}
						typedXrayStudyTypeOptions={props.xrayStudyTypeOptions}
					/>
				)}
				{selectedDocumentKind === "medical_record_copy_request" && (
					<MedicalRecordCopyRequestForm
						documentPatient={props.documentPatient ?? props.activePatient ?? null}
					/>
				)}
				{selectedDocumentKind === "visit_attendance_certificate" && (
					<VisitAttendanceCertificateForm
						activeAppointment={props.activeAppointment ?? null}
						activeDoctor={props.activeDoctor ?? null}
					/>
				)}
				{selectedDocumentKind === "medical_document_release_receipt" && (
					<MedicalDocumentReleaseReceiptForm
						documentPatient={props.documentPatient ?? props.activePatient ?? null}
						issuedMedicalCopyRequestDocuments={props.typedIssuedMedicalCopyRequestDocuments}
						releaseProtectionNote={props.releaseProtectionNote}
						setReleaseProtectionNote={props.setReleaseProtectionNote}
					/>
				)}
				{selectedDocumentKind === "payment_refund_correction_request" && (
					<PaymentRefundCorrectionRequestForm
						activePatient={props.activePatient ?? null}
						eligiblePayments={props.typedEligibleRefundCorrectionPayments}
						selectedRefundCorrectionPayment={props.selectedRefundCorrectionPayment ?? null}
						onSelectOriginalPayment={props.selectRefundOriginalPayment}
						paymentPayerFullName={props.paymentPayerFullName}
						paymentPayerIdentityDocument={props.paymentPayerIdentityDocument}
						paymentFiscalReceiptNumber={props.paymentFiscalReceiptNumber}
					/>
				)}
				{((selectedDocumentKind as any) === "paid_medical_services_contract" ||
					(selectedDocumentKind as any) === "paid_service_contract") && (
					<PaidServiceContractForm
						documentPatientFullName={props.documentPatient?.fullName ?? props.activePatient?.fullName ?? null}
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						totalRubValue={props.paidContractTotalRubValue ? props.paidContractTotalRubValue() : 0}
						totalRubFormatted={props.money && props.paidContractTotalRubValue ? props.money(props.paidContractTotalRubValue()) : "0 ₽"}
					/>
				)}
				{selectedDocumentKind === "payment_invoice" && (
					<PaymentInvoiceDocumentForm
						documentPatientFullName={props.documentPatient?.fullName ?? props.activePatient?.fullName ?? null}
						totalRubFormatted={props.money && props.paymentInvoiceTotalRubValue ? props.money(props.paymentInvoiceTotalRubValue()) : "0 ₽"}
					/>
				)}
				{selectedDocumentKind === "informed_consent" && (
					<InformedConsentForm
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
					/>
				)}
				{((selectedDocumentKind as any) === "procedure_specific_consent_packet" ||
					(selectedDocumentKind as any) === "procedure_specific_consent") && (
					<ProcedureSpecificConsentForm
						procedureOptions={props.procedureSpecificConsentProcedureOptions ?? []}
						normalizeProcedure={props.normalizedProcedureSpecificConsentProcedure ?? ((v) => v as any)}
						renderToothRowsEditor={props.renderClinicalToothRowsEditor ?? (() => null)}
						activeDoctorFullName={props.activeDoctor?.fullName ?? null}
						inferredTreatmentArea={props.inferredTreatmentArea ?? null}
					/>
				)}
				{selectedDocumentKind === "anesthesia_consent_log" && (
					<AnesthesiaConsentLogForm
						inferredTreatmentArea={props.inferredTreatmentArea}
					/>
				)}
				{selectedDocumentKind === "photo_video_consent" && (
					<PhotoVideoConsentForm
						materialOptions={props.photoVideoMaterialOptions ?? []}
						toggleMaterial={
							props.togglePhotoVideoMaterial ??
							((mat: any) => {
								const store = useDocumentStore.getState();
								const current = store.photoVideoMaterials || [];
								const next = current.includes(mat)
									? current.filter((m) => m !== mat)
									: [...current, mat];
								store.setPhotoVideoMaterials(next);
							})
						}
					/>
				)}
				{selectedDocumentKind === "personal_data_processing_consent" && (
					<PersonalDataProcessingConsentForm
						clinicProfileDraft={props.clinicProfileDraft}
					/>
				)}
				{selectedDocumentKind === "tax_deduction_application" && (
					<TaxDeductionApplicationForm
						relationshipOptions={props.taxApplicationRelationshipOptions ?? []}
						formOptions={props.taxApplicationFormOptions ?? []}
						deliveryChannelOptions={props.taxApplicationDeliveryChannelOptions ?? []}
						normalizeRelationship={props.normalizedTaxApplicationRelationshipSelect ?? ((v) => v as any)}
						normalizeForm={props.normalizedTaxApplicationForm ?? ((v) => v as any)}
						normalizeDeliveryChannel={props.normalizedTaxApplicationDeliveryChannel ?? ((v) => v as any)}
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
