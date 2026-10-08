import { z } from "zod";
import { clinicalToothRowsSchema } from "./installmentAndLabOrderSchemas.js";
import { documentDateLikeStringSchema } from "./speechProviderSchemas.js";
import { nonNegativeMoneyRubSchema } from "../money.js";

export const labOrderStatusSchema = z.enum([
	"draft",
	"sent",
	"in_progress",
	"shipped",
	"received",
	"refitting",
	"completed",
	"cancelled",
]);

export const STERILIZATION_PACKAGING_TYPES = {
	kraft_heat_sealed: {
		label: "Крафт-пакет (термосварка)",
		shelfLifeDays: 50,
	},
	kraft_self_adhesive: {
		label: "Крафт-пакет (самоклеящийся)",
		shelfLifeDays: 30,
	},
	laminated_heat_sealed: {
		label: "Ламинированный пакет комбинированный (термосварка)",
		shelfLifeDays: 180,
	},
	metal_cassette: {
		label: "Металлическая кассета / контейнер с фильтром",
		shelfLifeDays: 30,
	},
	other: {
		label: "Иной вид упаковки",
		shelfLifeDays: 3,
	},
} as const;

export type SterilizationPackagingType = keyof typeof STERILIZATION_PACKAGING_TYPES;

export const STERILIZATION_INDICATOR_TYPES = {
	class4_multivariable: "Класс 4 — многопараметрический химический индикатор",
	class5_integrating: "Класс 5 — интегрирующий химический индикатор",
	class6_emulating: "Класс 6 — имитирующий индикатор (эмулятор)",
	biological: "Биологический индикатор (споровый тест Geobacillus stearothermophilus)",
	bowie_dick: "Тест Бови-Дика (Bowie-Dick / вакуум-тест)",
} as const;

export type SterilizationIndicatorType = keyof typeof STERILIZATION_INDICATOR_TYPES;

export const STERILIZATION_CYCLE_MODES = {
	B: "Автоклав класс B (фракционированный вакуум: 134°C / 2.1 бар или 121°C / 1.1 бар)",
	S: "Автоклав класс S (однократный вакуум)",
	N: "Автоклав класс N (неупакованные сплошные изделия)",
	dry_heat_180: "Сухожаровой шкаф 180°C 60 мин",
	dry_heat_160: "Сухожаровой шкаф 160°C 150 мин",
	plasma_vh2o2: "Низкотемпературная плазма (пары пероксида водорода)",
	ethylene_oxide: "Этиленоксидная газовая стерилизация",
} as const;

export type SterilizationCycleMode = keyof typeof STERILIZATION_CYCLE_MODES;

export function computePackagingExpirationDate(
	packagingType: SterilizationPackagingType | string | null | undefined,
	sterilizationDate: Date = new Date(),
): Date {
	const validKey = (
		packagingType && packagingType in STERILIZATION_PACKAGING_TYPES
			? packagingType
			: "other"
	) as SterilizationPackagingType;
	const days = STERILIZATION_PACKAGING_TYPES[validKey].shelfLifeDays;
	const expires = new Date(sterilizationDate.getTime());
	expires.setUTCDate(expires.getUTCDate() + days);
	return expires;
}

export const photoVideoConsentMaterialSchema = z.enum([
	"intraoral_photo",
	"face_photo",
	"video",
	"xray",
	"cbct",
	"scan",
	"other",
]);

export type PhotoVideoConsentMaterial = z.infer<
	typeof photoVideoConsentMaterialSchema
>;

export const photoVideoConsentPayloadSchema = z.object({
	clinicalRecordUse: z.literal(true),
	labTransferAllowed: z.boolean(),
	colleagueConsultationAllowed: z.boolean(),
	educationUseAllowed: z.boolean(),
	marketingUseAllowed: z.boolean(),
	recognizablePublicationAllowed: z.boolean(),
	materials: z.array(photoVideoConsentMaterialSchema).min(1).max(7),
	anonymizationRequired: z.literal(true),
	revocationChannel: z.string().trim().min(1).max(240),
	scopeNotes: z.string().trim().max(800).nullable().optional(),
});

export type PhotoVideoConsentPayload = z.infer<
	typeof photoVideoConsentPayloadSchema
>;

export const xrayCbctReferralStudyTypeSchema = z.enum([
	"rvg",
	"opg",
	"cbct",
	"trg",
	"tmj",
	"sinus",
	"photo_protocol",
	"other",
]);

