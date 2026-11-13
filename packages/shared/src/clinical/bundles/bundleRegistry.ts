/**
 * packages/shared/src/clinical/bundles/bundleRegistry.ts
 * Registry, Lookup & Cashier Export for Diagnosis Service Bundles (Mandates 8b, 8e, 8k, 8n, 8x, 8ap).
 * Single Source of Truth (SSOT) for turnkey clinical packages and diagnosis bundles.
 */

import type {
	CanonicalDiagnosisBundle,
	CanonicalDiagnosisService,
	Cashier54FzBundleExport,
	Cashier54FzItemPayload,
	ClinicalBundleDefinition,
	CustomizedBundleItem,
	CustomizedBundleResult,
} from "./bundleTypes.js";
import { HYGIENE_DIAGNOSIS_BUNDLE, PERIODONTITIS_DIAGNOSIS_BUNDLE } from "./hygieneAndPerioBundles.js";
import { BRACES_FIXATION_DIAGNOSIS_BUNDLE, CROWN_DIAGNOSIS_BUNDLE } from "./orthoAndProstheticBundles.js";
import { EXTRACTION_COMPLEX_DIAGNOSIS_BUNDLE, EXTRACTION_DIAGNOSIS_BUNDLE, IMPLANT_PLACEMENT_DIAGNOSIS_BUNDLE } from "./surgeryBundles.js";
import { CARIES_DIAGNOSIS_BUNDLE, PULPITIS_3CANAL_DIAGNOSIS_BUNDLE, PULPITIS_DIAGNOSIS_BUNDLE } from "./therapyBundles.js";

// ============================================================================
// 1. КАНОНИЧЕСКИЕ КЛИНИЧЕСКИЕ ПАКЕТЫ «ПОД КЛЮЧ» (SSOT DENTE CRM)
// ============================================================================

