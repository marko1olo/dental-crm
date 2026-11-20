/**
 * stageTierContracts.ts — Типы и схемы тарифов и этапов планов лечения DENTE.
 */

import { z } from "zod";

export const planTierKeySchema = z.enum(["economy", "optimum", "premium"]);
export type PlanTierKey = z.infer<typeof planTierKeySchema>;

export const planStageKindSchema = z.enum(["stage_1_therapy", "stage_2_surgery", "stage_3_orthopedics"]);
export type PlanStageKind = z.infer<typeof planStageKindSchema>;

export const planItemStatusSchema = z.enum(["planned", "in_progress", "completed", "declined", "postponed"]);
export type PlanItemStatus = z.infer<typeof planItemStatusSchema>;

export interface PlanStageMetadata {
	readonly stageNumber: 1 | 2 | 3;
	readonly stageKind: PlanStageKind;
	readonly code: string;
	readonly titleRu: string;
	readonly shortTitleRu: string;
	readonly subtitleRu: string;
	readonly clinicalGoalRu: string;
	readonly iconName: string;
	readonly defaultOrder804nPrefixes: readonly string[];
}

export const PLAN_STAGE_METADATA: Record<PlanStageKind, PlanStageMetadata> = {
	stage_1_therapy: {
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		code: "STAGE_1",
		titleRu: "Этап 1: Неотложная помощь и терапевтическая санация",
		shortTitleRu: "Терапевтическая санация",
		subtitleRu: "Устранение очагов инфекции, лечение кариеса, корневых каналов и профгигиена",
		clinicalGoalRu: "Ликвидация болевого синдрома, купирование воспаления, герметизация полостей и подготовка к хирургии.",
		iconName: "Stethoscope",
		defaultOrder804nPrefixes: ["A16.07.002", "A16.07.008", "A16.07.030", "A16.07.050", "A16.07.051", "A11.07", "A06.07", "B01.065"],
	},
	stage_2_surgery: {
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		code: "STAGE_2",
		titleRu: "Этап 2: Хирургический этап и дентальная имплантация",
		shortTitleRu: "Хирургия и имплантация",
		subtitleRu: "Атравматичное удаление, направленная костная регенерация, синус-лифтинг и установка имплантатов",
		clinicalGoalRu: "Создание стабильного костного фундамента и интеграция титановых/циркониевых опор для протезирования.",
		iconName: "Scissors",
		defaultOrder804nPrefixes: ["A16.07.001", "A16.07.041", "A16.07.054", "A16.07.093", "A16.07.026"],
	},
	stage_3_orthopedics: {
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		code: "STAGE_3",
		titleRu: "Этап 3: Ортопедический этап и функциональная реабилитация",
		shortTitleRu: "Ортопедия и протезирование",
		subtitleRu: "Временное и постоянное протезирование, высокоэстетичные коронки E.max, диоксид циркония, мосты и виниры",
		clinicalGoalRu: "Полное восстановление окклюзии, жевательной эффективности, анатомической эстетики и артикуляции.",
		iconName: "Smile",
		defaultOrder804nPrefixes: ["A16.07.004", "A16.07.006", "A16.07.003", "A16.07.005", "A16.07.036", "A16.07.023"],
	},
};

export interface PlanTierConfig {
	readonly tierKey: PlanTierKey;
	readonly tierNameRu: string;
	readonly badgeRu: string;
	readonly descriptionRu: string;
	readonly warrantyYears: number | string;
	readonly isRecommended: boolean;
	readonly defaultLaborRatio: number;
	readonly keyAdvantagesRu: readonly string[];
	readonly defaultMaterialsHeadlineRu: string;
}

/**
 * getTierMaterialsHeadlineRu — Динамический расчет клинических материалов тарифа
 * по категории этапа/процедуры (Мандат 8x & 8ap: исключает навязывание коронок на чистку или кариес).
 */
export function getTierMaterialsHeadlineRu(
	tierKey: PlanTierKey,
	categoryOrStageKind?: string | PlanStageKind | null,
): string {
	const cat = (categoryOrStageKind || "").toLowerCase();

	// 1. Терапия / кариес / эндодонтия / профгигиена
	if (cat.includes("therapy") || cat.includes("терап") || cat.includes("кариес") || cat.includes("гигиен") || cat.includes("stage_1")) {
		if (tierKey === "economy") {
			return "Сертифицированный светоотверждаемый микрогибридный композит, базовая полировка";
		}
		if (tierKey === "premium") {
			return "Художественная реставрация под микроскопом, нанокомпозиты премиум-класса, многослойная эстетика";
		}
		return "Высокоэстетичный нанокомпозит субмикронного наполнения, анатомическая послойная стратификация";
	}

	// 2. Хирургия / имплантация / синус-лифтинг / удаление
	if (cat.includes("surgery") || cat.includes("хирург") || cat.includes("имплант") || cat.includes("stage_2")) {
		if (tierKey === "economy") {
			return "Базовая дентальная имплантационная система с классической остеоинтеграцией";
		}
		if (tierKey === "premium") {
			return "Премиальные имплантаты с гидрофильной SLA-поверхностью, навигационный 3D-шаблон и биоматериалы";
		}
		return "Имплантационная система премиум-класса с активной поверхностью ускоренной остеоинтеграции";
	}

	// 3. Ортопедия / протезирование / коронки / виниры
	if (cat.includes("orthopedics") || cat.includes("ортопед") || cat.includes("коронк") || cat.includes("протез") || cat.includes("stage_3")) {
		if (tierKey === "economy") {
			return "Классические металлокерамические коронки Co-Cr, стандартное зуботехническое литьё";
		}
		if (tierKey === "premium") {
			return "Ультратонкие цельнокерамические виниры, многослойный диоксид циркония с индивидуальной раскраской";
		}
		return "Цельная пресс-керамика IPS e.max и коронки из многослойного диоксида циркония CAD/CAM";
	}

	// 4. Общий / комплексный дефолт
	return PLAN_TIER_CONFIGS[tierKey].defaultMaterialsHeadlineRu;
}

