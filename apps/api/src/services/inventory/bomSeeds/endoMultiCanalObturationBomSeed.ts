/**
 * @file endoMultiCanalObturationBomSeed.ts
 * Пломбирование корневых каналов трехканального зуба (3 канала) (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const ENDO_MULTI_CANAL_OBTURATING_BOM_SEED: DefaultBomProcedureSeed = {
	serviceCode: "A16.07.008.003",
	serviceTitle: "Пломбирование корневых каналов трехканального зуба (3 канала)",
	serviceCategory: "therapy",
	specialty: "therapist",
	basePriceRub: 9500,
	durationMinutes: 45,
	materials: [
		{
			name: "Эпоксидный силер для постоянной обтурации AH Plus (Dentsply)",
			category: "endo",
			unit: "г",
			quantityToDeduct: 0.3,
			defaultUnitCostRub: 4800,
			defaultStockQty: 20,
			criticalThreshold: 2,
		},
		{
			name: "Гуттаперчевые конусные штифты 0.04/0.06 калиброванные",
			category: "endo",
			unit: "шт.",
			quantityToDeduct: 3,
			defaultUnitCostRub: 60,
			defaultStockQty: 300,
			criticalThreshold: 30,
		},
		{
			name: "Штифты бумажные абсорбирующие стерильные (пины)",
			category: "endo",
			unit: "шт.",
			quantityToDeduct: 9,
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
