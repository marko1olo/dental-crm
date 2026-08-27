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
	readonly icon: string; // "🧊", "💊", "🚫", "🦷", "⚠️", "💨", "🥤", "🪥", etc.
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
	readonly icon: string; // "💊", "🍵", "💧", "🧴"
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
	readonly groupIcon: string; // "🦷", "💉", "📷", etc.
	readonly plainDescriptionRu: string;
	readonly toothNumber?: string | number | null | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly totalRub: number;
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
		icon: "🚫",
		title: "Не есть до окончания анестезии (1.5–2 часа)",
		description:
			"Воздержитесь от приема твердой и горячей пищи, пока не пройдет онемение щеки, губы и языка, во избежание их случайного сильного прикусывания.",
		category: "food",
		badgeText: "Первые 2 часа",
	},
	{
		id: "caries_cold_compress",
		icon: "🧊",
		title: "Холод при дискомфорте",
		description:
			"При повышенной чувствительности десны или ноющей реакции приложите сухой холод через полотенце к щеке на 10–15 минут.",
		category: "cold",
		badgeText: "1-е сутки",
	},
	{
		id: "caries_painkiller",
		icon: "💊",
		title: "Обезболивающее: Нимесил или Нурофен",
		description:
			"При умеренной постпломбировочной боли примите Нимесил 100 мг (1 саше) или Ибупрофен 400 мг после еды. Не более 2 раз в сутки.",
		category: "meds",
		badgeText: "При боли",
	},
	{
		id: "caries_occlusion_check",
		icon: "⚖️",
		title: "Проверка прикуса при смыкании",
		description:
			"Если дома при естественном смыкании челюстей вы почувствуете, что пломба завышает («мешает»), обязательно позвоните — мы бесплатно пришлифуем её за 2 минуты.",
		category: "immediate",
		badgeText: "Важно",
	},
	{
		id: "caries_gentle_hygiene",
		icon: "🦷",
		title: "Бережная гигиена полости рта",
		description:
			"Чистите зубы мягкой щеткой утром и вечером, не травмируя краевую десну в зоне недавней реставрации. Используйте зубную нить без резких рывков.",
		category: "hygiene",
	},
	{
		id: "caries_warning",
		icon: "⚠️",
		title: "Когда срочно связаться с клиникой",
		description:
			"Если возникла острая самопроизвольная ночная боль, пульсация или зуб остро реагирует на горячее — немедленно обратитесь к врачу.",
		category: "warning",
		isUrgent: true,
		badgeText: "SOS",
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
			name: "Нимесил 100 мг (или Ибупрофен 400 мг)",
			formRu: "Саше для приготовления суспензии",
			dosageRu: "1 саше растворить в 100 мл теплой воды",
			frequencyRu: "1–2 раза в сутки после еды",
			durationRu: "1–2 дня только при боли",
			purposeRu: "Снятие постпломбировочной чувствительности и воспаления",
			icon: "💊",
		},
	],
	warningSigns: [
		"Ощущение завышения прикуса («пломба мешает смыкать зубы»)",
		"Острая самопроизвольная ночная или пульсирующая боль",
		"Длительная ноющая боль от горячего (более 1–2 минут)",
		"Появление отека десны или щеки",
	],
	dietaryRules: [
		"Не принимать пищу до полного восстановления чувствительности (1.5–2 часа)",
		"В первые сутки избегать сильно красящих продуктов (черника, свекла, крепкий кофе)",
		"Не грызть орехи, сухари и леденцы на стороне запломбированного зуба",
	],
	hygieneRules: [
		"Чистить зубы мягкой щеткой 2 раза в день круговыми выметающими движениями",
		"Зубную нить вводить плавно, выводя вбок без вертикальных рывков",
	],
	activityRestrictions: [
		"Ограничений по физической активности нет",
	],
	nextVisitText: "Контрольный профилактический осмотр и гигиена через 6 месяцев",
};

/**
 * 2. ХИРУРГИЧЕСКОЕ УДАЛЕНИЕ ЗУБА (ЭКСТРАКЦИЯ)
 */
