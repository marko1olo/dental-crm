import { parseKopecks, sumKopecks } from "@dental/shared";
import type { ClinicalBundleId } from "../treatmentPlanBundlesPresets";
import type { TreatmentPlanStage } from "../types";
import {
	type CreateBundlePlanItemsOptions,
	createBundlePlanItems,
} from "./bundlePlanItemsBuilder";
import { getClinicalBundleById } from "./bundleRegistry";

const STAGE_TITLES: Record<1 | 2 | 3, { title: string; subtitle: string; goal: string }> = {
	1: {
		title: "Этап 1: Неотложная помощь и терапевтическая санация",
		subtitle: "Ликвидация очагов инфекции, лечение кариеса и гигиена",
		goal: "Полная санация полости рта и устранение болевых симптомов",
	},
	2: {
		title: "Этап 2: Хирургический этап и дентальная имплантация",
		subtitle: "Удаление безнадежных зубов, костная пластика и имплантация",
		goal: "Восстановление фундамента челюстной кости и опор",
	},
	3: {
		title: "Этап 3: Ортопедический этап и протезирование",
		subtitle: "Эстетическое и функциональное восстановление зубных рядов",
		goal: "Окончательное протезирование и нормализация окклюзии",
	},
};

export function applyClinicalBundleToStages(
	stages: readonly TreatmentPlanStage[],
	bundleId: ClinicalBundleId,
	toothNumberOrOptions?: number | CreateBundlePlanItemsOptions,
): TreatmentPlanStage[] {
	const bundle = getClinicalBundleById(bundleId);
	if (!bundle) return [...stages];

	const newItems = createBundlePlanItems(bundleId, toothNumberOrOptions);
	if (newItems.length === 0) return [...stages];

	const targetStageExists = stages.some(
		(st) => st.stageKind === bundle.stageKind || st.stageNumber === bundle.stageNumber,
	);

	if (!targetStageExists) {
		const meta = STAGE_TITLES[bundle.stageNumber];
		const stageTotalRub = newItems.reduce((acc, it) => acc + it.priceRub, 0);
		const stageTotalKopecks = parseKopecks(stageTotalRub);

		const newStage: TreatmentPlanStage = {
			stageNumber: bundle.stageNumber,
			stageKind: bundle.stageKind,
			title: meta.title,
			subtitle: meta.subtitle,
			clinicalGoal: meta.goal,
			items: newItems,
			totalRub: stageTotalRub,
			totalKopecks: stageTotalKopecks,
			estimatedVisits: Math.max(1, Math.ceil(newItems.length / 2)),
			estimatedWeeks: bundle.stageNumber === 2 ? 12 : 2,
			serviceCatalogCodes: newItems.map((it) => it.code804n),
			order804nCodes: newItems.map((it) => it.code804n),
		};

		return [...stages, newStage].sort((a, b) => a.stageNumber - b.stageNumber);
	}

	return stages.map((stage) => {
		if (stage.stageKind !== bundle.stageKind && stage.stageNumber !== bundle.stageNumber) {
			return stage;
		}

		const updatedItems = [...stage.items, ...newItems];
		const updatedTotalRub = updatedItems.reduce((acc, it) => acc + it.priceRub, 0);
		const updatedTotalKopecks = sumKopecks(updatedItems.map((it) => parseKopecks(it.priceRub)));
		const existingCodes = stage.serviceCatalogCodes || stage.order804nCodes || [];
		const updatedCatalogCodes = Array.from(
			new Set([...existingCodes, ...newItems.map((it) => it.code804n)]),
		);

		return {
			...stage,
			items: updatedItems,
			totalRub: updatedTotalRub,
			totalKopecks: updatedTotalKopecks,
			estimatedVisits: Math.max(stage.estimatedVisits, Math.ceil(updatedItems.length / 2)),
			serviceCatalogCodes: updatedCatalogCodes,
			order804nCodes: updatedCatalogCodes,
		};
	});
}
