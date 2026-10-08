import { z } from "zod";
import { clinicalRuleActionSchema, clinicalRuleSeveritySchema, clinicModeSchema, communicationChannelSchema, communicationIntentSchema, dentalSpecialtySchema, imagingStudyKindSchema, serviceCategorySchema, staffRoleSchema, treatmentPlanItemStatusSchema, treatmentPlanScenarioPrioritySchema, treatmentPlanScenarioStrategySchema } from "./aiAndEgiszSchemas.js";
import { documentKindSchema } from "../documents/index.js";
import { nonNegativeMoneyRubSchema } from "../money.js";

export const workloadStateSchema = z.enum([
	"idle",
	"healthy",
	"tight",
	"overbooked",
]);

export type WorkloadState = z.infer<typeof workloadStateSchema>;

export const resourceLoadKindSchema = z.enum(["doctor", "assistant", "chair"]);

export type ResourceLoadKind = z.infer<typeof resourceLoadKindSchema>;

export const resourceLoadSchema = z.object({
	id: z.string(),
	kind: resourceLoadKindSchema,
	title: z.string(),
	subtitle: z.string(),
	bookedMinutes: z.number().int().nonnegative(),
	appointmentCount: z.number().int().nonnegative(),
	utilizationPercent: z.number().int().min(0).max(200),
	nextFreeAt: z.string().nullable(),
	state: workloadStateSchema,
	flags: z.array(z.string()),
});

export type ResourceLoad = z.infer<typeof resourceLoadSchema>;

export const roleQueueSchema = z.object({
	role: staffRoleSchema,
	title: z.string(),
	ownerLabel: z.string(),
	openItems: z.number().int().nonnegative(),
	nextAction: z.string(),
	automationHint: z.string(),
	blockedBy: z.array(z.string()),
});

export type RoleQueue = z.infer<typeof roleQueueSchema>;

export const scheduleWarningSchema = z.object({
	id: z.string(),
	severity: z.enum(["info", "warning", "critical"]),
	title: z.string(),
	detail: z.string(),
	ownerRole: staffRoleSchema,
	relatedAppointmentId: z.string().uuid().nullable(),
	actionLabel: z.string(),
});

export type ScheduleWarning = z.infer<typeof scheduleWarningSchema>;

export const clinicModeFitSchema = z.object({
	mode: clinicModeSchema,
	title: z.string(),
	fitScore: z.number().int().min(0).max(100),
	blockers: z.array(z.string()),
	upgrades: z.array(z.string()),
	lowFrictionNextStep: z.string(),
});

export type ClinicModeFit = z.infer<typeof clinicModeFitSchema>;

export const shiftIntelligenceSchema = z.object({
	modeFit: clinicModeFitSchema,
	doctorLoads: z.array(resourceLoadSchema),
	assistantLoads: z.array(resourceLoadSchema),
	chairLoads: z.array(resourceLoadSchema),
	roleQueues: z.array(roleQueueSchema),
	scheduleWarnings: z.array(scheduleWarningSchema),
});

export type ShiftIntelligence = z.infer<typeof shiftIntelligenceSchema>;

export const protocolTemplateSchema = z.object({
	id: z.string(),
	organizationId: z.string().uuid(),
	specialty: dentalSpecialtySchema,
	title: z.string(),
	visitReason: z.string(),
	defaultDurationMinutes: z.number().int().positive(),
	complaintPrompt: z.string(),
	objectiveTemplate: z.string(),
	diagnosisHints: z.array(z.string()),
	treatmentPlanTemplate: z.string(),
	requiredDocuments: z.array(documentKindSchema),
	suggestedImaging: z.array(imagingStudyKindSchema),
	safetyWarnings: z.array(z.string()),
	updatedAt: z.string(),
});

export type ProtocolTemplate = z.infer<typeof protocolTemplateSchema>;

export const serviceCatalogItemSchema = z.object({
	id: z.string(),
	organizationId: z.string().uuid(),
	code: z.string(),
	title: z.string(),
	aliases: z.array(z.string()).default([]),
	category: serviceCategorySchema,
	specialty: dentalSpecialtySchema,
	/*
	 * Цена услуги — с копейками.
	 *
	 * Было z.number().int(): прайс клиники не мог содержать ни 1500,50, ни
	 * 990,99. Дробную цену отвергала схема, а колонка service_catalog_items.
	 * base_price_rub в базе была integer. Прайс — то, из чего вырастает счёт
	 * пациенту, и округление начиналось прямо здесь.
	 */
	basePriceRub: nonNegativeMoneyRubSchema,
	durationMinutes: z.number().int().positive(),
	taxDeductible: z.boolean(),
	active: z.boolean(),
});

