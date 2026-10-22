import { parseKopecks } from "@dental/shared";
import type { ProcedureTechMap } from "../inventoryMath.js";

/**
 * ТЕХКАРТА: СТЕРИЛИЗАЦИЯ И КРАФТ-ПАКЕТЫ (СанПиН 3.3686-21)
 */
export const STERILIZATION_KRAFT_TECH_MAP: ProcedureTechMap = {
	id: "tm-steril-kraft",
	code: "SANPIN_KRAFT",
	title: "Стерилизация и крафт-пакеты (СанПиН 3.3686-21)",
	specialty: "ЦСО / Сестринское дело",
	description: "Крафт-пакеты самоклеящиеся 100×200, химические интеграторы 5 класса (ИнтеТЕСТ 134/5), термоэтикетки 58×40",
	items: [
		{
			id: "steril-kraft-pouch-100x200",
			materialName: "Крафт-пакет самоклеящийся 100×200 мм (срок стерильности 50 суток)",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("8.50"),
			mandatory: true,
			description: "СанПиН 3.3686-21 п. 3632",
		},
		{
			id: "steril-integrator-class5",
			materialName: "Химический интегратор 5 класса ИнтеТЕСТ-В-134/5 (ГОСТ ISO 11140-1)",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("4.20"),
			mandatory: true,
		},
		{
			id: "steril-thermal-label-58x40",
			materialName: "Термоэтикетка самоклеящаяся 58×40 мм для штрихкода крафт-пакета",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("1.80"),
			mandatory: true,
		},
	],
};