/**
 * getTierAdvantagesRu — Динамический расчет клинических преимуществ тарифа
 * по категории этапа/процедуры.
 */
export function getTierAdvantagesRu(
	tierKey: PlanTierKey,
	categoryOrStageKind?: string | PlanStageKind | null,
): readonly string[] {
	const cat = (categoryOrStageKind || "").toLowerCase();

	if (cat.includes("therapy") || cat.includes("терап") || cat.includes("кариес") || cat.includes("гигиен") || cat.includes("stage_1")) {
		if (tierKey === "economy") {
			return [
				"Доступная стоимость терапевтического лечения",
				"Сертифицированные микрогибридные композитные пломбы",
				"Стандартный протокол адгезивной фиксации",
				"Гарантия 1 год при соблюдении рекомендаций врача",
			];
		}
		if (tierKey === "premium") {
			return [
				"Безупречная художественная реставрация зубов под операционным микроскопом",
				"Премиальные нанокомпозиты с эффектом хамелеона и естественной опалесценцией",
				"Индивидуальная анатомическая моделировка фиссур и бугров",
				"Расширенная гарантия 5 лет и сопровождение куратора",
			];
		}
		return [
			"Оптимальный баланс прочности пломбы и эстетики реставрации",
			"Наногибридные композиты повышенной стойкости к истиранию",
			"Биосовместимые материалы светового отверждения",
			"Гарантия 3 года на терапевтическое лечение",
		];
	}

	if (cat.includes("surgery") || cat.includes("хирург") || cat.includes("имплант") || cat.includes("stage_2")) {
		if (tierKey === "economy") {
			return [
				"Надежная дентальная имплантация базового уровня",
				"Классический двухэтапный хирургический протокол",
				"Сертифицированные титановые опоры",
				"Гарантия 1 год",
			];
		}
		if (tierKey === "premium") {
			return [
				"Премиальные имплантаты с гидрофильной SLA-поверхностью",
				"Установка с навигационным хирургическим 3D-шаблоном",
				"Минимальная травматичность и ускоренное приживление",
				"Пожизненная гарантия на титановые имплантаты",
			];
		}
		return [
			"Имплантаты проверенной международной системы",
			"Ускоренная остеоинтеграция и стабильный результат",
			"Атравматичный протокол установки",
			"Расширенная гарантия 3 года",
		];
	}

	return PLAN_TIER_CONFIGS[tierKey].keyAdvantagesRu;
}

export const PLAN_TIER_CONFIGS: Record<PlanTierKey, PlanTierConfig> = {
	economy: {
		tierKey: "economy",
		tierNameRu: "Вариант А: Эконом (Базовый)",
		badgeRu: "Эконом",
		descriptionRu: "Надежное клиническое решение по доступной стоимости с использованием базовых сертифицированных материалов.",
		warrantyYears: 1,
		isRecommended: false,
		defaultLaborRatio: 0.65,
		keyAdvantagesRu: [
			"Минимальная стоимость санации полости рта",
			"Сертифицированные базовые материалы и микрогибридные композиты",
			"Классические металлокерамические конструкции при протезировании",
			"Гарантия 1 год при соблюдении гигиенического регламента",
		],
		defaultMaterialsHeadlineRu: "Сертифицированные базовые материалы, микрогибридные композиты, металлокерамика Co-Cr",
	},
	optimum: {
		tierKey: "optimum",
		tierNameRu: "Вариант Б: Оптимум (Рекомендуемый)",
		badgeRu: "Оптимум (Выбор врачей)",
		descriptionRu: "Идеальный баланс долговечности, эстетики и биосовместимости по передовым международным протоколам.",
		warrantyYears: 3,
		isRecommended: true,
		defaultLaborRatio: 0.60,
		keyAdvantagesRu: [
			"Оптимальное соотношение непревзойденной надежности и высокой эстетики",
			"Наногибридные реставрации светового отверждения с субмикронным наполнителем",
			"Безметалловые коронки из цельной пресс-керамики и диоксида циркония",
			"Имплантаты проверенной системы с ускоренной остеоинтеграцией",
			"Расширенная гарантия 3 года и сопровождение персонального куратора",
		],
		defaultMaterialsHeadlineRu: "Нанокомпозиты субмикронного наполнения, цельная пресс-керамика IPS e.max, транслюцентный диоксид циркония",
	},
	premium: {
		tierKey: "premium",
		tierNameRu: "Вариант В: Премиум (VIP)",
		badgeRu: "Премиум / VIP",
		descriptionRu: "Бескомпромиссная эстетика, индивидуальные CAD/CAM решения, микроскопная эндодонтия и максимальная долговечность.",
		warrantyYears: "10 лет / Пожизненная на имплантаты",
		isRecommended: false,
		defaultLaborRatio: 0.55,
		keyAdvantagesRu: [
			"Безупречная эстетика и естественная прозрачность улыбки под ключ",
			"Художественная реставрация зубов под операционным дентальным микроскопом",
			"Ультратонкие цельнокерамические виниры и многослойный диоксид циркония Multi-Layer",
			"Имплантаты с активной гидрофильной поверхностью ускоренной интеграции",
			"Индивидуальные титановые и циркониевые абатменты CAD/CAM",
			"Пожизненная гарантия на титановые опоры и VIP-сервис клиники",
		],
		defaultMaterialsHeadlineRu: "Операционный дентальный микроскоп, ультратонкие виниры, многослойный диоксид циркония Katana Multi-Layer",
	},
};