export const therapyBundles: readonly ClinicalBundleDefinition[] = [
	{
		id: "caries_turnkey",
		title: "Пакет: Лечение кариеса под ключ (анестезия + коффердам + пломба Estelite + полировка)",
		shortTitle: "Кариес под ключ",
		description: "Санация кариозной полости: анестезия, коффердам, реставрация Estelite Sigma Quick и финишная полировка.",
		category: "therapy",
		categoryLabel: "Терапия",
		categoryName: "Терапия",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 7500,
		totalPriceKopecks: 750000,
		basePriceRub: 7500,
		basePriceKopecks: 750000,
		totalRub: 7500,
		totalKopecks: 750000,
		estimatedVisits: 1,
		requiresTooth: true,
		defaultTooth: 16,
		badgeColor: "emerald",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Местная анестезия инфильтрационная / проводниковая", category: "Анестезия", defaultPriceRub: 900, defaultPriceKopecks: 90000, priceRub: 900, unitPriceRub: 900, materials: "Карпула Ubistesin forte, игла 30G", clinicalRationale: "Обезболивание при препарировании", optional: true, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "rubberdam", serviceCode: "A16.07.093", code804n: "A16.07.093", name: "Наложение коффердама (раббердама)", category: "Терапия", defaultPriceRub: 1200, defaultPriceKopecks: 120000, priceRub: 1200, unitPriceRub: 1200, materials: "Латексный платок Sanctuary, кламп #W8A", clinicalRationale: "Изоляция рабочего поля от слюны", optional: true, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "restoration", serviceCode: "A16.07.002.001", code804n: "A16.07.002.001", name: "Восстановление зуба пломбой (нанокомпозит Estelite)", category: "Терапия", defaultPriceRub: 4800, defaultPriceKopecks: 480000, priceRub: 4800, unitPriceRub: 4800, materials: "Estelite Sigma Quick, Bond Force II", clinicalRationale: "Анатомическое восстановление бугров и фиссур", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "polishing", serviceCode: "A16.07.025.001", code804n: "A16.07.025.001", name: "Шлифовка и полировка пломбы микроабразивными пастами", category: "Терапия", defaultPriceRub: 600, defaultPriceKopecks: 60000, priceRub: 600, unitPriceRub: 600, materials: "Диски Sof-Lex, паста Cleanic", clinicalRationale: "Сухой блеск и профилактика налета", optional: false, defaultSelected: true, hideInPatientPresentation: false },
		],
	},
	{
		id: "endo_1canal_turnkey",
		title: "Пакет: Эндодонтия 1-канального зуба под ключ (анестезия + мехобработка + гуттаперча + снимок)",
		shortTitle: "Эндодонтия 1 канал под ключ",
		description: "Лечение пульпита/периодонтита одноканального зуба: NiTi мехобработка, 3D обтурация и радиовизиография.",
		category: "therapy",
		categoryLabel: "Терапия",
		categoryName: "Терапия",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 9100,
		totalPriceKopecks: 910000,
		basePriceRub: 9100,
		basePriceKopecks: 910000,
		totalRub: 9100,
		totalKopecks: 910000,
		estimatedVisits: 1,
		requiresTooth: true,
		defaultTooth: 21,
		badgeColor: "indigo",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Местная анестезия инфильтрационная", category: "Анестезия", defaultPriceRub: 900, defaultPriceKopecks: 90000, priceRub: 900, unitPriceRub: 900, materials: "Карпула Ubistesin forte, игла 30G", clinicalRationale: "Купирование болевого синдрома", optional: true, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "rubberdam", serviceCode: "A16.07.093", code804n: "A16.07.093", name: "Наложение коффердама (раббердама)", category: "Терапия", defaultPriceRub: 1200, defaultPriceKopecks: 120000, priceRub: 1200, unitPriceRub: 1200, materials: "Платок Nic Tone, кламп Brinker", clinicalRationale: "Асептический эндодонтический барьер", optional: true, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "canal_prep", serviceCode: "A16.07.030.001", code804n: "A16.07.030.001", name: "Инструментальная и медикаментозная обработка 1 корневого канала", category: "Эндодонтия", defaultPriceRub: 3500, defaultPriceKopecks: 350000, priceRub: 3500, unitPriceRub: 3500, materials: "ProTaper Gold, NaOCl 3%, ЭДТА 17%", clinicalRationale: "Конусное препарирование и стерилизация канала", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "gutta_obturation", serviceCode: "A16.07.008.001", code804n: "A16.07.008.001", name: "Пломбирование 1 корневого канала гуттаперчей и силером", category: "Эндодонтия", defaultPriceRub: 2900, defaultPriceKopecks: 290000, priceRub: 2900, unitPriceRub: 2900, materials: "Штифты ProTaper, силер AH Plus", clinicalRationale: "3D-герметизация апикальной зоны", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "xray_control", serviceCode: "A06.07.003", code804n: "A06.07.003", name: "Прицельная рентгенография (контрольный снимок)", category: "Диагностика", defaultPriceRub: 600, defaultPriceKopecks: 60000, priceRub: 600, unitPriceRub: 600, materials: "Цифровой радиовизиограф", clinicalRationale: "Контроль плотности обтурации до апекса", optional: true, defaultSelected: true, hideInPatientPresentation: false },
		],
	},
	{
		id: "endo_3canal_turnkey",
		title: "Пакет: Эндодонтия 3-канального моляра под ключ (полная обтурация + снимок)",
		shortTitle: "Эндодонтия 3 канала под ключ",
		description: "Лечение каналов многокорневого моляра: препарирование 3 каналов машинным файлом, обтурация и снимок.",
		category: "therapy",
		categoryLabel: "Терапия",
		categoryName: "Терапия",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 16200,
		totalPriceKopecks: 1620000,
		basePriceRub: 16200,
		basePriceKopecks: 1620000,
		totalRub: 16200,
		totalKopecks: 1620000,
		estimatedVisits: 1,
		requiresTooth: true,
		defaultTooth: 46,
		badgeColor: "indigo",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Местная анестезия проводниковая / мандибулярная", category: "Анестезия", defaultPriceRub: 900, defaultPriceKopecks: 90000, priceRub: 900, unitPriceRub: 900, materials: "Карпула Ubistesin forte, игла 27G", clinicalRationale: "Обезболивание нижнего моляра", optional: true, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "rubberdam", serviceCode: "A16.07.093", code804n: "A16.07.093", name: "Наложение коффердама на моляр", category: "Терапия", defaultPriceRub: 1200, defaultPriceKopecks: 120000, priceRub: 1200, unitPriceRub: 1200, materials: "Платок Sanctuary Heavy, кламп W3", clinicalRationale: "Защита от слюны и безопасность антисептики", optional: true, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "canal_prep_3", serviceCode: "A16.07.030.003", code804n: "A16.07.030.003", name: "Инструментальная и медикаментозная обработка 3 корневых каналов", category: "Эндодонтия", defaultPriceRub: 7500, defaultPriceKopecks: 750000, priceRub: 7500, unitPriceRub: 7500, materials: "ProTaper Ultimate, NaOCl 3.25%", clinicalRationale: "Очистка MB, ML и Distal каналов", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "gutta_obturation_3", serviceCode: "A16.07.008.003", code804n: "A16.07.008.003", name: "Пломбирование 3 корневых каналов моляра (гуттаперча + силер)", category: "Эндодонтия", defaultPriceRub: 6000, defaultPriceKopecks: 600000, priceRub: 6000, unitPriceRub: 6000, materials: "BeeFill, эпоксидный силер AH Plus", clinicalRationale: "Монолитная герметизация 3 каналов", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "xray_control", serviceCode: "A06.07.003", code804n: "A06.07.003", name: "Прицельная рентгенография (контроль 3 каналов)", category: "Диагностика", defaultPriceRub: 600, defaultPriceKopecks: 60000, priceRub: 600, unitPriceRub: 600, materials: "Радиовизиограф", clinicalRationale: "Визуализация обтурации до апикального сужения", optional: true, defaultSelected: true, hideInPatientPresentation: false },
		],
	},
	{
		id: "hygiene_turnkey",
		title: "Пакет: Профгигиена полости рта под ключ (ультразвук + AirFlow + полировка + фторирование)",
		shortTitle: "Профгигиена под ключ",
		description: "Гигиенический протокол: ультразвуковой скейлинг, воздушно-абразивная полировка Air-Flow и глубокое фторирование.",
		category: "hygiene",
		categoryLabel: "Профгигиена",
		categoryName: "Профгигиена",
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		totalPriceRub: 6500,
		totalPriceKopecks: 650000,
		basePriceRub: 6500,
		basePriceKopecks: 650000,
		totalRub: 6500,
		totalKopecks: 650000,
		estimatedVisits: 1,
		requiresTooth: false,
		defaultTooth: 0,
		badgeColor: "cyan",
		items: [
			{ id: "uz_scaling", serviceCode: "A16.07.020", code804n: "A16.07.020", name: "Ультразвуковое удаление зубных отложений (скейлинг)", category: "Гигиена", defaultPriceRub: 2500, defaultPriceKopecks: 250000, priceRub: 2500, unitPriceRub: 2500, materials: "EMS Piezon насадки, OptraGate", clinicalRationale: "Удаление минерализованного зубного камня", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "airflow", serviceCode: "A16.07.050.001", code804n: "A16.07.050.001", name: "Воздушно-абразивная обработка Air-Flow", category: "Гигиена", defaultPriceRub: 2200, defaultPriceKopecks: 220000, priceRub: 2200, unitPriceRub: 2200, materials: "Порошок Air-Flow Plus (14 мкм)", clinicalRationale: "Удаление пигментированного зубного налета", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "polishing", serviceCode: "A16.07.025", code804n: "A16.07.025", name: "Полировка зубов профессиональными абразивными пастами", category: "Гигиена", defaultPriceRub: 800, defaultPriceKopecks: 80000, priceRub: 800, unitPriceRub: 800, materials: "Паста Cleanic, полировочная щеточка", clinicalRationale: "Сглаживание микрошероховатостей эмали", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "fluoridation", serviceCode: "A16.07.050.002", code804n: "A16.07.050.002", name: "Глубокое фторирование и реминерализация эмали", category: "Гигиена", defaultPriceRub: 1000, defaultPriceKopecks: 100000, priceRub: 1000, unitPriceRub: 1000, materials: "Фторлак Clinpro White Varnish 5% NaF", clinicalRationale: "Снятие гиперестезии и насыщение фторапатитами", optional: false, defaultSelected: true, hideInPatientPresentation: false },
		],
	},
];

