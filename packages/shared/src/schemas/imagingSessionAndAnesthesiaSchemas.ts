import { z } from "zod";
import { imagingViewerStateSchema } from "./migrationBridgeAndViewerSchemas.js";
import { visitNoteDraftSchema } from "./localBridgeAndSpeechTokensSchemas.js";
import { postVisitRecommendationsPayloadSchema, treatmentPlanPayloadSchema } from "./labOrderAndSterilizationSchemas.js";
import { dentalSpecialtySchema } from "./aiAndEgiszSchemas.js";
import { nonNegativeMoneyRubSchema } from "../money.js";

export const imagingViewerSaveSessionPayloadSchema = z.object({
	studyId: z.string(),
	state: imagingViewerStateSchema,
	savedAt: z.string(),
});

export type ImagingViewerSaveSessionPayload = z.infer<
	typeof imagingViewerSaveSessionPayloadSchema
>;

export const imagingViewerSaveStateSchema =
	imagingViewerSaveSessionPayloadSchema;

export const sharedLocalImagingFolderDraftSchema = z.object({
	folderPath: z.string(),
	patientName: z.string().nullable().optional(),
	patientPhone: z.string().nullable().optional(),
	fileCount: z.number().int().nonnegative(),
	detectedKind: z.string().nullable().optional(),
});

export type SharedLocalImagingFolderDraft = z.infer<
	typeof sharedLocalImagingFolderDraftSchema
>;

export const sharedBrowserPickedImagingFolderPreviewSchema = z.object({
	folderName: z.string(),
	totalFiles: z.number().int().nonnegative(),
	readyFiles: z.number().int().nonnegative(),
	warningFiles: z.number().int().nonnegative(),
	blockedFiles: z.number().int().nonnegative(),
});

export type SharedBrowserPickedImagingFolderPreview = z.infer<
	typeof sharedBrowserPickedImagingFolderPreviewSchema
>;

export const sharedBrowserImagingScanProgressSchema = z.object({
	phase: z.enum(["scanning", "parsing", "completed", "error"]),
	scannedFiles: z.number().int().nonnegative(),
	totalFiles: z.number().int().nonnegative(),
	errorMessage: z.string().optional(),
});

export type SharedBrowserImagingScanProgress = z.infer<
	typeof sharedBrowserImagingScanProgressSchema
>;

export const visitFlowStepStatusSchema = z.enum([
	"pending",
	"running",
	"success",
	"skipped",
	"error",
]);

export type VisitFlowStepStatus = z.infer<typeof visitFlowStepStatusSchema>;

export const visitFlowStepKindSchema = z.enum([
	"draft",
	"plan",
	"recommendations",
	"documents",
]);

export type VisitFlowStepKind = z.infer<typeof visitFlowStepKindSchema>;

export const visitFlowDocumentSuggestionsSchema = z.object({
	suggestions: z.array(z.string().trim().min(1).max(120)).max(24),
});

export type VisitFlowDocumentSuggestions = z.infer<
	typeof visitFlowDocumentSuggestionsSchema
>;

export const visitFlowDraftStepResultSchema = z.object({
	step: z.literal("draft"),
	status: visitFlowStepStatusSchema,
	message: z.string().nullable(),
	data: visitNoteDraftSchema.nullable(),
});

export type VisitFlowDraftStepResult = z.infer<
	typeof visitFlowDraftStepResultSchema
>;

export const visitFlowPlanStepResultSchema = z.object({
	step: z.literal("plan"),
	status: visitFlowStepStatusSchema,
	message: z.string().nullable(),
	data: treatmentPlanPayloadSchema.nullable(),
});

export type VisitFlowPlanStepResult = z.infer<
	typeof visitFlowPlanStepResultSchema
>;

export const visitFlowRecommendationsStepResultSchema = z.object({
	step: z.literal("recommendations"),
	status: visitFlowStepStatusSchema,
	message: z.string().nullable(),
	data: postVisitRecommendationsPayloadSchema.nullable(),
});

export type VisitFlowRecommendationsStepResult = z.infer<
	typeof visitFlowRecommendationsStepResultSchema
>;

export const visitFlowDocumentsStepResultSchema = z.object({
	step: z.literal("documents"),
	status: visitFlowStepStatusSchema,
	message: z.string().nullable(),
	data: visitFlowDocumentSuggestionsSchema.nullable(),
});

export type VisitFlowDocumentsStepResult = z.infer<
	typeof visitFlowDocumentsStepResultSchema
>;

