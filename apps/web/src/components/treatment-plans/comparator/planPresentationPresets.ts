/**
 * Treatment Plan Comparison Presets & 3-Tier Clinical Clinical Archetypes
 * (DOMAIN: PLAN COMPARATOR)
 *
 * Эталонные клинические сценарии комплексной реабилитации зубочелюстной системы:
 * Вариант A — Премиум / Оптимальный (Straumann/Nobel + E.max + Zirconia Multi-layer)
 * Вариант B — Стандартный / Рекомендуемый (Osstem/Dentium + Zirconia + Estelite)
 * Вариант C — Базовый / Эконом (Бюгельное протезирование + Металлокерамика CoCr)
 */

export type PlanTierCode = "optimum_vip" | "standard_recommended" | "economy_basic";

export type ClinicalCategoryCode =
	| "surgery_implant"
	| "orthopedics_prosthetics"
	| "therapy_endo"
	| "hygiene_perio";

export interface PlanProcedureItem {
	readonly id: string;
	readonly code804n: string;
	readonly name: string;
	readonly category: ClinicalCategoryCode;
	readonly toothFdi?: string | undefined;
	readonly quantity: number;
	readonly unitPriceRub: number;
	readonly totalCostRub: number;
	readonly clinicalRationale: string;
}

export interface PlanStageRoadmap {
	readonly stageIndex: number;
	readonly title: string;
	readonly subtitle: string;
	readonly durationWeeks: number;
	readonly visitsCount: number;
	readonly costRub: number;
	readonly keyProcedures: readonly string[];
}

export interface ComprehensivePlanVariant {
	readonly tierCode: PlanTierCode;
	readonly title: string;
	readonly badgeText: string;
	readonly badgeType: "primary" | "success" | "neutral";
	readonly isRecommended: boolean;
	readonly headlineDescription: string;
	readonly implantSystem: string;
	readonly crownMaterial: string;
	readonly aestheticMaterial: string;
	readonly warrantyYears: number;
	readonly estimatedServiceLifeYears: number;
	readonly aestheticScore: number; // 1 - 10
	readonly biologicalInvasivenessScore: number; // 1 - 5 (1 - min invasive, 5 - high invasive)
	readonly totalCostRub: number;
	readonly totalVisitsCount: number;
	readonly totalDurationWeeks: number;
	readonly isCode02HighCostSurgery: boolean;
	readonly stages: readonly PlanStageRoadmap[];
	readonly procedures: readonly PlanProcedureItem[];
	readonly keyAdvantages: readonly string[];
	readonly clinicalLimitations: readonly string[];
}

/**
 * Эталонные клинические пакеты планов лечения для презентационной студии.
 */
export const DEFAULT_TREATMENT_PLAN_PRESETS: Readonly<
	Record<PlanTierCode, ComprehensivePlanVariant>
