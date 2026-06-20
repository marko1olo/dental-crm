import { create } from 'zustand';
import { PaymentRefundCorrectionAction, PaymentRefundCorrectionMethod } from "../AppHelpers";
export type MedicalDocumentReleaseChannel = "paper" | "pdf" | "dicom_archive" | "secure_link" | "physical_media" | "other";
import { PaymentMethod, DocumentIssueSignatureMode, DocumentVoidReasonCode, DocumentAuditFacts, DocumentIngestionTarget, DocumentIngestionResponse, GeneratedDocument, TreatmentPlanAcceptanceVariant, PostVisitCareTopic, PhotoVideoConsentMaterial, XrayCbctReferralStudyType, XrayCbctReferralPregnancyStatus, XrayCbctReferralPriority, TaxDeductionApplicationForm, TaxDeductionApplicationDeliveryChannel, TaxDeductionApplicationRelationship, PatientIntakePregnancyStatus, ProcedureSpecificConsentProcedure } from "@dental/shared";
import { dateInputValuePlusDays, currentLocalDateTimeInputValue } from "../AppHelpers";
import { defaultClinicalToothRowsText, toDateTimeLocalValue, loadUiPreferences } from "../AppHelpers";
import { postVisitCarePresets } from "../postVisitCareData";

const initialUiPreferences = loadUiPreferences();

export interface DocumentState {
  paymentAmount: string;
  paymentMethod: PaymentMethod;
  paymentFiscalReceiptNumber: string;
  paymentFiscalReceiptIssuedAt: string;
  paymentFiscalFn: string;
  paymentFiscalFd: string;
  paymentFiscalFpd: string;
  paymentFiscalCashierName: string;
  paymentFiscalReceiptUrl: string;
  paymentPayerFullName: string;
  paymentPayerInn: string;
  paymentPayerBirthDate: string;
  paymentPayerIdentityDocument: string;
  paymentPayerRelationship: string;
  paymentTaxDeductionCode: "" | "1" | "2";
  paymentFeedback: string;
  documentIssueConfirmationId: string | null;
  documentIssueSignatureMode: DocumentIssueSignatureMode;
  documentIssueSignedAt: any;
  documentIssueRecipientFullName: string;
  documentIssueRecipientRole: string;
  documentIssueStaffFullName: any;
  documentIssueStaffRole: any;
  documentIssueNote: string;
  documentIssueIdentityChecked: boolean;
  documentIssueDocumentOpenedAndChecked: boolean;
  documentIssueRecipientSigned: boolean;
  documentIssueClinicSigned: boolean;
  documentVoidConfirmationId: string | null;
  documentVoidReasonCode: DocumentVoidReasonCode;
  documentVoidReasonText: string;
  documentVoidStaffFullName: any;
  documentVoidStaffRole: any;
  documentVoidCorrectionDocumentId: string;
  documentVoidReplacementRequired: boolean;
  documentVoidPatientOrPayerNotified: boolean;
  documentVoidArchivePreserved: boolean;
  documentVoidStatusReviewed: boolean;
  documentAuditFacts: DocumentAuditFacts | null;
  taxDocumentYear: number;
  setTaxDocumentYear: (val: number | ((prev: number) => number)) => void;
  selectedDocumentKind: GeneratedDocument["kind"];
  setSelectedDocumentKind: (val: GeneratedDocument["kind"] | ((prev: GeneratedDocument["kind"]) => GeneratedDocument["kind"])) => void;
  isDocumentIngesting: boolean;
  setIsDocumentIngesting: (val: boolean | ((prev: boolean) => boolean)) => void;
  documentAuditFactsLoadingId: string | null;
  personalDataPurposes: string;
  personalDataCategories: string;
  personalDataActions: string;
  personalDataTransferRules: string;
  personalDataRetentionPeriod: string;
  personalDataRevocationChannel: string;
  refusalExplainedRisks: string;
  refusalAlternatives: string;
  refusalUrgentWarningSigns: string;
  documentIngestionTarget: DocumentIngestionTarget;
  documentIngestion: DocumentIngestionResponse | null;
  setPaymentAmount: (val: string | ((prev: string) => string)) => void;
  setPaymentMethod: (val: PaymentMethod | ((prev: PaymentMethod) => PaymentMethod)) => void;
  setPaymentFiscalReceiptNumber: (val: string | ((prev: string) => string)) => void;
  setPaymentFiscalReceiptIssuedAt: (val: string | ((prev: string) => string)) => void;
  setPaymentFiscalFn: (val: string | ((prev: string) => string)) => void;
  setPaymentFiscalFd: (val: string | ((prev: string) => string)) => void;
  setPaymentFiscalFpd: (val: string | ((prev: string) => string)) => void;
  setPaymentFiscalCashierName: (val: string | ((prev: string) => string)) => void;
  setPaymentFiscalReceiptUrl: (val: string | ((prev: string) => string)) => void;
  setPaymentPayerFullName: (val: string | ((prev: string) => string)) => void;
  setPaymentPayerInn: (val: string | ((prev: string) => string)) => void;
  setPaymentPayerBirthDate: (val: string | ((prev: string) => string)) => void;
  setPaymentPayerIdentityDocument: (val: string | ((prev: string) => string)) => void;
  setPaymentPayerRelationship: (val: string | ((prev: string) => string)) => void;
  setPaymentTaxDeductionCode: (val: "" | "1" | "2" | ((prev: "" | "1" | "2") => "" | "1" | "2")) => void;
  setPaymentFeedback: (val: string | ((prev: string) => string)) => void;
  setDocumentIssueConfirmationId: (val: string | null | ((prev: string | null) => string | null)) => void;
  setDocumentIssueSignatureMode: (val: DocumentIssueSignatureMode | ((prev: DocumentIssueSignatureMode) => DocumentIssueSignatureMode)) => void;
  setDocumentIssueSignedAt: (val: any | ((prev: any) => any)) => void;
  setDocumentIssueRecipientFullName: (val: string | ((prev: string) => string)) => void;
  setDocumentIssueRecipientRole: (val: string | ((prev: string) => string)) => void;
  setDocumentIssueStaffFullName: (val: any | ((prev: any) => any)) => void;
  setDocumentIssueStaffRole: (val: any | ((prev: any) => any)) => void;
  setDocumentIssueNote: (val: string | ((prev: string) => string)) => void;
  setDocumentIssueIdentityChecked: (val: boolean | ((prev: boolean) => boolean)) => void;
  setDocumentIssueDocumentOpenedAndChecked: (val: boolean | ((prev: boolean) => boolean)) => void;
  setDocumentIssueRecipientSigned: (val: boolean | ((prev: boolean) => boolean)) => void;
  setDocumentIssueClinicSigned: (val: boolean | ((prev: boolean) => boolean)) => void;
  setDocumentVoidConfirmationId: (val: string | null | ((prev: string | null) => string | null)) => void;
  setDocumentVoidReasonCode: (val: DocumentVoidReasonCode | ((prev: DocumentVoidReasonCode) => DocumentVoidReasonCode)) => void;
  setDocumentVoidReasonText: (val: string | ((prev: string) => string)) => void;
  setDocumentVoidStaffFullName: (val: any | ((prev: any) => any)) => void;
  setDocumentVoidStaffRole: (val: any | ((prev: any) => any)) => void;
  setDocumentVoidCorrectionDocumentId: (val: string | ((prev: string) => string)) => void;
  setDocumentVoidReplacementRequired: (val: boolean | ((prev: boolean) => boolean)) => void;
  setDocumentVoidPatientOrPayerNotified: (val: boolean | ((prev: boolean) => boolean)) => void;
  setDocumentVoidArchivePreserved: (val: boolean | ((prev: boolean) => boolean)) => void;
  setDocumentVoidStatusReviewed: (val: boolean | ((prev: boolean) => boolean)) => void;
  setDocumentAuditFacts: (val: DocumentAuditFacts | null | ((prev: DocumentAuditFacts | null) => DocumentAuditFacts | null)) => void;
  setDocumentAuditFactsLoadingId: (val: string | null | ((prev: string | null) => string | null)) => void;
  setPersonalDataPurposes: (val: string | ((prev: string) => string)) => void;
  setPersonalDataCategories: (val: string | ((prev: string) => string)) => void;
  setPersonalDataActions: (val: string | ((prev: string) => string)) => void;
  setPersonalDataTransferRules: (val: string | ((prev: string) => string)) => void;
  setPersonalDataRetentionPeriod: (val: string | ((prev: string) => string)) => void;
  setPersonalDataRevocationChannel: (val: string | ((prev: string) => string)) => void;
  setRefusalExplainedRisks: (val: string | ((prev: string) => string)) => void;
  setRefusalAlternatives: (val: string | ((prev: string) => string)) => void;
  setRefusalUrgentWarningSigns: (val: string | ((prev: string) => string)) => void;
  setDocumentIngestionTarget: (val: DocumentIngestionTarget | ((prev: DocumentIngestionTarget) => DocumentIngestionTarget)) => void;
  setDocumentIngestion: (val: DocumentIngestionResponse | null | ((prev: DocumentIngestionResponse | null) => DocumentIngestionResponse | null)) => void;

  setOutpatient025uEmploymentCode: (val: string | ((prev: string) => string)) => void;
  setOutpatient025uDisabilityGroup: (val: string | ((prev: string) => string)) => void;
  setOutpatient025uWorkOrStudyPlace: (val: string | ((prev: string) => string)) => void;
  setOutpatient025uPalliativeCareNeedCode: (val: string | ((prev: string) => string)) => void;
  setOutpatient025uBloodGroup: (val: string | ((prev: string) => string)) => void;
  setOutpatient025uRhFactor: (val: string | ((prev: string) => string)) => void;
  setOutpatient025uKellK1: (val: string | ((prev: string) => string)) => void;
  setOutpatient025uOtherBloodData: (val: string | ((prev: string) => string)) => void;
  setOutpatient025uAllergyHistory: (val: string | ((prev: string) => string)) => void;
  setOutpatient025uFinalEpicrisis: (val: string | ((prev: string) => string)) => void;
  setOutpatient025uOfficialForm274nChecked: (val: boolean | ((prev: boolean) => boolean)) => void;
  setOutpatient025uThirdPartyDataChecked: (val: boolean | ((prev: boolean) => boolean)) => void;
  setCopyRequestDocumentTypes: (val: any | ((prev: any) => any)) => void;
  setCopyRequestPeriodStart: (val: string | ((prev: string) => string)) => void;
  setCopyRequestPeriodEnd: (val: string | ((prev: string) => string)) => void;
  setCopyRequestFormat: (val: MedicalDocumentReleaseChannel | ((prev: MedicalDocumentReleaseChannel) => MedicalDocumentReleaseChannel)) => void;
  setCopyRequestRecipientFullName: (val: string | ((prev: string) => string)) => void;
  setCopyRequestRecipientIdentityDocument: (val: string | ((prev: string) => string)) => void;
  setCopyRequestRecipientAuthority: (val: any | ((prev: any) => any)) => void;
  setCopyRequestRepresentativeAuthorityDocument: (val: string | ((prev: string) => string)) => void;
  setCopyRequestRequestedAt: (val: any | ((prev: any) => any)) => void;
  setCopyRequestContactForDelivery: (val: string | ((prev: string) => string)) => void;
  setCopyRequestSpecialInstructions: (val: string | ((prev: string) => string)) => void;
  setCopyRequestIncludeDicomSourceData: (val: boolean | ((prev: boolean) => boolean)) => void;
  setCopyRequestIdentityVerified: (val: boolean | ((prev: boolean) => boolean)) => void;
  setCopyRequestThirdPartyDataChecked: (val: boolean | ((prev: boolean) => boolean)) => void;
  setAttendanceStartedAt: (val: string | ((prev: string) => string)) => void;
  setAttendanceEndedAt: (val: string | ((prev: string) => string)) => void;
  setAttendancePurpose: (val: any | ((prev: any) => any)) => void;
  setAttendanceRecipientOrganization: (val: string | ((prev: string) => string)) => void;
  setAttendanceIssuedAt: (val: any | ((prev: any) => any)) => void;
  setAttendanceSignedByFullName: (val: string | ((prev: string) => string)) => void;
  setAttendanceSignedByRole: (val: any | ((prev: any) => any)) => void;
  setAttendanceDiagnosisDisclosureExcluded: (val: boolean | ((prev: boolean) => boolean)) => void;
  setAttendanceNotSickLeaveAcknowledged: (val: boolean | ((prev: boolean) => boolean)) => void;
  setReleaseRecipientFullName: (val: string | ((prev: string) => string)) => void;
  setReleaseRecipientIdentityDocument: (val: string | ((prev: string) => string)) => void;
  setReleaseRecipientAuthority: (val: any | ((prev: any) => any)) => void;
  setReleaseSourceRequestDocumentId: (val: string | ((prev: string) => string)) => void;
  setReleaseChannel: (val: MedicalDocumentReleaseChannel | ((prev: MedicalDocumentReleaseChannel) => MedicalDocumentReleaseChannel)) => void;
  setReleaseDocumentTypes: (val: any | ((prev: any) => any)) => void;
  setReleasePeriodStart: (val: string | ((prev: string) => string)) => void;
  setReleasePeriodEnd: (val: string | ((prev: string) => string)) => void;
  setReleaseDeliveredAt: (val: any | ((prev: any) => any)) => void;
  setReleaseAccessExpiresAt: (val: string | ((prev: string) => string)) => void;
  setReleaseThirdPartyDataChecked: (val: boolean | ((prev: boolean) => boolean)) => void;
  setRefundAction: (val: PaymentRefundCorrectionAction | ((prev: PaymentRefundCorrectionAction) => PaymentRefundCorrectionAction)) => void;
  setRefundAmountRub: (val: any | ((prev: any) => any)) => void;
  setRefundReason: (val: string | ((prev: string) => string)) => void;
  setRefundMethod: (val: PaymentRefundCorrectionMethod | ((prev: PaymentRefundCorrectionMethod) => PaymentRefundCorrectionMethod)) => void;
  setRefundRecipientFullName: (val: string | ((prev: string) => string)) => void;
  setRefundRecipientIdentityDocument: (val: string | ((prev: string) => string)) => void;
  setRefundBankDetails: (val: string | ((prev: string) => string)) => void;
  setRefundSelectedPaymentId: (val: string | ((prev: string) => string)) => void;
  setRefundOriginalFiscalReceiptNumber: (val: string | ((prev: string) => string)) => void;
  setRefundCorrectionFiscalReceiptNumber: (val: string | ((prev: string) => string)) => void;
  setRefundAccountantDecision: (val: string | ((prev: string) => string)) => void;
  setPersonalDataCrossBorderAllowed: (val: boolean | ((prev: boolean) => boolean)) => void;
  setPersonalDataAutomatedDecisionAllowed: (val: boolean | ((prev: boolean) => boolean)) => void;
  setPersonalDataConsentGivenAt: (val: any | ((prev: any) => any)) => void;
  setPersonalDataVoluntaryConsentConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  setPersonalDataMedicalProcessingAcknowledged: (val: boolean | ((prev: boolean) => boolean)) => void;
  setRefusalIntervention: (val: string | ((prev: string) => string)) => void;
  setRefusalClinicalIndication: (val: string | ((prev: string) => string)) => void;
  setRefusalPatientReason: (val: string | ((prev: string) => string)) => void;
  setRefusalDoctorFullName: (val: string | ((prev: string) => string)) => void;
  setRefusalConfirmedAt: (val: any | ((prev: any) => any)) => void;
  setRefusalConsequencesUnderstood: (val: boolean | ((prev: boolean) => boolean)) => void;
  setRefusalSecondOpinionOffered: (val: boolean | ((prev: boolean) => boolean)) => void;
  setRefusalEmergencyCareExplained: (val: boolean | ((prev: boolean) => boolean)) => void;

  outpatient025uEmploymentCode: string;
  outpatient025uDisabilityGroup: string;
  outpatient025uWorkOrStudyPlace: string;
  outpatient025uPalliativeCareNeedCode: string;
  outpatient025uBloodGroup: string;
  outpatient025uRhFactor: string;
  outpatient025uKellK1: string;
  outpatient025uOtherBloodData: string;
  outpatient025uAllergyHistory: string;
  outpatient025uFinalEpicrisis: string;
  outpatient025uOfficialForm274nChecked: boolean;
  outpatient025uThirdPartyDataChecked: boolean;
  copyRequestDocumentTypes: any;
  copyRequestPeriodStart: string;
  copyRequestPeriodEnd: string;
  copyRequestFormat: MedicalDocumentReleaseChannel;
  copyRequestRecipientFullName: string;
  copyRequestRecipientIdentityDocument: string;
  copyRequestRecipientAuthority: any;
  copyRequestRepresentativeAuthorityDocument: string;
  copyRequestRequestedAt: any;
  copyRequestContactForDelivery: string;
  copyRequestSpecialInstructions: string;
  copyRequestIncludeDicomSourceData: boolean;
  copyRequestIdentityVerified: boolean;
  copyRequestThirdPartyDataChecked: boolean;
  attendanceStartedAt: string;
  attendanceEndedAt: string;
  attendancePurpose: any;
  attendanceRecipientOrganization: string;
  attendanceIssuedAt: any;
  attendanceSignedByFullName: string;
  attendanceSignedByRole: any;
  attendanceDiagnosisDisclosureExcluded: boolean;
  attendanceNotSickLeaveAcknowledged: boolean;
  releaseRecipientFullName: string;
  releaseRecipientIdentityDocument: string;
  releaseRecipientAuthority: any;
  releaseSourceRequestDocumentId: string;
  releaseChannel: MedicalDocumentReleaseChannel;
  releaseDocumentTypes: any;
  releasePeriodStart: string;
  releasePeriodEnd: string;
  releaseDeliveredAt: any;
  releaseAccessExpiresAt: string;
  releaseThirdPartyDataChecked: boolean;
  refundAction: PaymentRefundCorrectionAction;
  refundAmountRub: any;
  refundReason: string;
  refundMethod: PaymentRefundCorrectionMethod;
  refundRecipientFullName: string;
  refundRecipientIdentityDocument: string;
  refundBankDetails: string;
  refundSelectedPaymentId: string;
  refundOriginalFiscalReceiptNumber: string;
  refundCorrectionFiscalReceiptNumber: string;
  refundAccountantDecision: string;
  personalDataCrossBorderAllowed: boolean;
  personalDataAutomatedDecisionAllowed: boolean;
  personalDataConsentGivenAt: any;
  personalDataVoluntaryConsentConfirmed: boolean;
  personalDataMedicalProcessingAcknowledged: boolean;
  refusalIntervention: string;
  refusalClinicalIndication: string;
  refusalPatientReason: string;
  refusalDoctorFullName: string;
  refusalConfirmedAt: any;
  refusalConsequencesUnderstood: boolean;
  refusalSecondOpinionOffered: boolean;
  refusalEmergencyCareExplained: boolean;

