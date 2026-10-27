/**
 * @file therapyHygieneBomSeed.ts
 * Техкарта расходных материалов для профессиональной гигиены Air-Flow + УЗ (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const THERAPY_HYGIENE_BOM_SEED: DefaultBomProcedureSeed = {
	serviceCode: "A16.07.051",
	serviceTitle: "Профессиональная гигиена полости рта и зубов (Air-Flow + УЗ)",
	serviceCategory: "hygiene",
	specialty: "hygienist",
	basePriceRub: 5500,
	durationMinutes: 50,
	materials: [
		{
			name: "Порошок Air-Flow глициновый мелкодисперсный EMS Plus",
			category: "hygiene",
			unit: "г",
			quantityToDeduct: 25,
			defaultUnitCostRub: 18,
			defaultStockQty: 500,
			criticalThreshold: 50,
		},
		{
			name: "Полировочная паста Cleanic / Detartrine",
			category: "hygiene",
			unit: "г",
			quantityToDeduct: 3,
			defaultUnitCostRub: 40,
			defaultStockQty: 100,
			criticalThreshold: 10,
		},
		{
			name: "Щетка полировочная циркулярная нейлоновая",
			category: "hygiene",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 65,
			defaultStockQty: 100,
			criticalThreshold: 10,
		},
		{
			name: "Ретрактор мягкий OptraGate (Ivoclar)",
			category: "hygiene",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 210,
			defaultStockQty: 80,
			criticalThreshold: 10,
		},
		{
			name: "Фторлак защитный Clinpro White Varnish",
			category: "hygiene",
			unit: "мл",
			quantityToDeduct: 0.5,
			defaultUnitCostRub: 640,
			defaultStockQty: 30,
			criticalThreshold: 5,
		},
		{
			name: "Слюноотсос одноразовый с гибким наконечником",
			category: "ppe",
			unit: "шт.",
			quantityToDeduct: 1,
			defaultUnitCostRub: 12.5,
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