export const EXTRACTION_CARE_PRESET: CarePresetData = {
	interventionType: "extraction",
	typeNameRu: "Хирургическое удаление зуба",
	defaultProcedureName: "Атравматичное удаление зуба с сохранением объема лунки",
	recommendations: [
		{
			id: "ext_gauze",
			icon: "🩸",
			title: "Удалить марлевый тампон через 20 минут",
			description:
				"Аккуратно сплюньте марлевый тампон через 20–30 минут после операции. Не держите его дольше, чтобы не инфицировать свежую лунку.",
			category: "immediate",
			badgeText: "Первые 20 мин",
		},
		{
			id: "ext_no_rinse",
			icon: "🚫",
			title: "КАТЕГОРИЧЕСКИ НЕ ПОЛОСКАТЬ РОТ 24 часа!",
			description:
				"Не полоскать рот и не вымывать кровяной сгусток из лунки! Сгусток — главная биологическая защита от микробов и основа заживления кости.",
			category: "restrictions",
			isUrgent: true,
			badgeText: "Критично",
		},
		{
			id: "ext_cold_pack",
			icon: "🧊",
			title: "Прикладывать холод в первые сутки",
			description:
				"Прикладывайте сухой лед/холод через полотенце к щеке снаружи по схеме: 15 минут холод — 20 минут перерыв. Повторять первые 4–6 часов для предотвращения отека.",
			category: "cold",
			badgeText: "Первые 24 часа",
		},
		{
			id: "ext_no_heat",
			icon: "🔥",
			title: "Исключить тепловые процедуры и спорт",
			description:
				"Запрещены горячие ванны, сауны, бани, солярий, горячие компрессы и физические тренировки на 3–5 дней, так как они вызывают кровотечение.",
			category: "restrictions",
			badgeText: "3–5 дней",
		},
		{
			id: "ext_soft_diet",
			icon: "🍲",
			title: "Мягкая, негорячая пища на здоровой стороне",
			description:
				"Первые 3 дня пища должна быть теплой (не горячей) и мягкой (пюре, супы, каши). Не жевать на стороне удаленного зуба. Исключить алкоголь и курение на 3 суток.",
			category: "food",
		},
		{
			id: "ext_baths",
			icon: "🍵",
			title: "Ротовые ванночки со 2-х суток",
			description:
				"Со 2-го дня делать ротовые ванночки (набрать раствор в рот, подержать 1 минуту, наклонив голову на сторону лунки, и аккуратно выплюнуть БЕЗ бульканья) с Хлоргексидином 0.05% или Мирамистином после еды.",
			category: "hygiene",
			badgeText: "Со 2-х суток",
		},
	],
	medications: [
		{
			id: "ext_med_painkiller",
			name: "Нимесил 100 мг (или Кеторол Экспресс 10 мг)",
			formRu: "Саше / Таблетки диспергируемые",
			dosageRu: "1 саше растворить в воде или 1 таб. под язык",
			frequencyRu: "2 раза в сутки после еды",
			durationRu: "2–3 дня при болевом синдроме",
			purposeRu: "Купирование боли и противоотечный эффект",
			icon: "💊",
			isImportant: true,
		},
		{
			id: "ext_med_antiseptic",
			name: "Хлоргексидина биглюконат 0.05% (или Мирамистин)",
			formRu: "Водный раствор для местного применения",
			dosageRu: "15–20 мл набрать в рот и подержать 60 секунд",
			frequencyRu: "3–4 раза в день после каждого приема пищи",
			durationRu: "5–7 дней (начиная со 2-х суток)",
			purposeRu: "Антисептическая защита лунки от патогенной микрофлоры",
			icon: "🍵",
		},
		{
			id: "ext_med_antibiotic",
			name: "Амоксиклав 1000 мг (при сложном удалении)",
			formRu: "Таблетки, диспергируемые или покрытые оболочкой",
			dosageRu: "1 таблетка (875 мг + 125 мг) внутрь",
			frequencyRu: "2 раза в сутки с интервалом 12 часов в начале еды",
			durationRu: "5 дней строго без перерывов",
			purposeRu: "Профилактика бактериальных осложнений и альвеолита",
			icon: "💊",
		},
	],
	warningSigns: [
		"Непрекращающееся кровотечение из лунки более 3 часов",
		"Нарастающий отек щеки на 3–4 сутки или затруднение открывания рта (тризм)",
		"Острая пульсирующая или стреляющая боль в ухо/висок",
		"Неприятный гнилостный запах изо рта или выпадение сгустка (сухая лунка)",
		"Повышение температуры тела выше 37.8°C",
	],
	dietaryRules: [
		"Не есть первые 2 часа после операции",
		"Пища мягкая, комнатной температуры, не острая, не кислая",
		"Жевать строго на противоположной стороне",
		"Категорический запрет на алкоголь (особенно при приеме антибиотиков) и курение 72 часа",
	],
	hygieneRules: [
		"В первый день зубы чистить аккуратно, обходя зону операции",
		"Со 2-го дня чистить зубы мягкой щеткой, зону лунки не травмировать",
		"Ротовые ванночки с антисептиком строго БЕЗ интенсивного полоскания",
	],
	activityRestrictions: [
		"Исключить спорт, подъем тяжестей, бег на 4–5 дней",
		"Исключить баню, сауну, горячую ванну на 5–7 дней",
		"Спать на приподнятой подушке для уменьшения утреннего отека",
	],
	nextVisitText: "Контрольный осмотр лунки через 3–5 дней (или по назначению врача)",
};

/**
 * 3. СИНУС-ЛИФТИНГ И КОСТНАЯ ПЛАСТИКА
 */
