/**
 * @file orthoFullArchBracketsBomSeed.ts
 * Техкарты расходных материалов для брекет-системы на всю челюсть (Мандат 8b).
 */

import type { DefaultBomProcedureSeed } from "./types.js";

export const ORTHO_FULL_ARCH_BRACKETS_BOM_SEEDS: readonly DefaultBomProcedureSeed[] = [
	{
		serviceCode: "A16.07.047",
		serviceTitle: "Ортодонтическая коррекция с применением брекет-систем (фиксация на 1 челюсть)",
		serviceCategory: "orthodontics",
		specialty: "orthodontist",
		basePriceRub: 45000,
		durationMinutes: 60,
		materials: [
			{
				name: "Брекет-система металлическая самолигирующая Damon Q2 (Ormco, набор 1 челюсть)",
				category: "ortho_bracket",
				unit: "компл.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 28000,
				defaultStockQty: 20,
				criticalThreshold: 3,
			},
			{
				name: "Ортодонтическая дуга Copper Ni-Ti .014 (Ormco)",
				category: "ortho_archwire",
				unit: "шт.",
				quantityToDeduct: 1,
				defaultUnitCostRub: 1200,
				defaultStockQty: 50,
				criticalThreshold: 10,
			},
			{
				name: "Адгезив светоотверждаемый для брекетов Transbond XT",
				category: "composite",
				unit: "шприц",
				quantityToDeduct: 0.1,
				defaultUnitCostRub: 3500,
				defaultStockQty: 10,
				criticalThreshold: 2,
			},
			{
				name: "Праймер ортодонтический Transbond XT Primer",
				category: "composite",
				unit: "мл",
				quantityToDeduct: 0.2,
				defaultUnitCostRub: 2500,
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
		serviceCode: "A16.07.048",
		serviceTitle: "Снятие брекет-системы с 1 челюсти и полировка эмали",
		serviceCategory: "orthodontics",
		specialty: "orthodontist",
		basePriceRub: 7500,
		durationMinutes: 45,
		materials: [
			{
				name: "Полировочная головка / диски для удаления адгезива Enhance",
				category: "other",
				unit: "шт.",
				quantityToDeduct: 2,
				defaultUnitCostRub: 180,
				defaultStockQty: 100,
				criticalThreshold: 15,
			},
			{
				name: "Паста полировочная с фтором без пемзы Cleanic",
				category: "hygiene",
				unit: "г",
				quantityToDeduct: 2,
				defaultUnitCostRub: 45,
				defaultStockQty: 150,
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
