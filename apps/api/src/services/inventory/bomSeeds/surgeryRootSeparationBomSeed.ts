/**
 * @file surgeryRootSeparationBomSeed.ts
 * Техкарта расходных материалов для сложного удаления с разъединением корней (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const SURGERY_ROOT_SEPARATION_BOM_SEED: DefaultBomProcedureSeed = {
	serviceCode: "A16.07.001.001",
	serviceTitle: "Удаление зуба сложное с разъединением корней",
	serviceCategory: "surgery",
	specialty: "surgeon",
	basePriceRub: 6000,
	durationMinutes: 40,
	materials: [
		{
			name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			quantityToDeduct: 2,
			defaultUnitCostRub: 220,
			defaultStockQty: 150,
			criticalThreshold: 20,
		},
		{
			name: "Игла карпульная 30G евростандарт 25 мм",
			category: "anesthesia",
			unit: "шт.",
			quantityToDeduct: 2,
			defaultUnitCostRub: 28,
			defaultStockQty: 200,
			criticalThreshold: 30,
		},
		{
			name: "Шовный материал Викрил 4-0 с атравматической иглой",
			category: "surgery",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 250,
			defaultStockQty: 50,
			criticalThreshold: 10,
		},
		{
			name: "Гемостатическая коллагеновая губка Альвостаз / Parasorb Cone",
			category: "surgery",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 310,
			defaultStockQty: 50,
			criticalThreshold: 10,
		},
		{
			name: "Микрохирургическое лезвие №15C Swann-Morton стерильное",
			category: "surgery",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 85,
			defaultStockQty: 100,
			criticalThreshold: 15,
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