export type XrayCbctReferralStudyType = z.infer<
	typeof xrayCbctReferralStudyTypeSchema
>;

export const xrayCbctReferralPrioritySchema = z.enum(["routine", "urgent"]);

export type XrayCbctReferralPriority = z.infer<
	typeof xrayCbctReferralPrioritySchema
>;

export const xrayCbctReferralPregnancyStatusSchema = z.enum([
	"not_applicable",
	"denied",
	"possible",
	"confirmed",
	"unknown",
]);

export type XrayCbctReferralPregnancyStatus = z.infer<
	typeof xrayCbctReferralPregnancyStatusSchema
>;

export const xrayCbctReferralPayloadSchema = z.object({
	studyType: xrayCbctReferralStudyTypeSchema,
	clinicalToothRows: clinicalToothRowsSchema,
	area: z.string().trim().min(1).max(200),
	clinicalQuestion: z.string().trim().min(1).max(500),
	indication: z.string().trim().min(1).max(500),
	pregnancyStatus: xrayCbctReferralPregnancyStatusSchema,
	safetyNotes: z.string().trim().min(1).max(500),
	priority: xrayCbctReferralPrioritySchema,
	includeDicomExport: z.boolean(),
	includeRadiologistReport: z.boolean(),
	requestedBy: z.string().trim().min(1).max(200),
	recipientClinic: z.string().trim().max(240).nullable().optional(),
	dueDate: z.string().trim().max(80).nullable().optional(),
});

export type XrayCbctReferralPayload = z.infer<
	typeof xrayCbctReferralPayloadSchema
>;

export const medicalDocumentReleaseReceiptPayloadSchema = z.object({
	sourceRequestDocumentId: z.string().uuid(),
	recipientFullName: z.string().trim().min(1).max(240),
	recipientIdentityDocument: z.string().trim().min(1).max(240),
	recipientAuthority: z.string().trim().min(1).max(300),
	releaseChannel: z.enum([
		"paper",
		"pdf",
		"dicom_archive",
		"secure_link",
		"physical_media",
		"other",
	]),
	documentTypes: z.array(z.string().trim().min(1).max(160)).min(1).max(12),
	periodStart: z.string().trim().max(40).nullable().optional(),
	periodEnd: z.string().trim().max(40).nullable().optional(),
	deliveredAt: documentDateLikeStringSchema,
	accessExpiresAt: z.string().trim().max(80).nullable().optional(),
	deliveryProtectionNote: z.string().trim().min(1).max(500),
	thirdPartyDataChecked: z.literal(true),
});

export type MedicalDocumentReleaseReceiptPayload = z.infer<
	typeof medicalDocumentReleaseReceiptPayloadSchema
>;

export const medicalRecordExtractPayloadSchema = z.object({
	periodStart: z.string().trim().min(1).max(40),
	periodEnd: z.string().trim().min(1).max(40),
	sourceVisitIds: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
	complaintAndAnamnesis: z.string().trim().min(1).max(1200),
	objectiveStatus: z.string().trim().min(1).max(1200),
	diagnosis: z.string().trim().min(1).max(1000),
	clinicalToothRows: clinicalToothRowsSchema,
	treatmentProvided: z.string().trim().min(1).max(1600),
	recommendations: z.string().trim().min(1).max(1600),
	doctorFullName: z.string().trim().min(1).max(240),
	recipientFullName: z.string().trim().min(1).max(240),
	recipientAuthority: z.string().trim().min(1).max(300),
	issuedAt: documentDateLikeStringSchema,
	preparedFromSignedMedicalRecords: z.literal(true),
	thirdPartyDataChecked: z.literal(true),
});

export type MedicalRecordExtractPayload = z.infer<
	typeof medicalRecordExtractPayloadSchema
>;

export type OutpatientMedicalCard025uPayload = DentalMedicalCard043uPayload;

export const structuredAnamnesisSchema = z.object({
	narrative: z.string().trim().max(4000).nullable().optional(),
	allergyStatus: z.string().trim().max(500).nullable().optional(),
	currentMedications: z.string().trim().max(1000).nullable().optional(),
	chronicDiseases: z.string().trim().max(1000).nullable().optional(),
	anticoagulants: z.string().trim().max(500).nullable().optional(),
	infectiousDiseases: z.string().trim().max(500).nullable().optional(),
	pregnancyStatus: z.string().trim().max(240).nullable().optional(),
	pastDentalHistory: z.string().trim().max(2000).nullable().optional(),
	generalHealthNotes: z.string().trim().max(2000).nullable().optional(),
});

