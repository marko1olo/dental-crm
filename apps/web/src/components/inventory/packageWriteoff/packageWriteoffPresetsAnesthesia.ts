import type { ClinicalWriteoffPackage } from "./packageWriteoffTypes.js";

export const ANESTHESIA_PACKAGE: ClinicalWriteoffPackage = {
	id: "anesthesia",
	title: "Стандартная анестезия",
	description: "Артикаин 1:100 000 (1.7 мл) + карпульная игла 30G + ватные валики (4 шт.)",
	buttonClass: "btn-writeoff-anesthesia-packet",
	testId: "btn-writeoff-anesthesia-packet",
	items: [
		{
			id: "art_100k_carpule", sku: "MED-ANES-01", nameRu: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)",
			category: "anesthesia", unit: "карп.", standardQuantity: 1, unitCostKopecks: 14500,
			defaultLotNumber: "LOT-ART-2026", defaultExpDate: "2027-08",
		},
		{
			id: "dental_needle_30g", sku: "MED-NEEDLE-30G", nameRu: "Игла карпульная стоматологическая 30G евростандарт 25 мм",
			category: "anesthesia", unit: "шт.", standardQuantity: 1, unitCostKopecks: 2500,
			defaultLotNumber: "LOT-NDL-2026", defaultExpDate: "2028-01",
		},
		{
			id: "cotton_rolls_sterile", sku: "MED-ROLL-02", nameRu: "Ватные валики стоматологические стерильные №2",
			category: "ppe", unit: "шт.", standardQuantity: 4, unitCostKopecks: 300,
		},
		{
			id: "antiseptic_alcohol_wipe", sku: "MED-WIPE-01", nameRu: "Антисептическая спиртовая салфетка стерильная",
			category: "auxiliary", unit: "шт.", standardQuantity: 1, unitCostKopecks: 500,
		},
	],
};

export const FILLING_PACKAGE: ClinicalWriteoffPackage = {
	id: "filling",
	title: "Пломба световая (Терапия)",
	description: "СИЗ + Крафт + анестетик + нанокомпозит + адгезив + матрица",
	buttonClass: "btn-writeoff-filling-packet",
	testId: "btn-writeoff-filling-packet",
	items: [
		{
			id: "art_100k_carpule", sku: "MED-ANES-01", nameRu: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)",
			category: "anesthesia", unit: "карп.", standardQuantity: 1, unitCostKopecks: 14500,
			defaultLotNumber: "LOT-ART-2026", defaultExpDate: "2027-08",
		},
		{
			id: "dental_needle_30g", sku: "MED-NEEDLE-30G", nameRu: "Игла карпульная стоматологическая 30G евростандарт 25 мм",
			category: "anesthesia", unit: "шт.", standardQuantity: 1, unitCostKopecks: 2500,
		},
		{
			id: "nitrile_gloves_pair", sku: "MED-GLOVE-M", nameRu: "Перчатки смотровые нитриловые неопудренные (пара)",
			category: "ppe", unit: "пар", standardQuantity: 2, unitCostKopecks: 3500,
		},
		{
			id: "medical_face_mask", sku: "MED-MASK-01", nameRu: "Маска защитная медицинская трехслойная",
			category: "ppe", unit: "шт.", standardQuantity: 2, unitCostKopecks: 1200,
		},
		{
			id: "saliva_ejector", sku: "MED-EJECT-01", nameRu: "Слюноотсос одноразовый стоматологический",
			category: "ppe", unit: "шт.", standardQuantity: 1, unitCostKopecks: 1400,
		},
		{
			id: "patient_bib", sku: "MED-BIB-01", nameRu: "Салфетка нагрудная стоматологическая двухслойная",
			category: "ppe", unit: "шт.", standardQuantity: 1, unitCostKopecks: 800,
		},
		{
			id: "cotton_rolls_sterile", sku: "MED-ROLL-02", nameRu: "Ватные валики стоматологические стерильные №2",
			category: "ppe", unit: "шт.", standardQuantity: 6, unitCostKopecks: 300,
		},
		{
			id: "composite_nano_shade", sku: "MAT-COMP-01", nameRu: "Светоотверждаемый нанокомпозит (Filtek / Estelite)",
			category: "composite", unit: "г", standardQuantity: 0.2, unitCostKopecks: 38000,
		},
		{
			id: "dental_adhesive_universal", sku: "MAT-ADH-01", nameRu: "Адгезив стоматологический универсальный светоотверждаемый",
			category: "composite", unit: "мл", standardQuantity: 0.1, unitCostKopecks: 15000,
		},
		{
			id: "phosphoric_etching_gel", sku: "MAT-ETCH-01", nameRu: "Гель протравочный ортофосфорный 37%",
			category: "composite", unit: "мл", standardQuantity: 0.2, unitCostKopecks: 2500,
		},
		{
			id: "sectional_matrix", sku: "MAT-MATR-01", nameRu: "Секционная матрица контурная металлизированная",
			category: "auxiliary", unit: "шт.", standardQuantity: 1, unitCostKopecks: 4500,
		},
	],
};

export const HYGIENE_PACKAGE: ClinicalWriteoffPackage = {
	id: "hygiene",
	title: "Профгигиена",
	description: "СИЗ + Крафт + Оптрагейт + порошок Air-Flow + паста + щетка + валики",
	buttonClass: "btn-writeoff-hygiene-packet",
	testId: "btn-writeoff-hygiene-packet",
	items: [
		{ id: "nitrile_gloves_pair", sku: "MED-GLOVE-M", nameRu: "Перчатки смотровые нитриловые неопудренные (пара)", category: "ppe", unit: "пар", standardQuantity: 2, unitCostKopecks: 3500 },
		{ id: "medical_face_mask", sku: "MED-MASK-01", nameRu: "Маска защитная медицинская трехслойная", category: "ppe", unit: "шт.", standardQuantity: 2, unitCostKopecks: 1200 },
		{ id: "saliva_ejector", sku: "MED-EJECT-01", nameRu: "Слюноотсос одноразовый стоматологический", category: "ppe", unit: "шт.", standardQuantity: 1, unitCostKopecks: 1400 },
		{ id: "patient_bib", sku: "MED-BIB-01", nameRu: "Салфетка нагрудная стоматологическая двухслойная", category: "ppe", unit: "шт.", standardQuantity: 1, unitCostKopecks: 800 },
		{ id: "optragate_retractor", sku: "MAT-OPTR-01", nameRu: "Роторасширитель эластичный OptraGate (Regular/Small)", category: "hygiene", unit: "шт.", standardQuantity: 1, unitCostKopecks: 12000 },
		{ id: "airflow_powder_glycine", sku: "MAT-POWDER-01", nameRu: "Порошок для воздушно-абразивной полировки Air-Flow (саше 25 г)", category: "hygiene", unit: "саше", standardQuantity: 1, unitCostKopecks: 18000 },
		{ id: "prophy_polishing_paste", sku: "MAT-PASTE-01", nameRu: "Паста полировочная абразивная стоматологическая", category: "hygiene", unit: "доза", standardQuantity: 1, unitCostKopecks: 3500 },
		{ id: "prophy_brush", sku: "MAT-BRUSH-01", nameRu: "Щетка полировочная циркулярная для углового наконечника", category: "hygiene", unit: "шт.", standardQuantity: 1, unitCostKopecks: 2500 },
		{ id: "cotton_rolls_sterile", sku: "MED-ROLL-02", nameRu: "Ватные валики стоматологические стерильные №2", category: "ppe", unit: "шт.", standardQuantity: 4, unitCostKopecks: 300 },
	],
};
