import type { Kopecks } from "@dental/shared";
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
	return {
		stageNumber,
		stageKind,
		title,
		subtitle,
		clinicalGoal,
		items,
		totalRub,
		totalKopecks: (totalRub * 100) as Kopecks,
		estimatedVisits,
		estimatedWeeks,
		serviceCatalogCodes: Array.from(new Set(items.map((i) => i.code804n))),
		order804nCodes: Array.from(new Set(items.map((i) => i.code804n))),
	};
}