export const SINUS_LIFT_CARE_PRESET: CarePresetData = {
	interventionType: "sinus_lift",
	typeNameRu: "Синус-лифтинг и костная аугментация",
	defaultProcedureName: "Операция синус-лифтинга с аугментацией костным биоматериалом Bio-Oss",
	recommendations: [
		{
			id: "sinus_no_blowing",
			icon: "💨",
			title: "КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО СМОРКАТЬСЯ 14 дней!",
			description:
				"Категорический запрет на сморкание! При необходимости нос можно только аккуратно промокать салфеткой снаружи. Сморкание создает избыточное давление и смещает костный трансплантат.",
			category: "restrictions",
			isUrgent: true,
			badgeText: "СТРОГО 14 дней",
		},
		{
			id: "sinus_sneeze_open",
			icon: "🤧",
			title: "Чихать и кашлять ТОЛЬКО с открытым ртом",
			description:
				"Если хочется чихнуть или покашлять — делайте это исключительно с широко открытым ртом, не зажимая нос пальцами.",
			category: "restrictions",
			isUrgent: true,
			badgeText: "Важно",
		},
		{
			id: "sinus_no_straw",
			icon: "🥤",
			title: "Не пить через соломинку, не надувать щеки",
			description:
				"Запрещено пить через трубочку, надувать шарики или щеки, играть на духовых инструментах, нырять под воду.",
			category: "restrictions",
		},
		{
			id: "sinus_no_flights",
			icon: "✈️",
			title: "Запрет на авиаперелеты 14–21 день",
			description:
				"Перепады атмосферного давления в самолете могут повредить мембрану Шнайдера и нарушить приживление костного материала.",
			category: "restrictions",
			badgeText: "14–21 день",
		},
		{
			id: "sinus_cold",
			icon: "🧊",
			title: "Холод к подглазничной области",
			description:
				"Прикладывать сухой холод к щеке в проекции пазухи по 15 минут каждый час в первые сутки для минимизации послеоперационного отека.",
			category: "cold",
		},
		{
			id: "sinus_nasal_drops",
			icon: "💧",
			title: "Сосудосуживающие капли в нос 5 дней",
			description:
				"Закапывать спрей Називин / Ринонорм по 1 дозе в носовой ход на стороне операции 2 раза в день для обеспечения дренажа гайморовой пазухи.",
			category: "medication",
			badgeText: "5 дней",
		},
	],
	medications: [
		{
			id: "sinus_med_antibiotic",
			name: "Амоксиклав 1000 мг (или Ципролет 500 мг)",
			formRu: "Таблетки покрытые оболочкой",
			dosageRu: "1 таблетка (875 мг + 125 мг) внутрь",
			frequencyRu: "2 раза в сутки строго через 12 часов",
			durationRu: "7 дней обязательный курс",
			purposeRu: "Антибактериальная защита костного биоматериала в гайморовой пазухе",
			icon: "💊",
			isImportant: true,
		},
		{
			id: "sinus_med_drops",
			name: "Називин 0.05% спрей назальный",
			formRu: "Назальный дозированный спрей",
			dosageRu: "1 впрыскивание в ноздрю со стороны операции",
			frequencyRu: "2 раза в сутки (утром и вечером)",
			durationRu: "5 дней",
			purposeRu: "Снятие отека соустья гайморовой пазухи и свободный отток",
			icon: "💧",
		},
		{
			id: "sinus_med_antihistamine",
			name: "Цетрин 10 мг (или Лоратадин)",
			formRu: "Таблетки",
			dosageRu: "1 таблетка внутрь запивая водой",
			frequencyRu: "1 раз в сутки на ночь",
			durationRu: "5–7 дней",
			purposeRu: "Снятие аллергического и посттравматического отека слизистой",
			icon: "💊",
		},
		{
			id: "sinus_med_nimesil",
			name: "Нимесил 100 мг",
			formRu: "Саше",
			dosageRu: "1 саше в 100 мл воды",
			frequencyRu: "2 раза в день после еды",
			durationRu: "3–4 дня",
			purposeRu: "Обезболивание и снятие воспалительного отека",
			icon: "💊",
		},
	],
	warningSigns: [
		"Выделение гранул белого костного материала или гноя из носа",
		"Носовое кровотечение или обильные кровянистые выделения из ноздри",
		"Нарастающее чувство распирания или давления в области глаза и щеки",
		"Повышение температуры тела выше 37.5°C после 3-х суток",
		"Расхождение швов на десне",
	],
	dietaryRules: [
		"Мягкая, негорячая пища, пережевывание на противоположной стороне",
		"Исключить острую, перченую пищу, вызывающую раздражение слизистой носа",
		"Категорический запрет на алкоголь на весь период приема антибиотиков",
	],
	hygieneRules: [
		"Осторожная чистка зубов мягкой щеткой, обходя линию швов",
		"Ротовые ванночки с Хлоргексидином 0.05% со 2-х суток 3 раза в день",
		"Не трогать область швов языком или пальцами",
	],
	activityRestrictions: [
		"Категорический запрет на авиаперелеты на 14–21 день",
		"Запрет на ныряние, плавание, бани, сауны, горячие ванны на 21 день",
		"Исключить физические нагрузки, наклоны головы вниз и подъем тяжестей более 3 кг",
	],
	nextVisitText: "Контрольный осмотр через 3 дня, снятие швов через 10–14 дней",
};

