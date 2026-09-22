/**
 * packages/shared/src/types/surgery.ts
 *
 * Канонические типы, нормы и Zod-схемы хирургической стоматологии и имплантологии.
 * Стандарты: Mandate 8e (Автономия врача), Mandate 8i (Суверенитет стоматологического контекста),
 * Mandate 8s (Анти-блоат), СанПиН 3.3686-21 (Класс Б отходы), Номенклатура 804н, Форма 043/у.
 *
 * Без стационарного госпитального блоата:
 * НЕТ общему наркозу, НЕТ койко-дням, НЕТ трансфузиям крови, НЕТ ПКУ наркотических анальгетиков,
 * НЕТ комиссиям из 3 человек для списания карпул или установки имплантатов.
 * Мягкий овердрафт склада (canProceed: true): задержка накладной никогда не блокирует операцию.
 */

import { z } from "zod";

export const SURGICAL_OPERATION_CATEGORIES = [
	"implant",
	"extraction",
	"perio_surgery",
	"sinus_gbr",
	"emergency",
] as const;

export type SurgicalOperationCategory = (typeof SURGICAL_OPERATION_CATEGORIES)[number];

export const surgicalOperationCategorySchema = z.enum(SURGICAL_OPERATION_CATEGORIES);

export interface SurgicalService804n {
	readonly code: string;
	readonly nameRu: string;
	readonly name: string;
	readonly priceRub: number;
	readonly quantity: number;
	readonly suggestedPriceRub?: number | undefined;
	readonly toothNumber?: number | undefined;
	readonly stageKind?: string | undefined;
	readonly isPrimary?: boolean | undefined;
}

export const surgicalService804nSchema = z.object({
	code: z.string().min(1),
	nameRu: z.string().min(1),
	name: z.string().min(1),
	priceRub: z.number().nonnegative(),
	quantity: z.number().positive().default(1),
	suggestedPriceRub: z.number().nonnegative().optional(),
	toothNumber: z.number().int().optional(),
	stageKind: z.string().optional(),
	isPrimary: z.boolean().optional(),
});

export interface SurgicalMaterialItem {
	readonly name: string;
	readonly unit: string;
	readonly quantity: number;
	readonly isWarehouseCritical: boolean;
}

export const surgicalMaterialItemSchema = z.object({
	name: z.string().min(1),
	unit: z.string().min(1),
	quantity: z.number().positive(),
	isWarehouseCritical: z.boolean().default(false),
});

export interface SurgicalOperationNorm {
	readonly id: string;
	readonly title: string;
	readonly shortBadge: string;
	readonly category: SurgicalOperationCategory;
	readonly icd10: string;
	readonly icd10Label: string;
	readonly code804n?: string;
	readonly code804nSubcode?: string;
	readonly service804nTitle?: string;
	readonly defaultToothFdi?: number;
	readonly standardProtocolTextRu: string;
	readonly anesthesiaDefaultRu: string;
	readonly postOpRecommendationsRu: string;
	readonly order804nServices?: readonly SurgicalService804n[];
	readonly requiredMaterials: readonly SurgicalMaterialItem[];
}

export const surgicalOperationNormSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	shortBadge: z.string().min(1),
	category: surgicalOperationCategorySchema,
	icd10: z.string().min(1),
	icd10Label: z.string().min(1),
	code804n: z.string().optional(),
	code804nSubcode: z.string().optional(),
	service804nTitle: z.string().optional(),
	defaultToothFdi: z.number().int().optional(),
	standardProtocolTextRu: z.string().min(1),
	anesthesiaDefaultRu: z.string().min(1),
	postOpRecommendationsRu: z.string().min(1),
	order804nServices: z.array(surgicalService804nSchema).optional(),
	requiredMaterials: z.array(surgicalMaterialItemSchema),
});

/**
 * Статус мягкого овердрафта склада (Мандат 8e):
 * canProceed ВСЕГДА true — операция врача не блокируется.
 */
export interface SurgicalWarehouseOverdraftStatus {
	readonly hasOverdraft: boolean;
	readonly warningRu: string;
	readonly detailsRu: string;
	readonly pendingItems: readonly string[];
	readonly canProceed: true;
}

