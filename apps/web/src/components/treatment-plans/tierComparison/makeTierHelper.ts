import { sumKopecks, calculateStaged304030Schedule } from "@dental/shared";
import type { TreatmentPlanStage, TreatmentPlanTier, TreatmentPlanTierId } from "../types.js";
import { calculateNdflDeduction, computeTierInstallments } from "../treatmentPlanPricingEngine.js";
import type { TierPresetMeta } from "./tierMetadataPresets.js";

export function assembleTierFromPreset(
	tierId: TreatmentPlanTierId,
	meta: TierPresetMeta,
	stages: [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage],
): TreatmentPlanTier {
	const allItems = stages.flatMap((s) => s.items);
	const totalKopecks = sumKopecks(stages.map((s) => s.totalKopecks));
	const totalRub = Math.round(totalKopecks / 100);

	const isHighCost = allItems.some(
		(i) =>
			i.code804n === "A16.07.054.001" ||
			i.code804n === "A16.07.041" ||
			i.code804n === "A16.07.035",
	);

	const ndflDetails = calculateNdflDeduction(totalKopecks, isHighCost);
	const installments = computeTierInstallments(totalKopecks);
	const stagedSchedule = calculateStaged304030Schedule(totalKopecks, true);

	const estimatedWeeks = stages.reduce((acc, s) => acc + s.estimatedWeeks, 0);
	const estimatedVisits = stages.reduce((acc, s) => acc + s.estimatedVisits, 0);

	return {
		tierId,
		title: meta.title,
		subtitle: meta.subtitle,
		badge: meta.badge,
		badgeClass: meta.badgeClass,
		borderClass: meta.borderClass,
		isRecommended: meta.isRecommended,
		totalRub,
		totalKopecks,
		durationWeeks: estimatedWeeks,
		durationVisits: estimatedVisits,
		warrantyYears: meta.warrantyYears,
		serviceLifeYears: meta.serviceLifeYears,
		materialsHeadline: meta.materialsHeadline,
		materialsList: meta.materialsList,
		keyAdvantages: meta.keyAdvantages,
		stages,
		itemsCount: allItems.length,
		ndflRefundRub: ndflDetails.refundRub,
		priceWithNdflRefundRub: ndflDetails.finalPriceWithRefundRub,
		monthlyInstallment12Rub: installments[12]?.monthlyPaymentRub ?? 0,
		installments,
		ndflDetails,
		stagedSchedule,
	};
}
