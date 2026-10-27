/**
 * @file prostheticsBomSeeds.ts
 * Техкарты расходных материалов для ортопедии и снятия слепков (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const PROSTHETICS_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	{
		serviceCode: "A16.07.004",
		serviceTitle: "Снятие оттиска с одной челюсти (А-силикон / альгинатная масса)",
		serviceCategory: "prosthetics",
		specialty: "orthopedist",
		basePriceRub: 2500,
		durationMinutes: 30,
		materials: [
			{
				name: "Базовая слепочная масса А-силикон Express XT / Elite HD+",
				category: "other",
				unit: "мл",
				quantityToDeduct: 50,
				defaultUnitCostRub: 18,
				defaultStockQty: 500,
				criticalThreshold: 50,
			},
			{
				name: "Корригирующая слепочная масса А-силикон (картридж)",
				category: "other",
				unit: "мл",
				quantityToDeduct: 10,
				defaultUnitCostRub: 45,
				defaultStockQty: 200,
				criticalThreshold: 20,
			},
			{
				name: "Ложка оттискная металлическая/перфорированная",
				category: "ppe",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 60,
				defaultStockQty: 100,
				criticalThreshold: 10,
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
		serviceCode: "A16.07.006",
		serviceTitle: "Фиксация несъемной ортопедической конструкции (коронки) на постоянный цемент",
		serviceCategory: "prosthetics",
		specialty: "orthopedist",
		basePriceRub: 3000,
		durationMinutes: 30,
		materials: [
			{
				name: "Цемент стеклоиономерный для фиксации Fuji Plus / RelyX U200",
				category: "composite",
				unit: "г",
				quantityToDeduct: 0.3,
				defaultUnitCostRub: 1200,
				defaultStockQty: 30,
				criticalThreshold: 5,
			},
			{
				name: "Нить ретракционная непропитанная Ultrapak #00",
				category: "other",
				unit: "см",
				quantityToDeduct: 10,
				defaultUnitCostRub: 12,
				defaultStockQty: 200,
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
	},
];
