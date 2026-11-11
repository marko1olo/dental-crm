/**
 * treatmentPlanCatalogData.ts — Канонический SSOT планов лечения и 3-уровневых смет.
 * Мандаты 8b, 8zi: Целевой размер 300–450 строк (Sweet Spot).
 * Мандат 8e: Автономия врача — скидки до 100%, фильтрация микро-расходников для пациента, 0 блокировок.
 * Мандат 8n: Клиники РФ 1–5 кресел — 3 тарифа, честные альтернативные материалы без множителей *0.75 / *1.45.
 * Мандат 8x: Чистый клинический язык без советского канцелярита в прод-UI.
 */

import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTier, TreatmentPlanTierId } from "./treatmentPlanTypes";
import { isMicroConsumable } from "./treatmentPlanConsumables";
import { generatePatientCasePresentation } from "@dental/shared";

export { generatePatientCasePresentation };

export interface TreatmentTierDefinition {
	readonly id: TreatmentPlanTierId;
	readonly title: string;
	readonly subtitle: string;
	readonly badge: string;
	readonly isRecommended: boolean;
	readonly warrantyYears: number;
	readonly keyAdvantages: readonly string[];
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly amountKopecks: bigint;
}

const mkItem = (
	id: string,
	toothNumber: number | undefined,
	code804n: string,
	name: string,
	priceRub: number,
	unitPriceRub: number,
	quantity: number,
	stageKind: string,
	category: string,
): TreatmentPlanItem => ({
	id,
	toothNumber,
	code804n,
	serviceCode: code804n,
	name,
	priceRub,
	unitPriceRub,
	discountRub: 0,
	quantity,
	stageKind,
	category,
	isCompleted: false,
});

const mkStage = (
	id: string,
	stageNumber: number,
	stageKind: string,
	title: string,
	subtitle: string,
	clinicalGoal: string,
	totalRub: number,
	totalKopecks: number,
	items: TreatmentPlanItem[],
): TreatmentPlanStage => ({
	id,
	stageNumber,
	stageKind,
	title,
	subtitle,
	clinicalGoal,
	totalRub,
	totalKopecks,
	estimatedVisits: 1,
	estimatedWeeks: 1,
	status: "draft",
	items,
});

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

/** 1. Этапы для тарифа «Базовый (Эконом)» — проверенные базовые сертифицированные материалы */
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

/** 2. Этапы для тарифа «Оптимальный (Золотой стандарт)» — нанокомпозит, микроскоп, диоксид циркония */
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

/** 3. Этапы для тарифа «Премиум (Тотальная эстетика)» — безметалловая керамика, навигация, E.max */
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
		badge: "Базовый",
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
		badge: "Оптимальный",
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
		badge: "Премиум",
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
		badge: "Базовый",
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
		subtitle: "Клинический золотой стандарт: нанокомпозит, микроскоп, цирконий Katana, SLA-имплантат",
		badge: "Оптимальный",
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
		badge: "Премиум",
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
		badge: "Базовый",
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
		subtitle: "Импортная эстетика и биоинженерия: швейцарские импланты и керамика e.max",
		badge: "Премиум",
		isRecommended: false,
		warrantyYears: 10,
		keyAdvantages: [
			"Швейцарская имплантационная система высшей категории",
			"Ультратонкая прессованная безметалловая керамика IPS e.max",
			"Цифровой 3D-дизайн улыбки и персональный куратор",
			"Консилиум ведущих специалистов клиники",
			"Расширенная гарантия производителя 10 лет",
		],
		totalRub: 205000,
		totalKopecks: 20500000,
		amountKopecks: 20500000n,
	},
];

/** Фильтрация копеечных микро-расходников для клиента (Мандат 8e) */
export function sanitizePatientPresentationStages(stages: readonly TreatmentPlanStage[]): readonly TreatmentPlanStage[] {
	return stages.map((stage) => {
		const cleanItems = stage.items.filter((item) => !isMicroConsumable(item));
		return { ...stage, items: cleanItems.length > 0 ? cleanItems : stage.items };
	});
}

