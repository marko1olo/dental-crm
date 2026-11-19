/**
 * presetCanonicalTiers.ts — Канонические этапы и 3-тарифные наборы смет (Эконом / Оптимум / Премиум).
 * Мандаты 8b, 8zi: Декомпозиция каталога смет.
 */

import type { TreatmentPlanStage, TreatmentPlanTier } from "../treatmentPlanTypes";
import { mkItem, mkStage, type TreatmentTierDefinition } from "./presetHelpers";

export { type TreatmentTierDefinition };

/** 4 канонических клинических этапа комплексного плана без прибитых зубов */
export const CANONICAL_CLINICAL_STAGES: readonly TreatmentPlanStage[] = [
	{
		id: "stage-1-hygiene",
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Санация и гигиена",
		subtitle: "Профессиональная гигиена полости рта и пародонтологическая подготовка",
		clinicalGoal: "Ликвидация биопленки, наддесневых и поддесневых отложений",
		totalRub: 7500,
		totalKopecks: 750000,
		estimatedVisits: 1,
		estimatedWeeks: 1,
		status: "draft",
		items: [
			{ id: "proc-1-1", code804n: "A16.07.051", name: "Комплексная профессиональная гигиена полости рта (Air-Flow + ультразвук)", priceRub: 4500, unitPriceRub: 4500, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
			{ id: "proc-1-2", code804n: "A16.07.053", name: "Глубокое фторирование эмали и реминерализующая терапия", priceRub: 3000, unitPriceRub: 3000, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
		],
	},
	{
		id: "stage-2-therapy",
		stageNumber: 2,
		stageKind: "stage_1_therapy",
		title: "Этап 2: Терапия и эндодонтия",
		subtitle: "Лечение кариеса и обработка каналов под микроскопом",
		clinicalGoal: "Герметичная трехмерная обтурация каналов и восстановление культи",
		totalRub: 16000,
		totalKopecks: 1600000,
		estimatedVisits: 2,
		estimatedWeeks: 2,
		status: "draft",
		items: [
			{ id: "proc-2-1", code804n: "A16.07.002", name: "Анатомическое восстановление зуба нанокомпозитом светового отверждения", priceRub: 6000, unitPriceRub: 6000, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
			{ id: "proc-2-2", code804n: "A16.07.030", name: "Механическая и медикаментозная обработка корневых каналов под микроскопом", priceRub: 10000, unitPriceRub: 10000, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
		],
	},
	{
		id: "stage-3-surgery",
		stageNumber: 3,
		stageKind: "stage_2_surgery",
		title: "Этап 3: Хирургия и имплантация",
		subtitle: "Установка дентального имплантата в позиции отсутствующего зуба",
		clinicalGoal: "Восстановление утраченной костной опоры без препарирования соседних зубов",
		totalRub: 48000,
		totalKopecks: 4800000,
		estimatedVisits: 1,
		estimatedWeeks: 12,
		status: "draft",
		items: [
			{ id: "proc-3-1", code804n: "A16.07.054", name: "Установка дентального имплантата с остеокондуктивной поверхностью", priceRub: 48000, unitPriceRub: 48000, discountRub: 0, quantity: 1, stageKind: "stage_2_surgery", isCompleted: false },
		],
	},
	{
		id: "stage-4-orthopedics",
		stageNumber: 4,
		stageKind: "stage_3_orthopedics",
		title: "Этап 4: Ортопедия и протезирование",
		subtitle: "Индивидуальный циркониевый абатмент и коронка CAD/CAM",
		clinicalGoal: "Восстановление окклюзии, анатомического экватора и жевательной функции",
		totalRub: 33500,
		totalKopecks: 3350000,
		estimatedVisits: 2,
		estimatedWeeks: 2,
		status: "draft",
		items: [
			{ id: "proc-4-1", code804n: "A16.07.004", name: "Установка коронки из диоксида циркония на абатменте CAD/CAM", priceRub: 33500, unitPriceRub: 33500, discountRub: 0, quantity: 1, stageKind: "stage_3_orthopedics", isCompleted: false },
		],
	},
];

/** 1. Этапы для тарифа «Базовый (Эконом)» */
export const ECONOMY_PRESENTER_STAGES: readonly TreatmentPlanStage[] = [
	mkStage(
		"st-econ-1",
		1,
		"stage_1_therapy",
		"Этап 1: Неотложная помощь и терапия",
		"Санация очагов инфекции и кариеса",
		"Ликвидация острой боли, терапевтическая санация и пломбирование",
		17500,
		1750000,
		[
			mkItem("it-econ-1", undefined, "A16.07.002", "Восстановление зуба пломбой световой полимеризации (базовый композит)", 3500, 3500, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-econ-2", undefined, "A16.07.008.002", "Эндодонтическое лечение корневых каналов (механическая обработка)", 9500, 9500, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-econ-3", undefined, "A16.07.003.001", "Восстановление культи зуба под коронку (литая культевая вкладка)", 4500, 4500, 1, "stage_1_therapy", "Терапия"),
		],
	),
	mkStage(
		"st-econ-2",
		2,
		"stage_2_surgery",
		"Этап 2: Хирургия и имплантация",
		"Восстановление жевательной опоры",
		"Установка дентального имплантата на место отсутствующего зуба",
		32000,
		3200000,
		[
			mkItem("it-econ-4", undefined, "A16.07.054.001", "Внутрикостная дентальная имплантация базовой системы", 32000, 32000, 1, "stage_2_surgery", "Хирургия"),
		],
	),
	mkStage(
		"st-econ-3",
		3,
		"stage_3_orthopedics",
		"Этап 3: Ортопедия и протезирование",
		"Функциональное восстановление жевания",
		"Протезирование металлокерамическими коронками",
		36000,
		3600000,
		[
			mkItem("it-econ-5", undefined, "A16.07.004", "Восстановление зуба металлокерамической коронкой Co-Cr", 14000, 14000, 1, "stage_3_orthopedics", "Ортопедия"),
			mkItem("it-econ-6", undefined, "A16.07.006", "Протезирование на имплантате металлокерамической коронкой", 22000, 22000, 1, "stage_3_orthopedics", "Ортопедия"),
		],
	),
];

/** 2. Этапы для тарифа «Оптимальный (Золотой стандарт)» */
export const STANDARD_PRESENTER_STAGES: readonly TreatmentPlanStage[] = [
	mkStage(
		"st-std-1",
		1,
		"stage_1_therapy",
		"Этап 1: Неотложная помощь и терапия",
		"Санация под увеличением и биосовместимая изоляция",
		"Санация кариеса нанокомпозитом и эндодонтия под микроскопом",
		23800,
		2380000,
		[
			mkItem("it-std-1", undefined, "A16.07.002.001", "Восстановление зуба пломбой (светоотверждаемый нанокомпозит повышенной прочности)", 4800, 4800, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-std-2", undefined, "A16.07.008.002", "Эндодонтическое лечение под операционным микроскопом (3D-обтурация)", 13500, 13500, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-std-3", undefined, "A16.07.003.001", "Восстановление зуба под коронку со стекловолоконным штифтом", 5500, 5500, 1, "stage_1_therapy", "Терапия"),
		],
	),
	mkStage(
		"st-std-2",
		2,
		"stage_2_surgery",
		"Этап 2: Хирургия и имплантация",
		"Двухэтапная дентальная имплантация",
		"Установка дентального имплантата с гидрофильной SLA-поверхностью",
		42000,
		4200000,
		[
			mkItem("it-std-4", undefined, "A16.07.054.001", "Внутрикостная дентальная имплантация SLA-системы + формирователь десны", 42000, 42000, 1, "stage_2_surgery", "Хирургия"),
		],
	),
	mkStage(
		"st-std-3",
		3,
		"stage_3_orthopedics",
		"Этап 3: Ортопедия и протезирование",
		"Анатомические коронки из диоксида циркония",
		"Цифровое 3D-сканирование и коронки из диоксида циркония высокой прозрачности",
		66500,
		6650000,
		[
			mkItem("it-std-5", undefined, "A02.07.010", "Оптическое внутриротовое 3D-сканирование зубного ряда и регистрация окклюзии (CAD/CAM)", 6500, 6500, 1, "stage_3_orthopedics", "Ортопедия"),
			mkItem("it-std-6", undefined, "A16.07.004.001", "Восстановление зуба коронкой из многослойного диоксида циркония", 26000, 26000, 1, "stage_3_orthopedics", "Ортопедия"),
			mkItem("it-std-7", undefined, "A16.07.006", "Протезирование на имплантате (диоксид циркония с шахтой винтовой фиксации)", 34000, 34000, 1, "stage_3_orthopedics", "Ортопедия"),
		],
	),
];

/** 3. Этапы для тарифа «Премиум (Тотальная эстетика)» */
export const PREMIUM_PRESENTER_STAGES: readonly TreatmentPlanStage[] = [
	mkStage(
		"st-prem-1",
		1,
		"stage_1_therapy",
		"Этап 1: Неотложная помощь и терапия",
		"Премиальная санация и микроскопная эндодонтия",
		"Керамическая накладка Inlay и прецизионная эндодонтия с биокерамикой",
		32500,
		3250000,
		[
			mkItem("it-prem-1", undefined, "A16.07.003", "Восстановление прессованной керамической накладкой Inlay", 8500, 8500, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-prem-2", undefined, "A16.07.008.002", "Прецизионная микроскопная эндодонтия с биокерамическим силером", 16500, 16500, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-prem-3", undefined, "A16.07.003.001", "Билдап композитом двойного отверждения с кварцевым штифтом", 7500, 7500, 1, "stage_1_therapy", "Терапия"),
		],
	),
	mkStage(
		"st-prem-2",
		2,
		"stage_2_surgery",
		"Этап 2: Хирургия и имплантация",
		"Навигационная имплантация премиум-класса",
		"Установка премиального имплантата по индивидуальному навигационному 3D-шаблону",
		80000,
		8000000,
		[
			mkItem("it-prem-4", undefined, "A16.07.054.001", "Дентальная имплантация премиум-системы высокой гидрофильности", 68000, 68000, 1, "stage_2_surgery", "Хирургия"),
			mkItem("it-prem-5", undefined, "A16.07.054", "Изготовление хирургического навигационного 3D-шаблона для прецизионной установки", 12000, 12000, 1, "stage_2_surgery", "Хирургия"),
		],
	),
	mkStage(
		"st-prem-3",
		3,
		"stage_3_orthopedics",
		"Этап 3: Ортопедия и протезирование",
		"Безметалловая керамика и индивидуальные абатменты",
		"Высокая эстетика: прессованная керамика и индивидуальный абатмент Ti-Base",
		92500,
		9250000,
		[
			mkItem("it-prem-6", undefined, "A02.07.010", "Оптическое внутриротовое 3D-сканирование CAD/CAM высокой точности", 6500, 6500, 1, "stage_3_orthopedics", "Ортопедия"),
			mkItem("it-prem-7", undefined, "A16.07.004.002", "Восстановление зуба керамической коронкой с индивидуальной эстетической раскраской", 38000, 38000, 1, "stage_3_orthopedics", "Ортопедия"),
			mkItem("it-prem-8", undefined, "A16.07.006", "Протезирование на имплантате (индивидуальный абатмент Ti-Base + керамическая коронка)", 48000, 48000, 1, "stage_3_orthopedics", "Ортопедия"),
		],
	),
];

export const DEFAULT_PRESENTER_STAGES: readonly TreatmentPlanStage[] = STANDARD_PRESENTER_STAGES;

export const INTACT_PREVENTION_STAGES_ECONOMY: readonly TreatmentPlanStage[] = [
	mkStage(
		"st-prev-econ-1",
		1,
		"stage_1_therapy",
		"Этап 1: Профилактика и гигиена",
		"Профессиональная гигиена и базовое фторирование",
		"Ультразвуковое удаление наддесневых зубных отложений и полировка",
		3500,
		350000,
		[
			mkItem("it-prev-ec-1", undefined, "A16.07.051", "Профессиональная гигиена полости рта (ультразвуковое снятие наддесневых зубных отложений)", 3500, 3500, 1, "stage_1_therapy", "Гигиена и профилактика"),
		],
	),
];

export const INTACT_PREVENTION_STAGES_OPTIMUM: readonly TreatmentPlanStage[] = [
	mkStage(
		"st-prev-opt-1",
		1,
		"stage_1_therapy",
		"Этап 1: Профилактика и гигиена",
		"Комплексная гигиена AirFlow + глубокое фторирование",
		"Ультразвук + воздушно-абразивная полировка AirFlow и реминерализирующая терапия",
		6500,
		650000,
		[
			mkItem("it-prev-opt-1", undefined, "A16.07.051.001", "Комплексная профессиональная гигиена полости рта (ультразвук + AirFlow)", 5500, 5500, 1, "stage_1_therapy", "Гигиена и профилактика"),
			mkItem("it-prev-opt-2", undefined, "A11.07.024", "Глубокое фторирование и реминерализация эмали зубов", 1000, 1000, 1, "stage_1_therapy", "Гигиена и профилактика"),
		],
	),
];

export const INTACT_PREVENTION_STAGES_PREMIUM: readonly TreatmentPlanStage[] = [
	mkStage(
		"st-prev-prem-1",
		1,
		"stage_1_therapy",
		"Этап 1: Профилактика и гигиена",
		"Премиальный SPA-протокол гигиены GBT (Guided Biofilm Therapy)",
		"Атравматичный протокол GBT EMS, эмаль-герметизация и ремо-терапия",
		9500,
		950000,
		[
			mkItem("it-prev-pr-1", undefined, "A16.07.051.002", "Профессиональная гигиена полости рта по атравматичному протоколу GBT EMS", 7500, 7500, 1, "stage_1_therapy", "Гигиена и профилактика"),
			mkItem("it-prev-pr-2", undefined, "A11.07.024.001", "Глубокая эмаль-герметизация и реминерализующая SPA-терапия эмали", 2000, 2000, 1, "stage_1_therapy", "Гигиена и профилактика"),
		],
	),
];

export const INTACT_PREVENTION_TIERS: readonly TreatmentPlanTier[] = [
	{
		tierId: "economy",
		title: "Базовый (Эконом)",
		subtitle: "Профессиональная гигиена и базовое фторирование",
		badge: "Эконом",
		isRecommended: false,
		totalRub: 3500,
		totalKopecks: 350000,
		amountKopecks: 350000n,
		warrantyYears: 1,
		keyAdvantages: [
			"Ультразвуковое удаление наддесневого зубного камня",
			"Полировка поверхностей зубов абразивной пастой",
			"Рекомендации по домашней гигиене полости рта",
			"Гарантия чистоты эмали",
		],
		stages: INTACT_PREVENTION_STAGES_ECONOMY,
	},
	{
		tierId: "optimum",
		title: "Оптимальный",
		subtitle: "Комплексная гигиена AirFlow + глубокое фторирование",
		badge: "Рекомендуемый",
		isRecommended: true,
		totalRub: 6500,
		totalKopecks: 650000,
		amountKopecks: 650000n,
		warrantyYears: 3,
		keyAdvantages: [
			"Ультразвуковое бережное удаление зубного камня",
			"Мягкое снятие пигментированного налета AirFlow (глицин)",
			"Глубокое фторирование эмали реминерализующим гелем",
			"Индивидуальный подбор средств гигиены",
		],
		stages: INTACT_PREVENTION_STAGES_OPTIMUM,
	},
	{
		tierId: "premium",
		title: "Премиум",
		subtitle: "Премиальный SPA-протокол гигиены GBT (Guided Biofilm Therapy)",
		badge: "Эстетика",
		isRecommended: false,
		totalRub: 9500,
		totalKopecks: 950000,
		amountKopecks: 950000n,
		warrantyYears: 10,
		keyAdvantages: [
			"Индикация биопленки швейцарским маркером",
			"Атравматичная чистка по протоколу GBT аппаратом EMS Prophylaxis Master",
			"Подогретая вода и мелкодисперсный порошок Plus для комфорта",
			"Глубокая эмаль-герметизация и ремо-терапия",
		],
		stages: INTACT_PREVENTION_STAGES_PREMIUM,
	},
];

export const DEFAULT_PRESENTER_TIERS: readonly TreatmentPlanTier[] = [
	{
		tierId: "economy",
		title: "Базовый (Эконом)",
		subtitle: "Стандартная санация, металлокерамика Co-Cr, базовая имплантационная система",
		badge: "Эконом",
		isRecommended: false,
		totalRub: 85500,
		totalKopecks: 8550000,
		amountKopecks: 8550000n,
		warrantyYears: 1,
		keyAdvantages: [
			"Базовая терапевтическая санация полости рта",
			"Проверенный микрогибридный композит световой полимеризации",
			"Надежная имплантационная система",
			"Металлокерамические коронки Co-Cr",
			"Гарантия клиники 1 год",
		],
		stages: ECONOMY_PRESENTER_STAGES,
	},
	{
		tierId: "optimum",
		title: "Оптимальный",
		subtitle: "Клинический золотой стандарт: нанокомпозит, микроскоп, многослойный цирконий, SLA-имплантат",
		badge: "Рекомендуемый",
		isRecommended: true,
		totalRub: 132300,
		totalKopecks: 13230000,
		amountKopecks: 13230000n,
		warrantyYears: 3,
		keyAdvantages: [
			"Лечение каналов под операционным дентальным микроскопом",
			"Высокопрочный нанокомпозит световой полимеризации",
			"Дентальная имплантация с гидрофильной SLA-поверхностью",
			"Коронки из многослойного диоксида циркония",
			"Гарантия клиники 3 года",
		],
		stages: STANDARD_PRESENTER_STAGES,
	},
	{
		tierId: "premium",
		title: "Премиум",
		subtitle: "Тотальная эстетика: прессованная безметалловая керамика, навигационная имплантация",
		badge: "Эстетика",
		isRecommended: false,
		totalRub: 205000,
		totalKopecks: 20500000,
		amountKopecks: 20500000n,
		warrantyYears: 10,
		keyAdvantages: [
			"Премиальная дентальная имплантация высокой гидрофильности",
			"Навигационный хирургический 3D-шаблон CAD/CAM",
			"Прессованная керамика с индивидуальной раскраской",
			"Индивидуальный фрезерованный абатмент Ti-Base",
			"Пожизненная гарантия на остеоинтеграцию имплантата",
		],
		stages: PREMIUM_PRESENTER_STAGES,
	},
];

export const CANONICAL_TIER_DEFINITIONS: readonly TreatmentTierDefinition[] = [
	{
		id: "economy",
		title: "Эконом",
		subtitle: "Базовые сертифицированные материалы РФ и стандартное протезирование",
		badge: "Эконом",
		isRecommended: false,
		warrantyYears: 1,
		keyAdvantages: [
			"Качественные композитные материалы РФ",
			"Санация очагов кариеса и купирование воспаления",
			"Стандартная металлокерамика и базовые импланты",
			"Гарантийный срок клиники 1 год",
		],
		totalRub: 85500,
		totalKopecks: 8550000,
		amountKopecks: 8550000n,
	},
	{
		id: "optimum",
		title: "★ Оптимум",
		subtitle: "Золотой стандарт клиники: наногибридный композит, микроскоп и диоксид циркония",
		badge: "Рекомендуемый",
		isRecommended: true,
		warrantyYears: 3,
		keyAdvantages: [
			"Лечение корневых каналов под операционным микроскопом",
			"Наногибридные реставрации с сохранением эстетики",
			"Анатомические коронки из диоксида циркония CAD/CAM",
			"Дентальные имплантаты с гидрофильной поверхностью",
			"Расширенная гарантия клиники 3 года",
		],
		totalRub: 132300,
		totalKopecks: 13230000,
		amountKopecks: 13230000n,
	},
	{
		id: "premium",
		title: "Премиум",
		subtitle: "Импортная эстетика и биоинженерия: премиальные импланты и безметалловая керамика",
		badge: "Эстетика",
		isRecommended: false,
		warrantyYears: 10,
		keyAdvantages: [
			"Швейцарская имплантационная система высшей категории",
			"Ультратонкая прессованная безметалловая керамика из дисиликата лития",
			"Цифровой 3D-дизайн улыбки и персональный куратор",
			"Консилиум ведущих специалистов клиники",
			"Расширенная гарантия производителя 10 лет",
		],
		totalRub: 205000,
		totalKopecks: 20500000,
		amountKopecks: 20500000n,
	},
];
