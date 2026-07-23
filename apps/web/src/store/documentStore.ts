import { create } from "zustand";
import {
  PaymentRefundCorrectionAction,
  PaymentRefundCorrectionMethod,
} from "../AppHelpers";
export type MedicalDocumentReleaseChannel =
  | "paper"
  | "pdf"
  | "dicom_archive"
  | "secure_link"
  | "physical_media"
  | "other";
import {
  PaymentMethod,
  DocumentIssueSignatureMode,
  DocumentVoidReasonCode,
  DocumentAuditFacts,
  DocumentIngestionTarget,
  DocumentIngestionResponse,
  GeneratedDocument,
  TreatmentPlanAcceptanceVariant,
  PostVisitCareTopic,
  PhotoVideoConsentMaterial,
  XrayCbctReferralStudyType,
  XrayCbctReferralPregnancyStatus,
  XrayCbctReferralPriority,
  TaxDeductionApplicationForm,
  TaxDeductionApplicationDeliveryChannel,
  TaxDeductionApplicationRelationship,
  PatientIntakePregnancyStatus,
  ProcedureSpecificConsentProcedure,
} from "@dental/shared";
import {
  dateInputValuePlusDays,
  currentLocalDateTimeInputValue,
} from "../AppHelpers";
import {
  defaultClinicalToothRowsText,
  toDateTimeLocalValue,
  loadUiPreferences,
} from "../AppHelpers";
import { postVisitCarePresets } from "../postVisitCareData";

