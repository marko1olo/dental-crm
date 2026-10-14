/**
 * treatmentPlanDoctorDiscounts.ts — расчет скидок врача (процентных и фиксированных в рублях)
 * с копеечной точностью без округлительного дрейфа (Мандаты 8e, 8n).
 */

import {
	type Kopecks,
	parseKopecks,
	percentageOfKopecks,
	sumKopecks,
	multiplyKopecks,
} from "@dental/shared";
import type { TreatmentPlanStage } from "./types";
import { safeKopecks, calculateStageTotals } from "./treatmentPlanPricingEngine";

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
			const baseUnitPriceRub =
				typeof it.unitPriceRub === "number" && it.unitPriceRub > 0
					? it.unitPriceRub
					: it.priceRub && it.quantity
						? Math.round(it.priceRub / it.quantity)
						: 0;

			const baseUnitPriceKop = safeKopecks(baseUnitPriceRub, { allowEmptyAsZero: true }) ?? (0 as Kopecks);
			const discountKopPerUnit =
				validPct > 0 ? percentageOfKopecks(baseUnitPriceKop, validPct * 100) : (0 as Kopecks);
			const finalUnitPriceKop = Math.max(0, baseUnitPriceKop - discountKopPerUnit) as Kopecks;

			const qty = Math.max(1, it.quantity || 1);
			const lineTotalKop = multiplyKopecks(finalUnitPriceKop, qty);
			const lineDiscountKop = multiplyKopecks(discountKopPerUnit, qty);

			return {
				...it,
				unitPriceRub: Math.round(baseUnitPriceKop / 100),
				priceRub: Math.round(lineTotalKop / 100),
				discountRub: Math.round(lineDiscountKop / 100),
			};
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
	if (validDiscountRub === 0) {
		return stages;
	}

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
			const baseUnitPriceRub =
				typeof it.unitPriceRub === "number" && it.unitPriceRub > 0
					? it.unitPriceRub
					: it.priceRub && it.quantity
						? Math.round(it.priceRub / it.quantity)
						: 0;

			const baseUnitPriceKop = safeKopecks(baseUnitPriceRub, { allowEmptyAsZero: true }) ?? (0 as Kopecks);
			const discountKopPerUnit = Math.round(baseUnitPriceKop * discountRatio) as Kopecks;
			const finalUnitPriceKop = Math.max(0, baseUnitPriceKop - discountKopPerUnit) as Kopecks;

			const qty = Math.max(1, it.quantity || 1);
			const lineTotalKop = multiplyKopecks(finalUnitPriceKop, qty);
			const lineDiscountKop = multiplyKopecks(discountKopPerUnit, qty);

			return {
				...it,
				unitPriceRub: Math.round(baseUnitPriceKop / 100),
				priceRub: Math.round(lineTotalKop / 100),
				discountRub: Math.round(lineDiscountKop / 100),
			};
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