export const surgicalWarehouseOverdraftStatusSchema = z.object({
	hasOverdraft: z.boolean(),
	warningRu: z.string(),
	detailsRu: z.string(),
	pendingItems: z.array(z.string()),
	canProceed: z.literal(true),
});

export type MischBoneDensity = "D1" | "D2" | "D3" | "D4";
export type ImplantCapKind = "fdm" | "plug";

export interface FastImplantPassportData {
	readonly toothFdi: number;
	readonly brand: string;
	readonly model: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly isqDay0?: number | undefined;
	readonly boneDensity: MischBoneDensity;
	readonly capType: ImplantCapKind;
	readonly catalogArticle?: string | undefined;
	readonly lotNumber?: string | undefined;
	readonly serialNumber?: string | undefined;
	readonly dateIso?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly isWarehouseOverdraft?: boolean | undefined;
	readonly notes?: string | undefined;
	readonly passportId?: string | undefined;
}

export const fastImplantPassportDataSchema = z.object({
	toothFdi: z.number().int().min(11).max(48),
	brand: z.string().min(1),
	model: z.string().min(1),
	diameterMm: z.number().positive(),
	lengthMm: z.number().positive(),
	torqueNcm: z.number().positive(),
	isqDay0: z.number().int().positive().optional(),
	boneDensity: z.enum(["D1", "D2", "D3", "D4"]),
	capType: z.enum(["fdm", "plug"]),
	catalogArticle: z.string().optional(),
	lotNumber: z.string().optional(),
	serialNumber: z.string().optional(),
	dateIso: z.string().optional(),
	patientName: z.string().optional(),
	patientId: z.string().optional(),
	doctorName: z.string().optional(),
	doctorId: z.string().optional(),
	isWarehouseOverdraft: z.boolean().optional(),
	notes: z.string().optional(),
	passportId: z.string().optional(),
});

export interface StandardImplantationParams {
	readonly toothFdi?: number | undefined;
	readonly brand?: string | undefined;
	readonly model?: string | undefined;
	readonly diameterMm?: number | undefined;
	readonly lengthMm?: number | undefined;
	readonly torqueNcm?: number | undefined;
	readonly isq?: number | undefined;
	readonly capType?: ImplantCapKind | undefined;
	readonly sutureMaterial?: string | undefined;
	readonly postOpXray?: boolean | undefined;
}

export const standardImplantationParamsSchema = z.object({
	toothFdi: z.number().int().optional(),
	brand: z.string().optional(),
	model: z.string().optional(),
	diameterMm: z.number().positive().optional(),
	lengthMm: z.number().positive().optional(),
	torqueNcm: z.number().positive().optional(),
	isq: z.number().int().positive().optional(),
	capType: z.enum(["fdm", "plug"]).optional(),
	sutureMaterial: z.string().optional(),
	postOpXray: z.boolean().optional(),
});

/**
 * Zod-схема создания протокола операции (Форма 043/у)
 */
export const createSurgicalProtocolSchema = z.object({
	visitId: z.string().uuid().optional().nullable(),
	patientId: z.string().uuid(),
	doctorId: z.string().uuid().optional().nullable(),
	normId: z.string().default("surgery_implant_standard"),
	toothNumberFdi: z.number().int().min(11).max(85).optional().nullable(),
	protocolText: z.string().min(10),
	anesthesiaText: z.string().optional().nullable(),
	recommendationsText: z.string().optional().nullable(),
	services804n: z.array(surgicalService804nSchema).default([]),
	materialsUsed: z.array(surgicalMaterialItemSchema).default([]),
	isOverdraftActive: z.boolean().default(false),
	notes: z.string().optional().nullable(),
});

export type CreateSurgicalProtocolInput = z.infer<typeof createSurgicalProtocolSchema>;

/**
 * Zod-схема быстрого 1-клик списания расходников у стоматологического кресла (Мандаты 8e, 8s, 8n).
 * Для карпул анестетиков — отходы Класса Б (СанПиН 3.3686-21) в 1 клик медсестрой без комиссий.
 */