/**
 * 4. ДЕНТАЛЬНАЯ ИМПЛАНТАЦИЯ
 */
export const IMPLANTATION_CARE_PRESET: CarePresetData = {
	interventionType: "implantation",
	typeNameRu: "Дентальная имплантация",
	defaultProcedureName: "Установка дентального имплантата с формирователем десны",
	recommendations: [
		{
			id: "imp_cold",
			icon: "🧊",
			title: "Прикладывать холод первые сутки",
			description:
				"Сухой лед через ткань к щеке по 15 минут с перерывами по 20 минут в течение первых 6–8 часов. Это снизит отек на 70%.",
			category: "cold",
			badgeText: "1-е сутки",
		},
		{
			id: "imp_no_chew",
			icon: "🔩",
			title: "Не жевать на стороне имплантата",
			description:
				"Исключить любое механическое давление на установленный имплантат и формирователь десны до полного приживления кости.",
			category: "food",
			isUrgent: true,
			badgeText: "Важно",
		},
		{
			id: "imp_soft_brush",
			icon: "🪥",
			title: "Щадящая чистка ультрамягкой щеткой",
			description:
				"Зубы чистить ультрамягкой щеткой (Curaprox Surgical), аккуратно обходя область швов и формирователя десны.",
			category: "hygiene",
		},
		{
			id: "imp_baths",
			icon: "🍵",
			title: "Антисептические ванночки со 2-х суток",
			description:
				"Ротовые ванночки с Хлоргексидином 0.05% или Мирамистином 3–4 раза в день после еды. Набрать в рот на 1 минуту, не булькать.",
			category: "hygiene",
			badgeText: "Со 2-х суток",
		},
		{
			id: "imp_no_smoking",
			icon: "🚫",
			title: "Исключить курение и алкоголь на 7–10 дней",
			description:
				"Никотин вызывает спазм капилляров десны и в 4 раза повышает риск отторжения имплантата (периимплантита).",
			category: "restrictions",
			badgeText: "7–10 дней",
		},
		{
			id: "imp_stitches",
			icon: "🧵",
			title: "Снятие швов через 10–14 дней",
			description:
				"Швы надежно фиксируют десну вокруг шейки имплантата. Снятие швов проводится на приеме через 10–14 дней абсолютно безболезненно.",
			category: "immediate",
		},
	],
	medications: [
		{
			id: "imp_med_antibiotic",
			name: "Амоксиклав 1000 мг (или Цифран СТ)",
			formRu: "Таблетки",
			dosageRu: "1 таблетка 2 раза в день во время еды",
			frequencyRu: "Каждые 12 часов",
			durationRu: "5–7 дней полный курс",
			purposeRu: "Антибактериальная защита зоны остеоинтеграции имплантата",
			icon: "💊",
			isImportant: true,
		},
		{
			id: "imp_med_painkiller",
			name: "Нимесил 100 мг (или Дексалгин 25 мг)",
			formRu: "Саше / Таблетки",
			dosageRu: "1 саше растворить в воде",
			frequencyRu: "1–2 раза в день после еды",
			durationRu: "3–4 дня при болях",
			purposeRu: "Обезболивание и снятие отека мягких тканей",
			icon: "💊",
		},
		{
			id: "imp_med_antiseptic",
			name: "Хлоргексидин 0.05% (или Пародонтоцид)",
			formRu: "Раствор для ротовых ванночек",
			dosageRu: "15 мл подержать во рту 1 минуту",
			frequencyRu: "3–4 раза в день после еды",
			durationRu: "10 дней до снятия швов",
			purposeRu: "Антисептическая санация линии швов",
			icon: "🍵",
		},
	],
	warningSigns: [
		"Подвижность имплантата или раскручивание формирователя десны",
		"Стойкое онемение губы, подбородка или языка более 24 часов",
		"Обильное непрекращающееся кровотечение из-под швов",
		"Нарастание отека и повышение температуры тела после 3-х суток",
		"Острая пульсирующая боль, не купируемая обезболивающими",
	],
	dietaryRules: [
		"Мягкая протертая пища комнатной температуры первые 7 дней",
		"Жевать строго на противоположной стороне",
		"Исключить твердые продукты (орехи, семечки, сухари, жесткое мясо)",
		"Категорический отказ от алкоголя на весь курс антибиотикотерапии",
	],
	hygieneRules: [
		"Чистить зубы мягкой щеткой 2 раза в день, не задевая формирователь десны",
		"Ротовые ванночки с Хлоргексидином после каждого приема пищи",
		"Не использовать ирригатор и электрические щетки в зоне имплантации 4 недели",
	],
	activityRestrictions: [
		"Исключить спорт, тяжелый физический труд и натуживание на 7–10 дней",
		"Исключить бани, сауны, солярии и горячие ванны на 14 дней",
		"Спать на противоположной стороне или спине с приподнятым изголовьем",
	],
	nextVisitText: "Контрольный осмотр через 3–5 дней, снятие швов через 10–14 дней",
};

