/**
 * patientCareInstructionsEngine.ts
 *
 * Интеллектуальный генератор постоперационных памяток пациенту после приема,
 * генерация WhatsApp/SMS-рекомендаций, печать памятки А4, QR-коды для сохранения в телефон
 * и понятная детализация счетов (без сложной латыни и номенклатуры 804н).
 */

import { generateQrCodeSvg } from "./patientCabinetEngine.js";

// ============================================================================
// TYPES & CONTRACTS
// ============================================================================

export type CareCategory =
	| "cold"
	| "meds"
	| "food"
	| "immediate"
	| "medication"
	| "nutrition"
	| "hygiene"
	| "restrictions"
	| "warning";

export type CareInterventionType =
	| "caries"
	| "extraction"
	| "sinus_lift"
	| "implantation"
	| "endodontics"
	| "whitening"
	| "orthodontics"
	| "hygiene"
	| "custom";

export interface CareRecommendationItem {
	readonly id: string;
	readonly icon: string; // "snowflake", "pill", "ban", "tooth", "alert", "wind", "straw", "brush", etc.
	readonly title: string; // "Приложить холод на 15 минут"
	readonly description: string; // Подробное понятное пояснение
	readonly category: CareCategory;
	readonly isUrgent?: boolean;
	readonly badgeText?: string;
}

export interface PrescribedMedicationItem {
	readonly id: string;
	readonly name: string; // "Нимесил 100 мг"
	readonly formRu: string; // "Саше для суспензии"
	readonly dosageRu: string; // "1 саше (100 мг) растворить в 100 мл теплой воды"
	readonly frequencyRu: string; // "2 раза в день после еды"
	readonly durationRu: string; // "3–5 дней (при болях)"
	readonly purposeRu: string; // "Противовоспалительное и обезболивающее действие"
	readonly icon: string; // "pill", "cup", "droplet", "bottle"
	readonly isImportant?: boolean;
}

export interface PatientCareMemo {
	readonly id: string;
	readonly memoDateIso: string;
	readonly interventionType: CareInterventionType;
	readonly interventionTypeNameRu: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly toothFdi: string; // Например, "16" или "26, 27"
	readonly procedureName: string; // Например, "Лечение кариеса и эстетическая реставрация"
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly clinicName: string;
	readonly clinicPhone: string;
	readonly clinicEmergencyPhone: string;
	readonly recommendations: readonly CareRecommendationItem[];
	readonly medications: readonly PrescribedMedicationItem[];
	readonly prescribedMedsSummary?: string;
	readonly warningSigns: readonly string[];
	readonly dietaryRules: readonly string[];
	readonly hygieneRules: readonly string[];
	readonly activityRestrictions: readonly string[];
	readonly nextVisitRecommendedText: string;
	readonly qrCodeSvg: string;
	readonly whatsAppMessageText: string;
	readonly whatsAppText: string;
	readonly whatsAppDeepLink: string;
	readonly smsText: string;
	readonly smsDeepLink: string;
	readonly printHtml: string;
}

export interface CarePresetData {
	readonly interventionType: CareInterventionType;
	readonly typeNameRu: string;
	readonly defaultProcedureName: string;
	readonly recommendations: readonly CareRecommendationItem[];
	readonly medications: readonly PrescribedMedicationItem[];
	readonly warningSigns: readonly string[];
	readonly dietaryRules: readonly string[];
	readonly hygieneRules: readonly string[];
	readonly activityRestrictions: readonly string[];
	readonly nextVisitText: string;
}

export type FriendlyBillingCategory =
	| "caries"
	| "anesthesia"
	| "xray"
	| "hygiene"
	| "implant"
	| "crowns"
	| "surgery"
	| "ortho"
	| "other";

export interface FriendlyBillingItem {
	readonly id: string;
	readonly originalName: string;
	readonly friendlyName: string;
	readonly categoryGroup: FriendlyBillingCategory;
	readonly categoryGroupRu: string; // «Лечение кариеса», «Обезболивание», «Снимок»
	readonly groupIcon: string; // "Syringe", "Camera", "Activity", "Sparkles", "Shield", "Crown", "Ruler", "FileText"
	readonly plainDescriptionRu: string;
	readonly toothNumber?: string | number | null | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly totalRub: number;
	readonly isWarranty?: boolean | undefined;
}

export interface FriendlyBillingGroup {
	readonly categoryGroup: FriendlyBillingCategory;
	readonly categoryGroupRu: string;
	readonly groupIcon: string;
	readonly summaryRu: string;
	readonly items: readonly FriendlyBillingItem[];
	readonly subtotalRub: number;
	readonly percentageOfTotal: number;
}

export interface FriendlyBillingBreakdown {
	readonly totalAmountRub: number;
	readonly totalAmountRubFormatted: string;
	readonly groups: readonly FriendlyBillingGroup[];
	readonly patientFriendlySummaryRu: string;
}

export interface GenericInvoiceServiceItemInput {
	readonly id?: string | undefined;
	readonly name?: string | undefined;
	readonly titleRu?: string | undefined;
	readonly code?: string | undefined;
	readonly code804n?: string | null | undefined;
	readonly toothNumber?: number | string | null | undefined;
	readonly toothFdi?: string | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly totalRub?: number | undefined;
	readonly discountRub?: number | undefined;
	readonly category?: string | undefined;
}

// ============================================================================
// CLINICAL PROTOCOLS & PRESETS FOR ALL INTERVENTIONS
// ============================================================================

/**
 * 1. КАРИЕС И ЭСТЕТИЧЕСКАЯ РЕСТАВРАЦИЯ
 */
export const DEFAULT_CARIES_RECOMMENDATIONS: readonly CareRecommendationItem[] = [
	{
		id: "caries_numbness_food",
		icon: "ban",
		title: "Не есть до окончания анестезии (1.5–2 часа)",
		description: "Воздержитесь от приема пищи до восстановления чувствительности во избежание прикусывания щеки/губы.",
		category: "food",
		badgeText: "Первые 2 часа",
	},
	{
		id: "caries_cold_compress",
		icon: "snowflake",
		title: "Холод при дискомфорте",
		description: "При ноющей реакции приложите сухой холод к щеке на 10–15 минут.",
		category: "cold",
	},
	{
		id: "caries_painkiller",
		icon: "pill",
		title: "Обезболивающее: Нимесил или Нурофен",
		description: "При умеренной боли примите Нимесил 100 мг или Ибупрофен 400 мг после еды.",
		category: "meds",
	},
	{
		id: "caries_occlusion_check",
		icon: "scale",
		title: "Проверка прикуса при смыкании",
		description: "Если пломба завышает прикус, обратитесь в клинику для бесплатной пришлифовки.",
		category: "immediate",
		badgeText: "Важно",
	},
];

