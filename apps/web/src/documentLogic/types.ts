import type { DocumentPayload } from "@dental/shared";
import type { DocumentState as StoreDocumentState } from "../store/documentStore/types";

type StoreDataFields = {
	[K in keyof StoreDocumentState as StoreDocumentState[K] extends (
		...args: never[]
	) => unknown
		? never
		: K]: StoreDocumentState[K];
};

export type DocumentTextLinesInput = string | readonly string[];

export interface DocumentProfileClinicDraft {
	clinicName?: string | null | undefined;
	legalName?: string | null | undefined;
	inn?: string | null | undefined;
	address?: string | null | undefined;
}

export interface DocumentProfilePatient {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	cardNumber?: string | null | undefined;
}

export interface DocumentProfileDoctor {
	fullName?: string | null | undefined;
}

export interface DocumentDashboardContext {
	activeVisit?: {
		id?: string | null | undefined;
		complaint?: string | null | undefined;
		diagnosis?: string | null | undefined;
		doctorSummary?: string | null | undefined;
		treatmentPlan?: string | null | undefined;
	} | null | undefined;
}

export type DentalMedicalCard043uPayloadShape = NonNullable<
	DocumentPayload["dentalMedicalCard043u"]
>;

export type ClinicalToothRowList = NonNullable<
	DocumentPayload["treatmentPlan"]
>["clinicalToothRows"];

export type TreatmentPlanStageRowList = NonNullable<
	DocumentPayload["treatmentPlan"]
>["plannedStages"];

export type TreatmentAcceptanceStageRowList = NonNullable<
	DocumentPayload["treatmentPlanAcceptance"]
>["acceptedStages"];

export type InstallmentScheduleRowList = NonNullable<
	DocumentPayload["installmentPaymentSchedule"]
>["installments"];

export type FinancialPayloadServiceLineList = NonNullable<
	DocumentPayload["treatmentCostEstimate"]
>["serviceLines"];

