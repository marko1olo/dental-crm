/**
 * inventoryMath.ts — Движок технологических карт стоматологических процедур,
 * точного расчета себестоимости материалов (копейки) и контроля складских остатков.
 *
 * СОДЕРЖИТ:
 * 1. Эталонные технологические карты (Bill of Materials) для ключевых процедур:
 *    - Базовый набор СИЗ и антисептики (СанПиН 3.3686-21)
 *    - Местная анестезия (Артикаин 1.7 мл, карпульные иглы 30G)
 *    - Пломбирование кариеса (Адгезив 7 пок., травильный гель, композит Filtek/Gradia, матричные системы)
 *    - Эндодонтия (Гипохлорит Na 3%, ЭДТА гель, эндолубрикант, силер AH Plus, гуттаперчевые штифты, бумажные пины)
 *    - Профессиональная гигиена (Air-Flow глицин, полировочная паста, щетки, фторлак, OptraGate)
 *    - Хирургическое удаление зуба (Гемостатическая губка, шовный материал PTFE, лезвие 15C)
 * 2. Копеечно-точный расчет себестоимости (Kopecks) без накопления ошибок округления.
 * 3. Мониторинг дефицита и критических остатков на складе (Low-Stock & Negative-Stock Alerts).
 * 4. Сопоставление номенклатуры техкарты с реальным складским каталогом (InventoryItem).
 */

