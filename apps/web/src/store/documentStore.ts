import { create } from "zustand";
export type MedicalDocumentReleaseChannel =
	| "paper"
	| "pdf"
	| "dicom_archive"
	| "secure_link"
	| "physical_media"
	| "other";

import type {
	DocumentAuditFacts,
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	DocumentIssueSignatureMode,
	DocumentVoidReasonCode,
	GeneratedDocument,
	PatientIntakePregnancyStatus,
	PaymentMethod,
	PhotoVideoConsentMaterial,
	PostVisitCareTopic,
	ProcedureSpecificConsentProcedure,
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm,
	TaxDeductionApplicationRelationship,
	TreatmentPlanAcceptanceVariant,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import type {
	PaymentRefundCorrectionAction,
	PaymentRefundCorrectionMethod,
} from "../AppConstants";
import { postVisitCarePresets } from "../postVisitCareData";
import { loadUiPreferences } from "../utils/preferencesUtils";
import { createClinicalSlice } from "./slices/clinicalSlice";
import { createDocumentSlice } from "./slices/documentCoreSlice";
import { createFinancialSlice } from "./slices/financialSlice";
import { createIntakeAndConsentSlice } from "./slices/intakeSlice";
import { createMiscSlice } from "./slices/miscSlice";
import { createTaxSlice } from "./slices/taxSlice";

const initialUiPreferences = loadUiPreferences();

/*
 * Памятка после приёма берётся из ТОЙ ЖЕ темы, что стоит в селекте.
 *
 * Тема бралась из сохранённых настроек оператора
 * (initialUiPreferences.postVisitCareTopic), а девять полей текста были жёстко
 * прибиты к пресету filling_restoration. Если в настройках сохранена другая тема
 * — удаление, имплантация, гигиена — врач получал памятку, где тема одна, а
 * текст от другого вмешательства: процедура «Пломба / композитная реставрация»,
 * ограничения, питание и тревожные признаки от пломбы. В документ уходит и тема
 * (careTopic), и текст, а весь блок памятки свёрнут в <details>, поэтому
 * расхождение не видно, пока его не раскроют.
 *
 * Единственный писатель этих девяти полей — applyPostVisitCarePreset в
 * useAppLogic.tsx, и он берёт ровно postVisitCarePresets[тема]. Начальное
 * состояние теперь делает то же самое: один источник правды.
 *
 * Индексация безопасна: loadUiPreferences проверяет тему по списку допустимых
 * значений и при мусоре возвращает filling_restoration, а postVisitCarePresets
 * объявлен как Record<PostVisitCareTopic, …>, то есть покрывает все темы.
 */
const _initialPostVisitCarePreset =
	postVisitCarePresets[initialUiPreferences.postVisitCareTopic];

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function _createSetter(set: any, key: string) {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	return (val: any) =>
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		set((state: any) => ({
			[key]: typeof val === "function" ? val(state[key]) : val,
		}));
}

export interface DocumentState {
	/**
	 * Вернуть все поля форм документов к исходным значениям.
	 *
	 * ЗАЧЕМ. Этот стор — одно глобальное хранилище примерно на восемьсот полей на
	 * ВСЕ виды документов, и функции сброса в нём не было вовсе. Пер-пациентный
	 * черновик заведён ровно у двух видов из тридцати
	 * (`documentPayloadDraftKey` в AppHelpers.tsx: `outpatient_medical_card_025u`
	 * и `medical_record_extract`), остальные формы ничего о пациенте не знают:
	 * `PhotoVideoConsentForm.tsx`, например, не упоминает пациента ни разу.
	 *
	 * Что из этого следовало. Администратор заполнял согласие на фото и видео
	 * пациенту А, в том числе отметку «разрешена узнаваемая публикация»,
	 * переключался на пациента Б — и согласие Б открывалось уже с ответами А.
	 * Дальше документ печатается и подписывается. Это юридический документ с
	 * чужими ответами, то есть худший класс дефектов этого продукта в чистом виде.
	 *
	 * Сброс собирается повторным вызовом фабрик срезов, а не переписыванием
	 * восьмисот имён руками: список полей обязан остаться в одном месте, иначе
	 * добавленное завтра поле молча не попадёт в сброс.
	 */
	resetDocumentForms: () => void;
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	documentIssueSignedAt: any;
	documentIssueRecipientFullName: string;
	documentIssueRecipientRole: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	documentIssueStaffFullName: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	documentIssueStaffRole: any;
	documentIssueNote: string;
	documentIssueIdentityChecked: boolean;
	documentIssueDocumentOpenedAndChecked: boolean;
	documentIssueRecipientSigned: boolean;
	documentIssueClinicSigned: boolean;
	documentVoidConfirmationId: string | null;
	documentVoidReasonCode: DocumentVoidReasonCode;
	documentVoidReasonText: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	documentVoidStaffFullName: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setDocumentIssueSignedAt: (val: any | ((prev: any) => any)) => void;
	setDocumentIssueRecipientFullName: (
		val: string | ((prev: string) => string),
	) => void;
	setDocumentIssueRecipientRole: (
		val: string | ((prev: string) => string),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setDocumentIssueStaffFullName: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setDocumentVoidStaffFullName: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setCopyRequestRecipientAuthority: (val: any | ((prev: any) => any)) => void;
	setCopyRequestRepresentativeAuthorityDocument: (
		val: string | ((prev: string) => string),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setAttendancePurpose: (val: any | ((prev: any) => any)) => void;
	setAttendanceRecipientOrganization: (
		val: string | ((prev: string) => string),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setAttendanceIssuedAt: (val: any | ((prev: any) => any)) => void;
	setAttendanceSignedByFullName: (
		val: string | ((prev: string) => string),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setReleaseDocumentTypes: (val: any | ((prev: any) => any)) => void;
	setReleasePeriodStart: (val: string | ((prev: string) => string)) => void;
	setReleasePeriodEnd: (val: string | ((prev: string) => string)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	copyRequestDocumentTypes: any;
	copyRequestPeriodStart: string;
	copyRequestPeriodEnd: string;
	copyRequestFormat: MedicalDocumentReleaseChannel;
	copyRequestRecipientFullName: string;
	copyRequestRecipientIdentityDocument: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	copyRequestRecipientAuthority: any;
	copyRequestRepresentativeAuthorityDocument: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	copyRequestRequestedAt: any;
	copyRequestContactForDelivery: string;
	copyRequestSpecialInstructions: string;
	copyRequestIncludeDicomSourceData: boolean;
	copyRequestIdentityVerified: boolean;
	copyRequestThirdPartyDataChecked: boolean;
	attendanceStartedAt: string;
	attendanceEndedAt: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	attendancePurpose: any;
	attendanceRecipientOrganization: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	attendanceIssuedAt: any;
	attendanceSignedByFullName: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	attendanceSignedByRole: any;
	attendanceDiagnosisDisclosureExcluded: boolean;
	attendanceNotSickLeaveAcknowledged: boolean;
	releaseRecipientFullName: string;
	releaseRecipientIdentityDocument: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	releaseRecipientAuthority: any;
	releaseSourceRequestDocumentId: string;
	releaseChannel: MedicalDocumentReleaseChannel;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	releaseDocumentTypes: any;
	releasePeriodStart: string;
	releasePeriodEnd: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	releaseDeliveredAt: any;
	releaseAccessExpiresAt: string;
	releaseThirdPartyDataChecked: boolean;
	refundAction: PaymentRefundCorrectionAction;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	personalDataConsentGivenAt: any;
	personalDataVoluntaryConsentConfirmed: boolean;
	personalDataMedicalProcessingAcknowledged: boolean;
	refusalIntervention: string;
	refusalClinicalIndication: string;
	refusalPatientReason: string;
	refusalDoctorFullName: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	paymentReceiptTaxSupportRequested: any;
	setPaymentReceiptTaxSupportRequested: (
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	clinicalToothRowsText: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitProcedureName: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitAllowedAfter: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitAllowedAfter: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitRestrictions: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitRestrictions: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitMedicationAndRinsePlan: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitMedicationAndRinsePlan: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitHygieneInstructions: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitHygieneInstructions: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitNutritionInstructions: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitNutritionInstructions: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitUrgentWarningSigns: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitUrgentWarningSigns: (val: any | ((prev: any) => any)) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitFollowUpAt: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setPostVisitFollowUpAt: (val: any | ((prev: any) => any)) => void;
	postVisitClinicContactInstruction: string;
	setPostVisitClinicContactInstruction: (
		val: string | ((prev: string) => string),
	) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	postVisitTelegramSummary: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression

/**
 * Исходные значения ВСЕХ полей форм документов.
 *
 * Собирается повторным вызовом тех же фабрик срезов с пустым `set`: настройки
 * при этом никуда не пишутся, а функции-сеттеры отбрасываются — остаются только
 * значения. Так список полей живёт в одном месте, и поле, добавленное завтра,
 * попадёт в сброс само.
 */
export function documentFormInitialValues(): Partial<DocumentState> {
	const noopSet = () => {};
	const fresh: Record<string, unknown> = {
		...createDocumentSlice(noopSet),
		...createTaxSlice(noopSet),
		...createIntakeAndConsentSlice(noopSet),
		...createFinancialSlice(noopSet),
		...createClinicalSlice(noopSet),
		...createMiscSlice(noopSet),
	};
	const values: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(fresh)) {
		if (typeof value !== "function") values[key] = value;
	}
	return values as Partial<DocumentState>;
}

/**
 * Набрано ли в формах документов хоть что-то, отличное от исходного.
 *
 * Нужно, чтобы не пугать человека сообщением о выброшенном черновике, когда
 * выбрасывать было нечего: предупреждение, которое показывают всегда, перестают
 * читать, и вместе с ним перестают читать настоящее.
 */
export function documentFormHasEntries(
	state: Record<string, unknown>,
): boolean {
	const initial = documentFormInitialValues() as Record<string, unknown>;
	for (const [key, value] of Object.entries(initial)) {
		const current = state[key];
		if (typeof current === "function") continue;
		/* Массивы и объекты сравниваются по содержимому: ссылки различаются всегда. */
		if (typeof value === "object" && value !== null) {
			if (JSON.stringify(current) !== JSON.stringify(value)) return true;
			continue;
		}
		if (current !== value) return true;
	}
	return false;
}

export const useDocumentStore = create<DocumentState>(
	(set) =>
		({
			...createDocumentSlice(set),
			...createTaxSlice(set),
			...createIntakeAndConsentSlice(set),
			...createFinancialSlice(set),
			...createClinicalSlice(set),
			...createMiscSlice(set),
			resetDocumentForms: () =>
				set(documentFormInitialValues() as DocumentState),
		}) as DocumentState,
);