export const surgeryBundles: readonly ClinicalBundleDefinition[] = [
	{
		id: "extraction_turnkey",
		title: "Пакет: Удаление зуба простое под ключ (анестезия + удаление + кюретаж + гемостаз + альвожиль)",
		shortTitle: "Удаление простое под ключ",
		description: "Атравматичное удаление зуба: анестезия, элевация, кюретаж, первичный гемостаз и противовоспалительная паста.",
		category: "surgery",
		categoryLabel: "Хирургия",
		categoryName: "Хирургия",
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		totalPriceRub: 6800,
		totalPriceKopecks: 680000,
		basePriceRub: 6800,
		basePriceKopecks: 680000,
		totalRub: 6800,
		totalKopecks: 680000,
		estimatedVisits: 1,
		requiresTooth: true,
		defaultTooth: 38,
		badgeColor: "rose",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Местная анестезия (Ultracain D-S forte)", category: "Анестезия", defaultPriceRub: 900, defaultPriceKopecks: 90000, priceRub: 900, unitPriceRub: 900, materials: "Карпула Ultracain D-S forte, игла 27G", clinicalRationale: "Периодонтальная блокада", optional: true, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "simple_extraction", serviceCode: "A16.07.001.001", code804n: "A16.07.001.001", name: "Удаление зуба простое / атравматичное", category: "Хирургия", defaultPriceRub: 3500, defaultPriceKopecks: 350000, priceRub: 3500, unitPriceRub: 3500, materials: "Периотомы Hu-Friedy", clinicalRationale: "Бережное извлечение корня", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "curettage", serviceCode: "A16.07.039.001", code804n: "A16.07.039.001", name: "Кюретаж лунки удаленного зуба", category: "Хирургия", defaultPriceRub: 900, defaultPriceKopecks: 90000, priceRub: 900, unitPriceRub: 900, materials: "Ложка Фолькмана, хлоргексидин 0.05%", clinicalRationale: "Санация периапикального очага", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "hemostasis", serviceCode: "A16.07.095", code804n: "A16.07.095", name: "Остановка луночного кровотечения (первичный гемостаз)", category: "Хирургия", defaultPriceRub: 700, defaultPriceKopecks: 70000, priceRub: 700, unitPriceRub: 700, materials: "Коллагеновая губка Альванес", clinicalRationale: "Формирование первичного сгустка", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "alvogyl", serviceCode: "A16.07.095.001", code804n: "A16.07.095.001", name: "Внесение антисептической пасты Альвожиль в лунку", category: "Хирургия", defaultPriceRub: 800, defaultPriceKopecks: 80000, priceRub: 800, unitPriceRub: 800, materials: "Паста Alvogyl Septodont", clinicalRationale: "Профилактика альвеолита", optional: false, defaultSelected: true, hideInPatientPresentation: false },
		],
	},
	{
		id: "complex_extraction",
		title: "Пакет: Сложное удаление зуба под ключ (анестезия + сепарация корней + кюретаж + швы Vicryl)",
		shortTitle: "Сложное удаление под ключ",
		description: "Операция сложного удаления: проводниковая анестезия, сепарация корней бором Lindemann, кюретаж и швы Vicryl.",
		category: "surgery",
		categoryLabel: "Хирургия",
		categoryName: "Хирургия",
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		totalPriceRub: 8500,
		totalPriceKopecks: 850000,
		basePriceRub: 8500,
		basePriceKopecks: 850000,
		totalRub: 8500,
		totalKopecks: 850000,
		estimatedVisits: 1,
		requiresTooth: true,
		defaultTooth: 48,
		badgeColor: "rose",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Местная анестезия проводниковая", category: "Анестезия", defaultPriceRub: 900, defaultPriceKopecks: 90000, priceRub: 900, unitPriceRub: 900, materials: "Карпула Ultracain D-S forte, игла 27G", clinicalRationale: "Блокада тройничного нерва", optional: true, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "root_separation", serviceCode: "A16.07.001.003", code804n: "A16.07.001.003", name: "Разъединение корней и фрагментация зуба (сложное удаление)", category: "Хирургия", defaultPriceRub: 5200, defaultPriceKopecks: 520000, priceRub: 5200, unitPriceRub: 5200, materials: "Хирургический бор Lindemann", clinicalRationale: "Сепарация фуркации корней", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "deep_curettage", serviceCode: "A16.07.039.001", code804n: "A16.07.039.001", name: "Кюретаж лунки зуба и санация грануляционной ткани", category: "Хирургия", defaultPriceRub: 1100, defaultPriceKopecks: 110000, priceRub: 1100, unitPriceRub: 1100, materials: "Хирургическая ложка, лаваж", clinicalRationale: "Удаление хронического периапикального очага", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "vicryl_suturing", serviceCode: "A16.07.097", code804n: "A16.07.097", name: "Наложение хирургических швов Vicryl", category: "Хирургия", defaultPriceRub: 1300, defaultPriceKopecks: 130000, priceRub: 1300, unitPriceRub: 1300, materials: "Нить Vicryl 4-0 Ethicon", clinicalRationale: "Сближение краев и надежная фиксация сгустка", optional: false, defaultSelected: true, hideInPatientPresentation: false },
		],
	},
	{
		id: "implant_turnkey",
		title: "Пакет: Дентальная имплантация под ключ (имплантат + операция + анестезия + формирователь)",
		shortTitle: "Имплантация под ключ",
		description: "Хирургический этап имплантации: анестезия, подготовка ложа, установка имплантата Osstem/Dentium и формирователя.",
		category: "surgery",
		categoryLabel: "Имплантация",
		categoryName: "Имплантация",
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		totalPriceRub: 41500,
		totalPriceKopecks: 4150000,
		basePriceRub: 41500,
		basePriceKopecks: 4150000,
		totalRub: 41500,
		totalKopecks: 4150000,
		estimatedVisits: 1,
		requiresTooth: true,
		defaultTooth: 36,
		badgeColor: "amber",
		items: [
			{ id: "anesthesia", serviceCode: "A11.07.012", code804n: "A11.07.012", name: "Местная анестезия проводниковая / инфильтрационная", category: "Анестезия", defaultPriceRub: 900, defaultPriceKopecks: 90000, priceRub: 900, unitPriceRub: 900, materials: "Карпула Ubistesin forte, салфетка", clinicalRationale: "Глубокая анестезия надкостницы", optional: true, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "implant_placement", serviceCode: "A16.07.054.001", code804n: "A16.07.054.001", name: "Внутрикостная дентальная имплантация (Osstem TS-III / Dentium)", category: "Хирургия", defaultPriceRub: 35000, defaultPriceKopecks: 3500000, priceRub: 35000, unitPriceRub: 35000, materials: "Имплантат титановый SLA, стерильный набор", clinicalRationale: "Первичная стабильность >= 35 Н·см", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "healing_abutment", serviceCode: "A16.07.054.002", code804n: "A16.07.054.002", name: "Установка титанового формирователя десны", category: "Хирургия", defaultPriceRub: 5000, defaultPriceKopecks: 500000, priceRub: 5000, unitPriceRub: 5000, materials: "Healing Abutment, шовный Prolene 5-0", clinicalRationale: "Формирование десневого контура", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "xray_control", serviceCode: "A06.07.003", code804n: "A06.07.003", name: "Рентгенологический контроль позиционирования имплантата", category: "Диагностика", defaultPriceRub: 600, defaultPriceKopecks: 60000, priceRub: 600, unitPriceRub: 600, materials: "Радиовизиограф", clinicalRationale: "Контроль расстояния до анатомических ориентиров", optional: true, defaultSelected: true, hideInPatientPresentation: false },
		],
	},
];

