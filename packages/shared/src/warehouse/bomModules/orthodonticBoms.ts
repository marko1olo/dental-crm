/**
 * orthodonticBoms.ts — Technological Maps (BOM) for Orthodontics.
 * Brackets, archwires, and temporary anchorage devices (TAD).
 * Mandate 8b: Strictly <= 120 lines.
 */

import type { ConsumableItemLink } from "../consumableModules/consumableTypes.js";

export const ORTHODONTIC_BOM_LINKS: readonly ConsumableItemLink[] = [
	{
		id: "def-link-ortho-brackets-damon",
		service804nCode: "A16.07.048",
		serviceTitle: "Фиксация брекет-системы",
		inventoryItemId: "mat-brackets-damon-q2",
		itemName: "Самолигирующая металлическая брекет-система Damon Q2 (Ormco, 1 челюсть)",
		category: "other",
		unit: "pack",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 2800000,
		notes: "Набор замков с пассивным самолигированием 0.022",
	},
	{
		id: "def-link-ortho-archwire-cuniti",
		service804nCode: "A16.07.048",
		serviceTitle: "Фиксация брекет-системы",
		inventoryItemId: "mat-archwire-cuniti-014",
		itemName: "Ортодонтическая дуга Copper Ni-Ti .014 (Ormco)",
		category: "other",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 120000,
		notes: "Термоактивная инициирующая дуга нивелирования",
	},
	{
		id: "def-link-ortho-tad-bioray",
		service804nCode: "A16.07.093",
		serviceTitle: "Установка ортодонтического микроимплантата (мини-винта)",
		inventoryItemId: "mat-tad-bioray-16x8",
		itemName: "Ортодонтический микроимплантат Bio-Ray 1.6x8 мм (титан Grade 5)",
		category: "other",
		unit: "шт",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 240000,
		notes: "Скелетный анкораж для биомеханики дистализации и интрузии",
	},
];
