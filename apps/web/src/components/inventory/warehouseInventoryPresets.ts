/**
 * Пресеты инвентаризационных описей и комиссий (Мандаты 8e, 8n).
 * Модуль декомпозирован на сателлиты строго <= 120 строк по Мандату 8b.
 */

export * from "./audit/warehouseCommissionPresets.js";
export * from "./audit/warehouseInventoryItemsPreset.js";

export interface WarehousePresetItem {
	readonly name: string;
	readonly category: string;
	readonly unit: string;
	readonly qty: number;
	readonly costRub: string;
}

export interface WarehousePreset {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly items: readonly WarehousePresetItem[];
}

export const CANONICAL_WAREHOUSE_PRESETS: readonly WarehousePreset[] = [
	{
		id: "anesthesia-17",
		name: "Стандартная анестезия 1.7 мл",
		description: "10 карпул Артикаина 1.7 мл + 10 стерильных карпульных игл 30G",
		items: [
			{ name: "Артикаин 1:100 000 карпула 1.7 мл", category: "Анестезия", unit: "карп.", qty: 10, costRub: "95.00" },
			{ name: "Игла карпульная стоматологическая 30G 0.3x21мм", category: "Анестезия", unit: "шт.", qty: 10, costRub: "12.50" },
			{ name: "Салфетка спиртовая инъекционная", category: "СИЗ", unit: "шт.", qty: 10, costRub: "4.00" },
		],
	},
	{
		id: "filling-standard",
		name: "Пломбирование зуба",
		description: "Базовый расходный комплект: СИЗ + Крафт-пакет + Композит + Адгезив + Микробраши",
		items: [
			{ name: "Перчатки нитриловые неопудренные", category: "СИЗ", unit: "пар", qty: 1, costRub: "35.00" },
			{ name: "Маска трехслойная защитная", category: "СИЗ", unit: "шт.", qty: 1, costRub: "8.00" },
			{ name: "Слюноотсос одноразовый", category: "СИЗ", unit: "шт.", qty: 1, costRub: "6.00" },
			{ name: "Крафт-пакет самоклеящийся 100х200", category: "Стерилизация", unit: "шт.", qty: 1, costRub: "14.00" },
			{ name: "Композит светоотверждаемый Estelite Sigma Quick", category: "Терапия", unit: "г", qty: 0.3, costRub: "320.00" },
			{ name: "Адгезивная система Single Bond Universal", category: "Терапия", unit: "кап.", qty: 1, costRub: "110.00" },
			{ name: "Микроаппликаторы регулярные", category: "Терапия", unit: "шт.", qty: 2, costRub: "5.50" },
		],
	},
	{
		id: "hygiene-prof",
		name: "Профгигиена",
		description: "Порошок Air-Flow + Полировочная паста + Циркулярные щетки + Роторасширитель Оптрагейт",
		items: [
			{ name: "Перчатки нитриловые неопудренные", category: "СИЗ", unit: "пар", qty: 1, costRub: "35.00" },
			{ name: "Маска защитная с экраном", category: "СИЗ", unit: "шт.", qty: 1, costRub: "22.00" },
			{ name: "Порошок для Air-Flow на основе глицина", category: "Гигиена", unit: "г", qty: 25, costRub: "18.00" },
			{ name: "Паста полировочная Cleanic с фтором", category: "Гигиена", unit: "г", qty: 2, costRub: "45.00" },
			{ name: "Щетка полировочная циркулярная", category: "Гигиена", unit: "шт.", qty: 1, costRub: "35.00" },
			{ name: "Роторасширитель OptraGate Regular", category: "Гигиена", unit: "шт.", qty: 1, costRub: "195.00" },
		],
	},
] as const;
