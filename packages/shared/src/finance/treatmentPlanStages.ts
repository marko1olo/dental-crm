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

// ─── 4. TREATMENT PLAN AI VALIDATION & COMMENTARY SCHEMAS ───────────────────

export const treatmentPlanValidationItemSchema = z.object({
	id: z.string(),
	toothNumber: z.number().int().min(11).max(85).nullable().optional(),
	code804n: z.string().default(""),
	name: z.string().min(1),
	category: z.string().default("Общее"),
	priceRub: z.number().nonnegative().default(0),
	unitPriceRub: z.number().nonnegative().optional(),
	quantity: z.number().positive().default(1),
	materials: z.string().optional(),
	clinicalRationale: z.string().optional(),
	requiresManualPricing: z.boolean().optional(),
});
export type TreatmentPlanValidationItem = z.infer<typeof treatmentPlanValidationItemSchema>;

export const treatmentPlanValidationStageSchema = z.object({
	stageNumber: z.number().int().min(1).max(10),
	title: z.string().trim().min(1),
	clinicalGoal: z.string().trim().optional(),
	stageKind: z.string().optional(),
	estimatedWeeks: z.number().optional(),
	estimatedVisits: z.number().optional(),
	totalRub: z.number().nonnegative().default(0),
	items: z.array(treatmentPlanValidationItemSchema).default([]),
});
export type TreatmentPlanValidationStage = z.infer<typeof treatmentPlanValidationStageSchema>;

export const treatmentPlanValidateAndCommentRequestSchema = z.object({
	stages: z.array(treatmentPlanValidationStageSchema).min(1),
	patientContext: z
		.object({
			patientId: z.string().optional(),
			patientName: z.string().optional(),
			diagnosisSummary: z.string().optional(),
			clinicalReason: z.string().optional(),
			complaint: z.string().optional(),
		})
		.optional(),
	targetBudgetRub: z.number().positive().optional(),
	installmentMonths: z.union([z.literal(3), z.literal(6), z.literal(12), z.literal(24), z.number()]).optional(),
	doctorFullName: z.string().optional(),
	doctorSpecialty: z.string().optional(),
	clinicName: z.string().optional(),
	userPrompt: z.string().optional(),
});
export type TreatmentPlanValidateAndCommentRequest = z.infer<
	typeof treatmentPlanValidateAndCommentRequestSchema
>;

export const starComplianceStatusSchema = z.enum([
	"FULL_COMPLIANCE",
	"COMPLIANT_WITH_RECOMMENDATIONS",
	"NON_COMPLIANT_DEFECTS",
]);
export type StarComplianceStatus = z.infer<typeof starComplianceStatusSchema>;

export const anatomicalCheckSeveritySchema = z.enum(["pass", "warning", "error"]);
export type AnatomicalCheckSeverity = z.infer<typeof anatomicalCheckSeveritySchema>;

export const treatmentPlanAnatomicalCheckSchema = z.object({
	toothNumber: z.number().int().min(11).max(85).optional(),
	rule: z.string(),
	status: anatomicalCheckSeveritySchema,
	message: z.string(),
	recommendation: z.string().optional(),
	code804nRelated: z.array(z.string()).optional(),
});
export type TreatmentPlanAnatomicalCheck = z.infer<typeof treatmentPlanAnatomicalCheckSchema>;

export const treatmentPlanValidateAndCommentResponseSchema = z.object({
	clinicalValidation: z.object({
		overallStatus: starComplianceStatusSchema,
		complianceScorePercent: z.number().min(0).max(100),
		totalChecksCount: z.number().int().nonnegative(),
		passedChecksCount: z.number().int().nonnegative(),
		warningsCount: z.number().int().nonnegative(),
		errorsCount: z.number().int().nonnegative(),
		criticalWarnings: z.array(z.string()),
		clinicalRecommendations: z.array(z.string()),
		anatomicalChecks: z.array(treatmentPlanAnatomicalCheckSchema),
	}),
	chairsideCommentary: z.object({
		patientFriendlySummary: z.string(),
		urgencyArgument: z.string(),
		hygieneAndCareAdvice: z.string(),
		stageByStageExplanation: z.array(
			z.object({
				stageNumber: z.number().int(),
				stageTitle: z.string(),
				plainRussianDescription: z.string(),
				patientBenefit: z.string(),
			}),
		),
	}),
	financialArgumentation: z.object({
		totalRub: z.number().nonnegative(),
		ndflDeduction: z.object({
			code01AmountRub: z.number().nonnegative(),
			code01RefundRub: z.number().nonnegative(),
			code02AmountRub: z.number().nonnegative(),
			code02RefundRub: z.number().nonnegative(),
			totalRefundRub: z.number().nonnegative(),
			netPriceWithRefundRub: z.number().nonnegative(),
			explanation: z.string(),
		}),
		installments: z.record(
			z.string(),
			z.object({
				months: z.number().int(),
				monthlyPaymentRub: z.number().nonnegative(),
				totalPaymentRub: z.number().nonnegative(),
				overpaymentRub: z.literal(0),
			}),
		),
		stagedPaymentSchedule: z.object({
			stage1AdvanceRub: z.number().nonnegative(),
			stage2SurgicalRub: z.number().nonnegative(),
			stage3FinalRub: z.number().nonnegative(),
			explanation: z.string(),
		}),
	}),
	copilotSuggestions: z.object({
		budgetOptimizationAdvice: z.string().optional(),
		suggestedModifications: z.array(
			z.object({
				type: z.string(),
				title: z.string(),
				description: z.string(),
				estimatedDeltaRub: z.number(),
			}),
		),
		modifiedStages: z.array(z.any()).optional(),
	}),
	modelUsed: z.string().optional(),
	providerUsed: z.string().optional(),
	validatedAtIso: z.string(),
});
export type TreatmentPlanValidateAndCommentResponse = z.infer<
	typeof treatmentPlanValidateAndCommentResponseSchema