export const CARIES_CARE_PRESET: CarePresetData = {
	interventionType: "caries",
	typeNameRu: "Лечение кариеса и пломбирование",
	defaultProcedureName: "Лечение кариеса и эстетическая нанокомпозитная реставрация",
	recommendations: DEFAULT_CARIES_RECOMMENDATIONS,
	medications: [
		{
			id: "caries_med_nimesil",
			name: "Нимесил 100 мг",
			formRu: "Саше для суспензии",
			dosageRu: "1 саше в 100 мл воды",
			frequencyRu: "1–2 раза в день при боли",
			durationRu: "1–2 дня",
			purposeRu: "Снятие постпломбировочной чувствительности",
			icon: "pill",
		},
	],
	warningSigns: [
		"Ощущение завышения прикуса («пломба мешает смыкать зубы»)",
		"Острая самопроизвольная ночная или пульсирующая боль",
	],
	dietaryRules: [
		"Не принимать пищу до окончания действия анестезии (1.5–2 часа)",
	],
	hygieneRules: [
		"Бережная чистка мягкой щеткой без травмирования десны",
	],
	activityRestrictions: [
		"Ограничений по физической активности нет",
	],
	nextVisitText: "Контрольный профилактический осмотр через 6 месяцев",
};

export const EXTRACTION_CARE_PRESET: CarePresetData = {
	interventionType: "extraction",
	typeNameRu: "Хирургическое удаление зуба",
	defaultProcedureName: "Атравматичное удаление зуба с сохранением объема лунки",
	recommendations: [
		{
			id: "ext_gauze",
			icon: "droplet",
			title: "Удалить марлевый тампон через 20 минут",
			description: "Аккуратно сплюньте марлевый тампон через 20 минут. Не держите дольше.",
			category: "immediate",
			badgeText: "20 мин",
		},
		{
			id: "ext_no_rinse",
			icon: "ban",
			title: "КАТЕГОРИЧЕСКИ НЕ ПОЛОСКАТЬ РОТ 24 часа!",
			description: "Не полоскать рот и не вымывать кровяной сгусток из лунки!",
			category: "restrictions",
			isUrgent: true,
			badgeText: "Критично",
		},
		{
			id: "ext_cold_pack",
			icon: "snowflake",
			title: "Прикладывать холод в первые сутки",
			description: "Сухой лед через полотенце к щеке: 15 минут холод, 20 минут перерыв.",
			category: "cold",
		},
		{
			id: "ext_no_heat",
			icon: "flame",
			title: "Исключить тепловые процедуры и спорт",
			description: "Запрещены горячие ванны, сауны, бани и физнагрузки на 3 дня.",
			category: "restrictions",
		},
	],
	medications: [
		{
			id: "ext_med_nimesil",
			name: "Нимесил 100 мг",
			formRu: "Саше для суспензии",
			dosageRu: "1 саше после еды",
			frequencyRu: "2 раза в день",
			durationRu: "3–4 дня",
			purposeRu: "Обезболивание и снятие отека",
			icon: "pill",
			isImportant: true,
		},
	],
	warningSigns: [
		"Неостанавливающееся кровотечение из лунки более 2 часов",
		"Нарастающий отек щеки на 3–4 сутки, температура выше 38°C",
	],
	dietaryRules: [
		"Мягкая, негорячая пища на противоположной стороне 3 дня",
	],
	hygieneRules: [
		"Чистить зубы без затрагивания зоны удаленного зуба, ванночки хлоргексидина со 2-х суток",
	],
	activityRestrictions: [
		"Исключить спорт, бани, сауны и горячие ванны на 3–5 дней",
	],
	nextVisitText: "Осмотр лунки и снятие швов через 7–10 дней",
};

export const SINUS_LIFT_CARE_PRESET: CarePresetData = {
	interventionType: "sinus_lift",
	typeNameRu: "Синус-лифтинг и костная пластика",
	defaultProcedureName: "Открытый/закрытый синус-лифтинг с костной аугментацией",
	recommendations: [
		{
			id: "sl_no_blow",
			icon: "ban",
			title: "КАТЕГОРИЧЕСКИ НЕ СМОРКАТЬСЯ 14 дней!",
			description: "Не сморкаться, чихать исключительно с открытым ртом, не надувать щеки и не пить через трубочку.",
			category: "restrictions",
			isUrgent: true,
			badgeText: "14 дней",
		},
		{
			id: "sl_cold",
			icon: "snowflake",
			title: "Прикладывать холод к щеке",
			description: "Холод по 15 минут с перерывами 30 минут в течение первых суток.",
			category: "cold",
		},
		{
			id: "sl_nasal_drops",
			icon: "droplet",
			title: "Сосудосуживающие капли в нос",
			description: "Закапывать капли в нос на стороне операции для сохранения соустья гайморовой пазухи.",
			category: "meds",
		},
	],
	medications: [
		{
			id: "sl_med_amoxi",
			name: "Амоксиклав 1000 мг (или Цифран СТ)",
			formRu: "Таблетки",
			dosageRu: "1 таблетка (875/125 мг)",
			frequencyRu: "2 раза в день во время еды",
			durationRu: "7 дней (строго по часам)",
			purposeRu: "Профилактика бактериального инфицирования костного графта",
			icon: "pill",
			isImportant: true,
		},
		{
			id: "sl_med_nazivin",
			name: "Називин 0.05% (капли назальные)",
			formRu: "Капли в нос",
			dosageRu: "1–2 капли в носовой ход на стороне операции",
			frequencyRu: "2–3 раза в день",
			durationRu: "5 дней",
			purposeRu: "Снятие отека слизистой и дренаж пазухи",
			icon: "droplet",
			isImportant: true,
		},
	],
	warningSigns: [
		"Обильные кровянистые или гнойные выделения из носа",
		"Температура выше 38°C и нарастающая пульсирующая боль в подглазничной области",
	],
	dietaryRules: [
		"Исключить горячую, острую пищу и напитки через трубочку",
	],
	hygieneRules: [
		"Ротовые ванночки с хлоргексидином 0.05% со 2-х суток без активного полоскания",
	],
	activityRestrictions: [
		"Категорически запрещены авиаперелеты, дайвинг и тяжелый спорт на 14–21 день",
	],
	nextVisitText: "Контрольный осмотр и снятие швов через 10–14 дней",
};

