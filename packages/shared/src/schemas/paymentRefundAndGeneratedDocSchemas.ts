import { z } from "zod";
import { dentalMedicalCard043uPayloadSchema, medicalDocumentReleaseReceiptPayloadSchema, medicalRecordCopyRequestFormatSchema, medicalRecordCopyRequestPayloadSchema, medicalRecordExtractPayloadSchema, paymentRefundCorrectionActionSchema, paymentRefundCorrectionMethodSchema, photoVideoConsentPayloadSchema, postVisitRecommendationsPayloadSchema, treatmentPlanAcceptancePayloadSchema, treatmentPlanPayloadSchema, visitAttendanceCertificatePayloadSchema, xrayCbctReferralPayloadSchema } from "./labOrderAndSterilizationSchemas.js";
import { clinicProfileSchema, documentDateLikeStringSchema } from "./speechProviderSchemas.js";
import { anesthesiaConsentPayloadSchema, clinicalToothRowsSchema, installmentPaymentSchedulePayloadSchema, labWorkOrderPayloadSchema, minorLegalRepresentativeConsentPayloadSchema, prescriptionMedicationPayloadSchema, taxDeductionApplicationPayloadSchema, taxPaymentSelectionPayloadSchema, warrantyServiceMemoPayloadSchema } from "./installmentAndLabOrderSchemas.js";
import { completedWorksActPayloadSchema, paidMedicalServicesContractPayloadSchema, patientIntakeQuestionnairePayloadSchema, paymentInvoicePayloadSchema, paymentReceiptPayloadSchema, treatmentCostEstimatePayloadSchema } from "./telegramAndReceiptSchemas.js";
import { nonNegativeMoneyRubSchema, positiveMoneyRubSchema } from "../money.js";
import { procedureSpecificConsentProcedureSchema } from "../legal/legalContractsAndConsents.js";
import { dailyDentistDiary037uPayloadSchema, type DocumentKind, documentKindSchema, fullForm043uPayloadSchema, legacyTaxDeductionCertificateMinYear, medicalCardExtract003vuPayloadSchema, orthodonticCard043_1uPayloadSchema, radiationDoseSheetPayloadSchema, summaryDentistStatement039uPayloadSchema } from "../documents/index.js";
import { paymentSchema } from "../fiscal/index.js";
import { patientSchema } from "../patients/index.js";

export type PaymentRefundCorrectionMethod = z.infer<
	typeof paymentRefundCorrectionMethodSchema
>;

export const PAYMENT_REFUND_CORRECTION_METHODS =
	paymentRefundCorrectionMethodSchema.options;

export const paymentRefundCorrectionPayloadSchema = z
	.object({
		action: paymentRefundCorrectionActionSchema,
		selectedPaymentIds: z.array(z.string().uuid()).min(1).max(20),
		/*
		 * Возврат или коррекция оплаты. Полный возврат обязан быть РАВЕН платежу, а
		 * платёж может быть 1500,50: с int полный возврат такого платежа был
		 * невозможен, и касса не могла закрыть операцию законно. Сервер сравнивает
		 * сумму с фактически оплаченной (guards.ts, строка с requestedAmountRub).
		 */
		amountRub: positiveMoneyRubSchema,
		reason: z.string().trim().min(1).max(500),
		refundMethod: paymentRefundCorrectionMethodSchema,
		recipientFullName: z.string().trim().min(1).max(240),
		recipientIdentityDocument: z.string().trim().min(1).max(240),
		bankDetails: z.string().trim().max(1000).nullable().optional(),
		originalFiscalReceiptNumber: z.string().trim().min(1).max(120),
		correctionFiscalReceiptNumber: z
			.string()
			.trim()
			.max(120)
			.nullable()
			.optional(),
		accountantDecision: z.string().trim().min(1).max(500),
	})
	.superRefine((value, context) => {
		if (
			new Set(value.selectedPaymentIds).size !== value.selectedPaymentIds.length
		) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["selectedPaymentIds"],
				message: "Каждый исходный платеж можно выбрать только один раз.",
			});
		}
	});

