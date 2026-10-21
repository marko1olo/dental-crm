import type { ProcedureMaterialNorm } from "../types";

export const ENDO_PREP_NORMS: Record<string, readonly ProcedureMaterialNorm[]> = {
	// A16.07.030.001: 1-канальный зуб
	"A16.07.030.001": [
		{ id: "norm-prep1-files", materialName: "Машинные никель-титановые ротационные файлы WaveOne Gold / ProTaper", category: "Эндодонтия", quantityPerProcedure: 1, unitOfMeasure: "шт.", defaultUnitCostRub: 850, mandatory: true },
		{ id: "norm-prep1-hypochlorite", materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации", category: "Дезинфекция", quantityPerProcedure: 15, unitOfMeasure: "мл", defaultUnitCostRub: 6, mandatory: true },
		{ id: "norm-prep1-edta", materialName: "Гель ЭДТА 17% для расширения каналов (Endo-Prep)", category: "Эндодонтия", quantityPerProcedure: 0.5, unitOfMeasure: "мл", defaultUnitCostRub: 90, mandatory: true },
		{ id: "norm-prep1-paper-points", materialName: "Штифты бумажные абсорбирующие стерильные", category: "Эндодонтия", quantityPerProcedure: 3, unitOfMeasure: "шт.", defaultUnitCostRub: 15, mandatory: true },
		{ id: "norm-prep1-anesthesia", materialName: "Анестетик артикаиновый 4% форте 1:100000", category: "Анестезия", quantityPerProcedure: 1, unitOfMeasure: "карп.", defaultUnitCostRub: 195, mandatory: true, lotTrackingRequired: true },
	],

	// A16.07.030.002: 2-канальный зуб
	"A16.07.030.002": [
		{ id: "norm-prep2-files", materialName: "Машинные никель-титановые ротационные файлы WaveOne Gold / ProTaper", category: "Эндодонтия", quantityPerProcedure: 1, unitOfMeasure: "шт.", defaultUnitCostRub: 850, mandatory: true },
		{ id: "norm-prep2-hypochlorite", materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации", category: "Дезинфекция", quantityPerProcedure: 20, unitOfMeasure: "мл", defaultUnitCostRub: 6, mandatory: true },
		{ id: "norm-prep2-edta", materialName: "Гель ЭДТА 17% для расширения каналов (Endo-Prep)", category: "Эндодонтия", quantityPerProcedure: 1, unitOfMeasure: "мл", defaultUnitCostRub: 90, mandatory: true },
		{ id: "norm-prep2-paper-points", materialName: "Штифты бумажные абсорбирующие стерильные", category: "Эндодонтия", quantityPerProcedure: 6, unitOfMeasure: "шт.", defaultUnitCostRub: 15, mandatory: true },
		{ id: "norm-prep2-anesthesia", materialName: "Анестетик артикаиновый 4% форте 1:100000", category: "Анестезия", quantityPerProcedure: 1, unitOfMeasure: "карп.", defaultUnitCostRub: 195, mandatory: true, lotTrackingRequired: true },
	],

	// A16.07.030.003: 3-канальный зуб
	"A16.07.030.003": [
		{ id: "norm-prep3-files", materialName: "Машинные никель-титановые ротационные файлы WaveOne Gold / ProTaper", category: "Эндодонтия", quantityPerProcedure: 1, unitOfMeasure: "шт.", defaultUnitCostRub: 850, mandatory: true },
		{ id: "norm-prep3-hypochlorite", materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации", category: "Дезинфекция", quantityPerProcedure: 25, unitOfMeasure: "мл", defaultUnitCostRub: 6, mandatory: true },
		{ id: "norm-prep3-edta", materialName: "Гель ЭДТА 17% для расширения каналов (Endo-Prep)", category: "Эндодонтия", quantityPerProcedure: 1.5, unitOfMeasure: "мл", defaultUnitCostRub: 90, mandatory: true },
		{ id: "norm-prep3-paper-points", materialName: "Штифты бумажные абсорбирующие стерильные", category: "Эндодонтия", quantityPerProcedure: 9, unitOfMeasure: "шт.", defaultUnitCostRub: 15, mandatory: true },
		{ id: "norm-prep3-anesthesia", materialName: "Анестетик артикаиновый 4% форте 1:100000", category: "Анестезия", quantityPerProcedure: 2, unitOfMeasure: "карп.", defaultUnitCostRub: 195, mandatory: true, lotTrackingRequired: true },
	],

	// A16.07.030.004: 4-канальный зуб
	"A16.07.030.004": [
		{ id: "norm-prep4-files", materialName: "Машинные никель-титановые ротационные файлы WaveOne Gold / ProTaper", category: "Эндодонтия", quantityPerProcedure: 2, unitOfMeasure: "шт.", defaultUnitCostRub: 850, mandatory: true },
		{ id: "norm-prep4-hypochlorite", materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации", category: "Дезинфекция", quantityPerProcedure: 30, unitOfMeasure: "мл", defaultUnitCostRub: 6, mandatory: true },
		{ id: "norm-prep4-edta", materialName: "Гель ЭДТА 17% для расширения каналов (Endo-Prep)", category: "Эндодонтия", quantityPerProcedure: 2.0, unitOfMeasure: "мл", defaultUnitCostRub: 90, mandatory: true },
		{ id: "norm-prep4-paper-points", materialName: "Штифты бумажные абсорбирующие стерильные", category: "Эндодонтия", quantityPerProcedure: 12, unitOfMeasure: "шт.", defaultUnitCostRub: 15, mandatory: true },
		{ id: "norm-prep4-anesthesia", materialName: "Анестетик артикаиновый 4% форте 1:100000", category: "Анестезия", quantityPerProcedure: 2, unitOfMeasure: "карп.", defaultUnitCostRub: 195, mandatory: true, lotTrackingRequired: true },
	],
};