const createSetter = (set: any, key: string) => (val: any) =>
  set((state: any) => ({
    [key]: typeof val === "function" ? val(state[key]) : val,
  }));



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
  setSelectedDocumentKind: (
    val:
      | GeneratedDocument["kind"]
      | ((prev: GeneratedDocument["kind"]) => GeneratedDocument["kind"]),
  ) => void;
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
  setPaymentMethod: (
    val: PaymentMethod | ((prev: PaymentMethod) => PaymentMethod),
  ) => void;
  setPaymentFiscalReceiptNumber: (
    val: string | ((prev: string) => string),
  ) => void;
  setPaymentFiscalReceiptIssuedAt: (
    val: string | ((prev: string) => string),
  ) => void;
  setPaymentFiscalFn: (val: string | ((prev: string) => string)) => void;
  setPaymentFiscalFd: (val: string | ((prev: string) => string)) => void;
  setPaymentFiscalFpd: (val: string | ((prev: string) => string)) => void;
  setPaymentFiscalCashierName: (
    val: string | ((prev: string) => string),
  ) => void;
  setPaymentFiscalReceiptUrl: (
    val: string | ((prev: string) => string),
  ) => void;
  setPaymentPayerFullName: (val: string | ((prev: string) => string)) => void;
  setPaymentPayerInn: (val: string | ((prev: string) => string)) => void;
  setPaymentPayerBirthDate: (val: string | ((prev: string) => string)) => void;
  setPaymentPayerIdentityDocument: (
    val: string | ((prev: string) => string),
  ) => void;
  setPaymentPayerRelationship: (
    val: string | ((prev: string) => string),
  ) => void;
  setPaymentTaxDeductionCode: (
    val: "" | "1" | "2" | ((prev: "" | "1" | "2") => "" | "1" | "2"),
  ) => void;
  setPaymentFeedback: (val: string | ((prev: string) => string)) => void;
  setDocumentIssueConfirmationId: (
    val: string | null | ((prev: string | null) => string | null),
  ) => void;
  setDocumentIssueSignatureMode: (
    val:
      | DocumentIssueSignatureMode
      | ((prev: DocumentIssueSignatureMode) => DocumentIssueSignatureMode),
  ) => void;
  setDocumentIssueSignedAt: (val: any | ((prev: any) => any)) => void;
  setDocumentIssueRecipientFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  setDocumentIssueRecipientRole: (
    val: string | ((prev: string) => string),
  ) => void;
  setDocumentIssueStaffFullName: (val: any | ((prev: any) => any)) => void;
  setDocumentIssueStaffRole: (val: any | ((prev: any) => any)) => void;
  setDocumentIssueNote: (val: string | ((prev: string) => string)) => void;
  setDocumentIssueIdentityChecked: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setDocumentIssueDocumentOpenedAndChecked: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setDocumentIssueRecipientSigned: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setDocumentIssueClinicSigned: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setDocumentVoidConfirmationId: (
    val: string | null | ((prev: string | null) => string | null),
  ) => void;
  setDocumentVoidReasonCode: (
    val:
      | DocumentVoidReasonCode
      | ((prev: DocumentVoidReasonCode) => DocumentVoidReasonCode),
  ) => void;
  setDocumentVoidReasonText: (val: string | ((prev: string) => string)) => void;
  setDocumentVoidStaffFullName: (val: any | ((prev: any) => any)) => void;
  setDocumentVoidStaffRole: (val: any | ((prev: any) => any)) => void;
  setDocumentVoidCorrectionDocumentId: (
    val: string | ((prev: string) => string),
  ) => void;
  setDocumentVoidReplacementRequired: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setDocumentVoidPatientOrPayerNotified: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setDocumentVoidArchivePreserved: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setDocumentVoidStatusReviewed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setDocumentAuditFacts: (
    val:
      | DocumentAuditFacts
      | null
      | ((prev: DocumentAuditFacts | null) => DocumentAuditFacts | null),
  ) => void;
  setDocumentAuditFactsLoadingId: (
    val: string | null | ((prev: string | null) => string | null),
  ) => void;
  setPersonalDataPurposes: (val: string | ((prev: string) => string)) => void;
  setPersonalDataCategories: (val: string | ((prev: string) => string)) => void;
  setPersonalDataActions: (val: string | ((prev: string) => string)) => void;
  setPersonalDataTransferRules: (
    val: string | ((prev: string) => string),
  ) => void;
  setPersonalDataRetentionPeriod: (
    val: string | ((prev: string) => string),
  ) => void;
  setPersonalDataRevocationChannel: (
    val: string | ((prev: string) => string),
  ) => void;
  setRefusalExplainedRisks: (val: string | ((prev: string) => string)) => void;
  setRefusalAlternatives: (val: string | ((prev: string) => string)) => void;
  setRefusalUrgentWarningSigns: (
    val: string | ((prev: string) => string),
  ) => void;
  setDocumentIngestionTarget: (
    val:
      | DocumentIngestionTarget
      | ((prev: DocumentIngestionTarget) => DocumentIngestionTarget),
  ) => void;
  setDocumentIngestion: (
    val:
      | DocumentIngestionResponse
      | null
      | ((
          prev: DocumentIngestionResponse | null,
        ) => DocumentIngestionResponse | null),
  ) => void;

  setOutpatient025uEmploymentCode: (
    val: string | ((prev: string) => string),
  ) => void;
  setOutpatient025uDisabilityGroup: (
    val: string | ((prev: string) => string),
  ) => void;
  setOutpatient025uWorkOrStudyPlace: (
    val: string | ((prev: string) => string),
  ) => void;
  setOutpatient025uPalliativeCareNeedCode: (
    val: string | ((prev: string) => string),
  ) => void;
  setOutpatient025uBloodGroup: (
    val: string | ((prev: string) => string),
  ) => void;
  setOutpatient025uRhFactor: (val: string | ((prev: string) => string)) => void;
  setOutpatient025uKellK1: (val: string | ((prev: string) => string)) => void;
  setOutpatient025uOtherBloodData: (
    val: string | ((prev: string) => string),
  ) => void;
  setOutpatient025uAllergyHistory: (
    val: string | ((prev: string) => string),
  ) => void;
  setOutpatient025uFinalEpicrisis: (
    val: string | ((prev: string) => string),
  ) => void;
  setOutpatient025uOfficialForm274nChecked: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setOutpatient025uThirdPartyDataChecked: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setCopyRequestDocumentTypes: (val: any | ((prev: any) => any)) => void;
  setCopyRequestPeriodStart: (val: string | ((prev: string) => string)) => void;
  setCopyRequestPeriodEnd: (val: string | ((prev: string) => string)) => void;
  setCopyRequestFormat: (
    val:
      | MedicalDocumentReleaseChannel
      | ((
          prev: MedicalDocumentReleaseChannel,
        ) => MedicalDocumentReleaseChannel),
  ) => void;
  setCopyRequestRecipientFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  setCopyRequestRecipientIdentityDocument: (
    val: string | ((prev: string) => string),
  ) => void;
  setCopyRequestRecipientAuthority: (val: any | ((prev: any) => any)) => void;
  setCopyRequestRepresentativeAuthorityDocument: (
    val: string | ((prev: string) => string),
  ) => void;
  setCopyRequestRequestedAt: (val: any | ((prev: any) => any)) => void;
  setCopyRequestContactForDelivery: (
    val: string | ((prev: string) => string),
  ) => void;
  setCopyRequestSpecialInstructions: (
    val: string | ((prev: string) => string),
  ) => void;
  setCopyRequestIncludeDicomSourceData: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setCopyRequestIdentityVerified: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setCopyRequestThirdPartyDataChecked: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setAttendanceStartedAt: (val: string | ((prev: string) => string)) => void;
  setAttendanceEndedAt: (val: string | ((prev: string) => string)) => void;
  setAttendancePurpose: (val: any | ((prev: any) => any)) => void;
  setAttendanceRecipientOrganization: (
    val: string | ((prev: string) => string),
  ) => void;
  setAttendanceIssuedAt: (val: any | ((prev: any) => any)) => void;
  setAttendanceSignedByFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  setAttendanceSignedByRole: (val: any | ((prev: any) => any)) => void;
  setAttendanceDiagnosisDisclosureExcluded: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setAttendanceNotSickLeaveAcknowledged: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setReleaseRecipientFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  setReleaseRecipientIdentityDocument: (
    val: string | ((prev: string) => string),
  ) => void;
  setReleaseRecipientAuthority: (val: any | ((prev: any) => any)) => void;
  setReleaseSourceRequestDocumentId: (
    val: string | ((prev: string) => string),
  ) => void;
  setReleaseChannel: (
    val:
      | MedicalDocumentReleaseChannel
      | ((
          prev: MedicalDocumentReleaseChannel,
        ) => MedicalDocumentReleaseChannel),
  ) => void;
  setReleaseDocumentTypes: (val: any | ((prev: any) => any)) => void;
  setReleasePeriodStart: (val: string | ((prev: string) => string)) => void;
  setReleasePeriodEnd: (val: string | ((prev: string) => string)) => void;
  setReleaseDeliveredAt: (val: any | ((prev: any) => any)) => void;
  setReleaseAccessExpiresAt: (val: string | ((prev: string) => string)) => void;
  setReleaseThirdPartyDataChecked: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setRefundAction: (
    val:
      | PaymentRefundCorrectionAction
      | ((
          prev: PaymentRefundCorrectionAction,
        ) => PaymentRefundCorrectionAction),
  ) => void;
  setRefundAmountRub: (val: any | ((prev: any) => any)) => void;
  setRefundReason: (val: string | ((prev: string) => string)) => void;
  setRefundMethod: (
    val:
      | PaymentRefundCorrectionMethod
      | ((
          prev: PaymentRefundCorrectionMethod,
        ) => PaymentRefundCorrectionMethod),
  ) => void;
  setRefundRecipientFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  setRefundRecipientIdentityDocument: (
    val: string | ((prev: string) => string),
  ) => void;
  setRefundBankDetails: (val: string | ((prev: string) => string)) => void;
  setRefundSelectedPaymentId: (
    val: string | ((prev: string) => string),
  ) => void;
  setRefundOriginalFiscalReceiptNumber: (
    val: string | ((prev: string) => string),
  ) => void;
  setRefundCorrectionFiscalReceiptNumber: (
    val: string | ((prev: string) => string),
  ) => void;
  setRefundAccountantDecision: (
    val: string | ((prev: string) => string),
  ) => void;
  setPersonalDataCrossBorderAllowed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setPersonalDataAutomatedDecisionAllowed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setPersonalDataConsentGivenAt: (val: any | ((prev: any) => any)) => void;
  setPersonalDataVoluntaryConsentConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setPersonalDataMedicalProcessingAcknowledged: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setRefusalIntervention: (val: string | ((prev: string) => string)) => void;
  setRefusalClinicalIndication: (
    val: string | ((prev: string) => string),
  ) => void;
  setRefusalPatientReason: (val: string | ((prev: string) => string)) => void;
  setRefusalDoctorFullName: (val: string | ((prev: string) => string)) => void;
  setRefusalConfirmedAt: (val: any | ((prev: any) => any)) => void;
  setRefusalConsequencesUnderstood: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setRefusalSecondOpinionOffered: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  setRefusalEmergencyCareExplained: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;

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
  setDocumentCreateSavingKind: (
    val:
      | GeneratedDocument["kind"]
      | null
      | ((
          prev: GeneratedDocument["kind"] | null,
        ) => GeneratedDocument["kind"] | null),
  ) => void;
  documentStatusSavingId: string | null;
  setDocumentStatusSavingId: (
    val: string | null | ((prev: string | null) => string | null),
  ) => void;
  taxDocumentPayerInn: string;
  setTaxDocumentPayerInn: (val: string | ((prev: string) => string)) => void;
  selectedTaxPaymentIds: string[];
  setSelectedTaxPaymentIds: (
    val: string[] | ((prev: string[]) => string[]),
  ) => void;
  selectedPaymentReceiptIds: string[];
  setSelectedPaymentReceiptIds: (
    val: string[] | ((prev: string[]) => string[]),
  ) => void;
  taxApplicationTaxpayerFullName: string;
  setTaxApplicationTaxpayerFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  taxApplicationTaxpayerInn: string;
  setTaxApplicationTaxpayerInn: (
    val: string | ((prev: string) => string),
  ) => void;
  taxApplicationTaxpayerBirthDate: string;
  setTaxApplicationTaxpayerBirthDate: (
    val: string | ((prev: string) => string),
  ) => void;
  taxApplicationTaxpayerIdentityDocument: string;
  setTaxApplicationTaxpayerIdentityDocument: (
    val: string | ((prev: string) => string),
  ) => void;
  taxApplicationRelationship: TaxDeductionApplicationRelationship;
  setTaxApplicationRelationship: (
    val:
      | TaxDeductionApplicationRelationship
      | ((
          prev: TaxDeductionApplicationRelationship,
        ) => TaxDeductionApplicationRelationship),
  ) => void;
  taxApplicationForm: TaxDeductionApplicationForm;
  setTaxApplicationForm: (
    val:
      | TaxDeductionApplicationForm
      | ((prev: TaxDeductionApplicationForm) => TaxDeductionApplicationForm),
  ) => void;
  taxApplicationDeliveryChannel: TaxDeductionApplicationDeliveryChannel;
  setTaxApplicationDeliveryChannel: (
    val:
      | TaxDeductionApplicationDeliveryChannel
      | ((
          prev: TaxDeductionApplicationDeliveryChannel,
        ) => TaxDeductionApplicationDeliveryChannel),
  ) => void;
  taxApplicationContact: string;
  setTaxApplicationContact: (val: string | ((prev: string) => string)) => void;
  taxApplicationAuthorityDocument: string;
  setTaxApplicationAuthorityDocument: (
    val: string | ((prev: string) => string),
  ) => void;
  taxApplicationRequestedAt: string;
  setTaxApplicationRequestedAt: (
    val: string | ((prev: string) => string),
  ) => void;
  taxApplicationDuplicateWarningAccepted: boolean;
  setTaxApplicationDuplicateWarningAccepted: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  intakeChiefComplaint: string;
  setIntakeChiefComplaint: (val: string | ((prev: string) => string)) => void;
  intakeAllergyStatus: string;
  setIntakeAllergyStatus: (val: string | ((prev: string) => string)) => void;
  intakeCurrentMedications: string;
  setIntakeCurrentMedications: (
    val: string | ((prev: string) => string),
  ) => void;
  intakeChronicConditions: string;
  setIntakeChronicConditions: (
    val: string | ((prev: string) => string),
  ) => void;
  intakePregnancyStatus: PatientIntakePregnancyStatus;
  setIntakePregnancyStatus: (
    val:
      | PatientIntakePregnancyStatus
      | ((prev: PatientIntakePregnancyStatus) => PatientIntakePregnancyStatus),
  ) => void;
  intakeAnticoagulants: string;
  setIntakeAnticoagulants: (val: string | ((prev: string) => string)) => void;
  intakeInfectiousRiskNotes: string;
  setIntakeInfectiousRiskNotes: (
    val: string | ((prev: string) => string),
  ) => void;
  intakeCardioEndocrineNotes: string;
  setIntakeCardioEndocrineNotes: (
    val: string | ((prev: string) => string),
  ) => void;
  intakeEmergencyContact: string;
  setIntakeEmergencyContact: (val: string | ((prev: string) => string)) => void;
  intakeAdditionalNotes: string;
  setIntakeAdditionalNotes: (val: string | ((prev: string) => string)) => void;
  intakeAccuracyConfirmed: boolean;
  setIntakeAccuracyConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  informedConsentIntervention: string;
  setInformedConsentIntervention: (
    val: string | ((prev: string) => string),
  ) => void;
  informedConsentToothOrArea: string;
  setInformedConsentToothOrArea: (
    val: string | ((prev: string) => string),
  ) => void;
  informedConsentDiagnosisOrIndication: string;
  setInformedConsentDiagnosisOrIndication: (
    val: string | ((prev: string) => string),
  ) => void;
  informedConsentExpectedBenefit: string;
  setInformedConsentExpectedBenefit: (
    val: string | ((prev: string) => string),
  ) => void;
  informedConsentAnesthesia: string;
  setInformedConsentAnesthesia: (
    val: string | ((prev: string) => string),
  ) => void;
  informedConsentMaterialNotes: string;
  setInformedConsentMaterialNotes: (
    val: string | ((prev: string) => string),
  ) => void;
  informedConsentTrustedContact: string;
  setInformedConsentTrustedContact: (
    val: string | ((prev: string) => string),
  ) => void;
  informedConsentRisks: string;
  setInformedConsentRisks: (val: string | ((prev: string) => string)) => void;
  informedConsentAlternatives: string;
  setInformedConsentAlternatives: (
    val: string | ((prev: string) => string),
  ) => void;
  informedConsentAftercare: string;
  setInformedConsentAftercare: (
    val: string | ((prev: string) => string),
  ) => void;
  informedConsentDoctorFullName: string;
  setInformedConsentDoctorFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  informedConsentConfirmedAt: string;
  setInformedConsentConfirmedAt: (
    val: string | ((prev: string) => string),
  ) => void;
  informedConsentQuestionsAnswered: boolean;
  setInformedConsentQuestionsAnswered: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  informedConsentRisksUnderstood: boolean;
  setInformedConsentRisksUnderstood: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  informedConsentWithdrawUnderstood: boolean;
  setInformedConsentWithdrawUnderstood: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  procedureConsentProcedureType: ProcedureSpecificConsentProcedure;
  setProcedureConsentProcedureType: (
    val:
      | ProcedureSpecificConsentProcedure
      | ((
          prev: ProcedureSpecificConsentProcedure,
        ) => ProcedureSpecificConsentProcedure),
  ) => void;
  procedureConsentProcedureName: string;
  setProcedureConsentProcedureName: (
    val: string | ((prev: string) => string),
  ) => void;
  procedureConsentToothOrArea: string;
  setProcedureConsentToothOrArea: (
    val: string | ((prev: string) => string),
  ) => void;
  procedureConsentDiagnosisOrIndication: string;
  setProcedureConsentDiagnosisOrIndication: (
    val: string | ((prev: string) => string),
  ) => void;
  procedureConsentAnesthesia: string;
  setProcedureConsentAnesthesia: (
    val: string | ((prev: string) => string),
  ) => void;
  procedureConsentMaterials: string;
  setProcedureConsentMaterials: (
    val: string | ((prev: string) => string),
  ) => void;
  procedureConsentPatientRiskFactors: string;
  setProcedureConsentPatientRiskFactors: (
    val: string | ((prev: string) => string),
  ) => void;
  procedureConsentSpecificRisks: string;
  setProcedureConsentSpecificRisks: (
    val: string | ((prev: string) => string),
  ) => void;
  procedureConsentAlternatives: string;
  setProcedureConsentAlternatives: (
    val: string | ((prev: string) => string),
  ) => void;
  procedureConsentAftercare: string;
  setProcedureConsentAftercare: (
    val: string | ((prev: string) => string),
  ) => void;
  procedureConsentDoctorFullName: string;
  setProcedureConsentDoctorFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  procedureConsentConfirmedAt: string;
  setProcedureConsentConfirmedAt: (
    val: string | ((prev: string) => string),
  ) => void;
  procedureConsentLocalFormAttached: boolean;
  setProcedureConsentLocalFormAttached: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  procedureConsentQuestionsAnswered: boolean;
  setProcedureConsentQuestionsAnswered: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  procedureConsentExactProcedureConfirmed: boolean;
  setProcedureConsentExactProcedureConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  procedureConsentRisksUnderstood: boolean;
  setProcedureConsentRisksUnderstood: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  paidContractNumber: string;
  setPaidContractNumber: (val: string | ((prev: string) => string)) => void;
  paidContractDate: string;
  setPaidContractDate: (val: string | ((prev: string) => string)) => void;
  paidContractServiceStart: string;
  setPaidContractServiceStart: (
    val: string | ((prev: string) => string),
  ) => void;
  paidContractServiceEnd: string;
  setPaidContractServiceEnd: (val: string | ((prev: string) => string)) => void;
  paidContractCustomerFullName: string;
  setPaidContractCustomerFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  paidContractRepresentativeFullName: string;
  setPaidContractRepresentativeFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  paidContractCareReason: string;
  setPaidContractCareReason: (val: string | ((prev: string) => string)) => void;
  paidContractServiceScope: string;
  setPaidContractServiceScope: (
    val: string | ((prev: string) => string),
  ) => void;
  paidContractTotalRub: string;
  setPaidContractTotalRub: (val: string | ((prev: string) => string)) => void;
  paidContractPaymentTerms: string;
  setPaidContractPaymentTerms: (
    val: string | ((prev: string) => string),
  ) => void;
  paidContractPriceChangeRules: string;
  setPaidContractPriceChangeRules: (
    val: string | ((prev: string) => string),
  ) => void;
  paidContractFreeCareNotice: string;
  setPaidContractFreeCareNotice: (
    val: string | ((prev: string) => string),
  ) => void;
  paidContractRecommendationWarning: string;
  setPaidContractRecommendationWarning: (
    val: string | ((prev: string) => string),
  ) => void;
  paidContractRefundTerms: string;
  setPaidContractRefundTerms: (
    val: string | ((prev: string) => string),
  ) => void;
  paidContractWarrantyTerms: string;
  setPaidContractWarrantyTerms: (
    val: string | ((prev: string) => string),
  ) => void;
  paidContractDoctorFullName: string;
  setPaidContractDoctorFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  paidContractSignedAt: string;
  setPaidContractSignedAt: (val: string | ((prev: string) => string)) => void;
  paidContractClinicInfoConfirmed: boolean;
  setPaidContractClinicInfoConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  paidContractServiceListConfirmed: boolean;
  setPaidContractServiceListConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  paidContractPaidBasisConfirmed: boolean;
  setPaidContractPaidBasisConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  paidContractWrittenChangesConfirmed: boolean;
  setPaidContractWrittenChangesConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  completedActNumber: string;
  setCompletedActNumber: (val: string | ((prev: string) => string)) => void;
  completedActDate: string;
  setCompletedActDate: (val: string | ((prev: string) => string)) => void;
  completedActContractNumber: string;
  setCompletedActContractNumber: (
    val: string | ((prev: string) => string),
  ) => void;
  completedActLinkedContractDocumentId: string;
  setCompletedActLinkedContractDocumentId: (
    val: string | ((prev: string) => string),
  ) => void;
  completedActServicePeriodStart: string;
  setCompletedActServicePeriodStart: (
    val: string | ((prev: string) => string),
  ) => void;
  completedActServicePeriodEnd: string;
  setCompletedActServicePeriodEnd: (
    val: string | ((prev: string) => string),
  ) => void;
  completedActDoctorFullName: string;
  setCompletedActDoctorFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  completedActServicesSummary: string;
  setCompletedActServicesSummary: (
    val: string | ((prev: string) => string),
  ) => void;
  completedActTotalRub: string;
  setCompletedActTotalRub: (val: string | ((prev: string) => string)) => void;
  completedActPaidRub: string;
  setCompletedActPaidRub: (val: string | ((prev: string) => string)) => void;
  completedActFiscalReceipts: string;
  setCompletedActFiscalReceipts: (
    val: string | ((prev: string) => string),
  ) => void;
  completedActPatientClaims: string;
  setCompletedActPatientClaims: (
    val: string | ((prev: string) => string),
  ) => void;
  completedActLinkedContract: boolean;
  setCompletedActLinkedContract: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  completedActFinalScopeConfirmed: boolean;
  setCompletedActFinalScopeConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  completedActFiscalReceiptsVerified: boolean;
  setCompletedActFiscalReceiptsVerified: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  completedActAccepted: boolean;
  setCompletedActAccepted: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  treatmentEstimateNumber: string;
  setTreatmentEstimateNumber: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentEstimateDate: string;
  setTreatmentEstimateDate: (val: string | ((prev: string) => string)) => void;
  treatmentEstimatePatientOrPayerFullName: string;
  setTreatmentEstimatePatientOrPayerFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentEstimateTreatmentBasis: string;
  setTreatmentEstimateTreatmentBasis: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentEstimateTotalRub: string;
  setTreatmentEstimateTotalRub: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentEstimateValidUntil: string;
  setTreatmentEstimateValidUntil: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentEstimatePriceChangeRules: string;
  setTreatmentEstimatePriceChangeRules: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentEstimateExcludedItems: string;
  setTreatmentEstimateExcludedItems: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentEstimatePaymentMilestoneNotes: string;
  setTreatmentEstimatePaymentMilestoneNotes: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentEstimateDoctorFullName: string;
  setTreatmentEstimateDoctorFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentEstimateAdminFullName: string;
  setTreatmentEstimateAdminFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentEstimateSignedAt: string;
  setTreatmentEstimateSignedAt: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentEstimatePreliminaryConfirmed: boolean;
  setTreatmentEstimatePreliminaryConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  treatmentEstimateScopeConfirmed: boolean;
  setTreatmentEstimateScopeConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  treatmentEstimateFiscalNoticeConfirmed: boolean;
  setTreatmentEstimateFiscalNoticeConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  treatmentEstimateChangeRulesConfirmed: boolean;
  setTreatmentEstimateChangeRulesConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  paymentInvoiceNumber: string;
  setPaymentInvoiceNumber: (val: string | ((prev: string) => string)) => void;
  paymentInvoiceDate: string;
  setPaymentInvoiceDate: (val: string | ((prev: string) => string)) => void;
  paymentInvoicePayerFullName: string;
  setPaymentInvoicePayerFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  paymentInvoicePayerPhone: string;
  setPaymentInvoicePayerPhone: (
    val: string | ((prev: string) => string),
  ) => void;
  paymentInvoicePayerEmail: string;
  setPaymentInvoicePayerEmail: (
    val: string | ((prev: string) => string),
  ) => void;
  paymentInvoicePurpose: string;
  setPaymentInvoicePurpose: (val: string | ((prev: string) => string)) => void;
  paymentInvoiceDueDate: string;
  setPaymentInvoiceDueDate: (val: string | ((prev: string) => string)) => void;
  paymentInvoicePaymentTerms: string;
  setPaymentInvoicePaymentTerms: (
    val: string | ((prev: string) => string),
  ) => void;
  paymentInvoiceBankDetails: string;
  setPaymentInvoiceBankDetails: (
    val: string | ((prev: string) => string),
  ) => void;
  paymentInvoiceQrPayload: string;
  setPaymentInvoiceQrPayload: (
    val: string | ((prev: string) => string),
  ) => void;
  paymentInvoiceCashlessAllowed: boolean;
  setPaymentInvoiceCashlessAllowed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  paymentInvoiceCashDeskAllowed: boolean;
  setPaymentInvoiceCashDeskAllowed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  paymentInvoiceRequisitesVerified: boolean;
  setPaymentInvoiceRequisitesVerified: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  paymentInvoiceServiceScopeConfirmed: boolean;
  setPaymentInvoiceServiceScopeConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  paymentInvoiceFiscalNoticeConfirmed: boolean;
  setPaymentInvoiceFiscalNoticeConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  paymentReceiptNumber: string;
  setPaymentReceiptNumber: (val: string | ((prev: string) => string)) => void;
  paymentReceiptDate: string;
  setPaymentReceiptDate: (val: string | ((prev: string) => string)) => void;
  paymentReceiptPayerFullName: string;
  setPaymentReceiptPayerFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  paymentReceiptPayerBirthDate: string;
  setPaymentReceiptPayerBirthDate: (
    val: string | ((prev: string) => string),
  ) => void;
  paymentReceiptPayerInn: string;
  setPaymentReceiptPayerInn: (val: string | ((prev: string) => string)) => void;
  paymentReceiptPayerIdentityDocument: string;
  setPaymentReceiptPayerIdentityDocument: (
    val: string | ((prev: string) => string),
  ) => void;
  paymentReceiptPayerRelationship: string;
  setPaymentReceiptPayerRelationship: (
    val: string | ((prev: string) => string),
  ) => void;
  paymentReceiptTaxSupportRequested: any;
  setPaymentReceiptTaxSupportRequested: (
    val: any | ((prev: any) => any),
  ) => void;
  paymentReceiptPurpose: string;
  setPaymentReceiptPurpose: (val: string | ((prev: string) => string)) => void;
  paymentReceiptIssuedBy: string;
  setPaymentReceiptIssuedBy: (val: string | ((prev: string) => string)) => void;
  paymentReceiptPaymentsVerified: boolean;
  setPaymentReceiptPaymentsVerified: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  paymentReceiptPayerVerified: boolean;
  setPaymentReceiptPayerVerified: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  paymentReceiptFiscalNoticeConfirmed: boolean;
  setPaymentReceiptFiscalNoticeConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  installmentScheduleNumber: string;
  setInstallmentScheduleNumber: (
    val: string | ((prev: string) => string),
  ) => void;
  installmentScheduleDate: string;
  setInstallmentScheduleDate: (
    val: string | ((prev: string) => string),
  ) => void;
  installmentScheduleBaseDocumentTitle: string;
  setInstallmentScheduleBaseDocumentTitle: (
    val: string | ((prev: string) => string),
  ) => void;
  installmentSchedulePayerFullName: string;
  setInstallmentSchedulePayerFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  installmentScheduleTotalRub: string;
  setInstallmentScheduleTotalRub: (
    val: string | ((prev: string) => string),
  ) => void;
  installmentSchedulePrepaidRub: string;
  setInstallmentSchedulePrepaidRub: (
    val: string | ((prev: string) => string),
  ) => void;
  installmentScheduleRows: string;
  setInstallmentScheduleRows: (
    val: string | ((prev: string) => string),
  ) => void;
  installmentScheduleLatePolicy: string;
  setInstallmentScheduleLatePolicy: (
    val: string | ((prev: string) => string),
  ) => void;
  installmentSchedulePaymentMethodNotes: string;
  setInstallmentSchedulePaymentMethodNotes: (
    val: string | ((prev: string) => string),
  ) => void;
  installmentScheduleResponsibleFullName: string;
  setInstallmentScheduleResponsibleFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  installmentScheduleAccepted: boolean;
  setInstallmentScheduleAccepted: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  installmentScheduleFiscalNoticeConfirmed: boolean;
  setInstallmentScheduleFiscalNoticeConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  installmentScheduleWrittenChangesConfirmed: boolean;
  setInstallmentScheduleWrittenChangesConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  minorRepresentativeFullName: string;
  setMinorRepresentativeFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  minorRepresentativeRelationship: string;
  setMinorRepresentativeRelationship: (
    val: string | ((prev: string) => string),
  ) => void;
  minorRepresentativeIdentityDocument: string;
  setMinorRepresentativeIdentityDocument: (
    val: string | ((prev: string) => string),
  ) => void;
  minorRepresentativeAuthorityDocument: string;
  setMinorRepresentativeAuthorityDocument: (
    val: string | ((prev: string) => string),
  ) => void;
  minorRepresentativePhone: string;
  setMinorRepresentativePhone: (
    val: string | ((prev: string) => string),
  ) => void;
  minorConsentPatientFullName: string;
  setMinorConsentPatientFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  minorConsentPatientBirthDate: string;
  setMinorConsentPatientBirthDate: (
    val: string | ((prev: string) => string),
  ) => void;
  minorConsentInterventionScope: string;
  setMinorConsentInterventionScope: (
    val: string | ((prev: string) => string),
  ) => void;
  minorConsentDiagnosisOrIndication: string;
  setMinorConsentDiagnosisOrIndication: (
    val: string | ((prev: string) => string),
  ) => void;
  minorConsentRisks: string;
  setMinorConsentRisks: (val: string | ((prev: string) => string)) => void;
  minorConsentAlternatives: string;
  setMinorConsentAlternatives: (
    val: string | ((prev: string) => string),
  ) => void;
  minorConsentDoctorFullName: string;
  setMinorConsentDoctorFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  minorConsentSignedAt: string;
  setMinorConsentSignedAt: (val: string | ((prev: string) => string)) => void;
  minorConsentIdentityVerified: boolean;
  setMinorConsentIdentityVerified: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  minorConsentAuthorityVerified: boolean;
  setMinorConsentAuthorityVerified: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  minorConsentExplained: boolean;
  setMinorConsentExplained: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  minorConsentStored: boolean;
  setMinorConsentStored: (val: boolean | ((prev: boolean) => boolean)) => void;
  minorConsentAgeExplanation: boolean;
  setMinorConsentAgeExplanation: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  warrantyServiceOrWorkName: string;
  setWarrantyServiceOrWorkName: (
    val: string | ((prev: string) => string),
  ) => void;
  warrantyCompletedAt: string;
  setWarrantyCompletedAt: (val: string | ((prev: string) => string)) => void;
  warrantyTeethOrArea: string;
  setWarrantyTeethOrArea: (val: string | ((prev: string) => string)) => void;
  warrantyMaterialsOrSystems: string;
  setWarrantyMaterialsOrSystems: (
    val: string | ((prev: string) => string),
  ) => void;
  warrantyPeriod: string;
  setWarrantyPeriod: (val: string | ((prev: string) => string)) => void;
  warrantyControlVisitSchedule: string;
  setWarrantyControlVisitSchedule: (
    val: string | ((prev: string) => string),
  ) => void;
  warrantyPatientObligations: string;
  setWarrantyPatientObligations: (
    val: string | ((prev: string) => string),
  ) => void;
  warrantyExcludedRiskFactors: string;
  setWarrantyExcludedRiskFactors: (
    val: string | ((prev: string) => string),
  ) => void;
  warrantyUrgentContactReasons: string;
  setWarrantyUrgentContactReasons: (
    val: string | ((prev: string) => string),
  ) => void;
  warrantyLinkedActOrContract: string;
  setWarrantyLinkedActOrContract: (
    val: string | ((prev: string) => string),
  ) => void;
  warrantyDoctorFullName: string;
  setWarrantyDoctorFullName: (val: string | ((prev: string) => string)) => void;
  warrantyIssuedAt: string;
  setWarrantyIssuedAt: (val: string | ((prev: string) => string)) => void;
  warrantyPolicyApplied: boolean;
  setWarrantyPolicyApplied: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  warrantyAftercareReceived: boolean;
  setWarrantyAftercareReceived: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  warrantyControlVisitsUnderstood: boolean;
  setWarrantyControlVisitsUnderstood: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  clinicalToothRowsText: any;
  setClinicalToothRowsText: (val: any | ((prev: any) => any)) => void;
  treatmentPlanClinicalReason: string;
  setTreatmentPlanClinicalReason: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentPlanDiagnosisSummary: string;
  setTreatmentPlanDiagnosisSummary: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentPlanTeethOrArea: string;
  setTreatmentPlanTeethOrArea: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentPlanGoals: string;
  setTreatmentPlanGoals: (val: string | ((prev: string) => string)) => void;
  treatmentPlanStages: string;
  setTreatmentPlanStages: (val: string | ((prev: string) => string)) => void;
  treatmentPlanEstimatedTotalRub: string;
  setTreatmentPlanEstimatedTotalRub: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentPlanAlternatives: string;
  setTreatmentPlanAlternatives: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentPlanRisks: string;
  setTreatmentPlanRisks: (val: string | ((prev: string) => string)) => void;
  treatmentPlanPrognosis: string;
  setTreatmentPlanPrognosis: (val: string | ((prev: string) => string)) => void;
  treatmentPlanControlPlan: string;
  setTreatmentPlanControlPlan: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentPlanDoctorFullName: string;
  setTreatmentPlanDoctorFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentPlanPlannedAt: string;
  setTreatmentPlanPlannedAt: (val: string | ((prev: string) => string)) => void;
  treatmentPlanQuestionsAnswered: boolean;
  setTreatmentPlanQuestionsAnswered: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  treatmentPlanSeparateConsentAcknowledged: boolean;
  setTreatmentPlanSeparateConsentAcknowledged: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  treatmentPlanNewApprovalAcknowledged: boolean;
  setTreatmentPlanNewApprovalAcknowledged: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  treatmentPlanPatientFriendlyExplanation: string;
  setTreatmentPlanPatientFriendlyExplanation: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentPlanPatientHygieneAdvice: string;
  setTreatmentPlanPatientHygieneAdvice: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentPlanCustomHygieneTextOverride: string;
  setTreatmentPlanCustomHygieneTextOverride: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptanceVariant: TreatmentPlanAcceptanceVariant;
  setTreatmentAcceptanceVariant: (
    val:
      | TreatmentPlanAcceptanceVariant
      | ((
          prev: TreatmentPlanAcceptanceVariant,
        ) => TreatmentPlanAcceptanceVariant),
  ) => void;
  treatmentAcceptanceClinicalGoal: string;
  setTreatmentAcceptanceClinicalGoal: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptanceDiagnosisSummary: string;
  setTreatmentAcceptanceDiagnosisSummary: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptanceTeethOrArea: string;
  setTreatmentAcceptanceTeethOrArea: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptanceStages: string;
  setTreatmentAcceptanceStages: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptanceEstimatedTotalRub: string;
  setTreatmentAcceptanceEstimatedTotalRub: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptanceEstimateValidUntil: string;
  setTreatmentAcceptanceEstimateValidUntil: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptancePaymentTerms: string;
  setTreatmentAcceptancePaymentTerms: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptanceRejectedAlternatives: string;
  setTreatmentAcceptanceRejectedAlternatives: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptanceRisks: string;
  setTreatmentAcceptanceRisks: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptanceWarrantyTerms: string;
  setTreatmentAcceptanceWarrantyTerms: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptanceDoctorFullName: string;
  setTreatmentAcceptanceDoctorFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptanceAcceptedAt: string;
  setTreatmentAcceptanceAcceptedAt: (
    val: string | ((prev: string) => string),
  ) => void;
  treatmentAcceptanceQuestionsAnswered: boolean;
  setTreatmentAcceptanceQuestionsAnswered: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  treatmentAcceptanceAlternativesUnderstood: boolean;
  setTreatmentAcceptanceAlternativesUnderstood: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  treatmentAcceptanceCostChangeUnderstood: boolean;
  setTreatmentAcceptanceCostChangeUnderstood: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  treatmentAcceptanceRevisionAcknowledged: boolean;
  setTreatmentAcceptanceRevisionAcknowledged: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  postVisitCareTopic: PostVisitCareTopic;
  setPostVisitCareTopic: (
    val:
      | PostVisitCareTopic
      | ((prev: PostVisitCareTopic) => PostVisitCareTopic),
  ) => void;
  postVisitProcedureName: any;
  setPostVisitProcedureName: (val: any | ((prev: any) => any)) => void;
  postVisitToothOrArea: string;
  setPostVisitToothOrArea: (val: string | ((prev: string) => string)) => void;
  postVisitPerformedAt: string;
  setPostVisitPerformedAt: (val: string | ((prev: string) => string)) => void;
  postVisitDoctorFullName: string;
  setPostVisitDoctorFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  postVisitManualEdited: boolean;
  setPostVisitManualEdited: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  postVisitPresetFeedback: string;
  setPostVisitPresetFeedback: (
    val: string | ((prev: string) => string),
  ) => void;
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
  setPostVisitClinicContactInstruction: (
    val: string | ((prev: string) => string),
  ) => void;
  postVisitTelegramSummary: any;
  setPostVisitTelegramSummary: (val: any | ((prev: any) => any)) => void;
  postVisitPrintedCopyReceived: boolean;
  setPostVisitPrintedCopyReceived: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  postVisitUrgentSignsUnderstood: boolean;
  setPostVisitUrgentSignsUnderstood: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  postVisitTelegramSafe: boolean;
  setPostVisitTelegramSafe: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  anesthesiaMethod: string;
  setAnesthesiaMethod: (val: string | ((prev: string) => string)) => void;
  anesthesiaAnesthetic: string;
  setAnesthesiaAnesthetic: (val: string | ((prev: string) => string)) => void;
  anesthesiaVasoconstrictor: string;
  setAnesthesiaVasoconstrictor: (
    val: string | ((prev: string) => string),
  ) => void;
  anesthesiaZone: string;
  setAnesthesiaZone: (val: string | ((prev: string) => string)) => void;
  anesthesiaAllergyStatus: string;
  setAnesthesiaAllergyStatus: (
    val: string | ((prev: string) => string),
  ) => void;
  anesthesiaRestrictionNotes: string;
  setAnesthesiaRestrictionNotes: (
    val: string | ((prev: string) => string),
  ) => void;
  anesthesiaDoseTime: string;
  setAnesthesiaDoseTime: (val: string | ((prev: string) => string)) => void;
  anesthesiaDoseMl: string;
  setAnesthesiaDoseMl: (val: string | ((prev: string) => string)) => void;
  anesthesiaReaction: string;
  setAnesthesiaReaction: (val: string | ((prev: string) => string)) => void;
  anesthesiaRisksExplained: boolean;
  setAnesthesiaRisksExplained: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  anesthesiaAllergyRestrictionsChecked: boolean;
  setAnesthesiaAllergyRestrictionsChecked: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  anesthesiaConsentConfirmed: boolean;
  setAnesthesiaConsentConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  prescriptionMedication: string;
  setPrescriptionMedication: (val: string | ((prev: string) => string)) => void;
  prescriptionDosage: string;
  setPrescriptionDosage: (val: string | ((prev: string) => string)) => void;
  prescriptionInstructions: string;
  setPrescriptionInstructions: (
    val: string | ((prev: string) => string),
  ) => void;
  prescriptionDuration: string;
  setPrescriptionDuration: (val: string | ((prev: string) => string)) => void;
  prescriptionSafetyNotes: string;
  setPrescriptionSafetyNotes: (
    val: string | ((prev: string) => string),
  ) => void;
  prescriptionUrgentContactReason: string;
  setPrescriptionUrgentContactReason: (
    val: string | ((prev: string) => string),
  ) => void;
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
  setPhotoVideoLabTransferAllowed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  photoVideoColleagueConsultationAllowed: boolean;
  setPhotoVideoColleagueConsultationAllowed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  photoVideoEducationUseAllowed: boolean;
  setPhotoVideoEducationUseAllowed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  photoVideoMarketingUseAllowed: boolean;
  setPhotoVideoMarketingUseAllowed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  photoVideoRecognizablePublicationAllowed: boolean;
  setPhotoVideoRecognizablePublicationAllowed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  photoVideoClinicalRecordUseConfirmed: boolean;
  setPhotoVideoClinicalRecordUseConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  photoVideoAnonymizationConfirmed: boolean;
  setPhotoVideoAnonymizationConfirmed: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  photoVideoMaterials: PhotoVideoConsentMaterial[];
  setPhotoVideoMaterials: (
    val:
      | PhotoVideoConsentMaterial[]
      | ((prev: PhotoVideoConsentMaterial[]) => PhotoVideoConsentMaterial[]),
  ) => void;
  photoVideoRevocationChannel: string;
  setPhotoVideoRevocationChannel: (
    val: string | ((prev: string) => string),
  ) => void;
  photoVideoScopeNotes: string;
  setPhotoVideoScopeNotes: (val: string | ((prev: string) => string)) => void;
  xrayStudyType: XrayCbctReferralStudyType;
  setXrayStudyType: (
    val:
      | XrayCbctReferralStudyType
      | ((prev: XrayCbctReferralStudyType) => XrayCbctReferralStudyType),
  ) => void;
  xrayArea: string;
  setXrayArea: (val: string | ((prev: string) => string)) => void;
  xrayClinicalQuestion: string;
  setXrayClinicalQuestion: (val: string | ((prev: string) => string)) => void;
  xrayIndication: string;
  setXrayIndication: (val: string | ((prev: string) => string)) => void;
  xrayPregnancyStatus: XrayCbctReferralPregnancyStatus;
  setXrayPregnancyStatus: (
    val:
      | XrayCbctReferralPregnancyStatus
      | ((
          prev: XrayCbctReferralPregnancyStatus,
        ) => XrayCbctReferralPregnancyStatus),
  ) => void;
  xraySafetyNotes: string;
  setXraySafetyNotes: (val: string | ((prev: string) => string)) => void;
  xrayPriority: XrayCbctReferralPriority;
  setXrayPriority: (
    val:
      | XrayCbctReferralPriority
      | ((prev: XrayCbctReferralPriority) => XrayCbctReferralPriority),
  ) => void;
  xrayIncludeDicomExport: boolean;
  setXrayIncludeDicomExport: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  xrayIncludeRadiologistReport: boolean;
  setXrayIncludeRadiologistReport: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  xrayRequestedBy: string;
  setXrayRequestedBy: (val: string | ((prev: string) => string)) => void;
  xrayRecipientClinic: string;
  setXrayRecipientClinic: (val: string | ((prev: string) => string)) => void;
  xrayDueDate: string;
  setXrayDueDate: (val: string | ((prev: string) => string)) => void;
  recordExtractPeriodStart: string;
  setRecordExtractPeriodStart: (
    val: string | ((prev: string) => string),
  ) => void;
  recordExtractPeriodEnd: string;
  setRecordExtractPeriodEnd: (val: string | ((prev: string) => string)) => void;
  recordExtractSourceVisitIds: string;
  setRecordExtractSourceVisitIds: (
    val: string | ((prev: string) => string),
  ) => void;
  recordExtractComplaintAndAnamnesis: string;
  setRecordExtractComplaintAndAnamnesis: (
    val: string | ((prev: string) => string),
  ) => void;
  recordExtractObjectiveStatus: string;
  setRecordExtractObjectiveStatus: (
    val: string | ((prev: string) => string),
  ) => void;
  recordExtractDiagnosis: string;
  setRecordExtractDiagnosis: (val: string | ((prev: string) => string)) => void;
  recordExtractTreatmentProvided: string;
  setRecordExtractTreatmentProvided: (
    val: string | ((prev: string) => string),
  ) => void;
  recordExtractRecommendations: string;
  setRecordExtractRecommendations: (
    val: string | ((prev: string) => string),
  ) => void;
  recordExtractDoctorFullName: string;
  setRecordExtractDoctorFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  recordExtractRecipientFullName: string;
  setRecordExtractRecipientFullName: (
    val: string | ((prev: string) => string),
  ) => void;
  recordExtractRecipientAuthority: string;
  setRecordExtractRecipientAuthority: (
    val: string | ((prev: string) => string),
  ) => void;
  recordExtractIssuedAt: string;
  setRecordExtractIssuedAt: (val: string | ((prev: string) => string)) => void;
  recordExtractPreparedFromSignedRecords: boolean;
  setRecordExtractPreparedFromSignedRecords: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  recordExtractThirdPartyDataChecked: boolean;
  setRecordExtractThirdPartyDataChecked: (
    val: boolean | ((prev: boolean) => boolean),
  ) => void;
  outpatient025uMedicalCardNumber: string;
  setOutpatient025uMedicalCardNumber: (
    val: string | ((prev: string) => string),
  ) => void;
  outpatient025uOpenedAt: string;
  setOutpatient025uOpenedAt: (val: string | ((prev: string) => string)) => void;
  outpatient025uPatientSexCode: "1" | "2" | "unknown";
  setOutpatient025uPatientSexCode: (
    val:
      | "1"
      | "2"
      | "unknown"
      | ((prev: "1" | "2" | "unknown") => "1" | "2" | "unknown"),
  ) => void;
  outpatient025uCitizenship: string;
  setOutpatient025uCitizenship: (
    val: string | ((prev: string) => string),
  ) => void;
  outpatient025uRegistrationUrbanRuralCode: "1" | "2" | "unknown";
  setOutpatient025uRegistrationUrbanRuralCode: (
    val:
      | "1"
      | "2"
      | "unknown"
      | ((prev: "1" | "2" | "unknown") => "1" | "2" | "unknown"),
  ) => void;
  outpatient025uStayUrbanRuralCode: "1" | "2" | "unknown";
  setOutpatient025uStayUrbanRuralCode: (
    val:
      | "1"
      | "2"
      | "unknown"
      | ((prev: "1" | "2" | "unknown") => "1" | "2" | "unknown"),
  ) => void;
  outpatient025uOmsIssuedAt: string;
  setOutpatient025uOmsIssuedAt: (
    val: string | ((prev: string) => string),
  ) => void;
  outpatient025uInsurerName: string;
  setOutpatient025uInsurerName: (
    val: string | ((prev: string) => string),
  ) => void;
  outpatient025uSocialSupportCode: string;
  setOutpatient025uSocialSupportCode: (
    val: string | ((prev: string) => string),
  ) => void;
  outpatient025uHealthStatusDisclosureContact: string;
  setOutpatient025uHealthStatusDisclosureContact: (
    val: string | ((prev: string) => string),
  ) => void;
}

