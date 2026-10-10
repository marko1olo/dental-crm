/**
 * types.ts — Type definitions & Zod schemas for Odontogram & Treatment Plan tools.
 * Layer 0: Pure Contracts & DTOs (Zero runtime DB dependencies).
 */

import { z } from "zod";

// ============================================================================
// 1. SCHEMAS & TYPES: update_teeth_chart
// ============================================================================

export const singleToothUpdateSchema = z.object({
	toothNumber: z
		.union([z.number(), z.string()])
		.describe("Номер зуба FDI (11..48 или 51..85, например 16, 26, '3.6')"),
	status: z
		.string()
		.min(1, "Статус зуба обязателен")
		.describe("Клинический статус: здоровый (Norm), кариес (C, C1-C4), пульпит (P), периодонтит (Pt), пломба (Pl, F), коронка (K, Cr), имплант (Imp), удален (A, X)"),
	surfaces: z
		.union([z.array(z.string()), z.string()])
		.optional()
		.describe("Поверхности MODVLI (окклюзионная, вестибулярная, медиальная, дистальная, небная/язычная, режущий край)"),
	diagnosisText: z.string().optional().describe("Текстовый диагноз или код МКБ-10"),
	notes: z.string().optional().describe("Клинические примечания к зубу"),
});

export const updateTeethChartSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	updates: z
		.array(singleToothUpdateSchema)
		.min(1, "Передайте хотя бы одно изменение статуса зуба")
		.describe("Список обновлений по зубам"),
	comment: z.string().optional().describe("Общий комментарий к обновлению формулы"),
});

export type UpdateTeethChartInput = z.infer<typeof updateTeethChartSchema>;

export interface ToothUpdateReportItem {
	toothNumber: number;
	fdiFormatted: string;
	statusCode: string;
	statusLabel: string;
	surfaces: string[];
	diagnosisText: string;
}

export interface UpdateTeethChartResult {
	success: true;
	patientId: string;
	totalUpdated: number;
	updatedTeeth: ToothUpdateReportItem[];
	message: string;
}

// ============================================================================
// 2. SCHEMAS & TYPES: get_teeth_chart
// ============================================================================

export const getTeethChartSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	dentitionType: z.enum(["permanent", "primary", "mixed"]).default("permanent").optional(),
	includeHistory: z.boolean().default(false).optional(),
});

export type GetTeethChartInput = z.infer<typeof getTeethChartSchema>;

export interface ChartToothState {
	toothNumber: number;
	fdiFormatted: string;
	state: string;
	surfaces: string[];
	diagnosisText: string;
	isHealthyNorm: boolean;
}

export interface GetTeethChartResult {
	success: true;
	patientId: string;
	dentitionType: string;
	totalTeeth: number;
	teeth: Record<number, ChartToothState>;
	pathologyCount: number;
	summaryRu: string;
}

// ============================================================================
// 3. SCHEMAS & TYPES: create_treatment_plan
// ============================================================================

export const createTreatmentPlanSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	title: z.string().default("Комплексный план лечения").optional(),
	doctorId: z.string().optional(),
	scenarioTier: z.enum(["optimal", "economy", "premium", "custom"]).default("optimal").optional(),
	discountPercent: z.number().min(0).max(100).default(0).optional().describe("Скидка врача 0-100%"),
	initialStages: z
		.array(
			z.object({
				toothNumber: z.number().optional(),
				title: z.string(),
				priceRub: z.number().nonnegative(),
				quantity: z.number().int().positive().default(1),
				serviceCode: z.string().default("A16.07.002"),
			}),
		)
		.optional(),
});

export type CreateTreatmentPlanInput = z.input<typeof createTreatmentPlanSchema>;

export interface CreateTreatmentPlanResult {
	success: true;
	planId: string;
	patientId: string;
	title: string;
	status: "Draft";
	scenarioTier: string;
	subtotalRub: number;
	discountPercent: number;
	totalPriceRub: number;
	totalPriceKopecks: number;
	formattedTotal: string;
	itemsCount: number;
	doctorAutonomyApplied: true;
	message: string;
}

// ============================================================================
// 4. SCHEMAS & TYPES: add_treatment_stage
// ============================================================================

export const addTreatmentStageSchema = z.object({
	planId: z.string().min(1, "planId обязателен"),
	serviceTitle: z.string().min(1, "serviceTitle обязателен"),
	priceRub: z.number().nonnegative("Цена не может быть отрицательной"),
	toothNumber: z.number().optional(),
	serviceCode: z.string().default("A16.07.002").optional(),
	quantity: z.number().int().positive().default(1).optional(),
	phase: z.number().int().positive().default(1).optional(),
});

export type AddTreatmentStageInput = z.infer<typeof addTreatmentStageSchema>;

export interface AddTreatmentStageResult {
	success: true;
	itemId: string;
	planId: string;
	serviceTitle: string;
	priceRub: number;
	quantity: number;
	totalLineKopecks: number;
	phase: number;
	message: string;
}

// ============================================================================
// 5. SCHEMAS & TYPES: calculate_plan_cost
// ============================================================================

export const calculatePlanCostSchema = z.object({
	items: z
		.array(
			z.object({
				title: z.string(),
				priceRub: z.number().nonnegative(),
				quantity: z.number().int().positive().default(1),
				code: z.string().optional(),
			}),
		)
		.min(1, "Передайте хотя бы одну услугу"),
	discountPercent: z.number().min(0).max(100).default(0).optional().describe("Скидка врача 0-100%"),
});

export type CalculatePlanCostInput = z.input<typeof calculatePlanCostSchema>;

export interface CalculatePlanCostResult {
	success: true;
	subtotalRub: number;
	subtotalKopecks: number;
	discountPercent: number;
	discountRub: number;
	discountKopecks: number;
	totalRub: number;
	totalKopecks: number;
	formattedTotal: string;
	doctorAutonomyApplied: true;
}

// ============================================================================
// 6. SCHEMAS & TYPES: get_tooth_history
// ============================================================================

export const getToothHistorySchema = z.object({
	patientId: z.string().min(1, "patientId обязателен").describe("ID пациента"),
	toothNumber: z
		.union([z.number(), z.string()])
		.describe("Номер зуба по международной формуле FDI (11..48 или 51..85, например 36 или '4.6')"),
});

export type GetToothHistoryInput = z.input<typeof getToothHistorySchema>;

export interface ToothHistoryTimelineItem {
	date: string;
	eventType: "status_change" | "visit_treatment" | "lab_order";
	title: string;
	authorName: string;
	detailsRu: string;
}

export interface GetToothHistoryResult {
	success: true;
	patientId: string;
	toothNumber: number;
	fdiFormatted: string;
	currentState: string;
	currentDiagnosis: string;
	eventsCount: number;
	timeline: ToothHistoryTimelineItem[];
	summaryRu: string;
}

// ============================================================================
// 7. COMPOSITE UNION DOMAIN INPUT TYPES
// ============================================================================

export type OdontogramToolInput =
	| UpdateTeethChartInput
	| GetTeethChartInput
	| GetToothHistoryInput;

export type TreatmentPlanToolInput =
	| CreateTreatmentPlanInput
	| AddTreatmentStageInput
	| CalculatePlanCostInput;
