/**
 * clinicalBundlesRoutes.ts — Fastify роуты готовых клинических пакетов «под ключ» DENTE CRM.
 * (Мандат 8e: Автономия врача, Мандат 8n: Соло-практика, Высшая Конституция THE HAMMER).
 *
 * Интегрирован с PostgreSQL 18 на 127.0.0.1:5432, tenant isolation (organizationId),
 * точные цены в копейках (Kopecks), чистый семантический язык без советского канцелярита.
 */

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
} from "../db/schema.js";

export interface ApiBundleItemTemplate {
	readonly id: string;
	readonly serviceCode: string;
	readonly code804n?: string;
	readonly name: string;
	readonly category: string;
	readonly defaultPriceRub: number;
	readonly defaultPriceKopecks: number;
	readonly materials: string;
	readonly clinicalRationale: string;
	readonly optional?: boolean;
	readonly defaultSelected?: boolean;
}

export interface ApiClinicalBundle {
	readonly id: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly category: "therapy" | "surgery" | "hygiene" | "orthopedics" | "implantation";
	readonly categoryLabel: string;
	readonly stageKind: string;
	readonly stageNumber: number;
	readonly totalPriceRub: number;
	readonly totalPriceKopecks: number;
	readonly basePriceRub: number;
	readonly basePriceKopecks: number;
	readonly requiresTooth: boolean;
	readonly defaultTooth: number;
	readonly badgeColor: string;
	readonly items: readonly ApiBundleItemTemplate[];
}