const createDocumentSlice = (set: any) => ({
  documentCreateSavingKind: null,
  setDocumentCreateSavingKind: createSetter(set, "documentCreateSavingKind"),
  documentStatusSavingId: null,
  setDocumentStatusSavingId: createSetter(set, "documentStatusSavingId"),
  selectedTaxPaymentIds: [],
  setSelectedTaxPaymentIds: createSetter(set, "selectedTaxPaymentIds"),
  selectedPaymentReceiptIds: [],
  setSelectedPaymentReceiptIds: createSetter(set, "selectedPaymentReceiptIds"),
  documentIssueConfirmationId: null,
  setDocumentIssueConfirmationId: createSetter(set, "documentIssueConfirmationId"),
  documentIssueSignatureMode: initialUiPreferences.documentIssueSignatureMode,
  setDocumentIssueSignatureMode: createSetter(set, "documentIssueSignatureMode"),
  documentIssueSignedAt: currentLocalDateTimeInputValue,
  setDocumentIssueSignedAt: createSetter(set, "documentIssueSignedAt"),
  documentIssueRecipientFullName: "",
  setDocumentIssueRecipientFullName: createSetter(set, "documentIssueRecipientFullName"),
  documentIssueRecipientRole: "пациент/законный представитель",
  setDocumentIssueRecipientRole: createSetter(set, "documentIssueRecipientRole"),
  documentIssueStaffFullName:
    initialUiPreferences.documentIssueStaffFullName || "",
  setDocumentIssueStaffFullName: createSetter(set, "documentIssueStaffFullName"),
  documentIssueStaffRole: initialUiPreferences.documentIssueStaffRole || "",
  setDocumentIssueStaffRole: createSetter(set, "documentIssueStaffRole"),
  documentIssueNote: "",
  setDocumentIssueNote: createSetter(set, "documentIssueNote"),
  documentIssueIdentityChecked: false,
  setDocumentIssueIdentityChecked: createSetter(set, "documentIssueIdentityChecked"),
  documentIssueDocumentOpenedAndChecked: false,
  setDocumentIssueDocumentOpenedAndChecked: createSetter(set, "documentIssueDocumentOpenedAndChecked"),
  documentIssueRecipientSigned: false,
  setDocumentIssueRecipientSigned: createSetter(set, "documentIssueRecipientSigned"),
  documentIssueClinicSigned: false,
  setDocumentIssueClinicSigned: createSetter(set, "documentIssueClinicSigned"),
  documentVoidConfirmationId: null,
  setDocumentVoidConfirmationId: createSetter(set, "documentVoidConfirmationId"),
  documentVoidReasonCode: "draft_error",
  setDocumentVoidReasonCode: createSetter(set, "documentVoidReasonCode"),
  documentVoidReasonText: "",
  setDocumentVoidReasonText: createSetter(set, "documentVoidReasonText"),
  documentVoidStaffFullName:
    initialUiPreferences.documentIssueStaffFullName || "",
  setDocumentVoidStaffFullName: createSetter(set, "documentVoidStaffFullName"),
  documentVoidStaffRole: initialUiPreferences.documentIssueStaffRole || "",
  setDocumentVoidStaffRole: createSetter(set, "documentVoidStaffRole"),
  documentVoidCorrectionDocumentId: "",
  setDocumentVoidCorrectionDocumentId: createSetter(set, "documentVoidCorrectionDocumentId"),
  documentVoidReplacementRequired: false,
  setDocumentVoidReplacementRequired: createSetter(set, "documentVoidReplacementRequired"),
  documentVoidPatientOrPayerNotified: false,
  setDocumentVoidPatientOrPayerNotified: createSetter(set, "documentVoidPatientOrPayerNotified"),
  documentVoidArchivePreserved: false,
  setDocumentVoidArchivePreserved: createSetter(set, "documentVoidArchivePreserved"),
  documentVoidStatusReviewed: false,
  setDocumentVoidStatusReviewed: createSetter(set, "documentVoidStatusReviewed"),
  documentAuditFacts: null,
  selectedDocumentKind: "treatment_plan",
  setSelectedDocumentKind: createSetter(set, "selectedDocumentKind"),
  isDocumentIngesting: false,
  setIsDocumentIngesting: createSetter(set, "isDocumentIngesting"),
  setDocumentAuditFacts: createSetter(set, "documentAuditFacts"),
  documentAuditFactsLoadingId: null,
  setDocumentAuditFactsLoadingId: createSetter(set, "documentAuditFactsLoadingId"),
  documentIngestionTarget: initialUiPreferences.documentIngestionTarget,
  setDocumentIngestionTarget: createSetter(set, "documentIngestionTarget"),
  documentIngestion: null,
  setDocumentIngestion: createSetter(set, "documentIngestion"),
});