export const orthopedicBundles: readonly ClinicalBundleDefinition[] = [
	{
		id: "crown_metalloceramic_turnkey",
		title: "Пакет: Металлокерамическая коронка под ключ (препарирование + слепок + коронка + фиксация)",
		shortTitle: "Металлокерамика под ключ",
		description: "Ортопедическое протезирование: круговой уступ, двухслойный слепок А-силиконом, металлокерамика и цементировка.",
		category: "orthopedics",
		categoryLabel: "Ортопедия",
		categoryName: "Ортопедия",
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		totalPriceRub: 20000,
		totalPriceKopecks: 2000000,
		basePriceRub: 20000,
		basePriceKopecks: 2000000,
		totalRub: 20000,
		totalKopecks: 2000000,
		estimatedVisits: 1,
		requiresTooth: true,
		defaultTooth: 46,
		badgeColor: "teal",
		items: [
			{ id: "preparation", serviceCode: "A16.07.004", code804n: "A16.07.004", name: "Препарирование зуба под коронку с уступом", category: "Ортопедия", defaultPriceRub: 3500, defaultPriceKopecks: 350000, priceRub: 3500, unitPriceRub: 3500, materials: "Боры NTI, нить Ultrapak #000, ViscoStat", clinicalRationale: "Прецизионный зазор для края коронки", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "impression", serviceCode: "A02.07.010", code804n: "A02.07.010", name: "Снятие прецизионного слепка А-силиконом", category: "Ортопедия", defaultPriceRub: 2500, defaultPriceKopecks: 250000, priceRub: 2500, unitPriceRub: 2500, materials: "А-силикон Elite HD+, металлическая ложка", clinicalRationale: "Точное отображение границ уступа для ЗТЛ", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "crown_fabrication", serviceCode: "A16.07.004.001", code804n: "A16.07.004.001", name: "Изготовление металлокерамической коронки (Duceram/Vita)", category: "Ортопедия", defaultPriceRub: 12500, defaultPriceKopecks: 1250000, priceRub: 12500, unitPriceRub: 12500, materials: "КХС Wirobond C, керамика Vita VM13", clinicalRationale: "Восстановление анатомической формы коронки", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "cementation", serviceCode: "A16.07.004.002", code804n: "A16.07.004.002", name: "Постоянная фиксация коронки на цемент (Fuji I / RelyX)", category: "Ортопедия", defaultPriceRub: 1500, defaultPriceKopecks: 150000, priceRub: 1500, unitPriceRub: 1500, materials: "GC Fuji I, полировочная головка", clinicalRationale: "Герметичная фиксация без микроподтеканий", optional: false, defaultSelected: true, hideInPatientPresentation: false },
		],
	},
	{
		id: "crown_zirconia_turnkey",
		title: "Пакет: Коронка ZrO2 (диоксид циркония) под ключ (скан/слепок + коронка + примерка + фиксация)",
		shortTitle: "Коронка ZrO2 под ключ",
		description: "Безметалловое протезирование: цифровое 3D-сканирование, фрезерованный оксид циркония Katana/Prettau и адгезивная фиксация.",
		category: "orthopedics",
		categoryLabel: "Ортопедия",
		categoryName: "Ортопедия",
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		totalPriceRub: 30500,
		totalPriceKopecks: 3050000,
		basePriceRub: 30500,
		basePriceKopecks: 3050000,
		totalRub: 30500,
		totalKopecks: 3050000,
		estimatedVisits: 1,
		requiresTooth: true,
		defaultTooth: 16,
		badgeColor: "purple",
		items: [
			{ id: "intraoral_scan", serviceCode: "A02.07.010.001", code804n: "A02.07.010.001", name: "Препарирование и цифровое 3D-сканирование (3Shape/Medit)", category: "Ортопедия", defaultPriceRub: 4500, defaultPriceKopecks: 450000, priceRub: 4500, unitPriceRub: 4500, materials: "3Shape TRIOS, ретракционный гель", clinicalRationale: "Цифровой слепок без рвотного рефлекса", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "crown_zirconia", serviceCode: "A16.07.004.003", code804n: "A16.07.004.003", name: "Изготовление коронки из диоксида циркония (Katana ML / Prettau)", category: "Ортопедия", defaultPriceRub: 22000, defaultPriceKopecks: 2200000, priceRub: 22000, unitPriceRub: 22000, materials: "ZrO2 Katana ML 1200 МПа", clinicalRationale: "Высокая прочность и эстетика живого зуба", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "try_in_adjustment", serviceCode: "A16.07.004.004", code804n: "A16.07.004.004", name: "Примерка и окклюзионная юстировка в прикусе", category: "Ортопедия", defaultPriceRub: 1500, defaultPriceKopecks: 150000, priceRub: 1500, unitPriceRub: 1500, materials: "Бумага Bausch 40 мкм, полиры Dialite", clinicalRationale: "Балансировка окклюзионных контактов", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "adhesive_fixation", serviceCode: "A16.07.004.005", code804n: "A16.07.004.005", name: "Адгезивная фиксация на композитный цемент (RelyX Ultimate)", category: "Ортопедия", defaultPriceRub: 2500, defaultPriceKopecks: 250000, priceRub: 2500, unitPriceRub: 2500, materials: "RelyX Ultimate, праймер Z-Prime Plus", clinicalRationale: "Химическая связь с дентином и цирконием", optional: false, defaultSelected: true, hideInPatientPresentation: false },
		],
	},
	{
		id: "impression_asilicone_2jaws",
		title: "Пакет: Снятие двухслойных оттисков А-силиконом двух челюстей под ключ",
		shortTitle: "Слепок А-силикон (2 челюсти)",
		description: "Прецизионный анатомический оттиск верхней и нижней челюстей массой из А-силикона (базовый + корригирующий слой).",
		category: "orthopedics",
		categoryLabel: "Ортопедия",
		categoryName: "Ортопедия",
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		totalPriceRub: 6000,
		totalPriceKopecks: 600000,
		basePriceRub: 6000,
		basePriceKopecks: 600000,
		totalRub: 6000,
		totalKopecks: 600000,
		estimatedVisits: 1,
		requiresTooth: false,
		defaultTooth: 0,
		badgeColor: "purple",
		items: [
			{ id: "base_upper", serviceCode: "A02.07.010", code804n: "A02.07.010", name: "Снятие оттиска с верхней челюсти (базовый слой)", category: "Ортопедия", defaultPriceRub: 1800, defaultPriceKopecks: 180000, priceRub: 1800, unitPriceRub: 1800, materials: "А-силикон Elite HD+ Putty Soft", clinicalRationale: "Анатомический базис оттиска в/ч", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "correct_upper", serviceCode: "A02.07.010.001", code804n: "A02.07.010.001", name: "Снятие оттиска с верхней челюсти (корригирующий слой)", category: "Ортопедия", defaultPriceRub: 1200, defaultPriceKopecks: 120000, priceRub: 1200, unitPriceRub: 1200, materials: "Elite HD+ Light Body", clinicalRationale: "Отображение микрорельефа уступов в/ч", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "base_lower", serviceCode: "A02.07.010", code804n: "A02.07.010", name: "Снятие оттиска с нижней челюсти (базовый слой)", category: "Ортопедия", defaultPriceRub: 1800, defaultPriceKopecks: 180000, priceRub: 1800, unitPriceRub: 1800, materials: "Elite HD+ Putty Soft", clinicalRationale: "Анатомический базис оттиска н/ч", optional: false, defaultSelected: true, hideInPatientPresentation: false },
			{ id: "correct_lower", serviceCode: "A02.07.010.001", code804n: "A02.07.010.001", name: "Снятие оттиска с нижней челюсти (корригирующий слой)", category: "Ортопедия", defaultPriceRub: 1200, defaultPriceKopecks: 120000, priceRub: 1200, unitPriceRub: 1200, materials: "Elite HD+ Light Body", clinicalRationale: "Отображение микрорельефа уступов н/ч", optional: false, defaultSelected: true, hideInPatientPresentation: false },
		],
	},
];

