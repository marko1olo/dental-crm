/**
 * ============================================================================
 * SANPIN 3.3686-21 CSO BATCH PRESETS & STATUTORY CLASSIFIERS
 * Нормативные справочники, классификаторы химических проб (Азопирам, Фенолфталеин,
 * Судан III), сроки сохранения стерильности упаковок, 5-точечные термопрофили
 * автоклавов и каталог бактерицидных рециркуляторов (Р 3.5.1904-04 / Приказ 1030).
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. CSO TRACEABILITY LIFECYCLE STAGES
// ─────────────────────────────────────────────────────────────────────────────

export type CsoLifecycleStage =
	| "wash_disinfection"
	| "azopyram_control"
	| "kraft_packing"
	| "autoclave_sterilization"
	| "storage_release";

export interface CsoStageDefinition {
	readonly id: CsoLifecycleStage;
	readonly stepNumber: number;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
	readonly statutoryAuthorityRu: string;
	readonly requiredSignOffRoleRu: string;
}

export const CSO_LIFECYCLE_STAGES: readonly CsoStageDefinition[] = [
	{
		id: "wash_disinfection",
		stepNumber: 1,
		nameRu: "Дезинфекция и предстерилизационная очистка (ПСО)",
		shortLabelRu: "Мойка и ПСО",
		descriptionRu:
			"Замачивание в растворе дезинфицирующего средства, ультразвуковая кавитационная мойка, ополаскивание проточной и обессоленной водой, сушка горячим воздухом при 85°C.",
		statutoryAuthorityRu: "СанПиН 3.3686-21 пп. 3578–3583, МУ-287-113",
		requiredSignOffRoleRu: "Медицинская сестра ЦСО",
	},
	{
		id: "azopyram_control",
		stepNumber: 2,
		nameRu: "Химический контроль качества ПСО (Азопирамовая и фенолфталеиновая пробы)",
		shortLabelRu: "Контроль ПСО (1%)",
		descriptionRu:
			"Выборочный контроль 1% обработанной партии (не менее 3–5 единиц каждого вида) на скрытую кровь (азопирам), щелочные ПАВ (фенолфталеин) и масляные пленки (Судан III).",
		statutoryAuthorityRu: "СанПиН 3.3686-21 п. 3584, Форма № 366/у",
		requiredSignOffRoleRu: "Медицинская сестра ЦСО / Старшая медсестра",
	},
	{
		id: "kraft_packing",
		stepNumber: 3,
		nameRu: "Упаковка в крафт-пакеты / рулоны и маркировка 2D DataMatrix",
		shortLabelRu: "Упаковка и маркировка",
		descriptionRu:
			"Фасовка высушенного инструментария в крафт-пакеты, термосвариваемые комбинированные пакеты или биксы, закладка химических индикаторов 4/5 класса, печать термоэтикеток с 2D кодом.",
		statutoryAuthorityRu: "ГОСТ ISO 11607-1, СанПиН 3.3686-21 п. 3586",
		requiredSignOffRoleRu: "Медицинская сестра ЦСО",
	},
	{
		id: "autoclave_sterilization",
		stepNumber: 4,
		nameRu: "Паровая / сухожаровая стерилизация (Контроль 5 точек камеры)",
		shortLabelRu: "Автоклавирование (5 точек)",
		descriptionRu:
			"Стерилизация при 134°C (2.1 бар) или 121°C (1.1 бар) с контролем физических параметров в 5 точках рабочей камеры, оценка изменения цвета индикаторов-интеграторов 5 класса.",
		statutoryAuthorityRu: "ГОСТ ISO 17665-1, СанПиН 3.3686-21, Форма № 257/у",
		requiredSignOffRoleRu: "Медицинская сестра стерилизационной",
	},
	{
		id: "storage_release",
		stepNumber: 5,
		nameRu: "Хранение на стерильном складе и выдача в клинические кабинеты",
		shortLabelRu: "Выдача и списание",
		descriptionRu:
			"Размещение в чистой зоне стерилизационной, мониторинг предельных сроков годности, сканирование штрихкодов при выдаче в лечебные кабинеты и привязка к ЭМК пациента (Форма 043/у).",
		statutoryAuthorityRu: "СанПиН 3.3686-21 пп. 3591–3596",
		requiredSignOffRoleRu: "Старшая медицинская сестра / Врач-стоматолог",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. CHEMICAL TESTING REAGENTS & PSO VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export type ChemicalPsoReagentId =
	| "azopyram"
	| "phenolphthalein"
	| "sudan_iii"
	| "complex_azopyram_phenolphthalein";

export interface ChemicalPsoReagentDefinition {
	readonly id: ChemicalPsoReagentId;
	readonly nameRu: string;
	readonly targetContaminantRu: string;
	readonly reagentFormulationRu: string;
	readonly positiveReactionVisualRu: string;
	readonly negativeReactionVisualRu: string;
	readonly maxReactionWaitSeconds: number;
	readonly statutoryActionOnFailureRu: string;
}

export const CHEMICAL_PSO_REAGENTS: readonly ChemicalPsoReagentDefinition[] = [
	{
		id: "azopyram",
		nameRu: "Азопирамовая проба (на скрытую кровь и гемоглобин)",
		targetContaminantRu: "Гемоглобин, остатки эритроцитов, пероксидазы, следы ржавчины",
		reagentFormulationRu:
			"Исходный раствор азопирама (амидопирин 10% + анилин гидрохлорид 0.15% в 96% этиловом спирте) смешивается с 3% перекисью водорода H2O2 в равных пропорциях 1:1 перед применением",
		positiveReactionVisualRu:
			"Быстрое сине-фиолетовое (сиреневое) окрашивание в течение 60 секунд",
		negativeReactionVisualRu:
			"Окрашивание отсутствует (жидкость бесцветная или слабо-желтоватая)",
		maxReactionWaitSeconds: 60,
		statutoryActionOnFailureRu:
			"БРАК ПСО: Вся партия инструментария подлежит повторной дезинфекции, мойке и контролю!",
	},
	{
		id: "phenolphthalein",
		nameRu: "Фенолфталеиновая проба (на щелочность моющих средств)",
		targetContaminantRu:
			"Остаточные количества щелочных компонентов синтетических моющих средств (pH > 8.5)",
		reagentFormulationRu: "1% спиртовой раствор фенолфталеина в 95% этаноле",
		positiveReactionVisualRu:
			"Розовое / малиновое окрашивание в местах контакта реактива с металлом",
		negativeReactionVisualRu: "Окрашивание полностью отсутствует",
		maxReactionWaitSeconds: 30,
		statutoryActionOnFailureRu:
			"БРАК ОПОЛАСКИВАНИЯ: Вся партия подлежит повторному промыванию проточной и дистиллированной водой!",
	},
	{
		id: "sudan_iii",
		nameRu: "Проба с Суданом III (на масляные и липидные загрязнения)",
		targetContaminantRu:
			"Остатки смазочных масел турбинных наконечников, микромоторов и липидные пленки",
		reagentFormulationRu: "Раствор красителя Судан III в 70% этиловом спирте",
		positiveReactionVisualRu: "Желто-розовые капли и окрашенные масляные пятна",
		negativeReactionVisualRu: "Равномерное стекание без фиксации красителя",
		maxReactionWaitSeconds: 45,
		statutoryActionOnFailureRu:
			"БРАК ОБЕЗЖИРИВАНИЯ: Наконечники и инструменты подлежат повторной очистке в УЗ-ванне с обезжиривающим составом!",
	},
	{
		id: "complex_azopyram_phenolphthalein",
		nameRu: "Комплексный приемочный контроль СанПиН (Азопирам + Фенолфталеин)",
		targetContaminantRu: "Скрытая кровь + остаточная щелочность моющих средств",
		reagentFormulationRu: "Одновременная постановка азопирамовой и фенолфталеиновой проб",
		positiveReactionVisualRu: "Появление окраски хотя бы по одной из двух проб",
		negativeReactionVisualRu: "Обе пробы строго отрицательные",
		maxReactionWaitSeconds: 60,
		statutoryActionOnFailureRu:
			"Партия бракуется с указанием конкретной непрошедшей пробы (кровь либо моющее средство).",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. APPROVED DETERGENTS & PSO PROTOCOLS
// ─────────────────────────────────────────────────────────────────────────────

export interface DetergentProtocolDefinition {
	readonly id: string;
	readonly brandNameRu: string;
	readonly activeGroupRu: "Ферментные" | "ЧАС + Альдегиды" | "Амины" | "ЧАС" | "ЧАС + Амины" | "Кислородсодержащие";
	readonly recommendedConcentrationPercent: number;
	readonly exposureMinutes: number;
	readonly solutionTemperatureCelsius: number;
	readonly requiresPhenolphthaleinCheck: boolean;
	readonly isEnzymeDigestive: boolean;
	readonly ultrasonicAllowed: boolean;
}

export const APPROVED_CSO_DETERGENTS: readonly DetergentProtocolDefinition[] = [
	{
		id: "biolot",
		brandNameRu: "Биолот (порошок)",
		activeGroupRu: "Ферментные",
		recommendedConcentrationPercent: 0.5,
		exposureMinutes: 15,
		solutionTemperatureCelsius: 40,
		requiresPhenolphthaleinCheck: true,
		isEnzymeDigestive: true,
		ultrasonicAllowed: true,
	},
	{
		id: "blanidas_active_enzym",
		brandNameRu: "Бланидас Актив Энзим",
		activeGroupRu: "Ферментные",
		recommendedConcentrationPercent: 0.5,
		exposureMinutes: 10,
		solutionTemperatureCelsius: 25,
		requiresPhenolphthaleinCheck: false,
		isEnzymeDigestive: true,
		ultrasonicAllowed: true,
	},
	{
		id: "alaminol",
		brandNameRu: "Аламинол",
		activeGroupRu: "ЧАС + Альдегиды",
		recommendedConcentrationPercent: 1.5,
		exposureMinutes: 30,
		solutionTemperatureCelsius: 20,
		requiresPhenolphthaleinCheck: true,
		isEnzymeDigestive: false,
		ultrasonicAllowed: true,
	},
	{
		id: "optimax_pro",
		brandNameRu: "Оптимакс Про",
		activeGroupRu: "Амины",
		recommendedConcentrationPercent: 1.0,
		exposureMinutes: 15,
		solutionTemperatureCelsius: 20,
		requiresPhenolphthaleinCheck: true,
		isEnzymeDigestive: false,
		ultrasonicAllowed: true,
	},
	{
		id: "brilliant_classic",
		brandNameRu: "Бриллиант Классик",
		activeGroupRu: "ЧАС",
		recommendedConcentrationPercent: 1.0,
		exposureMinutes: 15,
		solutionTemperatureCelsius: 20,
		requiresPhenolphthaleinCheck: true,
		isEnzymeDigestive: false,
		ultrasonicAllowed: true,
	},
	{
		id: "avansept",
		brandNameRu: "Авансепт",
		activeGroupRu: "ЧАС + Амины",
		recommendedConcentrationPercent: 1.0,
		exposureMinutes: 15,
		solutionTemperatureCelsius: 20,
		requiresPhenolphthaleinCheck: true,
		isEnzymeDigestive: false,
		ultrasonicAllowed: true,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. PACKAGING MATERIALS & STATUTORY SHELF-LIFE (SANPIN 3.3686-21)
// ─────────────────────────────────────────────────────────────────────────────

export type CsoPackagingMaterialId =
	| "kraft_paper_clips"
	| "kraft_self_adhesive"
	| "laminated_flat_heat_sealed"
	| "laminated_gusseted_heat_sealed"
	| "double_laminated_heat_sealed"
	| "tyvek_plasma"
	| "metal_bix_filter"
	| "metal_bix_no_filter"
	| "unpacked_tray";

export interface CsoPackagingMaterialDefinition {
	readonly id: CsoPackagingMaterialId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly statutoryShelfLifeDays: number;
	readonly closureMethodRu: string;
	readonly sanpinNormRefRu: string;
	readonly suitableForSteamAutoclave: boolean;
	readonly suitableForDryHeat: boolean;
}

export const CSO_PACKAGING_MATERIALS: readonly CsoPackagingMaterialDefinition[] = [
	{
		id: "kraft_paper_clips",
		nameRu: "Бумага мешочная непропитанная / крепированная (скрепки)",
		shortLabelRu: "Крафт-бумага со скрепками",
		statutoryShelfLifeDays: 3,
		closureMethodRu: "Металлические скрепки / подгиб краев",
		sanpinNormRefRu: "СанПиН 3.3686-21: хранение не более 3 суток",
		suitableForSteamAutoclave: true,
		suitableForDryHeat: true,
	},
	{
		id: "kraft_self_adhesive",
		nameRu: "Пакеты бумажные самоклеящиеся (Винар, Медтест, DGM)",
		shortLabelRu: "Крафт-пакет самоклеящийся",
		statutoryShelfLifeDays: 30,
		closureMethodRu: "Липкий самоклеящийся клапан с защитной полосой",
		sanpinNormRefRu: "СанПиН 3.3686-21 / Инструкция изготовителя: до 30–50 суток (норма DENTE: 30 сут)",
		suitableForSteamAutoclave: true,
		suitableForDryHeat: true,
	},
	{
		id: "laminated_flat_heat_sealed",
		nameRu: "Пакеты/рулоны комбинированные термосвариваемые плоские (бумага + полимер)",
		shortLabelRu: "Комби-пакет термосварной (плоский)",
		statutoryShelfLifeDays: 180,
		closureMethodRu: "Термошов импульсного запаивателя шириной не менее 8-10 мм",
		sanpinNormRefRu: "ГОСТ ISO 11607 / МУ-287-113: сохранение стерильности до 180 суток (6 мес)",
		suitableForSteamAutoclave: true,
		suitableForDryHeat: false,
	},
	{
		id: "laminated_gusseted_heat_sealed",
		nameRu: "Пакеты/рулоны комбинированные со складкой термосвариваемые",
		shortLabelRu: "Комби-пакет со складкой (объемный)",
		statutoryShelfLifeDays: 180,
		closureMethodRu: "Термосварной шов шириной не менее 10 мм",
		sanpinNormRefRu: "ГОСТ ISO 11607: до 180 суток",
		suitableForSteamAutoclave: true,
		suitableForDryHeat: false,
	},
	{
		id: "double_laminated_heat_sealed",
		nameRu: "Двойной комбинированный термосвариваемый пакет (двойная барьерная система)",
		shortLabelRu: "Двойной комби-пакет (1 год)",
		statutoryShelfLifeDays: 365,
		closureMethodRu: "Двойной независимый термосварной шов",
		sanpinNormRefRu: "ГОСТ ISO 11607-1 (система двойного барьера): до 365 суток (1 год)",
		suitableForSteamAutoclave: true,
		suitableForDryHeat: false,
	},
	{
		id: "tyvek_plasma",
		nameRu: "Пакеты из безворсового нетканого материала Тайвек (Tyvek / Mylar)",
		shortLabelRu: "Тайвек (плазма/пар)",
		statutoryShelfLifeDays: 365,
		closureMethodRu: "Термосварной шов",
		sanpinNormRefRu: "ГОСТ ISO 11607: до 12 месяцев",
		suitableForSteamAutoclave: true,
		suitableForDryHeat: false,
	},
	{
		id: "metal_bix_filter",
		nameRu: "Стерилизационная коробка (бикс) с антибактериальным фильтром (КСПФ / ШБФ)",
		shortLabelRu: "Бикс с фильтром",
		statutoryShelfLifeDays: 20,
		closureMethodRu: "Фиксаторы крышки и текстильный/бумажный фильтр",
		sanpinNormRefRu: "СанПиН 3.3686-21: сохранение стерильности 20 суток",
		suitableForSteamAutoclave: true,
		suitableForDryHeat: false,
	},
	{
		id: "metal_bix_no_filter",
		nameRu: "Стерилизационная коробка (бикс) без фильтра (с внутренней выстилкой простыней)",
		shortLabelRu: "Бикс без фильтра",
		statutoryShelfLifeDays: 3,
		closureMethodRu: "Закрытие поясного замка бикса сразу после стерилизации",
		sanpinNormRefRu: "СанПиН 3.3686-21: сохранение стерильности 3 суток",
		suitableForSteamAutoclave: true,
		suitableForDryHeat: false,
	},
	{
		id: "unpacked_tray",
		nameRu: "Открытый инструментальный лоток без упаковки",
		shortLabelRu: "Без упаковки (немедленно)",
		statutoryShelfLifeDays: 0,
		closureMethodRu: "Открытое размещение",
		sanpinNormRefRu: "СанПиН 3.3686-21: используется непосредственно после стерилизации (до 6 ч под УФ)",
		suitableForSteamAutoclave: true,
		suitableForDryHeat: true,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. AUTOCLAVE CHAMBER 5-POINT THERMAL GEOMETRY & MODES
// ─────────────────────────────────────────────────────────────────────────────

export type ChamberPointLocation =
	| "center"
	| "top_left"
	| "top_right"
	| "bottom_left"
	| "bottom_right_drain";

export interface ChamberPointDefinition {
	readonly id: ChamberPointLocation;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly isCriticalColdestZone: boolean;
}

export const CHAMBER_5_POINTS: readonly ChamberPointDefinition[] = [
	{
		id: "center",
		nameRu: "Точка 1: Геометрический центр камеры",
		descriptionRu: "Центральная корзина/лоток, сердцевина стерилизуемой массы",
		isCriticalColdestZone: false,
	},
	{
		id: "top_left",
		nameRu: "Точка 2: Верхний левый угол",
		descriptionRu: "Верхняя полка ближе к дверце/парогенератору",
		isCriticalColdestZone: false,
	},
	{
		id: "top_right",
		nameRu: "Точка 3: Верхний правый угол",
		descriptionRu: "Верхняя полка дальнего сектора",
		isCriticalColdestZone: false,
	},
	{
		id: "bottom_left",
		nameRu: "Точка 4: Нижний левый угол",
		descriptionRu: "Нижняя полка у фронтальной стенки",
		isCriticalColdestZone: false,
	},
	{
		id: "bottom_right_drain",
		nameRu: "Точка 5: Нижняя зона слива конденсата (Дренаж)",
		descriptionRu:
			"Нижняя точка камеры у стока отработанного пара/конденсата — наиболее критическая холодная зона риска неполного прогрева",
		isCriticalColdestZone: true,
	},
];

export type AutoclaveCycleProgramId =
	| "steam_134_universal"
	| "steam_134_prion"
	| "steam_121_thermolabile"
	| "dry_heat_180"
	| "dry_heat_160";

export interface AutoclaveProgramDefinition {
	readonly id: AutoclaveCycleProgramId;
	readonly programNameRu: string;
	readonly methodRu: "Паровой (Автоклав B)" | "Воздушный (Сухожар)";
	readonly nominalTemperatureCelsius: number;
	readonly minAllowedTempCelsius: number;
	readonly maxAllowedTempCelsius: number;
	readonly nominalPressureBar: number;
	readonly minPressureBar: number;
	readonly maxPressureBar: number;
	readonly plateauExposureMinutes: number;
	readonly totalCycleMinutesEstimated: number;
	readonly maxPointDeltaCelsius: number;
	readonly requiredIndicatorClass: string;
	readonly typicalItemsRu: readonly string[];
}

export const AUTOCLAVE_PROGRAMS: readonly AutoclaveProgramDefinition[] = [
	{
		id: "steam_134_universal",
		programNameRu: "Универсальный B-класс 134°C (Упакованные инструменты)",
		methodRu: "Паровой (Автоклав B)",
		nominalTemperatureCelsius: 134.0,
		minAllowedTempCelsius: 134.0,
		maxAllowedTempCelsius: 136.0,
		nominalPressureBar: 2.15,
		minPressureBar: 2.05,
		maxPressureBar: 2.30,
		plateauExposureMinutes: 5,
		totalCycleMinutesEstimated: 35,
		maxPointDeltaCelsius: 2.0,
		requiredIndicatorClass: "Класс 5 (Интегратор) / Класс 4",
		typicalItemsRu: [
			"Хирургический стоматологический инструмент",
			"Эндодонтические файлы и наборы",
			"Зеркала, зонды, пинцеты, гладилки",
			"Стоматологические наконечники (автоклавируемые)",
		],
	},
	{
		id: "steam_134_prion",
		programNameRu: "Прионный / Усиленный режим 134°C (18 минут выдержки)",
		methodRu: "Паровой (Автоклав B)",
		nominalTemperatureCelsius: 134.0,
		minAllowedTempCelsius: 134.0,
		maxAllowedTempCelsius: 136.5,
		nominalPressureBar: 2.20,
		minPressureBar: 2.10,
		maxPressureBar: 2.35,
		plateauExposureMinutes: 18,
		totalCycleMinutesEstimated: 50,
		maxPointDeltaCelsius: 2.0,
		requiredIndicatorClass: "Класс 5 (Интегратор) + Биологический контроль",
		typicalItemsRu: [
			"Имплантологические и костнопластические наборы",
			"Инструментарий после пациентов высокого инфекционного риска",
		],
	},
	{
		id: "steam_121_thermolabile",
		programNameRu: "Щадящий режим 121°C (Термолабильные изделия и оптика)",
		methodRu: "Паровой (Автоклав B)",
		nominalTemperatureCelsius: 121.0,
		minAllowedTempCelsius: 121.0,
		maxAllowedTempCelsius: 123.5,
		nominalPressureBar: 1.15,
		minPressureBar: 1.05,
		maxPressureBar: 1.25,
		plateauExposureMinutes: 20,
		totalCycleMinutesEstimated: 45,
		maxPointDeltaCelsius: 2.0,
		requiredIndicatorClass: "Класс 5 (Интегратор 121°C)",
		typicalItemsRu: [
			"Изделия из резины, силикона, термостойких полимеров",
			"Оптические световоды и наконечники ламп",
			"Аспирационные канюли и ретракторы",
		],
	},
	{
		id: "dry_heat_180",
		programNameRu: "Сухожаровой режим 180°C (60 минут)",
		methodRu: "Воздушный (Сухожар)",
		nominalTemperatureCelsius: 180.0,
		minAllowedTempCelsius: 180.0,
		maxAllowedTempCelsius: 185.0,
		nominalPressureBar: 0.0,
		minPressureBar: 0.0,
		maxPressureBar: 0.0,
		plateauExposureMinutes: 60,
		totalCycleMinutesEstimated: 110,
		maxPointDeltaCelsius: 3.0,
		requiredIndicatorClass: "Индикатор воздушной стерилизации 4/5 класса (180/60)",
		typicalItemsRu: [
			"Цельнометаллический инструмент без спаек и резиновых элементов",
			"Боры, фрезы, металлические лотки",
		],
	},
	{
		id: "dry_heat_160",
		programNameRu: "Сухожаровой режим 160°C (150 минут)",
		methodRu: "Воздушный (Сухожар)",
		nominalTemperatureCelsius: 160.0,
		minAllowedTempCelsius: 160.0,
		maxAllowedTempCelsius: 165.0,
		nominalPressureBar: 0.0,
		minPressureBar: 0.0,
		maxPressureBar: 0.0,
		plateauExposureMinutes: 150,
		totalCycleMinutesEstimated: 210,
		maxPointDeltaCelsius: 3.0,
		requiredIndicatorClass: "Индикатор воздушной стерилизации (160/150)",
		typicalItemsRu: ["Стеклянная посуда, стеклянные шприцы, сухие порошки"],
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. BACTERICIDAL AIR RECIRCULATORS & UV FLEET CATALOG
// ─────────────────────────────────────────────────────────────────────────────

export interface RecirculatorModelSpec {
	readonly id: string;
	readonly brandNameRu: string;
	readonly fullCatalogTitleRu: string;
	readonly manufacturerRu: string;
	readonly deviceCategory: "closed_recirculator" | "open_irradiator" | "combined";
	readonly lampModelRu: string;
	readonly lampCount: number;
	readonly lampNominalWatts: number;
	readonly nominalLifespanHours: number;
	readonly airOutputM3PerHour: number;
	readonly operatesInPeoplePresence: boolean;
	readonly recommendedRoomVolumeM3: number;
}

export const RECIRCULATOR_FLEET_CATALOG: readonly RecirculatorModelSpec[] = [
	{
		id: "dezar_4",
		brandNameRu: "Дезар-4 (ОРУБн-3-3-«КРОНТ»)",
		fullCatalogTitleRu: "Облучатель-рециркулятор медицинский настенный ОРУБн-3-3-«КРОНТ» (Дезар-4)",
		manufacturerRu: "АО «КРОНТ-М», Россия",
		deviceCategory: "closed_recirculator",
		lampModelRu: "TUV 15W Philips / HNS 15W Osram (безозоновые)",
		lampCount: 3,
		lampNominalWatts: 15,
		nominalLifespanHours: 8000,
		airOutputM3PerHour: 100,
		operatesInPeoplePresence: true,
		recommendedRoomVolumeM3: 50,
	},
	{
		id: "dezar_7",
		brandNameRu: "Дезар-7 (ОРУБп-3-5-«КРОНТ»)",
		fullCatalogTitleRu: "Облучатель-рециркулятор медицинский передвижной ОРУБп-3-5-«КРОНТ» (Дезар-7)",
		manufacturerRu: "АО «КРОНТ-М», Россия",
		deviceCategory: "closed_recirculator",
		lampModelRu: "TUV 15W Philips",
		lampCount: 5,
		lampNominalWatts: 15,
		nominalLifespanHours: 8000,
		airOutputM3PerHour: 120,
		operatesInPeoplePresence: true,
		recommendedRoomVolumeM3: 100,
	},
	{
		id: "sibest_45",
		brandNameRu: "Сибэст-45",
		fullCatalogTitleRu: "Облучатель-рециркулятор бактерицидный Сибэст-45 настенный",
		manufacturerRu: "ООО «Сибэст», Россия",
		deviceCategory: "closed_recirculator",
		lampModelRu: "TUV 15W",
		lampCount: 2,
		lampNominalWatts: 15,
		nominalLifespanHours: 9000,
		airOutputM3PerHour: 60,
		operatesInPeoplePresence: true,
		recommendedRoomVolumeM3: 45,
	},
	{
		id: "sibest_100",
		brandNameRu: "Сибэст-100",
		fullCatalogTitleRu: "Облучатель-рециркулятор бактерицидный Сибэст-100 передвижной",
		manufacturerRu: "ООО «Сибэст», Россия",
		deviceCategory: "closed_recirculator",
		lampModelRu: "TUV 30W / LTC 30W",
		lampCount: 3,
		lampNominalWatts: 30,
		nominalLifespanHours: 9000,
		airOutputM3PerHour: 100,
		operatesInPeoplePresence: true,
		recommendedRoomVolumeM3: 90,
	},
	{
		id: "obn_150_open",
		brandNameRu: "ОБН-150 (Открытый облучатель)",
		fullCatalogTitleRu: "Облучатель бактерицидный настенный открытого типа ОБН-150",
		manufacturerRu: "Россия",
		deviceCategory: "open_irradiator",
		lampModelRu: "УФ-лампа ДБ-30 / TUV 30W",
		lampCount: 2,
		lampNominalWatts: 30,
		nominalLifespanHours: 8000,
		airOutputM3PerHour: 150,
		operatesInPeoplePresence: false,
		recommendedRoomVolumeM3: 60,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. DENTAL SET PRESETS & CLINICAL TOOLSETS
// ─────────────────────────────────────────────────────────────────────────────

export interface CsoToolSetPreset {
	readonly id: string;
	readonly nameRu: string;
	readonly isSurgicalCritical: boolean;
	readonly defaultPackagingId: CsoPackagingMaterialId;
	readonly typicalItemsRu: readonly string[];
}

export const CSO_TOOLSET_PRESETS: readonly CsoToolSetPreset[] = [
	{
		id: "therapeutic_exam_set",
		nameRu: "Базовый терапевтический смотровой набор",
		isSurgicalCritical: false,
		defaultPackagingId: "kraft_self_adhesive",
		typicalItemsRu: [
			"Зеркало стоматологическое с ручкой",
			"Зонд угловой стоматологический",
			"Пинцет анатомический зубной",
			"Гладилка двухсторонняя серповидная",
			"Экскаватор стоматологический №2",
			"Штопфер-гладилка шаровидная",
		],
	},
	{
		id: "surgical_extraction_set",
		nameRu: "Хирургический набор для простого и сложного удаления зубов",
		isSurgicalCritical: true,
		defaultPackagingId: "laminated_flat_heat_sealed",
		typicalItemsRu: [
			"Щипцы экстракционные универсальные",
			"Элеватор прямой Бейна",
			"Элеватор угловой левый/правый",
			"Ложка кюретажная острая двусторонняя",
			"Распатор костный",
			"Иглодержатель микрохирургический",
			"Ножницы хирургические остроконечные",
			"Рукоятка скальпеля №3",
		],
	},
	{
		id: "implantology_surgical_tray",
		nameRu: "Имплантологический хирургический протокол (стерильный кассетный лоток)",
		isSurgicalCritical: true,
		defaultPackagingId: "laminated_gusseted_heat_sealed",
		typicalItemsRu: [
			"Набор пилотных и финишных фрез имплантационной системы",
			"Параллелометры и глубиномеры",
			"Динамометрический ключ-трещотка",
			"Имплантовод машинный и ручной",
			"Адаптеры формирователей десны",
			"Хирургический пинцет с замком",
		],
	},
	{
		id: "endodontic_niti_files",
		nameRu: "Эндодонтический набор Ni-Ti вращающихся и ручных файлов",
		isSurgicalCritical: false,
		defaultPackagingId: "kraft_self_adhesive",
		typicalItemsRu: [
			"Набор ротационных Ni-Ti файлов ProTaper Gold (SX, S1, S2, F1, F2, F3)",
			"Ручные K-файлы № 10, 15, 20, 25",
			"Спредер пальцевой для латеральной конденсации",
			"Плаггер для вертикальной компакции гуттаперчи",
			"Эндодонтическая металлическая линейка с миллиметровой шкалой",
		],
	},
	{
		id: "rotary_burs_block",
		nameRu: "Алмазные и твердосплавные боры (эндо/орто/терапия)",
		isSurgicalCritical: false,
		defaultPackagingId: "kraft_self_adhesive",
		typicalItemsRu: [
			"Боры алмазные турбинные конусные и пламевидные (5 шт)",
			"Боры твердосплавные фиссурные и шаровидные (4 шт)",
			"Твердосплавная фреза для препарирования коронок",
			"Полировочные головки Enhance и дискодержатель",
		],
	},
	{
		id: "handpieces_turbine_micromotor",
		nameRu: "Стоматологический турбинный и угловой наконечник со спреем",
		isSurgicalCritical: true,
		defaultPackagingId: "laminated_flat_heat_sealed",
		typicalItemsRu: [
			"Турбинный наконечник с кнопочным зажимом и оптикой",
			"Угловой микромоторный наконечник 1:1",
			"Переходник быстросъемный со встроенным клапаном обратного всасывания",
		],
	},
];
