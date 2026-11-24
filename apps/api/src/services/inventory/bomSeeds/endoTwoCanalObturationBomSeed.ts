/**
 * @file endoTwoCanalObturationBomSeed.ts
 * Пломбирование корневых каналов двухканального зуба (2 канала) (Мандат 8b, Минздрав 804н).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const ENDO_TWO_CANAL_OBTURATING_BOM_SEED: DefaultBomProcedureSeed = {
	serviceCode: "A16.07.008.002",
	serviceTitle: "Пломбирование корневых каналов двухканального зуба (2 канала)",
	serviceCategory: "therapy",
	specialty: "therapist",
	basePriceRub: 7200,
	durationMinutes: 35,
	materials: [
		{
			name: "Эпоксидный полимерный силер для постоянной обтурации",
			category: "endo",
			unit: "г",
			quantityToDeduct: 0.2,
			defaultUnitCostRub: 4800,
			defaultStockQty: 20,
			criticalThreshold: 2,
		},
		{
			name: "Гуттаперчевые конусные штифты 0.04/0.06 калиброванные",
			category: "endo",
			unit: "шт.",
			quantityToDeduct: 2,
			defaultUnitCostRub: 60,
			defaultStockQty: 300,
			criticalThreshold: 30,
		},
		{
			name: "Штифты бумажные абсорбирующие стерильные (пины)",
			category: "endo",
			unit: "шт.",
			quantityToDeduct: 6,
			defaultUnitCostRub: 15,
			defaultStockQty: 400,
			criticalThreshold: 50,
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
	],
};
