import type { ProcedureCatalogServiceNorm } from "../clinicalWriteoffPresets.js";

export const SERVICE_NORMS_SURGERY_IMPLANT: readonly ProcedureCatalogServiceNorm[] = [
	{
		serviceCode: "A16.07.054",
		serviceTitle: "Внутрикостная дентальная имплантация (установка титанового имплантата)",
		specialty: "implantology",
		descriptionRu: "Хирургический протокол формирования костного ложа, установка имплантата, фиксация формирователя десны и наложение швов",
		standardDurationMinutes: 60,
		materials: [
			{ materialId: "mat_implant_osstem_ts3", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Дентальный имплантат Osstem TS III с серийным номером" },
			{ materialId: "mat_healing_abutment", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Формирователь десны на платформу имплантата" },
			{ materialId: "mat_surg_drape_gown_set", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Стерильное операционное накрытие" },
			{ materialId: "mat_suture_vicryl_40", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Шовный материал Викрил / Монофил 4-0" },
			{ materialId: "mat_surg_blade_15", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Стерильное лезвие скальпеля №15" },
			{ materialId: "mat_saline_500ml", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Охлаждающий физраствор" },
		],
	},
	{
		serviceCode: "A16.07.001.001",
		serviceTitle: "Удаление постоянного зуба (атравматичное с ревизией лунки)",
		specialty: "surgery",
		descriptionRu: "Атравматичная люксация, кюретаж лунки, гемостаз коллагеновой губкой и наложение швов",
		standardDurationMinutes: 35,
		materials: [
			{ materialId: "mat_hemostatic_sponge", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Коллагеновая гемостатическая губка Альвостаз" },
			{ materialId: "mat_suture_vicryl_40", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 шов Викрил 4-0 для фиксации краев лунки" },
			{ materialId: "mat_surg_blade_15", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Лезвие скальпеля №15" },
		],
	},
	{
		serviceCode: "A16.07.055",
		serviceTitle: "Синус-лифтинг и направленная костная регенерация (НКР / Bio-Oss + Bio-Gide)",
		specialty: "implantology",
		descriptionRu: "Костная пластика с внесением костного графта Geistlich Bio-Oss и фиксацией мембраны Geistlich Bio-Gide",
		standardDurationMinutes: 75,
		materials: [
			{ materialId: "mat_bio_oss_graft", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 упаковка (0.5 г) графта Geistlich Bio-Oss" },
			{ materialId: "mat_bio_gide_membrane", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 мембрана Geistlich Bio-Gide 25×25 мм" },
			{ materialId: "mat_prolene_50", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 шов Пролен 5-0 для герметичного ушивания лоскута" },
			{ materialId: "mat_suture_vicryl_40", standardQuantity: 1, isMandatory: false, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "1 шов Викрил 4-0 для фиксации сосочков" },
			{ materialId: "mat_articaine_ultracain", standardQuantity: 2, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "2 карпулы артикаина 4% с эпинефрином" },
			{ materialId: "mat_surg_blade_15", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Микрохирургическое лезвие №15" },
			{ materialId: "mat_surg_drape_gown_set", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Стерильный операционный набор СИЗ" },
		],
	},
];
