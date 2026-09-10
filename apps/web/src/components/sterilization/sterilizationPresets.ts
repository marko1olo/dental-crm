/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION PRESETS & PROTOCOLS ENGINE
 * Нормативные классификаторы СанПиН 3.3686-21, 1-кликовые пресеты автоклавирования
 * класса B (форма № 257/у), контроль качества ПСО (форма № 366/у: азопирам,
 * фенолфталеин) и моментальная генерация валидных крафт-пакетов без бюрократии.
 * ============================================================================
 */

import type { ParsedKraftBarcode } from "@dental/shared";

// ─────────────────────────────────────────────────────────────────────────────
// 1. SAMPLE TEST BARCODES (БЫСТРЫЕ ОБРАЗЦЫ ДЛЯ ПРОВЕРКИ)
// ─────────────────────────────────────────────────────────────────────────────

export interface SampleKraftBarcode {
	readonly label: string;
	readonly barcode: string;
	readonly badge: string;
	readonly description?: string;
}

function getDynamicSampleBarcodes(): readonly SampleKraftBarcode[] {
	const now = new Date();
	const packDateIso = now.toISOString().slice(0, 10);
	const dateDigits = packDateIso.replace(/-/g, "").slice(2); // YYMMDD
	const fullDateDigits = packDateIso.replace(/-/g, ""); // YYYYMMDD
	const expDate = new Date(now.getTime() + 50 * 24 * 3600 * 1000);
	const expDateIso = expDate.toISOString().slice(0, 10);

	return [
		{
			label: "Терапевтический лоток (50 сут.)",
			barcode: `KB${dateDigits}0001`,
			badge: "Терапия",
			description: "Стандартный смотровой лоток в самоклеящемся крафт-пакете",
		},
		{
			label: "Эндодонтический набор (134°C / Класс 5)",
			barcode: `ENDO-TRAY-${now.getFullYear()}`,
			badge: "Эндодонтия",
			description: "Стерильный эндодонтический лоток с химическим интегратором 5 класса",
		},
		{
			label: "Хирургический набор экстракционный",
			barcode: `SURG-TRAY-${now.getFullYear()}`,
			badge: "Хирургия",
			description: "Хирургические элеваторы и щипцы в двойной стерильной упаковке",
		},
		{
			label: "2D DataMatrix (АК-01, Цикл №3)",
			barcode: `KB-${fullDateDigits}-01#1|АК-01|CYC3|${packDateIso}|${expDateIso}|NURSE-01|set_therapeutic_tray`,
			badge: "DataMatrix 2D",
			description: "Полный машиночитаемый паспорт стерилизации DataMatrix 2D",
		},
		{
			label: "Просроченный пакет (Мягкий допуск острая боль)",
			barcode: "KB2401010001",
			badge: "Просрочен",
			description: "Тест обнаружения нарушения п. 3632 СанПиН 3.3686-21 с мягким допуском",
		},
	];
}

export const SAMPLE_TEST_BARCODES: readonly SampleKraftBarcode[] = getDynamicSampleBarcodes();

// ─────────────────────────────────────────────────────────────────────────────
// 2. ДАННЫЕ И ТИПЫ ДЛЯ ЖУРНАЛА АВТОКЛАВИРОВАНИЯ (ФОРМА № 257/У)
// ─────────────────────────────────────────────────────────────────────────────

export interface AutoclaveCycleRecord {
	readonly id: string;
	readonly cycleNumber: number;
	readonly autoclaveCode: string;
	readonly autoclaveModel: string;
	readonly programName?: string;
	readonly sterilizerType?: "autoclave_class_b" | "dry_heat";
	readonly temperatureC: number;
	readonly pressureBar: number;
	readonly exposureMinutes: number;
	readonly preVacuum: string;
	readonly indicatorPointsStatus: string;
	readonly indicatorBrand?: "Медтест" | "DGM Steriguard" | "Винар";
	readonly indicatorClass?: 4 | 5;
	readonly indicatorVerdict?: string;
	readonly kraftSize?: "75x150" | "100x200" | "150x250";
	readonly shelfLifeDays?: number;
	readonly bowieDickResult: "passed" | "not_performed" | "failed";
	readonly bowieDickNote: string;
	readonly loadDescription: string;
	readonly packageType: string;
	readonly batchVerdict: "ГОДНА" | "БРАК";
	readonly operatorName: string;
	readonly timestamp: string;
	readonly sanpinClause: string;
	readonly isQuickPreset?: boolean;
}

