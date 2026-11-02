import { parseKopecks } from "@dental/shared";
import type { ProcedureTechMap } from "../inventoryMath.js";

/**
 * ТЕХКАРТА: ПАКЕТНАЯ СТЕРИЛИЗАЦИЯ СМЕНЫ И АВТОКЛАВИРОВАНИЕ
 * Пакетное списание расходных материалов на смену ЦСО без поштучного микро-трекинга (Мандаты 8n, 8e, 8x).
 */
export const STERILIZATION_KRAFT_TECH_MAP: ProcedureTechMap = {
	id: "tm-steril-kraft",
	code: "SANPIN_KRAFT",
	title: "Пакетная стерилизация смены ЦСО (автоклавирование)",
	specialty: "ЦСО / Сестринское дело",
	description: "Пакетное списание набора стерилизации на смену: крафт-пакеты 100×200 (пачка/партия смены), химические интеграторы 5 класса (тест-контроль смены), термоэтикетки 58×40 (рулон)",
	items: [
		{
			id: "steril-kraft-pouch-100x200",
			materialName: "Крафт-пакеты самоклеящиеся 100×200 мм (партия смены / упаковка)",
			category: "ppe",
			unit: "пачка",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("850.00"),
			mandatory: true,
			description: "Пакетное списание набора крафт-пакетов на смену автоклавирования",
		},
		{
			id: "steril-integrator-class5",
			materialName: "Химические интеграторы 5 класса ИнтеТЕСТ-В-134/5 (тест-контроль смены)",
			category: "ppe",
			unit: "комплект",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("42.00"),
			mandatory: true,
			description: "Контроль циклов автоклавирования смены (ГОСТ ISO 11140-1)",
		},
		{
			id: "steril-thermal-label-58x40",
			materialName: "Термоэтикетки самоклеящиеся 58×40 мм (рулон маркировки партии смены)",
			category: "ppe",
			unit: "рулон",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("180.00"),
			mandatory: true,
			description: "Пакетная маркировка партий стерилизации смены",
		},
	],
};