export const CANONICAL_CLINICAL_BUNDLES: readonly ClinicalBundleDefinition[] = [
	...therapyBundles,
	...surgeryBundles,
	...orthopedicBundles,
];

export function getClinicalBundleById(id: string): ClinicalBundleDefinition | undefined {
	return CANONICAL_CLINICAL_BUNDLES.find((b) => b.id === id);
}

// ============================================================================
// 2. ДИАГНОСТИЧЕСКИЕ ПАКЕТЫ ПО СОСТОЯНИЯМ ЗУБОВ И МКБ-10
// ============================================================================

export const CANONICAL_DIAGNOSIS_BUNDLES: readonly CanonicalDiagnosisBundle[] = [
	CARIES_DIAGNOSIS_BUNDLE, PULPITIS_DIAGNOSIS_BUNDLE, PERIODONTITIS_DIAGNOSIS_BUNDLE,
	EXTRACTION_DIAGNOSIS_BUNDLE, HYGIENE_DIAGNOSIS_BUNDLE, CROWN_DIAGNOSIS_BUNDLE,
];

export const ALL_DIAGNOSIS_BUNDLES: readonly CanonicalDiagnosisBundle[] = [
	...CANONICAL_DIAGNOSIS_BUNDLES, PULPITIS_3CANAL_DIAGNOSIS_BUNDLE,
	EXTRACTION_COMPLEX_DIAGNOSIS_BUNDLE, IMPLANT_PLACEMENT_DIAGNOSIS_BUNDLE, BRACES_FIXATION_DIAGNOSIS_BUNDLE,
];

