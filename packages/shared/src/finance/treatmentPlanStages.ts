/**
 * MULTI-STAGE TREATMENT PLAN & PENNY-EXACT PAYMENT DISTRIBUTION ENGINE
 * Ported & adapted from Dentalpin treatment_plan module & DENTE clinical workflows.
 *
 * Clinical Architecture:
 * - 4 Phased Clinical Stages:
 *   1. Hygiene & Sanitation (hygiene_sanitation): SRP, calculus removal, hygiene instruction.
 *   2. Endodontics & Therapy (endo_therapy): Caries restorations, root canal obturation.
 *   3. Surgery & Implantology (surgery_implant): Atraumatic extractions, GBR, dental implants.
 *   4. Orthodontics & Prosthetics (ortho_prosthetics): Aligners, brackets, crowns, bridges, veneers.
 *
 * Financial Invariants:
 * - Exact Penny-Balancing Algorithm: $\sum \text{stageAmounts} = \text{grandTotalKopecks}$.
 * - Any division remainder from percentage splits is mathematically allocated to the final stage.
 * - Integer kopecks across all calculations (Zero floating-point currency drift).
 */

import { z } from "zod";

// ─── 1. SCHEMAS & TYPES ──────────────────────────────────────────────────────

export const treatmentPlanStageCategorySchema = z.enum([
	"hygiene_sanitation",
	"endo_therapy",
	"surgery_implant",
	"ortho_prosthetics",
]);
export type TreatmentPlanStageCategory = z.infer<typeof treatmentPlanStageCategorySchema>;

export const treatmentPlanStageStatusSchema = z.enum([
	"draft",
	"pending",
	"in_progress",
	"completed",
	"cancelled",
]);
export type TreatmentPlanStageStatus = z.infer<typeof treatmentPlanStageStatusSchema>;

export const stageItemStatusSchema = z.enum([
	"pending",
	"in_progress",
	"completed",
	"cancelled",
]);
export type StageItemStatus = z.infer<typeof stageItemStatusSchema>;

export const treatmentPlanItemSchema = z.object({
	id: z.string().uuid(),
	stageId: z.string().uuid().optional(),
	code804n: z.string().min(1),
	nameRu: z.string().min(1).max(300),
	toothNumber: z.number().int().min(11).max(85).nullable().optional(),
	surfaces: z.array(z.string()).optional().default([]),
	quantity: z.number().int().positive().default(1),
	unitPriceKopecks: z.number().int().nonnegative(),
	discountKopecks: z.number().int().nonnegative().default(0),
	totalPriceKopecks: z.number().int().nonnegative(),
	status: stageItemStatusSchema.default("pending"),
	assignedDoctorId: z.string().uuid().nullable().optional(),
	completedAt: z.string().datetime().nullable().optional(),
});
export type TreatmentPlanItem = z.input<typeof treatmentPlanItemSchema>;

export const treatmentPlanStageSchema = z.object({
	id: z.string().uuid(),
	planId: z.string().uuid(),
	stageNumber: z.number().int().min(1).max(10),
	category: treatmentPlanStageCategorySchema,
	titleRu: z.string().min(1).max(200),
	descriptionRu: z.string().max(1000).nullable().optional(),
	status: treatmentPlanStageStatusSchema.default("draft"),
	items: z.array(treatmentPlanItemSchema).default([]),
	subtotalKopecks: z.number().int().nonnegative().default(0),
	discountKopecks: z.number().int().nonnegative().default(0),
	totalPriceKopecks: z.number().int().nonnegative().default(0),
	allocatedPaymentKopecks: z.number().int().nonnegative().default(0),
	paidAmountKopecks: z.number().int().nonnegative().default(0),
	estimatedDurationDays: z.number().int().positive().optional().default(14),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
	completedAt: z.string().datetime().nullable().optional(),
});
export type TreatmentPlanStage = z.input<typeof treatmentPlanStageSchema>;

export const stagedTreatmentPlanSchema = z.object({
	id: z.string().uuid(),
	clinicId: z.string().uuid(),
	patientId: z.string().uuid(),
	planNumber: z.string().min(1),
	title: z.string().min(1).max(250),
	stages: z.array(treatmentPlanStageSchema).min(1),
	totalPriceKopecks: z.number().int().nonnegative(),
	totalDiscountKopecks: z.number().int().nonnegative().default(0),
	grandTotalKopecks: z.number().int().nonnegative(),
	totalPaidKopecks: z.number().int().nonnegative().default(0),
	status: z.enum(["draft", "pending_acceptance", "active", "completed", "closed", "archived"]).default("draft"),
	createdAt: z.string().datetime().optional(),
	updatedAt: z.string().datetime().optional(),
});
export type StagedTreatmentPlan = z.input<typeof stagedTreatmentPlanSchema>;