/**
 * Программы стерилизации для автоклавов B-класса (Melag, Euronda, W&H):
 * 1. «Универсальная 134°C / 2.1 бар / 5 мин (в упаковке)»
 * 2. «Быстрая / Prion 134°C / 20 мин»
 * 3. «Деликатная 121°C / 1.1 бар / 20 мин (для наконечников и пластика)»
 */
export const SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET: Omit<AutoclaveCycleRecord, "id" | "cycleNumber" | "timestamp"> = {
	programName: "Универсальная 134°C / 2.1 бар / 5 мин (в упаковке)",
	autoclaveCode: "АК-01",
	autoclaveModel: "MELAG Vacuklav 23 B+ / Euronda E9 Next / W&H Lisa (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 134,
	pressureBar: 2.1,
	exposureMinutes: 5,
	preVacuum: "3-кратное фракционированное предвакуумирование (EN 13060)",
	indicatorPointsStatus: "Индикаторы 5 класса (ИнтеТЕСТ-В-134/5 Винар / DGM Steriguard 5) во всех 5 точках камеры: Цвет эталона достигнут / Стерильно",
	indicatorBrand: "Винар",
	indicatorClass: 5,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "passed",
	bowieDickNote: "Тест Бови-Дика пройден: равномерное изменение цвета тест-пакета по всему полю (норма вакуума и пара)",
	loadDescription: "Смотровые лотки терапевта, хирургические наборы, наконечники в крафт-пакетах",
	packageType: "Самоклеящиеся крафт-пакеты 100x200 мм (до 50 суток хранения)",
	kraftSize: "100x200",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 п. 3630, МУ 287-113, Таблица 3.12",
	isQuickPreset: true,
};

export const SANPIN_AUTOCLAVE_PRION_134_PRESET: Omit<AutoclaveCycleRecord, "id" | "cycleNumber" | "timestamp"> = {
	programName: "Быстрая / Prion 134°C / 20 мин",
	autoclaveCode: "АК-01",
	autoclaveModel: "Euronda E9 Next / MELAG Vacuklav 23 B+ / W&H Lisa (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 134,
	pressureBar: 2.1,
	exposureMinutes: 20,
	preVacuum: "4-кратное фракционированное предвакуумирование (EN 13060)",
	indicatorPointsStatus: "Индикаторы 5 класса (DGM Steriguard 5 Integrator / ИнтеТЕСТ-В-134/20) во всех 5 точках камеры: Цвет эталона достигнут / Стерильно",
	indicatorBrand: "DGM Steriguard",
	indicatorClass: 5,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "passed",
	bowieDickNote: "Утренний тест Бови-Дика пройден без отклонений",
	loadDescription: "Хирургический и имплантологический инструментарий повышенного риска, костные распаторы, трепаны в крафт-пакетах 150x250 мм",
	packageType: "Самоклеящиеся крафт-пакеты 150x250 мм (до 50 суток хранения)",
	kraftSize: "150x250",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 п. 3628 (Антиприонный режим ВОЗ)",
	isQuickPreset: true,
};

export const SANPIN_AUTOCLAVE_DELICATE_121_PRESET: Omit<AutoclaveCycleRecord, "id" | "cycleNumber" | "timestamp"> = {
	programName: "Деликатная 121°C / 1.1 бар / 20 мин (для наконечников и пластика)",
	autoclaveCode: "АК-02",
	autoclaveModel: "W&H Lisa 500 / MELAG Vacuklav 23 B+ (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 121,
	pressureBar: 1.1,
	exposureMinutes: 20,
	preVacuum: "3-кратное фракционированное предвакуумирование",
	indicatorPointsStatus: "Индикаторы 4 класса (СтериТЕСТ-В-121 Винар / Медтест) во всех 5 точках камеры: Цвет эталона достигнут / Стерильно",
	indicatorBrand: "Винар",
	indicatorClass: 4,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "not_performed",
	bowieDickNote: "Не требуется для деликатного цикла 121°C",
	loadDescription: "Стоматологические наконечники, полимерные слепочные ложки, силиконовые изделия, световоды в крафт-пакетах 75x150 мм",
	packageType: "Самоклеящиеся крафт-пакеты 75x150 мм (до 50 суток хранения)",
	kraftSize: "75x150",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 Таблица 3.12 (Стерилизация термолабильных изделий)",
	isQuickPreset: true,
};

