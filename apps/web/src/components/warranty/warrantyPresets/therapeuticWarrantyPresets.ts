/**
 * ============================================================================
 * THERAPEUTIC WARRANTY PRESETS
 * Терапевтическая стоматология: световые пломбы, художественные реставрации,
 * эндодонтическое лечение корневых каналов и шинирование при пародонтите.
 * ============================================================================
 */

import type { StarQuickPreset, WarrantyPreset } from "./types.js";

export const COMPOSITE_RESTORATION_PRESET: WarrantyPreset = {
	category: "composite_restoration",
	code: "WAR-COMP-01",
	serviceCode804n: "A16.07.002.010",
	title: "Светоотверждаемые композитные пломбы и художественная реставрация",
	shortTitle: "Пломбы & Реставрация",
	description:
		"Терапевтическое восстановление анатомической формы, краевого прилегания и эстетики коронковой части зуба светоотверждаемыми наногибридными композитами.",
	statutoryBasis: "Закон РФ № 2300-1 (ст. 5, 29), Положение СтАР разд. 2",
	baseWarrantyMonths: 12,
	minWarrantyMonths: 6,
	maxWarrantyMonths: 24,
	baseServiceLifeMonths: 36,
	minServiceLifeMonths: 24,
	maxServiceLifeMonths: 60,
	clinicalConditions: [
		"Индекс КПУ (кариозных, пломбированных, удаленных зубов) <= 6",
		"Гигиенический индекс Green-Vermillion (OHI-S) <= 1.2 (хорошая гигиена)",
		"Индекс разрушения окклюзионной поверхности зуба (ИРОПЗ) < 0.5 (до 50%)",
		"Отсутствие парафункций жевательных мышц (бруксизма) без защитной каппы",
	],
	recommendedMaterials: [
		"3M Filtek Ultimate / Z350 XT (США)",
		"Tokuyama Estelite Asteria / Sigma Quick (Япония)",
		"GC Gradia Direct / G-aenial / Essentia (Япония)",
		"Kerr Harmonize / Herculite Ultra (США)",
		"Micerium Enamel Plus HRi (Италия)",
	],
	popularManufacturers: ["3M ESPE", "Tokuyama Dental", "GC Corporation", "Kerr", "Micerium", "Dentsply Sirona"],
	standardCheckupIntervalMonths: 6,
};

export const ENDODONTIC_TREATMENT_PRESET: WarrantyPreset = {
	category: "endodontic_treatment",
	code: "WAR-ENDO-06",
	serviceCode804n: "A16.07.008.002",
	title: "Эндодонтическое лечение и трехмерная обтурация корневых каналов",
	shortTitle: "Эндодонтия (Каналы)",
	description:
		"Инструментальная, медикаментозная обработка и герметичная 3D-обтурация корневых каналов гуттаперчей и биокерамическим силером.",
	statutoryBasis: "Закон РФ № 2300-1, Клинические рекомендации СтАР по эндодонтии",
	baseWarrantyMonths: 12,
	minWarrantyMonths: 6,
	maxWarrantyMonths: 24,
	baseServiceLifeMonths: 60,
	minServiceLifeMonths: 36,
	maxServiceLifeMonths: 120,
	clinicalConditions: [
		"Обязательное покрытие зуба ортопедической коронкой или вкладкой в срок до 30 дней после депульпирования (при ИРОПЗ > 0.5)",
		"Контрольная прицельная радиовизиография через 6 и 12 месяцев для оценки периапикальных тканей",
		"Исключение жевательной нагрузки на временную пломбу до постоянного восстановления коронки",
	],
	recommendedMaterials: [
		"Dentsply Sirona AH Plus Jet (Германия)",
		"Septodont BioRoot RCS (Франция)",
		"FKG Dentaire TotalFill BC Sealer (Швейцария)",
		"VDW Reciproc Blue / VDW.Rotate (Германия)",
	],
	popularManufacturers: ["Dentsply Sirona", "Septodont", "FKG Dentaire", "VDW Dental", "Meta Biomed"],
	standardCheckupIntervalMonths: 6,
};

export const PERIODONTAL_SPLINTING_PRESET: WarrantyPreset = {
	category: "periodontal_splinting",
	code: "WAR-PERIO-07",
	serviceCode804n: "A16.07.019",
	title: "Шинирование зубов стекловолокном при заболеваниях пародонта",
	shortTitle: "Шинирование зубов",
	description:
		"Иммобилизация подвижных зубов с использованием высокомодульных стекловолоконных лент и композитной фиксации.",
	statutoryBasis: "Закон РФ № 2300-1, Клинические протоколы СтАР по пародонтологии",
	baseWarrantyMonths: 6,
	minWarrantyMonths: 3,
	maxWarrantyMonths: 12,
	baseServiceLifeMonths: 24,
	minServiceLifeMonths: 12,
	maxServiceLifeMonths: 36,
	clinicalConditions: [
		"Контрольные осмотры пародонтолога и поддерживающая гигиена каждые 3–4 месяца",
		"Индекс кровоточивости десневой борозды (BOP) < 15%",
		"Использование индивидуальных межзубных ершиков и ирригатора полости рта",
		"Купирование острой фазы генерализованного пародонтита",
	],
	recommendedMaterials: [
		"Ribbond THM / Ultra (США)",
		"Stick Tech GC everStick PERIO (Финляндия/Япония)",
		"Kerr Construct (США)",
	],
	popularManufacturers: ["Ribbond", "GC Corporation (Stick Tech)", "Kerr", "Angelus"],
	standardCheckupIntervalMonths: 3,
};

export const THERAPEUTIC_WARRANTY_PRESETS = {
	composite_restoration: COMPOSITE_RESTORATION_PRESET,
	endodontic_treatment: ENDODONTIC_TREATMENT_PRESET,
	periodontal_splinting: PERIODONTAL_SPLINTING_PRESET,
} as const;

export * from "./therapeuticStarPresets.js";
export * from "./therapeuticDefectTemplates.js";
