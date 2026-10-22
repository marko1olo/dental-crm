import { parseKopecks } from "@dental/shared";
import type { ProcedureTechMap } from "../inventoryMath.js";

/**
 * ТЕХКАРТА: ЭНДОДОНТИЯ (Обработка и обтурация 1-канального зуба - A16.07.030.001 / A16.07.008.001)
 */
export const ENDO_1_CANAL_TECH_MAP: ProcedureTechMap = {
	id: "tm-endo-1canal",
	code: "A16.07.030.001",
	title: "Эндодонтия: механическая обработка и пломбирование 1 канала",
	specialty: "Эндодонтия",
	description: "Ирригация гипохлоритом Na 3%, ЭДТА гель, ротационные файлы, силер AH Plus и гуттаперча",
	items: [
		{
			id: "endo1-hypochlorite",
			materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации",
			category: "endo",
			unit: "мл",
			standardQuantity: 15,
			defaultUnitCostKopecks: parseKopecks("8.00"),
			mandatory: true,
		},
		{
			id: "endo1-edta-gel",
			materialName: "Гель ЭДТА 17% для химического расширения каналов (Endo-Prep Cream)",
			category: "endo",
			unit: "мл",
			standardQuantity: 0.5,
			defaultUnitCostKopecks: parseKopecks("240.00"),
			mandatory: true,
		},
		{
			id: "endo1-endolubricant",
			materialName: "Эндолубрикант водорастворимый для машинных файлов RC-Prep",
			category: "endo",
			unit: "мл",
			standardQuantity: 0.5,
			defaultUnitCostKopecks: parseKopecks("190.00"),
			mandatory: true,
		},
		{
			id: "endo1-sealer",
			materialName: "Эпоксидный силер для постоянной обтурации AH Plus (Dentsply)",
			category: "endo",
			unit: "г",
			standardQuantity: 0.1,
			defaultUnitCostKopecks: parseKopecks("4800.00"),
			mandatory: true,
		},
		{
			id: "endo1-gutta-percha",
			materialName: "Гуттаперчевые конусные штифты 0.04/0.06 калиброванные",
			category: "endo",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("60.00"),
			mandatory: true,
		},
		{
			id: "endo1-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные (пины)",
			category: "endo",
			unit: "шт.",
			standardQuantity: 3,
			defaultUnitCostKopecks: parseKopecks("15.00"),
			mandatory: true,
		},
		{
			id: "endo1-niti-files",
			materialName: "Машинные никель-титановые ротационные файлы ProTaper / WaveOne",
			category: "endo",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("850.00"),
			mandatory: true,
		},
	],
};