/**
 * 5. ЭНДОДОНТИЯ (ЛЕЧЕНИЕ КАНАЛОВ)
 */
export const ENDODONTICS_CARE_PRESET: CarePresetData = {
	interventionType: "endodontics",
	typeNameRu: "Эндодонтическое лечение корневых каналов",
	defaultProcedureName: "Механическая и медикаментозная обработка корневых каналов под микроскопом",
	recommendations: [
		{
			id: "endo_numbness",
			icon: "⏳",
			title: "Не есть 2 часа до отхода анестезии",
			description:
				"Не принимать пищу до полного восстановления чувствительности, чтобы не прикусить щеку или язык.",
			category: "food",
			badgeText: "Первые 2 часа",
		},
		{
			id: "endo_temp_filling",
			icon: "🛡️",
			title: "Беречь временную пломбу",
			description:
				"Не жевать липкую и твердую пищу на стороне зуба с временной пломбой во избежание её повреждения и разгерметизации каналов.",
			category: "restrictions",
			badgeText: "Важно",
		},
		{
			id: "endo_bite_pain",
			icon: "🩹",
			title: "Допустима чувствительность при накусывании",
			description:
				"Болезненность при накусывании на зуб в течение 3–5 дней является нормальной физиологической реакцией периодонта на обработку каналов.",
			category: "immediate",
			badgeText: "3–5 дней",
		},
		{
			id: "endo_painkiller",
			icon: "💊",
			title: "Обезболивающее: Ибупрофен или Нимесил",
			description:
				"При выраженной болезненности примите Ибупрофен 400 мг или Нимесил 100 мг после еды.",
			category: "meds",
		},
		{
			id: "endo_crown_protection",
			icon: "👑",
			title: "Защитить зуб коронкой после лечения",
			description:
				"Депульпированный зуб становится хрупким. Для предотвращения раскола корня и удаления зуба обязательно покройте его коронкой или керамической накладкой.",
			category: "hygiene",
			badgeText: "Рекомендация",
		},
	],
	medications: [
		{
			id: "endo_med_ibuprofen",
			name: "Ибупрофен 400 мг (или Нимесил 100 мг)",
			formRu: "Таблетки покрытые оболочкой",
			dosageRu: "1 таблетка (400 мг) внутрь после еды",
			frequencyRu: "По требованию при боли (не более 3 раз в сутки)",
			durationRu: "2–3 дня",
			purposeRu: "Снятие постпломбировочной периодонтальной чувствительности",
			icon: "💊",
		},
	],
	warningSigns: [
		"Выпадение временной пломбы (срочно обратиться в клинику для герметизации!)",
		"Появление припухлости или отека десны/щеки в области зуба",
		"Острая пульсирующая боль, не снимающаяся обезболивающими",
		"Повышение температуры тела выше 37.5°C",
	],
	dietaryRules: [
		"Не есть 2 часа после визита",
		"Исключить твердые продукты (орехи, сухарики, леденцы, жевательные конфеты)",
		"Жевать на здоровой стороне до окончательной реставрации зуба",
	],
	hygieneRules: [
		"Чистить зубы 2 раза в день мягкой щеткой",
		"Аккуратно использовать зубную нить вокруг временной пломбы, не вытягивая её вверх",
	],
	activityRestrictions: [
		"Обычный режим без перегрузок в день приема",
	],
	nextVisitText: "Следующий этап эндодонтического лечения или постоянная реставрация по плану",
};

/**
 * 6. ОТБЕЛИВАНИЕ ЗУБОВ (ZOOM / FLASH)
 */
