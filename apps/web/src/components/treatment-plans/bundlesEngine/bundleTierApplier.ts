import {
	type Kopecks,
	calculatePlanTaxDeductionBreakdown,
	calculateStaged304030Schedule,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type { ClinicalBundleId } from "../treatmentPlanBundlesPresets";
import { computeTierInstallments } from "../treatmentPlanStagesEngine";
import type { NdflDeductionResult, TreatmentPlanTier } from "../types";
import { type CreateBundlePlanItemsOptions } from "./bundlePlanItemsBuilder";
import { applyClinicalBundleToStages } from "./bundleStageApplier";

export function applyClinicalBundleToTier(
	tier: TreatmentPlanTier,
	bundleId: ClinicalBundleId,
	toothNumberOrOptions?: number | CreateBundlePlanItemsOptions,
): TreatmentPlanTier {
	const updatedStages = applyClinicalBundleToStages(tier.stages, bundleId, toothNumberOrOptions);
	const totalKopecks = sumKopecks(updatedStages.map((s) => s.totalKopecks));
	const totalRub = Math.round(totalKopecks / 100);
	const allItems = updatedStages.flatMap((s) => s.items);

	const ndflBreakdown = calculatePlanTaxDeductionBreakdown(allItems);
	const isHighCost = ndflBreakdown.hasCode02ExpensiveServices;
	const ndflDetails: NdflDeductionResult = {
		code: isHighCost ? "02" : "01",
		codeDescription: isHighCost
			? "Код 02 — Дорогостоящее лечение (имплантация, костная пластика, синус-лифтинг) — налоговый вычет 13% со всей суммы без ограничений"
			: "Код 01 — Обычное медицинское лечение (терапия, гигиена, ортопедия) — налоговый вычет 13% с лимитом базы 150 000 ₽ (макс. возврат 19 500 ₽)",
		isHighCostCode02: isHighCost,
		baseKopecks: (isHighCost
			? totalKopecks
			: Math.min(totalKopecks, parseKopecks(150000))) as Kopecks,
		refundKopecks: parseKopecks(ndflBreakdown.grandTotalRefund13Rub),
		refundRub: ndflBreakdown.grandTotalRefund13Rub,
		finalPriceWithRefundRub: ndflBreakdown.netPriceWithRefundRub,
		annualLimitRub: isHighCost ? undefined : 150000,
	};
	const installments = computeTierInstallments(totalKopecks);
	const stagedSchedule = calculateStaged304030Schedule(totalKopecks, true);

	return {
		...tier,
		stages: updatedStages,
		itemsCount: allItems.length,
		totalRub,
		totalKopecks,
		monthlyInstallment12Rub: installments[12].monthlyPaymentRub,
		installments,
		ndflDetails,
		ndflRefundRub: ndflBreakdown.grandTotalRefund13Rub,
		priceWithNdflRefundRub: ndflBreakdown.netPriceWithRefundRub,
		stagedSchedule,
	};
}