export interface ResolvedDocumentState
	extends Omit<
		StoreDataFields,
		| "treatmentEstimateExcludedItems"
		| "warrantyPatientObligations"
		| "warrantyExcludedRiskFactors"
		| "warrantyUrgentContactReasons"
		| "informedConsentRisks"
		| "informedConsentAlternatives"
		| "informedConsentAftercare"
		| "procedureConsentPatientRiskFactors"
		| "procedureConsentSpecificRisks"
		| "procedureConsentAlternatives"
		| "procedureConsentAftercare"
		| "personalDataPurposes"
		| "personalDataCategories"
		| "personalDataActions"
		| "refusalExplainedRisks"
		| "refusalAlternatives"
		| "refusalUrgentWarningSigns"
		| "minorConsentRisks"
		| "minorConsentAlternatives"
		| "treatmentPlanGoals"
		| "treatmentPlanAlternatives"
		| "treatmentPlanRisks"
		| "treatmentAcceptanceRejectedAlternatives"
		| "treatmentAcceptanceRisks"
		| "postVisitAllowedAfter"
		| "postVisitRestrictions"
		| "postVisitMedicationAndRinsePlan"
		| "postVisitHygieneInstructions"
		| "postVisitNutritionInstructions"
		| "postVisitUrgentWarningSigns"
		| "prescriptionSafetyNotes"
		| "recordExtractSourceVisitIds"
		| "copyRequestDocumentTypes"
		| "releaseDocumentTypes"
	> {
	treatmentEstimateExcludedItems: DocumentTextLinesInput;
	warrantyPatientObligations: DocumentTextLinesInput;
	warrantyExcludedRiskFactors: DocumentTextLinesInput;
	warrantyUrgentContactReasons: DocumentTextLinesInput;
	informedConsentRisks: DocumentTextLinesInput;
	informedConsentAlternatives: DocumentTextLinesInput;
	informedConsentAftercare: DocumentTextLinesInput;
	procedureConsentPatientRiskFactors: DocumentTextLinesInput;
	procedureConsentSpecificRisks: DocumentTextLinesInput;
	procedureConsentAlternatives: DocumentTextLinesInput;
	procedureConsentAftercare: DocumentTextLinesInput;
	personalDataPurposes: DocumentTextLinesInput;
	personalDataCategories: DocumentTextLinesInput;
	personalDataActions: DocumentTextLinesInput;
	refusalExplainedRisks: DocumentTextLinesInput;
	refusalAlternatives: DocumentTextLinesInput;
	refusalUrgentWarningSigns: DocumentTextLinesInput;
	minorConsentRisks: DocumentTextLinesInput;
	minorConsentAlternatives: DocumentTextLinesInput;
	treatmentPlanGoals: DocumentTextLinesInput;
	treatmentPlanAlternatives: DocumentTextLinesInput;
	treatmentPlanRisks: DocumentTextLinesInput;
	treatmentAcceptanceRejectedAlternatives: DocumentTextLinesInput;
	treatmentAcceptanceRisks: DocumentTextLinesInput;
	postVisitAllowedAfter: DocumentTextLinesInput;
	postVisitRestrictions: DocumentTextLinesInput;
	postVisitMedicationAndRinsePlan: DocumentTextLinesInput;
	postVisitHygieneInstructions: DocumentTextLinesInput;
	postVisitNutritionInstructions: DocumentTextLinesInput;
	postVisitUrgentWarningSigns: DocumentTextLinesInput;
	prescriptionSafetyNotes: DocumentTextLinesInput;
	recordExtractSourceVisitIds: DocumentTextLinesInput;
	copyRequestDocumentTypes: DocumentTextLinesInput;
	releaseDocumentTypes: DocumentTextLinesInput;

	activeDoctor: DocumentProfileDoctor | null;
	allowBlankForPrint: boolean;
	clinicProfileDraft: DocumentProfileClinicDraft | null;
	dashboard: DocumentDashboardContext | null;
	documentPatient: DocumentProfilePatient | null;
	inferredTreatmentArea: string | null;
	selectedCompletedActContractDocumentId: string;
	selectedReleaseSourceRequestDocumentId: string;
	releaseProtectionNote: string;
	selectedPaymentReceiptPayments: Array<{
		id: string;
		fiscalReceiptIssuedAt?: string | null | undefined;
	}>;
	selectedPaymentReceiptTotalRub: number;

	documentTextLines: (value: DocumentTextLinesInput | null | undefined) => string[];
	requiredDocumentField: (
		value: string | null | undefined,
		label: string,
	) => string | null;
	confirmedDocumentLiteral: (value: boolean, label: string) => true;

	clinicalToothRowsValue: () => ClinicalToothRowList;
	treatmentPlanStageRows: () => TreatmentPlanStageRowList;
	treatmentAcceptanceStageRows: () => TreatmentAcceptanceStageRowList;
	installmentScheduleInstallmentRows: () => InstallmentScheduleRowList;
	plannedServiceLinesForFinancialPayload: () => FinancialPayloadServiceLineList;
	dentalMedicalCard043uPayloadValue: () => DentalMedicalCard043uPayloadShape;
	completedActFiscalReceiptLines: () => string[];
	paymentReceiptFiscalReceiptLines: () => string[];
	selectedTaxPaymentIdsForCurrentDocument: () => string[];

	attendanceEndedAtValue: () => string;
	attendanceSignedByValue: () => string;
	attendanceStartedAtValue: () => string;
	completedActDoctorFullNameValue: () => string;
	completedActServicesSummaryValue: () => string;
	installmentScheduleBaseDocumentTitleValue: () => string;
	installmentSchedulePayerFullNameValue: () => string;
	installmentScheduleResponsibleFullNameValue: () => string;
	minorConsentDiagnosisOrIndicationValue: () => string;
	minorConsentDoctorFullNameValue: () => string;
	minorConsentInterventionScopeValue: () => string;
	minorConsentPatientBirthDateValue: () => string;
	minorConsentPatientFullNameValue: () => string;
	minorRepresentativeFullNameValue: () => string;
	minorRepresentativeIdentityDocumentValue: () => string;
	minorRepresentativePhoneValue: () => string;
	minorRepresentativeRelationshipValue: () => string;
	paidContractCareReasonValue: () => string;
	paidContractCustomerFullNameValue: () => string;
	paidContractDoctorFullNameValue: () => string;
	paidContractServiceScopeValue: () => string;
	paymentInvoiceBankDetailsValue: () => string;
	paymentInvoicePayerFullNameValue: () => string;
	paymentReceiptIssuedByValue: () => string;
	paymentReceiptPayerBirthDateValue: () => string;
	paymentReceiptPayerFullNameValue: () => string;
	paymentReceiptPayerIdentityDocumentValue: () => string;
	paymentReceiptPayerInnValue: () => string;
	paymentReceiptPayerRelationshipValue: () => string;
	postVisitDoctorFullNameValue: () => string;
	postVisitProcedureNameValue: () => string;
	postVisitToothOrAreaValue: () => string;
	recordExtractComplaintAndAnamnesisValue: () => string;
	recordExtractDiagnosisValue: () => string;
	recordExtractObjectiveStatusValue: () => string;
	recordExtractTreatmentProvidedValue: () => string;
	treatmentEstimateDoctorFullNameValue: () => string;
	treatmentEstimatePatientOrPayerFullNameValue: () => string;
	treatmentEstimateTreatmentBasisValue: () => string;
	treatmentPlanClinicalReasonValue: () => string;
	treatmentPlanDiagnosisSummaryValue: () => string;
	treatmentPlanDoctorFullNameValue: () => string;
	treatmentPlanTeethOrAreaValue: () => string;
	warrantyDoctorFullNameValue: () => string;
	warrantyLinkedActOrContractValue: () => string;
	warrantyServiceOrWorkNameValue: () => string;
	warrantyTeethOrAreaValue: () => string;

	completedActPaidRubValue: () => number;
	completedActTotalRubValue: () => number;
	installmentSchedulePrepaidRubValue: () => number;
	installmentScheduleRemainingRubValue: () => number;
	installmentScheduleTotalRubValue: () => number;
	paidContractTotalRubValue: () => number;
	paymentInvoiceTotalRubValue: () => number;
	treatmentAcceptanceTotalRubValue: () => number;
	treatmentEstimateTotalRubValue: () => number;
	treatmentPlanTotalRubValue: () => number;
}