export const surgicalQuickDeductSchema = z.object({
	visitId: z.string().uuid().optional().nullable(),
	bundleType: z.enum([
		"implant",
		"sinus_gbr",
		"surgery_extraction",
		"surgery_apicoectomy",
		"anesthesia_carpule",
	]),
	toothNumberFdi: z.number().int().min(11).max(85).optional().nullable(),
	carpulesCount: z.number().int().positive().default(1),
	drugBrandName: z.string().default("Артикаин 1:100 000"),
	isNurseAction: z.boolean().default(true),
	notes: z.string().optional().nullable(),
});

export type SurgicalQuickDeductInput = z.infer<typeof surgicalQuickDeductSchema>;

// Канонические тексты норм операций
export const DENTAL_IMPLANTATION_NORM_TEXT =
	"Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл. Разрез по гребню альвеолярного отростка, отслоен слизисто-надкостничный лоскут. Препарирование ложа фрезами по хирургическому протоколу с охлаждением физраствором. Установлен дентальный имплантат, первичная торк-стабильность 35 Н·см. Установлен формирователь десны / винт-заглушка. Ушивание раны шовным материалом ПГА 4-0. Гемостаз полный. Рекомендации даны.";

export const SIMPLE_EXTRACTION_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Круговая связка зуба отслоена гладилкой. Наложены щипцы / элеватор, продвинуты под десну, фиксированы. Люксация элеватором и ротация щипцами. Тракция зуба из альвеолы. Тщательный кюретаж лунки острой ложкой, ревизия, удаление грануляций. Антисептическая обработка 0.05% хлоргексидином. Местный гемостаз: в лунку внесен Альвожиль / гемостатическая губка. Давящий марлевый тампон. Гемостаз полный. Рекомендации даны.";

export const ATYPICAL_EXTRACTION_NORM_TEXT =
	"Проводниковая торусальная и инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл. Разрез слизистой в ретромолярной области, выкраивание слизисто-надкостничного лоскута. Трепанация кортикальной пластинки, сепарация коронки и корней твердосплавным бором Lindemann с охлаждением физраствором. Атравматичная люксация и извлечение фрагментов элеватором. Тщательный кюретаж лунки, ревизия, удаление грануляций. Лунка заполнена гемостатической коллагеновой губкой Альвожиль. Рана ушита узловыми швами ПГА / Викрил 4-0 (ушивание раны). Гемостаз полный. Рекомендации даны.";

export const COMPLEX_EXTRACTION_NORM_TEXT =
	"Инфильтрационная и проводниковая анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл. Разрез слизистой оболочки, отслаивание слизисто-надкостничного лоскута. Сепарация корней бором с водяным охлаждением (хирургический бор Lindemann). Люксация элеватором (атравматичная люксация), атравматичная тракция фрагментов корней щипцами. Тщательный кюретаж лунки острой ложкой, удаление грануляций. Антисептическая обработка 0.05% хлоргексидином. Местный гемостаз губкой Альвожил. Сближение краев лунки, наложение швов (швы Викрил 4-0). Давящий марлевый тампон. Гемостаз полный. Рекомендации даны.";

export const SINUS_LIFT_GBR_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Трапециевидный разрез в боковом отделе верхней челюсти, скелетирование передне-боковой стенки верхнечелюстного синуса. Формирование латерального окна пьезотомом. Элевация мембраны Шнайдера без перфорации. Субантральное пространство заполнено ксенографтом. Барьерная мембрана фиксирована пинами. Послойное ушивание ПГА 4-0. Гемостаз полный. Рекомендации даны.";

export const PERICORONITIS_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Иссечение воспаленного слизистого капюшона над коронкой ретинированного зуба скальпелем. Промывание антисептиками (хлоргексидин 0.05%), йодоформная турунда. Гемостаз полный. Рекомендации даны.";

