/**
 * treatmentPlanDoctorDiscounts.ts — расчет скидок врача (процентных и фиксированных в рублях)
 * с копеечной точностью без округлительного дрейфа (Мандаты 8e, 8n).
 */

import {
	type Kopecks,
	parseKopecks,
	percentageOfKopecks,
	sumKopecks,
} from "@dental/shared";
import type { TreatmentPlanStage } from "./types";
import { calculateStageTotals } from "./treatmentPlanPricingEngine";
import {
	calculateItemDiscountedState,
	getItemBaseUnitPriceKopecks,
} from "./doctorDiscounts/applyItemDiscountHelper";

/**
 * Применяет свободную скидку врача (0-100%) к процедурам этапа (Мандат 8e).
 * При 100% скидке цена становится 0 ₽ (гарантия клиники).
 * Опционально targetStageNumber ограничивает применение скидки конкретным этапом.
 */
export function applyDoctorDiscountToStages(
	stages: readonly TreatmentPlanStage[],
	discountPercent: number,
	targetStageNumber?: number,
): readonly TreatmentPlanStage[] {
	const validPct = Math.max(0, Math.min(100, discountPercent));

	return stages.map((stage) => {
		if (targetStageNumber !== undefined && targetStageNumber > 0 && stage.stageNumber !== targetStageNumber) {
			return stage;
		}

		const updatedItems = stage.items.map((it) => {
			const baseUnitPriceKop = getItemBaseUnitPriceKopecks(it);
			const discountKopPerUnit =
				validPct > 0 ? percentageOfKopecks(baseUnitPriceKop, validPct * 100) : (0 as Kopecks);
			return calculateItemDiscountedState(it, discountKopPerUnit);
		});

		const stageTotals = calculateStageTotals(updatedItems);
		return {
			...stage,
			items: updatedItems,
			totalRub: stageTotals.totalRub,
			totalKopecks: stageTotals.totalKopecks,
		};
	});
}

/**
 * Применяет фиксированную скидку врача в рублях к этапам плана лечения (Мандат 8e).
 * Сумма скидки распределяется пропорционально стоимости процедур с копеечной точностью.
 * Опционально targetStageNumber ограничивает применение скидки конкретным этапом.
 */
export function applyDoctorFixedDiscountToStages(
	stages: readonly TreatmentPlanStage[],
	discountRub: number,
	targetStageNumber?: number,
): readonly TreatmentPlanStage[] {
	const validDiscountRub = Math.max(0, discountRub);
	if (validDiscountRub === 0) return stages;

	const targetStages = targetStageNumber && targetStageNumber > 0
		? stages.filter((s) => s.stageNumber === targetStageNumber)
		: stages;

	const targetTotalKop = sumKopecks(targetStages.map((s) => s.totalKopecks));
	if (targetTotalKop <= 0) return stages;

	const discountKop = Math.min(targetTotalKop, parseKopecks(validDiscountRub));
	const discountRatio = discountKop / targetTotalKop;

	return stages.map((stage) => {
		if (targetStageNumber !== undefined && targetStageNumber > 0 && stage.stageNumber !== targetStageNumber) {
			return stage;
		}

		const updatedItems = stage.items.map((it) => {
			const baseUnitPriceKop = getItemBaseUnitPriceKopecks(it);
			const discountKopPerUnit = Math.round(baseUnitPriceKop * discountRatio) as Kopecks;
			return calculateItemDiscountedState(it, discountKopPerUnit);
		});

		const stageTotals = calculateStageTotals(updatedItems);
		return {
			...stage,
			items: updatedItems,
			totalRub: stageTotals.totalRub,
			totalKopecks: stageTotals.totalKopecks,
		};
	});
}
