/**
 * surgicalBoms.ts — Technological Maps (BOM) for Surgery, Anesthesia & Implantology.
 * Mandate 8b: Strictly <= 120 lines.
 */

import type { ConsumableItemLink } from "../consumableModules/consumableTypes.js";

export const SURGICAL_BOM_LINKS: readonly ConsumableItemLink[] = [
	{
		id: "def-link-anes-carpule", service804nCode: "A11.07.012",
		serviceTitle: "Анестезия инфильтрационная / проводниковая",
		inventoryItemId: "mat-anes-art-100k", itemName: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)",
		category: "anesthetic", unit: "карпула", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 14500, notes: "СанПиН 3.3686-21, отходы Класса Б",
	},
	{
		id: "def-link-anes-needle", service804nCode: "A11.07.012",
		serviceTitle: "Анестезия инфильтрационная / проводниковая",
		inventoryItemId: "mat-anes-needle-30g", itemName: "Игла карпульная стоматологическая 30G евростандарт (25 мм)",
		category: "anesthetic", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 2500, notes: "Остроконечные отходы Класса Б (СанПиН 2.1.3684-21)",
	},
	{
		id: "def-link-anes-wipe", service804nCode: "A11.07.012",
		serviceTitle: "Анестезия инфильтрационная / проводниковая",
		inventoryItemId: "mat-anes-wipe", itemName: "Антисептическая спиртовая салфетка стерильная",
		category: "disinfectant", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 500, notes: "Обработка места инъекции",
	},
	{
		id: "def-link-surg-scalpel", service804nCode: "A16.07.001",
		serviceTitle: "Хирургическое удаление зуба",
		inventoryItemId: "mat-scalpel-15c", itemName: "Лезвие скальпеля хирургическое стерильное №15C",
		category: "suture", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 6500, notes: "Остроконечные отходы Класса Б (СанПиН 2.1.3684-21)",
	},
	{
		id: "def-link-surg-suture", service804nCode: "A16.07.001",
		serviceTitle: "Хирургическое удаление зуба",
		inventoryItemId: "mat-suture-vicryl", itemName: "Шовный материал Викрил 4-0 с атравматической иглой",
		category: "suture", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 48000, notes: "Ушивание лунки",
	},
	{
		id: "def-link-surg-sponge", service804nCode: "A16.07.001",
		serviceTitle: "Хирургическое удаление зуба",
		inventoryItemId: "mat-hemostatic-sponge", itemName: "Гемостатическая антисептическая губка Альвостаз",
		category: "other", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 18000, notes: "Гемостаз в лунке",
	},
	{
		id: "def-link-surg-gauze", service804nCode: "A16.07.001",
		serviceTitle: "Хирургическое удаление зуба",
		inventoryItemId: "mat-gauze-swabs", itemName: "Салфетки марлевые стерильные 5х5 см",
		category: "other", unit: "шт", quantityPerService: 5, isMandatory: true,
		costPriceKopecks: 3000, notes: "Гемостатический тампон (Класс Б)",
	},
	{
		id: "def-link-surg-complex-scalpel", service804nCode: "A16.07.006",
		serviceTitle: "Сложное удаление зуба",
		inventoryItemId: "mat-scalpel-15c", itemName: "Лезвие скальпеля хирургическое стерильное №15C",
		category: "suture", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 6500, notes: "Остроконечные отходы Класса Б",
	},
	{
		id: "def-link-surg-complex-suture", service804nCode: "A16.07.006",
		serviceTitle: "Сложное удаление зуба",
		inventoryItemId: "mat-suture-vicryl", itemName: "Шовный материал Викрил 4-0 с атравматической иглой",
		category: "suture", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 48000, notes: "Ушивание лунки",
	},
	{
		id: "def-link-implant-fixture-osstem", service804nCode: "A16.07.054",
		serviceTitle: "Внутрикостная дентальная имплантация",
		inventoryItemId: "mat-implant-osstem-tsiii", itemName: "Дентальный имплантат Osstem TS-III SA (титан Grade 4)",
		category: "other", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 850000, notes: "Стерильный имплантат с имплантоводом",
	},
	{
		id: "def-link-implant-healing-abutment", service804nCode: "A16.07.054",
		serviceTitle: "Внутрикостная дентальная имплантация",
		inventoryItemId: "mat-healing-abutment-titanium", itemName: "Формирователь десны титановый (Healing Abutment)",
		category: "other", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 120000, notes: "Гингивопластика десневого края",
	},
	{
		id: "def-link-implant-suture-prolene", service804nCode: "A16.07.054",
		serviceTitle: "Внутрикостная дентальная имплантация",
		inventoryItemId: "mat-suture-prolene-50", itemName: "Шовный материал Пролен (Prolene) 5-0 с колющей иглой",
		category: "suture", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 45000, notes: "Монофиламентная асептическая фиксация лоскута",
	},
	{
		id: "def-link-bone-bio-oss", service804nCode: "A16.07.055",
		serviceTitle: "Синус-лифтинг (костная пластика)",
		inventoryItemId: "mat-bone-bio-oss-05g", itemName: "Ксеногенный остеопластический материал Geistlich Bio-Oss Spongiosa (0.5 г)",
		category: "other", unit: "pack", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 1150000, notes: "Ксенографт натуральной депротеинизированной кости",
	},
	{
		id: "def-link-membrane-bio-gide", service804nCode: "A16.07.055",
		serviceTitle: "Синус-лифтинг (костная пластика)",
		inventoryItemId: "mat-membrane-bio-gide-1325", itemName: "Резорбируемая коллагеновая мембрана Geistlich Bio-Gide (13x25 мм)",
		category: "other", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 1280000, notes: "Двухслойная барьерная мембрана НКР",
	},
	{
		id: "def-link-implant-fixture-dentium", service804nCode: "A16.07.054.002",
		serviceTitle: "Внутрикостная дентальная имплантация (Dentium SuperLine)",
		inventoryItemId: "mat-implant-dentium-superline", itemName: "Дентальный имплантат Dentium SuperLine SLA (Корея)",
		category: "other", unit: "шт", quantityPerService: 1, isMandatory: true,
		costPriceKopecks: 820000, notes: "Конический имплантат с двойной резьбой и SLA-поверхностью",
	},
];
