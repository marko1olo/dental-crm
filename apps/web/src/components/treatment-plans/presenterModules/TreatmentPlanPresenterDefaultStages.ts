/**
 * TreatmentPlanPresenterDefaultStages.ts — Канонические этапы и 3 тарифа презентера (SSOT).
 * Реализация клинического пути по одонтограмме:
 * - Зуб 16: кариес (санация пломбой / реставрация)
 * - Зуб 46: дефект зубного ряда (хирургическая имплантация + коронка)
 * - Зуб 25: пульпит (микроэндодонтия + коронка)
 * 
 * Строгие целочисленные копейки (amountKopecks, BIGINT) без float drift (Мандат 8b).
 * 3 тарифа: Базовый (Эконом), Оптимальный (Золотой стандарт), Премиум (Тотальная эстетика).
 */

import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanTier } from "../treatmentPlanTypes";

export const mkItem = (
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

export const mkStage = (
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

import { generatePatientCasePresentation } from "@dental/shared";
export { generatePatientCasePresentation };

/** 1. Этапы для тарифа «Базовый (Эконом)» — клинический стандарт без прибитых зубов */
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
			mkItem("it-econ-2", undefined, "A16.07.008.002", "Эндодонтическое лечение корневых каналов (механическая и медикаментозная обработка)", 9500, 9500, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-econ-3", undefined, "A16.07.003.001", "Восстановление культи зуба под коронку (литая вкладка)", 4500, 4500, 1, "stage_1_therapy", "Терапия"),
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
			mkItem("it-econ-5", undefined, "A16.07.004", "Восстановление зуба металлокерамической коронкой стандарт", 14000, 14000, 1, "stage_3_orthopedics", "Ортопедия"),
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

export const DEFAULT_PRESENTER_TIERS: readonly TreatmentPlanTier[] = [
	{
		tierId: "economy",
		title: "Базовый (Эконом)",
		subtitle: "Стандартная санация, металлокерамика Co-Cr, базовая имплантационная система",
		badge: "Базовый",
		isRecommended: false,
		totalRub: 85500,
		totalKopecks: 8550000,
		amountKopecks: BigInt(8550000),
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
		tierId: "standard",
		title: "Оптимальный",
		subtitle: "Клинический золотой стандарт: нанокомпозит, микроскоп, цирконий Katana, SLA-имплантат",
		badge: "Оптимальный",
		isRecommended: true,
		totalRub: 132300,
		totalKopecks: 13230000,
		amountKopecks: BigInt(13230000),
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
		tierId: "optimum",
		title: "Премиум",
		subtitle: "Тотальная эстетика: прессованная безметалловая керамика, навигационная имплантация",
		badge: "Премиум",
		isRecommended: false,
		totalRub: 205000,
		totalKopecks: 20500000,
		amountKopecks: BigInt(20500000),
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

/**
 * buildPresenterTiersFromTeeth — Динамический генератор 3 тарифов строго по одонтограмме пациента.
 * Формирует этапы и финансовые сметы для ВСЕХ реальных патологий пациента без хардкода 16/25/46.
 */
export function buildPresenterTiersFromTeeth(teeth?: unknown): readonly TreatmentPlanTier[] {
	if (!Array.isArray(teeth) || teeth.length === 0) {
		return DEFAULT_PRESENTER_TIERS;
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

	// Если конкретных патологий в переданном массиве нет — возвращаем нейтральный протокол без номеров зубов
	if (cariesTeeth.length === 0 && missingTeeth.length === 0 && pulpitisTeeth.length === 0) {
		return DEFAULT_PRESENTER_TIERS;
	}

	// 1. Сборка тарифа «Базовый (Эконом)»
	const econTherapyItems: TreatmentPlanItem[] = [];
	for (const tooth of cariesTeeth) {
		econTherapyItems.push(
			mkItem(`dyn-ec-c-${tooth}`, tooth, "A16.07.002", `Восстановление зуба ${tooth} пломбой световой полимеризации`, 3500, 3500, 1, "stage_1_therapy", "Терапия"),
		);
	}
	for (const tooth of pulpitisTeeth) {
		econTherapyItems.push(
			mkItem(`dyn-ec-p-${tooth}`, tooth, "A16.07.008.002", `Эндодонтическое лечение зуба ${tooth} (обработка и пломбирование каналов)`, 9500, 9500, 1, "stage_1_therapy", "Терапия"),
			mkItem(`dyn-ec-core-${tooth}`, tooth, "A16.07.003.001", `Восстановление культи зуба ${tooth} под коронку (литая культевая вкладка)`, 4500, 4500, 1, "stage_1_therapy", "Терапия"),
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
		econStages.push(mkStage("st-econ-2", stageIdx++, "stage_2_surgery", "Этап 2: Хирургия и имплантация", "Восстановление жевательной опоры", `Дентальная имплантация в области отсутствующих зубов: ${missingTeeth.join(", ")}`, total, total * 100, econSurgeryItems));
	}
	if (econOrthoItems.length > 0) {
		const total = econOrthoItems.reduce((acc, it) => acc + it.priceRub * it.quantity, 0);
		econStages.push(mkStage("st-econ-3", stageIdx++, "stage_3_orthopedics", "Этап 3: Ортопедия и протезирование", "Функциональное восстановление жевания", `Протезирование зубов металлокерамикой: ${[...pulpitisTeeth, ...missingTeeth].join(", ")}`, total, total * 100, econOrthoItems));
	}
	if (econStages.length === 0) {
		return DEFAULT_PRESENTER_TIERS;
	}

	// 2. Сборка тарифа «Оптимальный (Золотой стандарт)»
	const stdTherapyItems: TreatmentPlanItem[] = [];
	for (const tooth of cariesTeeth) {
		stdTherapyItems.push(
			mkItem(`dyn-std-c-${tooth}`, tooth, "A16.07.002.001", `Восстановление зуба ${tooth} нанокомпозитом световой полимеризации`, 4800, 4800, 1, "stage_1_therapy", "Терапия"),
		);
	}
	for (const tooth of pulpitisTeeth) {
		stdTherapyItems.push(
			mkItem(`dyn-std-p-${tooth}`, tooth, "A16.07.008.002", `Эндодонтическое лечение зуба ${tooth} под операционным микроскопом (3D-обтурация)`, 13500, 13500, 1, "stage_1_therapy", "Терапия"),
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

	// 3. Сборка тарифа «Премиум (Тотальная эстетика)»
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
			tierId: "standard",
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
			tierId: "optimum",
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