export type PaymentRefundCorrectionPayload = z.infer<
	typeof paymentRefundCorrectionPayloadSchema
>;

export const informedConsentPayloadSchema = z.object({
	intervention: z.string().trim().min(1).max(500),
	toothOrArea: z.string().trim().min(1).max(240),
	diagnosisOrIndication: z.string().trim().min(1).max(500),
	expectedBenefit: z.string().trim().min(1).max(500),
	plannedAnesthesia: z.string().trim().max(300).nullable().optional(),
	materialOrMedicationNotes: z.string().trim().max(500).nullable().optional(),
	trustedContactForMedicalInfo: z
		.string()
		.trim()
		.max(240)
		.nullable()
		.optional(),
	explainedRisks: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
	alternatives: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
	aftercareRequirements: z
		.array(z.string().trim().min(1).max(240))
		.min(1)
		.max(12),
	doctorFullName: z.string().trim().max(240).default(""),
	consentConfirmedAt: documentDateLikeStringSchema,
	patientQuestionsAnswered: z.literal(true),
	patientUnderstandsRisks: z.literal(true),
	patientMayWithdrawBeforeIntervention: z.literal(true),
});

export type InformedConsentPayload = z.infer<
	typeof informedConsentPayloadSchema
>;

export const procedureSpecificConsentPayloadSchema = z.object({
	procedureType: procedureSpecificConsentProcedureSchema,
	procedureName: z.string().trim().min(1).max(500),
	toothOrArea: z.string().trim().min(1).max(240),
	diagnosisOrIndication: z.string().trim().min(1).max(500),
	clinicalToothRows: clinicalToothRowsSchema,
	plannedAnesthesia: z.string().trim().max(300).nullable().optional(),
	materialsAndSystems: z.string().trim().max(700).nullable().optional(),
	patientSpecificRiskFactors: z
		.array(z.string().trim().min(1).max(240))
		.min(1)
		.max(12),
	procedureSpecificRisks: z
		.array(z.string().trim().min(1).max(240))
		.min(1)
		.max(16),
	alternatives: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
	aftercareAndLimits: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
	doctorFullName: z.string().trim().min(1).max(240),
	consentConfirmedAt: documentDateLikeStringSchema,
	localClinicFormAttached: z.boolean(),
	patientQuestionsAnswered: z.literal(true),
	exactProcedureConfirmed: z.literal(true),
	patientUnderstandsSpecificRisks: z.literal(true),
});

export type ProcedureSpecificConsentPayload = z.infer<
	typeof procedureSpecificConsentPayloadSchema
>;

export const personalDataProcessingConsentPayloadSchema = z.object({
	operatorLegalName: z.string().trim().min(1).max(240),
	operatorInn: z
		.string()
		.trim()
		.regex(/^\d{10}$|^\d{12}$/),
	operatorAddress: z.string().trim().min(1).max(500),
	processingPurposes: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
	personalDataCategories: z
		.array(z.string().trim().min(1).max(240))
		.min(1)
		.max(20),
	processingActions: z.array(z.string().trim().min(1).max(180)).min(1).max(20),
	thirdPartyTransferRules: z.string().trim().min(1).max(700),
	crossBorderTransferAllowed: z.boolean(),
	automatedDecisionMakingAllowed: z.boolean(),
	retentionPeriod: z.string().trim().min(1).max(300),
	revocationChannel: z.string().trim().min(1).max(500),
	consentGivenAt: documentDateLikeStringSchema,
	patientConfirmedVoluntaryConsent: z.literal(true),
	medicalDataProcessingAcknowledged: z.literal(true),
});

export type PersonalDataProcessingConsentPayload = z.infer<
	typeof personalDataProcessingConsentPayloadSchema
>;