export const visitFlowStepResultSchema = z.discriminatedUnion("step", [
	visitFlowDraftStepResultSchema,
	visitFlowPlanStepResultSchema,
	visitFlowRecommendationsStepResultSchema,
	visitFlowDocumentsStepResultSchema,
]);

export type VisitFlowStepResult = z.infer<typeof visitFlowStepResultSchema>;

export const visitFlowRequestSchema = z.object({
	patientId: z.string().uuid().optional(),
	visitId: z.string().uuid().optional(),
	transcript: z.string(),
	specialty: dentalSpecialtySchema.optional(),
	source: z.string().optional(),
	doctorFullName: z.string().nullable().optional(),
	completedServices: z
		.array(
			z.object({
				serviceId: z.string(),
				title: z.string(),
				quantity: z.number(),
				/*
				 * Было z.number() без ограничений: проходили и -5000, и 1500,5555. Отсюда
				 * цена уходит в estimatedAmountRub этапа плана
				 * (apps/api/src/ai/visitFlowOrchestrator.ts), где сумма обязана быть
				 * неотрицательной и с точностью до копейки, — проверять надо на входе, а не
				 * ловить обвал плана на выходе.
				 */
				priceRub: nonNegativeMoneyRubSchema,
				toothCode: z.string().nullable().optional(),
				toothNumber: z.union([z.number().int(), z.string()]).nullable().optional(),
				code804n: z.string().optional(),
			}),
		)
		.optional(),
	orchestratorConfig: z
		.object({
			enablePlan: z.boolean().optional(),
			enableRecommendations: z.boolean().optional(),
			enableDocuments: z.boolean().optional(),
		})
		.optional(),
	planPayload: treatmentPlanPayloadSchema.nullable().optional(),
	recommendationsPayload: postVisitRecommendationsPayloadSchema.nullable().optional(),
});

export type VisitFlowRequest = z.infer<typeof visitFlowRequestSchema>;

export const visitFlowResultSchema = z.object({
	draft: visitFlowDraftStepResultSchema,
	plan: visitFlowPlanStepResultSchema,
	recommendations: visitFlowRecommendationsStepResultSchema,
	documents: visitFlowDocumentsStepResultSchema,
	overallStatus: z.enum(["success", "partial", "error"]),
});

export type VisitFlowResult = z.infer<typeof visitFlowResultSchema>;

export const urgentScheduleRequestSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientName: z.string(),
	requestType: z.string(),
	urgencyLevel: z.string(),
	doctorName: z.string(),
	preferredSlotTime: z.string(),
	isResolved: z.boolean(),
	createdAt: z.string(),
});

export type UrgentScheduleRequest = z.infer<typeof urgentScheduleRequestSchema>;

export const messageTemplateCatalogSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	title: z.string().min(1, "Название обязательно"),
	channel: z.string(),
	intent: z.string(),
	templateText: z.string().min(1, "Текст шаблона обязателен"),
	variables: z.any().optional().nullable(),
	isActive: z.boolean(),
	createdAt: z.any().optional(), // Can be string or Date, handle flexibly
});

export type MessageTemplateCatalog = z.infer<
	typeof messageTemplateCatalogSchema
>;

export const createMessageTemplateCatalogSchema = messageTemplateCatalogSchema
	.pick({
		title: true,
		channel: true,
		intent: true,
		templateText: true,
		variables: true,
	})
	.extend({
		isActive: z.boolean().optional(),
	});

export type CreateMessageTemplateCatalogInput = z.infer<
	typeof createMessageTemplateCatalogSchema
>;

export const updateMessageTemplateCatalogSchema =
	createMessageTemplateCatalogSchema.partial();

export type UpdateMessageTemplateCatalogInput = z.infer<
	typeof updateMessageTemplateCatalogSchema
>;

export const loyaltyProgramTierSchema = z.enum([
	"bronze",
	"silver",
	"gold",
	"platinum",
	"vip",
]);

export type LoyaltyProgramTier = z.infer<typeof loyaltyProgramTierSchema>;

export const loyaltyProgramSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	name: z.string().min(1).max(200),
	tier: loyaltyProgramTierSchema.default("bronze"),
	minSpendThresholdRub: z.number().nonnegative().default(0),
	cashbackPercent: z.number().min(0).max(100).default(3),
	maxInvoiceCoveragePercent: z.number().min(0).max(100).default(30),
	pointsTtlDays: z.number().int().positive().nullable().optional().default(180),
	pointRateRub: z.number().positive().default(1),
	isActive: z.boolean().default(true),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

export type LoyaltyProgram = z.infer<typeof loyaltyProgramSchema>;

