/**
 * @file orthoSingleBracketBomSeed.ts
 * Техкарты расходных материалов для одиночных брекетов и замков (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const ORTHO_SINGLE_BRACKET_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	{
		serviceCode: "A16.07.048.001",
		serviceTitle: "Фиксация одного брекета (первичная или повторная при сколе)",
		serviceCategory: "orthodontics",
		specialty: "orthodontist",
		basePriceRub: 2500,
		durationMinutes: 20,
		materials: [
			{
				name: "Одиночный брекет Damon Q2 (замок)",
				category: "ortho_bracket",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 2800,
				defaultStockQty: 40,
				criticalThreshold: 5,
			},
			{
				name: "Адгезив светоотверждаемый для брекетов Transbond XT",
				category: "composite",
				unit: "шприц",
				quantityToDeduct: 0.05,
				defaultUnitCostRub: 3500,
				defaultStockQty: 10,
				criticalThreshold: 2,
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
	},
	{
		serviceCode: "A16.07.048.002",
		serviceTitle: "Снятие одного брекета / ортодонтического элемента",
		serviceCategory: "orthodontics",
		specialty: "orthodontist",
		basePriceRub: 800,
		durationMinutes: 15,
		materials: [
			{
				name: "Полировочная головка для удаления композита",
				category: "other",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 180,
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
	},
];
