/**
 * @file orthoArchwireBomSeed.ts
 * Техкарты расходных материалов для смены и активации ортодонтических дуг (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const ORTHO_ARCHWIRE_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	{
		serviceCode: "A16.07.048.003",
		serviceTitle: "Активация дуги / ортодонтического аппарата (смена лигатур, чейн)",
		serviceCategory: "orthodontics",
		specialty: "orthodontist",
		basePriceRub: 3500,
		durationMinutes: 30,
		materials: [
			{
				name: "Эластическая цепочка Power Chain (Ormco)",
				category: "ortho_archwire",
				unit: "см",
				quantityToDeduct: 5,
				defaultUnitCostRub: 80,
				defaultStockQty: 200,
				criticalThreshold: 30,
			},
			{
				name: "Эластические лигатуры цветные/прозрачные (Ormco)",
				category: "other",
				unit: "шт.",
				quantityToDeduct: 10,
				defaultUnitCostRub: 15,
				defaultStockQty: 500,
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
	},
	{
		serviceCode: "A16.07.046",
		serviceTitle: "Смена ортодонтической дуги (1 челюсть: NiTi / CuNiTi / SS / TMA)",
		serviceCategory: "orthodontics",
		specialty: "orthodontist",
		basePriceRub: 4000,
		durationMinutes: 30,
		materials: [
			{
				name: "Дуга ортодонтическая CuNiTi / NiTi / TMA / SS (Ormco/3M)",
				category: "ortho_archwire",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 1200,
				defaultStockQty: 50,
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
];
