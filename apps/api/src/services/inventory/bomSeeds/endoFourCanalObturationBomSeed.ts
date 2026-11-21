/**
 * @file endoFourCanalObturationBomSeed.ts
 * Пломбирование корневых каналов четырехканального зуба (4 канала) (Мандат 8b, Минздрав 804н).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const ENDO_FOUR_CANAL_OBTURATING_BOM_SEED: DefaultBomProcedureSeed = {
	serviceCode: "A16.07.008.004",
	serviceTitle: "Пломбирование корневых каналов четырехканального зуба (4 канала)",
	serviceCategory: "therapy",
	specialty: "therapist",
	basePriceRub: 11500,
	durationMinutes: 55,
	materials: [
		{
			name: "Эпоксидный силер для постоянной обтурации AH Plus (Dentsply)",
			category: "endo",
			unit: "г",
			quantityToDeduct: 0.4,
			defaultUnitCostRub: 4800,
			defaultStockQty: 20,
			criticalThreshold: 2,
		},
		{
			name: "Гуттаперчевые конусные штифты 0.04/0.06 калиброванные",
			category: "endo",
			unit: "шт.",
			quantityToDeduct: 4,
			defaultUnitCostRub: 60,
			defaultStockQty: 300,
			criticalThreshold: 30,
		},
		{
			name: "Штифты бумажные абсорбирующие стерильные (пины)",
			category: "endo",
			unit: "шт.",
			quantityToDeduct: 12,
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
