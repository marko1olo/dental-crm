/**
 * orthopedicBoms.ts — Technological Maps (BOM) for Prosthodontics & Orthopedics.
 * Impression materials, retraction cords, and adhesive cements.
 * Mandate 8b: Strictly <= 120 lines.
 */

import type { ConsumableItemLink } from "../consumableModules/consumableTypes.js";

export const ORTHOPEDIC_BOM_LINKS: readonly ConsumableItemLink[] = [
	{
		id: "def-link-prostho-asilicone-impression",
		service804nCode: "A02.07.010",
		serviceTitle: "Снятие оттиска с одной челюсти",
		inventoryItemId: "mat-silicone-elite-hd-plus",
		itemName: "А-силиконовая оттискная масса Elite HD+ Putty Soft + Light Body",
		category: "other",
		unit: "dose",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 65000,
		notes: "Прецизионный двухслойный оттиск",
	},
	{
		id: "def-link-prostho-retraction-cord",
		service804nCode: "A02.07.010",
		serviceTitle: "Снятие оттиска с одной челюсти",
		inventoryItemId: "mat-retraction-cord-ultrapak",
		itemName: "Ретракционная вязаная нить Ultrapak #000 (Ultradent)",
		category: "other",
		unit: "dose",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 12000,
		notes: "Атравматичное раскрытие зубодесневой борозды",
	},
	{
		id: "def-link-prostho-cement-relyx",
		service804nCode: "A16.07.004",
		serviceTitle: "Восстановление зуба коронкой",
		inventoryItemId: "mat-cement-relyx-u200",
		itemName: "Самоадгезивный универсальный композитный цемент RelyX U200 (3M)",
		category: "composite",
		unit: "dose",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 42000,
		notes: "Долговременная фиксация коронок и мостовидных протезов",
	},
	{
		id: "def-link-prostho-cement-panavia",
		service804nCode: "A16.07.004.001",
		serviceTitle: "Постоянная фиксация на композитный цемент двойного отверждения",
		inventoryItemId: "mat-cement-panavia-v5",
		itemName: "Композитный цемент двойного отверждения Panavia V5 (Kuraray, Япония)",
		category: "composite",
		unit: "dose",
		quantityPerService: 1,
		isMandatory: true,
		costPriceKopecks: 58000,
		notes: "Высокоэстетичная фиксация керамических виниров и коронок e.max",
	},
];