export type ServiceCatalogItem = z.infer<typeof serviceCatalogItemSchema>;

export const pricelistSourceKindSchema = z.enum([
	"text",
	"ocr_text",
	"photo_ocr",
	"spreadsheet_copy",
	"manual",
]);

export type PricelistSourceKind = z.infer<typeof pricelistSourceKindSchema>;

export const dentalMaterialKindSchema = z.enum([
	"composite",
	"glass_ionomer",
	"sealant",
	"ceramic",
	"zirconia",
	"lithium_disilicate",
	"metal_ceramic",
	"pmma",
	"metal",
	"titanium",
	"implant_system",
	"abutment",
	"bone_graft",
	"membrane",
	"aligner",
	"bracket",
	"fluoride",
	"whitening",
	"anesthetic",
	"imaging",
	"lab",
	"other",
	"unknown",
]);

export type DentalMaterialKind = z.infer<typeof dentalMaterialKindSchema>;

export const dentalRestorationTypeSchema = z.enum([
	"filling",
	"direct_restoration",
	"inlay",
	"onlay",
	"overlay",
	"veneer",
	"crown",
	"bridge",
	"implant_crown",
	"temporary_crown",
	"post_core",
	"denture",
	"ortho_appliance",
	"sealant",
	"whitening",
	"implant",
	"surgical_guide",
	"none",
	"unknown",
]);

export type DentalRestorationType = z.infer<typeof dentalRestorationTypeSchema>;

export const pricelistParserModeSchema = z.enum([
	"deterministic",
	"groq_json",
	"deterministic_groq_fallback",
]);

export type PricelistParserMode = z.infer<typeof pricelistParserModeSchema>;

export const pricelistAiVisionSchema = z.object({
	providerId: z.literal("groq_whisper"),
	configured: z.boolean(),
	used: z.boolean(),
	modelName: z.string().nullable(),
	maxImagesPerRequest: z.number().int().positive(),
	reason: z.string(),
});

export type PricelistAiVision = z.infer<typeof pricelistAiVisionSchema>;

export const dentalPricelistItemSchema = z.object({
	id: z.string(),
	sourceLine: z.number().int().positive(),
	sourceText: z.string(),
	title: z.string(),
	normalizedTitle: z.string(),
	category: serviceCategorySchema,
	specialty: dentalSpecialtySchema,
	treatmentKind: z.string(),
	materialKind: dentalMaterialKindSchema,
	restorationType: dentalRestorationTypeSchema,
	crownType: z.string().nullable(),
	brand: z.string().nullable(),
	toothScope: z.string().nullable(),
	unit: z.string(),
	/* Разбор строки прайса: цена и её верхняя граница тоже с копейками. */
	priceRub: nonNegativeMoneyRubSchema.nullable(),
	priceMaxRub: nonNegativeMoneyRubSchema.nullable(),
	durationMinutes: z.number().int().positive().nullable(),
	confidence: z.number().min(0).max(1),
	warnings: z.array(z.string()),
	matchedServiceId: z.string().nullable(),
});

export type DentalPricelistItem = z.infer<typeof dentalPricelistItemSchema>;

export const dentalPricelistCategorySummarySchema = z.object({
	category: serviceCategorySchema,
	specialty: dentalSpecialtySchema,
	count: z.number().int().nonnegative(),
	pricedCount: z.number().int().nonnegative(),
	/*
	 * Итоги по категории — те же деньги, что и в строках прайса.
	 *
	 * Было z.number().int(): минимум и максимум — это ДОСЛОВНАЯ копия priceRub
	 * разобранной строки, а priceRub уже принимает копейки. Одна цена 1500,50 в
	 * категории — и вся сводка не проходила проверку: разбор прайса возвращал
	 * ошибку вместо результата. Среднее по копеечным ценам дробно по своей
	 * природе, целым его записать нельзя без потери.
	 */
	minPriceRub: nonNegativeMoneyRubSchema.nullable(),
	maxPriceRub: nonNegativeMoneyRubSchema.nullable(),
	averagePriceRub: nonNegativeMoneyRubSchema.nullable(),
	materialKinds: z.array(dentalMaterialKindSchema),
	brands: z.array(z.string()),
});

export type DentalPricelistCategorySummary = z.infer<
	typeof dentalPricelistCategorySummarySchema
>;

export const dentalPricelistAnalysisRequestSchema = z
	.object({
		sourceName: z.string().min(1).max(160).default("manual-pricelist"),
		sourceKind: pricelistSourceKindSchema.default("text"),
		rawText: z.string().max(200_000).optional().default(""),
		imageBase64: z.string().max(4_000_000).optional(),
		imageMimeType: z
			.enum(["image/jpeg", "image/png", "image/webp"])
			.default("image/jpeg"),
		preferredSpecialty: dentalSpecialtySchema.default("universal"),
		useServerAi: z.boolean().default(false),
	})
	.refine(
		(input) => Boolean(input.rawText.trim() || input.imageBase64?.trim()),
		{
			message: "Нужно передать текст прайса или изображение",
		},
	);

