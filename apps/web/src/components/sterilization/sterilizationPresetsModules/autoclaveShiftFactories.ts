/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/autoclaveShiftFactories.ts
 *
 * Фабрики быстрых циклов автоклавирования на смену.
 * Мандат 8b: строго <= 120 строк.
 */

import { SANPIN_AUTOCLAVE_CLASS_B_PRESET } from "./autoclavePresetsDefinitions.js";
import type { AutoclaveCycleRecord } from "./types.js";

const DEFAULT_OPERATOR = "Смирнова А.В. (медсестра ЦСО)";

export function createQuickDailyShiftAutoclaveCycles(
	operatorName = DEFAULT_OPERATOR,
): readonly AutoclaveCycleRecord[] {
	const now = Date.now();
	return [
		{
			id: `cycle-shift-1-${now}`,
			cycleNumber: 1,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			loadDescription:
				"Утренний тест Бови-Дика + смотровые лотки терапевта (4 шт)",
			operatorName,
			timestamp: new Date(now - 6 * 3600 * 1000).toISOString(),
		},
		{
			id: `cycle-shift-2-${now}`,
			cycleNumber: 2,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			loadDescription:
				"Эндодонтические наборы, турбинные и угловые наконечники (6 шт)",
			operatorName,
			timestamp: new Date(now - 3 * 3600 * 1000).toISOString(),
		},
		{
			id: `cycle-shift-3-${now}`,
			cycleNumber: 3,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			loadDescription: "Хирургические экстракционные наборы, кюреты (4 шт)",
			operatorName,
			timestamp: new Date().toISOString(),
		},
	];
}
