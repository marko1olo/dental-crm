import type { TreatmentPlanStage } from "../types.js";
import { computeStageItemsTotalKopecks } from "./common.js";

export function removeItemFromStages(
	stages: readonly TreatmentPlanStage[],
	itemId: string,
): TreatmentPlanStage[] {
	return stages.map((st) => {
		if (!st.items.some((it) => it.id === itemId)) return st;
		const updatedItems = st.items.filter((it) => it.id !== itemId);
		const stTotalKopecks = computeStageItemsTotalKopecks(updatedItems);
		return {
			...st,
			items: updatedItems,
			totalRub: stTotalKopecks / 100,
			totalKopecks: stTotalKopecks,
		};
	});
}
