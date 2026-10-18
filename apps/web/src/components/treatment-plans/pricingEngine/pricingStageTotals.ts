import {
	type Kopecks,
	multiplyKopecks,
	sumKopecks,
	calculateStaged304030Schedule,
} from "@dental/shared";
import type {
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanTier,
} from "../types";
import { safeKopecks } from "./pricingFormatters";
import { calculateChairsideTaxDeduction } from "./pricingDeductions";
import { computeTierInstallments } from "./pricingInstallments";

/**
 * Рассчитывает общую сумму этапа в копейках и рублях на основе его процедур.
 */
export function calculateStageTotals(items: readonly TreatmentPlanItem[]): {
	totalKopecks: Kopecks;
	totalRub: number;
} {
	if (!items || items.length === 0) {
		return { totalKopecks: 0 as Kopecks, totalRub: 0 };
	}

	const totalKopecks = sumKopecks(
		items.map((it) => {
			const unitKop = safeKopecks(it.unitPriceRub ?? 0, { allowEmptyAsZero: true }) ?? (0 as Kopecks);
			const qty = Math.max(1, it.quantity || 1);
			const discountKop = safeKopecks(it.discountRub ?? 0, { allowEmptyAsZero: true }) ?? (0 as Kopecks);
			return Math.max(0, multiplyKopecks(unitKop, qty) - discountKop) as Kopecks;
		}),
	);

	const totalRub = totalKopecks / 100;
	return { totalKopecks, totalRub };
}

/**
 * Рассчитывает общие финансовые итоги для всех этапов плана.
 */
export function calculatePlanStagesTotals(stages: readonly TreatmentPlanStage[]): {
	totalKopecks: Kopecks;
	totalRub: number;
	itemsCount: number;
	estimatedWeeks: number;
	estimatedVisits: number;
} {
	if (!stages || stages.length === 0) {
		return {
			totalKopecks: 0 as Kopecks,
			totalRub: 0,
			itemsCount: 0,
			estimatedWeeks: 0,
			estimatedVisits: 0,
		};
	}

	const totalKopecks = sumKopecks(stages.map((s) => s.totalKopecks));
	const totalRub = totalKopecks / 100;
	const itemsCount = stages.reduce((acc, s) => acc + s.items.length, 0);
	const estimatedWeeks = stages.reduce((acc, s) => acc + (s.estimatedWeeks || 0), 0);
	const estimatedVisits = stages.reduce((acc, s) => acc + (s.estimatedVisits || 0), 0);

	return {
		totalKopecks,
		totalRub,
		itemsCount,
		estimatedWeeks,
		estimatedVisits,
	};
}

/**
 * Полный пересчёт варианта плана лечения (Tier) после любых изменений в этапах.
 */
export function recalculateTierTotals(
	tier: TreatmentPlanTier,
	updatedStages: readonly TreatmentPlanStage[],
): TreatmentPlanTier {
	const stageStats = calculatePlanStagesTotals(updatedStages);
	const allItems = updatedStages.flatMap((s) => s.items);

	const isHighCost = allItems.some(
		(i) =>
			i.code804n === "A16.07.054.001" ||
			i.code804n === "A16.07.041" ||
			i.code804n === "A16.07.035" ||
			(i.name &&
				(i.name.toLowerCase().includes("имплантация") ||
					i.name.toLowerCase().includes("синус-лифтинг") ||
					i.name.toLowerCase().includes("костная пластика"))),
	);

	const ndflDetails = calculateChairsideTaxDeduction(stageStats.totalKopecks, isHighCost);
	const installments = computeTierInstallments(stageStats.totalKopecks);
	const stagedSchedule = calculateStaged304030Schedule(stageStats.totalKopecks, true);

	return {
		...tier,
		stages: updatedStages,
		totalRub: stageStats.totalRub,
		totalKopecks: stageStats.totalKopecks,
		itemsCount: stageStats.itemsCount,
		durationWeeks: stageStats.estimatedWeeks,
		durationVisits: stageStats.estimatedVisits,
		installments,
		stagedSchedule,
		ndflDetails,
		ndflRefundRub: ndflDetails.refundRub,
		priceWithNdflRefundRub: ndflDetails.finalPriceWithRefundRub,
		monthlyInstallment12Rub: installments[12]?.monthlyPaymentRub ?? 0,
	};
}