export const PERIOSTOTOMY_NORM_TEXT =
	"Инфильтрационная анестезия по переходной складке Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез слизистой и надкостницы длиной 1.5–2 см по переходной складке в области проекции верхушки причинного зуба до кости. Отслоение надкостницы распатором, эвакуация гнойного экссудата. Антисептическая обработка 0.05% хлоргексидином. Введение резинового ленточного дренажа-выпускника для постоянного дренирования раны. Гемостаз стерильными марлевыми салфетками. Рекомендации даны, явка на следующий день.";

export const APICOECTOMY_NORM_TEXT =
	"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Трапециевидный разрез слизистой в проекции верхушки причинного зуба, отслоен слизисто-надкостничный лоскут. Трепанация кортикальной пластинки шаровидным бором с водяным охлаждением. Резекция верхушки корня на 3 мм под углом 90° твердосплавным фиссурным бором. Цистэктомия/кюретаж периапикального очага. Ультразвуковое ретроградное препарирование апикальной части канала насадкой КСТ на глубину 3 мм. Ретроградное пломбирование МТА (ProRoot / Biodentine). Контроль гемостаза. Ушивание раны узловыми швами ПГА / Монофиламент 5-0. Контрольная радиовизиография: резекция выполнена, ретроградная пломба герметична. Рекомендации даны.";

/**
 * Канонический реестр 1-клик хирургических норм (Номенклатура 804н, Форма 043/у).
 */