export const IMPLANTATION_CARE_PRESET: CarePresetData = {
	interventionType: "implantation",
	typeNameRu: "Дентальная имплантация",
	defaultProcedureName: "Установка дентального имплантата с заглушкой / формирователем десны",
	recommendations: [
		{
			id: "imp_cold",
			icon: "snowflake",
			title: "Прикладывать холод к щеке",
			description: "Прикладывать сухой холод через салфетку по 15 минут в течение первых суток.",
			category: "cold",
		},
		{
			id: "imp_no_chew",
			icon: "ban",
			title: "Не жевать на стороне имплантации",
			description: "Исключить жевательное давление на зону операции до приживления кости.",
			category: "food",
		},
		{
			id: "imp_antiseptic",
			icon: "cup",
			title: "Антисептические ротовые ванночки",
			description: "Ванночки с Хлоргексидином 0.05% со 2-х суток 3 раза в день после еды.",
			category: "hygiene",
		},
	],
	medications: [
		{
			id: "imp_med_amoxi",
			name: "Амоксиклав 1000 мг (или Сумамед 500 мг)",
			formRu: "Таблетки",
			dosageRu: "1 таблетка после еды",
			frequencyRu: "2 раза в день",
			durationRu: "5–7 дней",
			purposeRu: "Антибактериальная защита зоны остеоинтеграции имплантата",
			icon: "pill",
			isImportant: true,
		},
		{
			id: "imp_med_nimesil",
			name: "Нимесил 100 мг",
			formRu: "Саше для суспензии",
			dosageRu: "1 саше в воде",
			frequencyRu: "2 раза в день при болях",
			durationRu: "3–4 дня",
			purposeRu: "Обезболивание и купирование отека",
			icon: "pill",
		},
	],
	warningSigns: [
		"Непрекращающееся кровотечение из зоны швов более 2 часов",
		"Подвижность формирователя десны или острая распирающая боль на 4–5 день",
	],
	dietaryRules: [
		"Мягкая теплая пища, исключить твердые и волокнистые продукты на 14 дней",
	],
	hygieneRules: [
		"Зубы чистить аккуратно, обходя швы; со 2-го дня ротовые ванночки Хлоргексидина",
	],
	activityRestrictions: [
		"Запрещены бани, сауны, интенсивный спорт и переохлаждение на 7–10 дней",
	],
	nextVisitText: "Контрольный осмотр и снятие швов через 10–14 дней",
};

export const ENDODONTICS_CARE_PRESET: CarePresetData = {
	interventionType: "endodontics",
	typeNameRu: "Эндодонтическое лечение каналов",
	defaultProcedureName: "Механическая и медикаментозная обработка корневых каналов под микроскопом",
	recommendations: [
		{
			id: "endo_numbness",
			icon: "ban",
			title: "Не принимать пищу до отхода анестезии",
			description: "Воздержитесь от еды 1.5–2 часа во избежание травмы слизистой.",
			category: "food",
		},
		{
			id: "endo_temp_seal",
			icon: "shield",
			title: "Беречь временную пломбу",
			description: "Не ковырять пломбу зубочистками и не жевать твердую пищу до постоянной реставрации.",
			category: "immediate",
		},
		{
			id: "endo_pain",
			icon: "pill",
			title: "Обезболивающее при накусывании",
			description: "Умеренная боль при накусывании в течение 3–5 дней нормальна. Принимайте Нимесил при необходимости.",
			category: "meds",
		},
	],
	medications: [
		{
			id: "endo_med_nimesil",
			name: "Нимесил 100 мг",
			formRu: "Саше",
			dosageRu: "1 саше в 100 мл воды",
			frequencyRu: "1–2 раза в день при боли",
			durationRu: "2–3 дня",
			purposeRu: "Снятие периодонтального воспаления",
			icon: "pill",
		},
	],
	warningSigns: [
		"Выпадение временной пломбы или появление лекарственного привкуса во рту",
		"Отек десны в области корня зуба или пульсирующая нарастающая боль",
	],
	dietaryRules: [
		"Исключить жевание на причинном зубе до завершения постоянной реставрации",
	],
	hygieneRules: [
		"Стандартная гигиена полости рта дважды в день",
	],
	activityRestrictions: [
		"Без существенных ограничений",
	],
	nextVisitText: "Следующий этап лечения или постоянная реставрация через 5–14 дней",
};

export const WHITENING_CARE_PRESET: CarePresetData = {
	interventionType: "whitening",
	typeNameRu: "Клиническое отбеливание зубов",
	defaultProcedureName: "Профессиональное фотоотбеливание ZOOM 4 / Flash",
	recommendations: [
		{
			id: "white_diet",
			icon: "ban",
			title: "Строгая «Белая диета» 48–72 часа!",
			description: "Категорически исключить красящие продукты: кофе, чай, колу, красное вино, ягоды, свеклу, соусы и курение.",
			category: "food",
			isUrgent: true,
			badgeText: "48–72 ч",
		},
		{
			id: "white_sens",
			icon: "zap",
			title: "Снижение гиперчувствительности эмали",
			description: "Используйте реминерализующий гель и пасту для чувствительных зубов при реакции на температурные раздражители.",
			category: "immediate",
		},
		{
			id: "white_hygiene",
			icon: "brush",
			title: "Мягкая зубная щетка без абразивов",
			description: "Чистить зубы мягкой щеткой, исключить отбеливающие абразивные пасты на 2 недели.",
			category: "hygiene",
		},
	],
	medications: [
		{
			id: "white_med_mousse",
			name: "GC Tooth Mousse (или Relief ACP)",
			formRu: "Реминерализующий гель",
			dosageRu: "Нанести тонким слоем на зубы после чистки",
			frequencyRu: "1–2 раза в день",
			durationRu: "7–14 дней",
			purposeRu: "Укрепление эмали и снятие чувствительности",
			icon: "droplet",
		},
	],
	warningSigns: [
		"Нестерпимая острая боль («прострелы» в зубах), не купируемая анальгетиками",
		"Химический ожог или побеление краевой десны",
	],
	dietaryRules: [
		"Строжайшая белая диета первые 3 дня: рис, курица, белая рыба, цветная капуста, вода",
	],
	hygieneRules: [
		"Чистить зубы щеткой с мягкой щетиной и пастой с нитратом калия",
	],
	activityRestrictions: [
		"Без ограничений по спорту",
	],
	nextVisitText: "Контрольный осмотр и фотопротокол через 7–10 дней",
};