export type StructuredAnamnesis = z.infer<typeof structuredAnamnesisSchema>;

export const dentalMedicalCard043uOrganizationSchema = z.object({
	fullName: z.string().trim().min(1).max(240),
	shortName: z.string().trim().max(160).nullable(),
	address: z.string().trim().max(240).nullable(),
	phone: z.string().trim().max(64).nullable(),
	ogrn: z.string().trim().max(32).nullable(),
	inn: z.string().trim().max(16).nullable(),
	licenseNumber: z.string().trim().max(64).nullable(),
	licenseIssueDate: z.string().trim().max(32).nullable(),
	licenseAuthority: z.string().trim().max(240).nullable(),
});

export type DentalMedicalCard043uOrganization = z.infer<
	typeof dentalMedicalCard043uOrganizationSchema
>;

export const dentalMedicalCard043uPatientSchema = z.object({
	fullName: z.string().trim().min(1).max(160),
	birthDate: z.string().trim().max(32).nullable(),
	sex: z.string().trim().max(32).nullable(),
	phone: z.string().trim().max(64).nullable(),
	address: z.string().trim().max(240).nullable(),
	documentSeriesNumber: z.string().trim().max(64).nullable(),
	snils: z.string().trim().max(32).nullable(),
	medicalCardNumber: z.string().trim().max(64).nullable(),
});

export type DentalMedicalCard043uPatient = z.infer<
	typeof dentalMedicalCard043uPatientSchema
>;

export const dentalMedicalCard043uDoctorSchema = z.object({
	fullName: z.string().trim().min(1).max(160),
	specialty: z.string().trim().max(120).nullable(),
	position: z.string().trim().max(120).nullable(),
});

export type DentalMedicalCard043uDoctor = z.infer<
	typeof dentalMedicalCard043uDoctorSchema
>;

export const dentalMedicalCard043uPayloadSchema = z.object({
	formNumber: z.literal("043/у"),
	organization: dentalMedicalCard043uOrganizationSchema,
	patient: dentalMedicalCard043uPatientSchema,
	doctor: dentalMedicalCard043uDoctorSchema,
	visitDate: z.string().trim().min(1).max(32),
	visitId: z.string().uuid().nullable().optional(),
	diaryId: z.string().uuid().nullable().optional(),
	complaint: z.string().trim().max(4000).nullable().optional(),
	/** Free-text anamnesis (backward-compatible diary field). */
	anamnesis: z.string().trim().max(4000).nullable().optional(),
	/** Structured anamnesis facts when collected. */
	structuredAnamnesis: structuredAnamnesisSchema.nullable().optional(),
	statusLocalis: z.string().trim().max(4000).nullable().optional(),
	objectiveStatus: z.string().trim().max(4000).nullable().optional(),
	diagnosisIcd10: z.string().trim().max(64).nullable().optional(),
	diagnosisTooth: z.string().trim().max(64).nullable().optional(),
	diagnosisText: z.string().trim().max(2000).nullable().optional(),
	treatmentDescription: z.string().trim().max(8000).nullable().optional(),
	treatmentPlan: z.string().trim().max(4000).nullable().optional(),
	complications: z.string().trim().max(2000).nullable().optional(),
	comorbidities: z.string().trim().max(2000).nullable().optional(),
	instrumentTrayBarcode: z.string().trim().max(128).nullable().optional(),
	clinicalToothRows: clinicalToothRowsSchema.optional(),
	recommendations: z.string().trim().max(4000).nullable().optional(),
	nextVisitPlan: z.string().trim().max(2000).nullable().optional(),
	content: z.string().trim().max(16000).nullable().optional(),
	lockedAt: z.string().trim().max(64).nullable().optional(),
	contentHash: z.string().trim().max(128).nullable().optional(),
});

export type DentalMedicalCard043uPayload = z.infer<
	typeof dentalMedicalCard043uPayloadSchema
>;

export const medicalRecordCopyRequestFormatSchema = z.enum([
	"paper",
	"pdf",
	"dicom_archive",
	"secure_link",
	"physical_media",
	"other",
]);

export type MedicalRecordCopyRequestFormat = z.infer<
	typeof medicalRecordCopyRequestFormatSchema