>;

/**
 * Canonical classifier mapping a medical procedure to one of the 4 clinical phases (Mandate 8b, 8za SSOT).
 */
export function classifyProcedure4StageCategory(
	code804n?: string | null,
	nameRu?: string | null,
	categoryRu?: string | null,
): TreatmentPlanStageCategory {
	const code = (code804n || "").trim();
	const name = (nameRu || "").toLowerCase();
	const cat = (categoryRu || "").toLowerCase();

	// 1. Orthopedics, Prosthetics & Orthodontics (4th Phase)
	if (
		code.startsWith("A16.07.004") ||
		code.startsWith("A16.07.006") ||
		code.startsWith("A16.07.003") ||
		code.startsWith("A16.07.005") ||
		code.startsWith("A16.07.036") ||
		code.startsWith("A16.07.023") ||
		code.startsWith("A16.07.049") ||
		code.startsWith("A16.07.046") ||
		code.startsWith("A16.07.047") ||
		code.startsWith("A16.07.048") ||
		cat.includes("ортопед") ||
		cat.includes("протез") ||
		cat.includes("коронк") ||
		cat.includes("винир") ||
		cat.includes("бюгел") ||
		cat.includes("вкладк") ||
		cat.includes("ортодонт") ||
		cat.includes("брекет") ||
		cat.includes("элайнер") ||
		name.includes("коронк") ||
		name.includes("протез") ||
		name.includes("винир") ||
		name.includes("e.max") ||
		name.includes("циркон") ||
		name.includes("брекет") ||
		name.includes("элайнер")
	) {
		return "ortho_prosthetics";
	}

	// 2. Surgery & Implantology (3rd Phase)
	if (
		code.startsWith("A16.07.001") ||
		code.startsWith("A16.07.041") ||
		code.startsWith("A16.07.054") ||
		code.startsWith("A16.07.093") ||
		code.startsWith("A16.07.026") ||
		code.startsWith("A16.07.011") ||
		code.startsWith("A16.07.040") ||
		code.startsWith("A16.07.055") ||
		code.startsWith("A16.07.096") ||
		cat.includes("хирург") ||
		cat.includes("имплант") ||
		cat.includes("синус") ||
		cat.includes("удален") ||
		cat.includes("костн") ||
		name.includes("удален") ||
		name.includes("имплант") ||
		name.includes("синус") ||
		name.includes("костн") ||
		name.includes("пластик")
	) {
		return "surgery_implant";
	}

	// 3. Hygiene, Sanitation & Emergency Pain Relief (1st Phase)
	const isEmergency =
		code.startsWith("A16.07.007") || // Pulpotomy for acute pain
		code.startsWith("A16.07.016") || // Drainage / abscess opening
		name.includes("неотложн") ||
		name.includes("острая боль") ||
		name.includes("острый пульпит") ||
		name.includes("купирование боли") ||
		name.includes("дренирование") ||
		name.includes("вскрытие абсцесс");

	if (
		isEmergency ||
		code.startsWith("A16.07.051") ||
		code.startsWith("A16.07.020") ||
		code.startsWith("A16.07.050") ||
		code.startsWith("A16.07.019") ||
		cat.includes("гигиен") ||
		cat.includes("пародонт") ||
		cat.includes("sanitation") ||
		cat.includes("hygiene") ||
		name.includes("гигиен") ||
		name.includes("чистк") ||
		name.includes("air-flow") ||
		name.includes("ультразвук") ||
		name.includes("пародонт") ||
		name.includes("отложени") ||
		name.includes("скейлинг") ||
		name.includes("srp")
	) {
		return "hygiene_sanitation";
	}

	// 4. Endodontics, Therapy & Caries (2nd Phase)
	return "endo_therapy";
}

/**
 * Maps a 3-stage model stageKind ('stage_1_therapy', 'stage_2_surgery', 'stage_3_orthopedics')
 * to the corresponding 4-stage category ('hygiene_sanitation', 'endo_therapy', 'surgery_implant', 'ortho_prosthetics').
 */
export function map3StageKindTo4StageCategory(
	stageKind: string,
	code804n?: string | null,
	nameRu?: string | null,
	categoryRu?: string | null,
): TreatmentPlanStageCategory {
	if (stageKind === "stage_3_orthopedics" || stageKind.includes("ortho") || stageKind.includes("prosthet")) {
		return "ortho_prosthetics";
	}
	if (stageKind === "stage_2_surgery" || stageKind.includes("surg") || stageKind.includes("implant")) {
		return "surgery_implant";
	}
	if (stageKind === "stage_1_therapy" || stageKind.includes("therap")) {
		return classifyProcedure4StageCategory(code804n, nameRu, categoryRu);
	}
	return classifyProcedure4StageCategory(code804n, nameRu, categoryRu);
}

/**
 * Maps a 4-stage category to the corresponding 3-stage kind.
 */
export function map4StageCategoryTo3StageKind(
	category: TreatmentPlanStageCategory,
): "stage_1_therapy" | "stage_2_surgery" | "stage_3_orthopedics" {
	switch (category) {
		case "hygiene_sanitation":
		case "endo_therapy":
			return "stage_1_therapy";
		case "surgery_implant":
			return "stage_2_surgery";
		case "ortho_prosthetics":
			return "stage_3_orthopedics";
	}
}


