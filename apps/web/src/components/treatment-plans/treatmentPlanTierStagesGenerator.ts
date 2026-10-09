/**
 * treatmentPlanTierStagesGenerator.ts — канонический фасад генератора этапов по тарифам («Эконом», «Стандарт», «Оптимальный»).
 * Декомпозирован в поддиректорию ./tierStages/ согласно архитектурному стандарту DAG.
 */

export type * from "./tierStages";
export {
	getDefaultClinicalPresetStages,
	normalizeToothState,
	hasToothDefect,
	generateTierPlanStages,
} from "./tierStages";