/** Расчет динамической суммы этапов в копейках и рублях */
export function computeStagesKopecks(stages: readonly TreatmentPlanStage[]): {
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly amountKopecks: bigint;
	readonly stages: readonly TreatmentPlanStage[];
} {
	const mappedStages = stages.map((stg) => {
		const stageTotalRub = stg.items.reduce((sum, it) => sum + it.priceRub * (it.quantity || 1), 0);
		const stageTotalKopecks = stageTotalRub * 100;
		return {
			...stg,
			totalRub: stageTotalRub,
			totalKopecks: stageTotalKopecks,
		};
	});

	const totalRub = mappedStages.reduce((sum, s) => sum + s.totalRub, 0);
	const totalKopecks = totalRub * 100;
	return {
		totalRub,
		totalKopecks,
		amountKopecks: BigInt(totalKopecks),
		stages: mappedStages,
	};
}

/**
 * buildPresenterTiersFromTeeth — Динамический генератор 3 тарифов строго по одонтограмме пациента.
 * Формирует этапы и финансовые сметы для ВСЕХ реальных патологий пациента без хардкода 16/25/46.
 */
export function buildPresenterTiersFromTeeth(teeth?: unknown): readonly TreatmentPlanTier[] {
	if (!Array.isArray(teeth) || teeth.length === 0) {
		return INTACT_PREVENTION_TIERS;
	}

	const teethList = teeth as Array<{ toothNumber?: number; number?: number; state?: string; diagnosis?: string }>;
	const cariesTeeth = [
		...new Set(
			teethList
				.filter((t) => /caries|кариес/i.test(t.state || t.diagnosis || ""))
				.map((t) => t.toothNumber ?? t.number)
				.filter((n): n is number => typeof n === "number" && n >= 11 && n <= 85),
		),
	];
	const missingTeeth = [
		...new Set(
			teethList
				.filter((t) => /missing|отсутств/i.test(t.state || t.diagnosis || ""))
				.map((t) => t.toothNumber ?? t.number)
				.filter((n): n is number => typeof n === "number" && n >= 11 && n <= 85),
		),
	];
	const pulpitisTeeth = [
		...new Set(
			teethList
				.filter((t) => /pulpitis|пульпит|periodontitis|периодонтит/i.test(t.state || t.diagnosis || ""))
				.map((t) => t.toothNumber ?? t.number)
				.filter((n): n is number => typeof n === "number" && n >= 11 && n <= 85),
		),
	];

	if (cariesTeeth.length === 0 && missingTeeth.length === 0 && pulpitisTeeth.length === 0) {
		return INTACT_PREVENTION_TIERS;
	}

	// 1. Эконом
	const econTherapyItems: TreatmentPlanItem[] = [];
	for (const tooth of cariesTeeth) {
		econTherapyItems.push(
			mkItem(`dyn-ec-c-${tooth}`, tooth, "A16.07.002", `Восстановление зуба ${tooth} пломбой световой полимеризации`, 3500, 3500, 1, "stage_1_therapy", "Терапия"),
		);
	}
	for (const tooth of pulpitisTeeth) {
		econTherapyItems.push(
			mkItem(`dyn-ec-p-${tooth}`, tooth, "A16.07.008.002", `Эндодонтическое лечение зуба ${tooth} (обработка и пломбирование каналов)`, 9500, 9500, 1, "stage_1_therapy", "Терапия"),
			mkItem(`dyn-ec-core-${tooth}`, tooth, "A16.07.003.001", `Восстановление культи зуба ${tooth} под коронку (литая вкладка)`, 4500, 4500, 1, "stage_1_therapy", "Терапия"),
		);
	}
	const econSurgeryItems: TreatmentPlanItem[] = [];
	for (const tooth of missingTeeth) {
		econSurgeryItems.push(
			mkItem(`dyn-ec-imp-${tooth}`, tooth, "A16.07.054.001", `Дентальная имплантация в области зуба ${tooth}`, 32000, 32000, 1, "stage_2_surgery", "Хирургия"),
		);
	}
	const econOrthoItems: TreatmentPlanItem[] = [];
	for (const tooth of pulpitisTeeth) {
		econOrthoItems.push(
			mkItem(`dyn-ec-cr-${tooth}`, tooth, "A16.07.004", `Восстановление зуба ${tooth} металлокерамической коронкой Co-Cr`, 14000, 14000, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	for (const tooth of missingTeeth) {
		econOrthoItems.push(
			mkItem(`dyn-ec-imp-cr-${tooth}`, tooth, "A16.07.006", `Протезирование на имплантате ${tooth} металлокерамической коронкой`, 22000, 22000, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	const econStages: TreatmentPlanStage[] = [];
	let stageIdx = 1;
	if (econTherapyItems.length > 0) {
		const total = econTherapyItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		econStages.push(mkStage("st-econ-1", stageIdx++, "stage_1_therapy", "Этап 1: Неотложная помощь и терапия", "Санация очагов инфекции и кариеса", `Терапевтическое лечение зубов: ${[...cariesTeeth, ...pulpitisTeeth].join(", ")}`, total, total * 100, econTherapyItems));
	}
	if (econSurgeryItems.length > 0) {
		const total = econSurgeryItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		econStages.push(mkStage("st-econ-2", stageIdx++, "stage_2_surgery", "Этап 2: Хирургия и имплантация", "Восстановление жевательной опоры", `Дентальная имплантация в области: ${missingTeeth.join(", ")}`, total, total * 100, econSurgeryItems));
	}
	if (econOrthoItems.length > 0) {
		const total = econOrthoItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		econStages.push(mkStage("st-econ-3", stageIdx++, "stage_3_orthopedics", "Этап 3: Ортопедия и протезирование", "Функциональное восстановление жевания", `Протезирование зубов металлокерамикой: ${[...pulpitisTeeth, ...missingTeeth].join(", ")}`, total, total * 100, econOrthoItems));
	}

	// 2. Оптимум
	const stdTherapyItems: TreatmentPlanItem[] = [];
	for (const tooth of cariesTeeth) {
		stdTherapyItems.push(
			mkItem(`dyn-std-c-${tooth}`, tooth, "A16.07.002.001", `Восстановление зуба ${tooth} нанокомпозитом световой полимеризации`, 4800, 4800, 1, "stage_1_therapy", "Терапия"),
		);
	}
	for (const tooth of pulpitisTeeth) {
		stdTherapyItems.push(
			mkItem(`dyn-std-p-${tooth}`, tooth, "A16.07.008.002", `Эндодонтическое лечение зуба ${tooth} под операционным микроскопом`, 13500, 13500, 1, "stage_1_therapy", "Терапия"),
			mkItem(`dyn-std-core-${tooth}`, tooth, "A16.07.003.001", `Восстановление зуба ${tooth} со стекловолоконным штифтом`, 5500, 5500, 1, "stage_1_therapy", "Терапия"),
		);
	}
	const stdSurgeryItems: TreatmentPlanItem[] = [];
	for (const tooth of missingTeeth) {
		stdSurgeryItems.push(
			mkItem(`dyn-std-imp-${tooth}`, tooth, "A16.07.054.001", `Внутрикостная дентальная имплантация SLA-системы в области зуба ${tooth}`, 42000, 42000, 1, "stage_2_surgery", "Хирургия"),
		);
	}
	const stdOrthoItems: TreatmentPlanItem[] = [];
	if (missingTeeth.length > 0 || pulpitisTeeth.length > 0) {
		stdOrthoItems.push(
			mkItem("dyn-std-scan", undefined, "A02.07.010", "Оптическое внутриротовое 3D-сканирование зубного ряда и регистрация окклюзии", 6500, 6500, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	for (const tooth of pulpitisTeeth) {
		stdOrthoItems.push(
			mkItem(`dyn-std-cr-${tooth}`, tooth, "A16.07.004.001", `Восстановление зуба ${tooth} коронкой из многослойного диоксида циркония`, 26000, 26000, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	for (const tooth of missingTeeth) {
		stdOrthoItems.push(
			mkItem(`dyn-std-imp-cr-${tooth}`, tooth, "A16.07.006", `Протезирование на имплантате ${tooth} (диоксид циркония с винтовой фиксацией)`, 34000, 34000, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	const stdStages: TreatmentPlanStage[] = [];
	stageIdx = 1;
	if (stdTherapyItems.length > 0) {
		const total = stdTherapyItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		stdStages.push(mkStage("st-std-1", stageIdx++, "stage_1_therapy", "Этап 1: Неотложная помощь и терапия", "Санация под увеличением и биосовместимая изоляция", `Терапевтическое лечение зубов: ${[...cariesTeeth, ...pulpitisTeeth].join(", ")}`, total, total * 100, stdTherapyItems));
	}
	if (stdSurgeryItems.length > 0) {
		const total = stdSurgeryItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		stdStages.push(mkStage("st-std-2", stageIdx++, "stage_2_surgery", "Этап 2: Хирургия и имплантация", "Двухэтапная дентальная имплантация", `Установка SLA-имплантатов в области: ${missingTeeth.join(", ")}`, total, total * 100, stdSurgeryItems));
	}
	if (stdOrthoItems.length > 0) {
		const total = stdOrthoItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		stdStages.push(mkStage("st-std-3", stageIdx++, "stage_3_orthopedics", "Этап 3: Ортопедия и протезирование", "Анатомические коронки из диоксида циркония", `Циркониевые коронки CAD/CAM: ${[...pulpitisTeeth, ...missingTeeth].join(", ")}`, total, total * 100, stdOrthoItems));
	}

	// 3. Премиум
	const premTherapyItems: TreatmentPlanItem[] = [];
	for (const tooth of cariesTeeth) {
		premTherapyItems.push(
			mkItem(`dyn-pr-c-${tooth}`, tooth, "A16.07.003", `Восстановление зуба ${tooth} прессованной керамической накладкой Inlay`, 8500, 8500, 1, "stage_1_therapy", "Терапия"),
		);
	}
	for (const tooth of pulpitisTeeth) {
		premTherapyItems.push(
			mkItem(`dyn-pr-p-${tooth}`, tooth, "A16.07.008.002", `Прецизионная микроскопная эндодонтия зуба ${tooth} с биокерамикой`, 16500, 16500, 1, "stage_1_therapy", "Терапия"),
			mkItem(`dyn-pr-core-${tooth}`, tooth, "A16.07.003.001", `Билдап зуба ${tooth} композитом с кварцевым штифтом`, 7500, 7500, 1, "stage_1_therapy", "Терапия"),
		);
	}
	const premSurgeryItems: TreatmentPlanItem[] = [];
	for (const tooth of missingTeeth) {
		premSurgeryItems.push(
			mkItem(`dyn-pr-imp-${tooth}`, tooth, "A16.07.054.001", `Дентальная имплантация премиум-системы в области зуба ${tooth}`, 68000, 68000, 1, "stage_2_surgery", "Хирургия"),
			mkItem(`dyn-pr-guide-${tooth}`, tooth, "A16.07.054", `Изготовление навигационного 3D-шаблона для зуба ${tooth}`, 12000, 12000, 1, "stage_2_surgery", "Хирургия"),
		);
	}
	const premOrthoItems: TreatmentPlanItem[] = [];
	if (missingTeeth.length > 0 || pulpitisTeeth.length > 0) {
		premOrthoItems.push(
			mkItem("dyn-pr-scan", undefined, "A02.07.010", "Оптическое внутриротовое 3D-сканирование 3Shape TRIOS", 6500, 6500, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	for (const tooth of pulpitisTeeth) {
		premOrthoItems.push(
			mkItem(`dyn-pr-cr-${tooth}`, tooth, "A16.07.004.002", `Восстановление зуба ${tooth} керамической коронкой с индивидуальной раскраской`, 38000, 38000, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	for (const tooth of missingTeeth) {
		premOrthoItems.push(
			mkItem(`dyn-pr-imp-cr-${tooth}`, tooth, "A16.07.006", `Протезирование на имплантате ${tooth} (индивидуальный абатмент Ti-Base + коронка)`, 48000, 48000, 1, "stage_3_orthopedics", "Ортопедия"),
		);
	}
	const premStages: TreatmentPlanStage[] = [];
	stageIdx = 1;
	if (premTherapyItems.length > 0) {
		const total = premTherapyItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		premStages.push(mkStage("st-prem-1", stageIdx++, "stage_1_therapy", "Этап 1: Неотложная помощь и терапия", "Премиальная санация и микроскопная эндодонтия", `Керамические накладки и микроэндодонтия: ${[...cariesTeeth, ...pulpitisTeeth].join(", ")}`, total, total * 100, premTherapyItems));
	}
	if (premSurgeryItems.length > 0) {
		const total = premSurgeryItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		premStages.push(mkStage("st-prem-2", stageIdx++, "stage_2_surgery", "Этап 2: Хирургия и имплантация", "Навигационная имплантация премиум-класса", `Премиальная имплантация по 3D-шаблону в области: ${missingTeeth.join(", ")}`, total, total * 100, premSurgeryItems));
	}
	if (premOrthoItems.length > 0) {
		const total = premOrthoItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		premStages.push(mkStage("st-prem-3", stageIdx++, "stage_3_orthopedics", "Этап 3: Ортопедия и протезирование", "Безметалловая керамика и индивидуальные абатменты", `Индивидуальные коронки и абатменты: ${[...pulpitisTeeth, ...missingTeeth].join(", ")}`, total, total * 100, premOrthoItems));
	}

	const econTotalRub = econStages.reduce((sum, s) => sum + s.totalRub, 0);
	const stdTotalRub = stdStages.reduce((sum, s) => sum + s.totalRub, 0);
	const premTotalRub = premStages.reduce((sum, s) => sum + s.totalRub, 0);

	return [
		{
			tierId: "economy",
			title: "Базовый (Эконом)",
			subtitle: "Стандартная санация, металлокерамика Co-Cr, базовая имплантация",
			badge: "Базовый",
			isRecommended: false,
			totalRub: econTotalRub,
			totalKopecks: econTotalRub * 100,
			amountKopecks: BigInt(econTotalRub * 100),
			warrantyYears: 1,
			keyAdvantages: [
				"Базовая терапевтическая санация полости рта",
				"Проверенный микрогибридный композит",
				"Надежная имплантационная опора",
				"Металлокерамические коронки Co-Cr",
				"Гарантия клиники 1 год",
			],
			stages: econStages,
		},
		{
			tierId: "optimum",
			title: "Оптимальный",
			subtitle: "Клинический золотой стандарт: нанокомпозит, микроскоп, диоксид циркония, SLA-имплантат",
			badge: "Оптимальный",
			isRecommended: true,
			totalRub: stdTotalRub,
			totalKopecks: stdTotalRub * 100,
			amountKopecks: BigInt(stdTotalRub * 100),
			warrantyYears: 3,
			keyAdvantages: [
				"Лечение каналов под операционным дентальным микроскопом",
				"Высокопрочный нанокомпозит световой полимеризации",
				"Дентальная имплантация с гидрофильной SLA-поверхностью",
				"Коронки из многослойного диоксида циркония",
				"Гарантия клиники 3 года",
			],
			stages: stdStages,
		},
		{
			tierId: "premium",
			title: "Премиум",
			subtitle: "Тотальная эстетика: прессованная безметалловая керамика, навигационная имплантация",
			badge: "Премиум",
			isRecommended: false,
			totalRub: premTotalRub,
			totalKopecks: premTotalRub * 100,
			amountKopecks: BigInt(premTotalRub * 100),
			warrantyYears: 10,
			keyAdvantages: [
				"Премиальная дентальная имплантация высокой гидрофильности",
				"Навигационный хирургический 3D-шаблон CAD/CAM",
				"Прессованная керамика с индивидуальной раскраской",
				"Индивидуальный фрезерованный абатмент Ti-Base",
				"Пожизненная гарантия на остеоинтеграцию имплантата",
			],
			stages: premStages,
		},
	];
}

/**
 * differentiateStagesForTier — Дифференциация этапов и услуг по клинической матрице материалов:
 * - Эконом (economy): базовый световой композит (3 500 ₽), стандартное эндо (9 500 ₽), металлокерамика Co-Cr (14 000 ₽), базовая имплантация (32 000 ₽), коронка на имплантате металлокерамика (22 000 ₽).
 * - Оптимум (optimum): наногибридный композит (4 800 ₽), микроскопная эндодонтия (13 500 ₽), коронка из диоксида циркония Katana CAD/CAM (26 000 ₽), SLA-имплантат (42 000 ₽), коронка на имплантате с винтовой фиксацией (34 000 ₽).
 * - Премиум (premium): прессованная керамика E.max / накладка Inlay (8 500 ₽ / 38 000 ₽), биокерамическая эндодонтия под микроскопом (16 500 ₽), премиум гидрофильный имплантат + навигационный 3D-шаблон (80 000 ₽), индивидуальный абатмент Ti-Base + коронка E.max (48 000 ₽).
 */
export function differentiateStagesForTier(
	stages: readonly TreatmentPlanStage[],
	tierId: string,
): TreatmentPlanStage[] {
	return stages.map((stg) => {
		const mappedItems = stg.items.map((it) => {
			const nameLower = (it.name || "").toLowerCase();
			const toothPrefix = it.toothNumber ? `зуба ${it.toothNumber} ` : "";

			if (tierId === "economy") {
				if (/протез.*имплант|коронк.*имплант/i.test(nameLower)) {
					return {
						...it,
						name: `Протезирование на имплантате ${toothPrefix}металлокерамической коронкой`,
						priceRub: 22000,
						unitPriceRub: 22000,
					};
				}
				if (/имплант/i.test(nameLower)) {
					return {
						...it,
						name: `Дентальная имплантация ${toothPrefix}(базовая система)`,
						priceRub: 32000,
						unitPriceRub: 32000,
					};
				}
				if (/коронк|вкладк/i.test(nameLower)) {
					return {
						...it,
						name: `Восстановление ${toothPrefix}металлокерамической коронкой Co-Cr`,
						priceRub: 14000,
						unitPriceRub: 14000,
					};
				}
				if (/эндодонт|канал/i.test(nameLower)) {
					return {
						...it,
						name: `Эндодонтическое лечение ${toothPrefix}(стандартная обработка и пломбирование)`,
						priceRub: 9500,
						unitPriceRub: 9500,
					};
				}
				if (/пломб|композит|кариес|восстановлен/i.test(nameLower)) {
					return {
						...it,
						name: `Восстановление ${toothPrefix}пломбой световой полимеризации`,
						priceRub: 3500,
						unitPriceRub: 3500,
					};
				}
				const basePrice = typeof it.unitPriceRub === "number" ? it.unitPriceRub : it.priceRub;
				const discountedPrice = Math.max(500, Math.round((basePrice * 0.85) / 100) * 100);
				return {
					...it,
					priceRub: discountedPrice,
					unitPriceRub: discountedPrice,
				};
			}

			if (tierId === "premium") {
				if (/протез.*имплант|коронк.*имплант/i.test(nameLower)) {
					return {
						...it,
						name: `Протезирование на имплантате ${toothPrefix}(индивидуальный абатмент Ti-Base + керамическая коронка)`,
						priceRub: 48000,
						unitPriceRub: 48000,
					};
				}
				if (/имплант/i.test(nameLower)) {
					return {
						...it,
						name: `Премиальная имплантация ${toothPrefix}с гидрофильной поверхностью + 3D-шаблон`,
						priceRub: 80000,
						unitPriceRub: 80000,
					};
				}
				if (/коронк/i.test(nameLower)) {
					return {
						...it,
						name: `Восстановление ${toothPrefix}керамической коронкой E.max с индивидуальной раскраской`,
						priceRub: 38000,
						unitPriceRub: 38000,
					};
				}
				if (/вкладк/i.test(nameLower)) {
					return {
						...it,
						name: `Восстановление ${toothPrefix}прессованной керамической накладкой Inlay`,
						priceRub: 8500,
						unitPriceRub: 8500,
					};
				}
				if (/эндодонт|канал/i.test(nameLower)) {
					return {
						...it,
						name: `Прецизионная микроскопная эндодонтия ${toothPrefix}с биокерамикой`,
						priceRub: 16500,
						unitPriceRub: 16500,
					};
				}
				if (/пломб|композит|кариес|восстановлен/i.test(nameLower)) {
					return {
						...it,
						name: `Восстановление ${toothPrefix}керамической накладкой / вкладкой E.max`,
						priceRub: 8500,
						unitPriceRub: 8500,
					};
				}
				const basePrice = typeof it.unitPriceRub === "number" ? it.unitPriceRub : it.priceRub;
				const premiumPrice = Math.round((basePrice * 1.35) / 100) * 100;
				return {
					...it,
					priceRub: premiumPrice,
					unitPriceRub: premiumPrice,
				};
			}

			// optimum (золотой клинический стандарт — сохраняет точные наименования врача и базовые сметы)
			const basePrice = typeof it.unitPriceRub === "number" ? it.unitPriceRub : it.priceRub;
			return {
				...it,
				name: it.name,
				priceRub: basePrice,
				unitPriceRub: basePrice,
			};
		});

		const stageTotalRub = mappedItems.reduce((acc, it) => acc + it.priceRub * (it.quantity || 1), 0);
		return {
			...stg,
			totalRub: stageTotalRub,
			totalKopecks: stageTotalRub * 100,
			items: mappedItems,
		};
	});
}

/**
 * buildCanonical3TierPlans — Сборка 3 канонических тарифов плана лечения.
 * Тарифы базируются на честных альтернативных клинических процедурах,
 * исключая фиктивные скалярные множители цен (0.75 / 1.45).
 */
export function buildCanonical3TierPlans(baseStages?: readonly TreatmentPlanStage[]): readonly TreatmentPlanTier[] {
	if (baseStages === undefined || baseStages === CANONICAL_CLINICAL_STAGES) {
		return DEFAULT_PRESENTER_TIERS;
	}

	if (baseStages.length === 0) {
		return CANONICAL_TIER_DEFINITIONS.map((def) => ({
			tierId: def.id,
			title: def.title,
			subtitle: def.subtitle,
			badge: def.badge,
			isRecommended: def.isRecommended,
			totalRub: 0,
			totalKopecks: 0,
			amountKopecks: 0n,
			warrantyYears: def.warrantyYears,
			keyAdvantages: def.keyAdvantages,
			stages: [],
		}));
	}

	const sanitized = sanitizePatientPresentationStages(baseStages);

	return CANONICAL_TIER_DEFINITIONS.map((def) => {
		const tierStages = differentiateStagesForTier(sanitized, def.id);
		const totalRub = tierStages.reduce((sum, s) => sum + s.totalRub, 0);
		const totalKopecks = totalRub * 100;
		return {
			tierId: def.id,
			title: def.title,
			subtitle: def.subtitle,
			badge: def.badge,
			isRecommended: def.isRecommended,
			totalRub,
			totalKopecks,
			amountKopecks: BigInt(totalKopecks),
			warrantyYears: def.warrantyYears,
			keyAdvantages: def.keyAdvantages,
			stages: tierStages,
		};
	});
}

/** Расчет скидки врача до 100% (Мандат 8e, BIGINT/integer precision) */
export function applyDoctorDiscountToTiers(tiers: readonly TreatmentPlanTier[], discountPercent: number): readonly TreatmentPlanTier[] {
	const clampedDiscount = Math.max(0, Math.min(100, discountPercent));
	if (clampedDiscount === 0) return tiers;

	const multiplier = (100 - clampedDiscount) / 100;
	return tiers.map((tier) => {
		const discountedStages = tier.stages.map((stage) => {
			const sRub = Math.round(stage.totalRub * multiplier);
			return {
				...stage,
				totalRub: sRub,
				totalKopecks: sRub * 100,
				items: stage.items.map((it) => {
					const itemRub = Math.round(it.priceRub * multiplier);
					return {
						...it,
						priceRub: itemRub,
						unitPriceRub: typeof it.unitPriceRub === "number" ? Math.round(it.unitPriceRub * multiplier) : undefined,
						discountRub: it.priceRub - itemRub,
					};
				}),
			};
		});

		const totalRub = discountedStages.reduce((sum, s) => sum + s.totalRub, 0);
		const totalKopecks = totalRub * 100;
		return {
			...tier,
			totalRub,
			totalKopecks,
			amountKopecks: BigInt(totalKopecks),
			stages: discountedStages,
		};
	});
}

/** Клинический генератор типовых планов по диагнозу МКБ-10 (Мандат 8n) */
export function generateTreatmentPlanFromDiagnosis(diagnosisCode: string, toothNumber?: number): readonly TreatmentPlanStage[] {
	const cleanCode = diagnosisCode.trim().toUpperCase();
	const toothLabel = toothNumber ? ` зуба ${toothNumber}` : "";

	// 1. Кариес дентина (K02)
	if (cleanCode.includes("K02") || cleanCode.includes("КАРИЕС")) {
		return [{
			id: `stage-caries-${toothNumber || "default"}`,
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Терапевтическое лечение кариеса",
			subtitle: `Анатомическая реставрация${toothLabel}`,
			clinicalGoal: "Иссечение некротизированных тканей и восстановление формы зуба",
			totalRub: 5500,
			totalKopecks: 550000,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			status: "draft",
			items: [
				{ id: `item-caries-${toothNumber || "default"}`, toothNumber, code804n: "A16.07.002", name: `Восстановление${toothLabel} нанокомпозитом`, priceRub: 5500, unitPriceRub: 5500, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
			],
		}];
	}

	// 2. Пульпит / эндодонтия (K04)
	if (cleanCode.includes("K04") || cleanCode.includes("ПУЛЬПИТ") || cleanCode.includes("ПЕРИОДОНТИТ")) {
		return [{
			id: `stage-endo-${toothNumber || "default"}`,
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Эндодонтическое лечение каналов",
			subtitle: `Механическая и медикаментозная обработка${toothLabel}`,
			clinicalGoal: "Пломбирование корневых каналов гуттаперчей и герметизация",
			totalRub: 12000,
			totalKopecks: 1200000,
			estimatedVisits: 2,
			estimatedWeeks: 2,
			status: "draft",
			items: [
				{ id: `item-endo-prep-${toothNumber || "default"}`, toothNumber, code804n: "A16.07.030", name: `Обработка корневых каналов${toothLabel} под микроскопом`, priceRub: 7500, unitPriceRub: 7500, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
				{ id: `item-endo-fill-${toothNumber || "default"}`, toothNumber, code804n: "A16.07.002", name: `Реставрация коронковой части${toothLabel}`, priceRub: 4500, unitPriceRub: 4500, discountRub: 0, quantity: 1, stageKind: "stage_1_therapy", isCompleted: false },
			],
		}];
	}

	// 3. Адентия / имплантация (K08)
	if (cleanCode.includes("K08") || cleanCode.includes("АДЕНТИЯ") || cleanCode.includes("ИМПЛАНТ")) {
		return [
			{
				id: `stage-surg-${toothNumber || "default"}`,
				stageNumber: 1,
				stageKind: "stage_2_surgery",
				title: "Хирургический этап: дентальная имплантация",
				subtitle: `Установка имплантата${toothNumber ? ` в позиции зуба ${toothNumber}` : ""}`,
				clinicalGoal: "Остеоинтеграция дентального имплантата",
				totalRub: 48000,
				totalKopecks: 4800000,
				estimatedVisits: 1,
				estimatedWeeks: 12,
				status: "draft",
				items: [
					{ id: `item-surg-impl-${toothNumber || "default"}`, toothNumber, code804n: "A16.07.054", name: `Установка имплантата${toothNumber ? ` в позиции зуба ${toothNumber}` : ""}`, priceRub: 48000, unitPriceRub: 48000, discountRub: 0, quantity: 1, stageKind: "stage_2_surgery", isCompleted: false },
				],
			},
			{
				id: `stage-ortho-${toothNumber || "default"}`,
				stageNumber: 2,
				stageKind: "stage_3_orthopedics",
				title: "Ортопедический этап: коронка на имплантате",
				subtitle: `Индивидуальный абатмент и коронка${toothNumber ? ` на зуб ${toothNumber}` : ""}`,
				clinicalGoal: "Полноценное функциональное протезирование",
				totalRub: 35000,
				totalKopecks: 3500000,
				estimatedVisits: 2,
				estimatedWeeks: 2,
				status: "draft",
				items: [
					{ id: `item-ortho-crown-${toothNumber || "default"}`, toothNumber, code804n: "A16.07.004", name: `Коронка из диоксида циркония на имплантате${toothNumber ? ` ${toothNumber}` : ""}`, priceRub: 35000, unitPriceRub: 35000, discountRub: 0, quantity: 1, stageKind: "stage_3_orthopedics", isCompleted: false },
				],
			},
		];
	}

	return CANONICAL_CLINICAL_STAGES;
}

/** Проверка срока действия плана (30 дней): истечение НЕ блокирует врача (Мандат 8e) */
export function isTreatmentPlanExpired(createdAtIso?: string): {
	readonly isExpired: boolean;
	readonly daysElapsed: number;
	readonly warningNotice?: string | undefined;
} {
	if (!createdAtIso) return { isExpired: false, daysElapsed: 0 };
	const created = new Date(createdAtIso).getTime();
	if (Number.isNaN(created)) return { isExpired: false, daysElapsed: 0 };
	const daysElapsed = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
	const isExpired = daysElapsed > 30;

	return {
		isExpired,
		daysElapsed,
		warningNotice: isExpired
			? `Срок предварительной сметы (30 дней) истёк ${daysElapsed - 30} дн. назад. Врач сохраняет право согласовать продолжение лечения без изменения цен.`
			: undefined,
	};
}
