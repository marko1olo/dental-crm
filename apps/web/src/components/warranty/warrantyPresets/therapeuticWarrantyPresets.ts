/**
 * ============================================================================
 * THERAPEUTIC WARRANTY PRESETS & CLINICAL DEFECTS
 * Терапевтическая стоматология: световые пломбы, художественные реставрации,
 * эндодонтическое лечение корневых каналов и шинирование при пародонтите.
 * Нормативы: Положение СтАР разд. 2, Клинические рекомендации Минздрава РФ.
 * ============================================================================
 */

import type {
	DentalMaterialMeta,
	StarQuickPreset,
	WarrantyDefectTemplate,
	WarrantyPreset,
} from "./types.js";

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

export const FILLING_LOSS_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "filling_loss",
	code: "DEF-FILL-01",
	title: "Выпадение пломбы / дефект краевого прилегания (0 ₽)",
	shortTitle: "Выпала пломба (0 ₽)",
	category: "composite_restoration",
	recommendedAction: "Некрэктомия по краю, адгезивная подготовка и повторное пломбирование нанокомпозитом",
	clinicalDescription: "Частичная или полная утрата пломбы, скол композитного материала, нарушение краевой адаптации.",
	defaultMaterials: [
		{ name: "Композит светового отверждения (Filtek / Estelite)", quantity: 1, unit: "доз." },
		{ name: "Адгезивная система Single Bond Universal", quantity: 1, unit: "доз." },
		{ name: "Травильный гель 37% ортофосфорной кислоты", quantity: 1, unit: "доз." },
		{ name: "Полировочные диски и щетки", quantity: 1, unit: "компл." },
	],
	statutoryBasis: "Закон РФ № 2300-1 ст. 29, Положение СтАР разд. 2 (Безвозмездное устранение недостатков)",
};

export const OCCLUSAL_DISCOMFORT_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "occlusal_discomfort",
	code: "DEF-OCCL-07",
	title: "Окклюзионный дискомфорт / пришлифовка суперконтакта (0 ₽)",
	shortTitle: "Пришлифовка окклюзии (0 ₽)",
	category: "composite_restoration",
	recommendedAction: "Артикуляционная проба (Bausch 40 мкм), избирательное микропришлифовывание суперконтакта и полировка",
	clinicalDescription: "Преждевременный окклюзионный контакт при смыкании зубных рядов, дискомфорт при жевании.",
	defaultMaterials: [
		{ name: "Артикуляционная бумага Bausch 40 мкм", quantity: 1, unit: "полоска" },
		{ name: "Полировочная головка Enhance / PoGo", quantity: 1, unit: "шт" },
	],
	statutoryBasis: "Положение СтАР разд. 2 (Коррекция окклюзионных взаимоотношений по гарантии)",
};

export const CUSTOM_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "custom_defect",
	code: "DEF-CUSTOM-08",
	title: "Индивидуальное гарантийное устранение дефекта (0 ₽)",
	shortTitle: "Гарантийный дефект (0 ₽)",
	category: "composite_restoration",
	recommendedAction: "Клиническая ревизия и безвозмездное устранение выявленного недостатка",
	clinicalDescription: "Гарантийное обращение пациента в рамках действующего гарантийного срока клиники.",
	defaultMaterials: [
		{ name: "Расходные стоматологические материалы по факту манипуляции", quantity: 1, unit: "компл." },
	],
	statutoryBasis: "Закон РФ № 2300-1 ст. 29 «Права потребителя при обнаружении недостатков выполненной работы»",
};

export const THERAPEUTIC_DEFECT_TEMPLATES = {
	filling_loss: FILLING_LOSS_DEFECT_TEMPLATE,
	occlusal_discomfort: OCCLUSAL_DISCOMFORT_DEFECT_TEMPLATE,
	custom_defect: CUSTOM_DEFECT_TEMPLATE,
} as const;

export const THERAPEUTIC_MATERIALS: DentalMaterialMeta[] = [
	{
		id: "mat_filtek_ultimate",
		category: "composite_restoration",
		name: "Filtek Ultimate (3M ESPE)",
		manufacturer: "3M ESPE",
		country: "США",
		type: "Нанокомпозит универсальный светового отверждения",
		warrantyMonthsDefault: 12,
		serviceLifeMonthsDefault: 36,
		requiresLotNumber: false,
		popularShades: ["A1", "A2", "A3", "A3.5", "B1", "B2"],
	},
	{
		id: "mat_estelite_asteria",
		category: "composite_restoration",
		name: "Estelite Asteria (Tokuyama Dental)",
		manufacturer: "Tokuyama Dental",
		country: "Япония",
		type: "Субмикрофильный реставрационный композит",
		warrantyMonthsDefault: 24,
		serviceLifeMonthsDefault: 48,
		requiresLotNumber: false,
		popularShades: ["A1B", "A2B", "A3B", "NE", "OcE"],
	},
	{
		id: "mat_ah_plus_endo",
		category: "endodontic_treatment",
		name: "AH Plus Jet & Gutta-Percha",
		manufacturer: "Dentsply Sirona",
		country: "Германия",
		type: "Эпоксидно-аминовый эндодонтический герметик",
		warrantyMonthsDefault: 12,
		serviceLifeMonthsDefault: 60,
		requiresLotNumber: false,
	},
];

export const STAR_COMPOSITE_QUICK_PRESET: StarQuickPreset = {
	id: "star_composite_1y",
	title: "Световая пломба",
	subtitle: "1 год (12 мес.) • Срок сл. 3 г.",
	category: "composite_restoration",
	materialName: "Filtek Ultimate (3M ESPE)",
	manufacturer: "3M ESPE",
	country: "США",
	warrantyMonths: 12,
	serviceLifeMonths: 36,
	serviceCode804n: "A16.07.002.010",
	statutoryNote: "Положение СтАР разд. 2, Закон РФ № 2300-1 ст. 5",
};
