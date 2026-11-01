import { z } from "zod";

/**
 * treatmentPlanZodSchemas.ts — Канонические Zod-схемы валидации планов лечения,
 * смет, альтернативных сценариев и подписи пациентов.
 *
 * Декомпозирован из treatmentPlansSchema.ts по Мандатам 8b и 8zi.
 * Обеспечивает:
 * - Мандат 8e (Автономия врача): скидки врача до 100% без блокировок.
 * - Мандат 8x & 8ap: семантический serviceCode без советских приказов.
 * - FDI Зубная формула: валидация номеров 11-48 и 51-85.
 */

// FDI 2-digit tooth notation (11-48 adult, 51-85 deciduous)
export const fdiToothNumberZodSchema = z
	.number()
	.int()
	.refine(
		(n) =>
			(n >= 11 && n <= 18) ||
			(n >= 21 && n <= 28) ||
			(n >= 31 && n <= 38) ||
			(n >= 41 && n <= 48) ||
			(n >= 51 && n <= 55) ||
			(n >= 61 && n <= 65) ||
			(n >= 71 && n <= 75) ||
			(n >= 81 && n <= 85),
		{ message: "Некорректный номер зуба по стандарту FDI (11-48, 51-85)" },
	);

export const treatmentPlanStatusZodSchema = z.enum([
	"Draft",
	"Active",
	"Approved",
	"Completed",
	"Rejected",
]);

export const treatmentPlanItemStatusZodSchema = z.enum([
	"proposed",
	"approved",
	"in_progress",
	"completed",
	"cancelled",
]);

export const treatmentPlanScenarioStrategyZodSchema = z.enum([
	"standard",
	"economy",
	"premium",
	"all_on_4",
	"all_on_6",
]);

export const treatmentPlanScenarioPriorityZodSchema = z.enum([
	"balanced",
	"fast",
	"conservative",
	"budget",
]);

export const priceFreezePolicyZodSchema = z.enum([
	"standard_30_days",
	"surgery_implant_90_days",
	"ortho_vip_180_days",
	"strict_fixed_contract",
	"market_floating",
]);

export const discountModeZodSchema = z.enum([
	"none",
	"plan_fixed",
	"on_selection",
]);

/**
 * Zod-схема валидации отдельной позиции сметы / плана лечения
 */
export const treatmentPlanItemZodSchema = z.object({
	id: z.string().uuid().optional(),
	toothNumber: fdiToothNumberZodSchema.optional().nullable(),
	serviceId: z.string().trim().min(1).max(200).optional(),
	serviceCode: z.string().trim().max(100).optional(),
	code804n: z.string().trim().max(100).optional(), // Сохранено для обратной совместимости внешних клиентов
	name: z.string().trim().max(500).optional(),
	quantity: z.number().int().min(1).max(999).default(1),
	price: z.number().nonnegative().max(100_000_000),
	discount: z.number().nonnegative().max(100_000_000).default(0),
	phase: z.number().int().min(1).max(12).default(1),
	isAuto: z.boolean().optional(),
	doctorId: z.string().uuid().optional().nullable(),
});

/**
 * Zod-схема создания / обновления плана лечения
 */
export const treatmentPlanBaseZodSchema = z.object({
	id: z.string().uuid().optional().nullable(),
	name: z.string().trim().min(1).max(300).default("Комплексный план лечения"),
	status: treatmentPlanStatusZodSchema.optional(),
	allowRevision: z.boolean().optional().default(false),
	patientSignature: z.string().max(2_000_000).optional().nullable(),
	items: z.array(treatmentPlanItemZodSchema).max(500).default([]),
	planGroupId: z.string().uuid().optional().nullable(),
	groupName: z.string().trim().max(300).optional().nullable(),
	isAlternative: z.boolean().optional().default(false),
	alternativeTier: z.string().trim().max(100).optional().nullable(),
	alternativeStatus: z
		.enum(["proposed", "approved", "declined"])
		.optional()
		.default("proposed"),
	declinedReason: z.string().trim().max(1000).optional().nullable(),
	priceFreezePolicy: priceFreezePolicyZodSchema.optional().default("standard_30_days"),
	discountMode: discountModeZodSchema.optional().default("plan_fixed"),
	planDiscountPercent: z.number().min(0).max(100).optional().default(0),
	planDiscountRub: z.number().nonnegative().optional().default(0),
	allowClinicalBlockerOverride: z.boolean().optional().default(true),
	clinicalBlockerOverrideReason: z.string().trim().max(1000).optional().nullable(),
});

/**
 * Zod-схема этапа плана лечения
 */
export const treatmentPlanStageZodSchema = z.object({
	id: z.string().uuid().optional(),
	stageOrder: z.number().int().min(1).default(1),
	stageName: z.string().trim().min(1).max(200),
	completionPercentage: z.number().int().min(0).max(100).default(0),
	autoArchived: z.boolean().default(false),
});

/**
 * Zod-схема токена заморозки цен
 */
export const treatmentPlanPriceFreezeTokenZodSchema = z.object({
	token: z.string().min(1).max(256),
	policyKind: priceFreezePolicyZodSchema.default("standard_30_days"),
	validUntil: z.string().datetime(),
	inflationThresholdPercent: z.number().int().min(0).max(100).default(10),
	frozenPricesJson: z.record(z.string(), z.number()),
	notes: z.string().max(1000).optional().nullable(),
});

/**
 * Zod-схема цифровой подписи пациента на портале (ПЭП / SMS / QR)
 */
export const portalBudgetSigningZodSchema = z.object({
	token: z.string().min(1).max(128),
	signerName: z.string().trim().min(1).max(200),
	verbalPin: z.string().min(4).max(8).optional(),
	signature: z.record(z.string(), z.unknown()).optional(),
});

// Экспорт выведенных TypeScript типов
export type TreatmentPlanItemInput = z.infer<typeof treatmentPlanItemZodSchema>;
export type TreatmentPlanBaseInput = z.infer<typeof treatmentPlanBaseZodSchema>;
export type TreatmentPlanStageInput = z.infer<typeof treatmentPlanStageZodSchema>;
export type TreatmentPlanPriceFreezeTokenInput = z.infer<
	typeof treatmentPlanPriceFreezeTokenZodSchema
>;
export type PortalBudgetSigningInput = z.infer<
	typeof portalBudgetSigningZodSchema
>;
