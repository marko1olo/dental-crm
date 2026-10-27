/**
 * @file surgeryRetainedToothBomSeed.ts
 * Техкарта расходных материалов для удаления ретинированного зуба (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const SURGERY_RETAINED_TOOTH_BOM_SEED: DefaultBomProcedureSeed = {
	serviceCode: "A16.07.001.002",
	serviceTitle: "Удаление ретинированного / дистопированного зуба с лоскутом",
	serviceCategory: "surgery",
	specialty: "surgeon",
	basePriceRub: 9500,
	durationMinutes: 50,
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
			name: "Шовный материал Викрил 4-0 с атравматической иглой",
			category: "surgery",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 250,
			defaultStockQty: 50,
			criticalThreshold: 10,
		},
		{
			name: "Гемостатическая губка Спонгостан (Spongostan Dental)",
			category: "surgery",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 160,
			defaultStockQty: 40,
			criticalThreshold: 10,
		},
		{
			name: "Бор хирургический твердосплавный Lindemann",
			category: "surgery",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 420,
			defaultStockQty: 30,
			criticalThreshold: 5,
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
	],
};