export const ORTHODONTICS_CARE_PRESET: CarePresetData = {
	interventionType: "orthodontics",
	typeNameRu: "Ортодонтическое лечение",
	defaultProcedureName: "Фиксация брекет-системы / активация ортодонтической дуги",
	recommendations: [
		{
			id: "ortho_soft_food",
			icon: "soup",
			title: "Мягкая пища в период адаптации",
			description: "Первые 3–5 дней зубы могут ныть при накусывании. Употребляйте супы, пюре, смузи.",
			category: "food",
		},
		{
			id: "ortho_wax",
			icon: "shield",
			title: "Ортодонтический воск при натирании",
			description: "При натирании брекетом слизистой губы или щеки наклейте кусочек воска на замок.",
			category: "immediate",
		},
		{
			id: "ortho_no_hard",
			icon: "ban",
			title: "Запрет на откусывание твердой пищи",
			description: "Не откусывать яблоки, сухари и морковь передними зубами во избежание отклейки брекетов.",
			category: "restrictions",
			badgeText: "Важно",
		},
	],
	medications: [
		{
			id: "ortho_med_pain",
			name: "Ибупрофен 400 мг",
			formRu: "Таблетки",
			dosageRu: "1 таблетка при выраженной болезненности",
			frequencyRu: "1–2 раза в сутки",
			durationRu: "2–3 дня",
			purposeRu: "Облегчение адаптации к ортодонтической силе",
			icon: "pill",
		},
	],
	warningSigns: [
		"Отклейка брекета или смещение замка с зуба",
		"Колющий кончик дуги, травмирующий щеку",
	],
	dietaryRules: [
		"Исключить вязкую карамель, ириски, жевательную резинку и жесткие орехи",
	],
	hygieneRules: [
		"Чистить зубы после каждого приема пищи монопучковой щеткой и ершиками",
	],
	activityRestrictions: [
		"При контактных видах спорта использовать индивидуальную защитную капу",
	],
	nextVisitText: "Плановая активация дуги через 4–6 недель",
};

export const HYGIENE_CARE_PRESET: CarePresetData = {
	interventionType: "hygiene",
	typeNameRu: "Профессиональная гигиена полости рта",
	defaultProcedureName: "Комплексная чистка Air-Flow, ультразвуковой скейлинг и фторирование",
	recommendations: [
		{
			id: "hyg_new_brush",
			icon: "brush",
			title: "Заменить зубную щетку на новую",
			description: "Обязательно смените зубную щетку в день проведения профгигиены на новую средней жесткости.",
			category: "hygiene",
			badgeText: "Сегодня",
		},
		{
			id: "hyg_no_color",
			icon: "ban",
			title: "Воздержаться от красителей на 24 часа",
			description: "Эмаль после полировки восприимчива к пигментам. Исключите чай, кофе, соки и курение на сутки.",
			category: "food",
		},
		{
			id: "hyg_fluoride",
			icon: "sparkles",
			title: "Не есть и не пить 30–60 минут",
			description: "Дайте реминерализующему фторлаку закрепиться на поверхности эмали.",
			category: "immediate",
		},
	],
	medications: [
		{
			id: "hyg_med_asepta",
			name: "Асепта адгезивный бальзам (или Пародонтоцид)",
			formRu: "Гель для десен",
			dosageRu: "Наносить на десневой край тонким слоем",
			frequencyRu: "2 раза в день после чистки зубов",
			durationRu: "3–5 дней",
			purposeRu: "Быстрое заживление десен после скейлинга",
			icon: "droplet",
		},
	],
	warningSigns: [
		"Кровоточивость десен, продолжающаяся более 3 суток после процедуры",
		"Острая непрекращающаяся реакция на холодную воду",
	],
	dietaryRules: [
		"Исключить красящую и раздражающую кислую пищу на 24 часа",
	],
	hygieneRules: [
		"Чистить зубы выметающими движениями от десны к краю, использовать флос и монопучок",
	],
	activityRestrictions: [
		"Без ограничений",
	],
	nextVisitText: "Плановая поддерживающая профессиональная гигиена через 6 месяцев",
};

export const CARE_PRESETS_MAP: Record<CareInterventionType, CarePresetData> = {
	caries: CARIES_CARE_PRESET,
	extraction: EXTRACTION_CARE_PRESET,
	sinus_lift: SINUS_LIFT_CARE_PRESET,
	implantation: IMPLANTATION_CARE_PRESET,
	endodontics: ENDODONTICS_CARE_PRESET,
	whitening: WHITENING_CARE_PRESET,
	orthodontics: ORTHODONTICS_CARE_PRESET,
	hygiene: HYGIENE_CARE_PRESET,
	custom: CARIES_CARE_PRESET,
};

// ============================================================================
// INTELLIGENT INTERVENTION TYPE DETECTOR
// ============================================================================

/**
 * Автоматически определяет тип клинического вмешательства по названию процедуры или коду 804н.
 */
export function detectInterventionTypeFromProcedure(procedureName: string = ""): CareInterventionType {
	const lower = procedureName.toLowerCase();

	if (
		lower.includes("синус-лифтинг") ||
		lower.includes("синуслифтинг") ||
		lower.includes("костная пластика") ||
		lower.includes("аугментация") ||
		lower.includes("bio-oss") ||
		lower.includes("субантральн")
	) {
		return "sinus_lift";
	}

	if (
		lower.includes("имплант") ||
		lower.includes("straumann") ||
		lower.includes("osstem") ||
		lower.includes("nobel") ||
		lower.includes("формировател") ||
		lower.includes("a16.07.054")
	) {
		return "implantation";
	}

	if (
		lower.includes("удален") ||
		lower.includes("экстракц") ||
		lower.includes("ретинированн") ||
		lower.includes("дистопированн") ||
		lower.includes("a16.07.001")
	) {
		return "extraction";
	}

	if (
		lower.includes("пульпит") ||
		lower.includes("периодонтит") ||
		lower.includes("эндодонт") ||
		lower.includes("канал") ||
		lower.includes("гуттаперч") ||
		lower.includes("распломбировк") ||
		lower.includes("девитализац") ||
		lower.includes("a16.07.008") ||
		lower.includes("a16.07.030")
	) {
		return "endodontics";
	}

	if (
		lower.includes("отбеливан") ||
		lower.includes("zoom") ||
		lower.includes("flash") ||
		lower.includes("whitespeed") ||
		lower.includes("a16.07.050")
	) {
		return "whitening";
	}

	if (
		lower.includes("брекет") ||
		lower.includes("элайнер") ||
		lower.includes("ортодонт") ||
		lower.includes("дуг") ||
		lower.includes("активац")
	) {
		return "orthodontics";
	}

	if (
		lower.includes("гигиен") ||
		lower.includes("чистк") ||
		lower.includes("air-flow") ||
		lower.includes("air flow") ||
		lower.includes("скейлинг") ||
		lower.includes("ультразвук") ||
		lower.includes("a16.07.051")
	) {
		return "hygiene";
	}

	return "caries";
}

// ============================================================================
// WHATSAPP, SMS & A4 MEMO GENERATION
// ============================================================================

