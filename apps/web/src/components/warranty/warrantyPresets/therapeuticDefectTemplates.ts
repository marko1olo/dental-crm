import type { DentalMaterialMeta, WarrantyDefectTemplate } from "./types.js";

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