  documentCreateSavingKind: GeneratedDocument["kind"] | null;
  setDocumentCreateSavingKind: (val: GeneratedDocument["kind"] | null | ((prev: GeneratedDocument["kind"] | null) => GeneratedDocument["kind"] | null)) => void;
  documentStatusSavingId: string | null;
  setDocumentStatusSavingId: (val: string | null | ((prev: string | null) => string | null)) => void;
  taxDocumentPayerInn: string;
  setTaxDocumentPayerInn: (val: string | ((prev: string) => string)) => void;
  selectedTaxPaymentIds: string[];
  setSelectedTaxPaymentIds: (val: string[] | ((prev: string[]) => string[])) => void;
  selectedPaymentReceiptIds: string[];
  setSelectedPaymentReceiptIds: (val: string[] | ((prev: string[]) => string[])) => void;
  taxApplicationTaxpayerFullName: string;
  setTaxApplicationTaxpayerFullName: (val: string | ((prev: string) => string)) => void;
  taxApplicationTaxpayerInn: string;
  setTaxApplicationTaxpayerInn: (val: string | ((prev: string) => string)) => void;
  taxApplicationTaxpayerBirthDate: string;
  setTaxApplicationTaxpayerBirthDate: (val: string | ((prev: string) => string)) => void;
  taxApplicationTaxpayerIdentityDocument: string;
  setTaxApplicationTaxpayerIdentityDocument: (val: string | ((prev: string) => string)) => void;
  taxApplicationRelationship: TaxDeductionApplicationRelationship;
  setTaxApplicationRelationship: (val: TaxDeductionApplicationRelationship | ((prev: TaxDeductionApplicationRelationship) => TaxDeductionApplicationRelationship)) => void;
  taxApplicationForm: TaxDeductionApplicationForm;
  setTaxApplicationForm: (val: TaxDeductionApplicationForm | ((prev: TaxDeductionApplicationForm) => TaxDeductionApplicationForm)) => void;
  taxApplicationDeliveryChannel: TaxDeductionApplicationDeliveryChannel;
  setTaxApplicationDeliveryChannel: (val: TaxDeductionApplicationDeliveryChannel | ((prev: TaxDeductionApplicationDeliveryChannel) => TaxDeductionApplicationDeliveryChannel)) => void;
  taxApplicationContact: string;
  setTaxApplicationContact: (val: string | ((prev: string) => string)) => void;
  taxApplicationAuthorityDocument: string;
  setTaxApplicationAuthorityDocument: (val: string | ((prev: string) => string)) => void;
  taxApplicationRequestedAt: string;
  setTaxApplicationRequestedAt: (val: string | ((prev: string) => string)) => void;
  taxApplicationDuplicateWarningAccepted: boolean;
  setTaxApplicationDuplicateWarningAccepted: (val: boolean | ((prev: boolean) => boolean)) => void;
  intakeChiefComplaint: string;
  setIntakeChiefComplaint: (val: string | ((prev: string) => string)) => void;
  intakeAllergyStatus: string;
  setIntakeAllergyStatus: (val: string | ((prev: string) => string)) => void;
  intakeCurrentMedications: string;
  setIntakeCurrentMedications: (val: string | ((prev: string) => string)) => void;
  intakeChronicConditions: string;
  setIntakeChronicConditions: (val: string | ((prev: string) => string)) => void;
  intakePregnancyStatus: PatientIntakePregnancyStatus;
  setIntakePregnancyStatus: (val: PatientIntakePregnancyStatus | ((prev: PatientIntakePregnancyStatus) => PatientIntakePregnancyStatus)) => void;
  intakeAnticoagulants: string;
  setIntakeAnticoagulants: (val: string | ((prev: string) => string)) => void;
  intakeInfectiousRiskNotes: string;
  setIntakeInfectiousRiskNotes: (val: string | ((prev: string) => string)) => void;
  intakeCardioEndocrineNotes: string;
  setIntakeCardioEndocrineNotes: (val: string | ((prev: string) => string)) => void;
  intakeEmergencyContact: string;
  setIntakeEmergencyContact: (val: string | ((prev: string) => string)) => void;
  intakeAdditionalNotes: string;
  setIntakeAdditionalNotes: (val: string | ((prev: string) => string)) => void;
  intakeAccuracyConfirmed: boolean;
  setIntakeAccuracyConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  informedConsentIntervention: string;
  setInformedConsentIntervention: (val: string | ((prev: string) => string)) => void;
  informedConsentToothOrArea: string;
  setInformedConsentToothOrArea: (val: string | ((prev: string) => string)) => void;
  informedConsentDiagnosisOrIndication: string;
  setInformedConsentDiagnosisOrIndication: (val: string | ((prev: string) => string)) => void;
  informedConsentExpectedBenefit: string;
  setInformedConsentExpectedBenefit: (val: string | ((prev: string) => string)) => void;
  informedConsentAnesthesia: string;
  setInformedConsentAnesthesia: (val: string | ((prev: string) => string)) => void;
  informedConsentMaterialNotes: string;
  setInformedConsentMaterialNotes: (val: string | ((prev: string) => string)) => void;
  informedConsentTrustedContact: string;
  setInformedConsentTrustedContact: (val: string | ((prev: string) => string)) => void;
  informedConsentRisks: string;
  setInformedConsentRisks: (val: string | ((prev: string) => string)) => void;
  informedConsentAlternatives: string;
  setInformedConsentAlternatives: (val: string | ((prev: string) => string)) => void;
  informedConsentAftercare: string;
  setInformedConsentAftercare: (val: string | ((prev: string) => string)) => void;
  informedConsentDoctorFullName: string;
  setInformedConsentDoctorFullName: (val: string | ((prev: string) => string)) => void;
  informedConsentConfirmedAt: string;
  setInformedConsentConfirmedAt: (val: string | ((prev: string) => string)) => void;
  informedConsentQuestionsAnswered: boolean;
  setInformedConsentQuestionsAnswered: (val: boolean | ((prev: boolean) => boolean)) => void;
  informedConsentRisksUnderstood: boolean;
  setInformedConsentRisksUnderstood: (val: boolean | ((prev: boolean) => boolean)) => void;
  informedConsentWithdrawUnderstood: boolean;
  setInformedConsentWithdrawUnderstood: (val: boolean | ((prev: boolean) => boolean)) => void;
  procedureConsentProcedureType: ProcedureSpecificConsentProcedure;
  setProcedureConsentProcedureType: (val: ProcedureSpecificConsentProcedure | ((prev: ProcedureSpecificConsentProcedure) => ProcedureSpecificConsentProcedure)) => void;
  procedureConsentProcedureName: string;
  setProcedureConsentProcedureName: (val: string | ((prev: string) => string)) => void;
  procedureConsentToothOrArea: string;
  setProcedureConsentToothOrArea: (val: string | ((prev: string) => string)) => void;
  procedureConsentDiagnosisOrIndication: string;
  setProcedureConsentDiagnosisOrIndication: (val: string | ((prev: string) => string)) => void;
  procedureConsentAnesthesia: string;
  setProcedureConsentAnesthesia: (val: string | ((prev: string) => string)) => void;
  procedureConsentMaterials: string;
  setProcedureConsentMaterials: (val: string | ((prev: string) => string)) => void;
  procedureConsentPatientRiskFactors: string;
  setProcedureConsentPatientRiskFactors: (val: string | ((prev: string) => string)) => void;
  procedureConsentSpecificRisks: string;
  setProcedureConsentSpecificRisks: (val: string | ((prev: string) => string)) => void;
  procedureConsentAlternatives: string;
  setProcedureConsentAlternatives: (val: string | ((prev: string) => string)) => void;
  procedureConsentAftercare: string;
  setProcedureConsentAftercare: (val: string | ((prev: string) => string)) => void;
  procedureConsentDoctorFullName: string;
  setProcedureConsentDoctorFullName: (val: string | ((prev: string) => string)) => void;
  procedureConsentConfirmedAt: string;
  setProcedureConsentConfirmedAt: (val: string | ((prev: string) => string)) => void;
  procedureConsentLocalFormAttached: boolean;
  setProcedureConsentLocalFormAttached: (val: boolean | ((prev: boolean) => boolean)) => void;
  procedureConsentQuestionsAnswered: boolean;
  setProcedureConsentQuestionsAnswered: (val: boolean | ((prev: boolean) => boolean)) => void;
  procedureConsentExactProcedureConfirmed: boolean;
  setProcedureConsentExactProcedureConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  procedureConsentRisksUnderstood: boolean;
  setProcedureConsentRisksUnderstood: (val: boolean | ((prev: boolean) => boolean)) => void;
  paidContractNumber: string;
  setPaidContractNumber: (val: string | ((prev: string) => string)) => void;
  paidContractDate: string;
  setPaidContractDate: (val: string | ((prev: string) => string)) => void;
  paidContractServiceStart: string;
  setPaidContractServiceStart: (val: string | ((prev: string) => string)) => void;
  paidContractServiceEnd: string;
  setPaidContractServiceEnd: (val: string | ((prev: string) => string)) => void;
  paidContractCustomerFullName: string;
  setPaidContractCustomerFullName: (val: string | ((prev: string) => string)) => void;
  paidContractRepresentativeFullName: string;
  setPaidContractRepresentativeFullName: (val: string | ((prev: string) => string)) => void;
  paidContractCareReason: string;
  setPaidContractCareReason: (val: string | ((prev: string) => string)) => void;
  paidContractServiceScope: string;
  setPaidContractServiceScope: (val: string | ((prev: string) => string)) => void;
  paidContractTotalRub: string;
  setPaidContractTotalRub: (val: string | ((prev: string) => string)) => void;
  paidContractPaymentTerms: string;
  setPaidContractPaymentTerms: (val: string | ((prev: string) => string)) => void;
  paidContractPriceChangeRules: string;
  setPaidContractPriceChangeRules: (val: string | ((prev: string) => string)) => void;
  paidContractFreeCareNotice: string;
  setPaidContractFreeCareNotice: (val: string | ((prev: string) => string)) => void;
  paidContractRecommendationWarning: string;
  setPaidContractRecommendationWarning: (val: string | ((prev: string) => string)) => void;
  paidContractRefundTerms: string;
  setPaidContractRefundTerms: (val: string | ((prev: string) => string)) => void;
  paidContractWarrantyTerms: string;
  setPaidContractWarrantyTerms: (val: string | ((prev: string) => string)) => void;
  paidContractDoctorFullName: string;
  setPaidContractDoctorFullName: (val: string | ((prev: string) => string)) => void;
  paidContractSignedAt: string;
  setPaidContractSignedAt: (val: string | ((prev: string) => string)) => void;
  paidContractClinicInfoConfirmed: boolean;
  setPaidContractClinicInfoConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  paidContractServiceListConfirmed: boolean;
  setPaidContractServiceListConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  paidContractPaidBasisConfirmed: boolean;
  setPaidContractPaidBasisConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  paidContractWrittenChangesConfirmed: boolean;
  setPaidContractWrittenChangesConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  completedActNumber: string;
  setCompletedActNumber: (val: string | ((prev: string) => string)) => void;
  completedActDate: string;
  setCompletedActDate: (val: string | ((prev: string) => string)) => void;
  completedActContractNumber: string;
  setCompletedActContractNumber: (val: string | ((prev: string) => string)) => void;
  completedActLinkedContractDocumentId: string;
  setCompletedActLinkedContractDocumentId: (val: string | ((prev: string) => string)) => void;
  completedActServicePeriodStart: string;
  setCompletedActServicePeriodStart: (val: string | ((prev: string) => string)) => void;
  completedActServicePeriodEnd: string;
  setCompletedActServicePeriodEnd: (val: string | ((prev: string) => string)) => void;
  completedActDoctorFullName: string;
  setCompletedActDoctorFullName: (val: string | ((prev: string) => string)) => void;
  completedActServicesSummary: string;
  setCompletedActServicesSummary: (val: string | ((prev: string) => string)) => void;
  completedActTotalRub: string;
  setCompletedActTotalRub: (val: string | ((prev: string) => string)) => void;
  completedActPaidRub: string;
  setCompletedActPaidRub: (val: string | ((prev: string) => string)) => void;
  completedActFiscalReceipts: string;
  setCompletedActFiscalReceipts: (val: string | ((prev: string) => string)) => void;
  completedActPatientClaims: string;
  setCompletedActPatientClaims: (val: string | ((prev: string) => string)) => void;
  completedActLinkedContract: boolean;
  setCompletedActLinkedContract: (val: boolean | ((prev: boolean) => boolean)) => void;
  completedActFinalScopeConfirmed: boolean;
  setCompletedActFinalScopeConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  completedActFiscalReceiptsVerified: boolean;
  setCompletedActFiscalReceiptsVerified: (val: boolean | ((prev: boolean) => boolean)) => void;
  completedActAccepted: boolean;
  setCompletedActAccepted: (val: boolean | ((prev: boolean) => boolean)) => void;
  treatmentEstimateNumber: string;
  setTreatmentEstimateNumber: (val: string | ((prev: string) => string)) => void;
  treatmentEstimateDate: string;
  setTreatmentEstimateDate: (val: string | ((prev: string) => string)) => void;
  treatmentEstimatePatientOrPayerFullName: string;
  setTreatmentEstimatePatientOrPayerFullName: (val: string | ((prev: string) => string)) => void;
  treatmentEstimateTreatmentBasis: string;
  setTreatmentEstimateTreatmentBasis: (val: string | ((prev: string) => string)) => void;
  treatmentEstimateTotalRub: string;
  setTreatmentEstimateTotalRub: (val: string | ((prev: string) => string)) => void;
  treatmentEstimateValidUntil: string;
  setTreatmentEstimateValidUntil: (val: string | ((prev: string) => string)) => void;
  treatmentEstimatePriceChangeRules: string;
  setTreatmentEstimatePriceChangeRules: (val: string | ((prev: string) => string)) => void;
  treatmentEstimateExcludedItems: string;
  setTreatmentEstimateExcludedItems: (val: string | ((prev: string) => string)) => void;
  treatmentEstimatePaymentMilestoneNotes: string;
  setTreatmentEstimatePaymentMilestoneNotes: (val: string | ((prev: string) => string)) => void;
  treatmentEstimateDoctorFullName: string;
  setTreatmentEstimateDoctorFullName: (val: string | ((prev: string) => string)) => void;
  treatmentEstimateAdminFullName: string;
  setTreatmentEstimateAdminFullName: (val: string | ((prev: string) => string)) => void;
  treatmentEstimateSignedAt: string;
  setTreatmentEstimateSignedAt: (val: string | ((prev: string) => string)) => void;
  treatmentEstimatePreliminaryConfirmed: boolean;
  setTreatmentEstimatePreliminaryConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  treatmentEstimateScopeConfirmed: boolean;
  setTreatmentEstimateScopeConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  treatmentEstimateFiscalNoticeConfirmed: boolean;
  setTreatmentEstimateFiscalNoticeConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  treatmentEstimateChangeRulesConfirmed: boolean;
  setTreatmentEstimateChangeRulesConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  paymentInvoiceNumber: string;
  setPaymentInvoiceNumber: (val: string | ((prev: string) => string)) => void;
  paymentInvoiceDate: string;
  setPaymentInvoiceDate: (val: string | ((prev: string) => string)) => void;
  paymentInvoicePayerFullName: string;
  setPaymentInvoicePayerFullName: (val: string | ((prev: string) => string)) => void;
  paymentInvoicePayerPhone: string;
  setPaymentInvoicePayerPhone: (val: string | ((prev: string) => string)) => void;
  paymentInvoicePayerEmail: string;
  setPaymentInvoicePayerEmail: (val: string | ((prev: string) => string)) => void;
  paymentInvoicePurpose: string;
  setPaymentInvoicePurpose: (val: string | ((prev: string) => string)) => void;
  paymentInvoiceDueDate: string;
  setPaymentInvoiceDueDate: (val: string | ((prev: string) => string)) => void;
  paymentInvoicePaymentTerms: string;
  setPaymentInvoicePaymentTerms: (val: string | ((prev: string) => string)) => void;
  paymentInvoiceBankDetails: string;
  setPaymentInvoiceBankDetails: (val: string | ((prev: string) => string)) => void;
  paymentInvoiceQrPayload: string;
  setPaymentInvoiceQrPayload: (val: string | ((prev: string) => string)) => void;
  paymentInvoiceCashlessAllowed: boolean;
  setPaymentInvoiceCashlessAllowed: (val: boolean | ((prev: boolean) => boolean)) => void;
  paymentInvoiceCashDeskAllowed: boolean;
  setPaymentInvoiceCashDeskAllowed: (val: boolean | ((prev: boolean) => boolean)) => void;
  paymentInvoiceRequisitesVerified: boolean;
  setPaymentInvoiceRequisitesVerified: (val: boolean | ((prev: boolean) => boolean)) => void;
  paymentInvoiceServiceScopeConfirmed: boolean;
  setPaymentInvoiceServiceScopeConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  paymentInvoiceFiscalNoticeConfirmed: boolean;
  setPaymentInvoiceFiscalNoticeConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  paymentReceiptNumber: string;
  setPaymentReceiptNumber: (val: string | ((prev: string) => string)) => void;
  paymentReceiptDate: string;
  setPaymentReceiptDate: (val: string | ((prev: string) => string)) => void;
  paymentReceiptPayerFullName: string;
  setPaymentReceiptPayerFullName: (val: string | ((prev: string) => string)) => void;
  paymentReceiptPayerBirthDate: string;
  setPaymentReceiptPayerBirthDate: (val: string | ((prev: string) => string)) => void;
  paymentReceiptPayerInn: string;
  setPaymentReceiptPayerInn: (val: string | ((prev: string) => string)) => void;
  paymentReceiptPayerIdentityDocument: string;
  setPaymentReceiptPayerIdentityDocument: (val: string | ((prev: string) => string)) => void;
  paymentReceiptPayerRelationship: string;
  setPaymentReceiptPayerRelationship: (val: string | ((prev: string) => string)) => void;
  paymentReceiptTaxSupportRequested: any;
  setPaymentReceiptTaxSupportRequested: (val: any | ((prev: any) => any)) => void;
  paymentReceiptPurpose: string;
  setPaymentReceiptPurpose: (val: string | ((prev: string) => string)) => void;
  paymentReceiptIssuedBy: string;
  setPaymentReceiptIssuedBy: (val: string | ((prev: string) => string)) => void;
  paymentReceiptPaymentsVerified: boolean;
  setPaymentReceiptPaymentsVerified: (val: boolean | ((prev: boolean) => boolean)) => void;
  paymentReceiptPayerVerified: boolean;
  setPaymentReceiptPayerVerified: (val: boolean | ((prev: boolean) => boolean)) => void;
  paymentReceiptFiscalNoticeConfirmed: boolean;
  setPaymentReceiptFiscalNoticeConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  installmentScheduleNumber: string;
  setInstallmentScheduleNumber: (val: string | ((prev: string) => string)) => void;
  installmentScheduleDate: string;
  setInstallmentScheduleDate: (val: string | ((prev: string) => string)) => void;
  installmentScheduleBaseDocumentTitle: string;
  setInstallmentScheduleBaseDocumentTitle: (val: string | ((prev: string) => string)) => void;
  installmentSchedulePayerFullName: string;
  setInstallmentSchedulePayerFullName: (val: string | ((prev: string) => string)) => void;
  installmentScheduleTotalRub: string;
  setInstallmentScheduleTotalRub: (val: string | ((prev: string) => string)) => void;
  installmentSchedulePrepaidRub: string;
  setInstallmentSchedulePrepaidRub: (val: string | ((prev: string) => string)) => void;
  installmentScheduleRows: string;
  setInstallmentScheduleRows: (val: string | ((prev: string) => string)) => void;
  installmentScheduleLatePolicy: string;
  setInstallmentScheduleLatePolicy: (val: string | ((prev: string) => string)) => void;
  installmentSchedulePaymentMethodNotes: string;
  setInstallmentSchedulePaymentMethodNotes: (val: string | ((prev: string) => string)) => void;
  installmentScheduleResponsibleFullName: string;
  setInstallmentScheduleResponsibleFullName: (val: string | ((prev: string) => string)) => void;
  installmentScheduleAccepted: boolean;
  setInstallmentScheduleAccepted: (val: boolean | ((prev: boolean) => boolean)) => void;
  installmentScheduleFiscalNoticeConfirmed: boolean;
  setInstallmentScheduleFiscalNoticeConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  installmentScheduleWrittenChangesConfirmed: boolean;
  setInstallmentScheduleWrittenChangesConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  minorRepresentativeFullName: string;
  setMinorRepresentativeFullName: (val: string | ((prev: string) => string)) => void;
  minorRepresentativeRelationship: string;
  setMinorRepresentativeRelationship: (val: string | ((prev: string) => string)) => void;
  minorRepresentativeIdentityDocument: string;
  setMinorRepresentativeIdentityDocument: (val: string | ((prev: string) => string)) => void;
  minorRepresentativeAuthorityDocument: string;
  setMinorRepresentativeAuthorityDocument: (val: string | ((prev: string) => string)) => void;
  minorRepresentativePhone: string;
  setMinorRepresentativePhone: (val: string | ((prev: string) => string)) => void;
  minorConsentPatientFullName: string;
  setMinorConsentPatientFullName: (val: string | ((prev: string) => string)) => void;
  minorConsentPatientBirthDate: string;
  setMinorConsentPatientBirthDate: (val: string | ((prev: string) => string)) => void;
  minorConsentInterventionScope: string;
  setMinorConsentInterventionScope: (val: string | ((prev: string) => string)) => void;
  minorConsentDiagnosisOrIndication: string;
  setMinorConsentDiagnosisOrIndication: (val: string | ((prev: string) => string)) => void;
  minorConsentRisks: string;
  setMinorConsentRisks: (val: string | ((prev: string) => string)) => void;
  minorConsentAlternatives: string;
  setMinorConsentAlternatives: (val: string | ((prev: string) => string)) => void;
  minorConsentDoctorFullName: string;
  setMinorConsentDoctorFullName: (val: string | ((prev: string) => string)) => void;
  minorConsentSignedAt: string;
  setMinorConsentSignedAt: (val: string | ((prev: string) => string)) => void;
  minorConsentIdentityVerified: boolean;
  setMinorConsentIdentityVerified: (val: boolean | ((prev: boolean) => boolean)) => void;
  minorConsentAuthorityVerified: boolean;
  setMinorConsentAuthorityVerified: (val: boolean | ((prev: boolean) => boolean)) => void;
  minorConsentExplained: boolean;
  setMinorConsentExplained: (val: boolean | ((prev: boolean) => boolean)) => void;
  minorConsentStored: boolean;
  setMinorConsentStored: (val: boolean | ((prev: boolean) => boolean)) => void;
  minorConsentAgeExplanation: boolean;
  setMinorConsentAgeExplanation: (val: boolean | ((prev: boolean) => boolean)) => void;
  warrantyServiceOrWorkName: string;
  setWarrantyServiceOrWorkName: (val: string | ((prev: string) => string)) => void;
  warrantyCompletedAt: string;
  setWarrantyCompletedAt: (val: string | ((prev: string) => string)) => void;
  warrantyTeethOrArea: string;
  setWarrantyTeethOrArea: (val: string | ((prev: string) => string)) => void;
  warrantyMaterialsOrSystems: string;
  setWarrantyMaterialsOrSystems: (val: string | ((prev: string) => string)) => void;
  warrantyPeriod: string;
  setWarrantyPeriod: (val: string | ((prev: string) => string)) => void;
  warrantyControlVisitSchedule: string;
  setWarrantyControlVisitSchedule: (val: string | ((prev: string) => string)) => void;
  warrantyPatientObligations: string;
  setWarrantyPatientObligations: (val: string | ((prev: string) => string)) => void;
  warrantyExcludedRiskFactors: string;
  setWarrantyExcludedRiskFactors: (val: string | ((prev: string) => string)) => void;
  warrantyUrgentContactReasons: string;
  setWarrantyUrgentContactReasons: (val: string | ((prev: string) => string)) => void;
  warrantyLinkedActOrContract: string;
  setWarrantyLinkedActOrContract: (val: string | ((prev: string) => string)) => void;
  warrantyDoctorFullName: string;
  setWarrantyDoctorFullName: (val: string | ((prev: string) => string)) => void;
  warrantyIssuedAt: string;
  setWarrantyIssuedAt: (val: string | ((prev: string) => string)) => void;
  warrantyPolicyApplied: boolean;
  setWarrantyPolicyApplied: (val: boolean | ((prev: boolean) => boolean)) => void;
  warrantyAftercareReceived: boolean;
  setWarrantyAftercareReceived: (val: boolean | ((prev: boolean) => boolean)) => void;
  warrantyControlVisitsUnderstood: boolean;
  setWarrantyControlVisitsUnderstood: (val: boolean | ((prev: boolean) => boolean)) => void;
  clinicalToothRowsText: any;
  setClinicalToothRowsText: (val: any | ((prev: any) => any)) => void;
  treatmentPlanClinicalReason: string;
  setTreatmentPlanClinicalReason: (val: string | ((prev: string) => string)) => void;
  treatmentPlanDiagnosisSummary: string;
  setTreatmentPlanDiagnosisSummary: (val: string | ((prev: string) => string)) => void;
  treatmentPlanTeethOrArea: string;
  setTreatmentPlanTeethOrArea: (val: string | ((prev: string) => string)) => void;
  treatmentPlanGoals: string;
  setTreatmentPlanGoals: (val: string | ((prev: string) => string)) => void;
  treatmentPlanStages: string;
  setTreatmentPlanStages: (val: string | ((prev: string) => string)) => void;
  treatmentPlanEstimatedTotalRub: string;
  setTreatmentPlanEstimatedTotalRub: (val: string | ((prev: string) => string)) => void;
  treatmentPlanAlternatives: string;
  setTreatmentPlanAlternatives: (val: string | ((prev: string) => string)) => void;
  treatmentPlanRisks: string;
  setTreatmentPlanRisks: (val: string | ((prev: string) => string)) => void;
  treatmentPlanPrognosis: string;
  setTreatmentPlanPrognosis: (val: string | ((prev: string) => string)) => void;
  treatmentPlanControlPlan: string;
  setTreatmentPlanControlPlan: (val: string | ((prev: string) => string)) => void;
  treatmentPlanDoctorFullName: string;
  setTreatmentPlanDoctorFullName: (val: string | ((prev: string) => string)) => void;
  treatmentPlanPlannedAt: string;
  setTreatmentPlanPlannedAt: (val: string | ((prev: string) => string)) => void;
  treatmentPlanQuestionsAnswered: boolean;
  setTreatmentPlanQuestionsAnswered: (val: boolean | ((prev: boolean) => boolean)) => void;
  treatmentPlanSeparateConsentAcknowledged: boolean;
  setTreatmentPlanSeparateConsentAcknowledged: (val: boolean | ((prev: boolean) => boolean)) => void;
  treatmentPlanNewApprovalAcknowledged: boolean;
  setTreatmentPlanNewApprovalAcknowledged: (val: boolean | ((prev: boolean) => boolean)) => void;
  treatmentAcceptanceVariant: TreatmentPlanAcceptanceVariant;
  setTreatmentAcceptanceVariant: (val: TreatmentPlanAcceptanceVariant | ((prev: TreatmentPlanAcceptanceVariant) => TreatmentPlanAcceptanceVariant)) => void;
  treatmentAcceptanceClinicalGoal: string;
  setTreatmentAcceptanceClinicalGoal: (val: string | ((prev: string) => string)) => void;
  treatmentAcceptanceDiagnosisSummary: string;
  setTreatmentAcceptanceDiagnosisSummary: (val: string | ((prev: string) => string)) => void;
  treatmentAcceptanceTeethOrArea: string;
  setTreatmentAcceptanceTeethOrArea: (val: string | ((prev: string) => string)) => void;
  treatmentAcceptanceStages: string;
  setTreatmentAcceptanceStages: (val: string | ((prev: string) => string)) => void;
  treatmentAcceptanceEstimatedTotalRub: string;
  setTreatmentAcceptanceEstimatedTotalRub: (val: string | ((prev: string) => string)) => void;
  treatmentAcceptanceEstimateValidUntil: string;
  setTreatmentAcceptanceEstimateValidUntil: (val: string | ((prev: string) => string)) => void;
  treatmentAcceptancePaymentTerms: string;
  setTreatmentAcceptancePaymentTerms: (val: string | ((prev: string) => string)) => void;
  treatmentAcceptanceRejectedAlternatives: string;
  setTreatmentAcceptanceRejectedAlternatives: (val: string | ((prev: string) => string)) => void;
  treatmentAcceptanceRisks: string;
  setTreatmentAcceptanceRisks: (val: string | ((prev: string) => string)) => void;
  treatmentAcceptanceWarrantyTerms: string;
  setTreatmentAcceptanceWarrantyTerms: (val: string | ((prev: string) => string)) => void;
  treatmentAcceptanceDoctorFullName: string;
  setTreatmentAcceptanceDoctorFullName: (val: string | ((prev: string) => string)) => void;
  treatmentAcceptanceAcceptedAt: string;
  setTreatmentAcceptanceAcceptedAt: (val: string | ((prev: string) => string)) => void;
  treatmentAcceptanceQuestionsAnswered: boolean;
  setTreatmentAcceptanceQuestionsAnswered: (val: boolean | ((prev: boolean) => boolean)) => void;
  treatmentAcceptanceAlternativesUnderstood: boolean;
  setTreatmentAcceptanceAlternativesUnderstood: (val: boolean | ((prev: boolean) => boolean)) => void;
  treatmentAcceptanceCostChangeUnderstood: boolean;
  setTreatmentAcceptanceCostChangeUnderstood: (val: boolean | ((prev: boolean) => boolean)) => void;
  treatmentAcceptanceRevisionAcknowledged: boolean;
  setTreatmentAcceptanceRevisionAcknowledged: (val: boolean | ((prev: boolean) => boolean)) => void;
  postVisitCareTopic: PostVisitCareTopic;
  setPostVisitCareTopic: (val: PostVisitCareTopic | ((prev: PostVisitCareTopic) => PostVisitCareTopic)) => void;
  postVisitProcedureName: any;
  setPostVisitProcedureName: (val: any | ((prev: any) => any)) => void;
  postVisitToothOrArea: string;
  setPostVisitToothOrArea: (val: string | ((prev: string) => string)) => void;
  postVisitPerformedAt: string;
  setPostVisitPerformedAt: (val: string | ((prev: string) => string)) => void;
  postVisitDoctorFullName: string;
  setPostVisitDoctorFullName: (val: string | ((prev: string) => string)) => void;
  postVisitManualEdited: boolean;
  setPostVisitManualEdited: (val: boolean | ((prev: boolean) => boolean)) => void;
  postVisitPresetFeedback: string;
  setPostVisitPresetFeedback: (val: string | ((prev: string) => string)) => void;
  postVisitAllowedAfter: any;
  setPostVisitAllowedAfter: (val: any | ((prev: any) => any)) => void;
  postVisitRestrictions: any;
  setPostVisitRestrictions: (val: any | ((prev: any) => any)) => void;
  postVisitMedicationAndRinsePlan: any;
  setPostVisitMedicationAndRinsePlan: (val: any | ((prev: any) => any)) => void;
  postVisitHygieneInstructions: any;
  setPostVisitHygieneInstructions: (val: any | ((prev: any) => any)) => void;
  postVisitNutritionInstructions: any;
  setPostVisitNutritionInstructions: (val: any | ((prev: any) => any)) => void;
  postVisitUrgentWarningSigns: any;
  setPostVisitUrgentWarningSigns: (val: any | ((prev: any) => any)) => void;
  postVisitFollowUpAt: any;
  setPostVisitFollowUpAt: (val: any | ((prev: any) => any)) => void;
  postVisitClinicContactInstruction: string;
  setPostVisitClinicContactInstruction: (val: string | ((prev: string) => string)) => void;
  postVisitTelegramSummary: any;
  setPostVisitTelegramSummary: (val: any | ((prev: any) => any)) => void;
  postVisitPrintedCopyReceived: boolean;
  setPostVisitPrintedCopyReceived: (val: boolean | ((prev: boolean) => boolean)) => void;
  postVisitUrgentSignsUnderstood: boolean;
  setPostVisitUrgentSignsUnderstood: (val: boolean | ((prev: boolean) => boolean)) => void;
  postVisitTelegramSafe: boolean;
  setPostVisitTelegramSafe: (val: boolean | ((prev: boolean) => boolean)) => void;
  anesthesiaMethod: string;
  setAnesthesiaMethod: (val: string | ((prev: string) => string)) => void;
  anesthesiaAnesthetic: string;
  setAnesthesiaAnesthetic: (val: string | ((prev: string) => string)) => void;
  anesthesiaVasoconstrictor: string;
  setAnesthesiaVasoconstrictor: (val: string | ((prev: string) => string)) => void;
  anesthesiaZone: string;
  setAnesthesiaZone: (val: string | ((prev: string) => string)) => void;
  anesthesiaAllergyStatus: string;
  setAnesthesiaAllergyStatus: (val: string | ((prev: string) => string)) => void;
  anesthesiaRestrictionNotes: string;
  setAnesthesiaRestrictionNotes: (val: string | ((prev: string) => string)) => void;
  anesthesiaDoseTime: string;
  setAnesthesiaDoseTime: (val: string | ((prev: string) => string)) => void;
  anesthesiaDoseMl: string;
  setAnesthesiaDoseMl: (val: string | ((prev: string) => string)) => void;
  anesthesiaReaction: string;
  setAnesthesiaReaction: (val: string | ((prev: string) => string)) => void;
  anesthesiaRisksExplained: boolean;
  setAnesthesiaRisksExplained: (val: boolean | ((prev: boolean) => boolean)) => void;
  anesthesiaAllergyRestrictionsChecked: boolean;
  setAnesthesiaAllergyRestrictionsChecked: (val: boolean | ((prev: boolean) => boolean)) => void;
  anesthesiaConsentConfirmed: boolean;
  setAnesthesiaConsentConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  prescriptionMedication: string;
  setPrescriptionMedication: (val: string | ((prev: string) => string)) => void;
  prescriptionDosage: string;
  setPrescriptionDosage: (val: string | ((prev: string) => string)) => void;
  prescriptionInstructions: string;
  setPrescriptionInstructions: (val: string | ((prev: string) => string)) => void;
  prescriptionDuration: string;
  setPrescriptionDuration: (val: string | ((prev: string) => string)) => void;
  prescriptionSafetyNotes: string;
  setPrescriptionSafetyNotes: (val: string | ((prev: string) => string)) => void;
  prescriptionUrgentContactReason: string;
  setPrescriptionUrgentContactReason: (val: string | ((prev: string) => string)) => void;
  labWorkType: string;
  setLabWorkType: (val: string | ((prev: string) => string)) => void;
  labTeethOrArea: string;
  setLabTeethOrArea: (val: string | ((prev: string) => string)) => void;
  labMaterial: string;
  setLabMaterial: (val: string | ((prev: string) => string)) => void;
  labShade: string;
  setLabShade: (val: string | ((prev: string) => string)) => void;
  labSource: string;
  setLabSource: (val: string | ((prev: string) => string)) => void;
  labDeadline: string;
  setLabDeadline: (val: string | ((prev: string) => string)) => void;
  labTechnicianNotes: string;
  setLabTechnicianNotes: (val: string | ((prev: string) => string)) => void;
  photoVideoLabTransferAllowed: boolean;
  setPhotoVideoLabTransferAllowed: (val: boolean | ((prev: boolean) => boolean)) => void;
  photoVideoColleagueConsultationAllowed: boolean;
  setPhotoVideoColleagueConsultationAllowed: (val: boolean | ((prev: boolean) => boolean)) => void;
  photoVideoEducationUseAllowed: boolean;
  setPhotoVideoEducationUseAllowed: (val: boolean | ((prev: boolean) => boolean)) => void;
  photoVideoMarketingUseAllowed: boolean;
  setPhotoVideoMarketingUseAllowed: (val: boolean | ((prev: boolean) => boolean)) => void;
  photoVideoRecognizablePublicationAllowed: boolean;
  setPhotoVideoRecognizablePublicationAllowed: (val: boolean | ((prev: boolean) => boolean)) => void;
  photoVideoClinicalRecordUseConfirmed: boolean;
  setPhotoVideoClinicalRecordUseConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  photoVideoAnonymizationConfirmed: boolean;
  setPhotoVideoAnonymizationConfirmed: (val: boolean | ((prev: boolean) => boolean)) => void;
  photoVideoMaterials: PhotoVideoConsentMaterial[];
  setPhotoVideoMaterials: (val: PhotoVideoConsentMaterial[] | ((prev: PhotoVideoConsentMaterial[]) => PhotoVideoConsentMaterial[])) => void;
  photoVideoRevocationChannel: string;
  setPhotoVideoRevocationChannel: (val: string | ((prev: string) => string)) => void;
  photoVideoScopeNotes: string;
  setPhotoVideoScopeNotes: (val: string | ((prev: string) => string)) => void;
  xrayStudyType: XrayCbctReferralStudyType;
  setXrayStudyType: (val: XrayCbctReferralStudyType | ((prev: XrayCbctReferralStudyType) => XrayCbctReferralStudyType)) => void;
  xrayArea: string;
  setXrayArea: (val: string | ((prev: string) => string)) => void;
  xrayClinicalQuestion: string;
  setXrayClinicalQuestion: (val: string | ((prev: string) => string)) => void;
  xrayIndication: string;
  setXrayIndication: (val: string | ((prev: string) => string)) => void;
  xrayPregnancyStatus: XrayCbctReferralPregnancyStatus;
  setXrayPregnancyStatus: (val: XrayCbctReferralPregnancyStatus | ((prev: XrayCbctReferralPregnancyStatus) => XrayCbctReferralPregnancyStatus)) => void;
  xraySafetyNotes: string;
  setXraySafetyNotes: (val: string | ((prev: string) => string)) => void;
  xrayPriority: XrayCbctReferralPriority;
  setXrayPriority: (val: XrayCbctReferralPriority | ((prev: XrayCbctReferralPriority) => XrayCbctReferralPriority)) => void;
  xrayIncludeDicomExport: boolean;
  setXrayIncludeDicomExport: (val: boolean | ((prev: boolean) => boolean)) => void;
  xrayIncludeRadiologistReport: boolean;
  setXrayIncludeRadiologistReport: (val: boolean | ((prev: boolean) => boolean)) => void;
  xrayRequestedBy: string;
  setXrayRequestedBy: (val: string | ((prev: string) => string)) => void;
  xrayRecipientClinic: string;
  setXrayRecipientClinic: (val: string | ((prev: string) => string)) => void;
  xrayDueDate: string;
  setXrayDueDate: (val: string | ((prev: string) => string)) => void;
  recordExtractPeriodStart: string;
  setRecordExtractPeriodStart: (val: string | ((prev: string) => string)) => void;
  recordExtractPeriodEnd: string;
  setRecordExtractPeriodEnd: (val: string | ((prev: string) => string)) => void;
  recordExtractSourceVisitIds: string;
  setRecordExtractSourceVisitIds: (val: string | ((prev: string) => string)) => void;
  recordExtractComplaintAndAnamnesis: string;
  setRecordExtractComplaintAndAnamnesis: (val: string | ((prev: string) => string)) => void;
  recordExtractObjectiveStatus: string;
  setRecordExtractObjectiveStatus: (val: string | ((prev: string) => string)) => void;
  recordExtractDiagnosis: string;
  setRecordExtractDiagnosis: (val: string | ((prev: string) => string)) => void;
  recordExtractTreatmentProvided: string;
  setRecordExtractTreatmentProvided: (val: string | ((prev: string) => string)) => void;
  recordExtractRecommendations: string;
  setRecordExtractRecommendations: (val: string | ((prev: string) => string)) => void;
  recordExtractDoctorFullName: string;
  setRecordExtractDoctorFullName: (val: string | ((prev: string) => string)) => void;
  recordExtractRecipientFullName: string;
  setRecordExtractRecipientFullName: (val: string | ((prev: string) => string)) => void;
  recordExtractRecipientAuthority: string;
  setRecordExtractRecipientAuthority: (val: string | ((prev: string) => string)) => void;
  recordExtractIssuedAt: string;
  setRecordExtractIssuedAt: (val: string | ((prev: string) => string)) => void;
  recordExtractPreparedFromSignedRecords: boolean;
  setRecordExtractPreparedFromSignedRecords: (val: boolean | ((prev: boolean) => boolean)) => void;
  recordExtractThirdPartyDataChecked: boolean;
  setRecordExtractThirdPartyDataChecked: (val: boolean | ((prev: boolean) => boolean)) => void;
  outpatient025uMedicalCardNumber: string;
  setOutpatient025uMedicalCardNumber: (val: string | ((prev: string) => string)) => void;
  outpatient025uOpenedAt: string;
  setOutpatient025uOpenedAt: (val: string | ((prev: string) => string)) => void;
  outpatient025uPatientSexCode: "1" | "2" | "unknown";
  setOutpatient025uPatientSexCode: (val: "1" | "2" | "unknown" | ((prev: "1" | "2" | "unknown") => "1" | "2" | "unknown")) => void;
  outpatient025uCitizenship: string;
  setOutpatient025uCitizenship: (val: string | ((prev: string) => string)) => void;
  outpatient025uRegistrationUrbanRuralCode: "1" | "2" | "unknown";
  setOutpatient025uRegistrationUrbanRuralCode: (val: "1" | "2" | "unknown" | ((prev: "1" | "2" | "unknown") => "1" | "2" | "unknown")) => void;
  outpatient025uStayUrbanRuralCode: "1" | "2" | "unknown";
  setOutpatient025uStayUrbanRuralCode: (val: "1" | "2" | "unknown" | ((prev: "1" | "2" | "unknown") => "1" | "2" | "unknown")) => void;
  outpatient025uOmsIssuedAt: string;
  setOutpatient025uOmsIssuedAt: (val: string | ((prev: string) => string)) => void;
  outpatient025uInsurerName: string;
  setOutpatient025uInsurerName: (val: string | ((prev: string) => string)) => void;
  outpatient025uSocialSupportCode: string;
  setOutpatient025uSocialSupportCode: (val: string | ((prev: string) => string)) => void;
  outpatient025uHealthStatusDisclosureContact: string;
  setOutpatient025uHealthStatusDisclosureContact: (val: string | ((prev: string) => string)) => void;

}