export type DocumentState = Partial<ResolvedDocumentState>;

export type TimestampShape = "dateTime" | "date" | "isoDate" | "dateTimeLocal";

/**
 * Поля отметки времени в документах и вид, в котором их ждёт разметка.
 *
 * ЧТО БЫЛО. Все они вычислялись в хранилище ОДИН РАЗ при загрузке модуля
 * выражением вида `(() => new Date().toLocaleString("ru-RU"))()`. Значение
 * равнялось моменту открытия страницы и больше никогда не обновлялось: ни один
 * код не звал соответствующие сеттеры вне обработчиков ввода. Администратор
 * открывал вкладку утром, вечером создавал договор — «Подписано», «Дата
 * подтверждения согласия», «Дата и время выдачи расписки» несли утренний час.
 * Отличить подставленное от введённого человеком нельзя: поле выглядит
 * заполненным. Для документа, который подписывают, это подделка отметки времени.
 *
 * ЧТО СТАЛО. В хранилище поля пусты, а настоящее время подставляется здесь — в
 * момент создания документа. Это и есть честное значение: отметка равна тому
 * моменту, когда документ действительно составлен. Врач по-прежнему может
 * вписать своё время руками, и тогда оно не трогается.
 *
 * Три вида записи, потому что разметка ждёт разные: дата с временем для отметок
 * подписи и выдачи, только дата для номерных документов, «ГГГГ-ММ-ДД» для полей
 * ввода типа date.
 */
export const DOCUMENT_TIMESTAMP_FIELDS: Array<
	[field: string, shape: TimestampShape]
> = [
	["informedConsentConfirmedAt", "dateTime"],
	["procedureConsentConfirmedAt", "dateTime"],
	["paidContractSignedAt", "dateTime"],
	["paymentReceiptDate", "dateTime"],
	["warrantyIssuedAt", "dateTime"],
	["treatmentEstimateSignedAt", "dateTime"],
	["treatmentPlanPlannedAt", "dateTime"],
	["treatmentAcceptanceAcceptedAt", "dateTime"],
	["postVisitPerformedAt", "dateTime"],
	["minorConsentSignedAt", "dateTime"],
	["recordExtractIssuedAt", "dateTime"],
	["paidContractDate", "date"],
	["paymentInvoiceDate", "date"],
	["installmentScheduleDate", "date"],
	["completedActDate", "date"],
	["treatmentEstimateDate", "date"],
	["personalDataConsentGivenAt", "dateTime"],
	["refusalConfirmedAt", "dateTime"],
	["copyRequestRequestedAt", "dateTime"],
	["attendanceIssuedAt", "dateTime"],
	["releaseDeliveredAt", "dateTime"],
	["recordExtractPeriodStart", "isoDate"],
	["recordExtractPeriodEnd", "isoDate"],
	/*
	 * Поле ввода типа datetime-local ждёт «ГГГГ-ММ-ДДTчч:мм», а не русскую запись.
	 * Подставить сюда «28.07.2026, 14:30» значит показать пустое поле: браузер
	 * молча отбрасывает значение, которое не разбирает.
	 */
	["taxApplicationRequestedAt", "dateTimeLocal"],
];
