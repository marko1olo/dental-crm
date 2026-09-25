import { type Kopecks, parseKopecks } from "@dental/shared";
import type { ProcedureTechMap } from "./inventoryMath.js";

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
 * ТЕХКАРТА: КОСТНАЯ ПЛАСТИКА, СИНУС-ЛИФТИНГ И НКР (A16.07.055 / A16.07.041)
 */
export const BONE_GRAFT_GBR_TECH_MAP: ProcedureTechMap = {
	id: "tm-bone-graft-gbr",
	code: "A16.07.055",
	title: "Костная пластика, синус-лифтинг и НКР (Bio-Oss + Bio-Gide)",
	specialty: "Хирургия / Остеопластика",
	description: "Направленная костная регенерация: графт Geistlich Bio-Oss, мембрана Geistlich Bio-Gide, микропины, шовник Prolene 5-0 / Vicryl 4-0, анестетик",
	items: [
		{
			id: "gbr-bio-oss",
			materialName: "Костнозамещающий натуральный графт Geistlich Bio-Oss (гранулы 0.5 г)",
			category: "surgery",
			unit: "упак.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("12500.00"), // 12 500.00 ₽
			lotTrackingRequired: true,
			mandatory: true,
			description: "Остеокондуктивный натуральный бычий костный матрикс",
		},
		{
			id: "gbr-bio-gide",
			materialName: "Коллагеновая резорбируемая барьерная мембрана Geistlich Bio-Gide 25×25 мм",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("16800.00"), // 16 800.00 ₽
			lotTrackingRequired: true,
			mandatory: true,
			description: "Двухслойная барьерная коллагеновая мембрана",
		},
		{
			id: "gbr-titanium-pins",
			materialName: "Титановые микропины для фиксации мембраны (комплект 2 шт)",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("1200.00"), // 2 400.00 ₽ за 2 шт
			mandatory: true,
		},
		{
			id: "gbr-prolene-suture",
			materialName: "Шовный материал монофиламентный нерассасывающийся Prolene 5-0 (Ethicon)",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("540.00"),
			mandatory: true,
		},
		{
			id: "gbr-vicryl-suture",
			materialName: "Шовный материал рассасывающийся Vicryl 4-0 с атравматической иглой (Ethicon)",
			category: "surgery",
			unit: "шт.",
			standardQuantity: 1,
			defaultUnitCostKopecks: parseKopecks("480.00"),
			mandatory: false,
		},
		{
			id: "gbr-anesthesia",
			materialName: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 (Ультракаин Д-С Форте) 1.7 мл",
			category: "anesthesia",
			unit: "карп.",
			standardQuantity: 2,
			defaultUnitCostKopecks: parseKopecks("230.00"),
			mandatory: true,
			lotTrackingRequired: true,
		},
		{
			id: "gbr-sterile-drape",
			materialName: "Стерильный операционный комплект накрытия поля и хирурга",
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
	BONE_GRAFT_GBR_TECH_MAP,
];