export interface StageCategoryMetadata {
	readonly category: TreatmentPlanStageCategory;
	readonly defaultStageNumber: number;
	readonly defaultTitleRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
	readonly badgeColor: string;
	readonly typicalServicesRu: readonly string[];
}

// ─── 2. CLINICAL STAGE METADATA ──────────────────────────────────────────────

export const STAGE_CATEGORY_META: Record<TreatmentPlanStageCategory, StageCategoryMetadata> = {
	hygiene_sanitation: {
		category: "hygiene_sanitation",
		defaultStageNumber: 1,
		defaultTitleRu: "Этап 1: Профессиональная гигиена и санация полости рта",
		shortLabelRu: "Гигиена и санация",
		descriptionRu: "Устранение над- и поддесневых зубных отложений (Air-Flow, ультразвук), купирование воспаления десны, ремотивация гигиены.",
		badgeColor: "#10b981", // Emerald
		typicalServicesRu: [
			"Комплексная гигиена полости рта (A16.07.051)",
			"Ультразвуковое удаление зубного камня (A16.07.020)",
			"Пародонтологическая чистка Vector / SRP",
		],
	},
	endo_therapy: {
		category: "endo_therapy",
		defaultStageNumber: 2,
		defaultTitleRu: "Этап 2: Терапевтическое лечение и эндодонтия",
		shortLabelRu: "Терапия и эндодонтия",
		descriptionRu: "Лечение кариеса, некариозных поражений, механическая и медикаментозная обработка и обтурация корневых каналов.",
		badgeColor: "#06b6d4", // Cyan
		typicalServicesRu: [
			"Лечение глубокого кариеса с реставрацией (A16.07.002.001)",
			"Эндодонтическое лечение пульпита/периодонтита 1-4 каналов",
			"Эстетическое восстановление анатомической формы зуба",
		],
	},
	surgery_implant: {
		category: "surgery_implant",
		defaultStageNumber: 3,
		defaultTitleRu: "Этап 3: Хирургическая подготовка и имплантация",
		shortLabelRu: "Хирургия и имплантация",
		descriptionRu: "Атравматичное удаление корней/дистопированных зубов, костная пластика (GBR/синус-лифтинг), установка дентальных имплантатов.",
		badgeColor: "#f59e0b", // Amber
		typicalServicesRu: [
			"Атравматичное удаление зуба (A16.07.001)",
			"Установка дентального имплантата (A16.07.054)",
			"Операция синус-лифтинга / костная пластика",
		],
	},
	ortho_prosthetics: {
		category: "ortho_prosthetics",
		defaultStageNumber: 4,
		defaultTitleRu: "Этап 4: Ортопедическая и ортодонтическая реабилитация",
		shortLabelRu: "Ортопедия и протезирование",
		descriptionRu: "Нормализация окклюзии, установка циркониевых коронок, мостовидных протезов, керамических виниров и накладок E.max.",
		badgeColor: "#8b5cf6", // Purple
		typicalServicesRu: [
			"Установка коронки из диоксида циркония на имплантат (A16.07.004)",
			"Керамические виниры / накладки E.max",
			"Аппаратурная ортодонтия (брекеты / элайнеры)",
		],
	},
};

// ─── 3. EXACT PENNY-BALANCING PAYMENT DISTRIBUTION ALGORITHMS ─────────────────

export interface StagePaymentSplitResult {
	readonly stageIndex: number;
	readonly stageId?: string | undefined;
	readonly stageTitle: string;
	readonly targetPercentage: number;
	readonly allocatedKopecks: number;
	readonly allocatedRublesFormatted: string;
}

export interface PlanPaymentDistributionSummary {
	readonly grandTotalKopecks: number;
	readonly stageAllocations: readonly StagePaymentSplitResult[];
	readonly isPennyExact: boolean;
	readonly remainderAdjustmentKopecks: number;
}

/**
 * Distributes a total amount in kopecks across stages by percentage weights
 * with strict penny-exact balancing (remainder kopecks added to final stage).
 */
