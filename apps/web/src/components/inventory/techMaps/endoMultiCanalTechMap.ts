import { parseKopecks } from "@dental/shared";
import type { ProcedureTechMap } from "../inventoryMath.js";

/**
 * ТЕХКАРТА: ЭНДОДОНТИЯ МНОГОКАНАЛЬНАЯ (2-3-4 канала - A16.07.030.003 / A16.07.008.003)
 */
export const ENDO_MULTI_CANAL_TECH_MAP: ProcedureTechMap = {
	id: "tm-endo-multicanal",
	code: "A16.07.030.003",
	title: "Эндодонтия: обработка и пломбирование 3 каналов",
	specialty: "Эндодонтия",
	description: "Полный протокол ирригации и 3D-обтурации трехканального моляра/премоляра",
	items: [
		{
			id: "endo3-hypochlorite",
			materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации",
			category: "endo",
			unit: "мл",
			standardQuantity: 30,
			defaultUnitCostKopecks: parseKopecks("8.00"),
			mandatory: true,
		},
		{
			id: "endo3-edta-gel",
			materialName: "Гель ЭДТА 17% для химического расширения каналов (Endo-Prep Cream)",
			category: "endo",
			unit: "мл",
			standardQuantity: 1.5,
			defaultUnitCostKopecks: parseKopecks("240.00"),
			mandatory: true,
		},
		{
			id: "endo3-endolubricant",
			materialName: "Эндолубрикант водорастворимый для машинных файлов RC-Prep",
			category: "endo",
			unit: "мл",
			standardQuantity: 1.0,
			defaultUnitCostKopecks: parseKopecks("190.00"),
			mandatory: true,
		},
		{
			id: "endo3-sealer",
			materialName: "Эпоксидный силер для постоянной обтурации AH Plus (Dentsply)",
			category: "endo",
			unit: "г",
			standardQuantity: 0.3,
			defaultUnitCostKopecks: parseKopecks("4800.00"),
			mandatory: true,
		},
		{
			id: "endo3-gutta-percha",
			materialName: "Гуттаперчевые конусные штифты 0.04/0.06 калиброванные",
			category: "endo",
			unit: "шт.",
			standardQuantity: 3,
			defaultUnitCostKopecks: parseKopecks("60.00"),
			mandatory: true,
		},
		{
			id: "endo3-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные (пины)",
			category: "endo",
			unit: "шт.",
			standardQuantity: 9,
			defaultUnitCostKopecks: parseKopecks("15.00"),
			mandatory: true,
		},
		{
			id: "endo3-niti-files",
			materialName: "Машинные никель-титановые ротационные файлы ProTaper / WaveOne",
			category: "endo",
			unit: "шт.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("850.00"),
			mandatory: true,
		},
	],
};