const TOOTH_STATE_MAP: Record<string, CanonicalDiagnosisBundle> = {
	Caries: CARIES_DIAGNOSIS_BUNDLE, Pulpitis: PULPITIS_DIAGNOSIS_BUNDLE,
	Periodontitis: PERIODONTITIS_DIAGNOSIS_BUNDLE, Missing: EXTRACTION_DIAGNOSIS_BUNDLE,
	ExtractionIndicated: EXTRACTION_DIAGNOSIS_BUNDLE, Crown: CROWN_DIAGNOSIS_BUNDLE,
	Orthodontic: BRACES_FIXATION_DIAGNOSIS_BUNDLE,
};

export function getDiagnosisBundleByToothState(state: string): CanonicalDiagnosisBundle | null {
	return TOOTH_STATE_MAP[state] ?? null;
}

export function getDiagnosisBundleByIcd10(icd10: string): CanonicalDiagnosisBundle | null {
	const c = icd10.trim().toUpperCase();
	if (c.startsWith("K02")) return CARIES_DIAGNOSIS_BUNDLE;
	if (/^K04\.[0-3]/.test(c)) return PULPITIS_DIAGNOSIS_BUNDLE;
	if (/^K04\.[4-9]/.test(c)) return PERIODONTITIS_DIAGNOSIS_BUNDLE;
	if (c.startsWith("K08.1")) return EXTRACTION_DIAGNOSIS_BUNDLE;
	if (c.startsWith("K05")) return HYGIENE_DIAGNOSIS_BUNDLE;
	if (c.startsWith("K08.2")) return CROWN_DIAGNOSIS_BUNDLE;
	if (c.startsWith("K07.2")) return BRACES_FIXATION_DIAGNOSIS_BUNDLE;
	if (c.startsWith("K01.1")) return EXTRACTION_COMPLEX_DIAGNOSIS_BUNDLE;
	return CANONICAL_DIAGNOSIS_BUNDLES.find((b) => b.diagnosisIcd10.toUpperCase() === c) ?? null;
}

