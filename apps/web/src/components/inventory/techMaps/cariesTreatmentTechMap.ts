import { parseKopecks } from "@dental/shared";
import type { ProcedureTechMap } from "../inventoryMath.js";

/**
 * ТЕХКАРТА: ЛЕЧЕНИЕ КАРИЕСА ФОТОПОЛИМЕРОМ (A16.07.002.001)
 */
export const CARIES_TREATMENT_TECH_MAP: ProcedureTechMap = {
	id: "tm-caries-restoration",
	code: "A16.07.002.001",
	title: "Лечение кариеса и фотополимерная реставрация",
	specialty: "Терапия",
	description: "Препарирование, адгезивный протокол, композитная реставрация и полировка",
	items: [
		{
			id: "caries-composite",
			materialName: "Наногибридный композит светоотверждаемый (Filtek Z250 / Estelite Asteria / GC Gradia)",
			category: "caries",
			unit: "г",
			standardQuantity: 0.4,
			defaultUnitCostKopecks: parseKopecks("1300.00"),
			mandatory: true,
			description: "0.4 г на полость среднего объема",
		},
		{
			id: "caries-adhesive",
			materialName: "Самопротравливающий адгезив 7-го поколения (Single Bond Universal / Tokuyama EE)",
			category: "caries",
			unit: "мл",
			standardQuantity: 0.1,
			defaultUnitCostKopecks: parseKopecks("1800.00"),
			mandatory: true,
		},
		{
			id: "caries-etching-gel",
			materialName: "Гель травильный 37% ортофосфорная кислота",
			category: "caries",
			unit: "мл",
			standardQuantity: 0.2,
			defaultUnitCostKopecks: parseKopecks("175.00"),
			mandatory: true,
		},
		{
			id: "caries-matrix-system",
			materialName: "Секционная матричная система контурная 3D + деревянный клин Tor VM",
			category: "caries",
			unit: "компл.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("95.00"),
			mandatory: true,
		},
		{
			id: "caries-polishing-discs",
			materialName: "Полировочные диски и силиконовые головки Enhance / Sof-Lex",
			category: "caries",
			unit: "шт.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("65.00"),
			mandatory: true,
		},
		{
			id: "caries-cofferdam-sheet",
			materialName: "Платок коффердама латексный Sanctuary Dental Dam",
			category: "caries",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("115.00"),
			mandatory: false,
		},
		{
			id: "caries-finishing-paste",
			materialName: "Паста алмазная полировочная для композитов Diamond Polish",
			category: "caries",
			unit: "г",
			standardQuantity: 0.2,
			defaultUnitCostKopecks: parseKopecks("375.00"),
			mandatory: false,
		},
	],
};
