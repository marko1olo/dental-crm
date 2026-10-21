import type { ProcedureMaterialNorm } from "../types";

export const ENDO_OBTURATON_NORMS: Record<string, readonly ProcedureMaterialNorm[]> = {
	// A16.07.008.001: 1 канал / Пульпотомия временного зуба
	"A16.07.008.001": [
		{ id: "norm-obt1-gutta", materialName: "Гуттаперчевые конусные штифты калиброванные 0.04/0.06", category: "Эндодонтия", quantityPerProcedure: 1, unitOfMeasure: "шт.", defaultUnitCostRub: 60, mandatory: true },
		{ id: "norm-obt1-sealer", materialName: "Биокерамический силер для 3D-обтурации (TotalFill / AH Plus)", category: "Эндодонтия", quantityPerProcedure: 0.1, unitOfMeasure: "г", defaultUnitCostRub: 1400, mandatory: true },
		{ id: "norm-obt1-paper-points", materialName: "Штифты бумажные абсорбирующие стерильные", category: "Эндодонтия", quantityPerProcedure: 2, unitOfMeasure: "шт.", defaultUnitCostRub: 15, mandatory: true },
		{ id: "norm-pulpotomy-biodentine", materialName: "Биоактивный заменитель дентина Septodont Biodentine / ProRoot MTA", category: "Детская терапия", quantityPerProcedure: 1, unitOfMeasure: "порц.", defaultUnitCostRub: 1450, mandatory: true, lotTrackingRequired: true },
	],

	// A16.07.008.002: 2 канала
	"A16.07.008.002": [
		{ id: "norm-endo-files", materialName: "Машинные никель-титановые ротационные файлы WaveOne Gold / ProTaper", category: "Эндодонтия", quantityPerProcedure: 1, unitOfMeasure: "шт.", defaultUnitCostRub: 850, mandatory: true },
		{ id: "norm-endo-hypochlorite", materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации", category: "Дезинфекция", quantityPerProcedure: 25, unitOfMeasure: "мл", defaultUnitCostRub: 6, mandatory: true },
		{ id: "norm-endo-edta", materialName: "Гель ЭДТА 17% для расширения каналов (Endo-Prep)", category: "Эндодонтия", quantityPerProcedure: 1, unitOfMeasure: "мл", defaultUnitCostRub: 90, mandatory: true },
		{ id: "norm-endo-gutta", materialName: "Гуттаперчевые конусные штифты калиброванные 0.04/0.06", category: "Эндодонтия", quantityPerProcedure: 2, unitOfMeasure: "шт.", defaultUnitCostRub: 60, mandatory: true },
		{ id: "norm-endo-sealer", materialName: "Биокерамический силер для 3D-обтурации (TotalFill / AH Plus)", category: "Эндодонтия", quantityPerProcedure: 0.2, unitOfMeasure: "г", defaultUnitCostRub: 1400, mandatory: true },
		{ id: "norm-endo-anesthesia", materialName: "Анестетик артикаиновый 4% форте 1:100000", category: "Анестезия", quantityPerProcedure: 2, unitOfMeasure: "карп.", defaultUnitCostRub: 195, mandatory: true, lotTrackingRequired: true },
		{ id: "norm-endo-paper-points", materialName: "Штифты бумажные абсорбирующие стерильные", category: "Эндодонтия", quantityPerProcedure: 6, unitOfMeasure: "шт.", defaultUnitCostRub: 15, mandatory: true },
	],

	// A16.07.008.003: 3 канала
	"A16.07.008.003": [
		{ id: "norm-obt3-gutta", materialName: "Гуттаперчевые конусные штифты калиброванные 0.04/0.06", category: "Эндодонтия", quantityPerProcedure: 3, unitOfMeasure: "шт.", defaultUnitCostRub: 60, mandatory: true },
		{ id: "norm-obt3-sealer", materialName: "Биокерамический силер для 3D-обтурации (TotalFill / AH Plus)", category: "Эндодонтия", quantityPerProcedure: 0.3, unitOfMeasure: "г", defaultUnitCostRub: 1400, mandatory: true },
		{ id: "norm-obt3-paper-points", materialName: "Штифты бумажные абсорбирующие стерильные", category: "Эндодонтия", quantityPerProcedure: 6, unitOfMeasure: "шт.", defaultUnitCostRub: 15, mandatory: true },
	],

	// A16.07.008.004: 4 канала
	"A16.07.008.004": [
		{ id: "norm-obt4-gutta", materialName: "Гуттаперчевые конусные штифты калиброванные 0.04/0.06", category: "Эндодонтия", quantityPerProcedure: 4, unitOfMeasure: "шт.", defaultUnitCostRub: 60, mandatory: true },
		{ id: "norm-obt4-sealer", materialName: "Биокерамический силер для 3D-обтурации (TotalFill / AH Plus)", category: "Эндодонтия", quantityPerProcedure: 0.4, unitOfMeasure: "г", defaultUnitCostRub: 1400, mandatory: true },
		{ id: "norm-obt4-paper-points", materialName: "Штифты бумажные абсорбирующие стерильные", category: "Эндодонтия", quantityPerProcedure: 8, unitOfMeasure: "шт.", defaultUnitCostRub: 15, mandatory: true },
	],
};
