/**
 * patientCarePresets.ts
 *
 * Клинические протоколы и пресеты рекомендаций по уходу после стоматологических вмешательств:
 * кариес, удаление, синус-лифтинг, имплантация, эндодонтия, отбеливание, ортодонтия, гигиена.
 */

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
