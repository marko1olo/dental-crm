import {
	type Kopecks,
	calculatePlanTaxDeductionBreakdown,
	calculateStaged304030Schedule,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type { CatalogServiceLookupItem } from "../treatmentPlanStagesEngine";
import { computeTierInstallments } from "../treatmentPlanStagesEngine";
import type { NdflDeductionResult, TreatmentPlanTier, TreatmentPlanTierId } from "../types";
import { TIER_METAS } from "./tierMetas";
import { assembleTierStages } from "./tierStageAssembler";
import type { CbctAutoPlanFindingsInput } from "./types";

export function generateCbctAutoPlanScenarios(
	findings: CbctAutoPlanFindingsInput,
	catalog?: readonly CatalogServiceLookupItem[] | undefined,
	discountPercent: number = 0,
): [TreatmentPlanTier, TreatmentPlanTier, TreatmentPlanTier] {
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));

	function buildTier(tierId: TreatmentPlanTierId): TreatmentPlanTier {
		const meta = TIER_METAS[tierId];
		const stages = assembleTierStages(findings, tierId, catalog, validDiscountPct);
		const allItems = stages.flatMap((s) => s.items);
		const totalKopecks = sumKopecks(stages.map((s) => s.totalKopecks));
		const totalRub = Math.round(totalKopecks / 100);

		const ndflBreakdown = calculatePlanTaxDeductionBreakdown(allItems);
		const isHighCost = ndflBreakdown.hasCode02ExpensiveServices;
		const ndflDetails: NdflDeductionResult = {
			code: isHighCost ? "02" : "01",
			codeDescription: isHighCost
				? "Код 02 — Дорогостоящее лечение (дентальная имплантация, синус-лифтинг, остеопластика) — налоговый вычет 13% со всей суммы без ограничений"
				: "Код 01 — Обычное медицинское лечение — налоговый вычет 13% с лимитом базы 150 000 ₽",
			isHighCostCode02: isHighCost,
			baseKopecks: (isHighCost ? totalKopecks : Math.min(totalKopecks, parseKopecks(150000))) as Kopecks,
			refundKopecks: parseKopecks(ndflBreakdown.grandTotalRefund13Rub),
			refundRub: ndflBreakdown.grandTotalRefund13Rub,
			finalPriceWithRefundRub: ndflBreakdown.netPriceWithRefundRub,
			annualLimitRub: isHighCost ? undefined : 150000,
		};

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

	return [buildTier("economy"), buildTier("standard"), buildTier("optimum")];
}
