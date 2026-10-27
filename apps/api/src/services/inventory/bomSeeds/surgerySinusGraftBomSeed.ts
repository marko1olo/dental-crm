/**
 * @file surgerySinusGraftBomSeed.ts
 * Техкарты расходных материалов для синус-лифтинга и костной пластики (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const SURGERY_SINUS_GRAFT_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	{
		serviceCode: "A16.07.041.001",
		serviceTitle: "Синус-лифтинг закрытый / открытый (трансальвеолярный)",
		serviceCategory: "surgery",
		specialty: "surgeon",
		basePriceRub: 18000,
		durationMinutes: 45,
		materials: [
			{
				name: "Остеопластический костный материал Geistlich Bio-Oss 0.5 г",
				category: "surgery",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 12500,
				defaultStockQty: 20,
				criticalThreshold: 4,
			},
			{
				name: "Шовный материал полигликолид ПГА 4-0 с иглой",
				category: "surgery",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 220,
				defaultStockQty: 40,
				criticalThreshold: 8,
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
		],
	},
	{
		serviceCode: "A16.07.041",
		serviceTitle: "Костная пластика альвеолярного отростка (латеральный синус-лифтинг & НКР)",
		serviceCategory: "surgery",
		specialty: "surgeon",
		basePriceRub: 35000,
		durationMinutes: 60,
		materials: [
			{
				name: "Остеопластический костный материал Geistlich Bio-Oss 0.5 г",
				category: "surgery",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 12500,
				defaultStockQty: 20,
				criticalThreshold: 4,
			},
			{
				name: "Мембрана коллагеновая резорбируемая Geistlich Bio-Gide 25x25 мм",
				category: "surgery",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 14500,
				defaultStockQty: 15,
				criticalThreshold: 3,
			},
			{
				name: "Пины титановые для фиксации мембран (комплект 2 шт)",
				category: "surgery",
				unit: "компл.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 1200,
				defaultStockQty: 20,
				criticalThreshold: 5,
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
				name: "Анестетик артикаиновый 4% с эпинефрином 1:100000 1.7 мл",
				category: "anesthesia",
				unit: "карп.",
				quantityToDeduct: 2,
				defaultUnitCostRub: 220,
				defaultStockQty: 150,
				criticalThreshold: 20,
			},
		],
	},
];