export type DentalPricelistAnalysisRequest = z.infer<
	typeof dentalPricelistAnalysisRequestSchema
>;

export const dentalPricelistAnalysisResponseSchema = z.object({
	sourceName: z.string(),
	sourceKind: pricelistSourceKindSchema,
	parserMode: pricelistParserModeSchema,
	generatedAt: z.string(),
	items: z.array(dentalPricelistItemSchema),
	summary: z.array(dentalPricelistCategorySummarySchema),
	warnings: z.array(z.string()),
	aiVision: pricelistAiVisionSchema,
	groqJsonPromptVersion: z.string(),
});

export type DentalPricelistAnalysisResponse = z.infer<
	typeof dentalPricelistAnalysisResponseSchema
>;

export const treatmentPlanItemSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	visitId: z.string().uuid().nullable(),
	serviceId: z.string(),
	snapshotServiceName: z.string(),
	snapshotServiceCategory: serviceCategorySchema.nullable().optional(),
	toothCode: z.string().nullable(),
	quantity: z.number().int().positive(),
	/*
	 * Позиция плана лечения — с копейками.
	 *
	 * Было z.number().int(): цена копируется из basePriceRub прайса, который
	 * копейки принимает, а колонки treatment_items.unit_price_rub и
	 * treatment_items.discount_rub — numeric(12, 2). То есть услуга за 1500,50
	 * попадала в прайс,
	 * но в план лечения этого пациента уже не проходила. Из этих же позиций
	 * складываются план, смета, счёт и долг, поэтому копейка терялась здесь и
	 * дальше расхождение шло по всей цепочке.
	 */
	unitPriceRub: nonNegativeMoneyRubSchema,
	discountRub: nonNegativeMoneyRubSchema,
	status: treatmentPlanItemStatusSchema,
	plannedDoctorUserId: z.string().uuid().nullable(),
	plannedChairId: z.string().uuid().nullable(),
	notes: z.string().nullable(),
});

export type TreatmentPlanItem = z.infer<typeof treatmentPlanItemSchema>;

