/**
 * @file surgerySimpleExtractionBomSeed.ts
 * Техкарта расходных материалов для простого удаления зуба (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const SURGERY_SIMPLE_EXTRACTION_BOM_SEED: DefaultBomProcedureSeed = {
	serviceCode: "A16.07.001",
	serviceTitle: "Удаление постоянного зуба (простое)",
	serviceCategory: "surgery",
	specialty: "surgeon",
	basePriceRub: 3500,
	durationMinutes: 25,
	materials: [
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
			name: "Антисептический компресс Альвожил (паста/губка)",
			category: "surgery",
			unit: "доза",
			quantityToDeduct: 1,
			defaultUnitCostRub: 280,
			defaultStockQty: 50,
			criticalThreshold: 10,
		},
		{
			name: "Гемостатическая коллагеновая губка Альвостаз",
			category: "surgery",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 110,
			defaultStockQty: 60,
			criticalThreshold: 10,
		},
		{
			name: "Марлевые тампоны стерильные для лунки",
			category: "ppe",
			unit: "шт.",
			quantityToDeduct: 2,
			defaultUnitCostRub: 15,
			defaultStockQty: 300,
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
	],
};