const createTaxSlice = (set: any) => ({
  taxDocumentPayerInn: "",
  setTaxDocumentPayerInn: createSetter(set, "taxDocumentPayerInn"),
  taxApplicationTaxpayerFullName: "",
  setTaxApplicationTaxpayerFullName: createSetter(set, "taxApplicationTaxpayerFullName"),
  taxApplicationTaxpayerInn: "",
  setTaxApplicationTaxpayerInn: createSetter(set, "taxApplicationTaxpayerInn"),
  taxApplicationTaxpayerBirthDate: "",
  setTaxApplicationTaxpayerBirthDate: createSetter(set, "taxApplicationTaxpayerBirthDate"),
  taxApplicationTaxpayerIdentityDocument: "",
  setTaxApplicationTaxpayerIdentityDocument: createSetter(set, "taxApplicationTaxpayerIdentityDocument"),
  taxApplicationRelationship: "self",
  setTaxApplicationRelationship: createSetter(set, "taxApplicationRelationship"),
  taxApplicationForm: initialUiPreferences.taxApplicationForm,
  setTaxApplicationForm: createSetter(set, "taxApplicationForm"),
  taxApplicationDeliveryChannel:
    initialUiPreferences.taxApplicationDeliveryChannel,
  setTaxApplicationDeliveryChannel: createSetter(set, "taxApplicationDeliveryChannel"),
  taxApplicationContact: "",
  setTaxApplicationContact: createSetter(set, "taxApplicationContact"),
  taxApplicationAuthorityDocument: "",
  setTaxApplicationAuthorityDocument: createSetter(set, "taxApplicationAuthorityDocument"),
  taxApplicationRequestedAt: (() =>
    toDateTimeLocalValue(new Date().toISOString()))(),
  setTaxApplicationRequestedAt: createSetter(set, "taxApplicationRequestedAt"),
  taxApplicationDuplicateWarningAccepted: false,
  setTaxApplicationDuplicateWarningAccepted: createSetter(set, "taxApplicationDuplicateWarningAccepted"),
  taxDocumentYear:
    initialUiPreferences?.taxDocumentYear ?? new Date().getFullYear(),
  setTaxDocumentYear: createSetter(set, "taxDocumentYear"),
});