export const WHITENING_CARE_PRESET: CarePresetData = {
	interventionType: "whitening",
	typeNameRu: "Профессиональное отбеливание зубов",
	defaultProcedureName: "Клиническое фотоотбеливание эмали ZOOM 4 WhiteSpeed",
	recommendations: [
		{
			id: "white_diet",
			icon: "🥛",
			title: "Строгая «Белая диета» 48–72 часа!",
			description:
				"Исключить ВСЕ красящие продукты: кофе, черный и зеленый чай, красное вино, соки, колу, шоколад, свеклу, ягоды, томаты, соевый соус, карри, горчицу.",
			category: "nutrition",
			isUrgent: true,
			badgeText: "СТРОГО 72 часа",
		},
		{
			id: "white_no_smoke",
			icon: "🚭",
			title: "Полный отказ от курения и вейпа 48 часов",
			description:
				"Смолы и никотин мгновенно проникают в открытые микропоры эмали и сводят на нет результат отбеливания.",
			category: "restrictions",
			isUrgent: true,
			badgeText: "48 часов",
		},
		{
			id: "white_temp_sensitive",
			icon: "❄️",
			title: "Избегать резких температурных перепадов",
			description:
				"Исключить ледяную и очень горячую пищу и напитки в первые 2 дня из-за повышенной температурной чувствительности эмали.",
			category: "food",
		},
		{
			id: "white_remin_gel",
			icon: "🧴",
			title: "Реминерализующий гель при чувствительности",
			description:
				"Наносите гель Relief ACP или Tooth Mousse в индивидуальную каппу на 20–30 минут 1–2 раза в день для укрепления эмали и снятия прострелов.",
			category: "medication",
			badgeText: "Relief ACP",
		},
		{
			id: "white_sens_paste",
			icon: "🪥",
			title: "Паста для чувствительных зубов без абразивов",
			description:
				"Чистить зубы мягкой щеткой с пастой для чувствительных зубов (Sensodyne / Biorepair / Elmex) с низким индексом абразивности (RDA < 50).",
			category: "hygiene",
		},
	],
	medications: [
		{
			id: "white_med_gel",
			name: "Реминерализующий гель Relief ACP (или GC Tooth Mousse)",
			formRu: "Гель для аппликаций в каппе",
			dosageRu: "Небольшая полоска геля в каппу на верхний и нижний зубной ряд",
			frequencyRu: "1–2 раза в день по 20–30 минут после чистки зубов",
			durationRu: "5–7 дней",
			purposeRu: "Насыщение эмали кальцием и фосфатами, устранение гиперестезии",
			icon: "🧴",
			isImportant: true,
		},
		{
			id: "white_med_painkiller",
			name: "Ибупрофен 400 мг (при прострелах)",
			formRu: "Таблетки",
			dosageRu: "1 таблетка после еды",
			frequencyRu: "При выраженных прострелах в первые сутки",
			durationRu: "1–2 дня",
			purposeRu: "Купирование острой чувствительности нервных окончаний пульпы",
			icon: "💊",
		},
	],
	warningSigns: [
		"Острая непрекращающаяся пульсирующая боль более 48 часов",
		"Появление белых участков химического ожога на десне",
	],
	dietaryRules: [
		"Разрешено: белое мясо курицы/индейки, белая рыба, рис, творог, белые сыры, цветная капуста, вода, молоко",
		"Строго запрещено 72 ч: кофе, черный чай, кола, борщ, свекла, красное вино, соевый соус, цветные леденцы",
		"Женщинам: не использовать яркую цветную губную помаду первые 3 дня",
	],
	hygieneRules: [
		"Мягкая зубная щетка, неабразивная десенсибилизирующая зубная паста",
		"Отказ от отбеливающих паст с высокой абразивностью на 2 недели",
	],
	activityRestrictions: [
		"Ограничений по физической активности нет",
	],
	nextVisitText: "Контрольный осмотр и закрепление оттенка через 7–10 дней",
};

/**
 * 7. ОРТОДОНТИЯ (БРЕКЕТЫ И ЭЛАЙНЕРЫ)
 */
export const ORTHODONTICS_CARE_PRESET: CarePresetData = {
	interventionType: "orthodontics",
	typeNameRu: "Ортодонтическое лечение",
	defaultProcedureName: "Установка и плановая активация ортодонтической аппаратуры",
	recommendations: [
		{
			id: "ortho_wax",
			icon: "📐",
			title: "Использовать ортодонтический воск при натирании",
			description:
				"При натирании щеки или губы замком брекета разогрейте кусочек ортодонтического воска в пальцах и заклейте выступающий элемент.",
			category: "immediate",
			badgeText: "Орто-воск",
		},
		{
			id: "ortho_soft_food",
			icon: "🥣",
			title: "Мягкая пища первые 3–4 дня после активации",
			description:
				"В первые дни после смены дуги зубы испытывают тягу. Употребляйте мягкую пищу: крем-супы, смузи, йогурты, пюре, мягкую рыбу.",
			category: "food",
			badgeText: "3–4 дня",
		},
		{
			id: "ortho_no_sticky",
			icon: "🚫",
			title: "Исключить твердое, вязкое и липкое",
			description:
				"Запрещены ириски, жевательные резинки, грильяж, сухарики, попкорн. Твердые яблоки и морковь обязательно нарезать тонкими ломтиками.",
			category: "restrictions",
		},
		{
			id: "ortho_irrigator",
			icon: "🪥",
			title: "Ершики, монопучковая щетка и ирригатор",
			description:
				"Используйте V-образную ортодонтическую щетку, межзубные ершики и ирригатор после каждого приема пищи для предотвращения кариеса вокруг замков.",
			category: "hygiene",
			badgeText: "Гигиена",
		},
	],
	medications: [
		{
			id: "ortho_med_painkiller",
			name: "Парацетамол 500 мг или Ибупрофен 400 мг",
			formRu: "Таблетки",
			dosageRu: "1 таблетка после еды при чувстве сильного давления",
			frequencyRu: "1–2 раза в день в первые 2 суток",
			durationRu: "2 дня по необходимости",
			purposeRu: "Облегчение адаптации к ортодонтическому давлению",
			icon: "💊",
		},
	],
	warningSigns: [
		"Отклеивание брекета или смещение замка",
		"Колющий конец ортодонтической дуги, травмирующий щеку",
		"Потеря эластической цепочки или лигатуры",
	],
	dietaryRules: [
		"Не откусывать твердые продукты передними зубами",
		"Исключить тянущиеся и липкие конфеты, чипсы и орехи",
	],
	hygieneRules: [
		"Чистить зубы после КАЖДОГО приема пищи ортодонтическим набором",
		"Ежедневно использовать ирригатор полости рта с теплой водой",
	],
	activityRestrictions: [
		"При контактных видах спорта использовать защитную ортодонтическую каппу",
	],
	nextVisitText: "Плановая активация ортодонтической дуги через 4–6 недель",
};

