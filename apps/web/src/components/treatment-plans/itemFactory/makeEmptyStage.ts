import type { Kopecks } from "@dental/shared";
import type { TreatmentPlanStage, TreatmentPlanStageKind } from "../types";

/**
 * Создание пустого этапа плана.
 */
export function makeEmptyStage(
	stageNumber: number,
	stageKind: TreatmentPlanStageKind,
	title: string,
	subtitle: string,
): TreatmentPlanStage {
	return {
		stageNumber,
		stageKind,
		title,
		subtitle,
		clinicalGoal: subtitle,
		items: [],
		totalRub: 0,
		totalKopecks: 0 as Kopecks,
		estimatedVisits: 0,
		estimatedWeeks: 0,
		serviceCatalogCodes: [],
		order804nCodes: [],
	};
}