export const treatmentPlanScenarioSchema = z.object({
	id: z.string(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	title: z.string(),
	strategy: treatmentPlanScenarioStrategySchema,
	priority: treatmentPlanScenarioPrioritySchema,
	/*
	 * Сценарий лечения: итог и суммы этапов складываются из позиций плана, а те
	 * теперь с копейками. Оставить здесь int значило бы, что сумма этапов не
	 * равна итогу сценария — ровно то расхождение, которое пациент видит в смете.
	 */
	totalRub: nonNegativeMoneyRubSchema,
	durationMonths: z.number().int().nonnegative(),
	visitCount: z.number().int().positive(),
	includedServiceIds: z.array(z.string()),
	phases: z.array(
		z.object({
			title: z.string(),
			window: z.string(),
			amountRub: nonNegativeMoneyRubSchema,
			focus: z.string(),
		}),
	),
	pros: z.array(z.string()),
	tradeoffs: z.array(z.string()),
	clinicalWarnings: z.array(z.string()),
	active: z.boolean(),
});

export type TreatmentPlanScenario = z.infer<typeof treatmentPlanScenarioSchema>;

export const clinicalRuleSchema = z.object({
	id: z.string(),
	organizationId: z.string().uuid(),
	title: z.string(),
	category: serviceCategorySchema,
	specialty: dentalSpecialtySchema,
	action: clinicalRuleActionSchema,
	severity: clinicalRuleSeveritySchema,
	ownerRole: staffRoleSchema,
	triggerServiceIds: z.array(z.string()),
	requiredServiceIds: z.array(z.string()),
	requiresCompletedServiceIds: z.array(z.string()),
	blockedServiceIds: z.array(z.string()),
	condition: z.string().nullable(),
	warningText: z.string(),
	patientText: z.string(),
	active: z.boolean(),
});

export type ClinicalRule = z.infer<typeof clinicalRuleSchema>;

export const clinicalRuleEvaluationSchema = z.object({
	id: z.string(),
	ruleId: z.string(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	scenarioId: z.string().nullable(),
	title: z.string(),
	action: clinicalRuleActionSchema,
	severity: clinicalRuleSeveritySchema,
	ownerRole: staffRoleSchema,
	triggeredByServiceIds: z.array(z.string()),
	missingRequiredServiceIds: z.array(z.string()),
	missingCompletedServiceIds: z.array(z.string()),
	blockedServiceIds: z.array(z.string()),
	message: z.string(),
	patientMessage: z.string(),
	resolved: z.boolean(),
});

export type ClinicalRuleEvaluation = z.infer<
	typeof clinicalRuleEvaluationSchema
>;

export const clinicalRuleSummarySchema = z.object({
	activeRules: z.number().int().nonnegative(),
	evaluatedRules: z.number().int().nonnegative(),
	unresolved: z.number().int().nonnegative(),
	blockers: z.number().int().nonnegative(),
	warnings: z.number().int().nonnegative(),
	requiredServices: z.number().int().nonnegative(),
	coveredRules: z.number().int().nonnegative(),
});

export type ClinicalRuleSummary = z.infer<typeof clinicalRuleSummarySchema>;

export const clinicalRuleEvaluationInputSchema = z.object({
	patientId: z.string().uuid(),
	scenarioId: z.string().nullable().optional(),
	serviceIds: z.array(z.string()).min(1),
	completedServiceIds: z.array(z.string()).default([]),
	enforceBlockers: z.boolean().default(false).optional(),
});

export type ClinicalRuleEvaluationInput = z.infer<
	typeof clinicalRuleEvaluationInputSchema
>;

export const clinicalRuleEvaluationResponseSchema = z.object({
	evaluations: z.array(clinicalRuleEvaluationSchema),
	summary: clinicalRuleSummarySchema,
});

export type ClinicalRuleEvaluationResponse = z.infer<
	typeof clinicalRuleEvaluationResponseSchema
>;

export const clinicalRuleServiceIdSchema = z.string().trim().min(1).max(120);

export const createClinicalRuleBaseSchema = z.object({
	title: z.string().trim().min(1).max(160),
	category: serviceCategorySchema,
	specialty: dentalSpecialtySchema,
	action: clinicalRuleActionSchema,
	severity: clinicalRuleSeveritySchema,
	ownerRole: staffRoleSchema,
	triggerServiceIds: z.array(clinicalRuleServiceIdSchema).min(1).max(80),
	requiredServiceIds: z.array(clinicalRuleServiceIdSchema).max(80).default([]),
	requiresCompletedServiceIds: z
		.array(clinicalRuleServiceIdSchema)
		.max(80)
		.default([]),
	blockedServiceIds: z.array(clinicalRuleServiceIdSchema).max(80).default([]),
	condition: z.string().trim().max(500).nullable().optional(),
	warningText: z.string().trim().min(1).max(700),
	patientText: z.string().trim().min(1).max(700),
	active: z.boolean().default(true),
});

export const createClinicalRuleSchema =
	createClinicalRuleBaseSchema.superRefine((input, context) => {
		if (
			input.action === "add_required_service" &&
			input.requiredServiceIds.length === 0
		) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["requiredServiceIds"],
				message:
					"Для правила добавления услуги укажите хотя бы одну обязательную услугу.",
			});
		}
		if (
			input.action === "block_service" &&
			input.requiresCompletedServiceIds.length === 0 &&
			input.blockedServiceIds.length === 0
		) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["blockedServiceIds"],
				message:
					"Для блокирующего правила укажите блокируемую услугу или требуемую завершенную услугу.",
			});
		}
	});

export type CreateClinicalRuleInput = z.infer<typeof createClinicalRuleSchema>;

export const updateClinicalRuleSchema = createClinicalRuleBaseSchema
	.partial()
	.extend({
		id: z.string(),
	});

export type UpdateClinicalRuleInput = z.infer<typeof updateClinicalRuleSchema>;

export const billingSummarySchema = z.object({
	totalPlannedRub: nonNegativeMoneyRubSchema,
	totalDiscountRub: nonNegativeMoneyRubSchema,
	totalPaidRub: nonNegativeMoneyRubSchema,
	totalDueRub: nonNegativeMoneyRubSchema,
	taxDeductionEligibleRub: nonNegativeMoneyRubSchema,
	draftDocumentAmountRub: nonNegativeMoneyRubSchema,
	openTreatmentItems: z.number().int().nonnegative(),
	unpaidDocuments: z.number().int().nonnegative(),
	insuranceCoverageRub: nonNegativeMoneyRubSchema.optional(),
});

export type BillingSummary = z.infer<typeof billingSummarySchema>;

export const communicationTemplateSchema = z.object({
	id: z.string(),
	organizationId: z.string().uuid(),
	title: z.string(),
	channel: communicationChannelSchema,
	intent: communicationIntentSchema,
	audienceRole: staffRoleSchema,
	body: z.string(),
	variables: z.array(z.string()),
	active: z.boolean(),
});

export type CommunicationTemplate = z.infer<typeof communicationTemplateSchema>;
