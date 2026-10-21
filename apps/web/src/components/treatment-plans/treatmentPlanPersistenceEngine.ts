/**
 * treatmentPlanPersistenceEngine.ts — движок гидратации и персистенции планов лечения DENTE CRM (Facade).
 */

import type { TreatmentPlanStage } from "./types.js";
import type { CatalogServiceLookupItem } from "./treatmentPlanPricingEngine.js";
import { hydrateRawPlanItem } from "./persistence/rawItemHydrator.js";
import { assembleStageFromItems } from "./persistence/stageAssembler.js";

export * from "./persistence/stageKindClassifier.js";
export * from "./persistence/rawItemHydrator.js";
export * from "./persistence/phaseMetadataResolver.js";
export * from "./persistence/stageAssembler.js";

/**
 * Восстановление структурированных этапов плана лечения из плоских записей БД (treatment_plan_items).
 */
export function buildStagesFromPlanItems(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	rawItems: readonly any[],
	catalog?: readonly CatalogServiceLookupItem[],
): TreatmentPlanStage[] {
	if (!Array.isArray(rawItems) || rawItems.length === 0) {
		return [];
	}

	// Группируем элементы по номеру фазы/этапа (phase: 1, 2, 3, 4, 5...)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const phaseGroups = new Map<number, any[]>();
	for (const raw of rawItems) {
		const phase = Math.max(1, Number(raw.phase) || 1);
		const list = phaseGroups.get(phase) || [];
		list.push(raw);
		phaseGroups.set(phase, list);
	}

	const sortedPhases = Array.from(phaseGroups.keys()).sort((a, b) => a - b);
	const stages: TreatmentPlanStage[] = [];

	for (const phaseNumber of sortedPhases) {
		const phaseItemsRaw = phaseGroups.get(phaseNumber) || [];
		const mappedItems = phaseItemsRaw.map((raw, idx) =>
			hydrateRawPlanItem(raw, idx, phaseNumber, catalog),
		);
		stages.push(assembleStageFromItems(phaseNumber, mappedItems));
	}

	return stages;
}