export function resolveServicePriceAgainstCatalog(
	service: CanonicalDiagnosisService,
	// biome-ignore lint/suspicious/noExplicitAny: loose catalog row shape
	catalog: readonly any[] = [],
) {
	// biome-ignore lint/suspicious/noExplicitAny: loose catalog row shape
	const extractValidRub = (row: any, fallback: number): number => {
		for (const k of ["basePriceRub", "priceRub"]) {
			const v = row?.[k];
			if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
			if (typeof v === "string" && v.trim()) {
				const n = Number(v.replace(",", ".").trim());
				if (Number.isFinite(n) && n > 0) return n;
			}
		}
		return fallback;
	};
	if (Array.isArray(catalog) && catalog.length > 0) {
		const target = String(service.serviceCode || service.code804n || "").trim().toUpperCase();
		const byCode = catalog.find((c) => c?.active !== false && [c?.serviceCode, c?.code, c?.code804n].map((x) => String(x || "").trim().toUpperCase()).includes(target));
		const found = byCode ?? catalog.find((c) => c?.active !== false && String(c?.title || "").toLowerCase().replace(/ё/g, "е").includes(service.title.toLowerCase().replace(/ё/g, "е")));
		if (found) {
			const rub = extractValidRub(found, service.defaultPriceRub);
			return { priceKopecks: Math.round(rub * 100), priceRub: rub, priceId: found.id ?? null, title: found.title ?? service.title, fromCatalog: true };
		}
	}
	return { priceKopecks: service.defaultPriceKopecks, priceRub: service.defaultPriceRub, priceId: null, title: service.title, fromCatalog: false };
}

