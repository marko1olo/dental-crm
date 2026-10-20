/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/psoPresetsFactories.ts
 *
 * Фабрики быстрых записей проб ПСО.
 * Мандат 8b: строго <= 120 строк.
 */

import {
	SANPIN_AZOPYRAM_TEST_PRESET,
	SANPIN_PHENOLPHTHALEIN_TEST_PRESET,
} from "./psoPresetsDefinitions.js";
import type { PsoQualityRecord } from "./types.js";

const DEFAULT_OPERATOR = "Смирнова А.В. (медсестра ЦСО)";

export function createQuickAzopyramRecord(
	operatorName = DEFAULT_OPERATOR,
): PsoQualityRecord {
	return {
		id: `pso-azo-${Date.now()}`,
		...SANPIN_AZOPYRAM_TEST_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickPhenolphthaleinRecord(
	operatorName = DEFAULT_OPERATOR,
): PsoQualityRecord {
	return {
		id: `pso-ph-${Date.now()}`,
		...SANPIN_PHENOLPHTHALEIN_TEST_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickCombinedPsoRecord(
	operatorName = DEFAULT_OPERATOR,
	instrumentName = "Терапевтический и хирургический инструментарий смены",
): PsoQualityRecord {
	return {
		id: `pso-both-${Date.now()}`,
		testType: "both",
		instrumentName,
		batchItemCount: 150,
		testedSampleCount: 5,
		azopyramResult: "negative",
		phenolphthaleinResult: "negative",
		detergentBrand: "Оптимакс Про 1.5%",
		isApproved: true,
		operatorName,
		timestamp: new Date().toISOString(),
		sanpinClause: "Контроль качества ПСО",
		notes:
			"1-кликовая фиксация проб ПСО: азопирам (кровь) — отрицательно, фенолфталеин (щелочь) — отрицательно. Партия допущена к стерилизации.",
	};
}

export function createQuickDailyShiftPsoRecords(
	operatorName = DEFAULT_OPERATOR,
): readonly PsoQualityRecord[] {
	const now = Date.now();
	return [
		{
			id: `pso-shift-1-${now}`,
			testType: "both",
			instrumentName:
				"Терапевтические смотровые лотки (зеркала, зонды, пинцеты)",
			batchItemCount: 120,
			testedSampleCount: 5,
			azopyramResult: "negative",
			phenolphthaleinResult: "negative",
			detergentBrand: "Оптимакс Про 1.5%",
			isApproved: true,
			operatorName,
			timestamp: new Date(now - 5 * 3600 * 1000).toISOString(),
			sanpinClause: "Контроль качества ПСО",
			notes:
				"Азопирамовая и фенолфталеиновая пробы отрицательны. Скрытая кровь и остатки СМС отсутствуют.",
		},
		{
			id: `pso-shift-2-${now}`,
			testType: "both",
			instrumentName: "Хирургический инструментарий (щипцы, элеваторы, кюреты)",
			batchItemCount: 45,
			testedSampleCount: 3,
			azopyramResult: "negative",
			phenolphthaleinResult: "negative",
			detergentBrand: "Оптимакс Про 1.5%",
			isApproved: true,
			operatorName,
			timestamp: new Date(now - 2 * 3600 * 1000).toISOString(),
			sanpinClause: "Контроль качества ПСО",
			notes: "Замковые щечки и рабочие поверхности чистые. Пробы отрицательны.",
		},
	];
}
