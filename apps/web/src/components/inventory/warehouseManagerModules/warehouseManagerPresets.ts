import type { InventoryItem } from "../inventoryDataMappers.js";
import type { WarehousePreset } from "./types.js";

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

export const DEFAULT_WAREHOUSE_ITEMS: readonly InventoryItem[] = [
	{ id: "wh-art-01", name: "Артикаин 1:100 000 карпула 1.7 мл", stockQuantity: 140, criticalThreshold: 30, unitCostRub: "95.00", updatedAt: "2026-09-01", unit: "карп.", sku: "AN-ART-17", lotNumber: "410224", expirationDate: "2028-12-31" },
	{ id: "wh-scand-01", name: "Мепивакаин (Скандонест 3%) карпула 1.7 мл", stockQuantity: 0, criticalThreshold: 15, unitCostRub: "115.00", updatedAt: "2026-09-01", unit: "карп.", sku: "AN-MEP-17", lotNumber: "120823", expirationDate: "2027-08-31" },
	{ id: "wh-needles-01", name: "Игла карпульная стоматологическая 30G 0.3x21мм", stockQuantity: 350, criticalThreshold: 50, unitCostRub: "12.50", updatedAt: "2026-09-01", unit: "шт.", sku: "ND-30G-21" },
	{ id: "wh-gloves-01", name: "Перчатки нитриловые неопудренные (размер M)", stockQuantity: 12, criticalThreshold: 25, unitCostRub: "35.00", updatedAt: "2026-09-01", unit: "пар", sku: "PPE-GLV-M" },
	{ id: "wh-kraft-01", name: "Крафт-пакет самоклеящийся 100х200 (для стерилизации)", stockQuantity: 420, criticalThreshold: 60, unitCostRub: "14.00", updatedAt: "2026-09-01", unit: "шт.", sku: "STER-KP-100" },
	{ id: "wh-comp-01", name: "Композит светоотверждаемый Estelite Sigma Quick А2", stockQuantity: 4, criticalThreshold: 2, unitCostRub: "3200.00", updatedAt: "2026-09-01", unit: "шприц", sku: "COMP-EST-A2" },
	{ id: "wh-adhes-01", name: "Адгезивная система Single Bond Universal 5 мл", stockQuantity: 0, criticalThreshold: 1, unitCostRub: "4800.00", updatedAt: "2026-09-01", unit: "фл.", sku: "ADH-SBU-5" },
];
