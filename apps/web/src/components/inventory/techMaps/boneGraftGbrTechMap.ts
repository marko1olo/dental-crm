import { parseKopecks } from "@dental/shared";
import type { ProcedureTechMap } from "../inventoryMath.js";

/**
 * ТЕХКАРТА: КОСТНАЯ ПЛАСТИКА, СИНУС-ЛИФТИНГ И НКР (A16.07.055 / A16.07.041)
 */
export const BONE_GRAFT_GBR_TECH_MAP: ProcedureTechMap = {
	id: "tm-bone-graft-gbr",
	code: "A16.07.055",
	title: "Костная пластика, синус-лифтинг и НКР (Bio-Oss + Bio-Gide)",
	specialty: "Хирургия / Остеопластика",
	description: "Направленная костная регенерация: графт Geistlich Bio-Oss, мембрана Geistlich Bio-Gide, микропины, шовник Prolene 5-0 / Vicryl 4-0, анестетик",
	items: [
		{
			id: "gbr-bio-oss",
			materialName: "Костнозамещающий натуральный графт Geistlich Bio-Oss (гранулы 0.5 г)",
			category: "surgery",
			unit: "упак.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("12500.00"),
			lotTrackingRequired: true,
			mandatory: true,
			description: "Остеокондуктивный натуральный бычий костный матрикс",
		},
		{
			id: "gbr-bio-gide",
			materialName: "Коллагеновая резорбируемая барьерная мембрана Geistlich Bio-Gide 25×25 мм",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("16800.00"),
			lotTrackingRequired: true,
			mandatory: true,
			description: "Двухслойная барьерная коллагеновая мембрана",
		},
		{
			id: "gbr-titanium-pins",
			materialName: "Титановые микропины для фиксации мембраны (комплект 2 шт)",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("1200.00"),
			mandatory: true,
		},
		{
			id: "gbr-prolene-suture",
			materialName: "Шовный материал монофиламентный нерассасывающийся Prolene 5-0 (Ethicon)",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("540.00"),
			mandatory: true,
		},
		{
			id: "gbr-vicryl-suture",
			materialName: "Шовный материал рассасывающийся Vicryl 4-0 с атравматической иглой (Ethicon)",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("480.00"),
			mandatory: false,
		},
		{
			id: "gbr-anesthesia",
			materialName: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 (Ультракаин Д-С Форте) 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("230.00"),
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "gbr-sterile-drape",
			materialName: "Стерильный операционный комплект накрытия поля и хирурга",
			category: "ppe",
			unit: "компл.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("950.00"),
			mandatory: true,
		},
	],
};
