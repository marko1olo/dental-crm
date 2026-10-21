import type { ProcedureMaterialNorm } from "../types";

export const HYGIENE_NORMS: Record<string, readonly ProcedureMaterialNorm[]> = {
	// A06.07.004: КЛКТ 3D диагностика
	"A06.07.004": [
		{
			id: "norm-ct-protective-cover",
			materialName: "Одноразовый чехол для позиционера томографа",
			category: "Расходные материалы",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 35,
			mandatory: true,
			hideInPatientPresentation: true,
		},
		{
			id: "norm-ct-antiseptic-wipe",
			materialName: "Дезинфицирующая салфетка спиртовая Саникон",
			category: "Дезинфекция",
			quantityPerProcedure: 2,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 15,
			mandatory: true,
			hideInPatientPresentation: true,
		},
	],

	// A16.07.051: Профессиональная гигиена полости рта (Air-Flow + УЗ)
	"A16.07.051": [
		{
			id: "norm-hyg-powder",
			materialName: "Порошок для Air-Flow глициновый (EMS Plus / Clinpro)",
			category: "Гигиена",
			quantityPerProcedure: 25,
			unitOfMeasure: "г",
			defaultUnitCostRub: 18,
			mandatory: true,
		},
		{
			id: "norm-hyg-prophy-paste",
			materialName: "Полировочная паста Cleanic / Detartrine",
			category: "Гигиена",
			quantityPerProcedure: 3,
			unitOfMeasure: "г",
			defaultUnitCostRub: 40,
			mandatory: true,
		},
		{
			id: "norm-hyg-brush",
			materialName: "Щетка полировочная циркулярная нейлоновая",
			category: "Расходные материалы",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 65,
			mandatory: true,
		},
		{
			id: "norm-hyg-varnish",
			materialName: "Фторлак защитный Clinpro White Varnish",
			category: "Профилактика",
			quantityPerProcedure: 0.5,
			unitOfMeasure: "мл",
			defaultUnitCostRub: 320,
			mandatory: true,
		},
		{
			id: "norm-hyg-optoragate",
			materialName: "Роторасширитель мягкий OptraGate (Ivoclar)",
			category: "Расходные материалы",
			quantityPerProcedure: 1,
			unitOfMeasure: "шт.",
			defaultUnitCostRub: 210,
			mandatory: true,
		},
	],
};
