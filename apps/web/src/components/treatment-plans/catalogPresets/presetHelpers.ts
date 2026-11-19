/**
 * presetHelpers.ts — Вспомогательные конструкторы позиций и этапов планов лечения.
 * Мандаты 8b, 8zi: Декомпозиция каталога смет.
 */

import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTierId } from "../treatmentPlanTypes";

export interface TreatmentTierDefinition {
	readonly id: TreatmentPlanTierId;
	readonly title: string;
	readonly subtitle: string;
	readonly badge: string;
	readonly isRecommended: boolean;
	readonly warrantyYears: number;
	readonly keyAdvantages: readonly string[];
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly amountKopecks: bigint;
}

export const mkItem = (
	id: string,
	toothNumber: number | undefined,
	code804n: string,
	name: string,
	priceRub: number,
	unitPriceRub: number,
	quantity: number,
	stageKind: string,
	category: string,
): TreatmentPlanItem => ({
	id,
	toothNumber,
	code804n,
	serviceCode: code804n,
	name,
	priceRub,
	unitPriceRub,
	discountRub: 0,
	quantity,
	stageKind,
	category,
	isCompleted: false,
});

export const mkStage = (
	id: string,
	stageNumber: number,
	stageKind: string,
	title: string,
	subtitle: string,
	clinicalGoal: string,
	totalRub: number,
	totalKopecks: number,
	items: TreatmentPlanItem[],
): TreatmentPlanStage => ({
	id,
	stageNumber,
	stageKind,
	title,
	subtitle,
	clinicalGoal,
	totalRub,
	totalKopecks,
	estimatedVisits: 1,
	estimatedWeeks: 1,
	status: "draft",
	items,
});
