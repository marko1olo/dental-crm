/**
 * @file surgeryImplantationBomSeed.ts
 * Техкарта расходных материалов для дентальной имплантации (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const SURGERY_IMPLANTATION_BOM_SEED: DefaultBomProcedureSeed = {
	serviceCode: "A16.07.054",
	serviceTitle: "Внутрикостная дентальная имплантация (установка имплантата)",
	serviceCategory: "surgery",
	specialty: "surgeon",
	basePriceRub: 35000,
	durationMinutes: 60,
	materials: [
		{
			name: "Стерильный операционный набор СИЗ хирурга и ассистента",
			category: "ppe",
			unit: "компл.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 950,
			defaultStockQty: 30,
			criticalThreshold: 5,
		},
		{
			name: "Шовный материал монофиламентный PTFE / Пролен 5-0",
			category: "surgery",
			unit: "шт.",
			quantityToDeduct: 2,
			defaultUnitCostRub: 360,
			defaultStockQty: 50,
			criticalThreshold: 10,
		},
		{
			name: "Физиологический раствор стерильный 0.9% 500 мл",
			category: "surgery",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 140,
			defaultStockQty: 60,
			criticalThreshold: 10,
		},
		{
			name: "Микрохирургическое лезвие №15C Swann-Morton стерильное",
			category: "surgery",
			unit: "шт.",
			quantityToDeduct: 2,
			defaultUnitCostRub: 85,
			defaultStockQty: 100,
			criticalThreshold: 15,
		},
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
			name: "Дентальный имплантат Osstem TS III SA Ø4.0 L10 (хирургический артикул)",
			category: "surgery",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 18500,
			defaultStockQty: 25,
			criticalThreshold: 5,
		},
	],
};