/**
 * Программы для сухожаровых шкафов (ГП-10/20/40 СПУ):
 * 1. 180°C / 60 минут
 * 2. 160°C / 150 минут
 */
export const SANPIN_DRY_HEAT_180_60_PRESET: Omit<AutoclaveCycleRecord, "id" | "cycleNumber" | "timestamp"> = {
	programName: "Сухожаровой шкаф 180°C / 60 минут",
	autoclaveCode: "СЖ-01",
	autoclaveModel: "ГП-10 / ГП-20 / ГП-40 СПУ (Сухожаровой шкаф)",
	sterilizerType: "dry_heat",
	temperatureC: 180,
	pressureBar: 0,
	exposureMinutes: 60,
	preVacuum: "Конвекционный прогрев сухожаровой камеры без вакуума",
	indicatorPointsStatus: "Индикаторы 4 класса (МедИС-180 Медтест) во всех 5 точках камеры: Цвет эталона достигнут / Стерильно",
	indicatorBrand: "Медтест",
	indicatorClass: 4,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "not_performed",
	bowieDickNote: "Не применяется для воздушного метода",
	loadDescription: "Цельнометаллические инструменты, боры, щипцы, элеваторы без полимеров и оптики",
	packageType: "Крафт-пакеты самоклеящиеся 100x200 мм (до 50 суток хранения)",
	kraftSize: "100x200",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 Таблица 3.13 (Воздушный метод)",
	isQuickPreset: true,
};

export const SANPIN_DRY_HEAT_160_150_PRESET: Omit<AutoclaveCycleRecord, "id" | "cycleNumber" | "timestamp"> = {
	programName: "Сухожаровой шкаф 160°C / 150 минут",
	autoclaveCode: "СЖ-01",
	autoclaveModel: "ГП-10 / ГП-20 / ГП-40 СПУ (Сухожаровой шкаф)",
	sterilizerType: "dry_heat",
	temperatureC: 160,
	pressureBar: 0,
	exposureMinutes: 150,
	preVacuum: "Конвекционный прогрев сухожаровой камеры 160°C",
	indicatorPointsStatus: "Индикаторы 4 класса (МедИС-160 Медтест / Винар) во всех 5 точках камеры: Цвет эталона достигнут / Стерильно",
	indicatorBrand: "Медтест",
	indicatorClass: 4,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "not_performed",
	bowieDickNote: "Не применяется для воздушного метода",
	loadDescription: "Металлические инструменты с ограниченной термостойкостью до 170°C в крафт-пакетах 75x150 мм",
	packageType: "Крафт-пакеты самоклеящиеся 75x150 мм (до 50 суток хранения)",
	kraftSize: "75x150",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 Таблица 3.13 (Щадящий воздушный режим)",
	isQuickPreset: true,
};

// Базовый алиас для обратной совместимости
export const SANPIN_AUTOCLAVE_CLASS_B_PRESET = SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET;

/**
 * Нормативные типоразмеры крафт-пакетов по СанПиН 3.3686-21 п. 3632:
 * 75x150 мм, 100x200 мм, 150x250 мм. Срок сохранения стерильности до 50 суток.
 */
export interface KraftPackageSizeOption {
	readonly id: "size_75x150" | "size_100x200" | "size_150x250";
	readonly dimensionsMm: string;
	readonly widthMm: number;
	readonly heightMm: number;
	readonly maxShelfLifeDays: number;
	readonly indicatorTypeRu: string;
	readonly typicalUsageRu: string;
}

export const STATUTORY_KRAFT_SIZES: readonly KraftPackageSizeOption[] = [
	{
		id: "size_75x150",
		dimensionsMm: "75x150 мм",
		widthMm: 75,
		heightMm: 150,
		maxShelfLifeDays: 50,
		indicatorTypeRu: "Химический индикатор 4/5 класса (Винар / DGM / Медтест)",
		typicalUsageRu: "Боры алмазные и твердосплавные, эндодонтические файлы, мелкий инструментарий",
	},
	{
		id: "size_100x200",
		dimensionsMm: "100x200 мм",
		widthMm: 100,
		heightMm: 200,
		maxShelfLifeDays: 50,
		indicatorTypeRu: "Химический интегратор 5 класса (ИнтеТЕСТ-В-134/5)",
		typicalUsageRu: "Стандартный смотровой терапевтический лоток (зеркало, зонд, пинцет, гладилка)",
	},
	{
		id: "size_150x250",
		dimensionsMm: "150x250 мм",
		widthMm: 150,
		heightMm: 250,
		maxShelfLifeDays: 50,
		indicatorTypeRu: "Химический интегратор 5 класса (DGM Steriguard 5 / ИнтеТЕСТ-В-134/20)",
		typicalUsageRu: "Хирургический экстракционный набор, кюреты Грейси, стоматологические наконечники",
	},
];