const createIntakeAndConsentSlice = (set: any) => ({
  intakeChiefComplaint: "",
  setIntakeChiefComplaint: createSetter(set, "intakeChiefComplaint"),
  intakeAllergyStatus:
    "Аллергии и нежелательные реакции со слов пациента не отмечены.",
  setIntakeAllergyStatus: createSetter(set, "intakeAllergyStatus"),
  intakeCurrentMedications:
    "Постоянные препараты со слов пациента не принимает.",
  setIntakeCurrentMedications: createSetter(set, "intakeCurrentMedications"),
  intakeChronicConditions: "Хронические заболевания со слов пациента отрицает.",
  setIntakeChronicConditions: createSetter(set, "intakeChronicConditions"),
  intakePregnancyStatus: "unknown",
  setIntakePregnancyStatus: createSetter(set, "intakePregnancyStatus"),
  intakeAnticoagulants:
    "Антикоагулянты и препараты, влияющие на кровотечение, со слов пациента не принимает.",
  setIntakeAnticoagulants: createSetter(set, "intakeAnticoagulants"),
  intakeInfectiousRiskNotes: "Инфекционные риски со слов пациента не заявлены.",
  setIntakeInfectiousRiskNotes: createSetter(set, "intakeInfectiousRiskNotes"),
  intakeCardioEndocrineNotes:
    "Сердечно-сосудистые, эндокринные и иные системные риски требуют уточнения врачом перед вмешательством.",
  setIntakeCardioEndocrineNotes: createSetter(set, "intakeCardioEndocrineNotes"),
  intakeEmergencyContact: "",
  setIntakeEmergencyContact: createSetter(set, "intakeEmergencyContact"),
  intakeAdditionalNotes: "",
  setIntakeAdditionalNotes: createSetter(set, "intakeAdditionalNotes"),
  intakeAccuracyConfirmed: false,
  setIntakeAccuracyConfirmed: createSetter(set, "intakeAccuracyConfirmed"),
  informedConsentIntervention:
    "Стоматологическое вмешательство по согласованному плану",
  setInformedConsentIntervention: createSetter(set, "informedConsentIntervention"),
  informedConsentToothOrArea: "",
  setInformedConsentToothOrArea: createSetter(set, "informedConsentToothOrArea"),
  informedConsentDiagnosisOrIndication: "",
  setInformedConsentDiagnosisOrIndication: createSetter(set, "informedConsentDiagnosisOrIndication"),
  informedConsentExpectedBenefit:
    "снижение боли, восстановление функции, профилактика осложнений и сохранение стоматологического здоровья",
  setInformedConsentExpectedBenefit: createSetter(set, "informedConsentExpectedBenefit"),
  informedConsentAnesthesia: "местная анестезия по показаниям",
  setInformedConsentAnesthesia: createSetter(set, "informedConsentAnesthesia"),
  informedConsentMaterialNotes: "",
  setInformedConsentMaterialNotes: createSetter(set, "informedConsentMaterialNotes"),
  informedConsentTrustedContact:
    "не разрешаю сообщать медицинские сведения третьим лицам",
  setInformedConsentTrustedContact: createSetter(set, "informedConsentTrustedContact"),
  informedConsentRisks:
    "боль, отек, кровотечение или временный дискомфорт\nаллергическая реакция на препараты или материалы\nнеобходимость повторного приема или изменения плана лечения\nограниченный прогноз при исходном состоянии зубов и тканей",
  setInformedConsentRisks: createSetter(set, "informedConsentRisks"),
  informedConsentAlternatives:
    "отложить вмешательство и наблюдать состояние\nполучить второе мнение\nвыбрать альтернативный метод лечения при наличии показаний\nотказаться от вмешательства с фиксацией возможных последствий",
  setInformedConsentAlternatives: createSetter(set, "informedConsentAlternatives"),
  informedConsentAftercare:
    "соблюдать рекомендации врача и режим приема препаратов\nне принимать пищу до окончания действия анестезии, если она применялась\nсвязаться с клиникой при нарастающей боли, отеке, кровотечении, температуре или аллергической реакции\nявиться на контрольный прием в согласованный срок",
  setInformedConsentAftercare: createSetter(set, "informedConsentAftercare"),
  informedConsentDoctorFullName: "",
  setInformedConsentDoctorFullName: createSetter(set, "informedConsentDoctorFullName"),
  informedConsentConfirmedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setInformedConsentConfirmedAt: createSetter(set, "informedConsentConfirmedAt"),
  informedConsentQuestionsAnswered: false,
  setInformedConsentQuestionsAnswered: createSetter(set, "informedConsentQuestionsAnswered"),
  informedConsentRisksUnderstood: false,
  setInformedConsentRisksUnderstood: createSetter(set, "informedConsentRisksUnderstood"),
  informedConsentWithdrawUnderstood: false,
  setInformedConsentWithdrawUnderstood: createSetter(set, "informedConsentWithdrawUnderstood"),
  procedureConsentProcedureType:
    initialUiPreferences.procedureConsentProcedureType,
  setProcedureConsentProcedureType: createSetter(set, "procedureConsentProcedureType"),
  procedureConsentProcedureName: "Лечение зуба по согласованному плану",
  setProcedureConsentProcedureName: createSetter(set, "procedureConsentProcedureName"),
  procedureConsentToothOrArea: "",
  setProcedureConsentToothOrArea: createSetter(set, "procedureConsentToothOrArea"),
  procedureConsentDiagnosisOrIndication: "",
  setProcedureConsentDiagnosisOrIndication: createSetter(set, "procedureConsentDiagnosisOrIndication"),
  procedureConsentAnesthesia: "местная анестезия по показаниям",
  setProcedureConsentAnesthesia: createSetter(set, "procedureConsentAnesthesia"),
  procedureConsentMaterials: "",
  setProcedureConsentMaterials: createSetter(set, "procedureConsentMaterials"),
  procedureConsentPatientRiskFactors:
    "аллергии, постоянные препараты и хронические заболевания уточнены перед процедурой\nбеременность, антикоагулянты и инфекционные риски уточнены перед процедурой",
  setProcedureConsentPatientRiskFactors: createSetter(set, "procedureConsentPatientRiskFactors"),
  procedureConsentSpecificRisks:
    "боль, отек, кровоточивость или временный дискомфорт\nнеобходимость повторного приема, коррекции или изменения плана\nаллергическая реакция на препараты или материалы",
  setProcedureConsentSpecificRisks: createSetter(set, "procedureConsentSpecificRisks"),
  procedureConsentAlternatives:
    "отложить процедуру и наблюдать состояние\nвыбрать альтернативный метод лечения при наличии показаний\nполучить второе мнение\nотказаться от процедуры с фиксацией возможных последствий",
  setProcedureConsentAlternatives: createSetter(set, "procedureConsentAlternatives"),
  procedureConsentAftercare:
    "соблюдать рекомендации врача после процедуры\nне принимать пищу до окончания действия анестезии, если она применялась\nсвязаться с клиникой при боли, отеке, кровотечении, температуре или аллергической реакции\nявиться на контрольный прием в согласованный срок",
  setProcedureConsentAftercare: createSetter(set, "procedureConsentAftercare"),
  procedureConsentDoctorFullName: "",
  setProcedureConsentDoctorFullName: createSetter(set, "procedureConsentDoctorFullName"),
  procedureConsentConfirmedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setProcedureConsentConfirmedAt: createSetter(set, "procedureConsentConfirmedAt"),
  procedureConsentLocalFormAttached: false,
  setProcedureConsentLocalFormAttached: createSetter(set, "procedureConsentLocalFormAttached"),
  procedureConsentQuestionsAnswered: false,
  setProcedureConsentQuestionsAnswered: createSetter(set, "procedureConsentQuestionsAnswered"),
  procedureConsentExactProcedureConfirmed: false,
  setProcedureConsentExactProcedureConfirmed: createSetter(set, "procedureConsentExactProcedureConfirmed"),
  procedureConsentRisksUnderstood: false,
  setProcedureConsentRisksUnderstood: createSetter(set, "procedureConsentRisksUnderstood"),
  photoVideoLabTransferAllowed: true,
  setPhotoVideoLabTransferAllowed: createSetter(set, "photoVideoLabTransferAllowed"),
  photoVideoColleagueConsultationAllowed: true,
  setPhotoVideoColleagueConsultationAllowed: createSetter(set, "photoVideoColleagueConsultationAllowed"),
  photoVideoEducationUseAllowed: false,
  setPhotoVideoEducationUseAllowed: createSetter(set, "photoVideoEducationUseAllowed"),
  photoVideoMarketingUseAllowed: false,
  setPhotoVideoMarketingUseAllowed: createSetter(set, "photoVideoMarketingUseAllowed"),
  photoVideoRecognizablePublicationAllowed: false,
  setPhotoVideoRecognizablePublicationAllowed: createSetter(set, "photoVideoRecognizablePublicationAllowed"),
  photoVideoClinicalRecordUseConfirmed: false,
  setPhotoVideoClinicalRecordUseConfirmed: createSetter(set, "photoVideoClinicalRecordUseConfirmed"),
  photoVideoAnonymizationConfirmed: false,
  setPhotoVideoAnonymizationConfirmed: createSetter(set, "photoVideoAnonymizationConfirmed"),
  photoVideoMaterials: ["intraoral_photo", "xray", "scan"],
  setPhotoVideoMaterials: createSetter(set, "photoVideoMaterials"),
  photoVideoRevocationChannel:
    "письменное заявление в клинике или защищенное обращение через портал пациента",
  setPhotoVideoRevocationChannel: createSetter(set, "photoVideoRevocationChannel"),
  photoVideoScopeNotes: "",
  setPhotoVideoScopeNotes: createSetter(set, "photoVideoScopeNotes"),
  personalDataCrossBorderAllowed: false,
  setPersonalDataCrossBorderAllowed: createSetter(set, "personalDataCrossBorderAllowed"),
  personalDataAutomatedDecisionAllowed: false,
  setPersonalDataAutomatedDecisionAllowed: createSetter(set, "personalDataAutomatedDecisionAllowed"),
  personalDataConsentGivenAt: new Date().toLocaleString("ru-RU"),
  setPersonalDataConsentGivenAt: createSetter(set, "personalDataConsentGivenAt"),
  personalDataVoluntaryConsentConfirmed: false,
  setPersonalDataVoluntaryConsentConfirmed: createSetter(set, "personalDataVoluntaryConsentConfirmed"),
  personalDataMedicalProcessingAcknowledged: false,
  setPersonalDataMedicalProcessingAcknowledged: createSetter(set, "personalDataMedicalProcessingAcknowledged"),
  refusalIntervention: "",
  setRefusalIntervention: createSetter(set, "refusalIntervention"),
  refusalClinicalIndication: "",
  setRefusalClinicalIndication: createSetter(set, "refusalClinicalIndication"),
  refusalPatientReason: "",
  setRefusalPatientReason: createSetter(set, "refusalPatientReason"),
  refusalDoctorFullName: "",
  setRefusalDoctorFullName: createSetter(set, "refusalDoctorFullName"),
  refusalConfirmedAt: new Date().toLocaleString("ru-RU"),
  setRefusalConfirmedAt: createSetter(set, "refusalConfirmedAt"),
  refusalConsequencesUnderstood: false,
  setRefusalConsequencesUnderstood: createSetter(set, "refusalConsequencesUnderstood"),
  refusalSecondOpinionOffered: false,
  setRefusalSecondOpinionOffered: createSetter(set, "refusalSecondOpinionOffered"),
  refusalEmergencyCareExplained: false,
  setRefusalEmergencyCareExplained: createSetter(set, "refusalEmergencyCareExplained"),
  personalDataPurposes:
    "оказание стоматологической медицинской помощи\nведение медицинской карты и медицинской документации\nрасчеты, договоры, акты и налоговые документы\nуведомления о визитах, рекомендациях и готовности документов",
  setPersonalDataPurposes: createSetter(set, "personalDataPurposes"),
  personalDataCategories:
    "ФИО, дата рождения, телефон, email и адреса\nпаспортные данные, ИНН, СНИЛС, полис ОМС или ДМС\nсведения о здоровье, диагнозы, снимки, планы лечения и назначения\nплатежные документы, договоры, акты и налоговые заявления",
  setPersonalDataCategories: createSetter(set, "personalDataCategories"),
  personalDataActions:
    "сбор\nзапись\nсистематизация\nхранение\nуточнение\nиспользование\nпередача по законному основанию\nобезличивание\nудаление после окончания срока хранения",
  setPersonalDataActions: createSetter(set, "personalDataActions"),
  personalDataTransferRules:
    "Передача возможна только зуботехническим лабораториям, платежным и фискальным сервисам, страховым организациям, ИТ-подрядчикам с договором конфиденциальности, государственным органам по закону и пациентскому порталу по защищенному каналу.",
  setPersonalDataTransferRules: createSetter(set, "personalDataTransferRules"),
  personalDataRetentionPeriod:
    "в течение срока оказания помощи и обязательного срока хранения медицинской и бухгалтерской документации",
  setPersonalDataRetentionPeriod: createSetter(set, "personalDataRetentionPeriod"),
  personalDataRevocationChannel:
    "письменное заявление в клинике или защищенное обращение через портал пациента",
  setPersonalDataRevocationChannel: createSetter(set, "personalDataRevocationChannel"),
  refusalExplainedRisks:
    "усиление боли\nраспространение инфекции\nпотеря возможности сохранить зуб или ткани\nнеобходимость экстренного обращения при ухудшении",
  setRefusalExplainedRisks: createSetter(set, "refusalExplainedRisks"),
  refusalAlternatives:
    "повторная консультация\nобезболивание и контроль состояния\nвторое мнение профильного врача\nобращение в дежурную стоматологию при ухудшении",
  setRefusalAlternatives: createSetter(set, "refusalAlternatives"),
  refusalUrgentWarningSigns:
    "отек лица или шеи\nтемпература\nзатруднение глотания или дыхания\nкровотечение\nнарастающая боль",
  setRefusalUrgentWarningSigns: createSetter(set, "refusalUrgentWarningSigns"),
});

