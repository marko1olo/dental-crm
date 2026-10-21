/**
 * apps/web/src/components/treatment-plans/surgicalNorms/extractionNorms.ts
 *
 * Нормы расхода материалов для простого и сложного удаления зубов.
 */

import type { ProcedureMaterialNorm } from "../types";

export const extractionNorms: Record<string, readonly ProcedureMaterialNorm[]> = {
	"A16.07.001.001": [
		{
			id: "norm-ext-sponge",
			materialName: "Гемостатическая коллагеновая губка Alveostim / Parasorb Cone",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 310,
			mandatory: true,
		},
		{
			id: "norm-ext-suture",
			materialName: "Шовный материал нерассасывающийся PTFE / Пролен 4-0 с колющей иглой",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 290,
			mandatory: true,
		},
		{
			id: "norm-ext-anesthesia",
			materialName: "Анестетик артикаиновый 4% 1:100000",
			category: "Анестезия",
			quantityPerProcedure: 2,
			unitOfMeasure: "карп.",
			defaultUnitCostRub: 195,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-ext-drape",
			materialName: "Стерильный комплект хирургического покрытия пациента",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "компл.",
			defaultUnitCostRub: 350,
			mandatory: true,
		},
	],

	"A16.07.001.002": [
		{
			id: "norm-cplx-ext-blade",
			materialName: "Микрохирургическое лезвие Swann-Morton № 15C стерильное",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 85,
			mandatory: true,
		},
		{
			id: "norm-cplx-ext-bur",
			materialName: "Твердосплавный трепанационный бор Lindemann Lind-01",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 420,
			mandatory: true,
		},
		{
			id: "norm-cplx-ext-sponge",
			materialName: "Коллагеновый конус с ионами серебра Parasorb Cone",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 480,
			mandatory: true,
		},
		{
			id: "norm-cplx-ext-suture",
			materialName: "Шовный материал полигликолид PGA 4-0 рассасывающийся",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 340,
			mandatory: true,
		},
		{
			id: "norm-cplx-ext-anesthesia",
			materialName: "Анестетик артикаиновый 4% 1:100000",
			category: "Анестезия",
			quantityPerProcedure: 3,
			unitOfMeasure: "карп.",
			defaultUnitCostRub: 195,
			mandatory: true,
			lotTrackingRequired: true,
		},
	],
};