export const medicalInterventionRefusalPayloadSchema = z.object({
	refusedIntervention: z.string().trim().min(1).max(500),
	clinicalIndication: z.string().trim().min(1).max(500),
	patientReason: z.string().trim().max(500).nullable().optional(),
	explainedRisks: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
	alternativesOffered: z
		.array(z.string().trim().min(1).max(240))
		.min(1)
		.max(12),
	urgentWarningSigns: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
	doctorFullName: z.string().trim().min(1).max(240),
	refusalConfirmedAt: documentDateLikeStringSchema,
	patientUnderstandsConsequences: z.literal(true),
	secondOpinionOffered: z.literal(true),
	emergencyCareExplained: z.literal(true),
});

export type MedicalInterventionRefusalPayload = z.infer<
	typeof medicalInterventionRefusalPayloadSchema
>;

export const documentPayloadSchema = z
	.object({
		patientIntakeQuestionnaire:
			patientIntakeQuestionnairePayloadSchema.optional(),
		paidMedicalServicesContract:
			paidMedicalServicesContractPayloadSchema.optional(),
		completedWorksAct: completedWorksActPayloadSchema.optional(),
		treatmentCostEstimate: treatmentCostEstimatePayloadSchema.optional(),
		paymentInvoice: paymentInvoicePayloadSchema.optional(),
		paymentReceipt: paymentReceiptPayloadSchema.optional(),
		installmentPaymentSchedule:
			installmentPaymentSchedulePayloadSchema.optional(),
		minorLegalRepresentativeConsent:
			minorLegalRepresentativeConsentPayloadSchema.optional(),
		warrantyServiceMemo: warrantyServiceMemoPayloadSchema.optional(),
		taxDeductionApplication: taxDeductionApplicationPayloadSchema.optional(),
		taxPaymentSelection: taxPaymentSelectionPayloadSchema.optional(),
		anesthesiaConsentLog: anesthesiaConsentPayloadSchema.optional(),
		prescriptionMedicationOrder: prescriptionMedicationPayloadSchema.optional(),
		labWorkOrder: labWorkOrderPayloadSchema.optional(),
		photoVideoConsent: photoVideoConsentPayloadSchema.optional(),
		xrayCbctReferral: xrayCbctReferralPayloadSchema.optional(),
		medicalDocumentReleaseReceipt:
			medicalDocumentReleaseReceiptPayloadSchema.optional(),
		outpatientMedicalCard025u:
			z.record(z.string(), z.unknown()).optional(),
		dentalMedicalCard043u: dentalMedicalCard043uPayloadSchema.optional(),
		fullForm043u: fullForm043uPayloadSchema.optional(),
		orthodonticCard043_1u: orthodonticCard043_1uPayloadSchema.optional(),
		dailyDentistDiary037u: dailyDentistDiary037uPayloadSchema.optional(),
		summaryDentistStatement039u:
			summaryDentistStatement039uPayloadSchema.optional(),
		medicalCardExtract003vu: medicalCardExtract003vuPayloadSchema.optional(),
		radiationDoseSheet: radiationDoseSheetPayloadSchema.optional(),
		medicalRecordExtract: medicalRecordExtractPayloadSchema.optional(),
		medicalRecordCopyRequest: medicalRecordCopyRequestPayloadSchema.optional(),
		postVisitRecommendations: postVisitRecommendationsPayloadSchema.optional(),
		treatmentPlan: treatmentPlanPayloadSchema.optional(),
		treatmentPlanAcceptance: treatmentPlanAcceptancePayloadSchema.optional(),
		visitAttendanceCertificate:
			visitAttendanceCertificatePayloadSchema.optional(),
		paymentRefundCorrection: paymentRefundCorrectionPayloadSchema.optional(),
		informedConsent: informedConsentPayloadSchema.optional(),
		procedureSpecificConsent: procedureSpecificConsentPayloadSchema.optional(),
		personalDataProcessingConsent:
			personalDataProcessingConsentPayloadSchema.optional(),
		medicalInterventionRefusal:
			medicalInterventionRefusalPayloadSchema.optional(),
	})
	.strict();

export type DocumentPayload = z.infer<typeof documentPayloadSchema>;