const createFinancialSlice = (set: any) => ({
  paidContractNumber: "",
  setPaidContractNumber: createSetter(set, "paidContractNumber"),
  paidContractDate: (() => new Date().toLocaleDateString("ru-RU"))(),
  setPaidContractDate: createSetter(set, "paidContractDate"),
  paidContractServiceStart: "",
  setPaidContractServiceStart: createSetter(set, "paidContractServiceStart"),
  paidContractServiceEnd:
    "до полного оказания согласованных услуг или подписания акта",
  setPaidContractServiceEnd: createSetter(set, "paidContractServiceEnd"),
  paidContractCustomerFullName: "",
  setPaidContractCustomerFullName: createSetter(set, "paidContractCustomerFullName"),
  paidContractRepresentativeFullName: "",
  setPaidContractRepresentativeFullName: createSetter(set, "paidContractRepresentativeFullName"),
  paidContractCareReason: "",
  setPaidContractCareReason: createSetter(set, "paidContractCareReason"),
  paidContractServiceScope: "",
  setPaidContractServiceScope: createSetter(set, "paidContractServiceScope"),
  paidContractTotalRub: "",
  setPaidContractTotalRub: createSetter(set, "paidContractTotalRub"),
  paidContractPaymentTerms:
    "оплата до или в день оказания услуги с выдачей кассового чека",
  setPaidContractPaymentTerms: createSetter(set, "paidContractPaymentTerms"),
  paidContractPriceChangeRules:
    "изменение объема, состава или стоимости платных услуг оформляется до оказания дополнительным соглашением или новым договором",
  setPaidContractPriceChangeRules: createSetter(set, "paidContractPriceChangeRules"),
  paidContractFreeCareNotice:
    "пациенту разъяснена возможность получения медицинской помощи в рамках программы государственных гарантий при наличии оснований и маршрутизации",
  setPaidContractFreeCareNotice: createSetter(set, "paidContractFreeCareNotice"),
  paidContractRecommendationWarning:
    "несоблюдение назначений, режима лечения и рекомендаций врача может снизить качество услуги, изменить сроки лечения или отрицательно сказаться на состоянии здоровья",
  setPaidContractRecommendationWarning: createSetter(set, "paidContractRecommendationWarning"),
  paidContractRefundTerms:
    "при отказе пациента от услуг оплачиваются фактически понесенные исполнителем расходы и фактически оказанные услуги; возврат оформляется по кассовым и бухгалтерским правилам клиники",
  setPaidContractRefundTerms: createSetter(set, "paidContractRefundTerms"),
  paidContractWarrantyTerms:
    "гарантийные и претензионные условия действуют по локальным правилам клиники, медицинским показаниям и при соблюдении рекомендаций врача",
  setPaidContractWarrantyTerms: createSetter(set, "paidContractWarrantyTerms"),
  paidContractDoctorFullName: "",
  setPaidContractDoctorFullName: createSetter(set, "paidContractDoctorFullName"),
  paidContractSignedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setPaidContractSignedAt: createSetter(set, "paidContractSignedAt"),
  paidContractClinicInfoConfirmed: false,
  setPaidContractClinicInfoConfirmed: createSetter(set, "paidContractClinicInfoConfirmed"),
  paidContractServiceListConfirmed: false,
  setPaidContractServiceListConfirmed: createSetter(set, "paidContractServiceListConfirmed"),
  paidContractPaidBasisConfirmed: false,
  setPaidContractPaidBasisConfirmed: createSetter(set, "paidContractPaidBasisConfirmed"),
  paidContractWrittenChangesConfirmed: false,
  setPaidContractWrittenChangesConfirmed: createSetter(set, "paidContractWrittenChangesConfirmed"),
  paymentInvoiceNumber: "",
  setPaymentInvoiceNumber: createSetter(set, "paymentInvoiceNumber"),
  paymentInvoiceDate: (() => new Date().toLocaleDateString("ru-RU"))(),
  setPaymentInvoiceDate: createSetter(set, "paymentInvoiceDate"),
  paymentInvoicePayerFullName: "",
  setPaymentInvoicePayerFullName: createSetter(set, "paymentInvoicePayerFullName"),
  paymentInvoicePayerPhone: "",
  setPaymentInvoicePayerPhone: createSetter(set, "paymentInvoicePayerPhone"),
  paymentInvoicePayerEmail: "",
  setPaymentInvoicePayerEmail: createSetter(set, "paymentInvoicePayerEmail"),
  paymentInvoicePurpose:
    "оплата стоматологических услуг по согласованному плану лечения",
  setPaymentInvoicePurpose: createSetter(set, "paymentInvoicePurpose"),
  paymentInvoiceDueDate: (() => dateInputValuePlusDays(7))(),
  setPaymentInvoiceDueDate: createSetter(set, "paymentInvoiceDueDate"),
  paymentInvoicePaymentTerms:
    "оплата до или в день оказания услуги; после оплаты выдается кассовый чек",
  setPaymentInvoicePaymentTerms: createSetter(set, "paymentInvoicePaymentTerms"),
  paymentInvoiceBankDetails: "",
  setPaymentInvoiceBankDetails: createSetter(set, "paymentInvoiceBankDetails"),
  paymentInvoiceQrPayload: "",
  setPaymentInvoiceQrPayload: createSetter(set, "paymentInvoiceQrPayload"),
  paymentInvoiceCashlessAllowed: true,
  setPaymentInvoiceCashlessAllowed: createSetter(set, "paymentInvoiceCashlessAllowed"),
  paymentInvoiceCashDeskAllowed: true,
  setPaymentInvoiceCashDeskAllowed: createSetter(set, "paymentInvoiceCashDeskAllowed"),
  paymentInvoiceRequisitesVerified: false,
  setPaymentInvoiceRequisitesVerified: createSetter(set, "paymentInvoiceRequisitesVerified"),
  paymentInvoiceServiceScopeConfirmed: false,
  setPaymentInvoiceServiceScopeConfirmed: createSetter(set, "paymentInvoiceServiceScopeConfirmed"),
  paymentInvoiceFiscalNoticeConfirmed: false,
  setPaymentInvoiceFiscalNoticeConfirmed: createSetter(set, "paymentInvoiceFiscalNoticeConfirmed"),
  paymentReceiptNumber: "",
  setPaymentReceiptNumber: createSetter(set, "paymentReceiptNumber"),
  paymentReceiptDate: (() => new Date().toLocaleString("ru-RU"))(),
  setPaymentReceiptDate: createSetter(set, "paymentReceiptDate"),
  paymentReceiptPayerFullName: "",
  setPaymentReceiptPayerFullName: createSetter(set, "paymentReceiptPayerFullName"),
  paymentReceiptPayerBirthDate: "",
  setPaymentReceiptPayerBirthDate: createSetter(set, "paymentReceiptPayerBirthDate"),
  paymentReceiptPayerInn: "",
  setPaymentReceiptPayerInn: createSetter(set, "paymentReceiptPayerInn"),
  paymentReceiptPayerIdentityDocument: "",
  setPaymentReceiptPayerIdentityDocument: createSetter(set, "paymentReceiptPayerIdentityDocument"),
  paymentReceiptPayerRelationship: "",
  setPaymentReceiptPayerRelationship: createSetter(set, "paymentReceiptPayerRelationship"),
  paymentReceiptTaxSupportRequested:
    initialUiPreferences.paymentReceiptTaxSupportRequested,
  setPaymentReceiptTaxSupportRequested: createSetter(set, "paymentReceiptTaxSupportRequested"),
  paymentReceiptPurpose:
    "оплата стоматологических услуг по выбранным фискальным чекам",
  setPaymentReceiptPurpose: createSetter(set, "paymentReceiptPurpose"),
  paymentReceiptIssuedBy: "",
  setPaymentReceiptIssuedBy: createSetter(set, "paymentReceiptIssuedBy"),
  paymentReceiptPaymentsVerified: false,
  setPaymentReceiptPaymentsVerified: createSetter(set, "paymentReceiptPaymentsVerified"),
  paymentReceiptPayerVerified: false,
  setPaymentReceiptPayerVerified: createSetter(set, "paymentReceiptPayerVerified"),
  paymentReceiptFiscalNoticeConfirmed: false,
  setPaymentReceiptFiscalNoticeConfirmed: createSetter(set, "paymentReceiptFiscalNoticeConfirmed"),
  installmentScheduleNumber: "",
  setInstallmentScheduleNumber: createSetter(set, "installmentScheduleNumber"),
  installmentScheduleDate: (() => new Date().toLocaleDateString("ru-RU"))(),
  setInstallmentScheduleDate: createSetter(set, "installmentScheduleDate"),
  installmentScheduleBaseDocumentTitle: "",
  setInstallmentScheduleBaseDocumentTitle: createSetter(set, "installmentScheduleBaseDocumentTitle"),
  installmentSchedulePayerFullName: "",
  setInstallmentSchedulePayerFullName: createSetter(set, "installmentSchedulePayerFullName"),
  installmentScheduleTotalRub: "",
  setInstallmentScheduleTotalRub: createSetter(set, "installmentScheduleTotalRub"),
  installmentSchedulePrepaidRub: "",
  setInstallmentSchedulePrepaidRub: createSetter(set, "installmentSchedulePrepaidRub"),
  installmentScheduleRows: (() =>
    `Первый платеж | ${dateInputValuePlusDays(7)} | 0 | запланировано\nФинальный платеж | ${dateInputValuePlusDays(21)} | 0 | запланировано`)(),
  setInstallmentScheduleRows: createSetter(set, "installmentScheduleRows"),
  installmentScheduleLatePolicy:
    "при переносе срока администратор фиксирует контакт с пациентом, новый срок и основание переноса до наступления просрочки",
  setInstallmentScheduleLatePolicy: createSetter(set, "installmentScheduleLatePolicy"),
  installmentSchedulePaymentMethodNotes:
    "оплата в кассе клиники, по ссылке или безналично с выдачей кассового чека после оплаты",
  setInstallmentSchedulePaymentMethodNotes: createSetter(set, "installmentSchedulePaymentMethodNotes"),
  installmentScheduleResponsibleFullName: "",
  setInstallmentScheduleResponsibleFullName: createSetter(set, "installmentScheduleResponsibleFullName"),
  installmentScheduleAccepted: false,
  setInstallmentScheduleAccepted: createSetter(set, "installmentScheduleAccepted"),
  installmentScheduleFiscalNoticeConfirmed: false,
  setInstallmentScheduleFiscalNoticeConfirmed: createSetter(set, "installmentScheduleFiscalNoticeConfirmed"),
  installmentScheduleWrittenChangesConfirmed: false,
  setInstallmentScheduleWrittenChangesConfirmed: createSetter(set, "installmentScheduleWrittenChangesConfirmed"),
  warrantyServiceOrWorkName: "",
  setWarrantyServiceOrWorkName: createSetter(set, "warrantyServiceOrWorkName"),
  warrantyCompletedAt: "",
  setWarrantyCompletedAt: createSetter(set, "warrantyCompletedAt"),
  warrantyTeethOrArea: "",
  setWarrantyTeethOrArea: createSetter(set, "warrantyTeethOrArea"),
  warrantyMaterialsOrSystems: "",
  setWarrantyMaterialsOrSystems: createSetter(set, "warrantyMaterialsOrSystems"),
  warrantyPeriod:
    "по локальному гарантийному положению клиники и виду выполненной работы",
  setWarrantyPeriod: createSetter(set, "warrantyPeriod"),
  warrantyControlVisitSchedule:
    "контрольный осмотр по назначению врача; профессиональная гигиена по индивидуальному графику",
  setWarrantyControlVisitSchedule: createSetter(set, "warrantyControlVisitSchedule"),
  warrantyPatientObligations:
    "соблюдать рекомендации врача и режим после лечения\nприходить на контрольные визиты в согласованные сроки\nподдерживать домашнюю гигиену и профессиональную гигиену\nне выполнять самостоятельную коррекцию конструкции или реставрации",
  setWarrantyPatientObligations: createSetter(set, "warrantyPatientObligations"),
  warrantyExcludedRiskFactors:
    "травма, перегрузка, бруксизм или вредные привычки\nновые заболевания или отказ от рекомендованного лечения\nнарушение графика контрольных визитов\nсамостоятельное вмешательство или лечение в другой клинике без согласования",
  setWarrantyExcludedRiskFactors: createSetter(set, "warrantyExcludedRiskFactors"),
  warrantyUrgentContactReasons:
    "острая боль или нарастающий отек\nподвижность, скол или выпадение конструкции\nкровотечение, температура или аллергическая реакция\nнарушение прикуса или невозможность пользоваться конструкцией",
  setWarrantyUrgentContactReasons: createSetter(set, "warrantyUrgentContactReasons"),
  warrantyLinkedActOrContract: "",
  setWarrantyLinkedActOrContract: createSetter(set, "warrantyLinkedActOrContract"),
  warrantyDoctorFullName: "",
  setWarrantyDoctorFullName: createSetter(set, "warrantyDoctorFullName"),
  warrantyIssuedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setWarrantyIssuedAt: createSetter(set, "warrantyIssuedAt"),
  warrantyPolicyApplied: false,
  setWarrantyPolicyApplied: createSetter(set, "warrantyPolicyApplied"),
  warrantyAftercareReceived: false,
  setWarrantyAftercareReceived: createSetter(set, "warrantyAftercareReceived"),
  warrantyControlVisitsUnderstood: false,
  setWarrantyControlVisitsUnderstood: createSetter(set, "warrantyControlVisitsUnderstood"),
  refundAction: "partial_refund",
  setRefundAction: createSetter(set, "refundAction"),
  refundAmountRub: "3800",
  setRefundAmountRub: createSetter(set, "refundAmountRub"),
  refundReason: "",
  setRefundReason: createSetter(set, "refundReason"),
  refundMethod: "card",
  setRefundMethod: createSetter(set, "refundMethod"),
  refundRecipientFullName: "",
  setRefundRecipientFullName: createSetter(set, "refundRecipientFullName"),
  refundRecipientIdentityDocument: "",
  setRefundRecipientIdentityDocument: createSetter(set, "refundRecipientIdentityDocument"),
  refundBankDetails: "",
  setRefundBankDetails: createSetter(set, "refundBankDetails"),
  refundSelectedPaymentId: "",
  setRefundSelectedPaymentId: createSetter(set, "refundSelectedPaymentId"),
  refundOriginalFiscalReceiptNumber: "",
  setRefundOriginalFiscalReceiptNumber: createSetter(set, "refundOriginalFiscalReceiptNumber"),
  refundCorrectionFiscalReceiptNumber: "",
  setRefundCorrectionFiscalReceiptNumber: createSetter(set, "refundCorrectionFiscalReceiptNumber"),
  refundAccountantDecision: "",
  setRefundAccountantDecision: createSetter(set, "refundAccountantDecision"),
  paymentAmount: "3800",
  setPaymentAmount: createSetter(set, "paymentAmount"),
  paymentMethod: initialUiPreferences.paymentMethod,
  setPaymentMethod: createSetter(set, "paymentMethod"),
  paymentFiscalReceiptNumber: "",
  setPaymentFiscalReceiptNumber: createSetter(set, "paymentFiscalReceiptNumber"),
  paymentFiscalReceiptIssuedAt: "",
  setPaymentFiscalReceiptIssuedAt: createSetter(set, "paymentFiscalReceiptIssuedAt"),
  paymentFiscalFn: "",
  setPaymentFiscalFn: createSetter(set, "paymentFiscalFn"),
  paymentFiscalFd: "",
  setPaymentFiscalFd: createSetter(set, "paymentFiscalFd"),
  paymentFiscalFpd: "",
  setPaymentFiscalFpd: createSetter(set, "paymentFiscalFpd"),
  paymentFiscalCashierName: "",
  setPaymentFiscalCashierName: createSetter(set, "paymentFiscalCashierName"),
  paymentFiscalReceiptUrl: "",
  setPaymentFiscalReceiptUrl: createSetter(set, "paymentFiscalReceiptUrl"),
  paymentPayerFullName: "",
  setPaymentPayerFullName: createSetter(set, "paymentPayerFullName"),
  paymentPayerInn: "",
  setPaymentPayerInn: createSetter(set, "paymentPayerInn"),
  paymentPayerBirthDate: "",
  setPaymentPayerBirthDate: createSetter(set, "paymentPayerBirthDate"),
  paymentPayerIdentityDocument: "",
  setPaymentPayerIdentityDocument: createSetter(set, "paymentPayerIdentityDocument"),
  paymentPayerRelationship: "пациент",
  setPaymentPayerRelationship: createSetter(set, "paymentPayerRelationship"),
  paymentTaxDeductionCode: "",
  setPaymentTaxDeductionCode: createSetter(set, "paymentTaxDeductionCode"),
  paymentFeedback: "",
  setPaymentFeedback: createSetter(set, "paymentFeedback"),
});