export function createCustomizedBundle(
	bundle: CanonicalDiagnosisBundle,
	options: { toothCode?: string | number | null | undefined; checkedServiceCodes?: readonly string[] | undefined; catalog?: readonly any[] | undefined } = {},
): CustomizedBundleResult {
	const tooth = options.toothCode !== undefined && options.toothCode !== null ? String(options.toothCode) : null;
	const checkedSet = options.checkedServiceCodes ? new Set(options.checkedServiceCodes) : null;
	const items: CustomizedBundleItem[] = bundle.services.map((svc) => {
		const resolved = resolveServicePriceAgainstCatalog(svc, options.catalog);
		const isChecked = checkedSet !== null ? checkedSet.has(svc.serviceCode) || checkedSet.has(svc.code804n) : svc.requiredByDefault;
		return {
			serviceId: svc.id, serviceCode: svc.serviceCode, nomenclatureCode: svc.nomenclatureCode, code804n: svc.code804n,
			title: resolved.title, priceKopecks: resolved.priceKopecks, priceRub: resolved.priceRub, priceId: resolved.priceId,
			requiredByDefault: svc.requiredByDefault, checked: isChecked, category: svc.category, toothCode: tooth,
		};
	});
	const checked = items.filter((it) => it.checked);
	const totalKopecks = checked.reduce((acc, it) => acc + it.priceKopecks, 0);
	return { bundleId: bundle.id, diagnosisIcd10: bundle.diagnosisIcd10, diagnosisTitle: bundle.diagnosisTitle, items, totalKopecks, totalRub: Math.round(totalKopecks) / 100, checkedCount: checked.length };
}

export function exportCustomizedBundleToCashier54Fz(
	customized: CustomizedBundleResult,
	metadata: { patientId?: string | undefined; visitId?: string | undefined; toothNumber?: number | string | undefined } = {},
): Cashier54FzBundleExport {
	const activeItems = customized.items.filter((it) => it.checked);
	const toothNum = metadata.toothNumber !== undefined ? Number(metadata.toothNumber) || undefined : undefined;
	const toothCodeStr = metadata.toothNumber !== undefined ? String(metadata.toothNumber) : undefined;
	const receiptItems: Cashier54FzItemPayload[] = activeItems.map((item) => ({
		name: `[${item.serviceCode || item.code804n}] ${item.title}${toothCodeStr ? ` (зуб ${toothCodeStr})` : ""}`,
		code804n: item.code804n, serviceCode: item.serviceCode, priceKopecks: item.priceKopecks, quantity: 1, sumKopecks: item.priceKopecks,
		taxRate: "none", paymentSubject: 4, paymentMethod: 4, toothNumber: toothNum, toothCode: toothCodeStr,
	}));
	const totalKopecks = receiptItems.reduce((acc, it) => acc + it.sumKopecks, 0);
	return {
		source: "chairside_diagnosis_package", bundleId: customized.bundleId, diagnosisIcd10: customized.diagnosisIcd10,
		diagnosisTitle: customized.diagnosisTitle, toothCode: toothCodeStr, toothNumber: toothNum,
		patientId: metadata.patientId, visitId: metadata.visitId, totalKopecks, totalRub: Math.round(totalKopecks) / 100,
		itemsCount: receiptItems.length, receiptItems,
	};
}

export const exportCustomizedBundleToCashier = exportCustomizedBundleToCashier54Fz;
