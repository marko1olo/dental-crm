/**
 * ============================================================================
 * SANPIN 3.3686-21 PSO CHEMICAL TESTS, INSTRUMENT CATEGORIES & DETERGENTS PRESETS
 * Методики химических проб ПСО (азопирам, фенолфталеин, Судан III), типовые наборы
 * стоматологических инструментов и каталог разрешенных моюще-дезинфицирующих средств.
 * ============================================================================
 */

import type {
	DentalInstrumentCategoryDefinition,
	DetergentCatalogItem,
	PsoChemicalTestDefinition,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. КОНТРОЛЬ ПРЕДСТЕРИЛИЗАЦИОННОЙ ОЧИСТКИ (ПСО, ФОРМА № 366/у)
// ─────────────────────────────────────────────────────────────────────────────

export const SANPIN_PSO_CHEMICAL_TESTS: readonly PsoChemicalTestDefinition[] = [
	{
		id: "azopyram",
		nameRu: "Азопирамовая проба (на скрытую кровь и гемоглобин)",
		shortNameRu: "Азопирам",
		targetPollutantRu: "Гемоглобин, остатки крови, пероксидазы, ржавчина",
		reagentCompositionRu:
			"Раствор азопирама (амидопирин + анилин гидрохлорид) + 3% перекись водорода в соотношении 1:1",
		positiveReactionRu: "Сине-фиолетовое / сиреневое окрашивание в течение 60 секунд",
		negativeReactionRu: "Окрашивание отсутствует (раствор бесцветный / слегка желтоватый)",
		observationTimeSeconds: 60,
		sanpinRequirementRu:
			"СанПиН 3.3686-21 п. 3584: контроль 1% от партии (не менее 3–5 единиц каждого наименования)",
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
		sanpinRequirementRu:
			"СанПиН 3.3686-21 п. 3584: обязательный контроль при использовании щелочных моющих средств",
	},
	{
		id: "sudan_iii",
		nameRu: "Проба с Суданом III (на остаточные жировые и масляные загрязнения)",
		shortNameRu: "Судан III",
		targetPollutantRu:
			"Масляные смазки наконечников, липидные пленки, жировые загрязнения",
		reagentCompositionRu: "Раствор красителя Судан III в 70% этиловом спирте",
		positiveReactionRu: "Желто-розовые капли и окрашенные жировые пятна",
		negativeReactionRu: "Равномерное стекание без окрашивания жировых включений",
		observationTimeSeconds: 45,
		sanpinRequirementRu:
			"СанПиН 3.3686-21: контроль качества очистки вращающихся инструментов и смазанных наконечников",
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
