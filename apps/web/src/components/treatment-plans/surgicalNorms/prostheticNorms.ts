/**
 * apps/web/src/components/treatment-plans/surgicalNorms/prostheticNorms.ts
 *
 * Нормы расхода материалов для коронок и керамических вкладок.
 */

import type { ProcedureMaterialNorm } from "../types";

export const prostheticNorms: Record<string, readonly ProcedureMaterialNorm[]> = {
	"A16.07.004.001": [
		{
			id: "norm-crown-silicone",
			materialName: "Слепочная масса А-силикон прецизионная (Honigum / Express XT)",
			category: "Ортопедия",
			quantityPerProcedure: 1,
			unitOfMeasure: "порц.",
			defaultUnitCostRub: 850,
			mandatory: true,
		},
		{
			id: "norm-crown-retraction-cord",
			materialName: "Ретракционная нить вязаная с пропиткой UltraPak #00",
			category: "Ортопедия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 120,
			mandatory: true,
		},
		{
			id: "norm-crown-temp-cement",
			materialName: "Цемент временный безэвгенольный Temp-Bond NE",
			category: "Ортопедия",
			quantityPerProcedure: 0.5,
			unitOfMeasure: "г",
			defaultUnitCostRub: 160,
			mandatory: true,
		},
		{
			id: "norm-crown-perm-cement",
			materialName: "Самоадгезивный композитный цемент RelyX U200 / Maxcem",
			category: "Ортопедия",
			quantityPerProcedure: 0.5,
			unitOfMeasure: "г",
			defaultUnitCostRub: 520,
			mandatory: true,
		},
	],

	"A16.07.003": [
		{
			id: "norm-inlay-adhesive-system",
			materialName: "Адгезивная система Variolink Esthetic DC / Panavia V5",
			category: "Ортопедия",
			quantityPerProcedure: 1,
			unitOfMeasure: "компл.",
			defaultUnitCostRub: 1200,
			mandatory: true,
		},
		{
			id: "norm-inlay-silane",
			materialName: "Силан праймер для керамики Monobond Plus",
			category: "Ортопедия",
			quantityPerProcedure: 0.1,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 450,
			mandatory: true,
		},
		{
			id: "norm-inlay-rubberdam",
			materialName: "Коффердам сверхэластичный плотный",
			category: "Изоляция",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 120,
			mandatory: true,
		},
	],
};
