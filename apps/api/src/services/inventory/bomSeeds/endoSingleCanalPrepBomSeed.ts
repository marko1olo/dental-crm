/**
 * @file endoSingleCanalPrepBomSeed.ts
 * Механическая и медикаментозная обработка 1-канального зуба (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const ENDO_SINGLE_CANAL_PREP_BOM_SEED: DefaultBomProcedureSeed = {
	serviceCode: "A16.07.030.001",
	serviceTitle: "Инструментальная и медикаментозная обработка корневого канала (1-канальный зуб)",
	serviceCategory: "therapy",
	specialty: "therapist",
	basePriceRub: 3500,
	durationMinutes: 40,
	materials: [
		{
			name: "Раствор натрия гипохлорита 3% для ирригации",
			category: "endo",
			unit: "мл",
			quantityToDeduct: 15,
			defaultUnitCostRub: 8,
			defaultStockQty: 1000,
			criticalThreshold: 100,
		},
		{
			name: "Гель ЭДТА 17% для химического расширения каналов",
			category: "endo",
			unit: "мл",
			quantityToDeduct: 0.5,
			defaultUnitCostRub: 240,
			defaultStockQty: 50,
			criticalThreshold: 5,
		},
		{
			name: "Эндолубрикант водорастворимый RC-Prep",
			category: "endo",
			unit: "мл",
			quantityToDeduct: 0.5,
			defaultUnitCostRub: 190,
			defaultStockQty: 40,
			criticalThreshold: 5,
		},
		{
			name: "Машинный Ni-Ti ротационный файл ProTaper / WaveOne",
			category: "endo",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 850,
			defaultStockQty: 60,
			criticalThreshold: 10,
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
			name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 220,
			defaultStockQty: 150,
			criticalThreshold: 20,
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