export const CANONICAL_CLINICAL_BUNDLES: readonly ApiClinicalBundle[] = [
	{
		id: "caries_turnkey",
		title: "Пакет: Лечение кариеса под ключ (анестезия + коффердам + пломба Estelite + полировка)",
		shortTitle: "Кариес под ключ",
		description: "Санация кариозной полости: анестезия, коффердам, реставрация Estelite Sigma Quick и финишная полировка.",
		category: "therapy",
		categoryLabel: "Терапия",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 7500,
		totalPriceKopecks: 750000,
		basePriceRub: 7500,
		basePriceKopecks: 750000,
		requiresTooth: true,
		defaultTooth: 16,
		badgeColor: "emerald",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Местная анестезия инфильтрационная / проводниковая", category: "Анестезия", defaultPriceRub: 900, defaultPriceKopecks: 90000, materials: "Карпула Ubistesin forte, игла 30G", clinicalRationale: "Обезболивание при препарировании", optional: true, defaultSelected: true },
			{ id: "rubberdam", serviceCode: "A16.07.093", code804n: "A16.07.093", name: "Наложение коффердама (раббердама)", category: "Терапия", defaultPriceRub: 1200, defaultPriceKopecks: 120000, materials: "Латексный платок Sanctuary, кламп #W8A", clinicalRationale: "Изоляция рабочего поля от слюны", optional: true, defaultSelected: true },
			{ id: "restoration", serviceCode: "A16.07.002.001", code804n: "A16.07.002.001", name: "Восстановление зуба пломбой (нанокомпозит Estelite)", category: "Терапия", defaultPriceRub: 4800, defaultPriceKopecks: 480000, materials: "Estelite Sigma Quick, Bond Force II", clinicalRationale: "Анатомическое восстановление бугров и фиссур", optional: false, defaultSelected: true },
			{ id: "polishing", serviceCode: "A16.07.025.001", code804n: "A16.07.025.001", name: "Шлифовка и полировка пломбы микроабразивными пастами", category: "Терапия", defaultPriceRub: 600, defaultPriceKopecks: 60000, materials: "Диски Sof-Lex, паста Cleanic", clinicalRationale: "Сухой блеск и профилактика налета", optional: false, defaultSelected: true },
		],
	},
	{
		id: "endo_1canal_turnkey",
		title: "Пакет: Эндодонтия 1-канального зуба под ключ (анестезия + мехобработка + гуттаперча + снимок)",
		shortTitle: "Эндодонтия 1 канал под ключ",
		description: "Лечение пульпита/периодонтита одноканального зуба: NiTi мехобработка, 3D обтурация и радиовизиография.",
		category: "therapy",
		categoryLabel: "Терапия",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 9100,
		totalPriceKopecks: 910000,
		basePriceRub: 9100,
		basePriceKopecks: 910000,
		requiresTooth: true,
		defaultTooth: 21,
		badgeColor: "indigo",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Местная анестезия инфильтрационная", category: "Анестезия", defaultPriceRub: 900, defaultPriceKopecks: 90000, materials: "Карпула Ubistesin forte, игла 30G", clinicalRationale: "Купирование болевого синдрома", optional: true, defaultSelected: true },
			{ id: "rubberdam", serviceCode: "A16.07.093", code804n: "A16.07.093", name: "Наложение коффердама (раббердама)", category: "Терапия", defaultPriceRub: 1200, defaultPriceKopecks: 120000, materials: "Платок Nic Tone, кламп Brinker", clinicalRationale: "Асептический эндодонтический барьер", optional: true, defaultSelected: true },
			{ id: "canal_prep", serviceCode: "A16.07.030.001", code804n: "A16.07.030.001", name: "Инструментальная и медикаментозная обработка 1 корневого канала", category: "Эндодонтия", defaultPriceRub: 3500, defaultPriceKopecks: 350000, materials: "ProTaper Gold, NaOCl 3%, ЭДТА 17%", clinicalRationale: "Конусное препарирование и стерилизация канала", optional: false, defaultSelected: true },
			{ id: "gutta_obturation", serviceCode: "A16.07.008.001", code804n: "A16.07.008.001", name: "Пломбирование 1 корневого канала гуттаперчей и силером", category: "Эндодонтия", defaultPriceRub: 2900, defaultPriceKopecks: 290000, materials: "Штифты ProTaper, силер AH Plus", clinicalRationale: "3D-герметизация апикальной зоны", optional: false, defaultSelected: true },
			{ id: "xray_control", serviceCode: "A06.07.003", code804n: "A06.07.003", name: "Прицельная рентгенография (контрольный снимок)", category: "Диагностика", defaultPriceRub: 600, defaultPriceKopecks: 60000, materials: "Цифровой радиовизиограф", clinicalRationale: "Контроль плотности обтурации до апекса", optional: true, defaultSelected: true },
		],
	},
	{
		id: "endo_3canal_turnkey",
		title: "Пакет: Эндодонтия 3-канального моляра под ключ (полная обтурация + снимок)",
		shortTitle: "Эндодонтия 3 канала под ключ",
		description: "Лечение каналов многокорневого моляра: препарирование 3 каналов машинным файлом, обтурация и снимок.",
		category: "therapy",
		categoryLabel: "Терапия",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 16200,
		totalPriceKopecks: 1620000,
		basePriceRub: 16200,
		basePriceKopecks: 1620000,
		requiresTooth: true,
		defaultTooth: 46,
		badgeColor: "indigo",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Местная анестезия проводниковая / мандибулярная", category: "Анестезия", defaultPriceRub: 900, defaultPriceKopecks: 90000, materials: "Карпула Ubistesin forte, игла 27G", clinicalRationale: "Обезболивание нижнего моляра", optional: true, defaultSelected: true },
			{ id: "rubberdam", serviceCode: "A16.07.093", code804n: "A16.07.093", name: "Наложение коффердама на моляр", category: "Терапия", defaultPriceRub: 1200, defaultPriceKopecks: 120000, materials: "Платок Sanctuary Heavy, кламп W3", clinicalRationale: "Защита от слюны и безопасность антисептики", optional: true, defaultSelected: true },
			{ id: "canal_prep_3", serviceCode: "A16.07.030.003", code804n: "A16.07.030.003", name: "Инструментальная и медикаментозная обработка 3 корневых каналов", category: "Эндодонтия", defaultPriceRub: 7500, defaultPriceKopecks: 750000, materials: "ProTaper Ultimate, NaOCl 3.25%", clinicalRationale: "Очистка MB, ML и Distal каналов", optional: false, defaultSelected: true },
			{ id: "gutta_obturation_3", serviceCode: "A16.07.008.003", code804n: "A16.07.008.003", name: "Пломбирование 3 корневых каналов моляра (гуттаперча + силер)", category: "Эндодонтия", defaultPriceRub: 6000, defaultPriceKopecks: 600000, materials: "BeeFill, эпоксидный силер AH Plus", clinicalRationale: "Монолитная герметизация 3 каналов", optional: false, defaultSelected: true },
			{ id: "xray_control", serviceCode: "A06.07.003", code804n: "A06.07.003", name: "Прицельная рентгенография (контроль 3 каналов)", category: "Диагностика", defaultPriceRub: 600, defaultPriceKopecks: 60000, materials: "Радиовизиограф", clinicalRationale: "Визуализация обтурации до апикального сужения", optional: true, defaultSelected: true },
		],
	},
	{
		id: "hygiene_turnkey",
		title: "Пакет: Профгигиена полости рта под ключ (ультразвук + AirFlow + полировка + фторирование)",
		shortTitle: "Профгигиена под ключ",
		description: "Гигиенический протокол: ультразвуковой скейлинг, воздушно-абразивная полировка Air-Flow и глубокое фторирование.",
		category: "hygiene",
		categoryLabel: "Профгигиена",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 6500,
		totalPriceKopecks: 650000,
		basePriceRub: 6500,
		basePriceKopecks: 650000,
		requiresTooth: false,
		defaultTooth: 0,
		badgeColor: "cyan",
		items: [
			{ id: "uz_scaling", serviceCode: "A16.07.020", code804n: "A16.07.020", name: "Ультразвуковое удаление зубных отложений (скейлинг)", category: "Гигиена", defaultPriceRub: 2500, defaultPriceKopecks: 250000, materials: "EMS Piezon насадки, OptraGate", clinicalRationale: "Удаление минерализованного зубного камня", optional: false, defaultSelected: true },
			{ id: "airflow", serviceCode: "A16.07.050.001", code804n: "A16.07.050.001", name: "Воздушно-абразивная обработка Air-Flow", category: "Гигиена", defaultPriceRub: 2200, defaultPriceKopecks: 220000, materials: "Порошок Air-Flow Plus (14 мкм)", clinicalRationale: "Удаление пигментированного зубного налета", optional: false, defaultSelected: true },
			{ id: "polishing", serviceCode: "A16.07.025", code804n: "A16.07.025", name: "Полировка зубов профессиональными абразивными пастами", category: "Гигиена", defaultPriceRub: 800, defaultPriceKopecks: 80000, materials: "Паста Cleanic, полировочная щеточка", clinicalRationale: "Сглаживание микрошероховатостей эмали", optional: false, defaultSelected: true },
			{ id: "fluoridation", serviceCode: "A16.07.050.002", code804n: "A16.07.050.002", name: "Глубокое фторирование и реминерализация эмали", category: "Гигиена", defaultPriceRub: 1000, defaultPriceKopecks: 100000, materials: "Фторлак Clinpro White Varnish 5% NaF", clinicalRationale: "Снятие гиперестезии и насыщение фторапатитами", optional: false, defaultSelected: true },
		],
	},
	{
		id: "extraction_turnkey",
		title: "Пакет: Удаление зуба простое под ключ (анестезия + удаление + кюретаж + гемостаз + альвожиль)",
		shortTitle: "Удаление простое под ключ",
		description: "Атравматичное удаление зуба: анестезия, элевация, кюретаж, первичный гемостаз и противовоспалительная паста.",
		category: "surgery",
		categoryLabel: "Хирургия",
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		totalPriceRub: 6800,
		totalPriceKopecks: 680000,
		basePriceRub: 6800,
		basePriceKopecks: 680000,
		requiresTooth: true,
		defaultTooth: 38,
		badgeColor: "rose",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Местная анестезия (Ultracain D-S forte)", category: "Анестезия", defaultPriceRub: 900, defaultPriceKopecks: 90000, materials: "Карпула Ultracain D-S forte, игла 27G", clinicalRationale: "Периодонтальная блокада", optional: true, defaultSelected: true },
			{ id: "simple_extraction", serviceCode: "A16.07.001.001", code804n: "A16.07.001.001", name: "Удаление зуба простое / атравматичное", category: "Хирургия", defaultPriceRub: 3500, defaultPriceKopecks: 350000, materials: "Периотомы Hu-Friedy", clinicalRationale: "Бережное извлечение корня", optional: false, defaultSelected: true },
			{ id: "curettage", serviceCode: "A16.07.039.001", code804n: "A16.07.039.001", name: "Кюретаж лунки удаленного зуба", category: "Хирургия", defaultPriceRub: 900, defaultPriceKopecks: 90000, materials: "Ложка Фолькмана, хлоргексидин 0.05%", clinicalRationale: "Санация периапикального очага", optional: false, defaultSelected: true },
			{ id: "hemostasis", serviceCode: "A16.07.095", code804n: "A16.07.095", name: "Остановка луночного кровотечения (первичный гемостаз)", category: "Хирургия", defaultPriceRub: 700, defaultPriceKopecks: 70000, materials: "Коллагеновая губка Альванес", clinicalRationale: "Формирование первичного сгустка", optional: false, defaultSelected: true },
			{ id: "alvogyl", serviceCode: "A16.07.095.001", code804n: "A16.07.095.001", name: "Внесение антисептической пасты Альвожиль в лунку", category: "Хирургия", defaultPriceRub: 800, defaultPriceKopecks: 80000, materials: "Паста Alvogyl Septodont", clinicalRationale: "Профилактика альвеолита", optional: false, defaultSelected: true },
		],
	},
	{
		id: "complex_extraction",
		title: "Пакет: Сложное удаление зуба под ключ (анестезия + сепарация корней + кюретаж + швы Vicryl)",
		shortTitle: "Сложное удаление под ключ",
		description: "Операция сложного удаления: проводниковая анестезия, сепарация корней бором Lindemann, кюретаж и швы Vicryl.",
		category: "surgery",
		categoryLabel: "Хирургия",
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		totalPriceRub: 8500,
		totalPriceKopecks: 850000,
		basePriceRub: 8500,
		basePriceKopecks: 850000,
		requiresTooth: true,
		defaultTooth: 48,
		badgeColor: "rose",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Местная анестезия проводниковая", category: "Анестезия", defaultPriceRub: 900, defaultPriceKopecks: 90000, materials: "Карпула Ultracain D-S forte, игла 27G", clinicalRationale: "Блокада тройничного нерва", optional: true, defaultSelected: true },
			{ id: "root_separation", serviceCode: "A16.07.001.003", code804n: "A16.07.001.003", name: "Разъединение корней и фрагментация зуба (сложное удаление)", category: "Хирургия", defaultPriceRub: 5200, defaultPriceKopecks: 520000, materials: "Хирургический бор Lindemann", clinicalRationale: "Сепарация фуркации корней", optional: false, defaultSelected: true },
			{ id: "deep_curettage", serviceCode: "A16.07.039.001", code804n: "A16.07.039.001", name: "Кюретаж лунки зуба и санация грануляционной ткани", category: "Хирургия", defaultPriceRub: 1100, defaultPriceKopecks: 110000, materials: "Хирургическая ложка, лаваж", clinicalRationale: "Удаление хронического периапикального очага", optional: false, defaultSelected: true },
			{ id: "vicryl_suturing", serviceCode: "A16.07.097", code804n: "A16.07.097", name: "Наложение хирургических швов Vicryl", category: "Хирургия", defaultPriceRub: 1300, defaultPriceKopecks: 130000, materials: "Нить Vicryl 4-0 Ethicon", clinicalRationale: "Сближение краев и надежная фиксация сгустка", optional: false, defaultSelected: true },
		],
	},
	{
		id: "implant_turnkey",
		title: "Пакет: Дентальная имплантация под ключ (имплантат + операция + анестезия + формирователь)",
		shortTitle: "Имплантация под ключ",
		description: "Хирургический этап имплантации: анестезия, подготовка ложа, установка имплантата Osstem/Dentium и формирователя.",
		category: "surgery",
		categoryLabel: "Имплантация",
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		totalPriceRub: 41500,
		totalPriceKopecks: 4150000,
		basePriceRub: 41500,
		basePriceKopecks: 4150000,
		requiresTooth: true,
		defaultTooth: 36,
		badgeColor: "amber",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Местная анестезия проводниковая / инфильтрационная", category: "Анестезия", defaultPriceRub: 900, defaultPriceKopecks: 90000, materials: "Карпула Ubistesin forte, салфетка", clinicalRationale: "Глубокая анестезия надкостницы", optional: true, defaultSelected: true },
			{ id: "implant_placement", serviceCode: "A16.07.054.001", code804n: "A16.07.054.001", name: "Внутрикостная дентальная имплантация (Osstem TS-III / Dentium)", category: "Хирургия", defaultPriceRub: 35000, defaultPriceKopecks: 3500000, materials: "Имплантат титановый SLA, стерильный набор", clinicalRationale: "Первичная стабильность >= 35 Н·см", optional: false, defaultSelected: true },
			{ id: "healing_abutment", serviceCode: "A16.07.054.002", code804n: "A16.07.054.002", name: "Установка титанового формирователя десны", category: "Хирургия", defaultPriceRub: 5000, defaultPriceKopecks: 500000, materials: "Healing Abutment, шовный Prolene 5-0", clinicalRationale: "Формирование десневого контура", optional: false, defaultSelected: true },
			{ id: "xray_control", serviceCode: "A06.07.003", code804n: "A06.07.003", name: "Рентгенологический контроль позиционирования имплантата", category: "Диагностика", defaultPriceRub: 600, defaultPriceKopecks: 60000, materials: "Радиовизиограф", clinicalRationale: "Контроль расстояния до анатомических ориентиров", optional: true, defaultSelected: true },
		],
	},
	{
		id: "crown_metalloceramic_turnkey",
		title: "Пакет: Металлокерамическая коронка под ключ (препарирование + слепок + коронка + фиксация)",
		shortTitle: "Металлокерамика под ключ",
		description: "Ортопедическое протезирование: круговой уступ, двухслойный слепок А-силиконом, металлокерамика и цементировка.",
		category: "orthopedics",
		categoryLabel: "Ортопедия",
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		totalPriceRub: 20000,
		totalPriceKopecks: 2000000,
		basePriceRub: 20000,
		basePriceKopecks: 2000000,
		requiresTooth: true,
		defaultTooth: 46,
		badgeColor: "teal",
		items: [
			{ id: "preparation", serviceCode: "A16.07.004", code804n: "A16.07.004", name: "Препарирование зуба под коронку с уступом", category: "Ортопедия", defaultPriceRub: 3500, defaultPriceKopecks: 350000, materials: "Боры NTI, нить Ultrapak #000, ViscoStat", clinicalRationale: "Прецизионный зазор для края коронки", optional: false, defaultSelected: true },
			{ id: "impression", serviceCode: "A02.07.010", code804n: "A02.07.010", name: "Снятие прецизионного слепка А-силиконом", category: "Ортопедия", defaultPriceRub: 2500, defaultPriceKopecks: 250000, materials: "А-силикон Elite HD+, металлическая ложка", clinicalRationale: "Точное отображение границ уступа для ЗТЛ", optional: false, defaultSelected: true },
			{ id: "crown_fabrication", serviceCode: "A16.07.004.001", code804n: "A16.07.004.001", name: "Изготовление металлокерамической коронки (Duceram/Vita)", category: "Ортопедия", defaultPriceRub: 12500, defaultPriceKopecks: 1250000, materials: "КХС Wirobond C, керамика Vita VM13", clinicalRationale: "Восстановление анатомической формы коронки", optional: false, defaultSelected: true },
			{ id: "cementation", serviceCode: "A16.07.004.002", code804n: "A16.07.004.002", name: "Постоянная фиксация коронки на цемент (Fuji I / RelyX)", category: "Ортопедия", defaultPriceRub: 1500, defaultPriceKopecks: 150000, materials: "GC Fuji I, полировочная головка", clinicalRationale: "Герметичная фиксация без микроподтеканий", optional: false, defaultSelected: true },
		],
	},
	{
		id: "crown_zirconia_turnkey",
		title: "Пакет: Коронка ZrO2 (диоксид циркония) под ключ (скан/слепок + коронка + примерка + фиксация)",
		shortTitle: "Коронка ZrO2 под ключ",
		description: "Безметалловое протезирование: цифровое 3D-сканирование, фрезерованный оксид циркония Katana/Prettau и адгезивная фиксация.",
		category: "orthopedics",
		categoryLabel: "Ортопедия",
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		totalPriceRub: 30500,
		totalPriceKopecks: 3050000,
		basePriceRub: 30500,
		basePriceKopecks: 3050000,
		requiresTooth: true,
		defaultTooth: 16,
		badgeColor: "purple",
		items: [
			{ id: "intraoral_scan", serviceCode: "A02.07.010.001", code804n: "A02.07.010.001", name: "Препарирование и цифровое 3D-сканирование (3Shape/Medit)", category: "Ортопедия", defaultPriceRub: 4500, defaultPriceKopecks: 450000, materials: "3Shape TRIOS, ретракционный гель", clinicalRationale: "Цифровой слепок без рвотного рефлекса", optional: false, defaultSelected: true },
			{ id: "crown_zirconia", serviceCode: "A16.07.004.003", code804n: "A16.07.004.003", name: "Изготовление коронки из диоксида циркония (Katana ML / Prettau)", category: "Ортопедия", defaultPriceRub: 22000, defaultPriceKopecks: 2200000, materials: "ZrO2 Katana ML 1200 МПа", clinicalRationale: "Высокая прочность и эстетика живого зуба", optional: false, defaultSelected: true },
			{ id: "try_in_adjustment", serviceCode: "A16.07.004.004", code804n: "A16.07.004.004", name: "Примерка и окклюзионная юстировка в прикусе", category: "Ортопедия", defaultPriceRub: 1500, defaultPriceKopecks: 150000, materials: "Бумага Bausch 40 мкм, полиры Dialite", clinicalRationale: "Балансировка окклюзионных контактов", optional: false, defaultSelected: true },
			{ id: "adhesive_fixation", serviceCode: "A16.07.004.005", code804n: "A16.07.004.005", name: "Адгезивная фиксация на композитный цемент (RelyX Ultimate)", category: "Ортопедия", defaultPriceRub: 2500, defaultPriceKopecks: 250000, materials: "RelyX Ultimate, праймер Z-Prime Plus", clinicalRationale: "Химическая связь с дентином и цирконием", optional: false, defaultSelected: true },
		],
	},
	{
		id: "impression_asilicone_2jaws",
		title: "Пакет: Снятие двухслойных оттисков А-силиконом двух челюстей под ключ",
		shortTitle: "Слепок А-силикон (2 челюсти)",
		description: "Прецизионный анатомический оттиск верхней и нижней челюстей массой из А-силикона (базовый + корригирующий слой).",
		category: "orthopedics",
		categoryLabel: "Ортопедия",
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		totalPriceRub: 6000,
		totalPriceKopecks: 600000,
		basePriceRub: 6000,
		basePriceKopecks: 600000,
		requiresTooth: false,
		defaultTooth: 0,
		badgeColor: "purple",
		items: [
			{ id: "base_upper", serviceCode: "A02.07.010", code804n: "A02.07.010", name: "Снятие оттиска с верхней челюсти (базовый слой)", category: "Ортопедия", defaultPriceRub: 1800, defaultPriceKopecks: 180000, materials: "А-силикон Elite HD+ Putty Soft", clinicalRationale: "Анатомический базис оттиска в/ч", optional: false, defaultSelected: true },
			{ id: "correct_upper", serviceCode: "A02.07.010.001", code804n: "A02.07.010.001", name: "Снятие оттиска с верхней челюсти (корригирующий слой)", category: "Ортопедия", defaultPriceRub: 1200, defaultPriceKopecks: 120000, materials: "Elite HD+ Light Body", clinicalRationale: "Отображение микрорельефа уступов в/ч", optional: false, defaultSelected: true },
			{ id: "base_lower", serviceCode: "A02.07.010", code804n: "A02.07.010", name: "Снятие оттиска с нижней челюсти (базовый слой)", category: "Ортопедия", defaultPriceRub: 1800, defaultPriceKopecks: 180000, materials: "Elite HD+ Putty Soft", clinicalRationale: "Анатомический базис оттиска н/ч", optional: false, defaultSelected: true },
			{ id: "correct_lower", serviceCode: "A02.07.010.001", code804n: "A02.07.010.001", name: "Снятие оттиска с нижней челюсти (корригирующий слой)", category: "Ортопедия", defaultPriceRub: 1200, defaultPriceKopecks: 120000, materials: "Elite HD+ Light Body", clinicalRationale: "Отображение микрорельефа уступов н/ч", optional: false, defaultSelected: true },
		],
	},
];