export const useDocumentStore = create<DocumentState>((set) => ({
  documentCreateSavingKind: null,
  setDocumentCreateSavingKind: (val) => set((state) => ({ documentCreateSavingKind: typeof val === 'function' ? (val as any)(state.documentCreateSavingKind) : val })),
  documentStatusSavingId: null,
  setDocumentStatusSavingId: (val) => set((state) => ({ documentStatusSavingId: typeof val === 'function' ? (val as any)(state.documentStatusSavingId) : val })),
  taxDocumentPayerInn: "",
  setTaxDocumentPayerInn: (val) => set((state) => ({ taxDocumentPayerInn: typeof val === 'function' ? (val as any)(state.taxDocumentPayerInn) : val })),
  selectedTaxPaymentIds: [],
  setSelectedTaxPaymentIds: (val) => set((state) => ({ selectedTaxPaymentIds: typeof val === 'function' ? (val as any)(state.selectedTaxPaymentIds) : val })),
  selectedPaymentReceiptIds: [],
  setSelectedPaymentReceiptIds: (val) => set((state) => ({ selectedPaymentReceiptIds: typeof val === 'function' ? (val as any)(state.selectedPaymentReceiptIds) : val })),
  taxApplicationTaxpayerFullName: "",
  setTaxApplicationTaxpayerFullName: (val) => set((state) => ({ taxApplicationTaxpayerFullName: typeof val === 'function' ? (val as any)(state.taxApplicationTaxpayerFullName) : val })),
  taxApplicationTaxpayerInn: "",
  setTaxApplicationTaxpayerInn: (val) => set((state) => ({ taxApplicationTaxpayerInn: typeof val === 'function' ? (val as any)(state.taxApplicationTaxpayerInn) : val })),
  taxApplicationTaxpayerBirthDate: "",
  setTaxApplicationTaxpayerBirthDate: (val) => set((state) => ({ taxApplicationTaxpayerBirthDate: typeof val === 'function' ? (val as any)(state.taxApplicationTaxpayerBirthDate) : val })),
  taxApplicationTaxpayerIdentityDocument: "",
  setTaxApplicationTaxpayerIdentityDocument: (val) => set((state) => ({ taxApplicationTaxpayerIdentityDocument: typeof val === 'function' ? (val as any)(state.taxApplicationTaxpayerIdentityDocument) : val })),
  taxApplicationRelationship: "self",
  setTaxApplicationRelationship: (val) => set((state) => ({ taxApplicationRelationship: typeof val === 'function' ? (val as any)(state.taxApplicationRelationship) : val })),
  taxApplicationForm: initialUiPreferences.taxApplicationForm,
  setTaxApplicationForm: (val) => set((state) => ({ taxApplicationForm: typeof val === 'function' ? (val as any)(state.taxApplicationForm) : val })),
  taxApplicationDeliveryChannel: initialUiPreferences.taxApplicationDeliveryChannel,
  setTaxApplicationDeliveryChannel: (val) => set((state) => ({ taxApplicationDeliveryChannel: typeof val === 'function' ? (val as any)(state.taxApplicationDeliveryChannel) : val })),
  taxApplicationContact: "",
  setTaxApplicationContact: (val) => set((state) => ({ taxApplicationContact: typeof val === 'function' ? (val as any)(state.taxApplicationContact) : val })),
  taxApplicationAuthorityDocument: "",
  setTaxApplicationAuthorityDocument: (val) => set((state) => ({ taxApplicationAuthorityDocument: typeof val === 'function' ? (val as any)(state.taxApplicationAuthorityDocument) : val })),
  taxApplicationRequestedAt: (() => toDateTimeLocalValue(new Date().toISOString()))(),
  setTaxApplicationRequestedAt: (val) => set((state) => ({ taxApplicationRequestedAt: typeof val === 'function' ? (val as any)(state.taxApplicationRequestedAt) : val })),
  taxApplicationDuplicateWarningAccepted: false,
  setTaxApplicationDuplicateWarningAccepted: (val) => set((state) => ({ taxApplicationDuplicateWarningAccepted: typeof val === 'function' ? (val as any)(state.taxApplicationDuplicateWarningAccepted) : val })),
  intakeChiefComplaint: "",
  setIntakeChiefComplaint: (val) => set((state) => ({ intakeChiefComplaint: typeof val === 'function' ? (val as any)(state.intakeChiefComplaint) : val })),
  intakeAllergyStatus: "Аллергии и нежелательные реакции со слов пациента не отмечены.",
  setIntakeAllergyStatus: (val) => set((state) => ({ intakeAllergyStatus: typeof val === 'function' ? (val as any)(state.intakeAllergyStatus) : val })),
  intakeCurrentMedications: "Постоянные препараты со слов пациента не принимает.",
  setIntakeCurrentMedications: (val) => set((state) => ({ intakeCurrentMedications: typeof val === 'function' ? (val as any)(state.intakeCurrentMedications) : val })),
  intakeChronicConditions: "Хронические заболевания со слов пациента отрицает.",
  setIntakeChronicConditions: (val) => set((state) => ({ intakeChronicConditions: typeof val === 'function' ? (val as any)(state.intakeChronicConditions) : val })),
  intakePregnancyStatus: "unknown",
  setIntakePregnancyStatus: (val) => set((state) => ({ intakePregnancyStatus: typeof val === 'function' ? (val as any)(state.intakePregnancyStatus) : val })),
  intakeAnticoagulants: "Антикоагулянты и препараты, влияющие на кровотечение, со слов пациента не принимает.",
  setIntakeAnticoagulants: (val) => set((state) => ({ intakeAnticoagulants: typeof val === 'function' ? (val as any)(state.intakeAnticoagulants) : val })),
  intakeInfectiousRiskNotes: "Инфекционные риски со слов пациента не заявлены.",
  setIntakeInfectiousRiskNotes: (val) => set((state) => ({ intakeInfectiousRiskNotes: typeof val === 'function' ? (val as any)(state.intakeInfectiousRiskNotes) : val })),
  intakeCardioEndocrineNotes: "Сердечно-сосудистые, эндокринные и иные системные риски требуют уточнения врачом перед вмешательством.",
  setIntakeCardioEndocrineNotes: (val) => set((state) => ({ intakeCardioEndocrineNotes: typeof val === 'function' ? (val as any)(state.intakeCardioEndocrineNotes) : val })),
  intakeEmergencyContact: "",
  setIntakeEmergencyContact: (val) => set((state) => ({ intakeEmergencyContact: typeof val === 'function' ? (val as any)(state.intakeEmergencyContact) : val })),
  intakeAdditionalNotes: "",
  setIntakeAdditionalNotes: (val) => set((state) => ({ intakeAdditionalNotes: typeof val === 'function' ? (val as any)(state.intakeAdditionalNotes) : val })),
  intakeAccuracyConfirmed: false,
  setIntakeAccuracyConfirmed: (val) => set((state) => ({ intakeAccuracyConfirmed: typeof val === 'function' ? (val as any)(state.intakeAccuracyConfirmed) : val })),
  informedConsentIntervention: "Стоматологическое вмешательство по согласованному плану",
  setInformedConsentIntervention: (val) => set((state) => ({ informedConsentIntervention: typeof val === 'function' ? (val as any)(state.informedConsentIntervention) : val })),
  informedConsentToothOrArea: "",
  setInformedConsentToothOrArea: (val) => set((state) => ({ informedConsentToothOrArea: typeof val === 'function' ? (val as any)(state.informedConsentToothOrArea) : val })),
  informedConsentDiagnosisOrIndication: "",
  setInformedConsentDiagnosisOrIndication: (val) => set((state) => ({ informedConsentDiagnosisOrIndication: typeof val === 'function' ? (val as any)(state.informedConsentDiagnosisOrIndication) : val })),
  informedConsentExpectedBenefit: "снижение боли, восстановление функции, профилактика осложнений и сохранение стоматологического здоровья",
  setInformedConsentExpectedBenefit: (val) => set((state) => ({ informedConsentExpectedBenefit: typeof val === 'function' ? (val as any)(state.informedConsentExpectedBenefit) : val })),
  informedConsentAnesthesia: "местная анестезия по показаниям",
  setInformedConsentAnesthesia: (val) => set((state) => ({ informedConsentAnesthesia: typeof val === 'function' ? (val as any)(state.informedConsentAnesthesia) : val })),
  informedConsentMaterialNotes: "",
  setInformedConsentMaterialNotes: (val) => set((state) => ({ informedConsentMaterialNotes: typeof val === 'function' ? (val as any)(state.informedConsentMaterialNotes) : val })),
  informedConsentTrustedContact: "не разрешаю сообщать медицинские сведения третьим лицам",
  setInformedConsentTrustedContact: (val) => set((state) => ({ informedConsentTrustedContact: typeof val === 'function' ? (val as any)(state.informedConsentTrustedContact) : val })),
  informedConsentRisks: "боль, отек, кровотечение или временный дискомфорт\nаллергическая реакция на препараты или материалы\nнеобходимость повторного приема или изменения плана лечения\nограниченный прогноз при исходном состоянии зубов и тканей",
  setInformedConsentRisks: (val) => set((state) => ({ informedConsentRisks: typeof val === 'function' ? (val as any)(state.informedConsentRisks) : val })),
  informedConsentAlternatives: "отложить вмешательство и наблюдать состояние\nполучить второе мнение\nвыбрать альтернативный метод лечения при наличии показаний\nотказаться от вмешательства с фиксацией возможных последствий",
  setInformedConsentAlternatives: (val) => set((state) => ({ informedConsentAlternatives: typeof val === 'function' ? (val as any)(state.informedConsentAlternatives) : val })),
  informedConsentAftercare: "соблюдать рекомендации врача и режим приема препаратов\nне принимать пищу до окончания действия анестезии, если она применялась\nсвязаться с клиникой при нарастающей боли, отеке, кровотечении, температуре или аллергической реакции\nявиться на контрольный прием в согласованный срок",
  setInformedConsentAftercare: (val) => set((state) => ({ informedConsentAftercare: typeof val === 'function' ? (val as any)(state.informedConsentAftercare) : val })),
  informedConsentDoctorFullName: "",
  setInformedConsentDoctorFullName: (val) => set((state) => ({ informedConsentDoctorFullName: typeof val === 'function' ? (val as any)(state.informedConsentDoctorFullName) : val })),
  informedConsentConfirmedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setInformedConsentConfirmedAt: (val) => set((state) => ({ informedConsentConfirmedAt: typeof val === 'function' ? (val as any)(state.informedConsentConfirmedAt) : val })),
  informedConsentQuestionsAnswered: false,
  setInformedConsentQuestionsAnswered: (val) => set((state) => ({ informedConsentQuestionsAnswered: typeof val === 'function' ? (val as any)(state.informedConsentQuestionsAnswered) : val })),
  informedConsentRisksUnderstood: false,
  setInformedConsentRisksUnderstood: (val) => set((state) => ({ informedConsentRisksUnderstood: typeof val === 'function' ? (val as any)(state.informedConsentRisksUnderstood) : val })),
  informedConsentWithdrawUnderstood: false,
  setInformedConsentWithdrawUnderstood: (val) => set((state) => ({ informedConsentWithdrawUnderstood: typeof val === 'function' ? (val as any)(state.informedConsentWithdrawUnderstood) : val })),
  procedureConsentProcedureType: initialUiPreferences.procedureConsentProcedureType,
  setProcedureConsentProcedureType: (val) => set((state) => ({ procedureConsentProcedureType: typeof val === 'function' ? (val as any)(state.procedureConsentProcedureType) : val })),
  procedureConsentProcedureName: "Лечение зуба по согласованному плану",
  setProcedureConsentProcedureName: (val) => set((state) => ({ procedureConsentProcedureName: typeof val === 'function' ? (val as any)(state.procedureConsentProcedureName) : val })),
  procedureConsentToothOrArea: "",
  setProcedureConsentToothOrArea: (val) => set((state) => ({ procedureConsentToothOrArea: typeof val === 'function' ? (val as any)(state.procedureConsentToothOrArea) : val })),
  procedureConsentDiagnosisOrIndication: "",
  setProcedureConsentDiagnosisOrIndication: (val) => set((state) => ({ procedureConsentDiagnosisOrIndication: typeof val === 'function' ? (val as any)(state.procedureConsentDiagnosisOrIndication) : val })),
  procedureConsentAnesthesia: "местная анестезия по показаниям",
  setProcedureConsentAnesthesia: (val) => set((state) => ({ procedureConsentAnesthesia: typeof val === 'function' ? (val as any)(state.procedureConsentAnesthesia) : val })),
  procedureConsentMaterials: "",
  setProcedureConsentMaterials: (val) => set((state) => ({ procedureConsentMaterials: typeof val === 'function' ? (val as any)(state.procedureConsentMaterials) : val })),
  procedureConsentPatientRiskFactors: "аллергии, постоянные препараты и хронические заболевания уточнены перед процедурой\nбеременность, антикоагулянты и инфекционные риски уточнены перед процедурой",
  setProcedureConsentPatientRiskFactors: (val) => set((state) => ({ procedureConsentPatientRiskFactors: typeof val === 'function' ? (val as any)(state.procedureConsentPatientRiskFactors) : val })),
  procedureConsentSpecificRisks: "боль, отек, кровоточивость или временный дискомфорт\nнеобходимость повторного приема, коррекции или изменения плана\nаллергическая реакция на препараты или материалы",
  setProcedureConsentSpecificRisks: (val) => set((state) => ({ procedureConsentSpecificRisks: typeof val === 'function' ? (val as any)(state.procedureConsentSpecificRisks) : val })),
  procedureConsentAlternatives: "отложить процедуру и наблюдать состояние\nвыбрать альтернативный метод лечения при наличии показаний\nполучить второе мнение\nотказаться от процедуры с фиксацией возможных последствий",
  setProcedureConsentAlternatives: (val) => set((state) => ({ procedureConsentAlternatives: typeof val === 'function' ? (val as any)(state.procedureConsentAlternatives) : val })),
  procedureConsentAftercare: "соблюдать рекомендации врача после процедуры\nне принимать пищу до окончания действия анестезии, если она применялась\nсвязаться с клиникой при боли, отеке, кровотечении, температуре или аллергической реакции\nявиться на контрольный прием в согласованный срок",
  setProcedureConsentAftercare: (val) => set((state) => ({ procedureConsentAftercare: typeof val === 'function' ? (val as any)(state.procedureConsentAftercare) : val })),
  procedureConsentDoctorFullName: "",
  setProcedureConsentDoctorFullName: (val) => set((state) => ({ procedureConsentDoctorFullName: typeof val === 'function' ? (val as any)(state.procedureConsentDoctorFullName) : val })),
  procedureConsentConfirmedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setProcedureConsentConfirmedAt: (val) => set((state) => ({ procedureConsentConfirmedAt: typeof val === 'function' ? (val as any)(state.procedureConsentConfirmedAt) : val })),
  procedureConsentLocalFormAttached: false,
  setProcedureConsentLocalFormAttached: (val) => set((state) => ({ procedureConsentLocalFormAttached: typeof val === 'function' ? (val as any)(state.procedureConsentLocalFormAttached) : val })),
  procedureConsentQuestionsAnswered: false,
  setProcedureConsentQuestionsAnswered: (val) => set((state) => ({ procedureConsentQuestionsAnswered: typeof val === 'function' ? (val as any)(state.procedureConsentQuestionsAnswered) : val })),
  procedureConsentExactProcedureConfirmed: false,
  setProcedureConsentExactProcedureConfirmed: (val) => set((state) => ({ procedureConsentExactProcedureConfirmed: typeof val === 'function' ? (val as any)(state.procedureConsentExactProcedureConfirmed) : val })),
  procedureConsentRisksUnderstood: false,
  setProcedureConsentRisksUnderstood: (val) => set((state) => ({ procedureConsentRisksUnderstood: typeof val === 'function' ? (val as any)(state.procedureConsentRisksUnderstood) : val })),
  paidContractNumber: "",
  setPaidContractNumber: (val) => set((state) => ({ paidContractNumber: typeof val === 'function' ? (val as any)(state.paidContractNumber) : val })),
  paidContractDate: (() => new Date().toLocaleDateString("ru-RU"))(),
  setPaidContractDate: (val) => set((state) => ({ paidContractDate: typeof val === 'function' ? (val as any)(state.paidContractDate) : val })),
  paidContractServiceStart: "",
  setPaidContractServiceStart: (val) => set((state) => ({ paidContractServiceStart: typeof val === 'function' ? (val as any)(state.paidContractServiceStart) : val })),
  paidContractServiceEnd: "до полного оказания согласованных услуг или подписания акта",
  setPaidContractServiceEnd: (val) => set((state) => ({ paidContractServiceEnd: typeof val === 'function' ? (val as any)(state.paidContractServiceEnd) : val })),
  paidContractCustomerFullName: "",
  setPaidContractCustomerFullName: (val) => set((state) => ({ paidContractCustomerFullName: typeof val === 'function' ? (val as any)(state.paidContractCustomerFullName) : val })),
  paidContractRepresentativeFullName: "",
  setPaidContractRepresentativeFullName: (val) => set((state) => ({ paidContractRepresentativeFullName: typeof val === 'function' ? (val as any)(state.paidContractRepresentativeFullName) : val })),
  paidContractCareReason: "",
  setPaidContractCareReason: (val) => set((state) => ({ paidContractCareReason: typeof val === 'function' ? (val as any)(state.paidContractCareReason) : val })),
  paidContractServiceScope: "",
  setPaidContractServiceScope: (val) => set((state) => ({ paidContractServiceScope: typeof val === 'function' ? (val as any)(state.paidContractServiceScope) : val })),
  paidContractTotalRub: "",
  setPaidContractTotalRub: (val) => set((state) => ({ paidContractTotalRub: typeof val === 'function' ? (val as any)(state.paidContractTotalRub) : val })),
  paidContractPaymentTerms: "оплата до или в день оказания услуги с выдачей кассового чека",
  setPaidContractPaymentTerms: (val) => set((state) => ({ paidContractPaymentTerms: typeof val === 'function' ? (val as any)(state.paidContractPaymentTerms) : val })),
  paidContractPriceChangeRules: "изменение объема, состава или стоимости платных услуг оформляется до оказания дополнительным соглашением или новым договором",
  setPaidContractPriceChangeRules: (val) => set((state) => ({ paidContractPriceChangeRules: typeof val === 'function' ? (val as any)(state.paidContractPriceChangeRules) : val })),
  paidContractFreeCareNotice: "пациенту разъяснена возможность получения медицинской помощи в рамках программы государственных гарантий при наличии оснований и маршрутизации",
  setPaidContractFreeCareNotice: (val) => set((state) => ({ paidContractFreeCareNotice: typeof val === 'function' ? (val as any)(state.paidContractFreeCareNotice) : val })),
  paidContractRecommendationWarning: "несоблюдение назначений, режима лечения и рекомендаций врача может снизить качество услуги, изменить сроки лечения или отрицательно сказаться на состоянии здоровья",
  setPaidContractRecommendationWarning: (val) => set((state) => ({ paidContractRecommendationWarning: typeof val === 'function' ? (val as any)(state.paidContractRecommendationWarning) : val })),
  paidContractRefundTerms: "при отказе пациента от услуг оплачиваются фактически понесенные исполнителем расходы и фактически оказанные услуги; возврат оформляется по кассовым и бухгалтерским правилам клиники",
  setPaidContractRefundTerms: (val) => set((state) => ({ paidContractRefundTerms: typeof val === 'function' ? (val as any)(state.paidContractRefundTerms) : val })),
  paidContractWarrantyTerms: "гарантийные и претензионные условия действуют по локальным правилам клиники, медицинским показаниям и при соблюдении рекомендаций врача",
  setPaidContractWarrantyTerms: (val) => set((state) => ({ paidContractWarrantyTerms: typeof val === 'function' ? (val as any)(state.paidContractWarrantyTerms) : val })),
  paidContractDoctorFullName: "",
  setPaidContractDoctorFullName: (val) => set((state) => ({ paidContractDoctorFullName: typeof val === 'function' ? (val as any)(state.paidContractDoctorFullName) : val })),
  paidContractSignedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setPaidContractSignedAt: (val) => set((state) => ({ paidContractSignedAt: typeof val === 'function' ? (val as any)(state.paidContractSignedAt) : val })),
  paidContractClinicInfoConfirmed: false,
  setPaidContractClinicInfoConfirmed: (val) => set((state) => ({ paidContractClinicInfoConfirmed: typeof val === 'function' ? (val as any)(state.paidContractClinicInfoConfirmed) : val })),
  paidContractServiceListConfirmed: false,
  setPaidContractServiceListConfirmed: (val) => set((state) => ({ paidContractServiceListConfirmed: typeof val === 'function' ? (val as any)(state.paidContractServiceListConfirmed) : val })),
  paidContractPaidBasisConfirmed: false,
  setPaidContractPaidBasisConfirmed: (val) => set((state) => ({ paidContractPaidBasisConfirmed: typeof val === 'function' ? (val as any)(state.paidContractPaidBasisConfirmed) : val })),
  paidContractWrittenChangesConfirmed: false,
  setPaidContractWrittenChangesConfirmed: (val) => set((state) => ({ paidContractWrittenChangesConfirmed: typeof val === 'function' ? (val as any)(state.paidContractWrittenChangesConfirmed) : val })),
  completedActNumber: "",
  setCompletedActNumber: (val) => set((state) => ({ completedActNumber: typeof val === 'function' ? (val as any)(state.completedActNumber) : val })),
  completedActDate: (() => new Date().toLocaleDateString("ru-RU"))(),
  setCompletedActDate: (val) => set((state) => ({ completedActDate: typeof val === 'function' ? (val as any)(state.completedActDate) : val })),
  completedActContractNumber: "",
  setCompletedActContractNumber: (val) => set((state) => ({ completedActContractNumber: typeof val === 'function' ? (val as any)(state.completedActContractNumber) : val })),
  completedActLinkedContractDocumentId: "",
  setCompletedActLinkedContractDocumentId: (val) => set((state) => ({ completedActLinkedContractDocumentId: typeof val === 'function' ? (val as any)(state.completedActLinkedContractDocumentId) : val })),
  completedActServicePeriodStart: "",
  setCompletedActServicePeriodStart: (val) => set((state) => ({ completedActServicePeriodStart: typeof val === 'function' ? (val as any)(state.completedActServicePeriodStart) : val })),
  completedActServicePeriodEnd: "",
  setCompletedActServicePeriodEnd: (val) => set((state) => ({ completedActServicePeriodEnd: typeof val === 'function' ? (val as any)(state.completedActServicePeriodEnd) : val })),
  completedActDoctorFullName: "",
  setCompletedActDoctorFullName: (val) => set((state) => ({ completedActDoctorFullName: typeof val === 'function' ? (val as any)(state.completedActDoctorFullName) : val })),
  completedActServicesSummary: "",
  setCompletedActServicesSummary: (val) => set((state) => ({ completedActServicesSummary: typeof val === 'function' ? (val as any)(state.completedActServicesSummary) : val })),
  completedActTotalRub: "",
  setCompletedActTotalRub: (val) => set((state) => ({ completedActTotalRub: typeof val === 'function' ? (val as any)(state.completedActTotalRub) : val })),
  completedActPaidRub: "",
  setCompletedActPaidRub: (val) => set((state) => ({ completedActPaidRub: typeof val === 'function' ? (val as any)(state.completedActPaidRub) : val })),
  completedActFiscalReceipts: "",
  setCompletedActFiscalReceipts: (val) => set((state) => ({ completedActFiscalReceipts: typeof val === 'function' ? (val as any)(state.completedActFiscalReceipts) : val })),
  completedActPatientClaims: "",
  setCompletedActPatientClaims: (val) => set((state) => ({ completedActPatientClaims: typeof val === 'function' ? (val as any)(state.completedActPatientClaims) : val })),
  completedActLinkedContract: false,
  setCompletedActLinkedContract: (val) => set((state) => ({ completedActLinkedContract: typeof val === 'function' ? (val as any)(state.completedActLinkedContract) : val })),
  completedActFinalScopeConfirmed: false,
  setCompletedActFinalScopeConfirmed: (val) => set((state) => ({ completedActFinalScopeConfirmed: typeof val === 'function' ? (val as any)(state.completedActFinalScopeConfirmed) : val })),
  completedActFiscalReceiptsVerified: false,
  setCompletedActFiscalReceiptsVerified: (val) => set((state) => ({ completedActFiscalReceiptsVerified: typeof val === 'function' ? (val as any)(state.completedActFiscalReceiptsVerified) : val })),
  completedActAccepted: false,
  setCompletedActAccepted: (val) => set((state) => ({ completedActAccepted: typeof val === 'function' ? (val as any)(state.completedActAccepted) : val })),
  treatmentEstimateNumber: "",
  setTreatmentEstimateNumber: (val) => set((state) => ({ treatmentEstimateNumber: typeof val === 'function' ? (val as any)(state.treatmentEstimateNumber) : val })),
  treatmentEstimateDate: (() => new Date().toLocaleDateString("ru-RU"))(),
  setTreatmentEstimateDate: (val) => set((state) => ({ treatmentEstimateDate: typeof val === 'function' ? (val as any)(state.treatmentEstimateDate) : val })),
  treatmentEstimatePatientOrPayerFullName: "",
  setTreatmentEstimatePatientOrPayerFullName: (val) => set((state) => ({ treatmentEstimatePatientOrPayerFullName: typeof val === 'function' ? (val as any)(state.treatmentEstimatePatientOrPayerFullName) : val })),
  treatmentEstimateTreatmentBasis: "",
  setTreatmentEstimateTreatmentBasis: (val) => set((state) => ({ treatmentEstimateTreatmentBasis: typeof val === 'function' ? (val as any)(state.treatmentEstimateTreatmentBasis) : val })),
  treatmentEstimateTotalRub: "",
  setTreatmentEstimateTotalRub: (val) => set((state) => ({ treatmentEstimateTotalRub: typeof val === 'function' ? (val as any)(state.treatmentEstimateTotalRub) : val })),
  treatmentEstimateValidUntil: "",
  setTreatmentEstimateValidUntil: (val) => set((state) => ({ treatmentEstimateValidUntil: typeof val === 'function' ? (val as any)(state.treatmentEstimateValidUntil) : val })),
  treatmentEstimatePriceChangeRules: "при изменении диагноза, объема вмешательства, материалов, лабораторного этапа или клинических условий стоимость согласуется до оказания дополнительных услуг",
  setTreatmentEstimatePriceChangeRules: (val) => set((state) => ({ treatmentEstimatePriceChangeRules: typeof val === 'function' ? (val as any)(state.treatmentEstimatePriceChangeRules) : val })),
  treatmentEstimateExcludedItems: "услуги, не указанные в строках сметы\nдополнительная диагностика и лабораторные этапы при новых показаниях\nэкстренная помощь и лечение осложнений, не связанных с текущим планом",
  setTreatmentEstimateExcludedItems: (val) => set((state) => ({ treatmentEstimateExcludedItems: typeof val === 'function' ? (val as any)(state.treatmentEstimateExcludedItems) : val })),
  treatmentEstimatePaymentMilestoneNotes: "оплата по этапам лечения или до оказания услуги; после фактической оплаты выдается кассовый чек",
  setTreatmentEstimatePaymentMilestoneNotes: (val) => set((state) => ({ treatmentEstimatePaymentMilestoneNotes: typeof val === 'function' ? (val as any)(state.treatmentEstimatePaymentMilestoneNotes) : val })),
  treatmentEstimateDoctorFullName: "",
  setTreatmentEstimateDoctorFullName: (val) => set((state) => ({ treatmentEstimateDoctorFullName: typeof val === 'function' ? (val as any)(state.treatmentEstimateDoctorFullName) : val })),
  treatmentEstimateAdminFullName: "",
  setTreatmentEstimateAdminFullName: (val) => set((state) => ({ treatmentEstimateAdminFullName: typeof val === 'function' ? (val as any)(state.treatmentEstimateAdminFullName) : val })),
  treatmentEstimateSignedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setTreatmentEstimateSignedAt: (val) => set((state) => ({ treatmentEstimateSignedAt: typeof val === 'function' ? (val as any)(state.treatmentEstimateSignedAt) : val })),
  treatmentEstimatePreliminaryConfirmed: false,
  setTreatmentEstimatePreliminaryConfirmed: (val) => set((state) => ({ treatmentEstimatePreliminaryConfirmed: typeof val === 'function' ? (val as any)(state.treatmentEstimatePreliminaryConfirmed) : val })),
  treatmentEstimateScopeConfirmed: false,
  setTreatmentEstimateScopeConfirmed: (val) => set((state) => ({ treatmentEstimateScopeConfirmed: typeof val === 'function' ? (val as any)(state.treatmentEstimateScopeConfirmed) : val })),
  treatmentEstimateFiscalNoticeConfirmed: false,
  setTreatmentEstimateFiscalNoticeConfirmed: (val) => set((state) => ({ treatmentEstimateFiscalNoticeConfirmed: typeof val === 'function' ? (val as any)(state.treatmentEstimateFiscalNoticeConfirmed) : val })),
  treatmentEstimateChangeRulesConfirmed: false,
  setTreatmentEstimateChangeRulesConfirmed: (val) => set((state) => ({ treatmentEstimateChangeRulesConfirmed: typeof val === 'function' ? (val as any)(state.treatmentEstimateChangeRulesConfirmed) : val })),
  paymentInvoiceNumber: "",
  setPaymentInvoiceNumber: (val) => set((state) => ({ paymentInvoiceNumber: typeof val === 'function' ? (val as any)(state.paymentInvoiceNumber) : val })),
  paymentInvoiceDate: (() => new Date().toLocaleDateString("ru-RU"))(),
  setPaymentInvoiceDate: (val) => set((state) => ({ paymentInvoiceDate: typeof val === 'function' ? (val as any)(state.paymentInvoiceDate) : val })),
  paymentInvoicePayerFullName: "",
  setPaymentInvoicePayerFullName: (val) => set((state) => ({ paymentInvoicePayerFullName: typeof val === 'function' ? (val as any)(state.paymentInvoicePayerFullName) : val })),
  paymentInvoicePayerPhone: "",
  setPaymentInvoicePayerPhone: (val) => set((state) => ({ paymentInvoicePayerPhone: typeof val === 'function' ? (val as any)(state.paymentInvoicePayerPhone) : val })),
  paymentInvoicePayerEmail: "",
  setPaymentInvoicePayerEmail: (val) => set((state) => ({ paymentInvoicePayerEmail: typeof val === 'function' ? (val as any)(state.paymentInvoicePayerEmail) : val })),
  paymentInvoicePurpose: "оплата стоматологических услуг по согласованному плану лечения",
  setPaymentInvoicePurpose: (val) => set((state) => ({ paymentInvoicePurpose: typeof val === 'function' ? (val as any)(state.paymentInvoicePurpose) : val })),
  paymentInvoiceDueDate: (() => dateInputValuePlusDays(7))(),
  setPaymentInvoiceDueDate: (val) => set((state) => ({ paymentInvoiceDueDate: typeof val === 'function' ? (val as any)(state.paymentInvoiceDueDate) : val })),
  paymentInvoicePaymentTerms: "оплата до или в день оказания услуги; после оплаты выдается кассовый чек",
  setPaymentInvoicePaymentTerms: (val) => set((state) => ({ paymentInvoicePaymentTerms: typeof val === 'function' ? (val as any)(state.paymentInvoicePaymentTerms) : val })),
  paymentInvoiceBankDetails: "",
  setPaymentInvoiceBankDetails: (val) => set((state) => ({ paymentInvoiceBankDetails: typeof val === 'function' ? (val as any)(state.paymentInvoiceBankDetails) : val })),
  paymentInvoiceQrPayload: "",
  setPaymentInvoiceQrPayload: (val) => set((state) => ({ paymentInvoiceQrPayload: typeof val === 'function' ? (val as any)(state.paymentInvoiceQrPayload) : val })),
  paymentInvoiceCashlessAllowed: true,
  setPaymentInvoiceCashlessAllowed: (val) => set((state) => ({ paymentInvoiceCashlessAllowed: typeof val === 'function' ? (val as any)(state.paymentInvoiceCashlessAllowed) : val })),
  paymentInvoiceCashDeskAllowed: true,
  setPaymentInvoiceCashDeskAllowed: (val) => set((state) => ({ paymentInvoiceCashDeskAllowed: typeof val === 'function' ? (val as any)(state.paymentInvoiceCashDeskAllowed) : val })),
  paymentInvoiceRequisitesVerified: false,
  setPaymentInvoiceRequisitesVerified: (val) => set((state) => ({ paymentInvoiceRequisitesVerified: typeof val === 'function' ? (val as any)(state.paymentInvoiceRequisitesVerified) : val })),
  paymentInvoiceServiceScopeConfirmed: false,
  setPaymentInvoiceServiceScopeConfirmed: (val) => set((state) => ({ paymentInvoiceServiceScopeConfirmed: typeof val === 'function' ? (val as any)(state.paymentInvoiceServiceScopeConfirmed) : val })),
  paymentInvoiceFiscalNoticeConfirmed: false,
  setPaymentInvoiceFiscalNoticeConfirmed: (val) => set((state) => ({ paymentInvoiceFiscalNoticeConfirmed: typeof val === 'function' ? (val as any)(state.paymentInvoiceFiscalNoticeConfirmed) : val })),
  paymentReceiptNumber: "",
  setPaymentReceiptNumber: (val) => set((state) => ({ paymentReceiptNumber: typeof val === 'function' ? (val as any)(state.paymentReceiptNumber) : val })),
  paymentReceiptDate: (() => new Date().toLocaleString("ru-RU"))(),
  setPaymentReceiptDate: (val) => set((state) => ({ paymentReceiptDate: typeof val === 'function' ? (val as any)(state.paymentReceiptDate) : val })),
  paymentReceiptPayerFullName: "",
  setPaymentReceiptPayerFullName: (val) => set((state) => ({ paymentReceiptPayerFullName: typeof val === 'function' ? (val as any)(state.paymentReceiptPayerFullName) : val })),
  paymentReceiptPayerBirthDate: "",
  setPaymentReceiptPayerBirthDate: (val) => set((state) => ({ paymentReceiptPayerBirthDate: typeof val === 'function' ? (val as any)(state.paymentReceiptPayerBirthDate) : val })),
  paymentReceiptPayerInn: "",
  setPaymentReceiptPayerInn: (val) => set((state) => ({ paymentReceiptPayerInn: typeof val === 'function' ? (val as any)(state.paymentReceiptPayerInn) : val })),
  paymentReceiptPayerIdentityDocument: "",
  setPaymentReceiptPayerIdentityDocument: (val) => set((state) => ({ paymentReceiptPayerIdentityDocument: typeof val === 'function' ? (val as any)(state.paymentReceiptPayerIdentityDocument) : val })),
  paymentReceiptPayerRelationship: "",
  setPaymentReceiptPayerRelationship: (val) => set((state) => ({ paymentReceiptPayerRelationship: typeof val === 'function' ? (val as any)(state.paymentReceiptPayerRelationship) : val })),
  paymentReceiptTaxSupportRequested: initialUiPreferences.paymentReceiptTaxSupportRequested,
  setPaymentReceiptTaxSupportRequested: (val) => set((state) => ({ paymentReceiptTaxSupportRequested: typeof val === 'function' ? (val as any)(state.paymentReceiptTaxSupportRequested) : val })),
  paymentReceiptPurpose: "оплата стоматологических услуг по выбранным фискальным чекам",
  setPaymentReceiptPurpose: (val) => set((state) => ({ paymentReceiptPurpose: typeof val === 'function' ? (val as any)(state.paymentReceiptPurpose) : val })),
  paymentReceiptIssuedBy: "",
  setPaymentReceiptIssuedBy: (val) => set((state) => ({ paymentReceiptIssuedBy: typeof val === 'function' ? (val as any)(state.paymentReceiptIssuedBy) : val })),
  paymentReceiptPaymentsVerified: false,
  setPaymentReceiptPaymentsVerified: (val) => set((state) => ({ paymentReceiptPaymentsVerified: typeof val === 'function' ? (val as any)(state.paymentReceiptPaymentsVerified) : val })),
  paymentReceiptPayerVerified: false,
  setPaymentReceiptPayerVerified: (val) => set((state) => ({ paymentReceiptPayerVerified: typeof val === 'function' ? (val as any)(state.paymentReceiptPayerVerified) : val })),
  paymentReceiptFiscalNoticeConfirmed: false,
  setPaymentReceiptFiscalNoticeConfirmed: (val) => set((state) => ({ paymentReceiptFiscalNoticeConfirmed: typeof val === 'function' ? (val as any)(state.paymentReceiptFiscalNoticeConfirmed) : val })),
  installmentScheduleNumber: "",
  setInstallmentScheduleNumber: (val) => set((state) => ({ installmentScheduleNumber: typeof val === 'function' ? (val as any)(state.installmentScheduleNumber) : val })),
  installmentScheduleDate: (() => new Date().toLocaleDateString("ru-RU"))(),
  setInstallmentScheduleDate: (val) => set((state) => ({ installmentScheduleDate: typeof val === 'function' ? (val as any)(state.installmentScheduleDate) : val })),
  installmentScheduleBaseDocumentTitle: "",
  setInstallmentScheduleBaseDocumentTitle: (val) => set((state) => ({ installmentScheduleBaseDocumentTitle: typeof val === 'function' ? (val as any)(state.installmentScheduleBaseDocumentTitle) : val })),
  installmentSchedulePayerFullName: "",
  setInstallmentSchedulePayerFullName: (val) => set((state) => ({ installmentSchedulePayerFullName: typeof val === 'function' ? (val as any)(state.installmentSchedulePayerFullName) : val })),
  installmentScheduleTotalRub: "",
  setInstallmentScheduleTotalRub: (val) => set((state) => ({ installmentScheduleTotalRub: typeof val === 'function' ? (val as any)(state.installmentScheduleTotalRub) : val })),
  installmentSchedulePrepaidRub: "",
  setInstallmentSchedulePrepaidRub: (val) => set((state) => ({ installmentSchedulePrepaidRub: typeof val === 'function' ? (val as any)(state.installmentSchedulePrepaidRub) : val })),
  installmentScheduleRows: (() => `Первый платеж | ${dateInputValuePlusDays(7)} | 0 | запланировано\nФинальный платеж | ${dateInputValuePlusDays(21)} | 0 | запланировано`)(),
  setInstallmentScheduleRows: (val) => set((state) => ({ installmentScheduleRows: typeof val === 'function' ? (val as any)(state.installmentScheduleRows) : val })),
  installmentScheduleLatePolicy: "при переносе срока администратор фиксирует контакт с пациентом, новый срок и основание переноса до наступления просрочки",
  setInstallmentScheduleLatePolicy: (val) => set((state) => ({ installmentScheduleLatePolicy: typeof val === 'function' ? (val as any)(state.installmentScheduleLatePolicy) : val })),
  installmentSchedulePaymentMethodNotes: "оплата в кассе клиники, по ссылке или безналично с выдачей кассового чека после оплаты",
  setInstallmentSchedulePaymentMethodNotes: (val) => set((state) => ({ installmentSchedulePaymentMethodNotes: typeof val === 'function' ? (val as any)(state.installmentSchedulePaymentMethodNotes) : val })),
  installmentScheduleResponsibleFullName: "",
  setInstallmentScheduleResponsibleFullName: (val) => set((state) => ({ installmentScheduleResponsibleFullName: typeof val === 'function' ? (val as any)(state.installmentScheduleResponsibleFullName) : val })),
  installmentScheduleAccepted: false,
  setInstallmentScheduleAccepted: (val) => set((state) => ({ installmentScheduleAccepted: typeof val === 'function' ? (val as any)(state.installmentScheduleAccepted) : val })),
  installmentScheduleFiscalNoticeConfirmed: false,
  setInstallmentScheduleFiscalNoticeConfirmed: (val) => set((state) => ({ installmentScheduleFiscalNoticeConfirmed: typeof val === 'function' ? (val as any)(state.installmentScheduleFiscalNoticeConfirmed) : val })),
  installmentScheduleWrittenChangesConfirmed: false,
  setInstallmentScheduleWrittenChangesConfirmed: (val) => set((state) => ({ installmentScheduleWrittenChangesConfirmed: typeof val === 'function' ? (val as any)(state.installmentScheduleWrittenChangesConfirmed) : val })),
  minorRepresentativeFullName: "",
  setMinorRepresentativeFullName: (val) => set((state) => ({ minorRepresentativeFullName: typeof val === 'function' ? (val as any)(state.minorRepresentativeFullName) : val })),
  minorRepresentativeRelationship: "",
  setMinorRepresentativeRelationship: (val) => set((state) => ({ minorRepresentativeRelationship: typeof val === 'function' ? (val as any)(state.minorRepresentativeRelationship) : val })),
  minorRepresentativeIdentityDocument: "",
  setMinorRepresentativeIdentityDocument: (val) => set((state) => ({ minorRepresentativeIdentityDocument: typeof val === 'function' ? (val as any)(state.minorRepresentativeIdentityDocument) : val })),
  minorRepresentativeAuthorityDocument: "",
  setMinorRepresentativeAuthorityDocument: (val) => set((state) => ({ minorRepresentativeAuthorityDocument: typeof val === 'function' ? (val as any)(state.minorRepresentativeAuthorityDocument) : val })),
  minorRepresentativePhone: "",
  setMinorRepresentativePhone: (val) => set((state) => ({ minorRepresentativePhone: typeof val === 'function' ? (val as any)(state.minorRepresentativePhone) : val })),
  minorConsentPatientFullName: "",
  setMinorConsentPatientFullName: (val) => set((state) => ({ minorConsentPatientFullName: typeof val === 'function' ? (val as any)(state.minorConsentPatientFullName) : val })),
  minorConsentPatientBirthDate: "",
  setMinorConsentPatientBirthDate: (val) => set((state) => ({ minorConsentPatientBirthDate: typeof val === 'function' ? (val as any)(state.minorConsentPatientBirthDate) : val })),
  minorConsentInterventionScope: "",
  setMinorConsentInterventionScope: (val) => set((state) => ({ minorConsentInterventionScope: typeof val === 'function' ? (val as any)(state.minorConsentInterventionScope) : val })),
  minorConsentDiagnosisOrIndication: "",
  setMinorConsentDiagnosisOrIndication: (val) => set((state) => ({ minorConsentDiagnosisOrIndication: typeof val === 'function' ? (val as any)(state.minorConsentDiagnosisOrIndication) : val })),
  minorConsentRisks: "боль, отек, кровоточивость или временный дискомфорт\nаллергическая реакция на препараты или материалы\nнеобходимость повторного визита или изменения плана лечения",
  setMinorConsentRisks: (val) => set((state) => ({ minorConsentRisks: typeof val === 'function' ? (val as any)(state.minorConsentRisks) : val })),
  minorConsentAlternatives: "отложить вмешательство и наблюдать состояние\nвыбрать альтернативный метод лечения при наличии показаний\nполучить второе мнение\nотказаться от вмешательства с фиксацией рисков",
  setMinorConsentAlternatives: (val) => set((state) => ({ minorConsentAlternatives: typeof val === 'function' ? (val as any)(state.minorConsentAlternatives) : val })),
  minorConsentDoctorFullName: "",
  setMinorConsentDoctorFullName: (val) => set((state) => ({ minorConsentDoctorFullName: typeof val === 'function' ? (val as any)(state.minorConsentDoctorFullName) : val })),
  minorConsentSignedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setMinorConsentSignedAt: (val) => set((state) => ({ minorConsentSignedAt: typeof val === 'function' ? (val as any)(state.minorConsentSignedAt) : val })),
  minorConsentIdentityVerified: false,
  setMinorConsentIdentityVerified: (val) => set((state) => ({ minorConsentIdentityVerified: typeof val === 'function' ? (val as any)(state.minorConsentIdentityVerified) : val })),
  minorConsentAuthorityVerified: false,
  setMinorConsentAuthorityVerified: (val) => set((state) => ({ minorConsentAuthorityVerified: typeof val === 'function' ? (val as any)(state.minorConsentAuthorityVerified) : val })),
  minorConsentExplained: false,
  setMinorConsentExplained: (val) => set((state) => ({ minorConsentExplained: typeof val === 'function' ? (val as any)(state.minorConsentExplained) : val })),
  minorConsentStored: false,
  setMinorConsentStored: (val) => set((state) => ({ minorConsentStored: typeof val === 'function' ? (val as any)(state.minorConsentStored) : val })),
  minorConsentAgeExplanation: false,
  setMinorConsentAgeExplanation: (val) => set((state) => ({ minorConsentAgeExplanation: typeof val === 'function' ? (val as any)(state.minorConsentAgeExplanation) : val })),
  warrantyServiceOrWorkName: "",
  setWarrantyServiceOrWorkName: (val) => set((state) => ({ warrantyServiceOrWorkName: typeof val === 'function' ? (val as any)(state.warrantyServiceOrWorkName) : val })),
  warrantyCompletedAt: "",
  setWarrantyCompletedAt: (val) => set((state) => ({ warrantyCompletedAt: typeof val === 'function' ? (val as any)(state.warrantyCompletedAt) : val })),
  warrantyTeethOrArea: "",
  setWarrantyTeethOrArea: (val) => set((state) => ({ warrantyTeethOrArea: typeof val === 'function' ? (val as any)(state.warrantyTeethOrArea) : val })),
  warrantyMaterialsOrSystems: "",
  setWarrantyMaterialsOrSystems: (val) => set((state) => ({ warrantyMaterialsOrSystems: typeof val === 'function' ? (val as any)(state.warrantyMaterialsOrSystems) : val })),
  warrantyPeriod: "по локальному гарантийному положению клиники и виду выполненной работы",
  setWarrantyPeriod: (val) => set((state) => ({ warrantyPeriod: typeof val === 'function' ? (val as any)(state.warrantyPeriod) : val })),
  warrantyControlVisitSchedule: "контрольный осмотр по назначению врача; профессиональная гигиена по индивидуальному графику",
  setWarrantyControlVisitSchedule: (val) => set((state) => ({ warrantyControlVisitSchedule: typeof val === 'function' ? (val as any)(state.warrantyControlVisitSchedule) : val })),
  warrantyPatientObligations: "соблюдать рекомендации врача и режим после лечения\nприходить на контрольные визиты в согласованные сроки\nподдерживать домашнюю гигиену и профессиональную гигиену\nне выполнять самостоятельную коррекцию конструкции или реставрации",
  setWarrantyPatientObligations: (val) => set((state) => ({ warrantyPatientObligations: typeof val === 'function' ? (val as any)(state.warrantyPatientObligations) : val })),
  warrantyExcludedRiskFactors: "травма, перегрузка, бруксизм или вредные привычки\nновые заболевания или отказ от рекомендованного лечения\nнарушение графика контрольных визитов\nсамостоятельное вмешательство или лечение в другой клинике без согласования",
  setWarrantyExcludedRiskFactors: (val) => set((state) => ({ warrantyExcludedRiskFactors: typeof val === 'function' ? (val as any)(state.warrantyExcludedRiskFactors) : val })),
  warrantyUrgentContactReasons: "острая боль или нарастающий отек\nподвижность, скол или выпадение конструкции\nкровотечение, температура или аллергическая реакция\nнарушение прикуса или невозможность пользоваться конструкцией",
  setWarrantyUrgentContactReasons: (val) => set((state) => ({ warrantyUrgentContactReasons: typeof val === 'function' ? (val as any)(state.warrantyUrgentContactReasons) : val })),
  warrantyLinkedActOrContract: "",
  setWarrantyLinkedActOrContract: (val) => set((state) => ({ warrantyLinkedActOrContract: typeof val === 'function' ? (val as any)(state.warrantyLinkedActOrContract) : val })),
  warrantyDoctorFullName: "",
  setWarrantyDoctorFullName: (val) => set((state) => ({ warrantyDoctorFullName: typeof val === 'function' ? (val as any)(state.warrantyDoctorFullName) : val })),
  warrantyIssuedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setWarrantyIssuedAt: (val) => set((state) => ({ warrantyIssuedAt: typeof val === 'function' ? (val as any)(state.warrantyIssuedAt) : val })),
  warrantyPolicyApplied: false,
  setWarrantyPolicyApplied: (val) => set((state) => ({ warrantyPolicyApplied: typeof val === 'function' ? (val as any)(state.warrantyPolicyApplied) : val })),
  warrantyAftercareReceived: false,
  setWarrantyAftercareReceived: (val) => set((state) => ({ warrantyAftercareReceived: typeof val === 'function' ? (val as any)(state.warrantyAftercareReceived) : val })),
  warrantyControlVisitsUnderstood: false,
  setWarrantyControlVisitsUnderstood: (val) => set((state) => ({ warrantyControlVisitsUnderstood: typeof val === 'function' ? (val as any)(state.warrantyControlVisitsUnderstood) : val })),
  clinicalToothRowsText: defaultClinicalToothRowsText,
  setClinicalToothRowsText: (val) => set((state) => ({ clinicalToothRowsText: typeof val === 'function' ? (val as any)(state.clinicalToothRowsText) : val })),
  treatmentPlanClinicalReason: "",
  setTreatmentPlanClinicalReason: (val) => set((state) => ({ treatmentPlanClinicalReason: typeof val === 'function' ? (val as any)(state.treatmentPlanClinicalReason) : val })),
  treatmentPlanDiagnosisSummary: "",
  setTreatmentPlanDiagnosisSummary: (val) => set((state) => ({ treatmentPlanDiagnosisSummary: typeof val === 'function' ? (val as any)(state.treatmentPlanDiagnosisSummary) : val })),
  treatmentPlanTeethOrArea: "",
  setTreatmentPlanTeethOrArea: (val) => set((state) => ({ treatmentPlanTeethOrArea: typeof val === 'function' ? (val as any)(state.treatmentPlanTeethOrArea) : val })),
  treatmentPlanGoals: "устранить жалобы пациента\nвосстановить функцию и герметичность\nснизить риск осложнений и повторного обращения",
  setTreatmentPlanGoals: (val) => set((state) => ({ treatmentPlanGoals: typeof val === 'function' ? (val as any)(state.treatmentPlanGoals) : val })),
  treatmentPlanStages: "Диагностика и подготовка | осмотр, снимки, фото-протокол, согласование объема | до начала лечения | уточнить диагноз и ограничения | 0\nОсновной этап | услуги по выбранному плану лечения | по расписанию клиники | объем корректируется по клинической ситуации | 0\nКонтроль | контрольный осмотр и рекомендации | после завершения этапа | оценка результата и гигиены | 0",
  setTreatmentPlanStages: (val) => set((state) => ({ treatmentPlanStages: typeof val === 'function' ? (val as any)(state.treatmentPlanStages) : val })),
  treatmentPlanEstimatedTotalRub: "",
  setTreatmentPlanEstimatedTotalRub: (val) => set((state) => ({ treatmentPlanEstimatedTotalRub: typeof val === 'function' ? (val as any)(state.treatmentPlanEstimatedTotalRub) : val })),
  treatmentPlanAlternatives: "наблюдение без активного лечения\nальтернативный материал или метод лечения\nпоэтапное лечение с переносом части работ\nполучение второго мнения\nотказ от лечения с фиксацией рисков",
  setTreatmentPlanAlternatives: (val) => set((state) => ({ treatmentPlanAlternatives: typeof val === 'function' ? (val as any)(state.treatmentPlanAlternatives) : val })),
  treatmentPlanRisks: "изменение плана при новых клинических данных или снимках\nнеобходимость дополнительного визита, консультации или смежного специалиста\nизменение стоимости при изменении объема, материалов или сроков\nограниченный прогноз при исходном состоянии зубов и тканей",
  setTreatmentPlanRisks: (val) => set((state) => ({ treatmentPlanRisks: typeof val === 'function' ? (val as any)(state.treatmentPlanRisks) : val })),
  treatmentPlanPrognosis: "прогноз зависит от исходного состояния зубов, тканей, гигиены, выполнения рекомендаций и явки на контрольные визиты",
  setTreatmentPlanPrognosis: (val) => set((state) => ({ treatmentPlanPrognosis: typeof val === 'function' ? (val as any)(state.treatmentPlanPrognosis) : val })),
  treatmentPlanControlPlan: "контрольный осмотр после завершения этапа и далее по индивидуальному графику",
  setTreatmentPlanControlPlan: (val) => set((state) => ({ treatmentPlanControlPlan: typeof val === 'function' ? (val as any)(state.treatmentPlanControlPlan) : val })),
  treatmentPlanDoctorFullName: "",
  setTreatmentPlanDoctorFullName: (val) => set((state) => ({ treatmentPlanDoctorFullName: typeof val === 'function' ? (val as any)(state.treatmentPlanDoctorFullName) : val })),
  treatmentPlanPlannedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setTreatmentPlanPlannedAt: (val) => set((state) => ({ treatmentPlanPlannedAt: typeof val === 'function' ? (val as any)(state.treatmentPlanPlannedAt) : val })),
  treatmentPlanQuestionsAnswered: false,
  setTreatmentPlanQuestionsAnswered: (val) => set((state) => ({ treatmentPlanQuestionsAnswered: typeof val === 'function' ? (val as any)(state.treatmentPlanQuestionsAnswered) : val })),
  treatmentPlanSeparateConsentAcknowledged: false,
  setTreatmentPlanSeparateConsentAcknowledged: (val) => set((state) => ({ treatmentPlanSeparateConsentAcknowledged: typeof val === 'function' ? (val as any)(state.treatmentPlanSeparateConsentAcknowledged) : val })),
  treatmentPlanNewApprovalAcknowledged: false,
  setTreatmentPlanNewApprovalAcknowledged: (val) => set((state) => ({ treatmentPlanNewApprovalAcknowledged: typeof val === 'function' ? (val as any)(state.treatmentPlanNewApprovalAcknowledged) : val })),
  treatmentAcceptanceVariant: "standard",
  setTreatmentAcceptanceVariant: (val) => set((state) => ({ treatmentAcceptanceVariant: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceVariant) : val })),
  treatmentAcceptanceClinicalGoal: "санация, восстановление функции и профилактика осложнений",
  setTreatmentAcceptanceClinicalGoal: (val) => set((state) => ({ treatmentAcceptanceClinicalGoal: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceClinicalGoal) : val })),
  treatmentAcceptanceDiagnosisSummary: "",
  setTreatmentAcceptanceDiagnosisSummary: (val) => set((state) => ({ treatmentAcceptanceDiagnosisSummary: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceDiagnosisSummary) : val })),
  treatmentAcceptanceTeethOrArea: "",
  setTreatmentAcceptanceTeethOrArea: (val) => set((state) => ({ treatmentAcceptanceTeethOrArea: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceTeethOrArea) : val })),
  treatmentAcceptanceStages: "Диагностика и подготовка | осмотр, снимки, фотопротокол, согласование объема | до начала лечения | 0\nОсновной этап лечения | услуги по выбранному плану лечения | по расписанию клиники | 0\nКонтроль | контрольный осмотр и рекомендации | после завершения этапа | 0",
  setTreatmentAcceptanceStages: (val) => set((state) => ({ treatmentAcceptanceStages: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceStages) : val })),
  treatmentAcceptanceEstimatedTotalRub: "",
  setTreatmentAcceptanceEstimatedTotalRub: (val) => set((state) => ({ treatmentAcceptanceEstimatedTotalRub: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceEstimatedTotalRub) : val })),
  treatmentAcceptanceEstimateValidUntil: "",
  setTreatmentAcceptanceEstimateValidUntil: (val) => set((state) => ({ treatmentAcceptanceEstimateValidUntil: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceEstimateValidUntil) : val })),
  treatmentAcceptancePaymentTerms: "оплата по кассовому чеку до или в день оказания услуг; рассрочка или кредит оформляются отдельным соглашением",
  setTreatmentAcceptancePaymentTerms: (val) => set((state) => ({ treatmentAcceptancePaymentTerms: typeof val === 'function' ? (val as any)(state.treatmentAcceptancePaymentTerms) : val })),
  treatmentAcceptanceRejectedAlternatives: "наблюдение без активного лечения\nперенос лечения\nальтернативный материал или конструкция\nполучение второго мнения",
  setTreatmentAcceptanceRejectedAlternatives: (val) => set((state) => ({ treatmentAcceptanceRejectedAlternatives: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceRejectedAlternatives) : val })),
  treatmentAcceptanceRisks: "изменение плана при новых клинических данных или снимках\nизменение стоимости при изменении объема, материалов или сроков\nнеобходимость дополнительных визитов, коррекции или смежного специалиста\nограниченный прогноз при исходном состоянии зубов и тканей",
  setTreatmentAcceptanceRisks: (val) => set((state) => ({ treatmentAcceptanceRisks: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceRisks) : val })),
  treatmentAcceptanceWarrantyTerms: "контрольные визиты обязательны; гарантийные условия действуют в пределах выбранного плана, соблюдения рекомендаций, гигиены и сроков контрольных посещений",
  setTreatmentAcceptanceWarrantyTerms: (val) => set((state) => ({ treatmentAcceptanceWarrantyTerms: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceWarrantyTerms) : val })),
  treatmentAcceptanceDoctorFullName: "",
  setTreatmentAcceptanceDoctorFullName: (val) => set((state) => ({ treatmentAcceptanceDoctorFullName: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceDoctorFullName) : val })),
  treatmentAcceptanceAcceptedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setTreatmentAcceptanceAcceptedAt: (val) => set((state) => ({ treatmentAcceptanceAcceptedAt: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceAcceptedAt) : val })),
  treatmentAcceptanceQuestionsAnswered: false,
  setTreatmentAcceptanceQuestionsAnswered: (val) => set((state) => ({ treatmentAcceptanceQuestionsAnswered: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceQuestionsAnswered) : val })),
  treatmentAcceptanceAlternativesUnderstood: false,
  setTreatmentAcceptanceAlternativesUnderstood: (val) => set((state) => ({ treatmentAcceptanceAlternativesUnderstood: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceAlternativesUnderstood) : val })),
  treatmentAcceptanceCostChangeUnderstood: false,
  setTreatmentAcceptanceCostChangeUnderstood: (val) => set((state) => ({ treatmentAcceptanceCostChangeUnderstood: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceCostChangeUnderstood) : val })),
  treatmentAcceptanceRevisionAcknowledged: false,
  setTreatmentAcceptanceRevisionAcknowledged: (val) => set((state) => ({ treatmentAcceptanceRevisionAcknowledged: typeof val === 'function' ? (val as any)(state.treatmentAcceptanceRevisionAcknowledged) : val })),
  postVisitCareTopic: initialUiPreferences.postVisitCareTopic,
  setPostVisitCareTopic: (val) => set((state) => ({ postVisitCareTopic: typeof val === 'function' ? (val as any)(state.postVisitCareTopic) : val })),
  postVisitProcedureName: postVisitCarePresets.filling_restoration.procedureName,
  setPostVisitProcedureName: (val) => set((state) => ({ postVisitProcedureName: typeof val === 'function' ? (val as any)(state.postVisitProcedureName) : val })),
  postVisitToothOrArea: "",
  setPostVisitToothOrArea: (val) => set((state) => ({ postVisitToothOrArea: typeof val === 'function' ? (val as any)(state.postVisitToothOrArea) : val })),
  postVisitPerformedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setPostVisitPerformedAt: (val) => set((state) => ({ postVisitPerformedAt: typeof val === 'function' ? (val as any)(state.postVisitPerformedAt) : val })),
  postVisitDoctorFullName: "",
  setPostVisitDoctorFullName: (val) => set((state) => ({ postVisitDoctorFullName: typeof val === 'function' ? (val as any)(state.postVisitDoctorFullName) : val })),
  postVisitManualEdited: false,
  setPostVisitManualEdited: (val) => set((state) => ({ postVisitManualEdited: typeof val === 'function' ? (val as any)(state.postVisitManualEdited) : val })),
  postVisitPresetFeedback: "",
  setPostVisitPresetFeedback: (val) => set((state) => ({ postVisitPresetFeedback: typeof val === 'function' ? (val as any)(state.postVisitPresetFeedback) : val })),
  postVisitAllowedAfter: postVisitCarePresets.filling_restoration.allowedAfter,
  setPostVisitAllowedAfter: (val) => set((state) => ({ postVisitAllowedAfter: typeof val === 'function' ? (val as any)(state.postVisitAllowedAfter) : val })),
  postVisitRestrictions: postVisitCarePresets.filling_restoration.temporaryRestrictions,
  setPostVisitRestrictions: (val) => set((state) => ({ postVisitRestrictions: typeof val === 'function' ? (val as any)(state.postVisitRestrictions) : val })),
  postVisitMedicationAndRinsePlan: postVisitCarePresets.filling_restoration.medicationAndRinsePlan,
  setPostVisitMedicationAndRinsePlan: (val) => set((state) => ({ postVisitMedicationAndRinsePlan: typeof val === 'function' ? (val as any)(state.postVisitMedicationAndRinsePlan) : val })),
  postVisitHygieneInstructions: postVisitCarePresets.filling_restoration.hygieneInstructions,
  setPostVisitHygieneInstructions: (val) => set((state) => ({ postVisitHygieneInstructions: typeof val === 'function' ? (val as any)(state.postVisitHygieneInstructions) : val })),
  postVisitNutritionInstructions: postVisitCarePresets.filling_restoration.nutritionInstructions,
  setPostVisitNutritionInstructions: (val) => set((state) => ({ postVisitNutritionInstructions: typeof val === 'function' ? (val as any)(state.postVisitNutritionInstructions) : val })),
  postVisitUrgentWarningSigns: postVisitCarePresets.filling_restoration.urgentWarningSigns,
  setPostVisitUrgentWarningSigns: (val) => set((state) => ({ postVisitUrgentWarningSigns: typeof val === 'function' ? (val as any)(state.postVisitUrgentWarningSigns) : val })),
  postVisitFollowUpAt: postVisitCarePresets.filling_restoration.plannedFollowUpAt,
  setPostVisitFollowUpAt: (val) => set((state) => ({ postVisitFollowUpAt: typeof val === 'function' ? (val as any)(state.postVisitFollowUpAt) : val })),
  postVisitClinicContactInstruction: "связаться с клиникой по телефону или через Telegram-бот клиники",
  setPostVisitClinicContactInstruction: (val) => set((state) => ({ postVisitClinicContactInstruction: typeof val === 'function' ? (val as any)(state.postVisitClinicContactInstruction) : val })),
  postVisitTelegramSummary: postVisitCarePresets.filling_restoration.telegramSummary,
  setPostVisitTelegramSummary: (val) => set((state) => ({ postVisitTelegramSummary: typeof val === 'function' ? (val as any)(state.postVisitTelegramSummary) : val })),
  postVisitPrintedCopyReceived: false,
  setPostVisitPrintedCopyReceived: (val) => set((state) => ({ postVisitPrintedCopyReceived: typeof val === 'function' ? (val as any)(state.postVisitPrintedCopyReceived) : val })),
  postVisitUrgentSignsUnderstood: false,
  setPostVisitUrgentSignsUnderstood: (val) => set((state) => ({ postVisitUrgentSignsUnderstood: typeof val === 'function' ? (val as any)(state.postVisitUrgentSignsUnderstood) : val })),
  postVisitTelegramSafe: false,
  setPostVisitTelegramSafe: (val) => set((state) => ({ postVisitTelegramSafe: typeof val === 'function' ? (val as any)(state.postVisitTelegramSafe) : val })),
  anesthesiaMethod: "Инфильтрационная / проводниковая",
  setAnesthesiaMethod: (val) => set((state) => ({ anesthesiaMethod: typeof val === 'function' ? (val as any)(state.anesthesiaMethod) : val })),
  anesthesiaAnesthetic: "Артикаин 4%",
  setAnesthesiaAnesthetic: (val) => set((state) => ({ anesthesiaAnesthetic: typeof val === 'function' ? (val as any)(state.anesthesiaAnesthetic) : val })),
  anesthesiaVasoconstrictor: "1:100000",
  setAnesthesiaVasoconstrictor: (val) => set((state) => ({ anesthesiaVasoconstrictor: typeof val === 'function' ? (val as any)(state.anesthesiaVasoconstrictor) : val })),
  anesthesiaZone: "",
  setAnesthesiaZone: (val) => set((state) => ({ anesthesiaZone: typeof val === 'function' ? (val as any)(state.anesthesiaZone) : val })),
  anesthesiaAllergyStatus: "Аллергия на местные анестетики со слов пациента не отмечена.",
  setAnesthesiaAllergyStatus: (val) => set((state) => ({ anesthesiaAllergyStatus: typeof val === 'function' ? (val as any)(state.anesthesiaAllergyStatus) : val })),
  anesthesiaRestrictionNotes: "",
  setAnesthesiaRestrictionNotes: (val) => set((state) => ({ anesthesiaRestrictionNotes: typeof val === 'function' ? (val as any)(state.anesthesiaRestrictionNotes) : val })),
  anesthesiaDoseTime: (() =>
    new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }))(),
  setAnesthesiaDoseTime: (val) => set((state) => ({ anesthesiaDoseTime: typeof val === 'function' ? (val as any)(state.anesthesiaDoseTime) : val })),
  anesthesiaDoseMl: "1.7",
  setAnesthesiaDoseMl: (val) => set((state) => ({ anesthesiaDoseMl: typeof val === 'function' ? (val as any)(state.anesthesiaDoseMl) : val })),
  anesthesiaReaction: "Без особенностей",
  setAnesthesiaReaction: (val) => set((state) => ({ anesthesiaReaction: typeof val === 'function' ? (val as any)(state.anesthesiaReaction) : val })),
  anesthesiaRisksExplained: false,
  setAnesthesiaRisksExplained: (val) => set((state) => ({ anesthesiaRisksExplained: typeof val === 'function' ? (val as any)(state.anesthesiaRisksExplained) : val })),
  anesthesiaAllergyRestrictionsChecked: false,
  setAnesthesiaAllergyRestrictionsChecked: (val) => set((state) => ({ anesthesiaAllergyRestrictionsChecked: typeof val === 'function' ? (val as any)(state.anesthesiaAllergyRestrictionsChecked) : val })),
  anesthesiaConsentConfirmed: false,
  setAnesthesiaConsentConfirmed: (val) => set((state) => ({ anesthesiaConsentConfirmed: typeof val === 'function' ? (val as any)(state.anesthesiaConsentConfirmed) : val })),
  prescriptionMedication: "",
  setPrescriptionMedication: (val) => set((state) => ({ prescriptionMedication: typeof val === 'function' ? (val as any)(state.prescriptionMedication) : val })),
  prescriptionDosage: "",
  setPrescriptionDosage: (val) => set((state) => ({ prescriptionDosage: typeof val === 'function' ? (val as any)(state.prescriptionDosage) : val })),
  prescriptionInstructions: "",
  setPrescriptionInstructions: (val) => set((state) => ({ prescriptionInstructions: typeof val === 'function' ? (val as any)(state.prescriptionInstructions) : val })),
  prescriptionDuration: "",
  setPrescriptionDuration: (val) => set((state) => ({ prescriptionDuration: typeof val === 'function' ? (val as any)(state.prescriptionDuration) : val })),
  prescriptionSafetyNotes: "Проверить аллергоанамнез до выдачи.\nОбъяснить режим приема, ограничения и действия при нежелательной реакции.",
  setPrescriptionSafetyNotes: (val) => set((state) => ({ prescriptionSafetyNotes: typeof val === 'function' ? (val as any)(state.prescriptionSafetyNotes) : val })),
  prescriptionUrgentContactReason: "Связаться с клиникой при отеке, сыпи, нарастающей боли, кровотечении или температуре.",
  setPrescriptionUrgentContactReason: (val) => set((state) => ({ prescriptionUrgentContactReason: typeof val === 'function' ? (val as any)(state.prescriptionUrgentContactReason) : val })),
  labWorkType: "",
  setLabWorkType: (val) => set((state) => ({ labWorkType: typeof val === 'function' ? (val as any)(state.labWorkType) : val })),
  labTeethOrArea: "",
  setLabTeethOrArea: (val) => set((state) => ({ labTeethOrArea: typeof val === 'function' ? (val as any)(state.labTeethOrArea) : val })),
  labMaterial: "",
  setLabMaterial: (val) => set((state) => ({ labMaterial: typeof val === 'function' ? (val as any)(state.labMaterial) : val })),
  labShade: "",
  setLabShade: (val) => set((state) => ({ labShade: typeof val === 'function' ? (val as any)(state.labShade) : val })),
  labSource: "",
  setLabSource: (val) => set((state) => ({ labSource: typeof val === 'function' ? (val as any)(state.labSource) : val })),
  labDeadline: "",
  setLabDeadline: (val) => set((state) => ({ labDeadline: typeof val === 'function' ? (val as any)(state.labDeadline) : val })),
  labTechnicianNotes: "",
  setLabTechnicianNotes: (val) => set((state) => ({ labTechnicianNotes: typeof val === 'function' ? (val as any)(state.labTechnicianNotes) : val })),
  photoVideoLabTransferAllowed: true,
  setPhotoVideoLabTransferAllowed: (val) => set((state) => ({ photoVideoLabTransferAllowed: typeof val === 'function' ? (val as any)(state.photoVideoLabTransferAllowed) : val })),
  photoVideoColleagueConsultationAllowed: true,
  setPhotoVideoColleagueConsultationAllowed: (val) => set((state) => ({ photoVideoColleagueConsultationAllowed: typeof val === 'function' ? (val as any)(state.photoVideoColleagueConsultationAllowed) : val })),
  photoVideoEducationUseAllowed: false,
  setPhotoVideoEducationUseAllowed: (val) => set((state) => ({ photoVideoEducationUseAllowed: typeof val === 'function' ? (val as any)(state.photoVideoEducationUseAllowed) : val })),
  photoVideoMarketingUseAllowed: false,
  setPhotoVideoMarketingUseAllowed: (val) => set((state) => ({ photoVideoMarketingUseAllowed: typeof val === 'function' ? (val as any)(state.photoVideoMarketingUseAllowed) : val })),
  photoVideoRecognizablePublicationAllowed: false,
  setPhotoVideoRecognizablePublicationAllowed: (val) => set((state) => ({ photoVideoRecognizablePublicationAllowed: typeof val === 'function' ? (val as any)(state.photoVideoRecognizablePublicationAllowed) : val })),
  photoVideoClinicalRecordUseConfirmed: false,
  setPhotoVideoClinicalRecordUseConfirmed: (val) => set((state) => ({ photoVideoClinicalRecordUseConfirmed: typeof val === 'function' ? (val as any)(state.photoVideoClinicalRecordUseConfirmed) : val })),
  photoVideoAnonymizationConfirmed: false,
  setPhotoVideoAnonymizationConfirmed: (val) => set((state) => ({ photoVideoAnonymizationConfirmed: typeof val === 'function' ? (val as any)(state.photoVideoAnonymizationConfirmed) : val })),
  photoVideoMaterials: [
    "intraoral_photo",
    "xray",
    "scan"
  ],
  setPhotoVideoMaterials: (val) => set((state) => ({ photoVideoMaterials: typeof val === 'function' ? (val as any)(state.photoVideoMaterials) : val })),
  photoVideoRevocationChannel: "письменное заявление в клинике или защищенное обращение через портал пациента",
  setPhotoVideoRevocationChannel: (val) => set((state) => ({ photoVideoRevocationChannel: typeof val === 'function' ? (val as any)(state.photoVideoRevocationChannel) : val })),
  photoVideoScopeNotes: "",
  setPhotoVideoScopeNotes: (val) => set((state) => ({ photoVideoScopeNotes: typeof val === 'function' ? (val as any)(state.photoVideoScopeNotes) : val })),
  xrayStudyType: "cbct",
  setXrayStudyType: (val) => set((state) => ({ xrayStudyType: typeof val === 'function' ? (val as any)(state.xrayStudyType) : val })),
  xrayArea: "",
  setXrayArea: (val) => set((state) => ({ xrayArea: typeof val === 'function' ? (val as any)(state.xrayArea) : val })),
  xrayClinicalQuestion: "",
  setXrayClinicalQuestion: (val) => set((state) => ({ xrayClinicalQuestion: typeof val === 'function' ? (val as any)(state.xrayClinicalQuestion) : val })),
  xrayIndication: "",
  setXrayIndication: (val) => set((state) => ({ xrayIndication: typeof val === 'function' ? (val as any)(state.xrayIndication) : val })),
  xrayPregnancyStatus: "unknown",
  setXrayPregnancyStatus: (val) => set((state) => ({ xrayPregnancyStatus: typeof val === 'function' ? (val as any)(state.xrayPregnancyStatus) : val })),
  xraySafetyNotes: "Перед исследованием уточнить беременность, ограничения и необходимость средств защиты.",
  setXraySafetyNotes: (val) => set((state) => ({ xraySafetyNotes: typeof val === 'function' ? (val as any)(state.xraySafetyNotes) : val })),
  xrayPriority: "routine",
  setXrayPriority: (val) => set((state) => ({ xrayPriority: typeof val === 'function' ? (val as any)(state.xrayPriority) : val })),
  xrayIncludeDicomExport: true,
  setXrayIncludeDicomExport: (val) => set((state) => ({ xrayIncludeDicomExport: typeof val === 'function' ? (val as any)(state.xrayIncludeDicomExport) : val })),
  xrayIncludeRadiologistReport: true,
  setXrayIncludeRadiologistReport: (val) => set((state) => ({ xrayIncludeRadiologistReport: typeof val === 'function' ? (val as any)(state.xrayIncludeRadiologistReport) : val })),
  xrayRequestedBy: "",
  setXrayRequestedBy: (val) => set((state) => ({ xrayRequestedBy: typeof val === 'function' ? (val as any)(state.xrayRequestedBy) : val })),
  xrayRecipientClinic: "",
  setXrayRecipientClinic: (val) => set((state) => ({ xrayRecipientClinic: typeof val === 'function' ? (val as any)(state.xrayRecipientClinic) : val })),
  xrayDueDate: "",
  setXrayDueDate: (val) => set((state) => ({ xrayDueDate: typeof val === 'function' ? (val as any)(state.xrayDueDate) : val })),
  recordExtractPeriodStart: (() => new Date().toISOString().slice(0, 10))(),
  setRecordExtractPeriodStart: (val) => set((state) => ({ recordExtractPeriodStart: typeof val === 'function' ? (val as any)(state.recordExtractPeriodStart) : val })),
  recordExtractPeriodEnd: (() => new Date().toISOString().slice(0, 10))(),
  setRecordExtractPeriodEnd: (val) => set((state) => ({ recordExtractPeriodEnd: typeof val === 'function' ? (val as any)(state.recordExtractPeriodEnd) : val })),
  recordExtractSourceVisitIds: "",
  setRecordExtractSourceVisitIds: (val) => set((state) => ({ recordExtractSourceVisitIds: typeof val === 'function' ? (val as any)(state.recordExtractSourceVisitIds) : val })),
  recordExtractComplaintAndAnamnesis: "",
  setRecordExtractComplaintAndAnamnesis: (val) => set((state) => ({ recordExtractComplaintAndAnamnesis: typeof val === 'function' ? (val as any)(state.recordExtractComplaintAndAnamnesis) : val })),
  recordExtractObjectiveStatus: "",
  setRecordExtractObjectiveStatus: (val) => set((state) => ({ recordExtractObjectiveStatus: typeof val === 'function' ? (val as any)(state.recordExtractObjectiveStatus) : val })),
  recordExtractDiagnosis: "",
  setRecordExtractDiagnosis: (val) => set((state) => ({ recordExtractDiagnosis: typeof val === 'function' ? (val as any)(state.recordExtractDiagnosis) : val })),
  recordExtractTreatmentProvided: "",
  setRecordExtractTreatmentProvided: (val) => set((state) => ({ recordExtractTreatmentProvided: typeof val === 'function' ? (val as any)(state.recordExtractTreatmentProvided) : val })),
  recordExtractRecommendations: "",
  setRecordExtractRecommendations: (val) => set((state) => ({ recordExtractRecommendations: typeof val === 'function' ? (val as any)(state.recordExtractRecommendations) : val })),
  recordExtractDoctorFullName: "",
  setRecordExtractDoctorFullName: (val) => set((state) => ({ recordExtractDoctorFullName: typeof val === 'function' ? (val as any)(state.recordExtractDoctorFullName) : val })),
  recordExtractRecipientFullName: "",
  setRecordExtractRecipientFullName: (val) => set((state) => ({ recordExtractRecipientFullName: typeof val === 'function' ? (val as any)(state.recordExtractRecipientFullName) : val })),
  recordExtractRecipientAuthority: "пациент лично",
  setRecordExtractRecipientAuthority: (val) => set((state) => ({ recordExtractRecipientAuthority: typeof val === 'function' ? (val as any)(state.recordExtractRecipientAuthority) : val })),
  recordExtractIssuedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setRecordExtractIssuedAt: (val) => set((state) => ({ recordExtractIssuedAt: typeof val === 'function' ? (val as any)(state.recordExtractIssuedAt) : val })),
  recordExtractPreparedFromSignedRecords: false,
  setRecordExtractPreparedFromSignedRecords: (val) => set((state) => ({ recordExtractPreparedFromSignedRecords: typeof val === 'function' ? (val as any)(state.recordExtractPreparedFromSignedRecords) : val })),
  recordExtractThirdPartyDataChecked: false,
  setRecordExtractThirdPartyDataChecked: (val) => set((state) => ({ recordExtractThirdPartyDataChecked: typeof val === 'function' ? (val as any)(state.recordExtractThirdPartyDataChecked) : val })),
  outpatient025uMedicalCardNumber: "",
  setOutpatient025uMedicalCardNumber: (val) => set((state) => ({ outpatient025uMedicalCardNumber: typeof val === 'function' ? (val as any)(state.outpatient025uMedicalCardNumber) : val })),
  outpatient025uOpenedAt: (() => new Date().toISOString().slice(0, 10))(),
  setOutpatient025uOpenedAt: (val) => set((state) => ({ outpatient025uOpenedAt: typeof val === 'function' ? (val as any)(state.outpatient025uOpenedAt) : val })),
  outpatient025uPatientSexCode: "unknown",
  setOutpatient025uPatientSexCode: (val) => set((state) => ({ outpatient025uPatientSexCode: typeof val === 'function' ? (val as any)(state.outpatient025uPatientSexCode) : val })),
  outpatient025uCitizenship: "",
  setOutpatient025uCitizenship: (val) => set((state) => ({ outpatient025uCitizenship: typeof val === 'function' ? (val as any)(state.outpatient025uCitizenship) : val })),
  outpatient025uRegistrationUrbanRuralCode: "unknown",
  setOutpatient025uRegistrationUrbanRuralCode: (val) => set((state) => ({ outpatient025uRegistrationUrbanRuralCode: typeof val === 'function' ? (val as any)(state.outpatient025uRegistrationUrbanRuralCode) : val })),
  outpatient025uStayUrbanRuralCode: "unknown",
  setOutpatient025uStayUrbanRuralCode: (val) => set((state) => ({ outpatient025uStayUrbanRuralCode: typeof val === 'function' ? (val as any)(state.outpatient025uStayUrbanRuralCode) : val })),
  outpatient025uOmsIssuedAt: "",
  setOutpatient025uOmsIssuedAt: (val) => set((state) => ({ outpatient025uOmsIssuedAt: typeof val === 'function' ? (val as any)(state.outpatient025uOmsIssuedAt) : val })),
  outpatient025uInsurerName: "",
  setOutpatient025uInsurerName: (val) => set((state) => ({ outpatient025uInsurerName: typeof val === 'function' ? (val as any)(state.outpatient025uInsurerName) : val })),
  outpatient025uSocialSupportCode: "",
  setOutpatient025uSocialSupportCode: (val) => set((state) => ({ outpatient025uSocialSupportCode: typeof val === 'function' ? (val as any)(state.outpatient025uSocialSupportCode) : val })),
  outpatient025uHealthStatusDisclosureContact: "",
  setOutpatient025uHealthStatusDisclosureContact: (val) => set((state) => ({ outpatient025uHealthStatusDisclosureContact: typeof val === 'function' ? (val as any)(state.outpatient025uHealthStatusDisclosureContact) : val })),

  outpatient025uEmploymentCode: "",
  setOutpatient025uEmploymentCode: (val) => set((state) => ({ outpatient025uEmploymentCode: typeof val === 'function' ? (val as any)(state.outpatient025uEmploymentCode) : val })),
  outpatient025uDisabilityGroup: "",
  setOutpatient025uDisabilityGroup: (val) => set((state) => ({ outpatient025uDisabilityGroup: typeof val === 'function' ? (val as any)(state.outpatient025uDisabilityGroup) : val })),
  outpatient025uWorkOrStudyPlace: "",
  setOutpatient025uWorkOrStudyPlace: (val) => set((state) => ({ outpatient025uWorkOrStudyPlace: typeof val === 'function' ? (val as any)(state.outpatient025uWorkOrStudyPlace) : val })),
  outpatient025uPalliativeCareNeedCode: "",
  setOutpatient025uPalliativeCareNeedCode: (val) => set((state) => ({ outpatient025uPalliativeCareNeedCode: typeof val === 'function' ? (val as any)(state.outpatient025uPalliativeCareNeedCode) : val })),
  outpatient025uBloodGroup: "",
  setOutpatient025uBloodGroup: (val) => set((state) => ({ outpatient025uBloodGroup: typeof val === 'function' ? (val as any)(state.outpatient025uBloodGroup) : val })),
  outpatient025uRhFactor: "",
  setOutpatient025uRhFactor: (val) => set((state) => ({ outpatient025uRhFactor: typeof val === 'function' ? (val as any)(state.outpatient025uRhFactor) : val })),
  outpatient025uKellK1: "",
  setOutpatient025uKellK1: (val) => set((state) => ({ outpatient025uKellK1: typeof val === 'function' ? (val as any)(state.outpatient025uKellK1) : val })),
  outpatient025uOtherBloodData: "",
  setOutpatient025uOtherBloodData: (val) => set((state) => ({ outpatient025uOtherBloodData: typeof val === 'function' ? (val as any)(state.outpatient025uOtherBloodData) : val })),
  outpatient025uAllergyHistory: "",
  setOutpatient025uAllergyHistory: (val) => set((state) => ({ outpatient025uAllergyHistory: typeof val === 'function' ? (val as any)(state.outpatient025uAllergyHistory) : val })),
  outpatient025uFinalEpicrisis: "",
  setOutpatient025uFinalEpicrisis: (val) => set((state) => ({ outpatient025uFinalEpicrisis: typeof val === 'function' ? (val as any)(state.outpatient025uFinalEpicrisis) : val })),
  outpatient025uOfficialForm274nChecked: false,
  setOutpatient025uOfficialForm274nChecked: (val) => set((state) => ({ outpatient025uOfficialForm274nChecked: typeof val === 'function' ? (val as any)(state.outpatient025uOfficialForm274nChecked) : val })),
  outpatient025uThirdPartyDataChecked: false,
  setOutpatient025uThirdPartyDataChecked: (val) => set((state) => ({ outpatient025uThirdPartyDataChecked: typeof val === 'function' ? (val as any)(state.outpatient025uThirdPartyDataChecked) : val })),
  copyRequestDocumentTypes: "Выписка из медицинской карты\nКопия снимков или КТ-архив",
  setCopyRequestDocumentTypes: (val) => set((state) => ({ copyRequestDocumentTypes: typeof val === 'function' ? (val as any)(state.copyRequestDocumentTypes) : val })),
  copyRequestPeriodStart: "",
  setCopyRequestPeriodStart: (val) => set((state) => ({ copyRequestPeriodStart: typeof val === 'function' ? (val as any)(state.copyRequestPeriodStart) : val })),
  copyRequestPeriodEnd: "",
  setCopyRequestPeriodEnd: (val) => set((state) => ({ copyRequestPeriodEnd: typeof val === 'function' ? (val as any)(state.copyRequestPeriodEnd) : val })),
  copyRequestFormat: "pdf",
  setCopyRequestFormat: (val) => set((state) => ({ copyRequestFormat: typeof val === 'function' ? (val as any)(state.copyRequestFormat) : val })),
  copyRequestRecipientFullName: "",
  setCopyRequestRecipientFullName: (val) => set((state) => ({ copyRequestRecipientFullName: typeof val === 'function' ? (val as any)(state.copyRequestRecipientFullName) : val })),
  copyRequestRecipientIdentityDocument: "",
  setCopyRequestRecipientIdentityDocument: (val) => set((state) => ({ copyRequestRecipientIdentityDocument: typeof val === 'function' ? (val as any)(state.copyRequestRecipientIdentityDocument) : val })),
  copyRequestRecipientAuthority: "пациент лично",
  setCopyRequestRecipientAuthority: (val) => set((state) => ({ copyRequestRecipientAuthority: typeof val === 'function' ? (val as any)(state.copyRequestRecipientAuthority) : val })),
  copyRequestRepresentativeAuthorityDocument: "",
  setCopyRequestRepresentativeAuthorityDocument: (val) => set((state) => ({ copyRequestRepresentativeAuthorityDocument: typeof val === 'function' ? (val as any)(state.copyRequestRepresentativeAuthorityDocument) : val })),
  copyRequestRequestedAt: new Date().toLocaleString("ru-RU"),
  setCopyRequestRequestedAt: (val) => set((state) => ({ copyRequestRequestedAt: typeof val === 'function' ? (val as any)(state.copyRequestRequestedAt) : val })),
  copyRequestContactForDelivery: "",
  setCopyRequestContactForDelivery: (val) => set((state) => ({ copyRequestContactForDelivery: typeof val === 'function' ? (val as any)(state.copyRequestContactForDelivery) : val })),
  copyRequestSpecialInstructions: "",
  setCopyRequestSpecialInstructions: (val) => set((state) => ({ copyRequestSpecialInstructions: typeof val === 'function' ? (val as any)(state.copyRequestSpecialInstructions) : val })),
  copyRequestIncludeDicomSourceData: true,
  setCopyRequestIncludeDicomSourceData: (val) => set((state) => ({ copyRequestIncludeDicomSourceData: typeof val === 'function' ? (val as any)(state.copyRequestIncludeDicomSourceData) : val })),
  copyRequestIdentityVerified: false,
  setCopyRequestIdentityVerified: (val) => set((state) => ({ copyRequestIdentityVerified: typeof val === 'function' ? (val as any)(state.copyRequestIdentityVerified) : val })),
  copyRequestThirdPartyDataChecked: false,
  setCopyRequestThirdPartyDataChecked: (val) => set((state) => ({ copyRequestThirdPartyDataChecked: typeof val === 'function' ? (val as any)(state.copyRequestThirdPartyDataChecked) : val })),
  attendanceStartedAt: "",
  setAttendanceStartedAt: (val) => set((state) => ({ attendanceStartedAt: typeof val === 'function' ? (val as any)(state.attendanceStartedAt) : val })),
  attendanceEndedAt: "",
  setAttendanceEndedAt: (val) => set((state) => ({ attendanceEndedAt: typeof val === 'function' ? (val as any)(state.attendanceEndedAt) : val })),
  attendancePurpose: "для предъявления по месту требования",
  setAttendancePurpose: (val) => set((state) => ({ attendancePurpose: typeof val === 'function' ? (val as any)(state.attendancePurpose) : val })),
  attendanceRecipientOrganization: "",
  setAttendanceRecipientOrganization: (val) => set((state) => ({ attendanceRecipientOrganization: typeof val === 'function' ? (val as any)(state.attendanceRecipientOrganization) : val })),
  attendanceIssuedAt: new Date().toLocaleString("ru-RU"),
  setAttendanceIssuedAt: (val) => set((state) => ({ attendanceIssuedAt: typeof val === 'function' ? (val as any)(state.attendanceIssuedAt) : val })),
  attendanceSignedByFullName: "",
  setAttendanceSignedByFullName: (val) => set((state) => ({ attendanceSignedByFullName: typeof val === 'function' ? (val as any)(state.attendanceSignedByFullName) : val })),
  attendanceSignedByRole: "врач/администратор",
  setAttendanceSignedByRole: (val) => set((state) => ({ attendanceSignedByRole: typeof val === 'function' ? (val as any)(state.attendanceSignedByRole) : val })),
  attendanceDiagnosisDisclosureExcluded: false,
  setAttendanceDiagnosisDisclosureExcluded: (val) => set((state) => ({ attendanceDiagnosisDisclosureExcluded: typeof val === 'function' ? (val as any)(state.attendanceDiagnosisDisclosureExcluded) : val })),
  attendanceNotSickLeaveAcknowledged: false,
  setAttendanceNotSickLeaveAcknowledged: (val) => set((state) => ({ attendanceNotSickLeaveAcknowledged: typeof val === 'function' ? (val as any)(state.attendanceNotSickLeaveAcknowledged) : val })),
  releaseRecipientFullName: "",
  setReleaseRecipientFullName: (val) => set((state) => ({ releaseRecipientFullName: typeof val === 'function' ? (val as any)(state.releaseRecipientFullName) : val })),
  releaseRecipientIdentityDocument: "",
  setReleaseRecipientIdentityDocument: (val) => set((state) => ({ releaseRecipientIdentityDocument: typeof val === 'function' ? (val as any)(state.releaseRecipientIdentityDocument) : val })),
  releaseRecipientAuthority: "пациент лично",
  setReleaseRecipientAuthority: (val) => set((state) => ({ releaseRecipientAuthority: typeof val === 'function' ? (val as any)(state.releaseRecipientAuthority) : val })),
  releaseSourceRequestDocumentId: "",
  setReleaseSourceRequestDocumentId: (val) => set((state) => ({ releaseSourceRequestDocumentId: typeof val === 'function' ? (val as any)(state.releaseSourceRequestDocumentId) : val })),
  releaseChannel: "paper",
  setReleaseChannel: (val) => set((state) => ({ releaseChannel: typeof val === 'function' ? (val as any)(state.releaseChannel) : val })),
  releaseDocumentTypes: "Выписка из медицинской карты\nКопия снимков или КТ-архив",
  setReleaseDocumentTypes: (val) => set((state) => ({ releaseDocumentTypes: typeof val === 'function' ? (val as any)(state.releaseDocumentTypes) : val })),
  releasePeriodStart: "",
  setReleasePeriodStart: (val) => set((state) => ({ releasePeriodStart: typeof val === 'function' ? (val as any)(state.releasePeriodStart) : val })),
  releasePeriodEnd: "",
  setReleasePeriodEnd: (val) => set((state) => ({ releasePeriodEnd: typeof val === 'function' ? (val as any)(state.releasePeriodEnd) : val })),
  releaseDeliveredAt: new Date().toLocaleString("ru-RU"),
  setReleaseDeliveredAt: (val) => set((state) => ({ releaseDeliveredAt: typeof val === 'function' ? (val as any)(state.releaseDeliveredAt) : val })),
  releaseAccessExpiresAt: "",
  setReleaseAccessExpiresAt: (val) => set((state) => ({ releaseAccessExpiresAt: typeof val === 'function' ? (val as any)(state.releaseAccessExpiresAt) : val })),
  releaseThirdPartyDataChecked: false,
  setReleaseThirdPartyDataChecked: (val) => set((state) => ({ releaseThirdPartyDataChecked: typeof val === 'function' ? (val as any)(state.releaseThirdPartyDataChecked) : val })),
  refundAction: "partial_refund",
  setRefundAction: (val) => set((state) => ({ refundAction: typeof val === 'function' ? (val as any)(state.refundAction) : val })),
  refundAmountRub: "3800",
  setRefundAmountRub: (val) => set((state) => ({ refundAmountRub: typeof val === 'function' ? (val as any)(state.refundAmountRub) : val })),
  refundReason: "",
  setRefundReason: (val) => set((state) => ({ refundReason: typeof val === 'function' ? (val as any)(state.refundReason) : val })),
  refundMethod: "card",
  setRefundMethod: (val) => set((state) => ({ refundMethod: typeof val === 'function' ? (val as any)(state.refundMethod) : val })),
  refundRecipientFullName: "",
  setRefundRecipientFullName: (val) => set((state) => ({ refundRecipientFullName: typeof val === 'function' ? (val as any)(state.refundRecipientFullName) : val })),
  refundRecipientIdentityDocument: "",
  setRefundRecipientIdentityDocument: (val) => set((state) => ({ refundRecipientIdentityDocument: typeof val === 'function' ? (val as any)(state.refundRecipientIdentityDocument) : val })),
  refundBankDetails: "",
  setRefundBankDetails: (val) => set((state) => ({ refundBankDetails: typeof val === 'function' ? (val as any)(state.refundBankDetails) : val })),
  refundSelectedPaymentId: "",
  setRefundSelectedPaymentId: (val) => set((state) => ({ refundSelectedPaymentId: typeof val === 'function' ? (val as any)(state.refundSelectedPaymentId) : val })),
  refundOriginalFiscalReceiptNumber: "",
  setRefundOriginalFiscalReceiptNumber: (val) => set((state) => ({ refundOriginalFiscalReceiptNumber: typeof val === 'function' ? (val as any)(state.refundOriginalFiscalReceiptNumber) : val })),
  refundCorrectionFiscalReceiptNumber: "",
  setRefundCorrectionFiscalReceiptNumber: (val) => set((state) => ({ refundCorrectionFiscalReceiptNumber: typeof val === 'function' ? (val as any)(state.refundCorrectionFiscalReceiptNumber) : val })),
  refundAccountantDecision: "",
  setRefundAccountantDecision: (val) => set((state) => ({ refundAccountantDecision: typeof val === 'function' ? (val as any)(state.refundAccountantDecision) : val })),
  personalDataCrossBorderAllowed: false,
  setPersonalDataCrossBorderAllowed: (val) => set((state) => ({ personalDataCrossBorderAllowed: typeof val === 'function' ? (val as any)(state.personalDataCrossBorderAllowed) : val })),
  personalDataAutomatedDecisionAllowed: false,
  setPersonalDataAutomatedDecisionAllowed: (val) => set((state) => ({ personalDataAutomatedDecisionAllowed: typeof val === 'function' ? (val as any)(state.personalDataAutomatedDecisionAllowed) : val })),
  personalDataConsentGivenAt: new Date().toLocaleString("ru-RU"),
  setPersonalDataConsentGivenAt: (val) => set((state) => ({ personalDataConsentGivenAt: typeof val === 'function' ? (val as any)(state.personalDataConsentGivenAt) : val })),
  personalDataVoluntaryConsentConfirmed: false,
  setPersonalDataVoluntaryConsentConfirmed: (val) => set((state) => ({ personalDataVoluntaryConsentConfirmed: typeof val === 'function' ? (val as any)(state.personalDataVoluntaryConsentConfirmed) : val })),
  personalDataMedicalProcessingAcknowledged: false,
  setPersonalDataMedicalProcessingAcknowledged: (val) => set((state) => ({ personalDataMedicalProcessingAcknowledged: typeof val === 'function' ? (val as any)(state.personalDataMedicalProcessingAcknowledged) : val })),
  refusalIntervention: "",
  setRefusalIntervention: (val) => set((state) => ({ refusalIntervention: typeof val === 'function' ? (val as any)(state.refusalIntervention) : val })),
  refusalClinicalIndication: "",
  setRefusalClinicalIndication: (val) => set((state) => ({ refusalClinicalIndication: typeof val === 'function' ? (val as any)(state.refusalClinicalIndication) : val })),
  refusalPatientReason: "",
  setRefusalPatientReason: (val) => set((state) => ({ refusalPatientReason: typeof val === 'function' ? (val as any)(state.refusalPatientReason) : val })),
  refusalDoctorFullName: "",
  setRefusalDoctorFullName: (val) => set((state) => ({ refusalDoctorFullName: typeof val === 'function' ? (val as any)(state.refusalDoctorFullName) : val })),
  refusalConfirmedAt: new Date().toLocaleString("ru-RU"),
  setRefusalConfirmedAt: (val) => set((state) => ({ refusalConfirmedAt: typeof val === 'function' ? (val as any)(state.refusalConfirmedAt) : val })),
  refusalConsequencesUnderstood: false,
  setRefusalConsequencesUnderstood: (val) => set((state) => ({ refusalConsequencesUnderstood: typeof val === 'function' ? (val as any)(state.refusalConsequencesUnderstood) : val })),
  refusalSecondOpinionOffered: false,
  setRefusalSecondOpinionOffered: (val) => set((state) => ({ refusalSecondOpinionOffered: typeof val === 'function' ? (val as any)(state.refusalSecondOpinionOffered) : val })),
  refusalEmergencyCareExplained: false,
  setRefusalEmergencyCareExplained: (val) => set((state) => ({ refusalEmergencyCareExplained: typeof val === 'function' ? (val as any)(state.refusalEmergencyCareExplained) : val })),
  paymentAmount: "3800",
  setPaymentAmount: (val) => set((state) => ({ paymentAmount: typeof val === 'function' ? (val as any)(state.paymentAmount) : val })),
  paymentMethod: initialUiPreferences.paymentMethod,
  setPaymentMethod: (val) => set((state) => ({ paymentMethod: typeof val === 'function' ? (val as any)(state.paymentMethod) : val })),
  paymentFiscalReceiptNumber: "",
  setPaymentFiscalReceiptNumber: (val) => set((state) => ({ paymentFiscalReceiptNumber: typeof val === 'function' ? (val as any)(state.paymentFiscalReceiptNumber) : val })),
  paymentFiscalReceiptIssuedAt: "",
  setPaymentFiscalReceiptIssuedAt: (val) => set((state) => ({ paymentFiscalReceiptIssuedAt: typeof val === 'function' ? (val as any)(state.paymentFiscalReceiptIssuedAt) : val })),
  paymentFiscalFn: "",
  setPaymentFiscalFn: (val) => set((state) => ({ paymentFiscalFn: typeof val === 'function' ? (val as any)(state.paymentFiscalFn) : val })),
  paymentFiscalFd: "",
  setPaymentFiscalFd: (val) => set((state) => ({ paymentFiscalFd: typeof val === 'function' ? (val as any)(state.paymentFiscalFd) : val })),
  paymentFiscalFpd: "",
  setPaymentFiscalFpd: (val) => set((state) => ({ paymentFiscalFpd: typeof val === 'function' ? (val as any)(state.paymentFiscalFpd) : val })),
  paymentFiscalCashierName: "",
  setPaymentFiscalCashierName: (val) => set((state) => ({ paymentFiscalCashierName: typeof val === 'function' ? (val as any)(state.paymentFiscalCashierName) : val })),
  paymentFiscalReceiptUrl: "",
  setPaymentFiscalReceiptUrl: (val) => set((state) => ({ paymentFiscalReceiptUrl: typeof val === 'function' ? (val as any)(state.paymentFiscalReceiptUrl) : val })),
  paymentPayerFullName: "",
  setPaymentPayerFullName: (val) => set((state) => ({ paymentPayerFullName: typeof val === 'function' ? (val as any)(state.paymentPayerFullName) : val })),
  paymentPayerInn: "",
  setPaymentPayerInn: (val) => set((state) => ({ paymentPayerInn: typeof val === 'function' ? (val as any)(state.paymentPayerInn) : val })),
  paymentPayerBirthDate: "",
  setPaymentPayerBirthDate: (val) => set((state) => ({ paymentPayerBirthDate: typeof val === 'function' ? (val as any)(state.paymentPayerBirthDate) : val })),
  paymentPayerIdentityDocument: "",
  setPaymentPayerIdentityDocument: (val) => set((state) => ({ paymentPayerIdentityDocument: typeof val === 'function' ? (val as any)(state.paymentPayerIdentityDocument) : val })),
  paymentPayerRelationship: "пациент",
  setPaymentPayerRelationship: (val) => set((state) => ({ paymentPayerRelationship: typeof val === 'function' ? (val as any)(state.paymentPayerRelationship) : val })),
  paymentTaxDeductionCode: "",
  setPaymentTaxDeductionCode: (val) => set((state) => ({ paymentTaxDeductionCode: typeof val === 'function' ? (val as any)(state.paymentTaxDeductionCode) : val })),
  paymentFeedback: "",
  setPaymentFeedback: (val) => set((state) => ({ paymentFeedback: typeof val === 'function' ? (val as any)(state.paymentFeedback) : val })),
  documentIssueConfirmationId: null,
  setDocumentIssueConfirmationId: (val) => set((state) => ({ documentIssueConfirmationId: typeof val === 'function' ? (val as any)(state.documentIssueConfirmationId) : val })),
  documentIssueSignatureMode: initialUiPreferences.documentIssueSignatureMode,
  setDocumentIssueSignatureMode: (val) => set((state) => ({ documentIssueSignatureMode: typeof val === 'function' ? (val as any)(state.documentIssueSignatureMode) : val })),
  documentIssueSignedAt: currentLocalDateTimeInputValue,
  setDocumentIssueSignedAt: (val) => set((state) => ({ documentIssueSignedAt: typeof val === 'function' ? (val as any)(state.documentIssueSignedAt) : val })),
  documentIssueRecipientFullName: "",
  setDocumentIssueRecipientFullName: (val) => set((state) => ({ documentIssueRecipientFullName: typeof val === 'function' ? (val as any)(state.documentIssueRecipientFullName) : val })),
  documentIssueRecipientRole: "пациент/законный представитель",
  setDocumentIssueRecipientRole: (val) => set((state) => ({ documentIssueRecipientRole: typeof val === 'function' ? (val as any)(state.documentIssueRecipientRole) : val })),
  documentIssueStaffFullName: initialUiPreferences.documentIssueStaffFullName || "",
  setDocumentIssueStaffFullName: (val) => set((state) => ({ documentIssueStaffFullName: typeof val === 'function' ? (val as any)(state.documentIssueStaffFullName) : val })),
  documentIssueStaffRole: initialUiPreferences.documentIssueStaffRole || "",
  setDocumentIssueStaffRole: (val) => set((state) => ({ documentIssueStaffRole: typeof val === 'function' ? (val as any)(state.documentIssueStaffRole) : val })),
  documentIssueNote: "",
  setDocumentIssueNote: (val) => set((state) => ({ documentIssueNote: typeof val === 'function' ? (val as any)(state.documentIssueNote) : val })),
  documentIssueIdentityChecked: false,
  setDocumentIssueIdentityChecked: (val) => set((state) => ({ documentIssueIdentityChecked: typeof val === 'function' ? (val as any)(state.documentIssueIdentityChecked) : val })),
  documentIssueDocumentOpenedAndChecked: false,
  setDocumentIssueDocumentOpenedAndChecked: (val) => set((state) => ({ documentIssueDocumentOpenedAndChecked: typeof val === 'function' ? (val as any)(state.documentIssueDocumentOpenedAndChecked) : val })),
  documentIssueRecipientSigned: false,
  setDocumentIssueRecipientSigned: (val) => set((state) => ({ documentIssueRecipientSigned: typeof val === 'function' ? (val as any)(state.documentIssueRecipientSigned) : val })),
  documentIssueClinicSigned: false,
  setDocumentIssueClinicSigned: (val) => set((state) => ({ documentIssueClinicSigned: typeof val === 'function' ? (val as any)(state.documentIssueClinicSigned) : val })),
  documentVoidConfirmationId: null,
  setDocumentVoidConfirmationId: (val) => set((state) => ({ documentVoidConfirmationId: typeof val === 'function' ? (val as any)(state.documentVoidConfirmationId) : val })),
  documentVoidReasonCode: "draft_error",
  setDocumentVoidReasonCode: (val) => set((state) => ({ documentVoidReasonCode: typeof val === 'function' ? (val as any)(state.documentVoidReasonCode) : val })),
  documentVoidReasonText: "",
  setDocumentVoidReasonText: (val) => set((state) => ({ documentVoidReasonText: typeof val === 'function' ? (val as any)(state.documentVoidReasonText) : val })),
  documentVoidStaffFullName: initialUiPreferences.documentIssueStaffFullName || "",
  setDocumentVoidStaffFullName: (val) => set((state) => ({ documentVoidStaffFullName: typeof val === 'function' ? (val as any)(state.documentVoidStaffFullName) : val })),
  documentVoidStaffRole: initialUiPreferences.documentIssueStaffRole || "",
  setDocumentVoidStaffRole: (val) => set((state) => ({ documentVoidStaffRole: typeof val === 'function' ? (val as any)(state.documentVoidStaffRole) : val })),
  documentVoidCorrectionDocumentId: "",
  setDocumentVoidCorrectionDocumentId: (val) => set((state) => ({ documentVoidCorrectionDocumentId: typeof val === 'function' ? (val as any)(state.documentVoidCorrectionDocumentId) : val })),
  documentVoidReplacementRequired: false,
  setDocumentVoidReplacementRequired: (val) => set((state) => ({ documentVoidReplacementRequired: typeof val === 'function' ? (val as any)(state.documentVoidReplacementRequired) : val })),
  documentVoidPatientOrPayerNotified: false,
  setDocumentVoidPatientOrPayerNotified: (val) => set((state) => ({ documentVoidPatientOrPayerNotified: typeof val === 'function' ? (val as any)(state.documentVoidPatientOrPayerNotified) : val })),
  documentVoidArchivePreserved: false,
  setDocumentVoidArchivePreserved: (val) => set((state) => ({ documentVoidArchivePreserved: typeof val === 'function' ? (val as any)(state.documentVoidArchivePreserved) : val })),
  documentVoidStatusReviewed: false,
  setDocumentVoidStatusReviewed: (val) => set((state) => ({ documentVoidStatusReviewed: typeof val === 'function' ? (val as any)(state.documentVoidStatusReviewed) : val })),
  documentAuditFacts: null,
  taxDocumentYear: initialUiPreferences?.taxDocumentYear ?? new Date().getFullYear(),
  setTaxDocumentYear: (val) => set((state) => ({ taxDocumentYear: typeof val === "function" ? val(state.taxDocumentYear) : val })),
  selectedDocumentKind: "treatment_plan",
  setSelectedDocumentKind: (val) => set((state) => ({ selectedDocumentKind: typeof val === "function" ? val(state.selectedDocumentKind) : val })),
  isDocumentIngesting: false,
  setIsDocumentIngesting: (val) => set((state) => ({ isDocumentIngesting: typeof val === "function" ? val(state.isDocumentIngesting) : val })),
  setDocumentAuditFacts: (val) => set((state) => ({ documentAuditFacts: typeof val === 'function' ? (val as any)(state.documentAuditFacts) : val })),
  documentAuditFactsLoadingId: null,
  setDocumentAuditFactsLoadingId: (val) => set((state) => ({ documentAuditFactsLoadingId: typeof val === 'function' ? (val as any)(state.documentAuditFactsLoadingId) : val })),
  personalDataPurposes: "оказание стоматологической медицинской помощи\nведение медицинской карты и медицинской документации\nрасчеты, договоры, акты и налоговые документы\nуведомления о визитах, рекомендациях и готовности документов",
  setPersonalDataPurposes: (val) => set((state) => ({ personalDataPurposes: typeof val === 'function' ? (val as any)(state.personalDataPurposes) : val })),
  personalDataCategories: "ФИО, дата рождения, телефон, email и адреса\nпаспортные данные, ИНН, СНИЛС, полис ОМС или ДМС\nсведения о здоровье, диагнозы, снимки, планы лечения и назначения\nплатежные документы, договоры, акты и налоговые заявления",
  setPersonalDataCategories: (val) => set((state) => ({ personalDataCategories: typeof val === 'function' ? (val as any)(state.personalDataCategories) : val })),
  personalDataActions: "сбор\nзапись\nсистематизация\nхранение\nуточнение\nиспользование\nпередача по законному основанию\nобезличивание\nудаление после окончания срока хранения",
  setPersonalDataActions: (val) => set((state) => ({ personalDataActions: typeof val === 'function' ? (val as any)(state.personalDataActions) : val })),
  personalDataTransferRules: "Передача возможна только зуботехническим лабораториям, платежным и фискальным сервисам, страховым организациям, ИТ-подрядчикам с договором конфиденциальности, государственным органам по закону и пациентскому порталу по защищенному каналу.",
  setPersonalDataTransferRules: (val) => set((state) => ({ personalDataTransferRules: typeof val === 'function' ? (val as any)(state.personalDataTransferRules) : val })),
  personalDataRetentionPeriod: "в течение срока оказания помощи и обязательного срока хранения медицинской и бухгалтерской документации",
  setPersonalDataRetentionPeriod: (val) => set((state) => ({ personalDataRetentionPeriod: typeof val === 'function' ? (val as any)(state.personalDataRetentionPeriod) : val })),
  personalDataRevocationChannel: "письменное заявление в клинике или защищенное обращение через портал пациента",
  setPersonalDataRevocationChannel: (val) => set((state) => ({ personalDataRevocationChannel: typeof val === 'function' ? (val as any)(state.personalDataRevocationChannel) : val })),
  refusalExplainedRisks: "усиление боли\nраспространение инфекции\nпотеря возможности сохранить зуб или ткани\nнеобходимость экстренного обращения при ухудшении",
  setRefusalExplainedRisks: (val) => set((state) => ({ refusalExplainedRisks: typeof val === 'function' ? (val as any)(state.refusalExplainedRisks) : val })),
  refusalAlternatives: "повторная консультация\nобезболивание и контроль состояния\nвторое мнение профильного врача\nобращение в дежурную стоматологию при ухудшении",
  setRefusalAlternatives: (val) => set((state) => ({ refusalAlternatives: typeof val === 'function' ? (val as any)(state.refusalAlternatives) : val })),
  refusalUrgentWarningSigns: "отек лица или шеи\nтемпература\nзатруднение глотания или дыхания\nкровотечение\nнарастающая боль",
  setRefusalUrgentWarningSigns: (val) => set((state) => ({ refusalUrgentWarningSigns: typeof val === 'function' ? (val as any)(state.refusalUrgentWarningSigns) : val })),
  documentIngestionTarget: initialUiPreferences.documentIngestionTarget,
  setDocumentIngestionTarget: (val) => set((state) => ({ documentIngestionTarget: typeof val === 'function' ? (val as any)(state.documentIngestionTarget) : val })),
  documentIngestion: null,
  setDocumentIngestion: (val) => set((state) => ({ documentIngestion: typeof val === 'function' ? (val as any)(state.documentIngestion) : val })),
}));