export const CANONICAL_SURGICAL_OPERATION_NORMS: readonly SurgicalOperationNorm[] = [
	{
		id: "surgery_implant_standard",
		title: "Дентальная имплантация (1-клик норма)",
		shortBadge: "Имплантация 35 Н·см",
		category: "implant",
		icd10: "K08.1",
		icd10Label: "Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		code804n: "A16.07.054",
		service804nTitle: "Внутрикостная дентальная имплантация",
		defaultToothFdi: 46,
		standardProtocolTextRu: DENTAL_IMPLANTATION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Артикаин 1:100 000 1.7 мл",
		postOpRecommendationsRu:
			"Холод на область операции 15 мин каждые 2 часа в первый день. Ванночки с 0.05% хлоргексидином с 2-х суток. Исключить горячее, бани, физ. нагрузки 7 дней. Прием НПВП и антибиотикотерапия по назначению. Осмотр через 7 дней.",
		order804nServices: [
			{
				code: "A16.07.054",
				nameRu: "Внутрикостная дентальная имплантация (установка имплантата)",
				name: "Внутрикостная дентальная имплантация (установка имплантата)",
				priceRub: 35000,
				quantity: 1,
				suggestedPriceRub: 35000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.054.002",
				nameRu: "Установка формирователя десны (ФДМ) / винта-заглушки",
				name: "Установка формирователя десны (ФДМ) / винта-заглушки",
				priceRub: 3500,
				quantity: 1,
				suggestedPriceRub: 3500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Дентальный имплантат титановый", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Формирователь десны / винт-заглушка", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Шовный материал рассасывающийся ПГА 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_extraction_simple",
		title: "Простое удаление зуба (1-клик норма)",
		shortBadge: "Удаление простое",
		category: "extraction",
		icd10: "K08.8",
		icd10Label: "Другие уточненные изменения зубов и их опорного аппарата",
		code804n: "A16.07.001",
		code804nSubcode: "A16.07.001.001",
		service804nTitle: "Удаление зуба (простое)",
		defaultToothFdi: 36,
		standardProtocolTextRu: SIMPLE_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Марлевый тампон сплюнуть через 20 минут. Не полоскать рот 24 часа. Не принимать горячую ванну и острую пищу 3 дня. При болях — Нимесил 1 пак.",
		order804nServices: [
			{
				code: "A16.07.001",
				nameRu: "Удаление постоянного зуба (простое)",
				name: "Удаление постоянного зуба (простое)",
				priceRub: 3500,
				quantity: 1,
				suggestedPriceRub: 3500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.026",
				nameRu: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
				name: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
				priceRub: 1200,
				quantity: 1,
				suggestedPriceRub: 1200,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ name: "Губка гемостатическая коллагеновая Альвожиль", unit: "доза", quantity: 1, isWarehouseCritical: false },
			{ name: "Марлевый стерильный шарик/тампон", unit: "шт.", quantity: 2, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_extraction_atypical",
		title: "Атипичное удаление зуба мудрости (1-клик норма)",
		shortBadge: "Атипичное удаление 8-ки",
		category: "extraction",
		icd10: "K01.1",
		icd10Label: "Ретинированные зубы",
		code804n: "A16.07.024",
		service804nTitle: "Операция удаления ретинированного, дистопированного или сверхкомплектного зуба",
		defaultToothFdi: 48,
		standardProtocolTextRu: ATYPICAL_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Проводниковая торусальная и инфильтрационная Sol. Articaini 4% 1:100 000 — 3.4 мл",
		postOpRecommendationsRu:
			"Холод на щеку по 15 минут в первые 3 часа. Ванночки с антисептиком со 2-х суток. Не греть! Антибиотикотерапия (Амоксиклав 1000 мг 2 р/д 5 дней), НПВП (Кетанов/Нимесил). Явка на осмотр и снятие швов через 7–8 дней.",
		order804nServices: [
			{
				code: "A16.07.024",
				nameRu: "Операция удаления ретинированного/дистопированного зуба",
				name: "Операция удаления ретинированного/дистопированного зуба",
				priceRub: 8500,
				quantity: 1,
				suggestedPriceRub: 8500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА / Викрил 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА / Викрил 4-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.016",
				nameRu: "Проводниковая анестезия (Торусальная / Мандибулярная)",
				name: "Проводниковая анестезия (Торусальная / Мандибулярная)",
				priceRub: 1100,
				quantity: 1,
				suggestedPriceRub: 1100,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 2, isWarehouseCritical: false },
			{ name: "Шовный материал Викрил / ПГА 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Губка гемостатическая Альвожиль", unit: "доза", quantity: 1, isWarehouseCritical: false },
			{ name: "Хирургический твердосплавный бор Lindemann", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_sinus_lift_gbr",
		title: "Синус-лифтинг и НКР аугментация (1-клик норма)",
		shortBadge: "Синус-лифтинг + НКР",
		category: "sinus_gbr",
		icd10: "K08.2",
		icd10Label: "Атрофия беззубого альвеолярного края",
		code804n: "A16.07.041",
		service804nTitle: "Костная пластика челюстно-лицевой области с применением биодеградируемых материалов (синус-лифтинг)",
		defaultToothFdi: 16,
		standardProtocolTextRu: SINUS_LIFT_GBR_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Категорический запрет: не сморкаться, чихать с открытым ртом, не летать самолетом и не нырять 3 недели! Сосудосуживающие капли в нос (Тизин/Називин 5 дней). Антибиотики и НПВП строго по схеме. Контрольный осмотр через 3 и 10 дней.",
		order804nServices: [
			{
				code: "A16.07.041",
				nameRu: "Синус-лифтинг (открытый/закрытый) с костной аугментацией",
				name: "Синус-лифтинг (открытый/закрытый) с костной аугментацией",
				priceRub: 45000,
				quantity: 1,
				suggestedPriceRub: 45000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.041.001",
				nameRu: "Использование костнопластического материала (ксенографт 0.5 г)",
				name: "Использование костнопластического материала (ксенографт 0.5 г)",
				priceRub: 18000,
				quantity: 1,
				suggestedPriceRub: 18000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.041.002",
				nameRu: "Фиксация коллагеновой барьерной мембраны пинами",
				name: "Фиксация коллагеновой барьерной мембраны пинами",
				priceRub: 14000,
				quantity: 1,
				suggestedPriceRub: 14000,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение швов на слизистую оболочку рта (ПГА 4-0)",
				name: "Наложение швов на слизистую оболочку рта (ПГА 4-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Остеопластический материал ксенографт 0.5 г", unit: "флак.", quantity: 1, isWarehouseCritical: true },
			{ name: "Коллагеновая барьерная мембрана 20x20 мм", unit: "шт.", quantity: 1, isWarehouseCritical: true },
			{ name: "Титановые микропины для фиксации мембран", unit: "шт.", quantity: 2, isWarehouseCritical: false },
			{ name: "Шовный материал рассасывающийся ПГА 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 2, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_extraction_complex",
		title: "Сложное удаление зуба с разъединением корней (1-клик норма)",
		shortBadge: "Сложное удаление с сепарацией",
		category: "extraction",
		icd10: "K08.8",
		icd10Label: "Другие уточненные изменения зубов и их опорного аппарата",
		code804n: "A16.07.002",
		code804nSubcode: "A16.07.002.001",
		service804nTitle: "Сложное удаление зуба с разъединением корней",
		defaultToothFdi: 37,
		standardProtocolTextRu: COMPLEX_EXTRACTION_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная и проводниковая Sol. Articaini 4% 1:100 000 — 3.4 мл",
		postOpRecommendationsRu:
			"Марлевый тампон сплюнуть через 20 минут. Не полоскать, не греть 3 дня. Прием НПВП при болях (Нимесил/Кетанов). Явка на осмотр и снятие швов через 7-8 дней.",
		order804nServices: [
			{
				code: "A16.07.002",
				nameRu: "Удаление зуба сложное с разъединением корней",
				name: "Удаление зуба сложное с разъединением корней",
				priceRub: 5500,
				quantity: 1,
				suggestedPriceRub: 5500,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (Викрил 4-0)",
				name: "Наложение шва на слизистую оболочку рта (Викрил 4-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 2, isWarehouseCritical: false },
			{ name: "Шовный материал Викрил 4-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Губка гемостатическая Альвожил", unit: "доза", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_periostotomy",
		title: "Периостотомия с дренированием (1-клик норма)",
		shortBadge: "Периостотомия",
		category: "emergency",
		icd10: "K10.2",
		icd10Label: "Воспалительные заболевания челюстей (Периостит)",
		code804n: "A16.07.011",
		service804nTitle: "Вскрытие поднадкостничного очага воспаления (периостотомия)",
		defaultToothFdi: 36,
		standardProtocolTextRu: PERIOSTOTOMY_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Не вытаскивать резиновый дренаж самостоятельно! Ротовые ванночки с 0.05% хлоргексидином 4-5 раз в день. Антибиотикотерапия (Цифран СТ / Амоксиклав). Обязательная явка завтра на перевязку.",
		order804nServices: [
			{
				code: "A16.07.011",
				nameRu: "Периостотомия (вскрытие поднадкостничного абсцесса)",
				name: "Периостотомия (вскрытие поднадкостничного абсцесса)",
				priceRub: 3000,
				quantity: 1,
				suggestedPriceRub: 3000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.011.001",
				nameRu: "Дренирование очага воспаления резиновым выпускником",
				name: "Дренирование очага воспаления резиновым выпускником",
				priceRub: 800,
				quantity: 1,
				suggestedPriceRub: 800,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ name: "Резиновый ленточный выпускник стерильный", unit: "шт.", quantity: 1, isWarehouseCritical: false },
			{ name: "Марлевые стерильные салфетки", unit: "упак.", quantity: 1, isWarehouseCritical: false },
		],
	},
	{
		id: "surgery_apicoectomy",
		title: "Резекция верхушки корня (апикоэктомия) (1-клик норма)",
		shortBadge: "Апикоэктомия + МТА",
		category: "perio_surgery",
		icd10: "K04.5",
		icd10Label: "Хронический апикальный периодонтит",
		code804n: "A16.07.007",
		service804nTitle: "Резекция верхушки корня зуба с ретроградным пломбированием",
		defaultToothFdi: 21,
		standardProtocolTextRu: APICOECTOMY_NORM_TEXT,
		anesthesiaDefaultRu: "Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл",
		postOpRecommendationsRu:
			"Холод на верхнюю губу 2 часа с интервалами. Ванночки с Мирамистином. Исключить откусывание передними зубами твердой пищи 2 недели. Снятие швов через 8 дней.",
		order804nServices: [
			{
				code: "A16.07.007",
				nameRu: "Резекция верхушки корня зуба (апикоэктомия)",
				name: "Резекция верхушки корня зуба (апикоэктомия)",
				priceRub: 12000,
				quantity: 1,
				suggestedPriceRub: 12000,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
			{
				code: "A16.07.007.001",
				nameRu: "Ретроградное пломбирование канала цементом МТА",
				name: "Ретроградное пломбирование канала цементом МТА",
				priceRub: 4500,
				quantity: 1,
				suggestedPriceRub: 4500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A16.07.097",
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 5-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 5-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				stageKind: "stage_2_surgery",
			},
			{
				code: "A11.07.015",
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				stageKind: "stage_2_surgery",
			},
		],
		requiredMaterials: [
			{ name: "Анестетик артикаиновый 4% 1:100 000 1.7 мл", unit: "карп.", quantity: 1, isWarehouseCritical: false },
			{ name: "МТА материал для ретроградного пломбирования", unit: "доз.", quantity: 1, isWarehouseCritical: true },
			{ name: "Шовный материал ПГА 5-0", unit: "шт.", quantity: 1, isWarehouseCritical: false },
		],
	},
];

/**
 * Проверка мягкого овердрафта склада (Мандат 8e):
 * canProceed ВСЕГДА true — операция врача не блокируется.
 */
export function evaluateWarehouseOverdraft(
	materials: readonly SurgicalMaterialItem[],
	hasWarehouseDelay: boolean,
): SurgicalWarehouseOverdraftStatus {
	if (!hasWarehouseDelay) {
		return {
			hasOverdraft: false,
			warningRu: "Склад в норме",
			detailsRu: "Все позиции числятся на остатках.",
			pendingItems: [],
			canProceed: true,
		};
	}

	const criticalItems = materials.filter((m) => m.isWarehouseCritical).map((m) => m.name);

	return {
		hasOverdraft: true,
		warningRu: "Мягкий овердрафт склада (Мандат 8e): задержка накладной не блокирует операцию.",
		detailsRu: `Позиции будут списаны с признаком овердрафта: ${criticalItems.join(", ") || "расходные материалы"}. Доктор сохраняет протокол беспрепятственно.`,
		pendingItems: criticalItems,
		canProceed: true,
	};
}

/**
 * Генерация 1-клик канонического протокола дентальной имплантации (Mandates 8e, 8k СтАР).
 */
export function buildStandardImplantationProtocolText(
	params: StandardImplantationParams = {},
): string {
	const toothStr = params.toothFdi ? `зуба FDI #${params.toothFdi}` : "имплантации";
	const brand = params.brand || "Dentium";
	const model = params.model ? ` ${params.model}` : "";
	const dia = params.diameterMm ?? 4.0;
	const len = params.lengthMm ?? 10.0;
	const torque = params.torqueNcm ?? 35;
	const isq = params.isq ?? 72;
	const capStr =
		params.capType === "plug"
			? "Установлен винт-заглушка (двухэтапный протокол с ушиванием наглухо)."
			: "Установлен формирователь десны (ФДМ).";
	const suture = params.sutureMaterial || "Prolene 4-0";
	const xrayStr =
		params.postOpXray !== false
			? " Выполнен контрольный прицельный радиовизиографический снимок: положение имплантата правильное, субкрестально 0.5 мм, без повреждения смежных анатомических структур."
			: "";

	return (
		`Инфильтрационная анестезия Артикаин 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка в области ${toothStr}, отслоен слизисто-надкостничный лоскут. ` +
		`Препарирование ложа фрезами по хирургическому протоколу ${brand} с обильным охлаждением стерильным 0.9% NaCl (800 об/мин). ` +
		`Установлен дентальный имплантат ${brand}${model} Ø ${dia} × ${len} мм. ` +
		`Первичная торк-стабильность ${torque} Н·см, RFA стабильность ISQ ${isq} (высокая первичная фиксация). ` +
		`${capStr} ` +
		`Мобилизация лоскута, наложены узловые швы ${suture} без натяжения. Гемостаз полный.${xrayStr} ` +
		`Назначена антибактериальная и противовоспалительная терапия, рекомендации выданы.`
	);
}
