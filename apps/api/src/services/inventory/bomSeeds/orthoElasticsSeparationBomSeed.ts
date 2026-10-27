/**
 * @file orthoElasticsSeparationBomSeed.ts
 * Техкарты расходных материалов для ортодонтических эластиков и сепарации (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const ORTHO_ELASTICS_SEPARATION_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	{
		serviceCode: "A16.07.049",
		serviceTitle: "Наложение эластической межчелюстной тяги (эластики)",
		serviceCategory: "orthodontics",
		specialty: "orthodontist",
		basePriceRub: 1200,
		durationMinutes: 15,
		materials: [
			{
				name: "Межчелюстные эластики (Лиса, Заяц, Медведь, Буйвол, Кенгуру - Ormco Zoo)",
				category: "other",
				unit: "упак.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 450,
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
	{
		serviceCode: "A16.07.050",
		serviceTitle: "Сепарация межзубная ортодонтическая / установка сепарационных колец",
		serviceCategory: "orthodontics",
		specialty: "orthodontist",
		basePriceRub: 1500,
		durationMinutes: 20,
		materials: [
			{
				name: "Кольца сепарационные межзубные эластические",
				category: "other",
				unit: "шт.",
				quantityToDeduct: 4,
				defaultUnitCostRub: 25,
				defaultStockQty: 200,
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
	},
];
