import type { ClinicalBundleDefinition } from "../../treatmentPlanBundlesEngine.js";
import type { TreatmentPlanItem, TreatmentPlanStage } from "../types.js";

const STAGE_TITLES: Record<1 | 2 | 3, { title: string; subtitle: string; goal: string }> = {
	1: { title: "Этап 1: Неотложная помощь и терапевтическая санация", subtitle: "Санация", goal: "Санация полости рта" },
	2: { title: "Этап 2: Хирургический этап и дентальная имплантация", subtitle: "Хирургия", goal: "Хирургическая санация" },
	3: { title: "Этап 3: Ортопедический этап и протезирование", subtitle: "Ортопедия", goal: "Ортопедическое восстановление" },
};

export function mergeChairsideBundleIntoStages(
	stages: readonly TreatmentPlanStage[],
	items: TreatmentPlanItem[],
	bundle: ClinicalBundleDefinition,
): TreatmentPlanStage[] {
	const targetStageExists = stages.some(
		(st) => st.stageKind === bundle.stageKind || st.stageNumber === bundle.stageNumber,
	);

	if (!targetStageExists) {
		const meta = STAGE_TITLES[bundle.stageNumber];
		const stageTotalRub = items.reduce((acc, it) => acc + it.priceRub, 0);
		const newStage: TreatmentPlanStage = {
			stageNumber: bundle.stageNumber,
			stageKind: bundle.stageKind,
			title: meta.title,
			subtitle: meta.subtitle,
			clinicalGoal: meta.goal,
			items,
			totalRub: stageTotalRub,
			totalKopecks: Math.round(stageTotalRub * 100) as any,
			estimatedVisits: Math.max(1, Math.ceil(items.length / 2)),
			estimatedWeeks: 2,
			serviceCatalogCodes: items.map((it) => it.code804n),
			order804nCodes: items.map((it) => it.code804n),
		};
		return [...stages, newStage].sort((a, b) => a.stageNumber - b.stageNumber);
	}

	return stages.map((st) => {
		if (st.stageKind !== bundle.stageKind && st.stageNumber !== bundle.stageNumber) return st;
		const updatedItems = [...st.items, ...items];
		const totalRub = updatedItems.reduce((acc, it) => acc + it.priceRub, 0);
		return {
			...st,
			items: updatedItems,
			totalRub,
			totalKopecks: Math.round(totalRub * 100) as any,
			serviceCatalogCodes: Array.from(new Set([...(st.serviceCatalogCodes || st.order804nCodes || []), ...items.map((it) => it.code804n)])),
			order804nCodes: Array.from(new Set([...(st.serviceCatalogCodes || st.order804nCodes || []), ...items.map((it) => it.code804n)])),
		};
	});
}
