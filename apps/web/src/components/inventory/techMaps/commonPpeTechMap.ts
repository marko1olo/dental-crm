import { parseKopecks } from "@dental/shared";
import type { ProcedureTechMap } from "../inventoryMath.js";
import { STERILIZATION_KRAFT_TECH_MAP } from "./sterilizationKraftTechMap.js";

export { STERILIZATION_KRAFT_TECH_MAP };

/**
 * БАЗОВЫЙ НАБОР СИЗ И РАСХОДНИКОВ ПРИЕМА (СанПиН 3.3686-21)
 * Списывается на каждый стоматологический прием по умолчанию.
 */
export const COMMON_PPE_TECH_MAP: ProcedureTechMap = {
	id: "tm-ppe-common",
	code: "SANPIN_PPE",
	title: "СИЗ и одноразовые расходники приема",
	specialty: "Общее",
	description: "Обязательный стандартный противоэпидемический набор на 1 прием пациента",
	items: [
		{
			id: "ppe-gloves",
			materialName: "Перчатки нитриловые неопудренные (врач + ассистент)",
			category: "ppe",
			unit: "пары",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("35.00"),
			mandatory: true,
			description: "2 пары на прием по СанПиН 3.3686-21",
		},
		{
			id: "ppe-mask",
			materialName: "Маска медицинская защитная трехслойная с фиксатором",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("15.00"),
			mandatory: true,
		},
		{
			id: "ppe-saliva-ejector",
			materialName: "Слюноотсос одноразовый стоматологический с гибким наконечником",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("12.50"),
			mandatory: true,
		},
		{
			id: "ppe-cotton-rolls",
			materialName: "Ватные валики стоматологические стерильные №2",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 6,
			defaultUnitCostKopecks: parseKopecks("3.50"),
			mandatory: true,
		},
		{
			id: "ppe-napkin",
			materialName: "Салфетка нагрудная двухслойная водонепроницаемая",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("18.00"),
			mandatory: true,
		},
		{
			id: "ppe-microbrush",
			materialName: "Микроаппликатор стоматологический (браш) Regular",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("8.50"),
			mandatory: true,
		},
		{
			id: "ppe-suction-cannula",
			materialName: "Наконечник для пылесоса хирургический/эвакуатор",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("25.00"),
			mandatory: true,
		},
	],
};