> = {
	optimum_vip: {
		tierCode: "optimum_vip",
		title: "Оптимальный / Премиум (VIP)",
		badgeText: "Максимальная эстетика и долговечность",
		badgeType: "primary",
		isRecommended: false,
		headlineDescription:
			"Бескомпромиссная тотальная реабилитация на премиальных швейцарских имплантатах Straumann BLX с пожизненной гарантией, " +
			"цельноциркониевыми мостами Prettau Multi-layer и керамическими винирами E.max на фронтальную группу.",
		implantSystem: "Straumann BLX / Nobel Biocare Active (Швейцария/Швеция)",
		crownMaterial: "Цельный диоксид циркония Katana ML / Prettau Multi-unit",
		aestheticMaterial: "Ультратонкие полевошпатные виниры / IPS e.max CAD",
		warrantyYears: 10,
		estimatedServiceLifeYears: 25,
		aestheticScore: 10,
		biologicalInvasivenessScore: 3,
		totalCostRub: 580000,
		totalVisitsCount: 8,
		totalDurationWeeks: 16,
		isCode02HighCostSurgery: true,
		keyAdvantages: [
			"Пожизненная международная гарантия производителя на имплантаты Straumann",
			"Безупречная естественная флюоресценция и микротекстура виниров E.max",
			"Винтовая фиксация коронок на Multi-unit (без цемента под десной — 0% мукозита)",
			"Направленная костная регенерация (НКР) с мембраной Bio-Gide и костью Bio-Oss",
			"Фрезерованные провизорные коронки PMMA на весь период приживления",
		],
		clinicalLimitations: [
			"Высокая начальная стоимость инвестиций в здоровье улыбки",
			"Необходимость строгого 3-4 месячного графика профосмотров",
		],
		stages: [
			{
				stageIndex: 1,
				title: "Этап 1: Подготовка & 3D-Навигация",
				subtitle: "Комплексная санация, гигиена и хирургический шаблон",
				durationWeeks: 2,
				visitsCount: 2,
				costRub: 45000,
				keyProcedures: [
					"Комплексная гигиена Air-Flow Perio + Vector",
					"3D-моделирование и печать хирургического шаблона",
					"Фотопротокол и цифровой дизайн улыбки DSD",
				],
			},
			{
				stageIndex: 2,
				title: "Этап 2: Хирургия & Имплантация",
				subtitle: "Навигационная установка имплантов Straumann + НКР",
				durationWeeks: 10,
				visitsCount: 2,
				costRub: 295000,
				keyProcedures: [
					"Установка 3 имплантатов Straumann BLX Roxolid SLActive",
					"Синус-лифтинг / костная пластика Geistlich Bio-Oss",
					"Установка формирователей десны и временных коронок PMMA",
				],
			},
			{
				stageIndex: 3,
				title: "Этап 3: Финальное протезирование",
				subtitle: "Циркониевые коронки Multi-unit + виниры E.max",
				durationWeeks: 4,
				visitsCount: 4,
				costRub: 240000,
				keyProcedures: [
					"Снятие цифровых оптических оттисков 3Shape",
					"Примерка и фиксация 4 керамических виниров E.max",
					"Винтовая фиксация 3 цельноциркониевых коронок Multi-unit",
					"Окклюзионный анализ T-Scan и защитная сплинт-каппа",
				],
			},
		],
		procedures: [
			{
				id: "opt-1",
				code804n: "A16.07.051",
				name: "Профессиональная гигиена полости рта комплексная",
				category: "hygiene_perio",
				quantity: 1,
				unitPriceRub: 12000,
				totalCostRub: 12000,
				clinicalRationale: "Устранение поддесневого биопленочного налета перед хирургией",
			},
			{
				id: "opt-2",
				code804n: "A16.07.054",
				name: "Установка дентального имплантата Straumann Roxolid",
				category: "surgery_implant",
				toothFdi: "1.6, 2.6, 4.6",
				quantity: 3,
				unitPriceRub: 65000,
				totalCostRub: 195000,
				clinicalRationale: "Остеоинтеграция в условиях дефицита костной ткани",
			},
			{
				id: "opt-3",
				code804n: "A16.07.041.001",
				name: "Костная пластика челюсти с биоматериалом Bio-Oss",
				category: "surgery_implant",
				quantity: 1,
				unitPriceRub: 88000,
				totalCostRub: 88000,
				clinicalRationale: "Восстановление объема альвеолярного отростка",
			},
			{
				id: "opt-4",
				code804n: "A16.07.004",
				name: "Коронка из диоксида циркония на Multi-unit абатменте",
				category: "orthopedics_prosthetics",
				toothFdi: "1.6, 2.6, 4.6",
				quantity: 3,
				unitPriceRub: 48000,
				totalCostRub: 144000,
				clinicalRationale: "Винтовая фиксация без цементных зазоров",
			},
			{
				id: "opt-5",
				code804n: "A16.07.003.002",
				name: "Керамический винир IPS e.max Press/CAD",
				category: "orthopedics_prosthetics",
				toothFdi: "1.2, 1.1, 2.1, 2.2",
				quantity: 4,
				unitPriceRub: 35250,
				totalCostRub: 141000,
				clinicalRationale: "Восстановление эстетики и правильного угла резцового ведения",
			},
		],
	},

	standard_recommended: {
		tierCode: "standard_recommended",
		title: "Стандартный / Рекомендуемый",
		badgeText: "Оптимальный баланс цены и качества",
		badgeType: "success",
		isRecommended: true,
		headlineDescription:
			"Самый популярный и клинически сбалансированный план. Надежные имплантаты Osstem TS III (Южная Корея), " +
			"циркониевые коронки на индивидуальных титановых абатментах и высокоэстетичные пломбы Estelite.",
		implantSystem: "Osstem TS III / Dentium SuperLine (Южная Корея)",
		crownMaterial: "Диоксид циркония ZrO2 на индивидуальном титановом абатменте",
		aestheticMaterial: "Светоотверждаемый нанокомпозит Estelite Asteria / Tokuyama",
		warrantyYears: 3,
		estimatedServiceLifeYears: 15,
		aestheticScore: 8.5,
		biologicalInvasivenessScore: 2,
		totalCostRub: 340000,
		totalVisitsCount: 6,
		totalDurationWeeks: 14,
		isCode02HighCostSurgery: true,
		keyAdvantages: [
			"Идеальное соотношение проверенной надежности и разумной стоимости",
			"Приживаемость имплантатов Osstem свыше 98.8%",
			"Индивидуальные титановые абатменты с анатомическим формированием десневого края",
			"Прочные циркониевые коронки без сколов керамики",
			"Возможность беспроцентной рассрочки клиники",
		],
		clinicalLimitations: [
			"Меньший гарантийный срок по сравнению со Straumann (3 года против 10 лет)",
			"Композитные реставрации требуют полировки раз в 6 месяцев",
		],
		stages: [
			{
				stageIndex: 1,
				title: "Этап 1: Терапия & Гигиена",
				subtitle: "Санация кариозных полостей и профчистка",
				durationWeeks: 2,
				visitsCount: 2,
				costRub: 38000,
				keyProcedures: [
					"Профгигиена Air-Flow + ультразвук",
					"Лечение 2 кариесов композитом Estelite",
				],
			},
			{
				stageIndex: 2,
				title: "Этап 2: Дентальная имплантация",
				subtitle: "Установка имплантатов Osstem TS III",
				durationWeeks: 8,
				visitsCount: 2,
				costRub: 165000,
				keyProcedures: [
					"Установка 3 имплантатов Osstem TS III SA",
					"Установка формирователей десны",
				],
			},
			{
				stageIndex: 3,
				title: "Этап 3: Протезирование на цирконии",
				subtitle: "Коронки из диоксида циркония",
				durationWeeks: 4,
				visitsCount: 2,
				costRub: 137000,
				keyProcedures: [
					"Снятие слепков / интраоральное сканирование",
					"Изготовление индивидуальных титановых абатментов",
					"Фиксация 3 циркониевых коронок",
				],
			},
		],
		procedures: [
			{
				id: "std-1",
				code804n: "A16.07.051",
				name: "Профессиональная гигиена полости рта",
				category: "hygiene_perio",
				quantity: 1,
				unitPriceRub: 8000,
				totalCostRub: 8000,
				clinicalRationale: "Подготовка полости рта к имплантации",
			},
			{
				id: "std-2",
				code804n: "A16.07.002",
				name: "Лечение кариеса с реставрацией Estelite",
				category: "therapy_endo",
				toothFdi: "1.4, 2.5",
				quantity: 2,
				unitPriceRub: 15000,
				totalCostRub: 30000,
				clinicalRationale: "Санация опорных зубов",
			},
			{
				id: "std-3",
				code804n: "A16.07.054",
				name: "Установка имплантата Osstem TS III",
				category: "surgery_implant",
				toothFdi: "1.6, 2.6, 4.6",
				quantity: 3,
				unitPriceRub: 55000,
				totalCostRub: 165000,
				clinicalRationale: "Восстановление утраченных жевательных зубов",
			},
			{
				id: "std-4",
				code804n: "A16.07.004",
				name: "Коронка из диоксида циркония с абатментом",
				category: "orthopedics_prosthetics",
				toothFdi: "1.6, 2.6, 4.6",
				quantity: 3,
				unitPriceRub: 45666.67,
				totalCostRub: 137000,
				clinicalRationale: "Анатомическое восстановление жевательной функции",
			},
		],
	},

	economy_basic: {
		tierCode: "economy_basic",
		title: "Базовый / Эконом",
		badgeText: "Доступное решение / Альтернатива",
		badgeType: "neutral",
		isRecommended: false,
		headlineDescription:
			"Минимально достаточный план для восстановления жевательной функции без масштабной хирургии. " +
			"Бюгельное или съемное протезирование с кламмерной фиксацией и металлокерамические коронки CoCr.",
		implantSystem: "Без имплантации (съемное/бюгельное протезирование)",
		crownMaterial: "Металлокерамика CoCr фрезерованная / литая",
		aestheticMaterial: "Светоотверждаемый композит эконом-класса",
		warrantyYears: 1,
		estimatedServiceLifeYears: 5,
		aestheticScore: 6.0,
		biologicalInvasivenessScore: 4, // Препарирование здоровых зубов под металлокерамику
		totalCostRub: 145000,
		totalVisitsCount: 5,
		totalDurationWeeks: 4,
		isCode02HighCostSurgery: false,
		keyAdvantages: [
			"Минимальная стоимость и быстрота изготовления (всего 3–4 недели)",
			"Отсутствие хирургического вмешательства и костной пластики",
			"Возможность легкой починки и добавления зубов в съемный протез",
		],
		clinicalLimitations: [
			"Необходимость депульпирования или глубокого обтачивания опорных зубов",
			"Видимость металлических кламмеров при широкой улыбке",
			"Постепенная атрофия кости под базисом съемного протеза",
			"Срок службы 3–5 лет с необходимостью перебазировки",
		],
		stages: [
			{
				stageIndex: 1,
				title: "Этап 1: Терапия и препарирование",
				subtitle: "Подготовка опорных зубов под коронки",
				durationWeeks: 2,
				visitsCount: 3,
				costRub: 55000,
				keyProcedures: [
					"Профгигиена ультразвуком",
					"Подготовка опорных зубов под металлокерамику",
					"Снятие анатомических слепков",
				],
			},
			{
				stageIndex: 2,
				title: "Этап 2: Ортопедическая сдача",
				subtitle: "Фиксация металлокерамики и бюгельного протеза",
				durationWeeks: 2,
				visitsCount: 2,
				costRub: 90000,
				keyProcedures: [
					"Примерка и цементировка металлокерамических коронок",
					"Наложение и коррекция бюгельного протеза",
				],
			},
		],
		procedures: [
			{
				id: "eco-1",
				code804n: "A16.07.051",
				name: "Ультразвуковое удаление зубных отложений",
				category: "hygiene_perio",
				quantity: 1,
				unitPriceRub: 5000,
				totalCostRub: 5000,
				clinicalRationale: "Базовая санация перед протезированием",
			},
			{
				id: "eco-2",
				code804n: "A16.07.004.001",
				name: "Коронка металлокерамическая CoCr",
				category: "orthopedics_prosthetics",
				toothFdi: "1.5, 2.5",
				quantity: 2,
				unitPriceRub: 25000,
				totalCostRub: 50000,
				clinicalRationale: "Опора для кламмеров бюгельного протеза",
			},
			{
				id: "eco-3",
				code804n: "A16.07.036",
				name: "Протез съемный бюгельный с кламмерами",
				category: "orthopedics_prosthetics",
				quantity: 1,
				unitPriceRub: 90000,
				totalCostRub: 90000,
				clinicalRationale: "Восстановление жевательной эффективности",
			},
		],
	},
};