export type DocumentPayloadKey = keyof DocumentPayload;

export const taxPaymentSnapshotSchema = z.object({
	createdAt: z.string(),
	taxYear: z.number().int().min(legacyTaxDeductionCertificateMinYear).max(2100),
	taxPayerInn: z
		.string()
		.trim()
		.regex(/^\d{10}$|^\d{12}$/)
		.nullable(),
	paymentIds: z.array(z.string().uuid()).min(1).max(200),
	fiscalReceiptKeys: z.array(z.string().trim().min(1).max(160)).min(1).max(200),
	payments: z.array(paymentSchema).min(1).max(200),
});

export type TaxPaymentSnapshot = z.infer<typeof taxPaymentSnapshotSchema>;

export const documentPayloadKeysByKind: Partial<
	Record<DocumentKind, readonly DocumentPayloadKey[]>
> = {
	patient_intake_questionnaire: ["patientIntakeQuestionnaire"],
	paid_medical_services_contract: ["paidMedicalServicesContract"],
	completed_works_act: ["completedWorksAct"],
	treatment_cost_estimate: ["treatmentCostEstimate"],
	payment_invoice: ["paymentInvoice"],
	payment_receipt: ["paymentReceipt"],
	installment_payment_schedule: ["installmentPaymentSchedule"],
	minor_legal_representative_consent: ["minorLegalRepresentativeConsent"],
	warranty_service_memo: ["warrantyServiceMemo"],
	tax_deduction_application: ["taxDeductionApplication"],
	tax_deduction_certificate: ["taxPaymentSelection"],
	legacy_tax_deduction_certificate: ["taxPaymentSelection"],
	tax_deduction_registry: ["taxPaymentSelection"],
	anesthesia_consent_log: ["anesthesiaConsentLog"],
	prescription_medication_order: ["prescriptionMedicationOrder"],
	lab_work_order: ["labWorkOrder"],
	photo_video_consent: ["photoVideoConsent"],
	xray_cbct_referral: ["xrayCbctReferral"],
	medical_document_release_receipt: ["medicalDocumentReleaseReceipt"],
	outpatient_medical_card_025u: ["outpatientMedicalCard025u"],
	dental_medical_card_043u: ["dentalMedicalCard043u", "fullForm043u"],
	orthodontic_medical_card_043_1u: ["orthodonticCard043_1u"],
	daily_dentist_diary_037u: ["dailyDentistDiary037u"],
	summary_dentist_statement_039u: ["summaryDentistStatement039u"],
	medical_record_extract: ["medicalRecordExtract", "medicalCardExtract003vu"],
	radiation_dose_sheet: ["radiationDoseSheet"],
	medical_record_copy_request: ["medicalRecordCopyRequest"],
	post_visit_recommendations: ["postVisitRecommendations"],
	treatment_plan: ["treatmentPlan"],
	treatment_plan_acceptance: ["treatmentPlanAcceptance"],
	visit_attendance_certificate: ["visitAttendanceCertificate"],
	payment_refund_correction_request: ["paymentRefundCorrection"],
	informed_consent: ["informedConsent"],
	procedure_specific_consent_packet: ["procedureSpecificConsent"],
	personal_data_processing_consent: ["personalDataProcessingConsent"],
	medical_intervention_refusal: ["medicalInterventionRefusal"],
};

export function documentPayloadAllowedKeys(
	kind: DocumentKind,
): readonly DocumentPayloadKey[] {
	return documentPayloadKeysByKind[kind] ?? [];
}

export function documentPayloadActualKeys(
	payload: DocumentPayload | null | undefined,
): DocumentPayloadKey[] {
	if (!payload) return [];
	return Object.entries(payload)
		.filter(([, value]) => value !== undefined)
		.map(([key]) => key as DocumentPayloadKey);
}

export function documentPayloadDisallowedKeys(
	kind: DocumentKind,
	payload: DocumentPayload | null | undefined,
): DocumentPayloadKey[] {
	const allowed = documentPayloadAllowedKeys(kind);
	return documentPayloadActualKeys(payload).filter(
		(key) => !allowed.includes(key),
	);
}

