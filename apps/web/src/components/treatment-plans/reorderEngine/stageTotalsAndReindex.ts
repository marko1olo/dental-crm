import type { TreatmentPlanStage } from "../types.js";
import { calculateStageTotals } from "../treatmentPlanPricingEngine.js";

/**
 * Пересчет сумм этапа в копейках и рублях на основе его процедур.
 */
export function recalculateStageTotals(stage: TreatmentPlanStage): TreatmentPlanStage {
	const { totalKopecks, totalRub } = calculateStageTotals(stage.items);

	const codes = Array.from(
		new Set(
			stage.items
				.map((it) => it.code804n)
				.filter((code): code is string => typeof code === "string" && code.length > 0),
		),
	);

	return {
		...stage,
		totalRub,
		totalKopecks,
		serviceCatalogCodes: codes,
		order804nCodes: codes,
	};
}

/**
 * Перенумерация этапов (1..N) с обновлением названий и фаз процедур.
 */
export function reindexStages(stages: readonly TreatmentPlanStage[]): TreatmentPlanStage[] {
	return stages.map((st, idx) => {
		const newNumber = idx + 1;
		const updatedItems = st.items.map((item) => ({
			...item,
			phase: newNumber,
		}));

		return recalculateStageTotals({
			...st,
			stageNumber: newNumber,
			items: updatedItems,
		});
	});
}

/**
 * Изменение порядка этапов плана лечения.
 */
export function reorderTreatmentPlanStages(
	stages: readonly TreatmentPlanStage[],
	sourceIndex: number,
	targetIndex: number,
): TreatmentPlanStage[] {
	if (
		sourceIndex < 0 ||
		sourceIndex >= stages.length ||
		targetIndex < 0 ||
		targetIndex >= stages.length ||
		sourceIndex === targetIndex
	) {
		return [...stages];
	}

	const next = [...stages];
	const [moved] = next.splice(sourceIndex, 1);
	if (!moved) return [...stages];
	next.splice(targetIndex, 0, moved);

	return reindexStages(next);
}
