/**
 * treatmentPlanTypes.ts — Канонические строгие типы и Zod-схемы модуля планов лечения (SSOT).
 * Мандат 8b: Золотой стандарт (100–150 строк), zero circular dependencies.
 */

import { z } from "zod";
import type { Kopecks } from "@dental/shared";

export type TreatmentPlanStatus =
	| "draft"
	| "presented"
	| "approved"
	| "in_progress"
	| "active"
	| "completed"
	| "rejected";

export type TreatmentPlanStageKind =
	| "stage_1_therapy"
	| "stage_2_surgery"
	| "stage_3_orthopedics"
	| "stage_4_orthodontics"
	| "stage_5_periodontics"
	| "stage_custom";

export type TreatmentPlanStageStatus = "draft" | "agreed" | "in_progress" | "completed";

export type TreatmentPlanTierId = "economy" | "optimum" | "premium" | "standard";

export interface PlanPriceCatalogItem {
	readonly id: string;
	readonly title: string;
	readonly category: string;
	readonly basePriceRub: number;
	readonly active?: boolean | undefined;
	readonly code?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly order804nCode?: string | undefined;
}

export const treatmentPlanItemSchema = z.object({
	id: z.string().min(1),
	toothNumber: z.number().int().min(11).max(85).optional(),
	relatedToothNumbers: z.array(z.number().int()).optional(),
	serviceCode: z.string().optional(),
	code804n: z.string().default(""),
	name: z.string().min(1, "Наименование процедуры обязательно"),
	category: z.string().default("Общие"),
	priceRub: z.number().nonnegative().default(0),
	unitPriceRub: z.number().nonnegative().default(0),
	discountRub: z.number().nonnegative().default(0),
	quantity: z.number().positive().default(1),
	stageKind: z.string().default("stage_custom"),
	isCompleted: z.boolean().default(false),
	doctorId: z.string().nullable().optional(),
	doctorName: z.string().nullable().optional(),
	doctorSpecialty: z.string().nullable().optional(),
});

export type TreatmentPlanItem = z.infer<typeof treatmentPlanItemSchema>;

export const treatmentPlanStageSchema = z.object({
	id: z.string().optional(),
	stageNumber: z.number().int().positive(),
	stageKind: z.string().default("stage_custom"),
	title: z.string().min(1, "Название этапа обязательно"),
	subtitle: z.string().default(""),
	clinicalGoal: z.string().default(""),
	items: z.array(treatmentPlanItemSchema).default([]),
	totalRub: z.number().nonnegative().default(0),
	totalKopecks: z.number().nonnegative().default(0),
	estimatedVisits: z.number().int().nonnegative().default(1),
	estimatedWeeks: z.number().int().nonnegative().default(1),
	status: z.enum(["draft", "agreed", "in_progress", "completed"]).default("draft"),
	doctorId: z.string().nullable().optional(),
	doctorName: z.string().nullable().optional(),
	doctorSpecialty: z.string().nullable().optional(),
});

export type TreatmentPlanStage = z.infer<typeof treatmentPlanStageSchema>;

export interface TreatmentPlanTier {
	readonly tierId: TreatmentPlanTierId;
	readonly title: string;
	readonly subtitle: string;
	readonly badge: string;
	readonly isRecommended: boolean;
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly warrantyYears: number;
	readonly keyAdvantages: readonly string[];
	readonly stages: readonly TreatmentPlanStage[];
}

export const treatmentPlanSchema = z.object({
	id: z.string().optional(),
	patientId: z.string().min(1),
	organizationId: z.string().min(1),
	title: z.string().min(1).default("План комплексной реабилитации"),
	status: z.enum(["draft", "presented", "approved", "in_progress", "active", "completed", "rejected"]).default("draft"),
	selectedTier: z.enum(["economy", "optimum", "premium", "standard"]).default("optimum"),
	stages: z.array(treatmentPlanStageSchema).default([]),
	totalRub: z.number().nonnegative().default(0),
	totalKopecks: z.number().nonnegative().default(0),
	doctorDiscountPercent: z.number().min(0).max(100).default(0),
	notes: z.string().optional(),
});

export type TreatmentPlan = z.infer<typeof treatmentPlanSchema>;

export function kopecksToRub(kopecks: number): number {
	return Math.round(kopecks / 100);
}

export function rubToKopecks(rub: number): Kopecks {
	return Math.round(rub * 100);
}

export function formatRubles(rub: number): string {
	return (rub || 0).toLocaleString("ru-RU").replace(/[\u00A0\u202F]/g, " ") + " ₽";
}

export function romanizeStageNumber(num: number): string {
	const romanMap: Record<number, string> = {
		1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X",
	};
	return romanMap[num] || String(num);
}

export function isPlanPriceImmutable(status?: string | null): boolean {
	if (!status) return false;
	const s = status.trim().toLowerCase();
	return (
		s === "approved" ||
		s === "in_progress" ||
		s === "active" ||
		s === "completed" ||
		s === "agreed" ||
		s === "accepted" ||
		s === "signed"
	);
}