export const documentIssueSignatureModeSchema = z.enum([
	"paper_signed",
	"simple_electronic_signature",
	"enhanced_non_qualified_electronic_signature",
	"qualified_electronic_signature",
]);

export type DocumentIssueSignatureMode = z.infer<
	typeof documentIssueSignatureModeSchema
>;

export const documentIssueSignatureAttestationSchema = z
	.object({
		mode: documentIssueSignatureModeSchema,
		signedAt: documentDateLikeStringSchema,
		recipientFullName: z.string().trim().min(1).max(240),
		recipientRole: z.string().trim().min(1).max(120),
		staffFullName: z.string().trim().min(1).max(240),
		staffRole: z.string().trim().min(1).max(120),
		identityChecked: z.literal(true),
		documentOpenedAndChecked: z.literal(true),
		recipientSigned: z.literal(true),
		clinicRepresentativeSigned: z.literal(true),
		note: z.string().trim().max(500).nullable().optional(),
	})
	.strict();

export type DocumentIssueSignatureAttestation = z.infer<
	typeof documentIssueSignatureAttestationSchema
>;

export const issueDocumentSchema = z
	.object({
		signatureAttestation: documentIssueSignatureAttestationSchema,
	})
	.strict();

export type IssueDocumentInput = z.infer<typeof issueDocumentSchema>;

export const documentVoidReasonCodeSchema = z.enum([
	"draft_error",
	"issued_in_error",
	"patient_request",
	"duplicate_document",
	"tax_certificate_correction",
	"medical_release_correction",
	"payment_correction",
	"other",
]);

export type DocumentVoidReasonCode = z.infer<
	typeof documentVoidReasonCodeSchema
>;

export const documentVoidAttestationSchema = z
	.object({
		reasonCode: documentVoidReasonCodeSchema,
		reasonText: z.string().trim().min(12).max(700),
		voidedAt: documentDateLikeStringSchema,
		staffFullName: z.string().trim().min(1).max(240),
		staffRole: z.string().trim().min(1).max(120),
		correctionDocumentId: z.string().uuid().nullable().optional(),
		replacementRequired: z.boolean().default(false),
		patientOrPayerNotified: z.boolean().default(false),
		archivePreserved: z.literal(true),
		statusReviewed: z.literal(true),
	})
	.strict();

export type DocumentVoidAttestation = z.infer<
	typeof documentVoidAttestationSchema
>;

export const voidDocumentSchema = z
	.object({
		voidAttestation: documentVoidAttestationSchema,
	})
	.strict();

export type VoidDocumentInput = z.infer<typeof voidDocumentSchema>;

export const documentReleaseJournalEntryKindSchema = z.enum([
	"request_registered",
	"extract_issued",
	"release_completed",
]);

export type DocumentReleaseJournalEntryKind = z.infer<
	typeof documentReleaseJournalEntryKindSchema
>;

export const documentReleaseMaterialKindSchema = z.enum([
	"original",
	"copy",
	"extract",
	"dicom_archive",
	"mixed",
	"other",
]);

export type DocumentReleaseMaterialKind = z.infer<
	typeof documentReleaseMaterialKindSchema
>;

export const documentReleaseJournalEntrySchema = z
	.object({
		id: z.string().uuid(),
		entryKind: documentReleaseJournalEntryKindSchema,
		documentId: z.string().uuid(),
		sourceRequestDocumentId: z.string().uuid().nullable(),
		organizationId: z.string().uuid(),
		patientId: z.string().uuid(),
		visitId: z.string().uuid().nullable(),
		materialKind: documentReleaseMaterialKindSchema,
		deliveryMethod: medicalRecordCopyRequestFormatSchema,
		documentTypes: z.array(z.string().trim().min(1).max(180)).min(1).max(20),
		periodStart: z.string().trim().max(40).nullable(),
		periodEnd: z.string().trim().max(40).nullable(),
		recipientFullName: z.string().trim().min(1).max(240),
		recipientIdentityDocument: z.string().trim().max(240).nullable(),
		recipientAuthority: z.string().trim().min(1).max(300),
		deliveredAt: documentDateLikeStringSchema,
		retentionPolicy: z.string().trim().min(1).max(500),
		sourceSnapshotSha256: z
			.string()
			.regex(/^[a-f0-9]{64}$/)
			.nullable(),
		createdAt: z.string(),
		createdByUserId: z.string().uuid().nullable(),
	})
	.strict();

