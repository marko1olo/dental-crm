import type { ProcedureCatalogServiceNorm } from "../clinicalWriteoffPresets.js";

export const SERVICE_NORMS_THERAPY: readonly ProcedureCatalogServiceNorm[] = [
	{
		serviceCode: "A16.07.002.001",
		serviceTitle: "Наложение пломбы из фотополимерного композита при лечении кариозных полостей",
		specialty: "therapy",
		descriptionRu: "Препарирование кариозной полости, адгезивный протокол, послойное внесение композита и финишная полировка",
		standardDurationMinutes: 45,
		materials: [
			{ materialId: "mat_articaine_ultracain", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 карпула (1.7 мл) местного анестетика артикаинового ряда" },
			{ materialId: "mat_dental_needle_30g", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 карпульная игла 30G евростандарт 25 мм" },
			{ materialId: "mat_cofferdam_sheet", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Платок коффердама для абсолютной изоляции рабочего поля" },
			{ materialId: "mat_matrix_sectional_system", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Секционная 3D матрица и анатомический клин" },
			{ materialId: "mat_dental_burs_set", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Алмазный турбинный бор для препарирования" },
			{ materialId: "mat_filtek_ultimate", standardQuantity: 0.3, isMandatory: true, defaultDiscrepancyAllowedPercent: 30, clinicalRationaleRu: "0.3 г наногибридного композита на среднюю кариозную полость" },
			{ materialId: "mat_single_bond_universal", standardQuantity: 0.05, isMandatory: true, defaultDiscrepancyAllowedPercent: 20, clinicalRationaleRu: "1 капля самопротравливающего адгезива" },
			{ materialId: "mat_phosphoric_acid_37", standardQuantity: 0.1, isMandatory: true, defaultDiscrepancyAllowedPercent: 20, clinicalRationaleRu: "Селективное протравливание эмалевого края" },
			{ materialId: "mat_polishing_enhance", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Финишная обработка контура пломбы" },
			{ materialId: "mat_saliva_ejector", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Эвакуация слюны на время постановки пломбы" },
			{ materialId: "mat_cotton_rolls", standardQuantity: 4, isMandatory: true, defaultDiscrepancyAllowedPercent: 50, clinicalRationaleRu: "Изоляция рабочего поля" },
			{ materialId: "mat_nitrile_gloves", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 пара нитриловых перчаток врача" },
			{ materialId: "mat_surgical_mask", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 маска защитная трехслойная" },
		],
	},
	{
		serviceCode: "A16.07.004",
		serviceTitle: "Анестезия местная инфильтрационная / проводниковая",
		specialty: "general",
		descriptionRu: "Обезболивание зоны манипуляции раствором артикаина с адреналином",
		standardDurationMinutes: 10,
		materials: [
			{ materialId: "mat_articaine_ultracain", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 карпула (1.7 мл) Ультракаина Д-С" },
			{ materialId: "mat_dental_needle_30g", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 карпульная игла 30G евростандарт" },
			{ materialId: "mat_topical_anesthesia_gel", standardQuantity: 0.2, isMandatory: false, defaultDiscrepancyAllowedPercent: 50, clinicalRationaleRu: "Аппликационный гель для комфортного вкола иглы" },
		],
	},
	{
		serviceCode: "A16.07.030.001",
		serviceTitle: "Анестезия инфильтрационная в стоматологии",
		specialty: "general",
		descriptionRu: "Инфильтрационное обезболивание периапикальной зоны с предварительной аппликационной анестезией",
		standardDurationMinutes: 10,
		materials: [
			{ materialId: "mat_articaine_ultracain", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 карпула (1.7 мл) артикаина 4% с эпинефрином" },
			{ materialId: "mat_dental_needle_30g", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 карпульная игла тонкостенная 30G" },
			{ materialId: "mat_topical_anesthesia_gel", standardQuantity: 0.2, isMandatory: false, defaultDiscrepancyAllowedPercent: 50, clinicalRationaleRu: "0.2 г аппликационного геля бензокаина" },
			{ materialId: "mat_cotton_rolls", standardQuantity: 2, isMandatory: true, defaultDiscrepancyAllowedPercent: 50, clinicalRationaleRu: "2 ватных валика для высушивания слизистой" },
		],
	},
];
