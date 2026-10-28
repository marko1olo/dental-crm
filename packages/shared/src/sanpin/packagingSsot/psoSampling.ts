/**
 * packages/shared/src/sanpin/packagingSsot/psoSampling.ts
 * Нормативы выборочного контроля качества предстерилизационной очистки (азопирам, фенолфталеин).
 * Мандат 8b: строго <= 120 строк.
 */

export const SANPIN_PSO_CONSTANTS = {
	statutorySamplingPercent: 1.0,
	minimumSampleFloorGeneral: 3,
	minimumSampleFloorSurgical: 5,
	azopyramReactionMaxSeconds: 60,
	phenolphthaleinReactionMaxSeconds: 30,
	workingSolutionLifespanMinutes: 120,
	sanpinClauseRu: "СанПиН 3.3686-21 п. 3584",
} as const;

export interface PsoSamplingRequirement {
	readonly minSampleRequired: number;
	readonly batchCount: number;
	readonly calculatedPercentCount: number;
	readonly floorPerItem: number;
	readonly itemsTypesCount: number;
	readonly isSurgicalOrCritical: boolean;
	readonly formulaExplanationRu: string;
}

export function calculatePsoSamplingRequirement(
	batchCount: number,
	isSurgicalOrCritical = false,
	itemsTypesCount = 1,
): PsoSamplingRequirement {
	const count = Math.max(1, Math.floor(Number(batchCount) || 1));
	const typesCount = Math.max(1, Math.floor(Number(itemsTypesCount) || 1));
	const floorPerItem = isSurgicalOrCritical
		? SANPIN_PSO_CONSTANTS.minimumSampleFloorSurgical
		: SANPIN_PSO_CONSTANTS.minimumSampleFloorGeneral;
	const calculatedPercentCount = Math.ceil((count * SANPIN_PSO_CONSTANTS.statutorySamplingPercent) / 100);
	const minSampleRequired = Math.max(floorPerItem * typesCount, calculatedPercentCount);
	const formulaExplanationRu = `Контроль предстерилизационной очистки: 1% от ${count} шт. (${calculatedPercentCount} шт.), не менее ${floorPerItem} шт. на каждое из ${typesCount} наим. = ${minSampleRequired} шт.`;

	return {
		minSampleRequired,
		batchCount: count,
		calculatedPercentCount,
		floorPerItem,
		itemsTypesCount: typesCount,
		isSurgicalOrCritical,
		formulaExplanationRu,
	};
}