export type DocumentReleaseJournalEntry = z.infer<
	typeof documentReleaseJournalEntrySchema
>;

export const taxXmlSourceSnapshotSchema = z
	.object({
		createdAt: z.string(),
		patient: patientSchema,
		clinicProfile: clinicProfileSchema,
		payments: z.array(paymentSchema),
	})
	.strict();

export type TaxXmlSourceSnapshot = z.infer<typeof taxXmlSourceSnapshotSchema>;

export const taxXmlSnapshotSchema = z
	.object({
		fileName: z.string().trim().min(1).max(180),
		xml: z.string().min(1),
		sha256: z.string().regex(/^[a-f0-9]{64}$/),
		createdAt: z.string(),
		taxOfficeCode: z.string().regex(/^\d{4}$/),
		sourceSnapshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
	})
	.strict();

export type TaxXmlSnapshot = z.infer<typeof taxXmlSnapshotSchema>;

export const documentStatusSchema = z.enum(["draft", "issued", "voided"]);

export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const generatedDocumentSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	visitId: z.string().uuid().nullable(),
	kind: documentKindSchema,
	title: z.string(),
	status: documentStatusSchema,
	issuedAt: z.string().nullable(),
	/*
	 * Сумма выданного документа. Было z.number().nonnegative(): копейки
	 * проходили, но проходило и 1500,5555, и 0,001 — то есть значение, которое
	 * колонка generated_documents.total_amount_rub типа numeric(12, 2) молча
	 * обрежет, а
	 * документ на руках у пациента и запись в базе разойдутся. Точность до
	 * копейки теперь обязательна.
	 */
	totalAmountRub: nonNegativeMoneyRubSchema.nullable(),
	taxYear: z
		.number()
		.int()
		.min(legacyTaxDeductionCertificateMinYear)
		.max(2100)
		.nullable()
		.optional(),
	taxPayerInn: z
		.string()
		.trim()
		.regex(/^\d{10}$|^\d{12}$/)
		.nullable()
		.optional(),
	taxPaymentSnapshot: taxPaymentSnapshotSchema.nullable().optional(),
	payload: documentPayloadSchema.nullable().optional(),
	signatureAttestation: documentIssueSignatureAttestationSchema
		.nullable()
		.optional(),
	voidAttestation: documentVoidAttestationSchema.nullable().optional(),
	releaseJournalEntry: documentReleaseJournalEntrySchema.nullable().optional(),
	taxXmlSourceSnapshot: taxXmlSourceSnapshotSchema.nullable().optional(),
	taxXmlSnapshot: taxXmlSnapshotSchema.nullable().optional(),
	storagePath: z.string().nullable().optional(),
	issuedSnapshotSha256: z.string().nullable().optional(),
	issuedSnapshotCreatedAt: z.string().nullable().optional(),
	issuedByUserId: z.string().uuid().nullable().optional(),
	voidedAt: z.string().nullable().optional(),
	voidedByUserId: z.string().uuid().nullable().optional(),
	cryptoSignaturePkcs7: z.string().nullable().optional(),
	doctorSignaturePkcs7: z.string().nullable().optional(),
	doctorCertSerial: z.string().nullable().optional(),
	doctorCertSubject: z.string().nullable().optional(),
	doctorSignedAt: z.string().nullable().optional(),
});

export type GeneratedDocument = z.infer<typeof generatedDocumentSchema>;