export interface GenerateCareMemoInput {
	readonly memoId?: string | undefined;
	readonly memoDateIso?: string | undefined;
	readonly interventionType?: CareInterventionType | undefined;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly toothFdi?: string | undefined;
	readonly procedureName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicEmergencyPhone?: string | undefined;
	readonly customRecommendations?: readonly CareRecommendationItem[] | undefined;
	readonly customMedications?: readonly PrescribedMedicationItem[] | undefined;
	readonly warningSigns?: readonly string[] | undefined;
	readonly nextVisitRecommendedText?: string | undefined;
}

/**
 * Генерирует персональную клиническую памятку для пациента с WhatsApp текстом, SMS, QR-кодом и печатным HTML А4.
 */
/**
 * Очищает и нормализует имя врача и его специализацию, предотвращая задвоение скобок.
 * Например: "Д-р Смирнов А. В. (Хирург-имплантолог, ортопед)" ->
 * cleanName: "Д-р Смирнов А. В.", cleanSpecialty: "Хирург-имплантолог, ортопед"
 */
export function sanitizeDoctorInfo(
	rawName?: string | undefined,
	rawSpecialty?: string | undefined,
): { cleanName: string; cleanSpecialty: string } {
	const raw = (rawName || "").trim();
	const specialtyInput = (rawSpecialty || "").trim();

	const match = raw.match(/^(.*?)\s*\((.*?)\)$/);
	if (match && typeof match[1] === "string" && typeof match[2] === "string") {
		const cleanName = match[1].trim();
		const extractedSpecialty = match[2].trim();
		const cleanSpecialty =
			extractedSpecialty || specialtyInput || "Врач-стоматолог";
		return {
			cleanName: cleanName || raw,
			cleanSpecialty,
		};
	}

	return {
		cleanName: raw || "Кузнецов П. С.",
		cleanSpecialty: specialtyInput || "Врач-стоматолог терапевт",
	};
}

export function generateCareMemo(input: GenerateCareMemoInput): PatientCareMemo {
	const memoId = input.memoId || `memo-${Date.now().toString(36)}`;
	const memoDateIso = input.memoDateIso || new Date().toISOString().slice(0, 10);
	const toothFdi = input.toothFdi || "16";

	// Определение типа вмешательства
	const detectedType = input.interventionType || detectInterventionTypeFromProcedure(input.procedureName || "");
	const preset = CARE_PRESETS_MAP[detectedType] || CARIES_CARE_PRESET;

	const procedureName = input.procedureName || preset.defaultProcedureName;
	const clinicName = input.clinicName || "Стоматологическая клиника ДЕНТЕ";
	const clinicPhone = input.clinicPhone || "+7 (495) 789-01-23";
	const clinicEmergencyPhone = input.clinicEmergencyPhone || "+7 (999) 123-45-67";
	const { cleanName: doctorName, cleanSpecialty: doctorSpecialty } =
		sanitizeDoctorInfo(input.doctorName, input.doctorSpecialty);
	const patientPhone = input.patientPhone || "+7 (999) 123-45-67";

	const recommendations =
		input.customRecommendations && input.customRecommendations.length > 0
			? input.customRecommendations
			: preset.recommendations;

	const medications =
		input.customMedications && input.customMedications.length > 0
			? input.customMedications
			: preset.medications;

	const warningSigns =
		input.warningSigns && input.warningSigns.length > 0
			? input.warningSigns
			: preset.warningSigns;

	const nextVisitRecommendedText =
		input.nextVisitRecommendedText || preset.nextVisitText;

	// Генерация текста для WhatsApp («Уважаемый(ая) {Имя}, рекомендации после лечения зуба {Зуб}: ...»)
	const whatsAppLines: string[] = [
		`Уважаемый(ая) ${input.patientName}, рекомендации после лечения зуба ${toothFdi}:`,
		"",
		`Врач: ${doctorName} • ${clinicName}`,
		`Процедура: ${procedureName}`,
		"",
	];

	for (const rec of recommendations) {
		whatsAppLines.push(`• *${rec.title}*`);
		whatsAppLines.push(`${rec.description}`);
		whatsAppLines.push("");
	}

	if (medications.length > 0) {
		whatsAppLines.push(`*Схема приема медикаментов:*`);
		for (const med of medications) {
			whatsAppLines.push(`• *${med.name}*: ${med.dosageRu} (${med.frequencyRu}, курс ${med.durationRu})`);
		}
		whatsAppLines.push("");
	}

	whatsAppLines.push(`*Тревожные признаки:*`);
	for (const w of warningSigns) {
		whatsAppLines.push(`• ${w}`);
	}
	whatsAppLines.push("");
	whatsAppLines.push(`Телефон клиники: ${clinicPhone}`);
	whatsAppLines.push(`Горячая линия дежурного врача 24/7: ${clinicEmergencyPhone}`);
	whatsAppLines.push("");
	whatsAppLines.push(`Электронная памятка в личном кабинете: https://dente.ru/memo/${memoId}`);
	whatsAppLines.push("Желаем вам скорейшего комфортного восстановления!");

	const whatsAppMessageText = whatsAppLines.join("\n");
	const whatsAppDeepLink = buildWhatsAppLink(patientPhone, whatsAppMessageText);

	// Генерация компактного текста для SMS
	const cleanPhone = patientPhone.replace(/\D/g, "");
	const memoUrl = `https://dente.ru/m/${memoId}`;
	const smsText = `ДЕНТЕ: Памятка после лечения зуба ${toothFdi} (${procedureName}): ${memoUrl} Дежурный врач: ${clinicEmergencyPhone}`;
	const smsDeepLink = buildSmsLink(patientPhone, smsText);

	// Генерация QR-кода со ссылкой на памятку
	const qrPayload = `https://dente.ru/memo/${memoId}?patient=${encodeURIComponent(input.patientName)}&tooth=${toothFdi}&phone=${cleanPhone}`;
	const qrCodeSvg = generateQrCodeSvg(qrPayload, { size: 200 });

	// Генерация печатного листа А4
	const memoObjPartial = {
		id: memoId,
		memoDateIso,
		interventionType: detectedType,
		interventionTypeNameRu: preset.typeNameRu,
		patientName: input.patientName,
		patientPhone,
		toothFdi,
		procedureName,
		doctorName,
		doctorSpecialty,
		clinicName,
		clinicPhone,
		clinicEmergencyPhone,
		recommendations,
		medications,
		warningSigns,
		dietaryRules: preset.dietaryRules,
		hygieneRules: preset.hygieneRules,
		activityRestrictions: preset.activityRestrictions,
		nextVisitRecommendedText,
		qrCodeSvg,
		whatsAppMessageText,
		whatsAppText: whatsAppMessageText,
		whatsAppDeepLink,
		smsText,
		smsDeepLink,
	};

	const printHtml = generateCareMemoPrintHtml(memoObjPartial as PatientCareMemo);

	return {
		...memoObjPartial,
		printHtml,
	};
}

