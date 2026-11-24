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
	// Пародонтология и закрытый кюретаж (A16.07.039)
	{ id: "def-link-cur-anes", service804nCode: "A16.07.039", serviceTitle: "Закрытый кюретаж при заболеваниях пародонта в области зуба", inventoryItemId: "mat-anes-art-100k", itemName: "Анестетик артикаиновый 1:100 000 (карпула)", category: "anesthetic", unit: "carpule", quantityPerService: 1, isMandatory: true, costPriceKopecks: 14500, notes: "Местная анестезия" },
	{ id: "def-link-cur-needle", service804nCode: "A16.07.039", serviceTitle: "Закрытый кюретаж при заболеваниях пародонта в области зуба", inventoryItemId: "mat-disposable-needle-short", itemName: "Игла инъекционная стерильная 30G", category: "other", unit: "шт", quantityPerService: 1, isMandatory: true, costPriceKopecks: 1800, notes: "Стерильная игла" },
	{ id: "def-link-cur-metrogyl", service804nCode: "A16.07.039", serviceTitle: "Закрытый кюретаж при заболеваниях пародонта в области зуба", inventoryItemId: "mat-metrogyl-denta", itemName: "Гель стоматологический Метрогил Дента", category: "other", unit: "dose", quantityPerService: 1, isMandatory: true, costPriceKopecks: 6500, notes: "Антибактериальная обработка кармана" },
	{ id: "def-link-cur-septopack", service804nCode: "A16.07.039", serviceTitle: "Закрытый кюретаж при заболеваниях пародонта в области зуба", inventoryItemId: "mat-septopack", itemName: "Повязка пародонтальная защитная Септопак", category: "other", unit: "dose", quantityPerService: 1, isMandatory: false, costPriceKopecks: 12000, notes: "Защита раневой поверхности" },
	// Ультразвуковой скейлинг и Vector-терапия (A22.07.002 / A16.07.020)
	{ id: "def-link-us-optragate", service804nCode: "A22.07.002", serviceTitle: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений", inventoryItemId: "mat-optragate", itemName: "Роторасширитель эластичный OptraGate", category: "rubber_dam", unit: "шт", quantityPerService: 1, isMandatory: true, costPriceKopecks: 18500, notes: "Изоляция" },
	{ id: "def-link-us-paste", service804nCode: "A22.07.002", serviceTitle: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений", inventoryItemId: "mat-prophy-paste", itemName: "Паста полировочная абразивная Cleanic", category: "hygiene_paste", unit: "dose", quantityPerService: 1, isMandatory: true, costPriceKopecks: 12000, notes: "Финишная полировка" },
	{ id: "def-link-us-scaler-tip", service804nCode: "A22.07.002", serviceTitle: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений", inventoryItemId: "mat-scaler-tip", itemName: "Насадка ультразвуковая скейлинговая стерильная", category: "bur", unit: "шт", quantityPerService: 1, isMandatory: true, costPriceKopecks: 5000, notes: "УЗ-дебридмент" },
	{ id: "def-link-vec-polish", service804nCode: "A22.07.002", serviceTitle: "Ультразвуковое удаление отложений аппаратом Vector", inventoryItemId: "mat-vector-fluid-polish", itemName: "Суспензия полировочная Vector Polish с гидроксиапатитом", category: "hygiene_paste", unit: "dose", quantityPerService: 1, isMandatory: false, costPriceKopecks: 45000, notes: "Vector полировка корня" },
	{ id: "def-link-vec-chlorhex", service804nCode: "A22.07.002", serviceTitle: "Ультразвуковое удаление отложений аппаратом Vector", inventoryItemId: "mat-chlorhexidine-005", itemName: "Раствор хлоргексидина биглюконата 0.05% (50 мл)", category: "other", unit: "dose", quantityPerService: 1, isMandatory: true, costPriceKopecks: 2500, notes: "Антисептическая ирригация" },
];

export const PERIODONTOLOGY_BOM_LINKS: readonly ConsumableItemLink[] = HYGIENE_BOM_LINKS.slice(10);
