/**
 * ============================================================================
 * SANPIN 3.3686-21 & R 3.5.1904-04 STATUTORY REGISTERS & PRESETS
 * Нормативные классификаторы, методики химических проб ПСО, регламенты работы
 * бактерицидных установок, графики генеральных уборок и реестр дезсредств.
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. КОНТРОЛЬ ПРЕДСТЕРИЛИЗАЦИОННОЙ ОЧИСТКИ (ПСО, ФОРМА № 366/у)
// ─────────────────────────────────────────────────────────────────────────────

export type PsoChemicalTestId = "azopyram" | "phenolphthalein" | "sudan_iii" | "both_standard";

export interface PsoChemicalTestDefinition {
	readonly id: PsoChemicalTestId;
	readonly nameRu: string;
	readonly shortNameRu: string;
	readonly targetPollutantRu: string;
	readonly reagentCompositionRu: string;
	readonly positiveReactionRu: string;
	readonly negativeReactionRu: string;
	readonly observationTimeSeconds: number;
	readonly sanpinRequirementRu: string;
}

export const SANPIN_PSO_CHEMICAL_TESTS: readonly PsoChemicalTestDefinition[] = [
	{
		id: "azopyram",
		nameRu: "Азопирамовая проба (на скрытую кровь и гемоглобин)",
		shortNameRu: "Азопирам",
		targetPollutantRu: "Гемоглобин, остатки крови, пероксидазы, ржавчина",
		reagentCompositionRu: "Раствор азопирама (амидопирин + анилин гидрохлорид) + 3% перекись водорода в соотношении 1:1",
		positiveReactionRu: "Сине-фиолетовое / сиреневое окрашивание в течение 60 секунд",
		negativeReactionRu: "Окрашивание отсутствует (раствор бесцветный / слегка желтоватый)",
		observationTimeSeconds: 60,
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3584: контроль 1% от партии (не менее 3–5 единиц каждого наименования)",
	},
	{
		id: "phenolphthalein",
		nameRu: "Фенолфталеиновая проба (на остаточную щелочность моющих средств)",
		shortNameRu: "Фенолфталеин",
		targetPollutantRu: "Остатки щелочных компонентов синтетических моющих средств (pH > 8.5)",
		reagentCompositionRu: "1% спиртовой раствор фенолфталеина",
		positiveReactionRu: "Розовое / малиновое окрашивание в месте нанесения реактива",
		negativeReactionRu: "Окрашивание отсутствует",
		observationTimeSeconds: 30,
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3584: обязательный контроль при использовании щелочных моющих средств",
	},
	{
		id: "sudan_iii",
		nameRu: "Проба с Суданом III (на остаточные жировые и масляные загрязнения)",
		shortNameRu: "Судан III",
		targetPollutantRu: "Масляные смазки наконечников, липидные пленки, жировые загрязнения",
		reagentCompositionRu: "Раствор красителя Судан III в 70% этиловом спирте",
		positiveReactionRu: "Желто-розовые капли и окрашенные жировые пятна",
		negativeReactionRu: "Равномерное стекание без окрашивания жировых включений",
		observationTimeSeconds: 45,
		sanpinRequirementRu: "СанПиН 3.3686-21: контроль качества очистки вращающихся инструментов и смазанных наконечников",
	},
	{
		id: "both_standard",
		nameRu: "Комплексный контроль СанПиН (Азопирам + Фенолфталеин)",
		shortNameRu: "Азопирам + Фенолфталеин",
		targetPollutantRu: "Скрытая кровь + остаточная щелочность моющих средств",
		reagentCompositionRu: "Азопирам с 3% H2O2 + 1% спиртовой фенолфталеин",
		positiveReactionRu: "Любое положительное окрашивание хотя бы по одной пробе",
		negativeReactionRu: "Обе пробы строго отрицательные",
		observationTimeSeconds: 60,
		sanpinRequirementRu: "Золотой стандарт ежедневного контроля качества ПСО в стоматологии",
	},
];

export interface DentalInstrumentCategoryDefinition {
	readonly id: string;
	readonly categoryNameRu: string;
	readonly defaultBatchSize: number;
	readonly typicalItemsRu: readonly string[];
	readonly criticalSurfacesRu: string;
}

export const DENTAL_INSTRUMENT_CATEGORIES: readonly DentalInstrumentCategoryDefinition[] = [
	{
		id: "therapeutic_kit",
		categoryNameRu: "Терапевтический смотровой инструментарий",
		defaultBatchSize: 100,
		typicalItemsRu: [
			"Стоматологические зеркала с ручкой",
			"Зонды угловые и пуговчатые",
			"Пинцеты анатомические стоматологические",
			"Гладилки двухсторонние и штопферы",
			"Экскаваторы стоматологические",
		],
		criticalSurfacesRu: "Резьбовые соединения зеркал, насечки пинцетов, бороздки штопферов",
	},
	{
		id: "endodontic_kit",
		categoryNameRu: "Эндодонтический инструментарий",
		defaultBatchSize: 60,
		typicalItemsRu: [
			"К-файлы, Н-файлы, римеры (ручные)",
			"Машинные Ni-Ti вращающиеся файлы (Protaper, WaveOne)",
			"Спредеры и плаггеры для гуттаперчи",
			"Каналонаполнители Лентуло",
			"Эндодонтические линейки и пинцеты",
		],
		criticalSurfacesRu: "Спиральные витки файлов, микроуглубления режущих граней",
	},
	{
		id: "surgical_kit",
		categoryNameRu: "Хирургический инструментарий",
		defaultBatchSize: 40,
		typicalItemsRu: [
			"Щипцы экстракционные (верхние и нижние)",
			"Элеваторы прямые, штыковидные и угловые (Бейна, Леклюза)",
			"Кюретажные ложки Лукаса",
			"Распаторы костные",
			"Иглодержатели и хирургические ножницы",
			"Рукоятки скальпелей",
		],
		criticalSurfacesRu: "Замковые соединения щипцов, ретенционные насечки щечек, шарниры",
	},
	{
		id: "periodontal_kit",
		categoryNameRu: "Пародонтологический инструментарий",
		defaultBatchSize: 30,
		typicalItemsRu: [
			"Кюреты Грейси (1/2, 7/8, 11/12, 13/14)",
			"Скейлеры серповидные и мотыгообразные",
			"Пародонтологические зонды ВОЗ с миллиметровой градуировкой",
			"Ультразвуковые насадки для скейлинга",
		],
		criticalSurfacesRu: "Внутренний ирригационный канал насадок, рабочие желобки кюрет",
	},
	{
		id: "rotary_burs_kit",
		categoryNameRu: "Вращающийся режущий инструмент (Боры и фрезы)",
		defaultBatchSize: 120,
		typicalItemsRu: [
			"Боры алмазные турбинные и угловые",
			"Боры твердосплавные фиссурные и шаровидные",
			"Твердосплавные фрезы для обработки пластмасс",
			"Дискодержатели (мандрели) и полировочные головки",
		],
		criticalSurfacesRu: "Межзубцовое пространство фрез, алмазное напыление рабочей части",
	},
	{
		id: "handpieces_kit",
		categoryNameRu: "Стоматологические наконечники",
		defaultBatchSize: 20,
		typicalItemsRu: [
			"Турбинные наконечники с кнопочным зажимом",
			"Угловые микромоторные наконечники",
			"Прямые хирургические наконечники",
			"Переходники и быстросъемные муфты",
		],
		criticalSurfacesRu: "Внутренние водо-воздушные каналы спрея, цанговый зажим бора",
	},
];

export interface DetergentCatalogItem {
	readonly id: string;
	readonly brandNameRu: string;
	readonly manufacturerRu: string;
	readonly activeIngredientsRu: string;
	readonly recommendedPsoConcentrationPercent: number;
	readonly recommendedPsoExposureMinutes: number;
	readonly recommendedTempCelsius: number;
	readonly requiresPhenolphthaleinCheck: boolean;
	readonly isEnzymatic: boolean;
}

export const SANPIN_DETERGENTS_CATALOG: readonly DetergentCatalogItem[] = [
	{
		id: "biolot",
		brandNameRu: "Биолот (порошок)",
		manufacturerRu: "Россия",
		activeIngredientsRu: "Фермент протеаза + алкилсульфаты (ПАВ)",
		recommendedPsoConcentrationPercent: 0.5,
		recommendedPsoExposureMinutes: 15,
		recommendedTempCelsius: 40,
		requiresPhenolphthaleinCheck: true,
		isEnzymatic: true,
	},
	{
		id: "alaminol",
		brandNameRu: "Аламинол",
		manufacturerRu: "ФГУП «ГНЦ «НИОПИК», Россия",
		activeIngredientsRu: "Алкилдиметилбензиламмоний хлорид (ЧАС 5%) + Глутаровый альдегид (8%)",
		recommendedPsoConcentrationPercent: 1.5,
		recommendedPsoExposureMinutes: 30,
		recommendedTempCelsius: 20,
		requiresPhenolphthaleinCheck: true,
		isEnzymatic: false,
	},
	{
		id: "brilliant_classic",
		brandNameRu: "Бриллиант Классик",
		manufacturerRu: "ООО «ЦСП Химмедпром», Россия",
		activeIngredientsRu: "Алкилдиметилбензиламмоний хлорид (ЧАС) + Глутаровый альдегид",
		recommendedPsoConcentrationPercent: 1.0,
		recommendedPsoExposureMinutes: 15,
		recommendedTempCelsius: 20,
		requiresPhenolphthaleinCheck: true,
		isEnzymatic: false,
	},
	{
		id: "optimax_pro",
		brandNameRu: "Оптимакс Про",
		manufacturerRu: "ООО «Интерсэн-плюс», Россия",
		activeIngredientsRu: "N,N-бис(3-аминопропил)додециламин (третичный амин 5%) + ПАВ",
		recommendedPsoConcentrationPercent: 1.0,
		recommendedPsoExposureMinutes: 15,
		recommendedTempCelsius: 20,
		requiresPhenolphthaleinCheck: true,
		isEnzymatic: false,
	},
	{
		id: "blanidas_active",
		brandNameRu: "Бланидас Актив Энзим",
		manufacturerRu: "Лизоформ, Германия",
		activeIngredientsRu: "Комплекс ферментов (протеаза, амилаза, липаза) + ЧАС",
		recommendedPsoConcentrationPercent: 0.5,
		recommendedPsoExposureMinutes: 10,
		recommendedTempCelsius: 25,
		requiresPhenolphthaleinCheck: false,
		isEnzymatic: true,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. РЕЦИРКУЛЯТОРЫ И БАКТЕРИЦИДНЫЕ УСТАНОВКИ (Р 3.5.1904-04 / САНПИН 3.3686-21)
// ─────────────────────────────────────────────────────────────────────────────

export interface UvRecirculatorModelDefinition {
	readonly id: string;
	readonly brandNameRu: string;
	readonly fullModelNameRu: string;
	readonly manufacturerRu: string;
	readonly deviceType: "recirculator_closed" | "irradiator_open" | "combined";
	readonly lampCount: number;
	readonly lampTypeRu: string;
	readonly lampPowerWatts: number;
	readonly standardLampLifetimeHours: number;
	readonly productivityM3PerHour: number;
	readonly allowedInPresenceOfPeople: boolean;
	readonly recommendedRoomVolumeM3: number;
}

export const UV_RECIRCULATOR_MODELS: readonly UvRecirculatorModelDefinition[] = [
	{
		id: "dezar_4",
		brandNameRu: "Дезар-4 (ОРУБн-3-3-«КРОНТ»)",
		fullModelNameRu: "Облучатель-рециркулятор настенный ОРУБн-3-3-«КРОНТ» (Дезар-4)",
		manufacturerRu: "АО «КРОНТ-М», Россия",
		deviceType: "recirculator_closed",
		lampCount: 3,
		lampTypeRu: "УФ-лампа безозоновая TUV 15W Philips / HNS 15W Osram",
		lampPowerWatts: 15,
		standardLampLifetimeHours: 8000,
		productivityM3PerHour: 100,
		allowedInPresenceOfPeople: true,
		recommendedRoomVolumeM3: 50,
	},
	{
		id: "dezar_7",
		brandNameRu: "Дезар-7 (ОРУБп-3-5-«КРОНТ» передвижной)",
		fullModelNameRu: "Облучатель-рециркулятор передвижной ОРУБп-3-5-«КРОНТ» (Дезар-7)",
		manufacturerRu: "АО «КРОНТ-М», Россия",
		deviceType: "recirculator_closed",
		lampCount: 5,
		lampTypeRu: "УФ-лампа безозоновая TUV 15W Philips",
		lampPowerWatts: 15,
		standardLampLifetimeHours: 8000,
		productivityM3PerHour: 120,
		allowedInPresenceOfPeople: true,
		recommendedRoomVolumeM3: 100,
	},
	{
		id: "sibest_sunny",
		brandNameRu: "Сибэст-45",
		fullModelNameRu: "Облучатель-рециркулятор бактерицидный Сибэст-45 настенный",
		manufacturerRu: "ООО «Сибэст», Россия",
		deviceType: "recirculator_closed",
		lampCount: 2,
		lampTypeRu: "УФ-лампа TUV 15W",
		lampPowerWatts: 15,
		standardLampLifetimeHours: 9000,
		productivityM3PerHour: 60,
		allowedInPresenceOfPeople: true,
		recommendedRoomVolumeM3: 45,
	},
	{
		id: "obn_150_open",
		brandNameRu: "ОБН-150 (Открытый облучатель)",
		fullModelNameRu: "Облучатель бактерицидный настенный ОБН-150 (2х30 Вт)",
		manufacturerRu: "Россия",
		deviceType: "irradiator_open",
		lampCount: 2,
		lampTypeRu: "УФ-лампа ДБ-30 / TUV 30W",
		lampPowerWatts: 30,
		standardLampLifetimeHours: 8000,
		productivityM3PerHour: 150,
		allowedInPresenceOfPeople: false,
		recommendedRoomVolumeM3: 60,
	},
];

export interface RoomSanitaryCategoryDefinition {
	readonly categoryCode: "I" | "II" | "III" | "IV";
	readonly categoryNameRu: string;
	readonly targetBactericidalEfficiencyPercent: number;
	readonly roomExamplesRu: readonly string[];
	readonly maxAllowedMicrobialCountCfuPerM3: number;
}

export const ROOM_SANITARY_CATEGORIES: readonly RoomSanitaryCategoryDefinition[] = [
	{
		categoryCode: "I",
		categoryNameRu: "Категория I — Особо стерильные помещения",
		targetBactericidalEfficiencyPercent: 99.9,
		roomExamplesRu: ["Операционная хирургической стоматологии", "Предоперационная"],
		maxAllowedMicrobialCountCfuPerM3: 200,
	},
	{
		categoryCode: "II",
		categoryNameRu: "Категория II — Стерильные помещения",
		targetBactericidalEfficiencyPercent: 99.0,
		roomExamplesRu: [
			"Кабинет терапевтической стоматологии",
			"Кабинет ортопедической стоматологии",
			"Стерилизационная (ЦСО)",
			"Кабинет гигиены и профилактики",
		],
		maxAllowedMicrobialCountCfuPerM3: 500,
	},
	{
		categoryCode: "III",
		categoryNameRu: "Категория III — Условно-стерильные помещения",
		targetBactericidalEfficiencyPercent: 95.0,
		roomExamplesRu: ["Кабинет рентгенодиагностики (КЛКТ, ОПТГ)", "Зуботехническая лаборатория"],
		maxAllowedMicrobialCountCfuPerM3: 750,
	},
	{
		categoryCode: "IV",
		categoryNameRu: "Категория IV — Вспомогательные помещения",
		targetBactericidalEfficiencyPercent: 90.0,
		roomExamplesRu: ["Помещение временного накопления отходов", "Санузлы для персонала и пациентов"],
		maxAllowedMicrobialCountCfuPerM3: 1000,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. ГЕНЕРАЛЬНЫЕ УБОРКИ (САНПИН 3.3686-21 РАЗДЕЛ IV)
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneralCleaningPresetDefinition {
	readonly roomType: "surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility";
	readonly roomTypeTitleRu: string;
	readonly statutoryFrequencyDays: number;
	readonly sanpinNormRefRu: string;
	readonly standardDisinfectantRu: string;
	readonly standardConcentrationPercent: number;
	readonly standardExposureMinutes: number;
	readonly standardUvIrradiationMinutes: number;
	readonly standardVentilationMinutes: number;
	readonly mandatoryStepsRu: readonly string[];
}

export const GENERAL_CLEANING_PRESETS: readonly GeneralCleaningPresetDefinition[] = [
	{
		roomType: "surgical",
		roomTypeTitleRu: "Хирургический стоматологический кабинет / Операционная",
		statutoryFrequencyDays: 7, // Еженедельно (1 раз в 7 дней)
		sanpinNormRefRu: "СанПиН 3.3686-21 п. 3524: генеральная уборка операционного блока проводится не реже 1 раза в 7 дней",
		standardDisinfectantRu: "Аламинол (или Оптимакс Про)",
		standardConcentrationPercent: 1.5,
		standardExposureMinutes: 60,
		standardUvIrradiationMinutes: 120, // 2 часа УФ
		standardVentilationMinutes: 20,
		mandatoryStepsRu: [
			"Освобождение кабинета от расходных материалов и медикаментов",
			"Мытье поверхностей, стен на всю высоту, стоматологической установки мыльно-содовым/дезинфицирующим раствором",
			"Нанесение рабочего раствора дезсредства методом двукратного протирания с интервалом 15 мин",
			"Выдержка экспозиции 60 минут в закрытом помещении",
			"Смывание дезинфектанта стерильной ветошью с водопроводной/дистиллированной водой",
			"Бактерицидное УФ-облучение открытыми и закрытыми лампами в течение 120 мин",
			"Проветривание помещения не менее 20 минут",
		],
	},
	{
		roomType: "therapeutic",
		roomTypeTitleRu: "Терапевтический / Ортопедический кабинет",
		statutoryFrequencyDays: 7, // Еженедельно
		sanpinNormRefRu: "СанПиН 3.3686-21 п. 3524: генеральная уборка лечебных кабинетов проводится 1 раз в 7 дней",
		standardDisinfectantRu: "Бриллиант Классик (или Аламинол)",
		standardConcentrationPercent: 1.0,
		standardExposureMinutes: 60,
		standardUvIrradiationMinutes: 60,
		standardVentilationMinutes: 15,
		mandatoryStepsRu: [
			"Очистка светильников, жалюзи, радиаторов отопления и мебели",
			"Обеззараживание поверхностей стоматологической установки, плевательницы, гидроблока",
			"Двукратное протирание стен на высоту не менее 2 метров и пола рабочим раствором дезсредства",
			"Экспозиция 60 минут",
			"Смывание чистой водой",
			"УФ-обеззараживание рециркулятором/облучателем 60 минут",
			"Проветривание 15 минут",
		],
	},
	{
		roomType: "cso_sterile",
		roomTypeTitleRu: "Центральное стерилизационное отделение (ЦСО)",
		statutoryFrequencyDays: 7,
		sanpinNormRefRu: "СанПиН 3.3686-21: асептический режим ЦСО",
		standardDisinfectantRu: "Оптимакс Про 1.5%",
		standardConcentrationPercent: 1.5,
		standardExposureMinutes: 60,
		standardUvIrradiationMinutes: 90,
		standardVentilationMinutes: 15,
		mandatoryStepsRu: [
			"Раздельная обработка 'грязной' зоны мойки и 'чистой' зоны упаковки/стерилизаторов",
			"Очистка ультразвуковых ванн, дистилляторов, запечатывающих устройств",
			"Дезинфекция рабочих столов из нержавеющей стали, полок и стеллажей хранения крафт-пакетов",
			"Экспозиция и смыв",
			"УФ-облучение 90 минут",
			"Проветривание",
		],
	},
	{
		roomType: "xray",
		roomTypeTitleRu: "Кабинет рентгенодиагностики (КЛКТ / ОПТГ / Визиограф)",
		statutoryFrequencyDays: 7,
		sanpinNormRefRu: "СанПиН 2.6.1.1192-03 и СанПиН 3.3686-21",
		standardDisinfectantRu: "Бриллиант Классик 1.0%",
		standardConcentrationPercent: 1.0,
		standardExposureMinutes: 30,
		standardUvIrradiationMinutes: 60,
		standardVentilationMinutes: 15,
		mandatoryStepsRu: [
			"Обесточивание рентгенаппаратуры перед влажной уборкой",
			"Дезинфекция защитных свинцовых фартуков, воротников и позиционеров датчиков",
			"Протирание поверхностей аппарата, пульта управления, кушетки, стен и пола",
			"УФ-облучение 60 минут",
		],
	},
	{
		roomType: "utility",
		roomTypeTitleRu: "Вспомогательные помещения и комната медотходов",
		statutoryFrequencyDays: 30, // 1 раз в месяц
		sanpinNormRefRu: "СанПиН 3.3686-21 и СанПиН 2.1.3684-21",
		standardDisinfectantRu: "Аламинол 3.0%",
		standardConcentrationPercent: 3.0,
		standardExposureMinutes: 60,
		standardUvIrradiationMinutes: 60,
		standardVentilationMinutes: 30,
		mandatoryStepsRu: [
			"Дезинфекция баков, контейнеров и холодильных камер для отходов класса Б",
			"Мытье стен и пола с концентрированным дезраствором",
			"УФ-облучение и вентиляция",
		],
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. ЖУРНАЛ УЧЕТА ПОЛУЧЕНИЯ И РАСХОДОВАНИЯ ДЕЗСРЕДСТВ (РОСПОТРЕБНАДЗОР)
// ─────────────────────────────────────────────────────────────────────────────

export interface DisinfectantStockItemDefinition {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly formRu: "liquid_concentrate" | "powder" | "tablets" | "ready_spray" | "antiseptic_liquid";
	readonly unitRu: "л" | "кг" | "шт";
	readonly packagingVolumeRu: string;
	readonly activeGroupRu: "ЧАС" | "Амины" | "Альдегиды" | "Хлорсодержащие" | "Спирты" | "Кислородсодержащие";
	readonly applicationScopesRu: readonly (
		| "surfaces_routine"
		| "surfaces_general"
		| "instruments_pso"
		| "instruments_high_level_disinfection"
		| "impressions_dental"
		| "medical_waste_class_b"
		| "skin_antiseptic"
	)[];
	readonly monthlyMinStockRequired: number;
}

export const DISINFECTANTS_REGULATORY_REGISTRY: readonly DisinfectantStockItemDefinition[] = [
	{
		id: "alaminol_5l",
		tradeNameRu: "Аламинол (канистра 5 л)",
		formRu: "liquid_concentrate",
		unitRu: "л",
		packagingVolumeRu: "5.0 л",
		activeGroupRu: "Альдегиды",
		applicationScopesRu: ["surfaces_general", "instruments_pso", "medical_waste_class_b"],
		monthlyMinStockRequired: 15.0,
	},
	{
		id: "brilliant_classic_1l",
		tradeNameRu: "Бриллиант Классик (флакон 1 л)",
		formRu: "liquid_concentrate",
		unitRu: "л",
		packagingVolumeRu: "1.0 л",
		activeGroupRu: "ЧАС",
		applicationScopesRu: ["surfaces_routine", "surfaces_general", "impressions_dental"],
		monthlyMinStockRequired: 8.0,
	},
	{
		id: "optimax_pro_1l",
		tradeNameRu: "Оптимакс Про (флакон 1 л)",
		formRu: "liquid_concentrate",
		unitRu: "л",
		packagingVolumeRu: "1.0 л",
		activeGroupRu: "Амины",
		applicationScopesRu: ["instruments_pso", "surfaces_general", "impressions_dental"],
		monthlyMinStockRequired: 6.0,
	},
	{
		id: "ecobreeze_spray_075",
		tradeNameRu: "Экобриз Окси (спрей 0.75 л для экспресс-дезинфекции)",
		formRu: "ready_spray",
		unitRu: "л",
		packagingVolumeRu: "0.75 л",
		activeGroupRu: "Спирты",
		applicationScopesRu: ["surfaces_routine"],
		monthlyMinStockRequired: 6.0,
	},
	{
		id: "desiscrub_antiseptic_1l",
		tradeNameRu: "Дезискраб (кожный антисептик с дозатором 1 л)",
		formRu: "antiseptic_liquid",
		unitRu: "л",
		packagingVolumeRu: "1.0 л",
		activeGroupRu: "Спирты",
		applicationScopesRu: ["skin_antiseptic"],
		monthlyMinStockRequired: 10.0,
	},
];