/**
 * Создает прямую ссылку для отправки сообщения в WhatsApp с нормализацией номера телефона.
 */
export function buildWhatsAppLink(phone: string, text: string): string {
	let clean = phone.replace(/\D/g, "");
	if (clean.length === 11 && clean.startsWith("8")) {
		clean = "7" + clean.slice(1);
	} else if (clean.length === 10) {
		clean = "7" + clean;
	}
	return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

/**
 * Создает прямую ссылку для отправки SMS (протокол sms:).
 */
export function buildSmsLink(phone: string, text: string): string {
	let clean = phone.replace(/\D/g, "");
	if (clean.length === 11 && clean.startsWith("8")) {
		clean = "+7" + clean.slice(1);
	} else if (clean.length === 10) {
		clean = "+7" + clean;
	} else if (!clean.startsWith("+")) {
		clean = "+" + clean;
	}
	return `sms:${clean}?body=${encodeURIComponent(text)}`;
}

/**
 * Формирует компактный текст для SMS с ключевой ссылкой и SOS телефоном.
 */
export function generateCareMemoSmsText(memo: PatientCareMemo): string {
	return memo.smsText;
}

// ============================================================================
// A4 PRINT SHEET GENERATOR (PREMIUM MEDICAL DESIGN)
// ============================================================================

export const generatePrintableCareMemoHtml = generateCareMemoPrintHtml;

export function generateCareMemoPrintHtml(memo: PatientCareMemo): string {
	const recsHtml = memo.recommendations
		.map(
			(rec) => `
      <div style="margin-bottom: 10px; padding: 8px 12px; background: #f8fafc; border-left: 4px solid ${rec.isUrgent ? "#ef4444" : "#0d9488"}; border-radius: 4px;">
        <div style="font-weight: 700; color: #0f172a; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
          <span>${rec.title}</span>
          ${rec.badgeText ? `<span style="font-size: 10px; background: ${rec.isUrgent ? "#fee2e2" : "#ccfbf1"}; color: ${rec.isUrgent ? "#b91c1c" : "#0f766e"}; padding: 2px 6px; border-radius: 4px; font-weight: 800;">${rec.badgeText}</span>` : ""}
        </div>
        <div style="font-size: 11.5px; color: #334155; margin-top: 3px; line-height: 1.4;">${rec.description}</div>
      </div>
    `,
		)
		.join("");

	const medsHtml =
		memo.medications.length > 0
			? `
      <div style="margin-top: 14px; margin-bottom: 14px;">
        <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
          Режим и схема приёма медикаментов:
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 6px;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left;">
              <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Препарат / Форма</th>
              <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Дозировка и способ</th>
              <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Кратность</th>
              <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Длительность</th>
            </tr>
          </thead>
          <tbody>
            ${memo.medications
							.map(
								(med) => `
              <tr>
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 700; color: #0f172a;">
                  ${med.name}<br><span style="font-weight: 400; color: #64748b; font-size: 10px;">${med.formRu}</span>
                </td>
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1; color: #334155;">${med.dosageRu}</td>
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1; color: #334155;">${med.frequencyRu}</td>
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a;">${med.durationRu}</td>
              </tr>
            `,
							)
							.join("")}
          </tbody>
        </table>
      </div>
    `
			: "";

	const warningsHtml = memo.warningSigns
		.map((w) => `<li style="margin-bottom: 2px;">${w}</li>`)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Памятка пациента — ${memo.patientName} — ${memo.clinicName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11.5px; color: #0f172a; margin: 0; padding: 0; line-height: 1.35; }
    .memo-container { max-width: 720px; margin: 0 auto; background: #ffffff; padding: 10px; box-sizing: border-box; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 12px; }
    .clinic-title { font-size: 16px; font-weight: 900; color: #0d9488; text-transform: uppercase; margin: 0; }
    .clinic-sub { font-size: 10.5px; color: #64748b; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 10.5px; color: #475569; }
    .patient-banner { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
    .danger-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 12px; margin-top: 10px; }
    .footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b; }
    .qr-block { text-align: center; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="memo-container">
    <div class="header">
      <div>
        <h1 class="clinic-title">${memo.clinicName}</h1>
        <div class="clinic-sub">Лицензия ЛО-78-01-011842 • Телефон: ${memo.clinicPhone}</div>
        <div class="clinic-sub" style="font-weight: 800; color: #b91c1c;">Горячая линия дежурного врача (круглосуточно): ${memo.clinicEmergencyPhone}</div>
      </div>
      <div class="doc-meta">
        <div><strong>Дата:</strong> ${memo.memoDateIso}</div>
        <div><strong>Памятка №:</strong> ${memo.id}</div>
        <div><strong>Врач:</strong> ${memo.doctorName}</div>
        <div style="font-size: 9.5px; color: #64748b;">${memo.doctorSpecialty}</div>
      </div>
    </div>

    <div class="patient-banner">
      <div>
        <div style="font-size: 13px; font-weight: 800; color: #0f172a;">Пациент: ${memo.patientName}</div>
        <div style="font-size: 11px; color: #0f766e; margin-top: 2px;">
          Процедура: <strong>${memo.procedureName}</strong> (Зуб №<strong>${memo.toothFdi}</strong>)
        </div>
      </div>
      <div style="background: #0d9488; color: #ffffff; padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 11px;">
        ${memo.interventionTypeNameRu}
      </div>
    </div>

    <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
      Персональные рекомендации и правила ухода:
    </div>

    ${recsHtml}
    ${medsHtml}

    <div class="danger-box">
      <div style="font-weight: 800; color: #b91c1c; font-size: 11.5px; display: flex; align-items: center; gap: 6px;">
        Когда необходимо срочно связаться с лечащим или дежурным врачом:
      </div>
      <ul style="margin: 4px 0 0 0; padding-left: 18px; font-size: 11px; color: #7f1d1d; line-height: 1.3;">
        ${warningsHtml}
      </ul>
    </div>

    <div style="margin-top: 10px; font-size: 11px; color: #334155; background: #f8fafc; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
      <strong>Следующий плановый визит:</strong> ${memo.nextVisitRecommendedText}
    </div>

    <div class="footer">
      <div>
        <div>Памятка составлена в соответствии с клиническими рекомендациями Стоматологической Ассоциации России (СтАР).</div>
        <div style="margin-top: 4px;">Подпись лечащего врача: ____________________ / ${memo.doctorName} / М.П.</div>
      </div>
      <div class="qr-block">
        <div style="display: flex; justify-content: center;">${memo.qrCodeSvg}</div>
        <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Открыть в смартфоне</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// FRIENDLY BILLING BREAKDOWN (АНТИ-ЛАТЫНЬ)
// ============================================================================

function cleanToothNumberFromName(name: string): string {
	return (name || "")
		.replace(/\s*\((?:зуб\s*(?:№\s*)?|позиция\s*)\d+\)/gi, "")
		.replace(/\s*\[(?:зуб\s*(?:№\s*)?|позиция\s*)\d+\]/gi, "")
		.trim();
}

/**
 * Переводит сложную медицинскую номенклатуру 804н / латынь в понятный для пациента русский блок.
 */
export function translateMedicalTermToFriendly(
	rawName: string,
	toothNumber?: string | number | null | undefined,
): {
	readonly friendlyName: string;
	readonly categoryGroup: FriendlyBillingCategory;
	readonly categoryGroupRu: string;
	readonly groupIcon: string;
	readonly plainDescriptionRu: string;
} {
	const lower = (rawName || "").toLowerCase();

	// 1. Анестезия / Обезболивание
	if (
		lower.includes("анестези") ||
		lower.includes("артикаин") ||
		lower.includes("ультракаин") ||
		lower.includes("скандонест") ||
		lower.includes("септонест") ||
		lower.includes("лидокаин") ||
		lower.includes("мепивакаин") ||
		lower.includes("инфильтрационн") ||
		lower.includes("проводников") ||
		lower.includes("b01.003")
	) {
		return {
			friendlyName: "Обезболивание (анестезия)",
			categoryGroup: "anesthesia",
			categoryGroupRu: "Обезболивание (анестезия)",
			groupIcon: "Syringe",
			plainDescriptionRu:
				"Современное мягкое обезболивание для полной безболезненности и комфорта во время лечения",
		};
	}

	// 2. Снимки и радиовизиография / КТ
	if (
		lower.includes("снимок") ||
		lower.includes("радиовизиограф") ||
		lower.includes("рентген") ||
		lower.includes("кт") ||
		lower.includes("томограф") ||
		lower.includes("ортопантомограмм") ||
		lower.includes("оптг") ||
		lower.includes("a06.07")
	) {
		return {
			friendlyName: lower.includes("кт") || lower.includes("томограф")
				? "3D-компьютерная томография (КТ)"
				: "Снимок зуба (радиовизиография)",
			categoryGroup: "xray",
			categoryGroupRu: "Снимки и диагностика",
			groupIcon: "Camera",
			plainDescriptionRu:
				"Цифровой высокоточный снимок с минимальной лучевой нагрузкой для контроля корней и скрытых полостей",
		};
	}

	// 3. Кариес и пломбирование
	if (
		lower.includes("кариес") ||
		lower.includes("пломб") ||
		lower.includes("композит") ||
		lower.includes("filtek") ||
		lower.includes("estelite") ||
		lower.includes("реставрац") ||
		lower.includes("полост") ||
		lower.includes("a16.07.002") ||
		lower.includes("a16.07.003")
	) {
		return {
			friendlyName: "Лечение кариеса и световая пломба",
			categoryGroup: "caries",
			categoryGroupRu: "Лечение кариеса и пломбирование",
			groupIcon: "Activity",
			plainDescriptionRu:
				"Бережное очищение зуба от кариеса и установка высокоэстетичной светоотверждаемой нанокомпозитной пломбы точно в цвет эмали",
		};
	}

	// 4. Профессиональная гигиена и чистка
	if (
		lower.includes("гигиен") ||
		lower.includes("чистк") ||
		lower.includes("air-flow") ||
		lower.includes("air flow") ||
		lower.includes("ультразвук") ||
		lower.includes("зубной камень") ||
		lower.includes("полировк") ||
		lower.includes("фторирован") ||
		lower.includes("a16.07.051")
	) {
		return {
			friendlyName: "Комплексная профессиональная чистка (Air-Flow + УЗ)",
			categoryGroup: "hygiene",
			categoryGroupRu: "Профессиональная чистка и гигиена",
			groupIcon: "Sparkles",
			plainDescriptionRu:
				"Удаление твердого зубного камня ультразвуком, снятие пигментного налета Air-Flow и укрепление эмали минеральным комплексом",
		};
	}

	// 5. Имплантация
	if (
		lower.includes("имплант") ||
		lower.includes("straumann") ||
		lower.includes("nobel") ||
		lower.includes("osstem") ||
		lower.includes("a16.07.054")
	) {
		return {
			friendlyName: "Установка дентального имплантата",
			categoryGroup: "implant",
			categoryGroupRu: "Дентальная имплантация",
			groupIcon: "Shield",
			plainDescriptionRu:
				"Установка премиального биосовместимого титанового имплантата с пожизненной гарантией производителя",
		};
	}

	// 6. Ортопедия / Коронки
	if (
		lower.includes("коронк") ||
		lower.includes("циркони") ||
		lower.includes("e.max") ||
		lower.includes("emax") ||
		lower.includes("вкладк") ||
		lower.includes("протез") ||
		lower.includes("винир") ||
		lower.includes("a16.07.004") ||
		lower.includes("a16.07.006")
	) {
		return {
			friendlyName: "Ортопедическая коронка/реставрация",
			categoryGroup: "crowns",
			categoryGroupRu: "Коронки и реставрации",
			groupIcon: "Crown",
			plainDescriptionRu:
				"Изготовление и постоянная фиксация анатомической керамической коронки для полного восстановления жевательной функции",
		};
	}

	// 7. Хирургия и удаление
	if (
		lower.includes("удален") ||
		lower.includes("экстракц") ||
		lower.includes("хирург") ||
		lower.includes("синус-лифтинг") ||
		lower.includes("синуслифтинг") ||
		lower.includes("костная пластика") ||
		lower.includes("a16.07.001")
	) {
		return {
			friendlyName: "Бережное хирургическое вмешательство",
			categoryGroup: "surgery",
			categoryGroupRu: "Хирургическое лечение",
			groupIcon: "Activity",
			plainDescriptionRu:
				"Атравматичное удаление или костная пластика с сохранением объема костной ткани",
		};
	}

	// 8. Ортодонтия
	if (
		lower.includes("брекет") ||
		lower.includes("элайнер") ||
		lower.includes("дуг") ||
		lower.includes("активац")
	) {
		return {
			friendlyName: "Ортодонтическая коррекция прикуса",
			categoryGroup: "ortho",
			categoryGroupRu: "Исправление прикуса (ортодонтия)",
			groupIcon: "Ruler",
			plainDescriptionRu:
				"Плановая активация ортодонтической аппаратуры для создания ровной красивой улыбки",
		};
	}

	// 9. Прочее
	return {
		friendlyName: cleanToothNumberFromName(rawName),
		categoryGroup: "other",
		categoryGroupRu: "Стоматологические процедуры",
		groupIcon: "FileText",
		plainDescriptionRu: "Медицинская услуга по индивидуальному клиническому протоколу",
	};
}

/**
 * Разбивает массив услуг из счета на понятные пациенту смысловые блоки без латыни.
 */
export function groupServicesIntoFriendlyBlocks(
	items: readonly any[],
): FriendlyBillingBreakdown {
	const groupsMap = new Map<
		FriendlyBillingCategory,
		{
			categoryGroup: FriendlyBillingCategory;
			categoryGroupRu: string;
			groupIcon: string;
			items: FriendlyBillingItem[];
			subtotalRub: number;
		}
	>();

	let totalAmountRub = 0;

	for (let i = 0; i < items.length; i++) {
		const it = items[i];
		const name = it.titleRu || it.name || "Стоматологическая услуга";
		const toothNumber = it.toothFdi || it.toothNumber || null;
		const quantity = Number(it.quantity) || 1;
		const priceRub = Number(it.priceRub) || 0;
		const discountRub = Number(it.discountRub) || 0;
		const totalRub = Math.max(0, priceRub * quantity - discountRub);

		totalAmountRub += totalRub;

		const friendlyMeta = translateMedicalTermToFriendly(name, toothNumber);

		const friendlyItem: FriendlyBillingItem = {
			id: it.id || `srv-${i}`,
			originalName: name,
			friendlyName: friendlyMeta.friendlyName,
			categoryGroup: friendlyMeta.categoryGroup,
			categoryGroupRu: friendlyMeta.categoryGroupRu,
			groupIcon: friendlyMeta.groupIcon,
			plainDescriptionRu: friendlyMeta.plainDescriptionRu,
			toothNumber,
			quantity,
			priceRub,
			totalRub,
			isWarranty: !!it.isWarranty,
		};

		const existing = groupsMap.get(friendlyMeta.categoryGroup);
		if (existing) {
			existing.items.push(friendlyItem);
			existing.subtotalRub += totalRub;
		} else {
			groupsMap.set(friendlyMeta.categoryGroup, {
				categoryGroup: friendlyMeta.categoryGroup,
				categoryGroupRu: friendlyMeta.categoryGroupRu,
				groupIcon: friendlyMeta.groupIcon,
				items: [friendlyItem],
				subtotalRub: totalRub,
			});
		}
	}

	// Порядок групп для максимально понятного восприятия пациентом:
	// 1. Лечение кариеса -> 2. Обезболивание -> 3. Снимок -> 4. Чистка -> 5. Коронки -> 6. Имплантация -> 7. Хирургия -> 8. Прочее
	const categoryOrder: FriendlyBillingCategory[] = [
		"caries",
		"anesthesia",
		"xray",
		"hygiene",
		"crowns",
		"implant",
		"surgery",
		"ortho",
		"other",
	];

	const groups: FriendlyBillingGroup[] = [];

	for (const cat of categoryOrder) {
		const grp = groupsMap.get(cat);
		if (grp) {
			const pct = totalAmountRub > 0 ? Math.round((grp.subtotalRub / totalAmountRub) * 100) : 0;
			let summaryRu = "";
			if (cat === "caries") {
				summaryRu = "Основное лечение зуба: удаление пораженных тканей и постановка световой пломбы";
			} else if (cat === "anesthesia") {
				summaryRu = "Комфорт процедуры: современный анестетик для полного отсутствия боли";
			} else if (cat === "xray") {
				summaryRu = "Контроль качества: цифровой прицельный снимок до и после лечения";
			} else if (cat === "hygiene") {
				summaryRu = "Профилактика: бережная гигиена Air-Flow и полировка";
			} else if (cat === "implant") {
				summaryRu = "Хирургический этап: установка имплантата с пожизненной гарантией";
			} else if (cat === "crowns") {
				summaryRu = "Ортопедический этап: прочная коронка для надежной защиты";
			} else if (cat === "surgery") {
				summaryRu = "Хирургический этап: бережная операция с сохранением объема кости";
			} else if (cat === "ortho") {
				summaryRu = "Ортодонтический этап: плановая коррекция и перемещение зубов";
			} else {
				summaryRu = "Медицинские процедуры по плану лечения";
			}

			groups.push({
				categoryGroup: grp.categoryGroup,
				categoryGroupRu: grp.categoryGroupRu,
				groupIcon: grp.groupIcon,
				summaryRu,
				items: grp.items,
				subtotalRub: grp.subtotalRub,
				percentageOfTotal: pct,
			});
		}
	}

	const blockNames = groups.map((g) => g.categoryGroupRu).join(", ");
	const patientFriendlySummaryRu = `Счет включает понятные этапы: ${blockNames}. Все манипуляции выполнены в полном объеме.`;

	return {
		totalAmountRub,
		totalAmountRubFormatted: totalAmountRub.toLocaleString("ru-RU") + " ₽",
		groups,
		patientFriendlySummaryRu,
	};
}

/**
 * Генерирует понятное текстовое сообщение со счетом для отправки пациенту в WhatsApp.
 */
export function generateFriendlyBillingWhatsAppMessage(
	patientName: string,
	breakdown: FriendlyBillingBreakdown,
	clinicName: string = "Стоматологическая клиника ДЕНТЕ",
	clinicPhone: string = "+7 (495) 789-01-23",
): string {
	const lines: string[] = [
		`Здравствуйте, уважаемый(ая) ${patientName}!`,
		"",
		`Детализация вашего счета в клинике ${clinicName}:`,
		`Итого к оплате: *${breakdown.totalAmountRubFormatted}*`,
		"",
		"Понятная расшифровка процедур без сложной латыни:",
	];

	for (const grp of breakdown.groups) {
		lines.push("");
		lines.push(`• *${grp.categoryGroupRu}* — ${grp.subtotalRub.toLocaleString("ru-RU")} ₽ (${grp.percentageOfTotal}%)`);
		for (const it of grp.items) {
			const toothStr = it.toothNumber ? ` [Зуб №${it.toothNumber}]` : "";
			lines.push(`  • ${it.friendlyName}${toothStr}: ${it.totalRub.toLocaleString("ru-RU")} ₽`);
		}
	}

	lines.push("");
	lines.push(`По любым вопросам звоните: ${clinicPhone}`);
	lines.push("Спасибо за доверие к нашей клинике!");

	return lines.join("\n");
}
