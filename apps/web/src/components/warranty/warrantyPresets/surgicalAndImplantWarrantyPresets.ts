/**
 * ============================================================================
 * SURGICAL & IMPLANT WARRANTY PRESETS & CLINICAL DEFECTS
 * Хирургическая стоматология и дентальная имплантация: титановые имплантаты,
 * абатменты, остеоинтеграция, пожизненная заводская гарантия на винт.
 * Нормативы: Регламент СтАР по дентальной имплантологии, ГОСТ Р 55583.
 * ============================================================================
 */

import type {
	DentalMaterialMeta,
	StarQuickPreset,
	WarrantyDefectTemplate,
	WarrantyPreset,
} from "./types.js";

export const IMPLANT_FIXTURE_PRESET: WarrantyPreset = {
	category: "implant_fixture",
	code: "WAR-IMPL-03",
	serviceCode804n: "A16.07.006.002",
	title: "Дентальные имплантаты и протезирование на титановых опорах",
	shortTitle: "Имплантаты & Абатменты",
	description:
		"Хирургическая установка внутрикостных титановых имплантатов с пожизненной гарантией производителя на титановый винт и клинической гарантией на остеоинтеграцию.",
	statutoryBasis: "Закон РФ № 2300-1, Регламент СтАР по дентальной имплантологии, ГОСТ Р 55583",
	baseWarrantyMonths: 24,
	minWarrantyMonths: 12,
	maxWarrantyMonths: 36,
	baseServiceLifeMonths: 240,
	minServiceLifeMonths: 120,
	maxServiceLifeMonths: 360,
	isManufacturerLifetimeWarranty: true,
	clinicalConditions: [
		"Пожизненная гарантия завода-производителя на целостность титанового винта",
		"Клиническая гарантия 24–36 мес на остеоинтеграцию при соблюдении гигиены",
		"Индекс OHI-S <= 1.2, отсутствие признаков мукозита и периимплантита",
		"Отказ от курения (или не более 5 сигарет/сутки) и компенсация сахарного диабета (HbA1c < 7.0%)",
	],
	recommendedMaterials: [
		"Straumann SLActive / Roxolid (Швейцария)",
		"Nobel Biocare TiUnite / Replace Select / Conical (Швейцария/США)",
		"Astra Tech Implant System OsseoSpeed TX (Швеция/США)",
		"Osstem Implant TS III SA / CA (Южная Корея)",
		"Dentium SuperLine / Implantium (Южная Корея)",
		"Ankylos C/X SynCone (Германия)",
	],
	popularManufacturers: ["Straumann", "Nobel Biocare", "Astra Tech", "Osstem", "Dentium", "Dentsply Sirona (Ankylos)", "Medentika", "MIS"],
	standardCheckupIntervalMonths: 6,
};

export const SURGICAL_IMPLANT_WARRANTY_PRESETS = {
	implant_fixture: IMPLANT_FIXTURE_PRESET,
} as const;

export const SCREW_LOOSENING_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "screw_loosening",
	code: "DEF-SCREW-04",
	title: "Раскручивание / подвижность винта абатмента имплантата (0 ₽)",
	shortTitle: "Подвижность винта абатмента (0 ₽)",
	category: "implant_fixture",
	recommendedAction: "Снятие окклюзионной заглушки, ревизия шахты, замена/динамометрическая затяжка винта абатмента (30–35 Н·см)",
	clinicalDescription: "Ослабление резьбового соединения клинического винта абатмента при сохранной остеоинтеграции имплантата.",
	defaultMaterials: [
		{ name: "Клинический титановый винт абатмента", quantity: 1, unit: "шт" },
		{ name: "Тефлоновая лента (PTFE) изоляции шахты", quantity: 1, unit: "компл." },
		{ name: "Световой пломбировочный материал окклюзионного доступа", quantity: 1, unit: "доз." },
	],
	statutoryBasis: "Регламент СтАР по дентальной имплантологии, ГОСТ Р 55583",
};

export const SURGICAL_IMPLANT_DEFECT_TEMPLATES = {
	screw_loosening: SCREW_LOOSENING_DEFECT_TEMPLATE,
} as const;

export const SURGICAL_IMPLANT_MATERIALS: DentalMaterialMeta[] = [
	{
		id: "mat_straumann_slactive",
		category: "implant_fixture",
		name: "Straumann BLX / BLT SLActive Roxolid",
		manufacturer: "Straumann",
		country: "Швейцария",
		type: "Титано-циркониевый имплантат с гидрофильной поверхностью",
		warrantyMonthsDefault: 24,
		serviceLifeMonthsDefault: 240,
		requiresLotNumber: true,
	},
	{
		id: "mat_osstem_ts3",
		category: "implant_fixture",
		name: "Osstem TS III SA / CA",
		manufacturer: "Osstem Implant",
		country: "Южная Корея",
		type: "Дентальный титановый имплантат Grade 4",
		warrantyMonthsDefault: 24,
		serviceLifeMonthsDefault: 240,
		requiresLotNumber: true,
	},
];

export const STAR_IMPLANT_QUICK_PRESET: StarQuickPreset = {
	id: "star_implant_lifetime",
	title: "Имплантация",
	subtitle: "Пожизненная завода • 10–20 лет",
	category: "implant_fixture",
	materialName: "Straumann BLX / BLT SLActive Roxolid",
	manufacturer: "Straumann",
	country: "Швейцария",
	warrantyMonths: 24,
	serviceLifeMonths: 240,
	serviceCode804n: "A16.07.006.002",
	statutoryNote: "Пожизненная гарантия завода на винт + 24 мес по Регламенту СтАР на остеоинтеграцию",
};
