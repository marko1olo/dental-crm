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

/** 1. Этапы для тарифа «Базовый (Эконом)» */
export const ECONOMY_PRESENTER_STAGES: readonly TreatmentPlanStage[] = [
	mkStage(
		"st-econ-1",
		1,
		"stage_1_therapy",
		"Этап 1: Неотложная помощь и терапия",
		"Санация очагов инфекции и кариеса",
		"Ликвидация острой боли, санация кариеса 16 и эндодонтия зуба 25",
		17500,
		1750000,
		[
			mkItem("it-econ-1", 16, "A16.07.002", "Восстановление зуба 16 пломбой световой полимеризации (базовый композит Gradia / Charisma)", 3500, 3500, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-econ-2", 25, "A16.07.008.002", "Эндодонтическое лечение пульпита зуба 25 (обработка и пломбирование каналов)", 9500, 9500, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-econ-3", 25, "A16.07.003.001", "Восстановление культи зуба 25 под коронку (литая культевая вкладка)", 4500, 4500, 1, "stage_1_therapy", "Терапия"),
		],
	),
	mkStage(
		"st-econ-2",
		2,
		"stage_2_surgery",
		"Этап 2: Хирургия и имплантация",
		"Восстановление жевательной опоры",
		"Установка дентального имплантата Osstem на место отсутствующего зуба 46",
		32000,
		3200000,
		[
			mkItem("it-econ-4", 46, "A16.07.054.001", "Внутрикостная дентальная имплантация системы Osstem TS-III SA в области зуба 46", 32000, 32000, 1, "stage_2_surgery", "Хирургия"),
		],
	),
	mkStage(
		"st-econ-3",
		3,
		"stage_3_orthopedics",
		"Этап 3: Ортопедия и протезирование",
		"Функциональное восстановление жевания",
		"Протезирование зуба 25 и имплантата 46 металлокерамическими коронками",
		36000,
		3600000,
		[
			mkItem("it-econ-5", 25, "A16.07.004", "Восстановление зуба 25 металлокерамической коронкой Co-Cr стандарт", 14000, 14000, 1, "stage_3_orthopedics", "Ортопедия"),
			mkItem("it-econ-6", 46, "A16.07.006", "Протезирование на имплантате 46 металлокерамической коронкой с винтовой фиксацией", 22000, 22000, 1, "stage_3_orthopedics", "Ортопедия"),
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
		"Санация кариеса зуба 16 нанокомпозитом и эндодонтия зуба 25 под микроскопом",
		23800,
		2380000,
		[
			mkItem("it-std-1", 16, "A16.07.002.001", "Восстановление зуба 16 пломбой (светоотверждаемый нанокомпозит Filtek Ultimate / Estelite)", 4800, 4800, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-std-2", 25, "A16.07.008.002", "Эндодонтическое лечение пульпита зуба 25 под операционным микроскопом (3D-обтурация)", 13500, 13500, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-std-3", 25, "A16.07.003.001", "Восстановление зуба 25 под коронку со стекловолоконным штифтом RelyX Fiber Post", 5500, 5500, 1, "stage_1_therapy", "Терапия"),
		],
	),
	mkStage(
		"st-std-2",
		2,
		"stage_2_surgery",
		"Этап 2: Хирургия и имплантация",
		"Двухэтапная дентальная имплантация",
		"Установка дентального имплантата SLA Osstem TS-III / Dentium в области 46",
		42000,
		4200000,
		[
			mkItem("it-std-4", 46, "A16.07.054.001", "Внутрикостная дентальная имплантация SLA Osstem TS-III + формирователь десны (зуб 46)", 42000, 42000, 1, "stage_2_surgery", "Хирургия"),
		],
	),
	mkStage(
		"st-std-3",
		3,
		"stage_3_orthopedics",
		"Этап 3: Ортопедия и протезирование",
		"Анатомические коронки из диоксида циркония",
		"Цифровое 3D-сканирование и циркониевые коронки Katana Zirconia HTML",
		66500,
		6650000,
		[
			mkItem("it-std-5", undefined, "A02.07.010", "Оптическое внутриротовое 3D-сканирование зубного ряда и регистрация окклюзии (CAD/CAM)", 6500, 6500, 1, "stage_3_orthopedics", "Ортопедия"),
			mkItem("it-std-6", 25, "A16.07.004.001", "Восстановление зуба 25 коронкой из многослойного диоксида циркония Katana HTML", 26000, 26000, 1, "stage_3_orthopedics", "Ортопедия"),
			mkItem("it-std-7", 46, "A16.07.006", "Протезирование на имплантате 46 (диоксид циркония с шахтой винтовой фиксации)", 34000, 34000, 1, "stage_3_orthopedics", "Ортопедия"),
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
		"Керамическая накладка Inlay зуба 16 и микроэндодонтия зуба 25 с биокерамикой",
		32500,
		3250000,
		[
			mkItem("it-prem-1", 16, "A16.07.003", "Восстановление зуба 16 прессованной керамической накладкой Inlay IPS e.max", 8500, 8500, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-prem-2", 25, "A16.07.008.002", "Прецизионная микроскопная эндодонтия зуба 25 WaveOne Gold с биокерамическим силером", 16500, 16500, 1, "stage_1_therapy", "Терапия"),
			mkItem("it-prem-3", 25, "A16.07.003.001", "Билдап зуба 25 композитом двойного отверждения LuxaCore Z с кварцевым штифтом", 7500, 7500, 1, "stage_1_therapy", "Терапия"),
		],
	),
	mkStage(
		"st-prem-2",
		2,
		"stage_2_surgery",
		"Этап 2: Хирургия и имплантация",
		"Навигационная имплантация премиум-класса",
		"Установка имплантата Straumann Roxolid SLActive в области 46 по 3D-шаблону",
		80000,
		8000000,
		[
			mkItem("it-prem-4", 46, "A16.07.054.001", "Дентальная имплантация премиум-системы Straumann Roxolid SLActive в области зуба 46", 68000, 68000, 1, "stage_2_surgery", "Хирургия"),
			mkItem("it-prem-5", 46, "A16.07.054", "Изготовление хирургического навигационного 3D-шаблона для прецизионной установки", 12000, 12000, 1, "stage_2_surgery", "Хирургия"),
		],
	),
	mkStage(
		"st-prem-3",
		3,
		"stage_3_orthopedics",
		"Этап 3: Ортопедия и протезирование",
		"Безметалловая керамика и индивидуальные абатменты",
		"Высокая эстетика: коронки IPS e.max Press и индивидуальный абатмент Ti-Base",
		92500,
		9250000,
		[
			mkItem("it-prem-6", undefined, "A02.07.010", "Оптическое внутриротовое 3D-сканирование 3Shape TRIOS / Medit i700", 6500, 6500, 1, "stage_3_orthopedics", "Ортопедия"),
			mkItem("it-prem-7", 25, "A16.07.004.002", "Восстановление зуба 25 керамической коронкой IPS e.max Press с индивидуальной раскраской", 38000, 38000, 1, "stage_3_orthopedics", "Ортопедия"),
			mkItem("it-prem-8", 46, "A16.07.006", "Протезирование на имплантате 46 (индивидуальный абатмент Ti-Base + коронка IPS e.max)", 48000, 48000, 1, "stage_3_orthopedics", "Ортопедия"),
		],
	),
];

export const DEFAULT_PRESENTER_STAGES: readonly TreatmentPlanStage[] = STANDARD_PRESENTER_STAGES;

export const DEFAULT_PRESENTER_TIERS: readonly TreatmentPlanTier[] = [
	{
		tierId: "economy",
		title: "Базовый (Эконом)",
		subtitle: "Стандартная санация, металлокерамика Co-Cr, имплантат Osstem",
		badge: "Базовый",
		isRecommended: false,
		totalRub: 85500,
		totalKopecks: 8550000,
		warrantyYears: 1,
		keyAdvantages: [
			"Базовая терапевтическая санация полости рта",
			"Проверенный микрогибридный композит Gradia / Charisma",
			"Надежный корейский имплантат Osstem TS-III",
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
		warrantyYears: 3,
		keyAdvantages: [
			"Лечение каналов под операционным дентальным микроскопом",
			"Высокопрочный нанокомпозит Filtek Ultimate / Estelite",
			"Дентальная имплантация с гидрофильной SLA-поверхностью",
			"Коронки из многослойного диоксида циркония Katana HTML",
			"Гарантия клиники 3 года",
		],
		stages: STANDARD_PRESENTER_STAGES,
	},
	{
		tierId: "optimum",
		title: "Премиум",
		subtitle: "Тотальная эстетика: безметалловая керамика IPS e.max, имплантация Straumann Roxolid",
		badge: "Премиум",
		isRecommended: false,
		totalRub: 205000,
		totalKopecks: 20500000,
		warrantyYears: 10,
		keyAdvantages: [
			"Швейцарская имплантация Straumann Roxolid SLActive",
			"Навигационный хирургический 3D-шаблон CAD/CAM",
			"Прессованная полевошпатная керамика IPS e.max Press",
			"Индивидуальный фрезерованный абатмент Ti-Base",
			"Пожизненная гарантия на остеоинтеграцию имплантата",
		],
		stages: PREMIUM_PRESENTER_STAGES,
	},
];

/**
 * buildPresenterTiersFromTeeth — Динамический генератор 3 тарифов по одонтограмме.
 * Рассчитывает этапы и копейки строго из переданных зубов или клинического эталона.
 */
export function buildPresenterTiersFromTeeth(teeth?: unknown): readonly TreatmentPlanTier[] {
	if (!Array.isArray(teeth) || teeth.length === 0) {
		return DEFAULT_PRESENTER_TIERS;
	}

	const teethList = teeth as Array<{ toothNumber?: number; number?: number; state?: string; diagnosis?: string }>;
	const cariesTeeth = teethList.filter((t) => /caries|кариес/i.test(t.state || t.diagnosis || "")).map((t) => t.toothNumber ?? t.number ?? 16);
	const missingTeeth = teethList.filter((t) => /missing|отсутств/i.test(t.state || t.diagnosis || "")).map((t) => t.toothNumber ?? t.number ?? 46);
	const pulpitisTeeth = teethList.filter((t) => /pulpitis|пульпит|periodontitis|периодонтит/i.test(t.state || t.diagnosis || "")).map((t) => t.toothNumber ?? t.number ?? 25);

	// Если конкретных патологий в переданном массиве нет — возвращаем канонический эталон 3 тарифов
	if (cariesTeeth.length === 0 && missingTeeth.length === 0 && pulpitisTeeth.length === 0) {
		return DEFAULT_PRESENTER_TIERS;
	}

	const cTooth = cariesTeeth[0] ?? 16;
	const mTooth = missingTeeth[0] ?? 46;
	const pTooth = pulpitisTeeth[0] ?? 25;

	// Динамическая сборка тарифа «Базовый (Эконом)»
	const econStages: TreatmentPlanStage[] = [
		mkStage(
			"st-econ-1",
			1,
			"stage_1_therapy",
			"Этап 1: Неотложная помощь и терапия",
			"Санация очагов инфекции и кариеса",
			`Санация кариеса зуба ${cTooth} и эндодонтия зуба ${pTooth}`,
			17500,
			1750000,
			[
				mkItem("dyn-ec-1", cTooth, "A16.07.002", `Восстановление зуба ${cTooth} пломбой световой полимеризации (базовый композит)`, 3500, 3500, 1, "stage_1_therapy", "Терапия"),
				mkItem("dyn-ec-2", pTooth, "A16.07.008.002", `Эндодонтическое лечение пульпита зуба ${pTooth}`, 9500, 9500, 1, "stage_1_therapy", "Терапия"),
				mkItem("dyn-ec-3", pTooth, "A16.07.003.001", `Восстановление культи зуба ${pTooth} под коронку (культевая вкладка)`, 4500, 4500, 1, "stage_1_therapy", "Терапия"),
			],
		),
		mkStage(
			"st-econ-2",
			2,
			"stage_2_surgery",
			"Этап 2: Хирургия и имплантация",
			"Восстановление жевательной опоры",
			`Установка дентального имплантата Osstem на место зуба ${mTooth}`,
			32000,
			3200000,
			[
				mkItem("dyn-ec-4", mTooth, "A16.07.054.001", `Внутрикостная дентальная имплантация системы Osstem TS-III SA в области зуба ${mTooth}`, 32000, 32000, 1, "stage_2_surgery", "Хирургия"),
			],
		),
		mkStage(
			"st-econ-3",
			3,
			"stage_3_orthopedics",
			"Этап 3: Ортопедия и протезирование",
			"Функциональное восстановление жевания",
			`Протезирование зуба ${pTooth} и имплантата ${mTooth} металлокерамикой`,
			36000,
			3600000,
			[
				mkItem("dyn-ec-5", pTooth, "A16.07.004", `Восстановление зуба ${pTooth} металлокерамической коронкой Co-Cr`, 14000, 14000, 1, "stage_3_orthopedics", "Ортопедия"),
				mkItem("dyn-ec-6", mTooth, "A16.07.006", `Протезирование на имплантате ${mTooth} металлокерамической коронкой`, 22000, 22000, 1, "stage_3_orthopedics", "Ортопедия"),
			],
		),
	];

	// Динамическая сборка тарифа «Оптимальный»
	const stdStages: TreatmentPlanStage[] = [
		mkStage(
			"st-std-1",
			1,
			"stage_1_therapy",
			"Этап 1: Неотложная помощь и терапия",
			"Санация под увеличением и биосовместимая изоляция",
			`Санация кариеса зуба ${cTooth} нанокомпозитом и эндодонтия зуба ${pTooth} под микроскопом`,
			23800,
			2380000,
			[
				mkItem("dyn-std-1", cTooth, "A16.07.002.001", `Восстановление зуба ${cTooth} нанокомпозитом Filtek Ultimate / Estelite`, 4800, 4800, 1, "stage_1_therapy", "Терапия"),
				mkItem("dyn-std-2", pTooth, "A16.07.008.002", `Эндодонтическое лечение пульпита зуба ${pTooth} под операционным микроскопом`, 13500, 13500, 1, "stage_1_therapy", "Терапия"),
				mkItem("dyn-std-3", pTooth, "A16.07.003.001", `Восстановление зуба ${pTooth} со стекловолоконным штифтом RelyX Fiber Post`, 5500, 5500, 1, "stage_1_therapy", "Терапия"),
			],
		),
		mkStage(
			"st-std-2",
			2,
			"stage_2_surgery",
			"Этап 2: Хирургия и имплантация",
			"Двухэтапная дентальная имплантация",
			`Установка дентального имплантата SLA Osstem TS-III в области ${mTooth}`,
			42000,
			4200000,
			[
				mkItem("dyn-std-4", mTooth, "A16.07.054.001", `Внутрикостная дентальная имплантация SLA Osstem TS-III + формирователь десны (${mTooth})`, 42000, 42000, 1, "stage_2_surgery", "Хирургия"),
			],
		),
		mkStage(
			"st-std-3",
			3,
			"stage_3_orthopedics",
			"Этап 3: Ортопедия и протезирование",
			"Анатомические коронки из диоксида циркония",
			`Цифровое 3D-сканирование и коронки Katana Zirconia HTML на зубы ${pTooth} и ${mTooth}`,
			66500,
			6650000,
			[
				mkItem("dyn-std-5", undefined, "A02.07.010", "Оптическое внутриротовое 3D-сканирование зубного ряда и регистрация окклюзии", 6500, 6500, 1, "stage_3_orthopedics", "Ортопедия"),
				mkItem("dyn-std-6", pTooth, "A16.07.004.001", `Восстановление зуба ${pTooth} коронкой из диоксида циркония Katana HTML`, 26000, 26000, 1, "stage_3_orthopedics", "Ортопедия"),
				mkItem("dyn-std-7", mTooth, "A16.07.006", `Протезирование на имплантате ${mTooth} (диоксид циркония с винтовой фиксацией)`, 34000, 34000, 1, "stage_3_orthopedics", "Ортопедия"),
			],
		),
	];

	// Динамическая сборка тарифа «Премиум»
	const premStages: TreatmentPlanStage[] = [
		mkStage(
			"st-prem-1",
			1,
			"stage_1_therapy",
			"Этап 1: Неотложная помощь и терапия",
			"Премиальная санация и микроскопная эндодонтия",
			`Керамическая накладка зуба ${cTooth} и микроэндодонтия зуба ${pTooth} с биокерамикой`,
			32500,
			3250000,
			[
				mkItem("dyn-pr-1", cTooth, "A16.07.003", `Восстановление зуба ${cTooth} прессованной керамической накладкой Inlay IPS e.max`, 8500, 8500, 1, "stage_1_therapy", "Терапия"),
				mkItem("dyn-pr-2", pTooth, "A16.07.008.002", `Прецизионная микроскопная эндодонтия зуба ${pTooth} WaveOne Gold с биокерамикой`, 16500, 16500, 1, "stage_1_therapy", "Терапия"),
				mkItem("dyn-pr-3", pTooth, "A16.07.003.001", `Билдап зуба ${pTooth} композитом LuxaCore Z с кварцевым штифтом`, 7500, 7500, 1, "stage_1_therapy", "Терапия"),
			],
		),
		mkStage(
			"st-prem-2",
			2,
			"stage_2_surgery",
			"Этап 2: Хирургия и имплантация",
			"Навигационная имплантация премиум-класса",
			`Имплантат Straumann Roxolid SLActive в области ${mTooth} по 3D-шаблону`,
			80000,
			8000000,
			[
				mkItem("dyn-pr-4", mTooth, "A16.07.054.001", `Дентальная имплантация Straumann Roxolid SLActive в области зуба ${mTooth}`, 68000, 68000, 1, "stage_2_surgery", "Хирургия"),
				mkItem("dyn-pr-5", mTooth, "A16.07.054", `Изготовление хирургического навигационного 3D-шаблона для зуба ${mTooth}`, 12000, 12000, 1, "stage_2_surgery", "Хирургия"),
			],
		),
		mkStage(
			"st-prem-3",
			3,
			"stage_3_orthopedics",
			"Этап 3: Ортопедия и протезирование",
			"Безметалловая керамика и индивидуальные абатменты",
			`Коронка IPS e.max Press на зуб ${pTooth} и индивидуальный абатмент Ti-Base на ${mTooth}`,
			92500,
			9250000,
			[
				mkItem("dyn-pr-6", undefined, "A02.07.010", "Оптическое внутриротовое 3D-сканирование 3Shape TRIOS", 6500, 6500, 1, "stage_3_orthopedics", "Ортопедия"),
				mkItem("dyn-pr-7", pTooth, "A16.07.004.002", `Восстановление зуба ${pTooth} керамической коронкой IPS e.max Press`, 38000, 38000, 1, "stage_3_orthopedics", "Ортопедия"),
				mkItem("dyn-pr-8", mTooth, "A16.07.006", `Протезирование на имплантате ${mTooth} (индивидуальный абатмент Ti-Base + коронка IPS e.max)`, 48000, 48000, 1, "stage_3_orthopedics", "Ортопедия"),
			],
		),
	];

	return [
		{
			tierId: "economy",
			title: "Базовый (Эконом)",
			subtitle: "Стандартная санация, металлокерамика Co-Cr, имплантат Osstem",
			badge: "Базовый",
			isRecommended: false,
			totalRub: 85500,
			totalKopecks: 8550000,
			warrantyYears: 1,
			keyAdvantages: [
				"Базовая терапевтическая санация полости рта",
				"Проверенный микрогибридный композит Gradia / Charisma",
				"Надежный корейский имплантат Osstem TS-III",
				"Металлокерамические коронки Co-Cr",
				"Гарантия клиники 1 год",
			],
			stages: econStages,
		},
		{
			tierId: "standard",
			title: "Оптимальный",
			subtitle: "Клинический золотой стандарт: нанокомпозит, микроскоп, цирконий Katana, SLA-имплантат",
			badge: "Оптимальный",
			isRecommended: true,
			totalRub: 132300,
			totalKopecks: 13230000,
			warrantyYears: 3,
			keyAdvantages: [
				"Лечение каналов под операционным дентальным микроскопом",
				"Высокопрочный нанокомпозит Filtek Ultimate / Estelite",
				"Дентальная имплантация с гидрофильной SLA-поверхностью",
				"Коронки из многослойного диоксида циркония Katana HTML",
				"Гарантия клиники 3 года",
			],
			stages: stdStages,
		},
		{
			tierId: "optimum",
			title: "Премиум",
			subtitle: "Тотальная эстетика: безметалловая керамика IPS e.max, имплантация Straumann Roxolid",
			badge: "Премиум",
			isRecommended: false,
			totalRub: 205000,
			totalKopecks: 20500000,
			warrantyYears: 10,
			keyAdvantages: [
				"Швейцарская имплантация Straumann Roxolid SLActive",
				"Навигационный хирургический 3D-шаблон CAD/CAM",
				"Прессованная полевошпатная керамика IPS e.max Press",
				"Индивидуальный фрезерованный абатмент Ti-Base",
				"Пожизненная гарантия на остеоинтеграцию имплантата",
			],
			stages: premStages,
		},
	];
}