/**
 * Нормативные химические индикаторы 4-го и 5-го класса (Медтест, DGM Steriguard, Винар).
 * Стандартный результат: «Цвет эталона достигнут / Стерильно».
 */
export interface ChemicalIndicatorOption {
	readonly id: string;
	readonly manufacturer: "Медтест" | "DGM Steriguard" | "Винар";
	readonly tradeName: string;
	readonly indicatorClass: 4 | 5;
	readonly indicatorClassRu: string;
	readonly methodType: "steam" | "dry_heat";
	readonly targetRegimeRu: string;
	readonly standardResultVerdict: "Цвет эталона достигнут / Стерильно";
	readonly notesRu: string;
}

export const STATUTORY_CHEMICAL_INDICATOR_OPTIONS: readonly ChemicalIndicatorOption[] = [
	{
		id: "vinar_intetest_134_5",
		manufacturer: "Винар",
		tradeName: "ИнтеТЕСТ-В-134/5",
		indicatorClass: 5,
		indicatorClassRu: "5 класс (Химический интегратор пара)",
		methodType: "steam",
		targetRegimeRu: "134°C / 2.1 бар / 5 мин (в упаковке)",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Контроль критических параметров пара во всех 5 точках камеры автоклавов B-класса (Melag, Euronda, W&H)",
	},
	{
		id: "vinar_steritest_134_4",
		manufacturer: "Винар",
		tradeName: "СтериТЕСТ-В-134",
		indicatorClass: 4,
		indicatorClassRu: "4 класс (Многопараметрический индикатор)",
		methodType: "steam",
		targetRegimeRu: "134°C / 2.1 бар / 5 мин",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Многопеременный индикатор температуры и времени выдержки",
	},
	{
		id: "vinar_steritest_121_4",
		manufacturer: "Винар",
		tradeName: "СтериТЕСТ-В-121",
		indicatorClass: 4,
		indicatorClassRu: "4 класс (Многопараметрический индикатор)",
		methodType: "steam",
		targetRegimeRu: "121°C / 1.1 бар / 20 мин (для наконечников и пластика)",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Индикатор 4 класса для щадящего деликатного режима 121°C",
	},
	{
		id: "dgm_steriguard_5_integrator",
		manufacturer: "DGM Steriguard",
		tradeName: "DGM Steriguard 5 Integrator",
		indicatorClass: 5,
		indicatorClassRu: "5 класс (Химический интегратор пара)",
		methodType: "steam",
		targetRegimeRu: "134°C / 2.1 бар / 5 мин или 20 мин (Prion)",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Интегратор 5 класса DGM Steriguard с четким переходом в зону ACCEPT",
	},
	{
		id: "dgm_steriguard_4_multivariable",
		manufacturer: "DGM Steriguard",
		tradeName: "DGM Steriguard 4 Multivariable",
		indicatorClass: 4,
		indicatorClassRu: "4 класс (Многопеременный индикатор)",
		methodType: "steam",
		targetRegimeRu: "134°C / 2.1 бар / 5 мин (в упаковке)",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Многопараметрический химический индикатор 4 класса DGM Steriguard",
	},
	{
		id: "medtest_medis_180",
		manufacturer: "Медтест",
		tradeName: "МедИС-180 (Медтест)",
		indicatorClass: 4,
		indicatorClassRu: "4 класс (Воздушная стерилизация)",
		methodType: "dry_heat",
		targetRegimeRu: "180°C / 60 минут",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Контроль воздушной стерилизации в 5 точках сухожаровых шкафов ГП-10, ГП-20, ГП-40",
	},
	{
		id: "medtest_medis_160",
		manufacturer: "Медтест",
		tradeName: "МедИС-160 (Медтест)",
		indicatorClass: 4,
		indicatorClassRu: "4 класс (Воздушная стерилизация)",
		methodType: "dry_heat",
		targetRegimeRu: "160°C / 150 минут",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Контроль щадящего воздушного режима 160°C / 150 мин",
	},
	{
		id: "medtest_integrator_134",
		manufacturer: "Медтест",
		tradeName: "Медтест-Интегратор-134",
		indicatorClass: 5,
		indicatorClassRu: "5 класс (Паровой интегратор)",
		methodType: "steam",
		targetRegimeRu: "134°C / 2.1 бар / 5 мин",
		standardResultVerdict: "Цвет эталона достигнут / Стерильно",
		notesRu: "Интегратор 5 класса Медтест для паровых стерилизаторов B-класса",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. КОНТРОЛЬ КАЧЕСТВА ПСО (ФОРМА № 366/У: АЗОПИРАМ, ФЕНОЛФТАЛЕИН)
// ─────────────────────────────────────────────────────────────────────────────

export interface PsoQualityRecord {
	readonly id: string;
	readonly testType: "azopyram" | "phenolphthalein" | "both";
	readonly instrumentName: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly minSampleCountRequired?: number;
	readonly samplingSatisfied?: boolean;
	readonly azopyramResult: "negative" | "positive";
	readonly azopyramResultDescriptionRu?: string;
	readonly phenolphthaleinResult: "negative" | "positive";
	readonly phenolphthaleinResultDescriptionRu?: string;
	readonly detergentBrand: string;
	readonly isApproved: boolean;
	readonly operatorName: string;
	readonly timestamp: string;
	readonly sanpinClause: string;
	readonly notes: string;
}

/**
 * Фиксация результатов проб контроля качества ПСО по СанПиН 3.3686-21 п. 3584-3585:
 * Азопирамовая проба: отрицательная (окрашивания нет), положительная (сине-фиолетовое окрашивание).
 * Фенолфталеиновая проба: отрицательная (окрашивания нет), положительная (розовое окрашивание).
 */
export function formatPsoAzopyramResult(result: "negative" | "positive"): string {
	return result === "negative"
		? "Отрицательная — окрашивания нет"
		: "Положительная — сине-фиолетовое окрашивание";
}

export function formatPsoPhenolphthaleinResult(result: "negative" | "positive"): string {
	return result === "negative"
		? "Отрицательная — окрашивания нет"
		: "Положительная — розовое окрашивание";
}

/**
 * Расчет объема выборки для ПСО: не менее 1% от обработанной партии (не менее 3-5 изделий)
 */
export function calculatePsoSamplingCount(batchItemCount: number, isSurgicalSet = false): number {
	const count = Math.max(1, Math.floor(batchItemCount) || 1);
	const minFloor = isSurgicalSet ? 5 : 3;
	const onePercent = Math.ceil(count * 0.01);
	return Math.max(minFloor, onePercent);
}

export const SANPIN_AZOPYRAM_TEST_PRESET: Omit<PsoQualityRecord, "id" | "timestamp"> = {
	testType: "azopyram",
	instrumentName: "Терапевтический и хирургический инструментарий (зеркала, зонды, пинцеты, щипцы)",
	batchItemCount: 120,
	testedSampleCount: 5, // 1% от партии (не менее 3-5 изделий)
	minSampleCountRequired: 3,
	samplingSatisfied: true,
	azopyramResult: "negative",
	azopyramResultDescriptionRu: "Отрицательная — окрашивания нет",
	phenolphthaleinResult: "negative",
	phenolphthaleinResultDescriptionRu: "Отрицательная — окрашивания нет",
	detergentBrand: "Оптимакс Про 1.5% + ферментный очиститель",
	isApproved: true,
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 п. 3584, форма № 366/у",
	notes: "Азопирамовая проба (1% обработанной партии): Отрицательная — окрашивания нет в течение 1 мин (скрытая кровь отсутствует). Партия допущена к стерилизации по СанПиН 3.3686-21.",
};

export const SANPIN_PHENOLPHTHALEIN_TEST_PRESET: Omit<PsoQualityRecord, "id" | "timestamp"> = {
	testType: "phenolphthalein",
	instrumentName: "Смотровые лотки и наконечники после проточной отмывки дистиллированной водой",
	batchItemCount: 120,
	testedSampleCount: 5,
	minSampleCountRequired: 3,
	samplingSatisfied: true,
	azopyramResult: "negative",
	azopyramResultDescriptionRu: "Отрицательная — окрашивания нет",
	phenolphthaleinResult: "negative",
	phenolphthaleinResultDescriptionRu: "Отрицательная — окрашивания нет",
	detergentBrand: "Биолот 0.5%",
	isApproved: true,
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 п. 3585",
	notes: "Фенолфталеиновая проба (1% обработанной партии): Отрицательная — окрашивания нет (розовое окрашивание отсутствует, щелочные компоненты моющего средства полностью отмыты).",
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. ФАБРИКИ БЫСТРЫХ ЗАПИСЕЙ ЦСО В 1 КЛИК
// ─────────────────────────────────────────────────────────────────────────────

export function createQuickAutoclaveCycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): AutoclaveCycleRecord {
	return {
		id: `cycle-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickUniversalCycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): AutoclaveCycleRecord {
	return {
		id: `cycle-univ-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickPrionCycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): AutoclaveCycleRecord {
	return {
		id: `cycle-prion-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_PRION_134_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickDelicateCycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): AutoclaveCycleRecord {
	return {
		id: `cycle-delicate-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_DELICATE_121_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickDryHeat180Cycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): AutoclaveCycleRecord {
	return {
		id: `cycle-dry180-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_DRY_HEAT_180_60_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickDryHeat160Cycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): AutoclaveCycleRecord {
	return {
		id: `cycle-dry160-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_DRY_HEAT_160_150_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickAzopyramRecord(
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): PsoQualityRecord {
	return {
		id: `pso-azo-${Date.now()}`,
		...SANPIN_AZOPYRAM_TEST_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickPhenolphthaleinRecord(
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): PsoQualityRecord {
	return {
		id: `pso-ph-${Date.now()}`,
		...SANPIN_PHENOLPHTHALEIN_TEST_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ДИНАМИЧЕСКИЙ ГЕНЕРАТОР ВАЛИДНОГО СТАНДАРТНОГО ЛОТКА (1 КЛИК ДЛЯ ВРАЧА)
// ─────────────────────────────────────────────────────────────────────────────

export type StandardTrayType = "therapy" | "surgery" | "endo";

export interface StandardTrayDefinition {
	readonly id: StandardTrayType;
	readonly toolSetCode: string;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
}

export const STANDARD_TRAY_OPTIONS: readonly StandardTrayDefinition[] = [
	{
		id: "therapy",
		toolSetCode: "set_therapeutic_tray",
		labelRu: "Стандартный смотровой лоток терапевта (зеркало, зонд, пинцет, гладилка)",
		shortLabelRu: "Лоток терапевта",
		descriptionRu: "Базовый набор терапевтического приема в самоклеящемся крафт-пакете (50 сут.)",
	},
	{
		id: "surgery",
		toolSetCode: "set_surgery_basic",
		labelRu: "Хирургический набор экстракционный (элеваторы, щипцы, кюрета)",
		shortLabelRu: "Лоток хирурга",
		descriptionRu: "Хирургический экстракционный набор в двойной стерильной упаковке (60 сут.)",
	},
	{
		id: "endo",
		toolSetCode: "set_endo_instruments",
		labelRu: "Эндодонтический набор (файлы Ni-Ti, спредер, плаггер)",
		shortLabelRu: "Эндо-набор",
		descriptionRu: "Стерильный эндодонтический лоток с химическим интегратором 5 класса (134°C)",
	},
];

/**
 * Мгновенно генерирует валидный крафт-пакет со СВЕЖЕЙ сегодняшней датой стерилизации.
 * Освобождает врача и ассистента от необходимости сканировать физический ШК сканером.
 */
export function createStandardSterileTrayBarcode(
	trayType: StandardTrayType = "therapy",
	packDate: Date = new Date(),
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): ParsedKraftBarcode {
	const packDateIso = packDate.toISOString().slice(0, 10);
	const expDate = new Date(packDate.getTime() + 50 * 24 * 3600 * 1000);
	const expDateIso = expDate.toISOString().slice(0, 10);
	const fallbackTray: StandardTrayDefinition = STANDARD_TRAY_OPTIONS[0] ?? {
		id: "therapy",
		toolSetCode: "set_therapeutic_tray",
		labelRu: "Стандартный смотровой лоток терапевта",
		shortLabelRu: "Лоток терапевта",
		descriptionRu: "Базовый набор",
	};
	const trayDef = STANDARD_TRAY_OPTIONS.find((t) => t.id === trayType) ?? fallbackTray;

	const dateDigits = packDateIso.replace(/-/g, "");
	const rawInput = `KB-${dateDigits}-01#1|АК-01|CYC1|${packDateIso}|${expDateIso}|NURSE-01|${trayDef.toolSetCode}`;

	const formattedProtocolRecord043 = `Инструменты стерильны. Крафт-пакет №${rawInput} (Стерилизация инструментария: АК-01, цикл №1 от ${packDateIso}, годен до ${expDateIso}, ${trayDef.labelRu}), индикатор 5 класса (ИнтеТЕСТ 134°C) — норма. ${operatorName} [СанПиН 3.3686-21] вскрыт при пациенте.`;

	return {
		rawInput,
		barcodeType: "datamatrix_2d",
		isValid: true,
		isExpired: false,
		isExpiringSoon: false,
		daysRemaining: 50,
		daysLifespan: 50,
		batchId: `KB-${dateDigits}-01`,
		serialNumber: 1,
		autoclaveId: "АК-01 (Melag 23B+)",
		cycleNumber: 1,
		packDateIso,
		expDateIso,
		operatorId: "NURSE-01",
		operatorName,
		toolSetId: trayDef.toolSetCode,
		toolSetNameRu: trayDef.labelRu,
		packageMaterialId: "paper_self_seal_single",
		packageSizeId: "size_100x200",
		indicatorId: "vinar_intetest_5",
		indicatorClassRu: "Химический интегратор 5 класса (пар 134°C / норма)",
		indicatorPassed: true,
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14)",
		formattedProtocolRecord043,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. СТАРТОВЫЕ ДЕМО-ДАННЫЕ ДЛЯ ЦСО И СТУДИИ СТЕРИЛИЗАЦИИ
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_AUTOCLAVE_CYCLES_DEMO: readonly AutoclaveCycleRecord[] = [
	{
		id: "demo-cycle-01",
		cycleNumber: 1,
		autoclaveCode: "АК-01",
		autoclaveModel: "MELAG Vacuklav 23 B+ (Class B)",
		temperatureC: 134,
		pressureBar: 2.1,
		exposureMinutes: 5,
		preVacuum: "3-кратное фракционированное предвакуумирование (EN 13060)",
		indicatorPointsStatus: "Индикаторы 5 класса — норма во всех 5 точках камеры",
		bowieDickResult: "passed",
		bowieDickNote: "Тест Бови-Дика пройден (утренний контроль вакуума и проникновения пара)",
		loadDescription: "Смотровые лотки терапевта (4 шт), базовый хирургический лоток (2 шт)",
		packageType: "Самоклеящиеся крафт-пакеты",
		batchVerdict: "ГОДНА",
		operatorName: "Смирнова А.В. (медсестра ЦСО)",
		timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
		sanpinClause: "СанПиН 3.3686-21 п. 3630",
		isQuickPreset: true,
	},
	{
		id: "demo-cycle-02",
		cycleNumber: 2,
		autoclaveCode: "АК-01",
		autoclaveModel: "MELAG Vacuklav 23 B+ (Class B)",
		temperatureC: 134,
		pressureBar: 2.1,
		exposureMinutes: 5,
		preVacuum: "3-кратное фракционированное предвакуумирование (EN 13060)",
		indicatorPointsStatus: "Индикаторы 5 класса — норма во всех 5 точках камеры",
		bowieDickResult: "passed",
		bowieDickNote: "Тест Бови-Дика в норме",
		loadDescription: "Эндодонтические наборы, наконечники турбинные и угловые в пакетах",
		packageType: "Пакеты бумага-пленка термошовные",
		batchVerdict: "ГОДНА",
		operatorName: "Смирнова А.В. (медсестра ЦСО)",
		timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
		sanpinClause: "СанПиН 3.3686-21 п. 3630",
		isQuickPreset: true,
	},
];

export const DEFAULT_PSO_QUALITY_DEMO: readonly PsoQualityRecord[] = [
	{
		id: "demo-pso-01",
		testType: "both",
		instrumentName: "Терапевтический смотровой инструментарий (зеркала, зонды, пинцеты)",
		batchItemCount: 120,
		testedSampleCount: 5,
		azopyramResult: "negative",
		phenolphthaleinResult: "negative",
		detergentBrand: "Оптимакс Про 1.5%",
		isApproved: true,
		operatorName: "Смирнова А.В. (медсестра ЦСО)",
		timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
		sanpinClause: "СанПиН 3.3686-21 пп. 3584-3585, форма № 366/у",
		notes: "Азопирам и фенолфталеин отрицательны. Скрытая кровь и щелочные ПАВ отсутствуют.",
	},
	{
		id: "demo-pso-02",
		testType: "azopyram",
		instrumentName: "Хирургические экстракционные щипцы и элеваторы",
		batchItemCount: 40,
		testedSampleCount: 3,
		azopyramResult: "negative",
		phenolphthaleinResult: "negative",
		detergentBrand: "Биолот 0.5%",
		isApproved: true,
		operatorName: "Смирнова А.В. (медсестра ЦСО)",
		timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
		sanpinClause: "СанПиН 3.3686-21 п. 3584, форма № 366/у",
		notes: "Замковые части и щечки чистые. Азопирамовая проба отрицательная.",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. КОМПЛЕКСНЫЕ 1-КЛИКОВЫЕ ПРЕСЕТЫ СМЕНЫ МЕДСЕСТРЫ ЦСО (САНПИН 3.3686-21)
// ─────────────────────────────────────────────────────────────────────────────

export function createQuickCombinedPsoRecord(
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
	instrumentName = "Терапевтический и хирургический инструментарий смены"
): PsoQualityRecord {
	return {
		id: `pso-both-${Date.now()}`,
		testType: "both",
		instrumentName,
		batchItemCount: 150,
		testedSampleCount: 5,
		azopyramResult: "negative",
		phenolphthaleinResult: "negative",
		detergentBrand: "Оптимакс Про 1.5%",
		isApproved: true,
		operatorName,
		timestamp: new Date().toISOString(),
		sanpinClause: "СанПиН 3.3686-21 пп. 3584-3585, форма № 366/у",
		notes: "1-кликовая фиксация проб ПСО: азопирам (кровь) — отрицательно, фенолфталеин (щелочь) — отрицательно. Партия допущена к стерилизации.",
	};
}

export function createQuickDailyShiftAutoclaveCycles(
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): readonly AutoclaveCycleRecord[] {
	const now = Date.now();
	return [
		{
			id: `cycle-shift-1-${now}`,
			cycleNumber: 1,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			loadDescription: "Утренний тест Бови-Дика + смотровые лотки терапевта (4 шт)",
			operatorName,
			timestamp: new Date(now - 6 * 3600 * 1000).toISOString(),
		},
		{
			id: `cycle-shift-2-${now}`,
			cycleNumber: 2,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			loadDescription: "Эндодонтические наборы, турбинные и угловые наконечники в пакетах (6 шт)",
			operatorName,
			timestamp: new Date(now - 3 * 3600 * 1000).toISOString(),
		},
		{
			id: `cycle-shift-3-${now}`,
			cycleNumber: 3,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			loadDescription: "Хирургические экстракционные наборы, кюреты, шовный материал (4 шт)",
			operatorName,
			timestamp: new Date().toISOString(),
		},
	];
}

export function createQuickDailyShiftPsoRecords(
	operatorName = "Смирнова А.В. (медсестра ЦСО)"
): readonly PsoQualityRecord[] {
	const now = Date.now();
	return [
		{
			id: `pso-shift-1-${now}`,
			testType: "both",
			instrumentName: "Терапевтические смотровые лотки (зеркала, зонды, пинцеты)",
			batchItemCount: 120,
			testedSampleCount: 5,
			azopyramResult: "negative",
			phenolphthaleinResult: "negative",
			detergentBrand: "Оптимакс Про 1.5%",
			isApproved: true,
			operatorName,
			timestamp: new Date(now - 5 * 3600 * 1000).toISOString(),
			sanpinClause: "СанПиН 3.3686-21 пп. 3584-3585, форма № 366/у",
			notes: "Азопирамовая и фенолфталеиновая пробы отрицательны. Скрытая кровь и остатки СМС отсутствуют.",
		},
		{
			id: `pso-shift-2-${now}`,
			testType: "both",
			instrumentName: "Хирургический инструментарий (щипцы, элеваторы, кюреты)",
			batchItemCount: 45,
			testedSampleCount: 3,
			azopyramResult: "negative",
			phenolphthaleinResult: "negative",
			detergentBrand: "Оптимакс Про 1.5%",
			isApproved: true,
			operatorName,
			timestamp: new Date(now - 2 * 3600 * 1000).toISOString(),
			sanpinClause: "СанПиН 3.3686-21 пп. 3584-3585, форма № 366/у",
			notes: "Замковые щечки и рабочие поверхности чистые. Пробы отрицательны.",
		},
	];
}
