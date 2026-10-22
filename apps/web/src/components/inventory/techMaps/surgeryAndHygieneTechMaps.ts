import { parseKopecks } from "@dental/shared";
import type { ProcedureTechMap } from "../inventoryMath.js";

/**
 * ТЕХКАРТА: ПРОФЕССИОНАЛЬНАЯ ГИГИЕНА (Air-Flow + УЗ - A16.07.051)
 */
export const HYGIENE_TECH_MAP: ProcedureTechMap = {
	id: "tm-hygiene",
	code: "A16.07.051",
	title: "Профессиональная гигиена полости рта (Air-Flow + УЗ)",
	specialty: "Гигиена и профилактика",
	description: "Снятие зубных отложений ультразвуком, пескоструйная полировка Air-Flow, фторирование",
	items: [
		{
			id: "hyg-powder",
			materialName: "Порошок Air-Flow глициновый мелкодисперсный EMS Plus / Clinpro",
			category: "hygiene",
			unit: "г",
			standardQuantity: 25,
			defaultUnitCostKopecks: parseKopecks("18.00"),
			mandatory: true,
		},
		{
			id: "hyg-prophy-paste",
			materialName: "Полировочная паста Cleanic / Detartrine",
			category: "hygiene",
			unit: "г",
			standardQuantity: 3,
			defaultUnitCostKopecks: parseKopecks("40.00"),
			mandatory: true,
		},
		{
			id: "hyg-brush",
			materialName: "Щетка полировочная циркулярная нейлоновая",
			category: "hygiene",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("65.00"),
			mandatory: true,
		},
		{
			id: "hyg-varnish",
			materialName: "Фторлак защитный Clinpro White Varnish",
			category: "hygiene",
			unit: "мл",
			standardQuantity: 0.5,
			defaultUnitCostKopecks: parseKopecks("640.00"),
			mandatory: true,
		},
		{
			id: "hyg-optragate",
			materialName: "Ретрактор мягкий OptraGate (Ivoclar)",
			category: "hygiene",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("210.00"),
			mandatory: true,
		},
	],
};

/**
 * ТЕХКАРТА: ХИРУРГИЧЕСКОЕ УДАЛЕНИЕ ЗУБА (A16.07.001.001)
 */
export const SURGERY_EXTRACTION_TECH_MAP: ProcedureTechMap = {
	id: "tm-surgery-ext",
	code: "A16.07.001.001",
	title: "Атравматичное удаление зуба с ревизией лунки",
	specialty: "Хирургия",
	description: "Удаление зуба, гемостаз коллагеновой губкой Альвостаз, наложение швов PTFE",
	items: [
		{
			id: "surg-sponge",
			materialName: "Гемостатическая коллагеновая губка Альвостаз / Parasorb Cone",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("310.00"),
			mandatory: true,
		},
		{
			id: "surg-suture",
			materialName: "Шовный материал монофиламентный PTFE / Пролен 4-0 с атравматической иглой",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("340.00"),
			mandatory: true,
		},
		{
			id: "surg-blade",
			materialName: "Микрохирургическое лезвие №15C Swann-Morton стерильное",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("85.00"),
			mandatory: true,
		},
		{
			id: "surg-curasept",
			materialName: "Антисептический пародонтальный гель Curasept ADS 1% / Метрогил",
			category: "surgery",
			unit: "мл",
			standardQuantity: 1.0,
			defaultUnitCostKopecks: parseKopecks("60.00"),
			mandatory: false,
		},
	],
};