const createClinicalSlice = (set: any) => ({
  completedActNumber: "",
  setCompletedActNumber: createSetter(set, "completedActNumber"),
  completedActDate: (() => new Date().toLocaleDateString("ru-RU"))(),
  setCompletedActDate: createSetter(set, "completedActDate"),
  completedActContractNumber: "",
  setCompletedActContractNumber: createSetter(set, "completedActContractNumber"),
  completedActLinkedContractDocumentId: "",
  setCompletedActLinkedContractDocumentId: createSetter(set, "completedActLinkedContractDocumentId"),
  completedActServicePeriodStart: "",
  setCompletedActServicePeriodStart: createSetter(set, "completedActServicePeriodStart"),
  completedActServicePeriodEnd: "",
  setCompletedActServicePeriodEnd: createSetter(set, "completedActServicePeriodEnd"),
  completedActDoctorFullName: "",
  setCompletedActDoctorFullName: createSetter(set, "completedActDoctorFullName"),
  completedActServicesSummary: "",
  setCompletedActServicesSummary: createSetter(set, "completedActServicesSummary"),
  completedActTotalRub: "",
  setCompletedActTotalRub: createSetter(set, "completedActTotalRub"),
  completedActPaidRub: "",
  setCompletedActPaidRub: createSetter(set, "completedActPaidRub"),
  completedActFiscalReceipts: "",
  setCompletedActFiscalReceipts: createSetter(set, "completedActFiscalReceipts"),
  completedActPatientClaims: "",
  setCompletedActPatientClaims: createSetter(set, "completedActPatientClaims"),
  completedActLinkedContract: false,
  setCompletedActLinkedContract: createSetter(set, "completedActLinkedContract"),
  completedActFinalScopeConfirmed: false,
  setCompletedActFinalScopeConfirmed: createSetter(set, "completedActFinalScopeConfirmed"),
  completedActFiscalReceiptsVerified: false,
  setCompletedActFiscalReceiptsVerified: createSetter(set, "completedActFiscalReceiptsVerified"),
  completedActAccepted: false,
  setCompletedActAccepted: createSetter(set, "completedActAccepted"),
  treatmentEstimateNumber: "",
  setTreatmentEstimateNumber: createSetter(set, "treatmentEstimateNumber"),
  treatmentEstimateDate: (() => new Date().toLocaleDateString("ru-RU"))(),
  setTreatmentEstimateDate: createSetter(set, "treatmentEstimateDate"),
  treatmentEstimatePatientOrPayerFullName: "",
  setTreatmentEstimatePatientOrPayerFullName: createSetter(set, "treatmentEstimatePatientOrPayerFullName"),
  treatmentEstimateTreatmentBasis: "",
  setTreatmentEstimateTreatmentBasis: createSetter(set, "treatmentEstimateTreatmentBasis"),
  treatmentEstimateTotalRub: "",
  setTreatmentEstimateTotalRub: createSetter(set, "treatmentEstimateTotalRub"),
  treatmentEstimateValidUntil: "",
  setTreatmentEstimateValidUntil: createSetter(set, "treatmentEstimateValidUntil"),
  treatmentEstimatePriceChangeRules:
    "при изменении диагноза, объема вмешательства, материалов, лабораторного этапа или клинических условий стоимость согласуется до оказания дополнительных услуг",
  setTreatmentEstimatePriceChangeRules: createSetter(set, "treatmentEstimatePriceChangeRules"),
  treatmentEstimateExcludedItems:
    "услуги, не указанные в строках сметы\nдополнительная диагностика и лабораторные этапы при новых показаниях\nэкстренная помощь и лечение осложнений, не связанных с текущим планом",
  setTreatmentEstimateExcludedItems: createSetter(set, "treatmentEstimateExcludedItems"),
  treatmentEstimatePaymentMilestoneNotes:
    "оплата по этапам лечения или до оказания услуги; после фактической оплаты выдается кассовый чек",
  setTreatmentEstimatePaymentMilestoneNotes: createSetter(set, "treatmentEstimatePaymentMilestoneNotes"),
  treatmentEstimateDoctorFullName: "",
  setTreatmentEstimateDoctorFullName: createSetter(set, "treatmentEstimateDoctorFullName"),
  treatmentEstimateAdminFullName: "",
  setTreatmentEstimateAdminFullName: createSetter(set, "treatmentEstimateAdminFullName"),
  treatmentEstimateSignedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setTreatmentEstimateSignedAt: createSetter(set, "treatmentEstimateSignedAt"),
  treatmentEstimatePreliminaryConfirmed: false,
  setTreatmentEstimatePreliminaryConfirmed: createSetter(set, "treatmentEstimatePreliminaryConfirmed"),
  treatmentEstimateScopeConfirmed: false,
  setTreatmentEstimateScopeConfirmed: createSetter(set, "treatmentEstimateScopeConfirmed"),
  treatmentEstimateFiscalNoticeConfirmed: false,
  setTreatmentEstimateFiscalNoticeConfirmed: createSetter(set, "treatmentEstimateFiscalNoticeConfirmed"),
  treatmentEstimateChangeRulesConfirmed: false,
  setTreatmentEstimateChangeRulesConfirmed: createSetter(set, "treatmentEstimateChangeRulesConfirmed"),
  clinicalToothRowsText: defaultClinicalToothRowsText,
  setClinicalToothRowsText: createSetter(set, "clinicalToothRowsText"),
  treatmentPlanClinicalReason: "",
  setTreatmentPlanClinicalReason: createSetter(set, "treatmentPlanClinicalReason"),
  treatmentPlanDiagnosisSummary: "",
  setTreatmentPlanDiagnosisSummary: createSetter(set, "treatmentPlanDiagnosisSummary"),
  treatmentPlanTeethOrArea: "",
  setTreatmentPlanTeethOrArea: createSetter(set, "treatmentPlanTeethOrArea"),
  treatmentPlanGoals:
    "устранить жалобы пациента\nвосстановить функцию и герметичность\nснизить риск осложнений и повторного обращения",
  setTreatmentPlanGoals: createSetter(set, "treatmentPlanGoals"),
  treatmentPlanStages:
    "Диагностика и подготовка | осмотр, снимки, фото-протокол, согласование объема | до начала лечения | уточнить диагноз и ограничения | 0\nОсновной этап | услуги по выбранному плану лечения | по расписанию клиники | объем корректируется по клинической ситуации | 0\nКонтроль | контрольный осмотр и рекомендации | после завершения этапа | оценка результата и гигиены | 0",
  setTreatmentPlanStages: createSetter(set, "treatmentPlanStages"),
  treatmentPlanEstimatedTotalRub: "",
  setTreatmentPlanEstimatedTotalRub: createSetter(set, "treatmentPlanEstimatedTotalRub"),
  treatmentPlanAlternatives:
    "наблюдение без активного лечения\nальтернативный материал или метод лечения\nпоэтапное лечение с переносом части работ\nполучение второго мнения\nотказ от лечения с фиксацией рисков",
  setTreatmentPlanAlternatives: createSetter(set, "treatmentPlanAlternatives"),
  treatmentPlanRisks:
    "изменение плана при новых клинических данных или снимках\nнеобходимость дополнительного визита, консультации или смежного специалиста\nизменение стоимости при изменении объема, материалов или сроков\nограниченный прогноз при исходном состоянии зубов и тканей",
  setTreatmentPlanRisks: createSetter(set, "treatmentPlanRisks"),
  treatmentPlanPrognosis:
    "прогноз зависит от исходного состояния зубов, тканей, гигиены, выполнения рекомендаций и явки на контрольные визиты",
  setTreatmentPlanPrognosis: createSetter(set, "treatmentPlanPrognosis"),
  treatmentPlanControlPlan:
    "контрольный осмотр после завершения этапа и далее по индивидуальному графику",
  setTreatmentPlanControlPlan: createSetter(set, "treatmentPlanControlPlan"),
  treatmentPlanDoctorFullName: "",
  setTreatmentPlanDoctorFullName: createSetter(set, "treatmentPlanDoctorFullName"),
  treatmentPlanPlannedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setTreatmentPlanPlannedAt: createSetter(set, "treatmentPlanPlannedAt"),
  treatmentPlanQuestionsAnswered: false,
  setTreatmentPlanQuestionsAnswered: createSetter(set, "treatmentPlanQuestionsAnswered"),
  treatmentPlanSeparateConsentAcknowledged: false,
  setTreatmentPlanSeparateConsentAcknowledged: createSetter(set, "treatmentPlanSeparateConsentAcknowledged"),
  treatmentPlanNewApprovalAcknowledged: false,
  setTreatmentPlanNewApprovalAcknowledged: createSetter(set, "treatmentPlanNewApprovalAcknowledged"),
  treatmentPlanPatientFriendlyExplanation: "",
  setTreatmentPlanPatientFriendlyExplanation: createSetter(set, "treatmentPlanPatientFriendlyExplanation"),
  treatmentPlanPatientHygieneAdvice: "",
  setTreatmentPlanPatientHygieneAdvice: createSetter(set, "treatmentPlanPatientHygieneAdvice"),
  treatmentPlanCustomHygieneTextOverride: "",
  setTreatmentPlanCustomHygieneTextOverride: createSetter(set, "treatmentPlanCustomHygieneTextOverride"),
  treatmentAcceptanceVariant: "standard",
  setTreatmentAcceptanceVariant: createSetter(set, "treatmentAcceptanceVariant"),
  treatmentAcceptanceClinicalGoal:
    "санация, восстановление функции и профилактика осложнений",
  setTreatmentAcceptanceClinicalGoal: createSetter(set, "treatmentAcceptanceClinicalGoal"),
  treatmentAcceptanceDiagnosisSummary: "",
  setTreatmentAcceptanceDiagnosisSummary: createSetter(set, "treatmentAcceptanceDiagnosisSummary"),
  treatmentAcceptanceTeethOrArea: "",
  setTreatmentAcceptanceTeethOrArea: createSetter(set, "treatmentAcceptanceTeethOrArea"),
  treatmentAcceptanceStages:
    "Диагностика и подготовка | осмотр, снимки, фотопротокол, согласование объема | до начала лечения | 0\nОсновной этап лечения | услуги по выбранному плану лечения | по расписанию клиники | 0\nКонтроль | контрольный осмотр и рекомендации | после завершения этапа | 0",
  setTreatmentAcceptanceStages: createSetter(set, "treatmentAcceptanceStages"),
  treatmentAcceptanceEstimatedTotalRub: "",
  setTreatmentAcceptanceEstimatedTotalRub: createSetter(set, "treatmentAcceptanceEstimatedTotalRub"),
  treatmentAcceptanceEstimateValidUntil: "",
  setTreatmentAcceptanceEstimateValidUntil: createSetter(set, "treatmentAcceptanceEstimateValidUntil"),
  treatmentAcceptancePaymentTerms:
    "оплата по кассовому чеку до или в день оказания услуг; рассрочка или кредит оформляются отдельным соглашением",
  setTreatmentAcceptancePaymentTerms: createSetter(set, "treatmentAcceptancePaymentTerms"),
  treatmentAcceptanceRejectedAlternatives:
    "наблюдение без активного лечения\nперенос лечения\nальтернативный материал или конструкция\nполучение второго мнения",
  setTreatmentAcceptanceRejectedAlternatives: createSetter(set, "treatmentAcceptanceRejectedAlternatives"),
  treatmentAcceptanceRisks:
    "изменение плана при новых клинических данных или снимках\nизменение стоимости при изменении объема, материалов или сроков\nнеобходимость дополнительных визитов, коррекции или смежного специалиста\nограниченный прогноз при исходном состоянии зубов и тканей",
  setTreatmentAcceptanceRisks: createSetter(set, "treatmentAcceptanceRisks"),
  treatmentAcceptanceWarrantyTerms:
    "контрольные визиты обязательны; гарантийные условия действуют в пределах выбранного плана, соблюдения рекомендаций, гигиены и сроков контрольных посещений",
  setTreatmentAcceptanceWarrantyTerms: createSetter(set, "treatmentAcceptanceWarrantyTerms"),
  treatmentAcceptanceDoctorFullName: "",
  setTreatmentAcceptanceDoctorFullName: createSetter(set, "treatmentAcceptanceDoctorFullName"),
  treatmentAcceptanceAcceptedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setTreatmentAcceptanceAcceptedAt: createSetter(set, "treatmentAcceptanceAcceptedAt"),
  treatmentAcceptanceQuestionsAnswered: false,
  setTreatmentAcceptanceQuestionsAnswered: createSetter(set, "treatmentAcceptanceQuestionsAnswered"),
  treatmentAcceptanceAlternativesUnderstood: false,
  setTreatmentAcceptanceAlternativesUnderstood: createSetter(set, "treatmentAcceptanceAlternativesUnderstood"),
  treatmentAcceptanceCostChangeUnderstood: false,
  setTreatmentAcceptanceCostChangeUnderstood: createSetter(set, "treatmentAcceptanceCostChangeUnderstood"),
  treatmentAcceptanceRevisionAcknowledged: false,
  setTreatmentAcceptanceRevisionAcknowledged: createSetter(set, "treatmentAcceptanceRevisionAcknowledged"),
  postVisitCareTopic: initialUiPreferences.postVisitCareTopic,
  setPostVisitCareTopic: createSetter(set, "postVisitCareTopic"),
  postVisitProcedureName:
    postVisitCarePresets.filling_restoration.procedureName,
  setPostVisitProcedureName: createSetter(set, "postVisitProcedureName"),
  postVisitToothOrArea: "",
  setPostVisitToothOrArea: createSetter(set, "postVisitToothOrArea"),
  postVisitPerformedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setPostVisitPerformedAt: createSetter(set, "postVisitPerformedAt"),
  postVisitDoctorFullName: "",
  setPostVisitDoctorFullName: createSetter(set, "postVisitDoctorFullName"),
  postVisitManualEdited: false,
  setPostVisitManualEdited: createSetter(set, "postVisitManualEdited"),
  postVisitPresetFeedback: "",
  setPostVisitPresetFeedback: createSetter(set, "postVisitPresetFeedback"),
  postVisitAllowedAfter: postVisitCarePresets.filling_restoration.allowedAfter,
  setPostVisitAllowedAfter: createSetter(set, "postVisitAllowedAfter"),
  postVisitRestrictions:
    postVisitCarePresets.filling_restoration.temporaryRestrictions,
  setPostVisitRestrictions: createSetter(set, "postVisitRestrictions"),
  postVisitMedicationAndRinsePlan:
    postVisitCarePresets.filling_restoration.medicationAndRinsePlan,
  setPostVisitMedicationAndRinsePlan: createSetter(set, "postVisitMedicationAndRinsePlan"),
  postVisitHygieneInstructions:
    postVisitCarePresets.filling_restoration.hygieneInstructions,
  setPostVisitHygieneInstructions: createSetter(set, "postVisitHygieneInstructions"),
  postVisitNutritionInstructions:
    postVisitCarePresets.filling_restoration.nutritionInstructions,
  setPostVisitNutritionInstructions: createSetter(set, "postVisitNutritionInstructions"),
  postVisitUrgentWarningSigns:
    postVisitCarePresets.filling_restoration.urgentWarningSigns,
  setPostVisitUrgentWarningSigns: createSetter(set, "postVisitUrgentWarningSigns"),
  postVisitFollowUpAt:
    postVisitCarePresets.filling_restoration.plannedFollowUpAt,
  setPostVisitFollowUpAt: createSetter(set, "postVisitFollowUpAt"),
  postVisitClinicContactInstruction:
    "связаться с клиникой по телефону или через Telegram-бот клиники",
  setPostVisitClinicContactInstruction: createSetter(set, "postVisitClinicContactInstruction"),
  postVisitTelegramSummary:
    postVisitCarePresets.filling_restoration.telegramSummary,
  setPostVisitTelegramSummary: createSetter(set, "postVisitTelegramSummary"),
  postVisitPrintedCopyReceived: false,
  setPostVisitPrintedCopyReceived: createSetter(set, "postVisitPrintedCopyReceived"),
  postVisitUrgentSignsUnderstood: false,
  setPostVisitUrgentSignsUnderstood: createSetter(set, "postVisitUrgentSignsUnderstood"),
  postVisitTelegramSafe: false,
  setPostVisitTelegramSafe: createSetter(set, "postVisitTelegramSafe"),
  anesthesiaMethod: "Инфильтрационная / проводниковая",
  setAnesthesiaMethod: createSetter(set, "anesthesiaMethod"),
  anesthesiaAnesthetic: "Артикаин 4%",
  setAnesthesiaAnesthetic: createSetter(set, "anesthesiaAnesthetic"),
  anesthesiaVasoconstrictor: "1:100000",
  setAnesthesiaVasoconstrictor: createSetter(set, "anesthesiaVasoconstrictor"),
  anesthesiaZone: "",
  setAnesthesiaZone: createSetter(set, "anesthesiaZone"),
  anesthesiaAllergyStatus:
    "Аллергия на местные анестетики со слов пациента не отмечена.",
  setAnesthesiaAllergyStatus: createSetter(set, "anesthesiaAllergyStatus"),
  anesthesiaRestrictionNotes: "",
  setAnesthesiaRestrictionNotes: createSetter(set, "anesthesiaRestrictionNotes"),
  anesthesiaDoseTime: (() =>
    new Date().toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    }))(),
  setAnesthesiaDoseTime: createSetter(set, "anesthesiaDoseTime"),
  anesthesiaDoseMl: "1.7",
  setAnesthesiaDoseMl: createSetter(set, "anesthesiaDoseMl"),
  anesthesiaReaction: "Без особенностей",
  setAnesthesiaReaction: createSetter(set, "anesthesiaReaction"),
  anesthesiaRisksExplained: false,
  setAnesthesiaRisksExplained: createSetter(set, "anesthesiaRisksExplained"),
  anesthesiaAllergyRestrictionsChecked: false,
  setAnesthesiaAllergyRestrictionsChecked: createSetter(set, "anesthesiaAllergyRestrictionsChecked"),
  anesthesiaConsentConfirmed: false,
  setAnesthesiaConsentConfirmed: createSetter(set, "anesthesiaConsentConfirmed"),
  prescriptionMedication: "",
  setPrescriptionMedication: createSetter(set, "prescriptionMedication"),
  prescriptionDosage: "",
  setPrescriptionDosage: createSetter(set, "prescriptionDosage"),
  prescriptionInstructions: "",
  setPrescriptionInstructions: createSetter(set, "prescriptionInstructions"),
  prescriptionDuration: "",
  setPrescriptionDuration: createSetter(set, "prescriptionDuration"),
  prescriptionSafetyNotes:
    "Проверить аллергоанамнез до выдачи.\nОбъяснить режим приема, ограничения и действия при нежелательной реакции.",
  setPrescriptionSafetyNotes: createSetter(set, "prescriptionSafetyNotes"),
  prescriptionUrgentContactReason:
    "Связаться с клиникой при отеке, сыпи, нарастающей боли, кровотечении или температуре.",
  setPrescriptionUrgentContactReason: createSetter(set, "prescriptionUrgentContactReason"),
  labWorkType: "",
  setLabWorkType: createSetter(set, "labWorkType"),
  labTeethOrArea: "",
  setLabTeethOrArea: createSetter(set, "labTeethOrArea"),
  labMaterial: "",
  setLabMaterial: createSetter(set, "labMaterial"),
  labShade: "",
  setLabShade: createSetter(set, "labShade"),
  labSource: "",
  setLabSource: createSetter(set, "labSource"),
  labDeadline: "",
  setLabDeadline: createSetter(set, "labDeadline"),
  labTechnicianNotes: "",
  setLabTechnicianNotes: createSetter(set, "labTechnicianNotes"),
  xrayStudyType: "cbct",
  setXrayStudyType: createSetter(set, "xrayStudyType"),
  xrayArea: "",
  setXrayArea: createSetter(set, "xrayArea"),
  xrayClinicalQuestion: "",
  setXrayClinicalQuestion: createSetter(set, "xrayClinicalQuestion"),
  xrayIndication: "",
  setXrayIndication: createSetter(set, "xrayIndication"),
  xrayPregnancyStatus: "unknown",
  setXrayPregnancyStatus: createSetter(set, "xrayPregnancyStatus"),
  xraySafetyNotes:
    "Перед исследованием уточнить беременность, ограничения и необходимость средств защиты.",
  setXraySafetyNotes: createSetter(set, "xraySafetyNotes"),
  xrayPriority: "routine",
  setXrayPriority: createSetter(set, "xrayPriority"),
  xrayIncludeDicomExport: true,
  setXrayIncludeDicomExport: createSetter(set, "xrayIncludeDicomExport"),
  xrayIncludeRadiologistReport: true,
  setXrayIncludeRadiologistReport: createSetter(set, "xrayIncludeRadiologistReport"),
  xrayRequestedBy: "",
  setXrayRequestedBy: createSetter(set, "xrayRequestedBy"),
  xrayRecipientClinic: "",
  setXrayRecipientClinic: createSetter(set, "xrayRecipientClinic"),
  xrayDueDate: "",
  setXrayDueDate: createSetter(set, "xrayDueDate"),
  outpatient025uMedicalCardNumber: "",
  setOutpatient025uMedicalCardNumber: createSetter(set, "outpatient025uMedicalCardNumber"),
  outpatient025uOpenedAt: (() => new Date().toISOString().slice(0, 10))(),
  setOutpatient025uOpenedAt: createSetter(set, "outpatient025uOpenedAt"),
  outpatient025uPatientSexCode: "unknown",
  setOutpatient025uPatientSexCode: createSetter(set, "outpatient025uPatientSexCode"),
  outpatient025uCitizenship: "",
  setOutpatient025uCitizenship: createSetter(set, "outpatient025uCitizenship"),
  outpatient025uRegistrationUrbanRuralCode: "unknown",
  setOutpatient025uRegistrationUrbanRuralCode: createSetter(set, "outpatient025uRegistrationUrbanRuralCode"),
  outpatient025uStayUrbanRuralCode: "unknown",
  setOutpatient025uStayUrbanRuralCode: createSetter(set, "outpatient025uStayUrbanRuralCode"),
  outpatient025uOmsIssuedAt: "",
  setOutpatient025uOmsIssuedAt: createSetter(set, "outpatient025uOmsIssuedAt"),
  outpatient025uInsurerName: "",
  setOutpatient025uInsurerName: createSetter(set, "outpatient025uInsurerName"),
  outpatient025uSocialSupportCode: "",
  setOutpatient025uSocialSupportCode: createSetter(set, "outpatient025uSocialSupportCode"),
  outpatient025uHealthStatusDisclosureContact: "",
  setOutpatient025uHealthStatusDisclosureContact: createSetter(set, "outpatient025uHealthStatusDisclosureContact"),

  outpatient025uEmploymentCode: "",
  setOutpatient025uEmploymentCode: createSetter(set, "outpatient025uEmploymentCode"),
  outpatient025uDisabilityGroup: "",
  setOutpatient025uDisabilityGroup: createSetter(set, "outpatient025uDisabilityGroup"),
  outpatient025uWorkOrStudyPlace: "",
  setOutpatient025uWorkOrStudyPlace: createSetter(set, "outpatient025uWorkOrStudyPlace"),
  outpatient025uPalliativeCareNeedCode: "",
  setOutpatient025uPalliativeCareNeedCode: createSetter(set, "outpatient025uPalliativeCareNeedCode"),
  outpatient025uBloodGroup: "",
  setOutpatient025uBloodGroup: createSetter(set, "outpatient025uBloodGroup"),
  outpatient025uRhFactor: "",
  setOutpatient025uRhFactor: createSetter(set, "outpatient025uRhFactor"),
  outpatient025uKellK1: "",
  setOutpatient025uKellK1: createSetter(set, "outpatient025uKellK1"),
  outpatient025uOtherBloodData: "",
  setOutpatient025uOtherBloodData: createSetter(set, "outpatient025uOtherBloodData"),
  outpatient025uAllergyHistory: "",
  setOutpatient025uAllergyHistory: createSetter(set, "outpatient025uAllergyHistory"),
  outpatient025uFinalEpicrisis: "",
  setOutpatient025uFinalEpicrisis: createSetter(set, "outpatient025uFinalEpicrisis"),
  outpatient025uOfficialForm274nChecked: false,
  setOutpatient025uOfficialForm274nChecked: createSetter(set, "outpatient025uOfficialForm274nChecked"),
  outpatient025uThirdPartyDataChecked: false,
  setOutpatient025uThirdPartyDataChecked: createSetter(set, "outpatient025uThirdPartyDataChecked"),
});