export const patientBonusBalanceSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	activePoints: z.number().nonnegative().default(0),
	pendingPoints: z.number().nonnegative().default(0),
	lifetimeEarnedPoints: z.number().nonnegative().default(0),
	lifetimeSpentPoints: z.number().nonnegative().default(0),
	lifetimeExpiredPoints: z.number().nonnegative().default(0),
	currentLoyaltyProgramId: z.string().uuid().nullable().optional(),
	tier: loyaltyProgramTierSchema.default("bronze"),
	cashbackPercent: z.number().min(0).max(100).default(3),
	maxInvoiceCoveragePercent: z.number().min(0).max(100).default(30),
	updatedAt: z.string().optional(),
});

export type PatientBonusBalance = z.infer<typeof patientBonusBalanceSchema>;

export const bonusTransactionTypeSchema = z.enum([
	"accrual_payment",
	"accrual_referral_l1",
	"accrual_referral_l2",
	"accrual_welcome",
	"accrual_birthday",
	"accrual_manual_admin",
	"redemption_payment",
	"expiration",
	"reversal_refund",
]);

export type BonusTransactionType = z.infer<typeof bonusTransactionTypeSchema>;

export const bonusTransactionSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	amountPoints: z.number(),
	balanceAfterPoints: z.number().nonnegative(),
	type: bonusTransactionTypeSchema,
	relatedPaymentId: z.string().uuid().nullable().optional(),
	relatedInvoiceId: z.string().uuid().nullable().optional(),
	relatedReferralId: z.string().uuid().nullable().optional(),
	expiresAt: z.string().nullable().optional(),
	unspentPoints: z.number().nonnegative().default(0),
	clientMutationId: z.string().nullable().optional(),
	description: z.string(),
	createdById: z.string().uuid().nullable().optional(),
	createdAt: z.string(),
});

export type BonusTransaction = z.infer<typeof bonusTransactionSchema>;

export const referralCampaignSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	name: z.string().min(1).max(200),
	isActive: z.boolean().default(true),
	refereeWelcomePoints: z.number().nonnegative().default(500),
	referrerTier1Points: z.number().nonnegative().default(1000),
	referrerTier2Points: z.number().nonnegative().default(300),
	minFirstSpendThresholdRub: z.number().nonnegative().default(1500),
	shareMessageTemplate: z.string().default(
		"Привет! Дарю тебе 500 ₽ на первое лечение в стоматологии {clinicName}. Запишись по ссылке: {inviteLink}",
	),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

export type ReferralCampaign = z.infer<typeof referralCampaignSchema>;

export const patientReferralCodeSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	referralCode: z.string(),
	referralToken: z.string(),
	inviteUrl: z.string().url().optional(),
	clickCount: z.number().int().nonnegative().default(0),
	signupCount: z.number().int().nonnegative().default(0),
	convertedCount: z.number().int().nonnegative().default(0),
	createdAt: z.string().optional(),
});

export type PatientReferralCode = z.infer<typeof patientReferralCodeSchema>;

export const referralStatusSchema = z.enum([
	"registered",
	"appointment_booked",
	"first_visit_paid",
	"rewarded",
	"expired",
	"rejected_fraud",
]);

export type ReferralStatus = z.infer<typeof referralStatusSchema>;

export const patientReferralSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	campaignId: z.string().uuid().nullable().optional(),
	referrerPatientId: z.string().uuid(),
	parentReferrerPatientId: z.string().uuid().nullable().optional(),
	refereePatientId: z.string().uuid(),
	status: referralStatusSchema.default("registered"),
	qualifyingPaymentId: z.string().uuid().nullable().optional(),
	qualifyingAmountRub: z.number().nonnegative().nullable().optional(),
	rewardedAt: z.string().nullable().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

export type PatientReferral = z.infer<typeof patientReferralSchema>;

export function calculateMaxRedeemablePoints(
	invoiceAmountRub: number,
	activePoints: number,
	maxCoveragePercent = 30,
	pointRateRub = 1,
): {
	maxAllowedPoints: number;
	maxDiscountRub: number;
	remainingPaymentRub: number;
} {
	if (invoiceAmountRub <= 0 || activePoints <= 0 || pointRateRub <= 0) {
		return {
			maxAllowedPoints: 0,
			maxDiscountRub: 0,
			remainingPaymentRub: Math.max(0, invoiceAmountRub),
		};
	}

	const maxInvoiceCoverageRub = Number(
		((invoiceAmountRub * maxCoveragePercent) / 100).toFixed(2),
	);
	const maxPointsByCoverage = Math.floor(maxInvoiceCoverageRub / pointRateRub);
	const maxAllowedPoints = Math.min(Math.floor(activePoints), maxPointsByCoverage);
	const maxDiscountRub = Number((maxAllowedPoints * pointRateRub).toFixed(2));
	const remainingPaymentRub = Number((invoiceAmountRub - maxDiscountRub).toFixed(2));

	return {
		maxAllowedPoints,
		maxDiscountRub,
		remainingPaymentRub,
	};
}

