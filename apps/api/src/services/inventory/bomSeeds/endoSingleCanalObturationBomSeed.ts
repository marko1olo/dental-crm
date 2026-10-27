/**
 * @file endoSingleCanalObturationBomSeed.ts
 * Пломбирование корневого канала зуба гуттаперчей (1 канал) (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const ENDO_SINGLE_CANAL_OBTURATING_BOM_SEED: DefaultBomProcedureSeed = {
	serviceCode: "A16.07.008.001",
	serviceTitle: "Пломбирование корневого канала зуба гуттаперчей (1 канал)",
	serviceCategory: "therapy",
	specialty: "therapist",
	basePriceRub: 4000,
	durationMinutes: 30,
	materials: [
		{
			name: "Эпоксидный силер для постоянной обтурации AH Plus (Dentsply)",
			category: "endo",
			unit: "г",
			quantityToDeduct: 0.1,
			defaultUnitCostRub: 4800,
			defaultStockQty: 20,
			criticalThreshold: 2,
		},
		{
			name: "Гуттаперчевые конусные штифты 0.04/0.06 калиброванные",
			category: "endo",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 60,
			defaultStockQty: 300,
			criticalThreshold: 30,
		},
		{
			name: "Штифты бумажные абсорбирующие стерильные (пины)",
			category: "endo",
			unit: "шт.",
			quantityToDeduct: 3,
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