>;

export const medicalRecordCopyRequestPayloadSchema = z.object({
	requestedDocumentTypes: z
		.array(z.string().trim().min(1).max(180))
		.min(1)
		.max(20),
	periodStart: z.string().trim().max(40).nullable().optional(),
	periodEnd: z.string().trim().max(40).nullable().optional(),
	requestedFormat: medicalRecordCopyRequestFormatSchema,
	recipientFullName: z.string().trim().min(1).max(240),
	recipientIdentityDocument: z.string().trim().min(1).max(240),
	recipientAuthority: z.string().trim().min(1).max(300),
	representativeAuthorityDocument: z
		.string()
		.trim()
		.max(300)
		.nullable()
		.optional(),
	requestedAt: documentDateLikeStringSchema,
	contactForDelivery: z.string().trim().min(1).max(240),
	specialInstructions: z.string().trim().max(700).nullable().optional(),
	includeDicomSourceData: z.boolean(),
	identityVerified: z.literal(true),
	thirdPartyDataExclusionAcknowledged: z.literal(true),
});

export type MedicalRecordCopyRequestPayload = z.infer<
	typeof medicalRecordCopyRequestPayloadSchema
>;

export const postVisitCareTopicSchema = z.enum([
	"extraction",
	"implantation",
	"surgery_aftercare",
	"fixation_aftercare",
	"filling_restoration",
	"endo",
	"surgery",
	"local_anesthesia",
	"hygiene",
	"prosthetics",
	"orthodontics",
	"periodontology",
	"whitening",
	"retention",
	"other",
]);

export type PostVisitCareTopic = z.infer<typeof postVisitCareTopicSchema>;

export const postVisitRecommendationsPayloadSchema = z.object({
	careTopic: postVisitCareTopicSchema,
	procedureName: z.string().trim().min(1).max(500),
	toothOrArea: z.string().trim().min(1).max(240),
	performedAt: documentDateLikeStringSchema,
	doctorFullName: z.string().trim().min(1).max(240),
	allowedAfter: z.array(z.string().trim().min(1).max(240)).min(1).max(12),
	temporaryRestrictions: z
		.array(z.string().trim().min(1).max(300))
		.min(1)
		.max(16),
	medicationAndRinsePlan: z
		.array(z.string().trim().min(1).max(300))
		.min(1)
		.max(16),
	hygieneInstructions: z
		.array(z.string().trim().min(1).max(300))
		.min(1)
		.max(16),
	nutritionInstructions: z
		.array(z.string().trim().min(1).max(300))
		.min(1)
		.max(12),
	urgentWarningSigns: z.array(z.string().trim().min(1).max(300)).min(1).max(16),
	plannedFollowUpAt: z.string().trim().max(120).nullable().optional(),
	clinicContactInstruction: z.string().trim().min(1).max(500),
	telegramSummary: z.string().trim().min(1).max(700),
	patientReceivedPrintedCopy: z.literal(true),
	patientUnderstandsUrgentSigns: z.literal(true),
	safeForTelegramSending: z.literal(true),
});

export type PostVisitRecommendationsPayload = z.infer<
	typeof postVisitRecommendationsPayloadSchema
>;

export const treatmentPlanPayloadSchema = z.object({
	clinicalReason: z.string().trim().min(1).max(700),
	diagnosisSummary: z.string().trim().min(1).max(700),
	teethOrArea: z.string().trim().min(1).max(240),
	clinicalToothRows: clinicalToothRowsSchema,
	treatmentGoals: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
	plannedStages: z
		.array(
			z.object({
				stageName: z.string().trim().min(1).max(180),
				plannedServices: z.string().trim().min(1).max(500),
				plannedTiming: z.string().trim().min(1).max(180),
				clinicalNotes: z.string().trim().max(500).nullable().optional(),
				/*
				 * Сумма этапа плана. Заполняется из цены выполненных услуг
				 * (apps/api/src/ai/visitFlowOrchestrator.ts копирует priceRub как есть),
				 * а цена услуги копейки принимает. С int этап по услуге 1500,50 ронял
				 * весь план целиком.
				 */
				estimatedAmountRub: nonNegativeMoneyRubSchema.nullable().optional(),
			}),
		)
		.min(1)
		.max(24),
	estimatedTotalRub: nonNegativeMoneyRubSchema,
	alternatives: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
	risksAndLimitations: z
		.array(z.string().trim().min(1).max(300))
		.min(1)
		.max(16),
	prognosisAndLimits: z.string().trim().max(900).nullable().optional(),
	controlPlan: z.string().trim().max(700).nullable().optional(),
	doctorFullName: z.string().trim().max(240).nullable().optional(),
	plannedAt: documentDateLikeStringSchema,
	patientQuestionsAnswered: z.literal(true),
	planRequiresSeparateConsent: z.literal(true),
	planRequiresNewApprovalOnChange: z.literal(true),
	patientFriendlyExplanation: z.string().trim().max(4000).nullable().optional(),
	patientHygieneAdvice: z.string().trim().max(4000).nullable().optional(),
	customHygieneTextOverride: z.string().trim().max(4000).nullable().optional(),
});