export function calculateStagePaymentDistribution(
	grandTotalKopecks: number,
	stagePercentages: readonly number[],
	stageTitles: readonly string[] = [],
): PlanPaymentDistributionSummary {
	if (stagePercentages.length === 0 || grandTotalKopecks <= 0) {
		return {
			grandTotalKopecks: Math.max(0, grandTotalKopecks),
			stageAllocations: [],
			isPennyExact: true,
			remainderAdjustmentKopecks: 0,
		};
	}

	const totalPercent = stagePercentages.reduce((a, b) => a + b, 0);
	const normalizedWeights = totalPercent > 0
		? stagePercentages.map((p) => p / totalPercent)
		: stagePercentages.map(() => 1 / stagePercentages.length);

	let allocatedSum = 0;
	const allocations: StagePaymentSplitResult[] = [];

	for (let i = 0; i < normalizedWeights.length; i++) {
		const weight = normalizedWeights[i]!;
		const title = stageTitles[i] || `Этап ${i + 1}`;
		const rawKopecks = Math.floor(grandTotalKopecks * weight);

		allocations.push({
			stageIndex: i,
			stageTitle: title,
			targetPercentage: Math.round(weight * 100),
			allocatedKopecks: rawKopecks,
			allocatedRublesFormatted: (rawKopecks / 100).toLocaleString("ru-RU", {
				style: "currency",
				currency: "RUB",
				minimumFractionDigits: 2,
			}),
		});

		allocatedSum += rawKopecks;
	}

	// Exact penny adjustment on the last stage
	const remainder = grandTotalKopecks - allocatedSum;
	if (remainder !== 0 && allocations.length > 0) {
		const lastIdx = allocations.length - 1;
		const last = allocations[lastIdx]!;
		const adjusted = last.allocatedKopecks + remainder;
		allocations[lastIdx] = {
			...last,
			allocatedKopecks: adjusted,
			allocatedRublesFormatted: (adjusted / 100).toLocaleString("ru-RU", {
				style: "currency",
				currency: "RUB",
				minimumFractionDigits: 2,
			}),
		};
	}

	const finalSum = allocations.reduce((a, b) => a + b.allocatedKopecks, 0);

	return {
		grandTotalKopecks,
		stageAllocations: allocations,
		isPennyExact: finalSum === grandTotalKopecks,
		remainderAdjustmentKopecks: remainder,
	};
}

/**
 * Recalculates all stages and plan-level totals from items with penny-exact validation.
 */
export function recalculateTreatmentPlanTotals(
	stages: readonly TreatmentPlanStage[],
): {
	stages: TreatmentPlanStage[];
	totalPriceKopecks: number;
	totalDiscountKopecks: number;
	grandTotalKopecks: number;
	totalPaidKopecks: number;
	completionPercentage: number;
} {
	let planSubtotal = 0;
	let planDiscount = 0;
	let planGrandTotal = 0;
	let planPaid = 0;
	let totalItemsCount = 0;
	let completedItemsCount = 0;

	const updatedStages: TreatmentPlanStage[] = stages.map((stage) => {
		let stageSubtotal = 0;
		let stageDiscount = 0;

		const updatedItems = (stage.items || []).map((item) => {
			const qty = item.quantity || 1;
			const unitPrice = item.unitPriceKopecks || 0;
			const discount = item.discountKopecks || 0;
			const itemTotal = Math.max(0, unitPrice * qty - discount);

			stageSubtotal += unitPrice * qty;
			stageDiscount += discount;

			totalItemsCount++;
			if (item.status === "completed") {
				completedItemsCount++;
			}

			return {
				...item,
				totalPriceKopecks: itemTotal,
			};
		});

		const stageTotal = Math.max(0, stageSubtotal - stageDiscount);

		planSubtotal += stageSubtotal;
		planDiscount += stageDiscount;
		planGrandTotal += stageTotal;
		planPaid += stage.paidAmountKopecks || 0;

		return {
			...stage,
			items: updatedItems,
			subtotalKopecks: stageSubtotal,
			discountKopecks: stageDiscount,
			totalPriceKopecks: stageTotal,
		};
	});

	const completionPercentage = totalItemsCount > 0
		? Math.round((completedItemsCount / totalItemsCount) * 100)
		: 0;

	return {
		stages: updatedStages,
		totalPriceKopecks: planSubtotal,
		totalDiscountKopecks: planDiscount,
		grandTotalKopecks: planGrandTotal,
		totalPaidKopecks: planPaid,
		completionPercentage,
	};
}
