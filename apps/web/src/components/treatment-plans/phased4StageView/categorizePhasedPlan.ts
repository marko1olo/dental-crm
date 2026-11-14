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
	type TreatmentPlanStage as SharedTreatmentPlanStage,
	type Kopecks,
} from "@dental/shared";
import type { TreatmentPlanItem, TreatmentPlanStage } from "../types";
import {
	type CategorizedPhasedPlanData,
	type PhasedStageCategoryBucket,
} from "./phasedContracts";
import { CATEGORY_ORDER, STAGE_TIMELINE_LABELS } from "./phasedConstants";
import { resolvePhasedItemCategory } from "./resolvePhasedCategory";

type PhasedPlanItemInput = TreatmentPlanItem & {
	readonly totalPriceRub?: number | undefined;
	readonly code?: string | undefined;
};

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
		for (const item of stage.items as readonly PhasedPlanItemInput[]) {
			const cat = resolvePhasedItemCategory(item, stage.stageKind);
			const rawPrice = item.priceRub ?? item.unitPriceRub ?? item.totalPriceRub ?? 0;
			const qty = item.quantity || 1;
			const discount = item.discountRub || 0;
			const unitKop = parseKopecks(rawPrice);
			const discKop = parseKopecks(discount);
			const lineTotalKop = Math.max(0, unitKop * qty - discKop) as Kopecks;
			const itemRub = Math.round(lineTotalKop / 100);

			map[cat].items.push({
				id: item.id,
				name: item.name,
				serviceCode: item.serviceCode || item.code804n || item.code || "",
				code804n: item.code804n || item.serviceCode || item.code || "",
				toothNumber: item.toothNumber,
				category: cat,
				priceKopecks: lineTotalKop,
				priceRub: itemRub,
				durationLabel: STAGE_TIMELINE_LABELS[cat],
				clinicalJustification: stage.clinicalGoal,
			});
		}
	}

	const stagesInput: SharedTreatmentPlanStage[] = CATEGORY_ORDER.map((cat, idx) => ({
		id: `stage-${idx + 1}`,
		planId: "plan-phased-preview",
		stageNumber: idx + 1,
		category: cat,
		titleRu: STAGE_CATEGORY_META[cat].defaultTitleRu,
		items: map[cat].items.map((i, itemIdx) => ({
			id: i.id || `item-${idx}-${itemIdx}`,
			code804n: i.code804n || i.serviceCode || "A16.07.001",
			nameRu: i.name || "Услуга",
			unitPriceKopecks: i.priceKopecks,
			quantity: 1,
			discountKopecks: 0,
			totalPriceKopecks: i.priceKopecks,
			status: "pending" as const,
		})),
	}));

	const recalc = recalculateTreatmentPlanTotals(stagesInput);
	for (const stageRes of recalc.stages) {
		const stageCat = stageRes.category;
		if (stageCat && map[stageCat]) {
			const kop = (stageRes.totalPriceKopecks ?? stageRes.subtotalKopecks ?? 0) as Kopecks;
			map[stageCat].subtotalKopecks = kop;
			map[stageCat].subtotalRub = Math.round(kop / 100);
		}
	}

	const grandTotalKopecks = sumKopecks(CATEGORY_ORDER.map((c) => map[c].subtotalKopecks));
	const grandTotalRub = Math.round(grandTotalKopecks / 100);
	const totalItemsCount = CATEGORY_ORDER.reduce((acc, c) => acc + map[c].items.length, 0);

	return { map, grandTotalKopecks, grandTotalRub, totalItemsCount };
}