export type TreatmentPlanPayload = z.infer<typeof treatmentPlanPayloadSchema>;

export const treatmentPlanAcceptanceVariantSchema = z.enum([
	"urgent",
	"standard",
	"optimal",
	"staged",
	"maintenance",
	"other",
]);

export type TreatmentPlanAcceptanceVariant = z.infer<
	typeof treatmentPlanAcceptanceVariantSchema
>;

export const treatmentPlanAcceptancePayloadSchema = z.object({
	selectedVariant: treatmentPlanAcceptanceVariantSchema,
	clinicalGoal: z.string().trim().min(1).max(700),
	diagnosisSummary: z.string().trim().min(1).max(700),
	teethOrArea: z.string().trim().min(1).max(240),
	clinicalToothRows: clinicalToothRowsSchema,
	acceptedStages: z
		.array(
			z.object({
				stageName: z.string().trim().min(1).max(180),
				plannedServices: z.string().trim().min(1).max(500),
				plannedTiming: z.string().trim().min(1).max(180),
				/* Принятый план обязан повторять суммы предложенного — до копейки. */
				estimatedAmountRub: nonNegativeMoneyRubSchema.nullable().optional(),
			}),
		)
		.min(1)
		.max(20),
	estimatedTotalRub: nonNegativeMoneyRubSchema,
	estimateValidUntil: documentDateLikeStringSchema,
	paymentTerms: z.string().trim().min(1).max(700),
	rejectedAlternatives: z
		.array(z.string().trim().min(1).max(300))
		.min(1)
		.max(12),
	risksAndLimitations: z
		.array(z.string().trim().min(1).max(300))
		.min(1)
		.max(12),
	warrantyAndControlTerms: z.string().trim().min(1).max(700),
	doctorFullName: z.string().trim().min(1).max(240),
	acceptedAt: documentDateLikeStringSchema,
	patientQuestionsAnswered: z.literal(true),
	patientUnderstandsAlternatives: z.literal(true),
	patientUnderstandsCostMayChange: z.literal(true),
	revisionRequiresNewApproval: z.literal(true),
});

export type TreatmentPlanAcceptancePayload = z.infer<
	typeof treatmentPlanAcceptancePayloadSchema
>;

export const visitAttendanceCertificatePayloadSchema = z.object({
	attendedAtStart: documentDateLikeStringSchema,
	attendedAtEnd: documentDateLikeStringSchema,
	purpose: z.string().trim().min(1).max(240),
	recipientOrganization: z.string().trim().max(240).nullable().optional(),
	issuedAt: documentDateLikeStringSchema,
	signedByFullName: z.string().trim().min(1).max(240),
	signedByRole: z.string().trim().min(1).max(160),
	diagnosisDisclosureExcluded: z.literal(true),
	notSickLeaveAcknowledged: z.literal(true),
});

export type VisitAttendanceCertificatePayload = z.infer<
	typeof visitAttendanceCertificatePayloadSchema
>;

export const paymentRefundCorrectionActionSchema = z.enum([
	"full_refund",
	"partial_refund",
	"payment_transfer",
	"receipt_correction",
	"payer_details_correction",
]);

export type PaymentRefundCorrectionAction = z.infer<
	typeof paymentRefundCorrectionActionSchema
>;

export const PAYMENT_REFUND_CORRECTION_ACTIONS =
	paymentRefundCorrectionActionSchema.options;

export const paymentRefundCorrectionMethodSchema = z.enum([
	"cash",
	"card",
	"bank_transfer",
	"internal_offset",
	"no_money_movement",
]);
