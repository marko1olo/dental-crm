import { z } from "zod";

/**
 * schemas.ts — Zod-схемы валидации запросов планов лечения.
 * Декомпозирован из treatmentPlanMutations.ts по Мандату 8b/8zi.
 */

export const createTreatmentPlanItemSchema = z.object({
	id: z.string().uuid().optional().nullable(),
	priceId: z.string().trim().min(1).optional().nullable(),
	isCustom: z.boolean().optional().default(false),
	name: z.string().trim().optional(),
	toothNumber: z.number().int().optional().nullable(),
	quantity: z.number().int().positive().default(1),
	price: z.number().nonnegative().default(0),
	discount: z.number().nonnegative().default(0),
	unitPriceKopecks: z.number().int().nonnegative().optional(),
	totalPriceKopecks: z.number().int().nonnegative().optional(),
	phase: z.number().int().min(1).max(12).default(1),
	isBundle: z.boolean().default(false),
	isAuto: z.boolean().optional(),
	doctorId: z.string().uuid().optional().nullable(),
});

export const createTreatmentPlanSchema = z.object({
	id: z.string().uuid().optional().nullable(),
	patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID"),
	doctorId: z.string().uuid().optional().nullable(),
	name: z.string().trim().min(1).default("План комплексного лечения"),
	title: z.string().trim().optional().default(""),
	diagnosisIcd10: z.string().trim().max(50).optional().nullable(),
	diagnosisTitle: z.string().trim().max(500).optional().nullable(),
	totalPriceRub: z.number().nonnegative().optional(),
	planDiscountPercent: z.number().min(0).max(100).optional().default(0),
	planDiscountRub: z.number().nonnegative().optional().default(0),
	discountMode: z.string().optional().default("plan_fixed"),
	isInstallment: z.boolean().optional(),
	installmentMonths: z.number().int().min(1).max(36).optional(),
	downPaymentKopecks: z.number().int().nonnegative().optional(),
	monthlyPaymentKopecks: z.number().int().nonnegative().optional(),
	planGroupId: z.string().uuid().optional().nullable(),
	groupName: z.string().trim().max(300).optional().nullable(),
	isAlternative: z.boolean().optional().default(false),
	alternativeTier: z.string().trim().max(100).optional().nullable(),
	alternativeStatus: z.enum(["proposed", "approved", "declined"]).optional().default("proposed"),
	declinedReason: z.string().trim().max(1000).optional().nullable(),
	priceFreezePolicy: z.string().optional().default("standard_30_days"),
	allowRevision: z.boolean().optional().default(false),
	patientSignature: z.string().max(2_000_000).optional().nullable(),
	items: z.array(createTreatmentPlanItemSchema).optional().default([]),
	stages: z
		.array(
			z.object({
				id: z.string().uuid().optional(),
				stageOrder: z.number().int().positive().default(1),
				stageName: z.string().trim().min(1),
				completionPercentage: z.number().int().min(0).max(100).default(0),
				items: z.array(createTreatmentPlanItemSchema).optional().default([]),
			}),
		)
		.optional()
		.default([]),
});

export const updateTreatmentPlanStageSchema = z.object({
	status: z.enum(["planned", "in_progress", "completed", "agreed", "declined"]).optional(),
	completionPercentage: z.number().int().min(0).max(100).optional(),
	stageName: z.string().trim().optional(),
	isCompleted: z.boolean().optional(),
});

export const listTreatmentPlansQuerySchema = z.object({
	patientId: z.string().uuid().optional(),
	status: z.enum(["Draft", "Active", "Approved", "Completed", "Rejected"]).optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50),
	offset: z.coerce.number().int().min(0).default(0),
});

export const updateTreatmentPlanSchema = z.object({
	name: z.string().trim().min(1).optional(),
	title: z.string().trim().optional(),
	diagnosisIcd10: z.string().trim().max(50).nullable().optional(),
	diagnosisTitle: z.string().trim().max(500).nullable().optional(),
	status: z.enum(["Draft", "Active", "Approved", "Completed", "Rejected"]).optional(),
	discountMode: z.string().optional(),
	planDiscountPercent: z.number().min(0).max(100).optional(),
	planDiscountRub: z.number().nonnegative().optional(),
	isInstallment: z.boolean().optional(),
	installmentMonths: z.number().int().min(1).max(36).optional(),
	downPaymentKopecks: z.number().int().nonnegative().optional(),
	monthlyPaymentKopecks: z.number().int().nonnegative().optional(),
	curatorId: z.string().uuid().nullable().optional(),
	curatorName: z.string().trim().nullable().optional(),
	curatorFunnelStage: z.string().trim().nullable().optional(),
	curatorNextContactDate: z.string().trim().nullable().optional(),
	curatorNotes: z.string().trim().nullable().optional(),
});

export const updateTreatmentPlanStatusSchema = z.object({
	status: z.enum(["Draft", "Active", "Approved", "Completed", "Rejected"]).default("Approved"),
	selectedTier: z.string().optional(),
	alternativeTier: z.string().optional(),
});
