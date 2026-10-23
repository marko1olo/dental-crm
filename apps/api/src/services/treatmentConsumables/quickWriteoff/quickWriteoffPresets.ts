/**
 * quickWriteoffPresets.ts — Layer 1: Kit definitions for nurse quick write-offs.
 */

import type { UnifiedStockItemDefinition } from "../unifiedStockDeductionTypes.js";

export function getStandardKitDefinitions(): UnifiedStockItemDefinition[] {
	return [
		{ patterns: ["перчатк", "gloves"], defaultName: "Перчатки нитриловые неопудренные (пара)", category: "ppe", unit: "пары", qty: 2, defaultCost: "35" },
		{ patterns: ["маск", "mask"], defaultName: "Маска медицинская защитная трехслойная", category: "ppe", unit: "шт.", qty: 2, defaultCost: "15" },
		{ patterns: ["слюноотсос", "saliva"], defaultName: "Слюноотсос одноразовый с гибким наконечником", category: "ppe", unit: "шт.", qty: 1, defaultCost: "12.5" },
		{ patterns: ["нагрудник", "салфетка нагрудная", "bib"], defaultName: "Нагрудник стоматологический (салфетка двухслойная)", category: "ppe", unit: "шт.", qty: 1, defaultCost: "18" },
		{ patterns: ["валик", "ватные валики", "cotton"], defaultName: "Валики ватные стоматологические стерильные", category: "ppe", unit: "шт.", qty: 6, defaultCost: "3.5" },
	];
}

export function getSterilizationKitDefinitions(count = 1): UnifiedStockItemDefinition[] {
	const mult = Math.max(1, Math.min(100, count));
	return [
		{ patterns: ["крафт-пакет", "крафт пакет", "pouch", "kraft"], defaultName: "Крафт-пакеты самоклеящиеся 100х200 мм", category: "consumable", unit: "шт.", qty: 1 * mult, defaultCost: "12" },
		{ patterns: ["индикатор 5", "индикатор стерилизации", "интест"], defaultName: "Индикаторы стерилизации 5 класс (Винар МедИС / ИнТест)", category: "consumable", unit: "шт.", qty: 1 * mult, defaultCost: "8" },
		{ patterns: ["перчатк", "gloves"], defaultName: "Перчатки нитриловые смотровые (пара)", category: "ppe", unit: "пары", qty: 2 * mult, defaultCost: "35" },
		{ patterns: ["салфетка дезинфицирующая", "дез салфетк"], defaultName: "Салфетки дезинфицирующие спиртовые для поверхностей", category: "consumable", unit: "шт.", qty: 1 * mult, defaultCost: "6" },
	];
}

export function getCarpulesDefinitions(params: {
	count: number;
	needleQty: number;
	drugName?: string | undefined;
	needleName?: string | undefined;
}): UnifiedStockItemDefinition[] {
	const items: UnifiedStockItemDefinition[] = [
		{
			patterns: params.drugName ? [params.drugName] : ["артикаин", "анестетик", "убистезин", "септонест", "скандонест", "ультракаин", "карпул"],
			defaultName: params.drugName || "Анестетик артикаиновый 4% (карпула 1.7 мл)",
			category: "anesthesia",
			unit: "карп.",
			qty: params.count,
			defaultCost: "220",
			label: "карпул анестетика",
		},
	];
	if (params.needleQty > 0) {
		items.push({
			patterns: params.needleName ? [params.needleName] : ["игл", "needle", "g30", "g27"],
			defaultName: params.needleName || "Иглы карпульные стоматологические стерильные (0.3x21 мм G30 / 0.4x35 мм G27)",
			category: "consumables",
			unit: "шт.",
			qty: params.needleQty,
			defaultCost: "25",
			label: "карпульных игл",
		});
	}
	return items;
}
