/**
 * hygieneBoms.ts — Technological Maps (BOM) for Hygiene, Diagnostics & PPE.
 * Mandate 8b: Strictly <= 120 lines.
 */

import type { ConsumableItemLink } from "../consumableModules/consumableTypes.js";

export const HYGIENE_BOM_LINKS: readonly ConsumableItemLink[] = [
	{
		id: "def-link-hyg-powder", service804nCode: "A16.07.051",
		serviceTitle: "Комплексная профессиональная гигиена полости рта",
		inventoryItemId: "mat-airflow-powder", itemName: "Порошок для воздушно-абразивной полировки AirFlow (саше 25 г)",
		category: "hygiene_paste", unit: "pack", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 65000, notes: "Air-Flow полировка",
	},
	{
		id: "def-link-hyg-paste", service804nCode: "A16.07.051",
		serviceTitle: "Комплексная профессиональная гигиена полости рта",
		inventoryItemId: "mat-prophy-paste", itemName: "Паста полировочная абразивная Cleanic",
		category: "hygiene_paste", unit: "dose", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 12000, notes: "Финишная полировка эмали",
	},
	{
		id: "def-link-hyg-brush", service804nCode: "A16.07.051",
		serviceTitle: "Комплексная профессиональная гигиена полости рта",
		inventoryItemId: "mat-prophy-brush", itemName: "Щеточка полировочная циркулярная для наконечника",
		category: "bur", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 4500, notes: "Механическая чистка",
	},
	{
		id: "def-link-hyg-optragate", service804nCode: "A16.07.051",
		serviceTitle: "Комплексная профессиональная гигиена полости рта",
		inventoryItemId: "mat-optragate", itemName: "Роторасширитель эластичный OptraGate",
		category: "rubber_dam", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 18500, notes: "Изоляция губ и щек",
	},
	{
		id: "def-link-rvg-sleeve", service804nCode: "A06.07.003",
		serviceTitle: "Прицельная радиовизиография",
		inventoryItemId: "mat-rvg-sensor-sleeve", itemName: "Одноразовый защитный чехол визиографического датчика",
		category: "other", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 1500, notes: "Асептический барьер датчика",
	},
	{
		id: "def-link-base-gloves", service804nCode: "B01.065.001",
		serviceTitle: "Прием врача-стоматолога",
		inventoryItemId: "mat-nitrile-gloves", itemName: "Перчатки смотровые нитриловые неопудренные (пара)",
		category: "other", unit: "шт", quantityPerService: 2, isMandatory: true,
		costPriceKopecks: 7000, notes: "СИЗ врача и ассистента (СанПиН 3.3686-21, Класс Б)",
	},
	{
		id: "def-link-base-mask", service804nCode: "B01.065.001",
		serviceTitle: "Прием врача-стоматолога",
		inventoryItemId: "mat-medical-mask", itemName: "Маска медицинская защитная трехслойная",
		category: "other", unit: "шт", quantityPerService: 2, isMandatory: true,
		costPriceKopecks: 2400, notes: "СИЗ персонала",
	},
	{
		id: "def-link-base-ejector", service804nCode: "B01.065.001",
		serviceTitle: "Прием врача-стоматолога",
		inventoryItemId: "mat-saliva-ejector", itemName: "Слюноотсос стоматологический одноразовый",
		category: "other", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 1250, notes: "Эвакуация слюны (Класс Б)",
	},
	{
		id: "def-link-base-cotton", service804nCode: "B01.065.001",
		serviceTitle: "Прием врача-стоматолога",
		inventoryItemId: "mat-cotton-rolls", itemName: "Ватные валики стоматологические стерильные №2",
		category: "other", unit: "шт", quantityPerService: 4, isMandatory: true,
		costPriceKopecks: 1200, notes: "Изоляция слюны (Класс Б)",
	},
	{
		id: "def-link-base-bib", service804nCode: "B01.065.001",
		serviceTitle: "Прием врача-стоматолога",
		inventoryItemId: "mat-patient-bib", itemName: "Салфетка нагрудная стоматологическая двухслойная",
		category: "other", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 800, notes: "Защита одежды пациента",
	},
];