const createMiscSlice = (set: any) => ({
  minorRepresentativeFullName: "",
  setMinorRepresentativeFullName: createSetter(set, "minorRepresentativeFullName"),
  minorRepresentativeRelationship: "",
  setMinorRepresentativeRelationship: createSetter(set, "minorRepresentativeRelationship"),
  minorRepresentativeIdentityDocument: "",
  setMinorRepresentativeIdentityDocument: createSetter(set, "minorRepresentativeIdentityDocument"),
  minorRepresentativeAuthorityDocument: "",
  setMinorRepresentativeAuthorityDocument: createSetter(set, "minorRepresentativeAuthorityDocument"),
  minorRepresentativePhone: "",
  setMinorRepresentativePhone: createSetter(set, "minorRepresentativePhone"),
  minorConsentPatientFullName: "",
  setMinorConsentPatientFullName: createSetter(set, "minorConsentPatientFullName"),
  minorConsentPatientBirthDate: "",
  setMinorConsentPatientBirthDate: createSetter(set, "minorConsentPatientBirthDate"),
  minorConsentInterventionScope: "",
  setMinorConsentInterventionScope: createSetter(set, "minorConsentInterventionScope"),
  minorConsentDiagnosisOrIndication: "",
  setMinorConsentDiagnosisOrIndication: createSetter(set, "minorConsentDiagnosisOrIndication"),
  minorConsentRisks:
    "боль, отек, кровоточивость или временный дискомфорт\nаллергическая реакция на препараты или материалы\nнеобходимость повторного визита или изменения плана лечения",
  setMinorConsentRisks: createSetter(set, "minorConsentRisks"),
  minorConsentAlternatives:
    "отложить вмешательство и наблюдать состояние\nвыбрать альтернативный метод лечения при наличии показаний\nполучить второе мнение\nотказаться от вмешательства с фиксацией рисков",
  setMinorConsentAlternatives: createSetter(set, "minorConsentAlternatives"),
  minorConsentDoctorFullName: "",
  setMinorConsentDoctorFullName: createSetter(set, "minorConsentDoctorFullName"),
  minorConsentSignedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setMinorConsentSignedAt: createSetter(set, "minorConsentSignedAt"),
  minorConsentIdentityVerified: false,
  setMinorConsentIdentityVerified: createSetter(set, "minorConsentIdentityVerified"),
  minorConsentAuthorityVerified: false,
  setMinorConsentAuthorityVerified: createSetter(set, "minorConsentAuthorityVerified"),
  minorConsentExplained: false,
  setMinorConsentExplained: createSetter(set, "minorConsentExplained"),
  minorConsentStored: false,
  setMinorConsentStored: createSetter(set, "minorConsentStored"),
  minorConsentAgeExplanation: false,
  setMinorConsentAgeExplanation: createSetter(set, "minorConsentAgeExplanation"),
  recordExtractPeriodStart: (() => new Date().toISOString().slice(0, 10))(),
  setRecordExtractPeriodStart: createSetter(set, "recordExtractPeriodStart"),
  recordExtractPeriodEnd: (() => new Date().toISOString().slice(0, 10))(),
  setRecordExtractPeriodEnd: createSetter(set, "recordExtractPeriodEnd"),
  recordExtractSourceVisitIds: "",
  setRecordExtractSourceVisitIds: createSetter(set, "recordExtractSourceVisitIds"),
  recordExtractComplaintAndAnamnesis: "",
  setRecordExtractComplaintAndAnamnesis: createSetter(set, "recordExtractComplaintAndAnamnesis"),
  recordExtractObjectiveStatus: "",
  setRecordExtractObjectiveStatus: createSetter(set, "recordExtractObjectiveStatus"),
  recordExtractDiagnosis: "",
  setRecordExtractDiagnosis: createSetter(set, "recordExtractDiagnosis"),
  recordExtractTreatmentProvided: "",
  setRecordExtractTreatmentProvided: createSetter(set, "recordExtractTreatmentProvided"),
  recordExtractRecommendations: "",
  setRecordExtractRecommendations: createSetter(set, "recordExtractRecommendations"),
  recordExtractDoctorFullName: "",
  setRecordExtractDoctorFullName: createSetter(set, "recordExtractDoctorFullName"),
  recordExtractRecipientFullName: "",
  setRecordExtractRecipientFullName: createSetter(set, "recordExtractRecipientFullName"),
  recordExtractRecipientAuthority: "пациент лично",
  setRecordExtractRecipientAuthority: createSetter(set, "recordExtractRecipientAuthority"),
  recordExtractIssuedAt: (() => new Date().toLocaleString("ru-RU"))(),
  setRecordExtractIssuedAt: createSetter(set, "recordExtractIssuedAt"),
  recordExtractPreparedFromSignedRecords: false,
  setRecordExtractPreparedFromSignedRecords: createSetter(set, "recordExtractPreparedFromSignedRecords"),
  recordExtractThirdPartyDataChecked: false,
  setRecordExtractThirdPartyDataChecked: createSetter(set, "recordExtractThirdPartyDataChecked"),
  copyRequestDocumentTypes:
    "Выписка из медицинской карты\nКопия снимков или КТ-архив",
  setCopyRequestDocumentTypes: createSetter(set, "copyRequestDocumentTypes"),
  copyRequestPeriodStart: "",
  setCopyRequestPeriodStart: createSetter(set, "copyRequestPeriodStart"),
  copyRequestPeriodEnd: "",
  setCopyRequestPeriodEnd: createSetter(set, "copyRequestPeriodEnd"),
  copyRequestFormat: "pdf",
  setCopyRequestFormat: createSetter(set, "copyRequestFormat"),
  copyRequestRecipientFullName: "",
  setCopyRequestRecipientFullName: createSetter(set, "copyRequestRecipientFullName"),
  copyRequestRecipientIdentityDocument: "",
  setCopyRequestRecipientIdentityDocument: createSetter(set, "copyRequestRecipientIdentityDocument"),
  copyRequestRecipientAuthority: "пациент лично",
  setCopyRequestRecipientAuthority: createSetter(set, "copyRequestRecipientAuthority"),
  copyRequestRepresentativeAuthorityDocument: "",
  setCopyRequestRepresentativeAuthorityDocument: createSetter(set, "copyRequestRepresentativeAuthorityDocument"),
  copyRequestRequestedAt: new Date().toLocaleString("ru-RU"),
  setCopyRequestRequestedAt: createSetter(set, "copyRequestRequestedAt"),
  copyRequestContactForDelivery: "",
  setCopyRequestContactForDelivery: createSetter(set, "copyRequestContactForDelivery"),
  copyRequestSpecialInstructions: "",
  setCopyRequestSpecialInstructions: createSetter(set, "copyRequestSpecialInstructions"),
  copyRequestIncludeDicomSourceData: true,
  setCopyRequestIncludeDicomSourceData: createSetter(set, "copyRequestIncludeDicomSourceData"),
  copyRequestIdentityVerified: false,
  setCopyRequestIdentityVerified: createSetter(set, "copyRequestIdentityVerified"),
  copyRequestThirdPartyDataChecked: false,
  setCopyRequestThirdPartyDataChecked: createSetter(set, "copyRequestThirdPartyDataChecked"),
  attendanceStartedAt: "",
  setAttendanceStartedAt: createSetter(set, "attendanceStartedAt"),
  attendanceEndedAt: "",
  setAttendanceEndedAt: createSetter(set, "attendanceEndedAt"),
  attendancePurpose: "для предъявления по месту требования",
  setAttendancePurpose: createSetter(set, "attendancePurpose"),
  attendanceRecipientOrganization: "",
  setAttendanceRecipientOrganization: createSetter(set, "attendanceRecipientOrganization"),
  attendanceIssuedAt: new Date().toLocaleString("ru-RU"),
  setAttendanceIssuedAt: createSetter(set, "attendanceIssuedAt"),
  attendanceSignedByFullName: "",
  setAttendanceSignedByFullName: createSetter(set, "attendanceSignedByFullName"),
  attendanceSignedByRole: "врач/администратор",
  setAttendanceSignedByRole: createSetter(set, "attendanceSignedByRole"),
  attendanceDiagnosisDisclosureExcluded: false,
  setAttendanceDiagnosisDisclosureExcluded: createSetter(set, "attendanceDiagnosisDisclosureExcluded"),
  attendanceNotSickLeaveAcknowledged: false,
  setAttendanceNotSickLeaveAcknowledged: createSetter(set, "attendanceNotSickLeaveAcknowledged"),
  releaseRecipientFullName: "",
  setReleaseRecipientFullName: createSetter(set, "releaseRecipientFullName"),
  releaseRecipientIdentityDocument: "",
  setReleaseRecipientIdentityDocument: createSetter(set, "releaseRecipientIdentityDocument"),
  releaseRecipientAuthority: "пациент лично",
  setReleaseRecipientAuthority: createSetter(set, "releaseRecipientAuthority"),
  releaseSourceRequestDocumentId: "",
  setReleaseSourceRequestDocumentId: createSetter(set, "releaseSourceRequestDocumentId"),
  releaseChannel: "paper",
  setReleaseChannel: createSetter(set, "releaseChannel"),
  releaseDocumentTypes:
    "Выписка из медицинской карты\nКопия снимков или КТ-архив",
  setReleaseDocumentTypes: createSetter(set, "releaseDocumentTypes"),
  releasePeriodStart: "",
  setReleasePeriodStart: createSetter(set, "releasePeriodStart"),
  releasePeriodEnd: "",
  setReleasePeriodEnd: createSetter(set, "releasePeriodEnd"),
  releaseDeliveredAt: new Date().toLocaleString("ru-RU"),
  setReleaseDeliveredAt: createSetter(set, "releaseDeliveredAt"),
  releaseAccessExpiresAt: "",
  setReleaseAccessExpiresAt: createSetter(set, "releaseAccessExpiresAt"),
  releaseThirdPartyDataChecked: false,
  setReleaseThirdPartyDataChecked: createSetter(set, "releaseThirdPartyDataChecked"),
});

export const useDocumentStore = create<DocumentState>(
  (set) =>
    ({
      ...createDocumentSlice(set),
      ...createTaxSlice(set),
      ...createIntakeAndConsentSlice(set),
      ...createFinancialSlice(set),
      ...createClinicalSlice(set),
      ...createMiscSlice(set),
    }) as DocumentState,
);
