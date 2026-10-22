import { parseKopecks } from "@dental/shared";
import type { ProcedureTechMap } from "../inventoryMath.js";
import { CARIES_TREATMENT_TECH_MAP } from "./cariesTreatmentTechMap.js";

export { CARIES_TREATMENT_TECH_MAP };

/**
 * ТЕХКАРТА: МЕСТНАЯ АНЕСТЕЗИЯ (Карпульная)
 */
export const ANESTHESIA_TECH_MAP: ProcedureTechMap = {
	id: "tm-anesthesia",
	code: "A16.07.004",
	title: "Анестезия инфильтрационная / проводниковая",
	specialty: "Терапия / Хирургия",
	description: "Карпульная анестезия с обязательным МДЛП/серийным учетом",
	items: [
		{
			id: "anes-cartridge",
			materialName: "Анестетик артикаиновый 4% с эпинефрином 1:100000 (Ультракаин Д-С / Септонест) 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("220.00"),
			lotTrackingRequired: true,
			mandatory: true,
			description: "Подлежит учету серии и срока годности",
		},
		{
			id: "anes-needle",
			materialName: "Игла карпульная 30G евростандарт 25 мм",
			category: "anesthesia",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("28.00"),
			mandatory: true,
		},
		{
			id: "anes-topical",
			materialName: "Гель анестезирующий аппликационный (Топикал / Джен-Релиф)",
			category: "anesthesia",
			unit: "мл",
			standardQuantity: 0.2,
			defaultUnitCostKopecks: parseKopecks("45.00"),
			mandatory: false,
		},
	],
};
