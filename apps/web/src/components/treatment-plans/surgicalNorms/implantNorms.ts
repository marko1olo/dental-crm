/**
 * apps/web/src/components/treatment-plans/surgicalNorms/implantNorms.ts
 *
 * Нормы расхода материалов для дентальной имплантации и протезирования на имплантатах.
 */

import type { ProcedureMaterialNorm } from "../types";

export const implantNorms: Record<string, readonly ProcedureMaterialNorm[]> = {
	"A16.07.054.001": [
		{
			id: "norm-implant-fixture",
			materialName: "Дентальный титановый имплантат с микрошероховатой поверхностью (SLA/SLActive)",
			category: "Имплантаты",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 11800,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-implant-abutment",
			materialName: "Титановый формирователь десны (Healing Abutment)",
			category: "Имплантаты",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 2200,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-implant-drapes",
			materialName: "Стерильное операционное белье хирургического протокола",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "компл.",
			defaultUnitCostRub: 550,
			mandatory: true,
		},
		{
			id: "norm-implant-saline",
			materialName: "Стерильный физиологический раствор NaCl 0.9% 500мл для физиодиспенсера",
			category: "Расходные материалы",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 180,
			mandatory: true,
		},
		{
			id: "norm-implant-suture",
			materialName: "Шовный материал полиамидный монофиламент Dafilon 5-0",
			category: "Хирургия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 310,
			mandatory: true,
		},
	],

	"A16.07.006": [
		{
			id: "norm-impcrown-scanbody",
			materialName: "Скан-боди / трансфер оттискной для открытой ложки",
			category: "Ортопедия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 950,
			mandatory: true,
		},
		{
			id: "norm-impcrown-screw",
			materialName: "Клинический титановый винт фиксации абатмента (Torque 30 Ncm)",
			category: "Имплантаты",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 1400,
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "norm-impcrown-teflon",
			materialName: "Лента тефлоновая стерильная для шахты винта",
			category: "Ортопедия",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 45,
			mandatory: true,
		},
		{
			id: "norm-impcrown-composite",
			materialName: "Текучий композит светоотверждаемый для герметизации шахты",
			category: "Терапия",
			quantityPerProcedure: 0.2,
			unitOfMeasure: "г",
			defaultUnitCostRub: 220,
			mandatory: true,
		},
	],
};