import {
	type Kopecks,
	formatKopecksRu,
	multiplyKopecks,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type { InventoryItem } from "./useInventoryLogic";

export type TechMapCategory =
	| "ppe"
	| "anesthesia"
	| "caries"
	| "endo"
	| "hygiene"
	| "surgery"
	| "other";

export const TECH_MAP_CATEGORY_LABELS: Record<TechMapCategory, string> = {
	ppe: "СИЗ и расходники",
	anesthesia: "Анестезия",
	caries: "Терапия (кариес)",
	endo: "Эндодонтия",
	hygiene: "Профгигиена",
	surgery: "Хирургия",
	other: "Прочие материалы",
};

export const TECH_MAP_CATEGORY_COLORS: Record<
	TechMapCategory,
	{ bg: string; text: string; border: string }
> = {
	ppe: {
		bg: "rgba(59, 130, 246, 0.12)",
		text: "#2563eb",
		border: "rgba(59, 130, 246, 0.3)",
	},
	anesthesia: {
		bg: "rgba(245, 158, 11, 0.12)",
		text: "#d97706",
		border: "rgba(245, 158, 11, 0.3)",
	},
	caries: {
		bg: "rgba(13, 148, 136, 0.12)",
		text: "#0d9488",
		border: "rgba(13, 148, 136, 0.3)",
	},
	endo: {
		bg: "rgba(168, 85, 247, 0.12)",
		text: "#9333ea",
		border: "rgba(168, 85, 247, 0.3)",
	},
	hygiene: {
		bg: "rgba(16, 185, 129, 0.12)",
		text: "#059669",
		border: "rgba(16, 185, 129, 0.3)",
	},
	surgery: {
		bg: "rgba(239, 68, 68, 0.12)",
		text: "#dc2626",
		border: "rgba(239, 68, 68, 0.3)",
	},
	other: {
		bg: "rgba(107, 114, 128, 0.12)",
		text: "#4b5563",
		border: "rgba(107, 114, 128, 0.3)",
	},
};

export interface ProcedureTechMapItem {
	readonly id: string;
	readonly materialName: string;
	readonly category: TechMapCategory;
	readonly unit: string;
	readonly standardQuantity: number;
	readonly defaultUnitCostKopecks: Kopecks;
	readonly lotTrackingRequired?: boolean;
	readonly description?: string;
	readonly order804nCode?: string;
	readonly mandatory?: boolean;
}

export interface ProcedureTechMap {
	readonly id: string;
	readonly code: string;
	readonly title: string;
	readonly specialty: string;
	readonly description: string;
	readonly items: readonly ProcedureTechMapItem[];
}

/**
 * БАЗОВЫЙ НАБОР СИЗ И РАСХОДНИКОВ ПРИЕМА (СанПиН 3.3686-21)
 * Списывается на каждый стоматологический прием по умолчанию.
 */
export const COMMON_PPE_TECH_MAP: ProcedureTechMap = {
	id: "tm-ppe-common",
	code: "SANPIN_PPE",
	title: "СИЗ и одноразовые расходники приема",
	specialty: "Общее",
	description: "Обязательный стандартный противоэпидемический набор на 1 прием пациента",
	items: [
		{
			id: "ppe-gloves",
			materialName: "Перчатки нитриловые неопудренные (врач + ассистент)",
			category: "ppe",
			unit: "пары",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("35.00"),
			mandatory: true,
			description: "2 пары на прием по СанПиН 3.3686-21",
		},
		{
			id: "ppe-mask",
			materialName: "Маска медицинская защитная трехслойная с фиксатором",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("15.00"),
			mandatory: true,
		},
		{
			id: "ppe-saliva-ejector",
			materialName: "Слюноотсос одноразовый стоматологический с гибким наконечником",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("12.50"),
			mandatory: true,
		},
		{
			id: "ppe-cotton-rolls",
			materialName: "Ватные валики стоматологические стерильные №2",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 6,
			defaultUnitCostKopecks: parseKopecks("3.50"),
			mandatory: true,
		},
		{
			id: "ppe-napkin",
			materialName: "Салфетка нагрудная двухслойная водонепроницаемая",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("18.00"),
			mandatory: true,
		},
		{
			id: "ppe-microbrush",
			materialName: "Микроаппликатор стоматологический (браш) Regular",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("8.50"),
			mandatory: true,
		},
		{
			id: "ppe-suction-cannula",
			materialName: "Наконечник для пылесоса хирургический/эвакуатор",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("25.00"),
			mandatory: true,
		},
	],
};

/**
 * ТЕХКАРТА: МЕСТНАЯ АНЕСТЕЗИЯ (Карпульная)
 */
export const ANESTHESIA_TECH_MAP: ProcedureTechMap = {
	id: "tm-anesthesia",
	code: "A16.07.004",
	title: "Анестезия инфильтрационная / проводниковая",
	specialty: "Терапия / Хирургия",
	description: "Карпульная анестезия с обязательным МДЛП/серийным учетом",
	items: [
		{
			id: "anes-cartridge",
			materialName: "Анестетик артикаиновый 4% с эпинефрином 1:100000 (Ультракаин Д-С / Септонест) 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("220.00"),
			lotTrackingRequired: true,
			mandatory: true,
			description: "Подлежит учету серии и срока годности",
		},
		{
			id: "anes-needle",
			materialName: "Игла карпульная 30G евростандарт 25 мм",
			category: "anesthesia",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("28.00"),
			mandatory: true,
		},
		{
			id: "anes-topical",
			materialName: "Гель анестезирующий аппликационный (Топикал / Джен-Релиф)",
			category: "anesthesia",
			unit: "мл",
			standardQuantity: 0.2,
			defaultUnitCostKopecks: parseKopecks("45.00"),
			mandatory: false,
		},
	],
};

/**
 * ТЕХКАРТА: ЛЕЧЕНИЕ КАРИЕСА ФОТОПОЛИМЕРОМ (A16.07.002.001)
 */
export const CARIES_TREATMENT_TECH_MAP: ProcedureTechMap = {
	id: "tm-caries-restoration",
	code: "A16.07.002.001",
	title: "Лечение кариеса и фотополимерная реставрация",
	specialty: "Терапия",
	description: "Препарирование, адгезивный протокол, композитная реставрация и полировка",
	items: [
		{
			id: "caries-composite",
			materialName: "Наногибридный композит светоотверждаемый (Filtek Z250 / Estelite Asteria / GC Gradia)",
			category: "caries",
			unit: "г",
			standardQuantity: 0.4,
			defaultUnitCostKopecks: parseKopecks("1300.00"), // 520 ₽ за 0.4г
			mandatory: true,
			description: "0.4 г на полость среднего объема",
		},
		{
			id: "caries-adhesive",
			materialName: "Самопротравливающий адгезив 7-го поколения (Single Bond Universal / Tokuyama EE)",
			category: "caries",
			unit: "мл",
			standardQuantity: 0.1,
			defaultUnitCostKopecks: parseKopecks("1800.00"), // 180 ₽ за 0.1 мл
			mandatory: true,
		},
		{
			id: "caries-etching-gel",
			materialName: "Гель травильный 37% ортофосфорная кислота",
			category: "caries",
			unit: "мл",
			standardQuantity: 0.2,
			defaultUnitCostKopecks: parseKopecks("175.00"), // 35 ₽
			mandatory: true,
		},
		{
			id: "caries-matrix-system",
			materialName: "Секционная матричная система контурная 3D + деревянный клин Tor VM",
			category: "caries",
			unit: "компл.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("95.00"),
			mandatory: true,
		},
		{
			id: "caries-polishing-discs",
			materialName: "Полировочные диски и силиконовые головки Enhance / Sof-Lex",
			category: "caries",
			unit: "шт.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("65.00"),
			mandatory: true,
		},
		{
			id: "caries-cofferdam-sheet",
			materialName: "Платок коффердама латексный Sanctuary Dental Dam",
			category: "caries",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("115.00"),
			mandatory: false,
		},
		{
			id: "caries-finishing-paste",
			materialName: "Паста алмазная полировочная для композитов Diamond Polish",
			category: "caries",
			unit: "г",
			standardQuantity: 0.2,
			defaultUnitCostKopecks: parseKopecks("375.00"), // 75 ₽
			mandatory: false,
		},
	],
};

/**
 * ТЕХКАРТА: ЭНДОДОНТИЯ (Обработка и обтурация 1-канального зуба - A16.07.030.001 / A16.07.008.001)
 */
export const ENDO_1_CANAL_TECH_MAP: ProcedureTechMap = {
	id: "tm-endo-1canal",
	code: "A16.07.030.001",
	title: "Эндодонтия: механическая обработка и пломбирование 1 канала",
	specialty: "Эндодонтия",
	description: "Ирригация гипохлоритом Na 3%, ЭДТА гель, ротационные файлы, силер AH Plus и гуттаперча",
	items: [
		{
			id: "endo1-hypochlorite",
			materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации",
			category: "endo",
			unit: "мл",
			standardQuantity: 15,
			defaultUnitCostKopecks: parseKopecks("8.00"), // 120 ₽
			mandatory: true,
		},
		{
			id: "endo1-edta-gel",
			materialName: "Гель ЭДТА 17% для химического расширения каналов (Endo-Prep Cream)",
			category: "endo",
			unit: "мл",
			standardQuantity: 0.5,
			defaultUnitCostKopecks: parseKopecks("240.00"), // 120 ₽
			mandatory: true,
		},
		{
			id: "endo1-endolubricant",
			materialName: "Эндолубрикант водорастворимый для машинных файлов RC-Prep",
			category: "endo",
			unit: "мл",
			standardQuantity: 0.5,
			defaultUnitCostKopecks: parseKopecks("190.00"), // 95 ₽
			mandatory: true,
		},
		{
			id: "endo1-sealer",
			materialName: "Эпоксидный силер для постоянной обтурации AH Plus (Dentsply)",
			category: "endo",
			unit: "г",
			standardQuantity: 0.1,
			defaultUnitCostKopecks: parseKopecks("4800.00"), // 480 ₽ за 0.1 г
			mandatory: true,
		},
		{
			id: "endo1-gutta-percha",
			materialName: "Гуттаперчевые конусные штифты 0.04/0.06 калиброванные",
			category: "endo",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("60.00"),
			mandatory: true,
		},
		{
			id: "endo1-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные (пины)",
			category: "endo",
			unit: "шт.",
			standardQuantity: 3,
			defaultUnitCostKopecks: parseKopecks("15.00"),
			mandatory: true,
		},
		{
			id: "endo1-niti-files",
			materialName: "Машинные никель-титановые ротационные файлы ProTaper / WaveOne",
			category: "endo",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("850.00"),
			mandatory: true,
		},
	],
};

/**
 * ТЕХКАРТА: ЭНДОДОНТИЯ МНОГОКАНАЛЬНАЯ (2-3-4 канала - A16.07.030.003 / A16.07.008.003)
 */
export const ENDO_MULTI_CANAL_TECH_MAP: ProcedureTechMap = {
	id: "tm-endo-multicanal",
	code: "A16.07.030.003",
	title: "Эндодонтия: обработка и пломбирование 3 каналов",
	specialty: "Эндодонтия",
	description: "Полный протокол ирригации и 3D-обтурации трехканального моляра/премоляра",
	items: [
		{
			id: "endo3-hypochlorite",
			materialName: "Раствор натрия гипохлорита 3% парфюмированный для ирригации",
			category: "endo",
			unit: "мл",
			standardQuantity: 30,
			defaultUnitCostKopecks: parseKopecks("8.00"), // 240 ₽
			mandatory: true,
		},
		{
			id: "endo3-edta-gel",
			materialName: "Гель ЭДТА 17% для химического расширения каналов (Endo-Prep Cream)",
			category: "endo",
			unit: "мл",
			standardQuantity: 1.5,
			defaultUnitCostKopecks: parseKopecks("240.00"), // 360 ₽
			mandatory: true,
		},
		{
			id: "endo3-endolubricant",
			materialName: "Эндолубрикант водорастворимый для машинных файлов RC-Prep",
			category: "endo",
			unit: "мл",
			standardQuantity: 1.0,
			defaultUnitCostKopecks: parseKopecks("190.00"), // 190 ₽
			mandatory: true,
		},
		{
			id: "endo3-sealer",
			materialName: "Эпоксидный силер для постоянной обтурации AH Plus (Dentsply)",
			category: "endo",
			unit: "г",
			standardQuantity: 0.3,
			defaultUnitCostKopecks: parseKopecks("4800.00"), // 1440 ₽
			mandatory: true,
		},
		{
			id: "endo3-gutta-percha",
			materialName: "Гуттаперчевые конусные штифты 0.04/0.06 калиброванные",
			category: "endo",
			unit: "шт.",
			standardQuantity: 3,
			defaultUnitCostKopecks: parseKopecks("60.00"), // 180 ₽
			mandatory: true,
		},
		{
			id: "endo3-paper-points",
			materialName: "Штифты бумажные абсорбирующие стерильные (пины)",
			category: "endo",
			unit: "шт.",
			standardQuantity: 9,
			defaultUnitCostKopecks: parseKopecks("15.00"), // 135 ₽
			mandatory: true,
		},
		{
			id: "endo3-niti-files",
			materialName: "Машинные никель-титановые ротационные файлы ProTaper / WaveOne",
			category: "endo",
			unit: "шт.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("850.00"), // 1700 ₽
			mandatory: true,
		},
	],
};

/**
 * ТЕХКАРТА: ПРОФЕССИОНАЛЬНАЯ ГИГИЕНА (Air-Flow + УЗ - A16.07.051)
 */
export const HYGIENE_TECH_MAP: ProcedureTechMap = {
	id: "tm-hygiene",
	code: "A16.07.051",
	title: "Профессиональная гигиена полости рта (Air-Flow + УЗ)",
	specialty: "Гигиена и профилактика",
	description: "Снятие зубных отложений ультразвуком, пескоструйная полировка Air-Flow, фторирование",
	items: [
		{
			id: "hyg-powder",
			materialName: "Порошок Air-Flow глициновый мелкодисперсный EMS Plus / Clinpro",
			category: "hygiene",
			unit: "г",
			standardQuantity: 25,
			defaultUnitCostKopecks: parseKopecks("18.00"), // 450 ₽
			mandatory: true,
		},
		{
			id: "hyg-prophy-paste",
			materialName: "Полировочная паста Cleanic / Detartrine",
			category: "hygiene",
			unit: "г",
			standardQuantity: 3,
			defaultUnitCostKopecks: parseKopecks("40.00"), // 120 ₽
			mandatory: true,
		},
		{
			id: "hyg-brush",
			materialName: "Щетка полировочная циркулярная нейлоновая",
			category: "hygiene",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("65.00"),
			mandatory: true,
		},
		{
			id: "hyg-varnish",
			materialName: "Фторлак защитный Clinpro White Varnish",
			category: "hygiene",
			unit: "мл",
			standardQuantity: 0.5,
			defaultUnitCostKopecks: parseKopecks("640.00"), // 320 ₽
			mandatory: true,
		},
		{
			id: "hyg-optragate",
			materialName: "Ретрактор мягкий OptraGate (Ivoclar)",
			category: "hygiene",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("210.00"),
			mandatory: true,
		},
	],
};

/**
 * ТЕХКАРТА: ХИРУРГИЧЕСКОЕ УДАЛЕНИЕ ЗУБА (A16.07.001.001)
 */
export const SURGERY_EXTRACTION_TECH_MAP: ProcedureTechMap = {
	id: "tm-surgery-ext",
	code: "A16.07.001.001",
	title: "Атравматичное удаление зуба с ревизией лунки",
	specialty: "Хирургия",
	description: "Удаление зуба, гемостаз коллагеновой губкой Альвостаз, наложение швов PTFE",
	items: [
		{
			id: "surg-sponge",
			materialName: "Гемостатическая коллагеновая губка Альвостаз / Parasorb Cone",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("310.00"),
			mandatory: true,
		},
		{
			id: "surg-suture",
			materialName: "Шовный материал монофиламентный PTFE / Пролен 4-0 с атравматической иглой",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("340.00"),
			mandatory: true,
		},
		{
			id: "surg-blade",
			materialName: "Микрохирургическое лезвие №15C Swann-Morton стерильное",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("85.00"),
			mandatory: true,
		},
		{
			id: "surg-curasept",
			materialName: "Антисептический пародонтальный гель Curasept ADS 1% / Метрогил",
			category: "surgery",
			unit: "мл",
			standardQuantity: 1.0,
			defaultUnitCostKopecks: parseKopecks("60.00"),
			mandatory: false,
		},
	],
};

/**
 * ТЕХКАРТА: СТЕРИЛИЗАЦИЯ И КРАФТ-ПАКЕТЫ (СанПиН 3.3686-21)
 */
export const STERILIZATION_KRAFT_TECH_MAP: ProcedureTechMap = {
	id: "tm-steril-kraft",
	code: "SANPIN_KRAFT",
	title: "Стерилизация и крафт-пакеты (СанПиН 3.3686-21)",
	specialty: "ЦСО / Сестринское дело",
	description: "Крафт-пакеты самоклеящиеся 100×200, химические интеграторы 5 класса (ИнтеТЕСТ 134/5), термоэтикетки 58×40",
	items: [
		{
			id: "steril-kraft-pouch-100x200",
			materialName: "Крафт-пакет самоклеящийся 100×200 мм (срок стерильности 50 суток)",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("8.50"),
			mandatory: true,
			description: "СанПиН 3.3686-21 п. 3632",
		},
		{
			id: "steril-integrator-class5",
			materialName: "Химический интегратор 5 класса ИнтеТЕСТ-В-134/5 (ГОСТ ISO 11140-1)",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("4.20"),
			mandatory: true,
		},
		{
			id: "steril-thermal-label-58x40",
			materialName: "Термоэтикетка самоклеящаяся 58×40 мм для штрихкода крафт-пакета",
			category: "ppe",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("1.80"),
			mandatory: true,
		},
	],
};

/**
 * ТЕХКАРТА: ДЕНТАЛЬНАЯ ИМПЛАНТАЦИЯ (A16.07.054)
 */
export const IMPLANT_PLACEMENT_TECH_MAP: ProcedureTechMap = {
	id: "tm-implant",
	code: "A16.07.054",
	title: "Внутрикостная дентальная имплантация (установка титанового имплантата)",
	specialty: "Хирургия / Имплантология",
	description: "Установка дентального имплантата: титановый винт SLA, заглушка, шовный материал PTFE 4-0, артикаин 2 карпулы",
	items: [
		{
			id: "imp-fixture",
			materialName: "Дентальный имплантат титановый SLA стерильный (Straumann/Osstem/Dentium)",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("14500.00"), // 14 500.00 ₽
			mandatory: true,
			lotTrackingRequired: true,
			description: "Подлежит серийному учету (МДЛП)",
		},
		{
			id: "imp-cover-screw",
			materialName: "Винт-заглушка / формирователь десны титановый стерильный",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("1500.00"), // 1 500.00 ₽
			mandatory: true,
		},
		{
			id: "imp-suture",
			materialName: "Шовный материал монофиламентный PTFE / Vicryl 4-0 с атравматической иглой",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("340.00"),
			mandatory: true,
		},
		{
			id: "imp-anesthesia",
			materialName: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("220.00"),
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "imp-blade",
			materialName: "Микрохирургическое лезвие №15C Swann-Morton стерильное",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("85.00"),
			mandatory: true,
		},
		{
			id: "imp-ppe-set",
			materialName: "Стерильный операционный набор СИЗ хирурга и ассистента",
			category: "ppe",
			unit: "компл.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("950.00"),
			mandatory: true,
		},
	],
};

/**
 * Полный каталог стандартных технологических карт
 */
export const ALL_PROCEDURE_TECH_MAPS: readonly ProcedureTechMap[] = [
	COMMON_PPE_TECH_MAP,
	STERILIZATION_KRAFT_TECH_MAP,
	ANESTHESIA_TECH_MAP,
	CARIES_TREATMENT_TECH_MAP,
	ENDO_1_CANAL_TECH_MAP,
	ENDO_MULTI_CANAL_TECH_MAP,
	HYGIENE_TECH_MAP,
	SURGERY_EXTRACTION_TECH_MAP,
	IMPLANT_PLACEMENT_TECH_MAP,
];

/**
 * Позиция списания в текущем сеансе приема
 */
export interface DeductionLineItem {
	readonly id: string;
	readonly materialName: string;
	readonly category: TechMapCategory;
	readonly unit: string;
	quantity: number;
	readonly standardQuantity: number;
	unitCostKopecks: Kopecks;
	stockQuantity: number;
	criticalThreshold: number;
	inventoryItemId?: string | undefined;
	lotNumber?: string | undefined;
	expirationDate?: string | undefined;
	lotTrackingRequired?: boolean | undefined;
	source: "tech_map" | "manual" | "preset";
	techMapCode?: string | undefined;
	mandatory?: boolean | undefined;
}

export interface DeductionStockStatus {
	readonly severity: "ok" | "warning" | "critical";
	readonly remainingStock: number;
	readonly deficit: number;
	readonly message: string;
}

export interface DeductionSummary {
	readonly totalLines: number;
	readonly totalQuantity: number;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostFormatted: string;
	readonly criticalCount: number;
	readonly warningCount: number;
	readonly hasDeficit: boolean;
	readonly categoryBreakdown: Record<
		TechMapCategory,
		{ count: number; costKopecks: Kopecks; costFormatted: string }
	>;
}

/**
 * Расчет стоимости одной строки списания в копейках без потерь плавающей точки.
 */
export function calculateLineCostKopecks(
	unitCostKopecks: Kopecks,
	quantity: number,
): Kopecks {
	if (!Number.isFinite(quantity) || quantity <= 0) return 0;
	if (Number.isInteger(quantity)) {
		return multiplyKopecks(unitCostKopecks, quantity);
	}
	// Дробное количество (например, 0.4 г или 0.1 мл):
	// Точный расчет в копейках с округлением до ближайшей целой копейки
	return Math.round(unitCostKopecks * quantity);
}

/**
 * Расчет суммарной стоимости всех позиций в копейках
 */
export function calculateTotalDeductionCostKopecks(
	lines: readonly { unitCostKopecks: Kopecks; quantity: number }[],
): Kopecks {
	const lineCosts = lines.map((l) =>
		calculateLineCostKopecks(l.unitCostKopecks, l.quantity),
	);
	return sumKopecks(lineCosts);
}

/**
 * Оценка статуса складского остатка при планируемом списании:
 * - "critical": отрицательный остаток (дефицит материала на складе)
 * - "warning": остаток после списания упадет ниже критического порога
 * - "ok": остаток достаточен
 */
export function evaluateStockStatus(
	stockQuantity: number,
	quantityToDeduct: number,
	criticalThreshold: number = 0,
	unit: string = "шт.",
): DeductionStockStatus {
	const current = Number.isFinite(stockQuantity) ? stockQuantity : 0;
	const deduct = Number.isFinite(quantityToDeduct) ? quantityToDeduct : 0;
	const threshold = Number.isFinite(criticalThreshold) ? criticalThreshold : 0;

	const remainingStock = Number((current - deduct).toFixed(4));

	if (current <= 0 || remainingStock < 0) {
		const deficit = Math.abs(remainingStock);
		return {
			severity: "critical",
			remainingStock,
			deficit,
			message: `Дефицит на складе! В наличии: ${current} ${unit}, требуется: ${deduct} ${unit}, нехватка: ${deficit} ${unit}`,
		};
	}

	if (remainingStock <= threshold) {
		return {
			severity: "warning",
			remainingStock,
			deficit: 0,
			message: `Низкий остаток! После списания останется ${remainingStock} ${unit} (порог: ${threshold} ${unit})`,
		};
	}

	return {
		severity: "ok",
		remainingStock,
		deficit: 0,
		message: `В наличии: ${current} ${unit} (после списания: ${remainingStock} ${unit})`,
	};
}

/**
 * Сопоставление наименования материала с реальной складской позицией.
 */
export function matchMaterialToWarehouse(
	materialName: string,
	warehouseItems: readonly InventoryItem[],
): InventoryItem | undefined {
	if (!materialName || !warehouseItems || warehouseItems.length === 0) {
		return undefined;
	}

	const cleanTarget = materialName.toLowerCase().trim();

	// 1. Точное совпадение
	const exact = warehouseItems.find(
		(w) => w.name.toLowerCase().trim() === cleanTarget,
	);
	if (exact) return exact;

	// 2. Поиск по ключевым маркам и паттернам
	const targetTokens = cleanTarget
		.replace(/[()[\]/\\,.-]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 2);

	let bestMatch: InventoryItem | undefined;
	let maxTokenMatches = 0;

	for (const item of warehouseItems) {
		const itemNameLower = item.name.toLowerCase();
		let matches = 0;
		for (const token of targetTokens) {
			if (itemNameLower.includes(token)) {
				matches++;
			}
		}
		if (matches > maxTokenMatches && matches >= Math.min(2, targetTokens.length)) {
			maxTokenMatches = matches;
			bestMatch = item;
		}
	}

	return bestMatch;
}

/**
 * Построение набора строк списания по выбранным кодам технологических карт
 */
export function createDeductionLinesFromTechMaps(
	selectedMapCodes: readonly string[],
	warehouseItems: readonly InventoryItem[] = [],
	includeCommonPpe: boolean = true,
): DeductionLineItem[] {
	const codesToInclude = new Set<string>(selectedMapCodes);
	if (includeCommonPpe) {
		codesToInclude.add("SANPIN_PPE");
	}

	const lines: DeductionLineItem[] = [];
	const seenItemNames = new Set<string>();

	for (const techMap of ALL_PROCEDURE_TECH_MAPS) {
		if (!codesToInclude.has(techMap.code) && !codesToInclude.has(techMap.id)) {
			continue;
		}

		for (const specItem of techMap.items) {
			const normKey = specItem.materialName.toLowerCase().trim();
			if (seenItemNames.has(normKey)) {
				// Если материал уже есть в списке (например, анестетик), суммируем количество
				const existing = lines.find(
					(l) => l.materialName.toLowerCase().trim() === normKey,
				);
				if (existing) {
					existing.quantity = Number(
						(existing.quantity + specItem.standardQuantity).toFixed(4),
					);
				}
				continue;
			}
			seenItemNames.add(normKey);

			// Ищем соответствие на складе
			const matched = matchMaterialToWarehouse(specItem.materialName, warehouseItems);

			let unitCostKopecks = specItem.defaultUnitCostKopecks;
			let stockQty = 0;
			let criticalThreshold = 0;
			let lotNumber: string | undefined;
			let expirationDate: string | undefined;
			let inventoryItemId: string | undefined;

			if (matched) {
				inventoryItemId = matched.id;
				stockQty = matched.stockQuantity;
				criticalThreshold = matched.criticalThreshold;
				lotNumber = matched.lotNumber;
				expirationDate = matched.expirationDate;
				if (matched.unitCostRub !== undefined && matched.unitCostRub !== "") {
					try {
						unitCostKopecks = parseKopecks(matched.unitCostRub);
					} catch {
						unitCostKopecks = specItem.defaultUnitCostKopecks;
					}
				}
			}

			lines.push({
				id: `line-${specItem.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				materialName: specItem.materialName,
				category: specItem.category,
				unit: specItem.unit,
				quantity: specItem.standardQuantity,
				standardQuantity: specItem.standardQuantity,
				unitCostKopecks,
				stockQuantity: stockQty,
				criticalThreshold,
				inventoryItemId,
				lotNumber,
				expirationDate,
				lotTrackingRequired: specItem.lotTrackingRequired,
				source: "tech_map",
				techMapCode: techMap.code,
				mandatory: specItem.mandatory,
			});
		}
	}

	return lines;
}

/**
 * Полный расчет сводки списания по всем позициям и категориям
 */
export function calculateDeductionSummary(
	lines: readonly DeductionLineItem[],
): DeductionSummary {
	let totalQty = 0;
	let totalCostKopecks: Kopecks = 0;
	let criticalCount = 0;
	let warningCount = 0;

	const categoryMap: Record<
		TechMapCategory,
		{ count: number; costKopecks: Kopecks }
	> = {
		ppe: { count: 0, costKopecks: 0 },
		anesthesia: { count: 0, costKopecks: 0 },
		caries: { count: 0, costKopecks: 0 },
		endo: { count: 0, costKopecks: 0 },
		hygiene: { count: 0, costKopecks: 0 },
		surgery: { count: 0, costKopecks: 0 },
		other: { count: 0, costKopecks: 0 },
	};

	for (const line of lines) {
		const qty = Number.isFinite(line.quantity) ? line.quantity : 0;
		totalQty += qty;

		const lineCost = calculateLineCostKopecks(line.unitCostKopecks, qty);
		totalCostKopecks += lineCost;

		const stockStatus = evaluateStockStatus(
			line.stockQuantity,
			qty,
			line.criticalThreshold,
			line.unit,
		);

		if (stockStatus.severity === "critical") {
			criticalCount++;
		} else if (stockStatus.severity === "warning") {
			warningCount++;
		}

		const cat = categoryMap[line.category] ?? categoryMap.other;
		cat.count++;
		cat.costKopecks += lineCost;
	}

	const categoryBreakdown = {} as DeductionSummary["categoryBreakdown"];
	for (const [key, val] of Object.entries(categoryMap) as [
		TechMapCategory,
		{ count: number; costKopecks: Kopecks },
	][]) {
		categoryBreakdown[key] = {
			count: val.count,
			costKopecks: val.costKopecks,
			costFormatted: formatKopecksRu(val.costKopecks),
		};
	}

	return {
		totalLines: lines.length,
		totalQuantity: Number(totalQty.toFixed(4)),
		totalCostKopecks,
		totalCostFormatted: formatKopecksRu(totalCostKopecks),
		criticalCount,
		warningCount,
		hasDeficit: criticalCount > 0,
		categoryBreakdown,
	};
}

/**
 * Элемент заказа поставщику в интерфейсе
 */
export interface SupplierPurchaseOrderItemView {
	readonly sku: string;
	readonly materialName: string;
	readonly category: TechMapCategory;
	readonly unit: string;
	readonly currentStock: number;
	readonly criticalThreshold: number;
	readonly shortfall: number;
	readonly suggestedOrderQuantity: number;
	readonly unitCostKopecks: Kopecks;
	readonly unitCostFormatted: string;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostFormatted: string;
}

/**
 * Документ заказа поставщику в интерфейсе
 */
export interface SupplierPurchaseOrderView {
	readonly id: string;
	readonly orderNumber: string;
	readonly orderDate: string;
	readonly clinicNameRu: string;
	readonly reason: "stock_deficit" | "critical_threshold_breach";
	readonly items: readonly SupplierPurchaseOrderItemView[];
	readonly totalItemsCount: number;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostFormatted: string;
}

/**
 * 1-Кликовое формирование заказа поставщику на основе позиций списания с дефицитом или критическим остатком
 */
export function createSupplierPurchaseOrderFromLines(
	lines: readonly DeductionLineItem[],
	clinicNameRu: string = "Стоматологическая клиника DENTE",
	reorderMultiplier: number = 2,
): SupplierPurchaseOrderView | null {
	const items: SupplierPurchaseOrderItemView[] = [];

	for (const line of lines) {
		const qty = Number.isFinite(line.quantity) ? line.quantity : 0;
		const status = evaluateStockStatus(line.stockQuantity, qty, line.criticalThreshold, line.unit);

		if (status.severity === "critical" || status.severity === "warning") {
			const threshold = line.criticalThreshold > 0 ? line.criticalThreshold : 2;
			const shortfall = status.deficit;
			let suggested = 0;

			if (["шт.", "карп.", "упак.", "доза", "компл.", "пары"].includes(line.unit)) {
				suggested = Math.max(Math.ceil(threshold * reorderMultiplier), Math.ceil(shortfall + threshold), 1);
			} else {
				suggested = Number(Math.max(threshold * reorderMultiplier, shortfall + threshold, 1).toFixed(2));
			}

			const lineCostKopecks = calculateLineCostKopecks(line.unitCostKopecks, suggested);

			items.push({
				sku: line.inventoryItemId || `SKU-${line.id.slice(-6).toUpperCase()}`,
				materialName: line.materialName,
				category: line.category,
				unit: line.unit,
				currentStock: line.stockQuantity,
				criticalThreshold: threshold,
				shortfall,
				suggestedOrderQuantity: suggested,
				unitCostKopecks: line.unitCostKopecks,
				unitCostFormatted: formatKopecksRu(line.unitCostKopecks),
				totalCostKopecks: lineCostKopecks,
				totalCostFormatted: formatKopecksRu(lineCostKopecks),
			});
		}
	}

	if (items.length === 0) return null;

	const totalCost = items.reduce((acc, i) => acc + i.totalCostKopecks, 0);
	const hasDeficit = items.some((i) => i.shortfall > 0);
	const dateStr = new Date().toISOString().slice(0, 10);
	const orderNumber = `ПО-${dateStr.replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

	return {
		id: `po-view-${Date.now()}`,
		orderNumber,
		orderDate: dateStr,
		clinicNameRu,
		reason: hasDeficit ? "stock_deficit" : "critical_threshold_breach",
		items,
		totalItemsCount: items.length,
		totalCostKopecks: totalCost,
		totalCostFormatted: formatKopecksRu(totalCost),
	};
}

/**
 * Проверка возможности безопасного списания без дефицита (предотвращение отрицательных остатков)
 */
export function canSafelyDeductLinesWithoutDeficit(lines: readonly DeductionLineItem[]): boolean {
	for (const line of lines) {
		const qty = Number.isFinite(line.quantity) ? line.quantity : 0;
		const status = evaluateStockStatus(line.stockQuantity, qty, line.criticalThreshold, line.unit);
		if (status.severity === "critical") {
			return false;
		}
	}
	return true;
}

/**
 * Форматирует заказ поставщику в текстовый вид для буфера обмена
 */
export function formatSupplierPurchaseOrderTextRu(order: SupplierPurchaseOrderView): string {
	const lines = [
		`================================================================================`,
		`ЗАКАЗ ПОСТАВЩИКУ РАСХОДНЫХ МАТЕРИАЛОВ № ${order.orderNumber}`,
		`Дата: ${order.orderDate} | Клиника: ${order.clinicNameRu}`,
		`Основание: ${order.reason === "stock_deficit" ? "Ликвидация дефицита материалов" : "Пополнение неснижаемого запаса"}`,
		`================================================================================`,
		`СПЕЦИФИКАЦИЯ МАТЕРИАЛОВ:`,
		`--------------------------------------------------------------------------------`,
	];

	order.items.forEach((item, idx) => {
		lines.push(
			`${idx + 1}. [${item.sku}] ${item.materialName}`,
			`   Остаток: ${item.currentStock} ${item.unit} | Норма: ${item.criticalThreshold} ${item.unit} | Дефицит: ${item.shortfall}`,
			`   Рекомендуемый заказ: ${item.suggestedOrderQuantity} ${item.unit} × ${formatKopecksRu(item.unitCostKopecks)} = ${item.totalCostFormatted}`,
			`--------------------------------------------------------------------------------`,
		);
	});

	lines.push(
		`ВСЕГО ПОЗИЦИЙ: ${order.totalItemsCount}`,
		`ИТОГО ОРИЕНТИРОВОЧНО: ${order.totalCostFormatted} (${order.totalCostKopecks} коп.)`,
		`================================================================================`,
		`Сформировано системой DENTE CRM (Модуль Auto-BOM Inventory).`,
	);

	return lines.join("\n");
}