const applyBundleBodySchema = z.object({
	bundleId: z.string().trim().min(1, "Укажите ID клинического пакета"),
	toothNumber: z.number().int().min(11).max(85).optional().nullable(),
	patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID").optional().nullable(),
	planId: z.string().uuid("Идентификатор плана лечения должен быть корректным UUID").optional().nullable(),
	selectedItemIds: z.array(z.string()).optional(),
	doctorId: z.string().uuid().optional().nullable(),
});

export const clinicalBundlesRoutes: FastifyPluginAsync = async (server) => {
	// 1. GET /api/clinical-bundles и /api/v1/clinical-bundles
	const listBundlesHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(request, reply, "list clinical bundles");
		if (!context) return;

		return reply.code(200).send({
			success: true,
			bundles: CANONICAL_CLINICAL_BUNDLES,
			total: CANONICAL_CLINICAL_BUNDLES.length,
		});
	};

	server.get("/api/clinical-bundles", listBundlesHandler);
	server.get("/api/v1/clinical-bundles", listBundlesHandler);

	// 2. GET /api/clinical-bundles/:id
	const getBundleHandler = async (
		request: FastifyRequest<{ Params: { id: string } }>,
		reply: FastifyReply,
	) => {
		const context = await requireClinicalReadContext(request, reply, "get clinical bundle");
		if (!context) return;

		const target = CANONICAL_CLINICAL_BUNDLES.find((b) => b.id === request.params.id);
		if (!target) {
			return reply.code(404).send({
				error: "BundleNotFound",
				message: `Клинический пакет с ID «${request.params.id}» не найден`,
			});
		}

		return reply.code(200).send({
			success: true,
			bundle: target,
		});
	};

	server.get<{ Params: { id: string } }>("/api/clinical-bundles/:id", getBundleHandler);
	server.get<{ Params: { id: string } }>("/api/v1/clinical-bundles/:id", getBundleHandler);

	// 3. POST /api/clinical-bundles/apply
	const applyBundleHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "apply clinical bundle");
		if (!context) return;

		const parsed = applyBundleBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры применения клинического пакета",
				issues: parsed.error.issues,
			});
		}

		const data = parsed.data;
		const targetBundle = CANONICAL_CLINICAL_BUNDLES.find((b) => b.id === data.bundleId);
		if (!targetBundle) {
			return reply.code(404).send({
				error: "BundleNotFound",
				message: `Клинический пакет с ID «${data.bundleId}» не найден`,
			});
		}

		const effectiveTooth = targetBundle.requiresTooth
			? data.toothNumber || targetBundle.defaultTooth
			: undefined;

		const selectedItems = data.selectedItemIds && data.selectedItemIds.length > 0
			? targetBundle.items.filter((it) => data.selectedItemIds!.includes(it.id))
			: targetBundle.items.filter((it) => it.defaultSelected !== false);

		if (selectedItems.length === 0) {
			return reply.code(400).send({
				error: "EmptySelection",
				message: "Не выбрано ни одной позиции из клинического пакета",
			});
		}

		let totalRub = 0;
		let totalKopecks = 0;
		const constructedItems = selectedItems.map((it) => {
			totalRub += it.defaultPriceRub;
			totalKopecks += it.defaultPriceKopecks;
			const toothPrefix = effectiveTooth ? `[Зуб ${effectiveTooth}] ` : "";
			return {
				id: randomUUID(),
				bundleId: targetBundle.id,
				serviceCode: it.serviceCode,
				code804n: it.code804n || it.serviceCode,
				name: `${toothPrefix}${it.name}`,
				category: it.category,
				toothNumber: effectiveTooth ?? null,
				priceRub: it.defaultPriceRub,
				priceKopecks: it.defaultPriceKopecks,
				unitPriceRub: it.defaultPriceRub,
				discountRub: 0,
				quantity: 1,
				phase: targetBundle.stageNumber,
				stageKind: targetBundle.stageKind,
				materials: it.materials,
				clinicalRationale: it.clinicalRationale,
			};
		});

		// Если передан существующий planId, привязываем позиции напрямую в PostgreSQL 18
		if (data.planId) {
			const [plan] = await db
				.select({ id: treatmentPlans.id })
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, data.planId),
						eq(treatmentPlans.organizationId, context.organizationId),
					),
				)
				.limit(1);

			if (!plan) {
				return reply.code(404).send({
					error: "TreatmentPlanNotFound",
					message: "Указанный план лечения не найден в вашей клинике",
				});
			}

			// Транзакционная вставка в treatmentPlanItemsNew
			await db.transaction(async (tx) => {
				for (const item of constructedItems) {
					await tx.insert(treatmentPlanItemsNew).values({
						organizationId: context.organizationId,
						planId: data.planId!,
						toothNumber: item.toothNumber,
						priceId: item.serviceCode,
						quantity: item.quantity,
						price: item.priceRub.toFixed(2),
						discount: item.discountRub.toFixed(2),
						phase: item.phase,
						isBundle: true,
						doctorId: data.doctorId || null,
					});
				}
			});
		}

		return reply.code(200).send({
			success: true,
			bundleId: targetBundle.id,
			bundleTitle: targetBundle.title,
			toothNumber: effectiveTooth ?? null,
			totalRub,
			totalKopecks,
			itemsCount: constructedItems.length,
			items: constructedItems,
		});
	};

	server.post("/api/clinical-bundles/apply", applyBundleHandler);
	server.post("/api/v1/clinical-bundles/apply", applyBundleHandler);
};

export default clinicalBundlesRoutes;
