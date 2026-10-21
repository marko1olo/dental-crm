import type { ProcedureMaterialNorm } from "../types";

export const ENDO_SPECIAL_NORMS: Record<string, readonly ProcedureMaterialNorm[]> = {
	// A16.07.091: Временное пломбирование Ca(OH)2
	"A16.07.091": [
		{ id: "norm-caoh2-paste", materialName: "Лечебная гидроокись кальция UltraCal XS с радиопаком", category: "Эндодонтия", quantityPerProcedure: 0.5, unitOfMeasure: "мл", defaultUnitCostRub: 380, mandatory: true },
		{ id: "norm-caoh2-temp-fill", materialName: "Временный пломбировочный материал безэвгенольный Cavit / Дентин-паста", category: "Терапия", quantityPerProcedure: 0.3, unitOfMeasure: "г", defaultUnitCostRub: 80, mandatory: true },
		{ id: "norm-caoh2-paper-points", materialName: "Штифты бумажные абсорбирующие стерильные", category: "Эндодонтия", quantityPerProcedure: 3, unitOfMeasure: "шт.", defaultUnitCostRub: 15, mandatory: true },
	],

	// A16.07.082: Распломбирование корневого канала зуба
	"A16.07.082": [
		{ id: "norm-unseal-solvent", materialName: "Органический растворитель гуттаперчи D-Solv / Эндосольв", category: "Эндодонтия", quantityPerProcedure: 0.5, unitOfMeasure: "мл", defaultUnitCostRub: 220, mandatory: true },
		{ id: "norm-unseal-files", materialName: "Машинные ретритмент-файлы для распломбирования ProTaper D1-D3", category: "Эндодонтия", quantityPerProcedure: 1, unitOfMeasure: "шт.", defaultUnitCostRub: 920, mandatory: true },
		{ id: "norm-unseal-hypochlorite", materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации", category: "Дезинфекция", quantityPerProcedure: 15, unitOfMeasure: "мл", defaultUnitCostRub: 6, mandatory: true },
	],

	// A16.07.009.001: Лечение периодонтита
	"A16.07.009.001": [
		{ id: "norm-perio-calcium", materialName: "Лечебная гидроокись кальция UltraCal XS с радиопаком", category: "Эндодонтия", quantityPerProcedure: 0.5, unitOfMeasure: "мл", defaultUnitCostRub: 380, mandatory: true },
		{ id: "norm-perio-chlorhexidine", materialName: "Хлоргексидина биглюконат 2% для финишной антисептики", category: "Дезинфекция", quantityPerProcedure: 15, unitOfMeasure: "мл", defaultUnitCostRub: 8, mandatory: true },
		{ id: "norm-perio-files", materialName: "Файлы ротационные Ni-Ti Reciproc Blue", category: "Эндодонтия", quantityPerProcedure: 1, unitOfMeasure: "шт.", defaultUnitCostRub: 890, mandatory: true },
		{ id: "norm-perio-gutta-sealer", materialName: "Гуттаперча термопластическая + биокерамика CeraSeal", category: "Эндодонтия", quantityPerProcedure: 1, unitOfMeasure: "компл.", defaultUnitCostRub: 550, mandatory: true },
	],
};
