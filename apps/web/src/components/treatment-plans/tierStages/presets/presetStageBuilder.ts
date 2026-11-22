import { type Kopecks, rublesToKopecks } from "@dental/shared";
import type { TreatmentPlanItem, TreatmentPlanStage } from "../types";

export function buildPresetStage(
	stageNumber: 1 | 2 | 3,
	stageKind: "stage_1_therapy" | "stage_2_surgery" | "stage_3_orthopedics",
	title: string,
	subtitle: string,
	clinicalGoal: string,
	items: TreatmentPlanItem[],
	totalRub: number,
	estimatedVisits: number,
	estimatedWeeks: number,
): TreatmentPlanStage {
	// DEF-06: Динамически пересчитываем totalRub и totalKopecks как честную сумму входящих в этап элементов items
	const calculatedItemsTotalRub = items.reduce(
		(acc, it) => acc + (it.priceRub ?? 0) * (it.quantity || 1),
		0,
	);
	const effectiveTotalRub = calculatedItemsTotalRub > 0 ? calculatedItemsTotalRub : totalRub;
	const effectiveTotalKopecks = rublesToKopecks(effectiveTotalRub) as Kopecks;

	return {
		stageNumber,
		stageKind,
		title,
		subtitle,
		clinicalGoal,
		items,
		totalRub: effectiveTotalRub,
		totalKopecks: effectiveTotalKopecks,
		estimatedVisits,
		estimatedWeeks,
		serviceCatalogCodes: Array.from(new Set(items.map((i) => i.code804n))),
		order804nCodes: Array.from(new Set(items.map((i) => i.code804n))),
	};
}
