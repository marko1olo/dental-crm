import type { ProcedureCatalogServiceNorm } from "../clinicalWriteoffPresets.js";

export const SERVICE_NORMS_ENDO_HYGIENE: readonly ProcedureCatalogServiceNorm[] = [
	{
		serviceCode: "A16.07.008",
		serviceTitle: "Пломбирование корневого канала зуба гуттаперчевыми штифтами",
		specialty: "endodontics",
		descriptionRu: "Антисептическая обработка, ирригация, калибровка мастер-штифта и постоянная обтурация силером AH Plus",
		standardDurationMinutes: 60,
		materials: [
			{ materialId: "mat_gutta_percha_points", standardQuantity: 3, isMandatory: true, defaultDiscrepancyAllowedPercent: 33, clinicalRationaleRu: "3 конусных штифта (.04/.06) на 1 корневой канал" },
			{ materialId: "mat_sealer_ah_plus", standardQuantity: 0.1, isMandatory: true, defaultDiscrepancyAllowedPercent: 30, clinicalRationaleRu: "0.1 г эпоксидного силера AH Plus на 1 корневой канал" },
			{ materialId: "mat_hypochlorite_na_3", standardQuantity: 10, isMandatory: true, defaultDiscrepancyAllowedPercent: 50, clinicalRationaleRu: "10 мл гипохлорита натрия 3% для ирригации" },
			{ materialId: "mat_edta_gel_17", standardQuantity: 3, isMandatory: true, defaultDiscrepancyAllowedPercent: 30, clinicalRationaleRu: "3 мл 17% геля ЭДТА" },
			{ materialId: "mat_endo_needle_side_vent", standardQuantity: 2, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "2 эндодонтические иглы с боковым спилом" },
			{ materialId: "mat_paper_points", standardQuantity: 4, isMandatory: true, defaultDiscrepancyAllowedPercent: 50, clinicalRationaleRu: "Бумажные пины для осушения" },
		],
	},
	{
		serviceCode: "A16.07.051",
		serviceTitle: "Профессиональная гигиена полости рта и зубов (Air-Flow + УЗ)",
		specialty: "hygiene",
		descriptionRu: "Ультразвуковой скейлинг, порошкоструйная чистка Air-Flow, полировка пастой и глубокое фторирование",
		standardDurationMinutes: 50,
		materials: [
			{ materialId: "mat_air_flow_powder", standardQuantity: 25, isMandatory: true, defaultDiscrepancyAllowedPercent: 20, clinicalRationaleRu: "25 г глицинового порошка Clinpro на полный зубной ряд" },
			{ materialId: "mat_prophy_paste", standardQuantity: 3, isMandatory: true, defaultDiscrepancyAllowedPercent: 30, clinicalRationaleRu: "3 г полировочной пасты Cleanic" },
			{ materialId: "mat_optragate", standardQuantity: 1, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Мягкий ретрактор OptraGate" },
			{ materialId: "mat_fluoride_varnish", standardQuantity: 0.5, isMandatory: true, defaultDiscrepancyAllowedPercent: 0, clinicalRationaleRu: "Флакон 0.5 мл Clinpro White Varnish" },
		],
	},
];
