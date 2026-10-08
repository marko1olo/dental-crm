import type React from "react";
import {
	Activity,
	Droplets,
	Frown,
	Meh,
	Scissors,
	ShieldCheck,
	Smile,
	Sparkles,
} from "lucide-react";
import { DentalCrown } from "../../icons/DentalIcons";
import type {
	FranklExpressItem,
	PediatricProtocolDefinition,
	PediatricSedationState,
	PediatricSurfacePreset,
} from "./types";

/**
 * Валидация номера зуба по стандарту FDI (ISO 3950):
 * - Постоянные зубы: квадранты 1..4, позиции 1..8
 * - Временные (молочные) зубы: квадранты 5..8, позиции 1..5
 */
export const isValidFdiTooth = (num: number): boolean => {
	if (!Number.isInteger(num)) return false;
	const q = Math.floor(num / 10);
	const p = num % 10;
	if (q >= 1 && q <= 4) return p >= 1 && p <= 8;
	if (q >= 5 && q <= 8) return p >= 1 && p <= 5;
	return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1-CLICK PHYSIOLOGICAL NORM (MANDATE 8e: DECIDUOUS DENTITION NORM)
// ─────────────────────────────────────────────────────────────────────────────

export const PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION = {
	titleRu: "Временный прикус интактен (физиологическая норма)",
	statusLocalisRu:
		"Временный прикус интактен. Зубные ряды правильной формы, симметричны. Все временные зубы интактны, кариозных полостей и пятен деминерализации не выявлено (индекс кп=0). Физиологическая стираемость бугров временных зубов выражена соответственно возрасту. Присутствуют физиологические тремы и диастемы, свидетельствующие о нормальном росте челюстей. Слизистая оболочка полости рта бледно-розовая, влажная. Уздечки губ и языка анатомически правильного прикрепления. Носовое дыхание свободное. Вредные привычки отсутствуют.",
	treatmentRu:
		"Профилактический осмотр и оценка прикуса. Контролируемая гигиена: очищение зубов циркулярной щеточкой с бесфтористой пастой. Аппликация защитного реминерализующего фторлака на зубы. Мотивационная беседа с ребенком в игровой форме («считаем зубки»). Обучение правильной технике чистки зубов.",
	recommendationsRu:
		"1. Контролируемая родителями чистка зубов 2 раза в день фторидной пастой (1000 ppm) до 8–9 лет. 2. Рациональное питание: ограничение сладостей и сладких напитков между приемами пищи. 3. Твердая пища (яблоки, морковь) для стимуляции жевания и роста челюстей. 4. Плановый профосмотр через 3–4 месяца.",
	diagnosisIcd10: "Z01.2",
	diagnosisNameRu:
		"Стоматологическое обследование / физиологическая норма временного прикуса (Z01.2)",
	serviceCode804n: "A01.07.001",
	serviceName804n:
		"Прием (осмотр, консультация) врача-стоматолога детского первичный",
};

// ─────────────────────────────────────────────────────────────────────────────
// FRANKL BEHAVIOR SCALE EXPRESS DEFINITIONS (ZERO EMOJIS — LUCIDE ICONS ONLY)
// ─────────────────────────────────────────────────────────────────────────────

export const FRANKL_EXPRESS_ITEMS: readonly FranklExpressItem[] = [
	{
		rating: 1,
		symbol: "--",
		titleRu: "1 (--) Определенно негативное",
		shortLabelRu: "1 (--) Категорически негативное",
		descriptionRu:
			"Плач, отказ от контакта, физическое сопротивление или страх",
		clinicalTacticRu:
			"Tell-Show-Do, ознакомительный визит без бормашины, седация N2O при острой боли",
		icon: Frown,
		activeClass:
			"border-rose-500 bg-rose-50/90 text-rose-950 shadow-sm ring-2 ring-rose-500/30 dark:border-rose-400 dark:bg-rose-950/60 dark:text-rose-100",
		badgeClass:
			"bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/60 dark:text-rose-200 dark:border-rose-700",
	},
	{
		rating: 2,
		symbol: "-",
		titleRu: "2 (-) Негативное",
		shortLabelRu: "2 (-) Негативное / насторожен",
		descriptionRu:
			"Неохотно, плаксив, скован, но садится в кресло и дает осмотреть",
		clinicalTacticRu:
			"Tell-Show-Do, мультфильмы, позитивное подкрепление, договоренность о знаке «стоп»",
		icon: Meh,
		activeClass:
			"border-amber-500 bg-amber-50/90 text-amber-950 shadow-sm ring-2 ring-amber-500/30 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-100",
		badgeClass:
			"bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-700",
	},
	{
		rating: 3,
		symbol: "+",
		titleRu: "3 (+) Позитивное",
		shortLabelRu: "3 (+) Позитивное / контактен",
		descriptionRu: "Контактен, сотрудничает, спокойно выполняет указания врача",
		clinicalTacticRu:
			"Похвала, демонстрация чистого зубика в зеркало, игровая форма, подарок за смелость",
		icon: Smile,
		activeClass:
			"border-sky-500 bg-sky-50/90 text-sky-950 shadow-sm ring-2 ring-sky-500/30 dark:border-sky-400 dark:bg-sky-950/60 dark:text-sky-100",
		badgeClass:
			"bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/60 dark:text-sky-200 dark:border-sky-700",
	},
	{
		rating: 4,
		symbol: "++",
		titleRu: "4 (++) Определенно позитивное",
		shortLabelRu: "4 (++) Полное партнерство",
		descriptionRu: "Восторжен, искренний интерес, улыбка, абсолютное доверие",
		clinicalTacticRu:
			"Партнерство, обучение самостоятельной чистке зубов, диплом храброго пациента",
		icon: Sparkles,
		activeClass:
			"border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-sm ring-2 ring-emerald-500/30 dark:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-100",
		badgeClass:
			"bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 5 CANONICAL CLINICAL 1-CLICK PROTOCOLS (ORDER 804n & FORM 043/u COMPLIANT)
// ─────────────────────────────────────────────────────────────────────────────

export const PEDIATRIC_PROTOCOL_PRESETS: readonly PediatricProtocolDefinition[] =
	[
		{
			id: "caries_primary",
			titleRu: "Кариес временного зуба",
			shortLabelRu: "Кариес (СИЦ / SDR)",
			subtitleRu:
				"Препарирование, СИЦ Fuji IX / SDR / Twinky Star, Bifluorid 12",
			diagnosisIcd10: "K02.1",
			diagnosisNameRu: "Кариес дентина временного зуба (K02.1)",
			serviceCode804n: "A16.07.002.001",
			serviceName804n:
				"Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров / СИЦ",
			defaultSurfaces: ["O"],
			allowsSurfaces: true,
			materials: [
				"СИЦ Fuji IX (GC)",
				"Twinky Star (цветной компомер VOCO)",
				"SDR Flow + Filtek Ultimate",
				"Ketac Molar Easymix (3M)",
			],
			defaultMaterial: "СИЦ Fuji IX (GC)",
			defaultToothFindingState: "Filled",
			icon: Sparkles,
			colorTheme:
				"border-teal-500 bg-teal-50/90 text-teal-950 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100",
		},
		{
			id: "pulpotomy_primary",
			titleRu: "Витальная пульпотомия временного зуба",
			shortLabelRu: "Пульпотомия (Pulpotec)",
			subtitleRu: "Ампутация пульпы, гемостаз H2O2, Pulpotec / Biodentine, ЦОЭ",
			diagnosisIcd10: "K04.0",
			diagnosisNameRu: "Пульпит временного зуба обратимый (K04.0)",
			serviceCode804n: "A16.07.030.001",
			serviceName804n:
				"Пульпотомия (ампутация коронковой пульпы временного зуба)",
			defaultSurfaces: ["O"],
			allowsSurfaces: true,
			materials: [
				"Pulpotec (Septodont)",
				"Biodentine (Septodont)",
				"MTA ProRoot (Dentsply)",
			],
			defaultMaterial: "Pulpotec (Septodont)",
			defaultToothFindingState: "EndoTreated",
			icon: Activity,
			colorTheme:
				"border-rose-500 bg-rose-50/90 text-rose-950 dark:border-rose-400 dark:bg-rose-950/60 dark:text-rose-100",
		},
		{
			id: "silvering_deep_fluoridation",
			titleRu: "Серебрение / глубокое фторирование",
			shortLabelRu: "Серебрение / Фтор",
			subtitleRu: "Сафорайд 38% / Gluftored / Tiefenfluorid, микробраш, сушка",
			diagnosisIcd10: "K02.0",
			diagnosisNameRu: "Кариес эмали / стадия пятна (K02.0)",
			serviceCode804n: "A11.07.012",
			serviceName804n:
				"Глубокое фторирование твердых тканей зубов / серебрение временных зубов",
			defaultSurfaces: ["V"],
			allowsSurfaces: false,
			materials: [
				"Сафорайд 38% (Saforide)",
				"Глуфторед (Gluftored)",
				"Тифенфлюорид (Tiefenfluorid)",
				"Аргенат 30%",
			],
			defaultMaterial: "Сафорайд 38% (Saforide)",
			defaultToothFindingState: "Watch",
			icon: Droplets,
			colorTheme:
				"border-purple-500 bg-purple-50/90 text-purple-950 dark:border-purple-400 dark:bg-purple-950/60 dark:text-purple-100",
		},
		{
			id: "fissure_sealing",
			titleRu: "Герметизация фиссур молочных/постоянных моляров",
			shortLabelRu: "Герметизация (Fissurit)",
			subtitleRu:
				"Неинвазивная Fissurit FX / Helioseal, протравливание, полимеризация",
			diagnosisIcd10: "K02.0",
			diagnosisNameRu: "Профилактика кариеса ямок и фиссур (K02.0 / Z29.8)",
			serviceCode804n: "A16.07.057",
			serviceName804n:
				"Запечатывание фиссуры зуба герметиком (Fissurit FX / Helioseal)",
			defaultSurfaces: ["O"],
			allowsSurfaces: false,
			materials: [
				"Fissurit FX (VOCO)",
				"Helioseal F (Ivoclar)",
				"Clinpro Sealant (3M)",
			],
			defaultMaterial: "Fissurit FX (VOCO)",
			defaultToothFindingState: "Healthy",
			icon: ShieldCheck,
			colorTheme:
				"border-sky-500 bg-sky-50/90 text-sky-950 dark:border-sky-400 dark:bg-sky-950/60 dark:text-sky-100",
		},
		{
			id: "extraction_primary_exfoliation",
			titleRu: "Удаление молочного зуба при физиологической смене",
			shortLabelRu: "Удаление (смена корней)",
			subtitleRu: "Аппликационный гель (вишня), детские щипцы, марлевый тампон",
			diagnosisIcd10: "K08.8",
			diagnosisNameRu:
				"Физиологическая резорбция корней временного зуба (K08.8)",
			serviceCode804n: "A16.07.001.001",
			serviceName804n: "Удаление временного зуба при физиологической смене",
			defaultSurfaces: [],
			allowsSurfaces: false,
			materials: [
				"Аппликационный гель Дисилан / Лидоксор (вишня)",
				"Инфильтрация Артикаин 1:200 000 (по показаниям)",
			],
			defaultMaterial: "Аппликационный гель Дисилан / Лидоксор (вишня)",
			defaultToothFindingState: "Extracted",
			icon: Scissors,
			colorTheme:
				"border-indigo-500 bg-indigo-50/90 text-indigo-950 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-100",
		},
		{
			id: "standard_crown",
			titleRu: "Восстановление стандартной защитной коронкой",
			shortLabelRu: "Коронка (Hall / SSC)",
			subtitleRu: "Металл / Цирконий, методика Hall, СИЦ Fuji Plus / Ketac Cem",
			diagnosisIcd10: "K02.1",
			diagnosisNameRu:
				"Кариес дентина / разрушение коронки временного моляра (K02.1 / K04.0)",
			serviceCode804n: "A16.07.004.001",
			serviceName804n:
				"Восстановление зуба стандартной защитной коронкой (металл / цирконий, методика Hall)",
			defaultSurfaces: ["O"],
			allowsSurfaces: false,
			materials: [
				"Стандартная стальная коронка SSC (3M ESPE)",
				"Циркониевая коронка NuSmile ZR",
				"Коронка Kids-e-Crown",
				"СИЦ Fuji Plus (GC фиксация)",
				"Ketac Cem Easymix (3M)",
			],
			defaultMaterial: "Стандартная стальная коронка SSC (3M ESPE)",
			defaultToothFindingState: "Crown",
			icon: DentalCrown,
			colorTheme:
				"border-amber-500 bg-amber-50/90 text-amber-950 dark:border-amber-400 dark:bg-amber-950/60 dark:text-amber-100",
		},
	];

// ─────────────────────────────────────────────────────────────────────────────
// ANATOMICAL FDI NAMES & FAST PRESET COMBINATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const PEDIATRIC_TEETH_NAMES: Readonly<Record<number, string>> = {
	51: "Верхний правый центральный резец",
	52: "Верхний правый боковой резец",
	53: "Верхний правый клык",
	54: "Верхний правый первый моляр",
	55: "Верхний правый второй моляр",
	61: "Верхний левый центральный резец",
	62: "Верхний левый боковой резец",
	63: "Верхний левый клык",
	64: "Верхний левый первый моляр",
	65: "Верхний левый второй моляр",
	71: "Нижний левый центральный резец",
	72: "Нижний левый боковой резец",
	73: "Нижний левый клык",
	74: "Нижний левый первый моляр",
	75: "Нижний левый второй моляр",
	81: "Нижний правый центральный резец",
	82: "Нижний правый боковой резец",
	83: "Нижний правый клык",
	84: "Нижний правый первый моляр",
	85: "Нижний правый второй моляр",
	16: "Верхний правый первый постоянный моляр",
	26: "Верхний левый первый постоянный моляр",
	36: "Нижний левый первый постоянный моляр",
	46: "Нижний правый первый постоянный моляр",
};

export const PEDIATRIC_SURFACE_PRESETS: readonly PediatricSurfacePreset[] = [
	{
		id: "mod",
		labelRu: "MOD",
		surfaces: ["M", "O", "D"],
		descriptionRu: "Медиально-окклюзионно-дистальная",
	},
	{
		id: "mo",
		labelRu: "MO",
		surfaces: ["M", "O"],
		descriptionRu: "Медиально-окклюзионная",
	},
	{
		id: "od",
		labelRu: "OD",
		surfaces: ["O", "D"],
		descriptionRu: "Окклюзионно-дистальная",
	},
	{ id: "o", labelRu: "O", surfaces: ["O"], descriptionRu: "Окклюзионная" },
	{
		id: "v",
		labelRu: "V",
		surfaces: ["V"],
		descriptionRu: "Вестибулярная / пришеечная",
	},
	{
		id: "lp",
		labelRu: "L/P",
		surfaces: ["L"],
		descriptionRu: "Оральная (язычная/небная)",
	},
] as const;

export const QUICK_PEDIATRIC_TEETH = [
	54, 55, 64, 65, 74, 75, 84, 85, 51, 61, 16, 26, 36, 46,
] as const;

export const DEFAULT_SEDATION_STATE: PediatricSedationState = {
	enabled: false,
	gasRatioN2O: 40,
	gasRatioO2: 60,
	spO2Percent: 99,
	pulseBpm: 92,
	durationMinutes: 20,
	postOxygenationMinutes: 5,
};