export function calculateCashbackPoints(
	paidAmountRub: number,
	cashbackPercent: number,
	pointRateRub = 1,
): number {
	if (paidAmountRub <= 0 || cashbackPercent <= 0 || pointRateRub <= 0) {
		return 0;
	}
	const cashbackRub = (paidAmountRub * cashbackPercent) / 100;
	return Number((cashbackRub / pointRateRub).toFixed(2));
}

export const anestheticDrugSchema = z.enum([
	"articaine",
	"mepivacaine",
	"lidocaine",
	"bupivacaine",
]);

export type AnestheticDrug = z.infer<typeof anestheticDrugSchema>;

export const vasoconstrictorRatioSchema = z.enum([
	"none",
	"1:100000",
	"1:200000",
	"1:50000",
]);

export type VasoconstrictorRatio = z.infer<typeof vasoconstrictorRatioSchema>;

export const anesthesiaTechniqueSchema = z.enum([
	"infiltration",
	"mandibular_block",
	"tuberal_block",
	"infraorbital_block",
	"incisive_block",
	"palatine_block",
	"mental_block",
	"intraligamentary",
	"intraseptal",
	"intraosseous",
	"sedation_nitrous",
	"sedation_iv",
]);

export type AnesthesiaTechnique = z.infer<typeof anesthesiaTechniqueSchema>;

export const asaClassificationSchema = z.enum([
	"ASA_I",
	"ASA_II",
	"ASA_III",
	"ASA_IV",
]);

export type AsaClassification = z.infer<typeof asaClassificationSchema>;

export const vitalSignsMeasurementSchema = z.object({
	systolicBp: z.number().int().min(40).max(300),
	diastolicBp: z.number().int().min(20).max(200),
	heartRateBpm: z.number().int().min(30).max(250),
	spO2Pct: z.number().int().min(50).max(100).optional().nullable(),
	respiratoryRate: z.number().int().min(5).max(60).optional().nullable(),
	measuredAt: z.string(),
});

export type VitalSignsMeasurement = z.infer<typeof vitalSignsMeasurementSchema>;

export const anesthesiaLogRecordSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	visitId: z.string().uuid().optional().nullable(),
	patientId: z.string().uuid(),
	doctorId: z.string().uuid().optional().nullable(),
	technique: anesthesiaTechniqueSchema,
	drug: anestheticDrugSchema,
	drugBrandName: z.string().default("Ультракаин Д-С"),
	concentrationPct: z.number().positive().default(4.0),
	vasoconstrictor: vasoconstrictorRatioSchema.default("1:200000"),
	carpuleVolumeMl: z.number().positive().default(1.7),
	carpulesAdministered: z.number().positive().default(1.0),
	totalDoseMg: z.number().nonnegative(),
	maxAllowedDoseMg: z.number().nonnegative(),
	epinephrineMg: z.number().nonnegative().default(0),
	maxEpinephrineMg: z.number().nonnegative().default(0.2),
	aspirationTestPositive: z.boolean().default(false),
	toothNumbers: z.array(z.number().int()).default([]),
	injectionSite: z.string().optional().nullable(),
	lotNumber: z.string().optional().nullable(),
	expirationDate: z.string().optional().nullable(),
	vitalsPre: vitalSignsMeasurementSchema.optional().nullable(),
	vitalsIntra: vitalSignsMeasurementSchema.optional().nullable(),
	vitalsPost: vitalSignsMeasurementSchema.optional().nullable(),
	notes: z.string().optional().nullable(),
	complications: z.string().optional().nullable(),
	createdAt: z.string().optional(),
});

export type AnesthesiaLogRecord = z.infer<typeof anesthesiaLogRecordSchema>;

export interface AnestheticSafetyCalculation {
	totalAnestheticMg: number;
	maxRecommendedAnestheticMg: number;
	anestheticUtilizationPct: number;
	totalEpinephrineMg: number;
	maxRecommendedEpinephrineMg: number;
	epinephrineUtilizationPct: number;
	isAnestheticOverdose: boolean;
	isEpinephrineOverdose: boolean;
	maxSafeCarpules: number;
	remainingSafeCarpules: number;
	clinicalWarnings: string[];
}
