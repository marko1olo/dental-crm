/**
 * apps/web/src/components/treatment-plans/surgicalNorms/graftAndGuideNorms.ts
 *
 * Нормы расхода материалов для костной пластики и хирургических шаблонов.
 */

import type { ProcedureMaterialNorm } from "../types";

export const graftAndGuideNorms: Record<string, readonly ProcedureMaterialNorm[]> = {
	"A16.07.041": [
		{
			id: "norm-graft-bone",
			materialName: "Ксеногенный натуральный костный графт Geistlich Bio-Oss (гранулы 0.5cc)",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "упак.",
			defaultUnitCostRub: 8900,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-graft-membrane",
			materialName: "Резорбируемая двухслойная коллагеновая мембрана Geistlich Bio-Gide 25x25мм",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 11500,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-graft-pins",
			materialName: "Титановые пины для фиксации мембраны Frios / Meisinger",
			category: "Хирургия",
			quantityPerProcedure: 2,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 650,
			mandatory: true,
		},
		{
			id: "norm-graft-suture",
			materialName: "Шовный материал монофиламентный PTFE Seralene 5-0",
			category: "Хирургия",
			quantityPerProcedure: 2,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 420,
			mandatory: true,
		},
	],

	"A16.07.054": [
		{
			id: "norm-guide-photopolymer",
			materialName: "Биосовместимый полимер для 3D-печати Formlabs Dental SG / NextDent",
			category: "Лаборатория",
			quantityPerProcedure: 30,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 65,
			mandatory: true,
		},
		{
			id: "norm-guide-sleeves",
			materialName: "Титановые направляющие втулки (Sleeves) для навигационной хирургии",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 750,
			mandatory: true,
		},
	],
};
