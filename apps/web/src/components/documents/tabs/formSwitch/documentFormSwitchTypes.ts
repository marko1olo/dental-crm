/**
 * tabs/formSwitch/documentFormSwitchTypes.ts
 * Props types for Document Form Switcher (Mandate 8b <= 120 lines)
 */

import type {
	Appointment,
	DocumentKind,
	GeneratedDocument,
	Patient,
	Payment,
	PhotoVideoConsentMaterial,
	PostVisitCareTopic,
	ProcedureSpecificConsentProcedure,
	StaffMember,
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm as TaxDeductionApplicationFormKind,
	TaxDeductionApplicationRelationship,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import type { DocumentSelectOption } from "../../forms/documentFormTypes";
import type { MedicalCopyRequestSourceDocument } from "../../forms/MedicalDocumentReleaseReceiptForm";
import type { TreatmentPlanAcceptanceVariant } from "../../forms/TreatmentPlanAcceptanceForm";

export type DocumentKindWithAliases =
	| DocumentKind
	| "procedure_specific_consent"
	| "dental_medical_card"
	| "medical_card_extract_003vu"
	| "prescription_order"
	| "paid_service_contract"
	| "installment_schedule";

export interface DocumentClinicProfileRequisites {
	clinicName?: string | undefined;
	legalName?: string | undefined;
	inn?: string | undefined;
	kpp?: string | undefined;
	ogrn?: string | undefined;
	address?: string | undefined;
	medicalLicenseNumber?: string | undefined;
	medicalLicenseIssuedAt?: string | undefined;
	medicalLicenseIssuer?: string | undefined;
	phone?: string | undefined;
	email?: string | undefined;
}

export interface DocumentFormSwitchDashboardHints {
	activeVisit?: {
		complaint?: string | null | undefined;
		diagnosis?: string | null | undefined;
		doctorSummary?: string | null | undefined;
		treatmentPlan?: string | null | undefined;
	} | null | undefined;
}

export interface DocumentInstallmentRow {
	dueDate?: string | undefined;
	amountRub?: number | undefined;
	note?: string | undefined;
}

export interface DocumentPlannedServiceLine {
	serviceName?: string | undefined;
	priceRub?: number | undefined;
	quantity?: number | undefined;
}

export interface DocumentFormSwitchProps {
	selectedDocumentKind: DocumentKindWithAliases;
	activeDoctor?: StaffMember | null | undefined;
	activePatient?: Patient | null | undefined;
	documentPatient?: Patient | null | undefined;
	dashboard?: DocumentFormSwitchDashboardHints | null | undefined;
	clinicProfileDraft?: DocumentClinicProfileRequisites | null | undefined;
	inferredTreatmentArea?: string | null | undefined;
	activeAppointment?: Appointment | null | undefined;
	activeIssuedPaidContracts?: readonly GeneratedDocument[] | undefined;
	compactDocumentText?: string | undefined;
	completedActContractReferenceForUi?: ((doc: GeneratedDocument) => string) | undefined;
	completedActFiscalReceiptLines?: (() => string[]) | undefined;
	completedActPaidRubValue?: (() => number) | undefined;
	formatDateTime?: ((dt: string) => string) | undefined;
	formatShortDate?: ((d: string) => string) | undefined;
	money?: ((v: number | null | undefined) => string) | undefined;
	paidContractTotalRubValue?: (() => number) | undefined;
	selectedCompletedActContractDocumentId?: string | undefined;
	eligiblePaymentReceiptPayments?: Payment[] | undefined;
	paymentFiscalReceiptLabelForUi?: ((p: Payment) => string) | undefined;
	paymentReceiptFiscalReceiptLines?: (() => string[]) | undefined;
	paymentReceiptIssuedByValue?: (() => string) | undefined;
	paymentReceiptPayerBirthDateValue?: (() => string) | undefined;
	paymentReceiptPayerFullNameValue?: (() => string) | undefined;
	paymentReceiptPayerIdentityDocumentValue?: (() => string) | undefined;
	paymentReceiptPayerInnValue?: (() => string) | undefined;
	paymentReceiptPayerRelationshipValue?: (() => string) | undefined;
	selectedPaymentReceiptIdSet?: Set<string> | undefined;
	selectedPaymentReceiptPayments?: Payment[] | undefined;
	selectedPaymentReceiptTotalRub?: number | undefined;
	installmentScheduleBaseDocumentTitleValue?: (() => string) | undefined;
	installmentScheduleInstallmentRows?: (() => DocumentInstallmentRow[]) | undefined;
	installmentSchedulePrepaidRubValue?: (() => number) | undefined;
	installmentScheduleRemainingRubValue?: (() => number) | undefined;
	installmentScheduleTotalRubValue?: (() => number) | undefined;
	treatmentEstimatePatientOrPayerFullNameValue?: (() => string) | undefined;
	treatmentEstimateTotalRubValue?: (() => number) | undefined;
	treatmentEstimateTreatmentBasisValue?: (() => string) | undefined;
	plannedServiceLinesForFinancialPayload?: (() => DocumentPlannedServiceLine[]) | undefined;
	normalizedTreatmentPlanAcceptanceVariant?: ((val: string) => TreatmentPlanAcceptanceVariant) | undefined;
	treatmentAcceptancePlannedTotalRub?: (() => number) | undefined;
	applyPostVisitCarePreset?: ((topic: PostVisitCareTopic, opts?: { force?: boolean }) => void) | undefined;
	changePostVisitCareTopic?: ((topic: PostVisitCareTopic) => void) | undefined;
	markPostVisitManualEdited?: (() => void) | undefined;
	normalizedPostVisitCareTopic?: ((val: string) => PostVisitCareTopic) | undefined;
	postVisitCareTopicOptions?: readonly DocumentSelectOption<PostVisitCareTopic>[] | undefined;
	normalizedXrayPregnancyStatus?: ((val: string) => XrayCbctReferralPregnancyStatus) | undefined;
	normalizedXrayPriority?: ((val: string) => XrayCbctReferralPriority) | undefined;
	normalizedXrayStudyType?: ((val: string) => XrayCbctReferralStudyType) | undefined;
	xrayPregnancyStatusOptions?: readonly DocumentSelectOption<XrayCbctReferralPregnancyStatus>[] | undefined;
	xrayStudyTypeOptions?: readonly DocumentSelectOption<XrayCbctReferralStudyType>[] | undefined;
	typedIssuedMedicalCopyRequestDocuments?: readonly MedicalCopyRequestSourceDocument[] | undefined;
	releaseProtectionNote?: string | undefined;
	setReleaseProtectionNote?: ((v: string) => void) | undefined;
	typedEligibleRefundCorrectionPayments?: Payment[] | undefined;
	selectedRefundCorrectionPayment?: Payment | null | undefined;
	selectRefundOriginalPayment?: ((id: string) => void) | undefined;
	paymentPayerFullName?: string | undefined;
	paymentPayerIdentityDocument?: string | undefined;
	paymentFiscalReceiptNumber?: string | undefined;
	paymentInvoiceTotalRubValue?: (() => number) | undefined;
	procedureSpecificConsentProcedureOptions?: readonly DocumentSelectOption<ProcedureSpecificConsentProcedure>[] | undefined;
	normalizedProcedureSpecificConsentProcedure?: ((v: string) => ProcedureSpecificConsentProcedure) | undefined;
	renderClinicalToothRowsEditor?: (() => React.ReactNode) | undefined;
	photoVideoMaterialOptions?: readonly DocumentSelectOption<PhotoVideoConsentMaterial>[] | undefined;
	togglePhotoVideoMaterial?: ((mat: PhotoVideoConsentMaterial) => void) | undefined;
	taxApplicationFormOptions?: readonly DocumentSelectOption<TaxDeductionApplicationFormKind>[] | undefined;
	normalizedTaxApplicationForm?: ((v: string) => TaxDeductionApplicationFormKind) | undefined;
	taxApplicationRelationshipOptions?: readonly DocumentSelectOption<TaxDeductionApplicationRelationship>[] | undefined;
	normalizedTaxApplicationRelationshipSelect?: ((v: string) => TaxDeductionApplicationRelationship) | undefined;
	taxApplicationDeliveryChannelOptions?: readonly DocumentSelectOption<TaxDeductionApplicationDeliveryChannel>[] | undefined;
	normalizedTaxApplicationDeliveryChannel?: ((v: string) => TaxDeductionApplicationDeliveryChannel) | undefined;
	eligibleTaxPayments?: readonly Payment[] | undefined;
	selectedTaxPaymentIdSet?: Set<string> | undefined;
	selectAllEligibleTaxPaymentsForCurrentDocument?: (() => void) | undefined;
	selectedTaxPaymentTotalRub?: number | undefined;
	selectedDocumentUsesTaxPaymentSelection?: boolean | undefined;
	minorConsentPatientFullNameValue?: string | undefined;
	minorConsentPatientBirthDateValue?: string | undefined;
	minorRepresentativeFullNameValue?: string | undefined;
	minorRepresentativeRelationshipValue?: string | undefined;
	minorRepresentativePhoneValue?: string | undefined;
	minorRepresentativeIdentityDocumentValue?: string | undefined;
	minorConsentInterventionScopeValue?: string | undefined;
	minorConsentDiagnosisOrIndicationValue?: string | undefined;
	warrantyTeethOrAreaValue?: string | undefined;
	warrantyServiceOrWorkNameValue?: string | undefined;
	warrantyLinkedActOrContractValue?: string | undefined;
	patientIntakePregnancyStatusOptions?: readonly DocumentSelectOption<string>[] | undefined;
	normalizedPatientIntakePregnancyStatus?: ((val: string) => string) | undefined;
	initialPayload?: Record<string, unknown> | null | undefined;
	onChange?: ((payload: Record<string, unknown>) => void) | undefined;
	onOrthodonticPayloadChange?: ((payload: Record<string, unknown>) => void) | undefined;
}