/**
 * 8. ПРОФЕССИОНАЛЬНАЯ ГИГИЕНА И AIR-FLOW
 */
export const HYGIENE_CARE_PRESET: CarePresetData = {
	interventionType: "hygiene",
	typeNameRu: "Профессиональная чистка и гигиена",
	defaultProcedureName: "Комплексная гигиена Air-Flow Clinpro + ультразвуковой скейлинг + фторирование",
	recommendations: [
		{
			id: "hyg_diet",
			icon: "☕",
			title: "«Прозрачная диета» на 24 часа",
			description:
				"Воздержитесь от употребления кофе, крепкого чая, красного вина, ягод, свеклы и табака в течение суток, пока восстанавливается пелликула зуба.",
			category: "nutrition",
			badgeText: "24 часа",
		},
		{
			id: "hyg_new_brush",
			icon: "🪥",
			title: "Заменить зубную щетку на новую мягкую",
			description:
				"Обязательно смените старую зубную щетку на новую с мягкой густой щетиной (например, Curaprox 5460), чтобы не переносить старые бактерии на чистую эмаль.",
			category: "hygiene",
			badgeText: "Новая щетка",
		},
		{
			id: "hyg_gum_gel",
			icon: "🌿",
			title: "Противовоспалительный гель для десен",
			description:
				"При повышенной чувствительности или легкой кровоточивости десны наносите гель Холисал или Асепта на краевую десну 2 раза в день 3 дня.",
			category: "medication",
		},
	],
	medications: [
		{
			id: "hyg_med_cholisal",
			name: "Стоматологический гель Холисал (или Асепта)",
			formRu: "Гель стоматологический",
			dosageRu: "Полоска геля 0.5 см на десну чистым пальцем легкими массирующими движениями",
			frequencyRu: "2–3 раза в день после еды и на ночь",
			durationRu: "3–5 дней",
			purposeRu: "Антисептическое, обезболивающее и регенерирующее действие на десну",
			icon: "🌿",
		},
	],
	warningSigns: [
		"Кровоточивость десен, продолжающаяся более 48 часов",
		"Острая боль или выраженный отек межзубных сосочков",
	],
	dietaryRules: [
		"Не употреблять красящие напитки и продукты 24 часа",
		"Не курить первые 12–24 часа",
	],
	hygieneRules: [
		"Использовать новую мягкую зубную щетку",
		"Ежедневно использовать флосс и межзубные ершики",
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
	const doctorName = input.doctorName || "Кузнецов П. С.";
	const doctorSpecialty = input.doctorSpecialty || "Врач-стоматолог терапевт";
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
		whatsAppLines.push(`${rec.icon} *${rec.title}*`);
		whatsAppLines.push(`${rec.description}`);
		whatsAppLines.push("");
	}

	if (medications.length > 0) {
		whatsAppLines.push(`💊 *Схема приема медикаментов:*`);
		for (const med of medications) {
			whatsAppLines.push(`• *${med.name}*: ${med.dosageRu} (${med.frequencyRu}, курс ${med.durationRu})`);
		}
		whatsAppLines.push("");
	}

	whatsAppLines.push(`⚠️ *Тревожные признаки:*`);
	for (const w of warningSigns) {
		whatsAppLines.push(`• ${w}`);
	}
	whatsAppLines.push("");
	whatsAppLines.push(`📞 Телефон клиники: ${clinicPhone}`);
	whatsAppLines.push(`🚨 Горячая линия дежурного врача 24/7: ${clinicEmergencyPhone}`);
	whatsAppLines.push("");
	whatsAppLines.push(`📱 Электронная памятка в личном кабинете: https://dente.ru/memo/${memoId}`);
	whatsAppLines.push("Желаем вам скорейшего комфортного восстановления! 🦷✨");

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

export function generateCareMemoPrintHtml(memo: PatientCareMemo): string {
	const recsHtml = memo.recommendations
		.map(
			(rec) => `
      <div style="margin-bottom: 10px; padding: 8px 12px; background: #f8fafc; border-left: 4px solid ${rec.isUrgent ? "#ef4444" : "#0d9488"}; border-radius: 4px;">
        <div style="font-weight: 700; color: #0f172a; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
          <span>${rec.icon} ${rec.title}</span>
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
          💊 Режим и схема приёма медикаментов:
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
                  ${med.icon} ${med.name}<br><span style="font-weight: 400; color: #64748b; font-size: 10px;">${med.formRu}</span>
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
        <div class="clinic-sub" style="font-weight: 800; color: #b91c1c;">🚨 Горячая линия дежурного врача (круглосуточно): ${memo.clinicEmergencyPhone}</div>
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
      📋 Персональные рекомендации и правила ухода:
    </div>

    ${recsHtml}
    ${medsHtml}

    <div class="danger-box">
      <div style="font-weight: 800; color: #b91c1c; font-size: 11.5px; display: flex; align-items: center; gap: 6px;">
        ⚠️ Когда необходимо срочно связаться с лечащим или дежурным врачом:
      </div>
      <ul style="margin: 4px 0 0 0; padding-left: 18px; font-size: 11px; color: #7f1d1d; line-height: 1.3;">
        ${warningsHtml}
      </ul>
    </div>

    <div style="margin-top: 10px; font-size: 11px; color: #334155; background: #f8fafc; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
      📅 <strong>Следующий плановый визит:</strong> ${memo.nextVisitRecommendedText}
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
		const toothStr = toothNumber ? ` (зуб №${toothNumber})` : "";
		return {
			friendlyName: `Обезболивание (анестезия)${toothStr}`,
			categoryGroup: "anesthesia",
			categoryGroupRu: "Обезболивание (анестезия)",
			groupIcon: "💉",
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
		const toothStr = toothNumber ? ` (зуб №${toothNumber})` : "";
		return {
			friendlyName: lower.includes("кт") || lower.includes("томограф")
				? "3D-компьютерная томография (КТ)"
				: `Снимок зуба (радиовизиография)${toothStr}`,
			categoryGroup: "xray",
			categoryGroupRu: "Снимки и диагностика",
			groupIcon: "📷",
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
		const toothStr = toothNumber ? ` (зуб №${toothNumber})` : "";
		return {
			friendlyName: `Лечение кариеса и световая пломба${toothStr}`,
			categoryGroup: "caries",
			categoryGroupRu: "Лечение кариеса и пломбирование",
			groupIcon: "🦷",
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
			groupIcon: "🪥",
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
		const toothStr = toothNumber ? ` (позиция ${toothNumber})` : "";
		return {
			friendlyName: `Установка дентального имплантата${toothStr}`,
			categoryGroup: "implant",
			categoryGroupRu: "Дентальная имплантация",
			groupIcon: "🔩",
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
		const toothStr = toothNumber ? ` (зуб №${toothNumber})` : "";
		return {
			friendlyName: `Ортопедическая коронка/реставрация${toothStr}`,
			categoryGroup: "crowns",
			categoryGroupRu: "Коронки и реставрации",
			groupIcon: "👑",
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
		const toothStr = toothNumber ? ` (зуб №${toothNumber})` : "";
		return {
			friendlyName: `Бережное хирургическое вмешательство${toothStr}`,
			categoryGroup: "surgery",
			categoryGroupRu: "Хирургическое лечение",
			groupIcon: "🩹",
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
			groupIcon: "📐",
			plainDescriptionRu:
				"Плановая активация ортодонтической аппаратуры для создания ровной красивой улыбки",
		};
	}

	// 9. Прочее
	const toothStr = toothNumber ? ` (зуб №${toothNumber})` : "";
	return {
		friendlyName: `${rawName}${toothStr}`,
		categoryGroup: "other",
		categoryGroupRu: "Стоматологические процедуры",
		groupIcon: "✨",
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
		`Здравствуйте, уважаемый(ая) ${patientName}! 👋`,
		"",
		`Детализация вашего счета в клинике ${clinicName}:`,
		`Итого к оплате: *${breakdown.totalAmountRubFormatted}*`,
		"",
		"Понятная расшифровка процедур без сложной латыни:",
	];

	for (const grp of breakdown.groups) {
		lines.push("");
		lines.push(`${grp.groupIcon} *${grp.categoryGroupRu}* — ${grp.subtotalRub.toLocaleString("ru-RU")} ₽ (${grp.percentageOfTotal}%)`);
		for (const it of grp.items) {
			const toothStr = it.toothNumber ? ` [Зуб №${it.toothNumber}]` : "";
			lines.push(`  • ${it.friendlyName}${toothStr}: ${it.totalRub.toLocaleString("ru-RU")} ₽`);
		}
	}

	lines.push("");
	lines.push(`📞 По любым вопросам звоните: ${clinicPhone}`);
	lines.push("Спасибо за доверие к нашей клинике! ✨");

	return lines.join("\n");
}
