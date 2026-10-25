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
			"Сертифицированные микрогибридные композиты",
			"Классические металлокерамические конструкции",
			"Гарантия 1 год при соблюдении гигиенического регламента",
		],
		defaultMaterialsHeadlineRu: "Микрогибридный композит, металлокерамика Co-Cr, имплантаты стандартного ряда",
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
			"Наногибридные реставрации светового отверждения (Filtek / Estelite)",
			"Безметалловые коронки IPS e.max CAD и диоксид циркония с индивидуальной раскраской",
			"Имплантаты премиум-класса с ускоренной остеоинтеграцией",
			"Расширенная гарантия 3 года и сопровождение персонального куратора",
		],
		defaultMaterialsHeadlineRu: "Нанокомпозиты 3M/Estelite, цельная керамика IPS e.max, диоксид циркония Katana, имплантаты Hiossen/Osstem/Nobel",
	},
	premium: {
		tierKey: "premium",
		tierNameRu: "Вариант В: Премиум (VIP)",
		badgeRu: "Премиум / VIP",
		descriptionRu: "Бескомпромиссная эстетика, индивидуальные CAD/CAM решения, микроскопная эндодонтия и пожизненная надежность.",
		warrantyYears: "10 лет / Пожизненная на имплантаты",
		isRecommended: false,
		defaultLaborRatio: 0.55,
		keyAdvantagesRu: [
			"Безупречная эстетика и естественная прозрачность улыбки под ключ",
			"Художественная реставрация зубов под операционным дентальным микроскопом",
			"Ультратонкие цельнокерамические виниры и многослойный диоксид циркония Multi-Layer",
			"Швейцарские гидрофильные имплантаты Straumann BLX / Nobel Biocare Active",
			"Индивидуальные титановые и циркониевые абатменты CAD/CAM",
			"Пожизненная гарантия на титановые опоры и VIP-сервис клиники",
		],
		defaultMaterialsHeadlineRu: "Микроскоп Carl Zeiss, Straumann SLActive, виниры E.max Press, мультилеер цирконий Katana HTML Plus",
	},
};
