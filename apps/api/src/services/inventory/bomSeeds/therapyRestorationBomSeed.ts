/**
 * @file therapyRestorationBomSeed.ts
 * Техкарта расходных материалов для пломбирования зуба светоотверждаемым нанокомпозитом (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const THERAPY_RESTORATION_BOM_SEED: DefaultBomProcedureSeed = {
	serviceCode: "A16.07.002.001",
	serviceTitle: "Восстановление зуба пломбой (нанокомпозит светоотверждаемый)",
	serviceCategory: "therapy",
	specialty: "therapist",
	basePriceRub: 4500,
	durationMinutes: 45,
	materials: [
		{
			name: "Композит светоотверждаемый наногибридный Filtek Z250 / Estelite",
			category: "composite",
			unit: "г",
			quantityToDeduct: 0.35,
			defaultUnitCostRub: 1300,
			defaultStockQty: 50,
			criticalThreshold: 5,
		},
		{
			name: "Адгезив самопротравливающий 7 пок. Single Bond Universal",
			category: "composite",
			unit: "мл",
			quantityToDeduct: 0.1,
			defaultUnitCostRub: 1800,
			defaultStockQty: 20,
			criticalThreshold: 2,
		},
		{
			name: "Гель травильный 37% ортофосфорная кислота",
			category: "composite",
			unit: "мл",
			quantityToDeduct: 0.2,
			defaultUnitCostRub: 175,
			defaultStockQty: 30,
			criticalThreshold: 3,
		},
		{
			name: "Платок коффердама латексный Sanctuary Dental Dam",
			category: "ppe",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 115,
			defaultStockQty: 100,
			criticalThreshold: 10,
		},
		{
			name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 220,
			defaultStockQty: 150,
			criticalThreshold: 20,
		},
		{
			name: "Игла карпульная 30G евростандарт 25 мм",
			category: "anesthesia",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 28,
			defaultStockQty: 200,
			criticalThreshold: 30,
		},
		{
			name: "Перчатки нитриловые неопудренные (пара)",
			category: "ppe",
			unit: "пары",
			quantityToDeduct: 2,
			defaultUnitCostRub: 35,
			defaultStockQty: 500,
			criticalThreshold: 50,
		},
		{
			name: "Слюноотсос одноразовый с гибким наконечником",
			category: "ppe",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 12.5,
			defaultStockQty: 300,
			criticalThreshold: 30,
		},
	],
};
