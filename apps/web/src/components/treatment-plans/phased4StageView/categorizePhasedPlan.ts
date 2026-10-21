/**
 * apps/web/src/components/treatment-plans/phased4StageView/categorizePhasedPlan.ts
 *
 * Копеечно-точная агрегация 4-стадийного плана лечения (Мандат 8c).
 */

import {
	STAGE_CATEGORY_META,
	recalculateTreatmentPlanTotals,
	parseKopecks,
	sumKopecks,
	type TreatmentPlanStageCategory,
	type Kopecks,
} from "@dental/shared";
import type { TreatmentPlanStage } from "../types";
import {
	type CategorizedPhasedPlanData,
	type PhasedStageCategoryBucket,
} from "./phasedContracts";
import { CATEGORY_ORDER, STAGE_TIMELINE_LABELS } from "./phasedConstants";
import { resolvePhasedItemCategory } from "./resolvePhasedCategory";

export function categorizePhasedPlanStages(
	stages: readonly TreatmentPlanStage[],
): CategorizedPhasedPlanData {
	const map: Record<TreatmentPlanStageCategory, PhasedStageCategoryBucket> = {
		hygiene_sanitation: { meta: STAGE_CATEGORY_META.hygiene_sanitation, items: [], subtotalKopecks: 0 as Kopecks, subtotalRub: 0 },
		endo_therapy: { meta: STAGE_CATEGORY_META.endo_therapy, items: [], subtotalKopecks: 0 as Kopecks, subtotalRub: 0 },
		surgery_implant: { meta: STAGE_CATEGORY_META.surgery_implant, items: [], subtotalKopecks: 0 as Kopecks, subtotalRub: 0 },
		ortho_prosthetics: { meta: STAGE_CATEGORY_META.ortho_prosthetics, items: [], subtotalKopecks: 0 as Kopecks, subtotalRub: 0 },
	};

	for (const stage of stages) {
		for (const item of stage.items) {
			const cat = resolvePhasedItemCategory(item, stage.stageKind);
			const rawPrice = (item as any).priceRub ?? (item as any).unitPriceRub ?? (item as any).totalPriceRub ?? 0;
			const qty = (item as any).quantity || 1;
			const discount = (item as any).discountRub || 0;
			const unitKop = parseKopecks(rawPrice);
			const discKop = parseKopecks(discount);
			const lineTotalKop = Math.max(0, unitKop * qty - discKop) as Kopecks;
			const itemRub = Math.round(lineTotalKop / 100);

			map[cat].items.push({
				id: item.id,
				name: item.name,
				code804n: item.code804n,
				toothNumber: item.toothNumber,
				category: cat,
				priceKopecks: lineTotalKop,
				priceRub: itemRub,
				durationLabel: STAGE_TIMELINE_LABELS[cat],
				clinicalJustification: stage.clinicalGoal,
			});
		}
	}

	const stagesInput = CATEGORY_ORDER.map((cat, idx) => ({
		id: `stage-${idx + 1}`,
		category: cat,
		items: map[cat].items.map((i) => ({
			unitPriceKopecks: i.priceKopecks,
			quantity: 1,
			discountKopecks: 0 as Kopecks,
			totalPriceKopecks: i.priceKopecks,
			status: "pending" as const,
		})),
	}));

	const recalc = recalculateTreatmentPlanTotals(stagesInput as any);
	for (const stageRes of recalc.stages) {
		const stageCat = (stageRes as any).category as TreatmentPlanStageCategory;
		if (stageCat && map[stageCat]) {
			const kop = (stageRes as any).totalPriceKopecks ?? (stageRes as any).subtotalKopecks ?? 0;
			map[stageCat].subtotalKopecks = kop;
			map[stageCat].subtotalRub = Math.round(kop / 100);
		}
	}

	const grandTotalKopecks = sumKopecks(CATEGORY_ORDER.map((c) => map[c].subtotalKopecks));
	const grandTotalRub = Math.round(grandTotalKopecks / 100);
	const totalItemsCount = CATEGORY_ORDER.reduce((acc, c) => acc + map[c].items.length, 0);

	return { map, grandTotalKopecks, grandTotalRub, totalItemsCount };
}
