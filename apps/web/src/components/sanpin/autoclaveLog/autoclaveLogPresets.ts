/**
 * ============================================================================
 * SANPIN 3.3686-21 & MINZDRAV ORDER № 1030 (FORM № 257/U)
 * STATUTORY AUTOCLAVE & STERILIZATION REGISTERS, CYCLES & INDICATOR PRESETS
 * Нормативные классификаторы режимов стерилизации, 5 контрольных точек камеры,
 * химических интеграторов (4-5 класс), биоконтроля и типов упаковок.
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. СТЕРИЛИЗАЦИОННОЕ ОБОРУДОВАНИЕ (АВТОКЛАВЫ И СУХОЖАРОВЫЕ ШКАФЫ)
// ─────────────────────────────────────────────────────────────────────────────

export type SterilizerMethodType = "steam_autoclave" | "dry_heat_air" | "low_temp_plasma";

export type AutoclaveClassType = "class_b" | "class_s" | "class_n" | "dry_heat";

export interface SterilizerApparatusDefinition {
	readonly id: string;
	readonly code: string;
	readonly brand: string;
	readonly model: string;
	readonly serialNumber: string;
	readonly inventoryNumber: string;
	readonly methodType: SterilizerMethodType;
	readonly deviceClass: AutoclaveClassType;
	readonly chamberVolumeLiters: number;
	readonly maxTraysCount: number;
	readonly locationRoom: string;
	readonly commissionDate: string;
	readonly lastMaintenanceDate: string;
	readonly nextMaintenanceDate: string;
	readonly supportedRegimeIds: readonly SterilizationRegimeId[];
}

export const STATUTORY_STERILIZERS_CATALOG: readonly SterilizerApparatusDefinition[] = [
	{
		id: "autoclave-melag-vacuklav-23b",
		code: "АК-01",
		brand: "MELAG",
		model: "Vacuklav 23 B+ (Class B)",
		serialNumber: "2023-V23B-94812",
		inventoryNumber: "ИНВ-ЦСО-00124",
		methodType: "steam_autoclave",
		deviceClass: "class_b",
		chamberVolumeLiters: 22,
		maxTraysCount: 5,
		locationRoom: "Центральное стерилизационное отделение (ЦСО)",
		commissionDate: "2023-04-12",
		lastMaintenanceDate: "2026-06-15",
		nextMaintenanceDate: "2026-12-15",
		supportedRegimeIds: [
			"steam_134_5min",
			"steam_134_20min_prion",
			"steam_121_20min",
			"bowie_dick_test",
			"helix_pcd_test",
		],
	},
	{
		id: "autoclave-euronda-e9-med",
		code: "АК-02",
		brand: "Euronda",
		model: "E9 Next 18L (Class B)",
		serialNumber: "EU-E9N-839210",
		inventoryNumber: "ИНВ-ЦСО-00125",
		methodType: "steam_autoclave",
		deviceClass: "class_b",
		chamberVolumeLiters: 18,
		maxTraysCount: 4,
		locationRoom: "Центральное стерилизационное отделение (ЦСО)",
		commissionDate: "2024-01-20",
		lastMaintenanceDate: "2026-07-01",
		nextMaintenanceDate: "2027-01-01",
		supportedRegimeIds: [
			"steam_134_5min",
			"steam_134_20min_prion",
			"steam_121_20min",
			"bowie_dick_test",
			"helix_pcd_test",
		],
	},
	{
		id: "autoclave-woson-tanzo-c18",
		code: "АК-03",
		brand: "Woson",
		model: "Tanzo C18 (Class B)",
		serialNumber: "WS-TC18-55291",
		inventoryNumber: "ИНВ-ЦСО-00128",
		methodType: "steam_autoclave",
		deviceClass: "class_b",
		chamberVolumeLiters: 18,
		maxTraysCount: 3,
		locationRoom: "Стерилизационная блока хирургии",
		commissionDate: "2024-09-10",
		lastMaintenanceDate: "2026-03-10",
		nextMaintenanceDate: "2026-09-10",
		supportedRegimeIds: [
			"steam_134_5min",
			"steam_121_20min",
			"bowie_dick_test",
		],
	},
	{
		id: "dryheat-gpk-gp20-spu",
		code: "СЖ-01",
		brand: "Смоленск СКТБ СПУ",
		model: "ГП-20 СПУ (Сухожаровой шкаф)",
		serialNumber: "СПУ-ГП20-77120",
		inventoryNumber: "ИНВ-ЦСО-00130",
		methodType: "dry_heat_air",
		deviceClass: "dry_heat",
		chamberVolumeLiters: 20,
		maxTraysCount: 3,
		locationRoom: "Центральное стерилизационное отделение (ЦСО)",
		commissionDate: "2022-11-05",
		lastMaintenanceDate: "2026-05-18",
		nextMaintenanceDate: "2026-11-18",
		supportedRegimeIds: [
			"dry_heat_180_60min",
			"dry_heat_160_150min",
		],
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. РЕЖИМЫ СТЕРИЛИЗАЦИИ (САНПИН 3.3686-21 ТАБЛИЦЫ 3.12 / 3.13)
// ─────────────────────────────────────────────────────────────────────────────

export type SterilizationRegimeId =
	| "steam_134_5min"
	| "steam_134_20min_prion"
	| "steam_121_20min"
	| "dry_heat_180_60min"
	| "dry_heat_160_150min"
	| "bowie_dick_test"
	| "helix_pcd_test";

export interface SterilizationRegimeDefinition {
	readonly id: SterilizationRegimeId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly methodType: SterilizerMethodType;
	readonly targetTemperatureCelsius: number;
	readonly tempToleranceCelsius: { readonly min: number; readonly max: number };
	readonly targetPressureBar: number;
	readonly pressureToleranceBar: { readonly min: number; readonly max: number };
	readonly exposureTimeMinutes: number;
	readonly dryingTimeMinutes: number;
	readonly totalEstimatedMinutes: number;
	readonly vacuumPulses: number;
	readonly targetItemsDescriptionRu: string;
	readonly packagingTypesAllowed: readonly PackagingTypeId[];
	readonly chemicalIndicatorClassRequired: string;
	readonly sanpinNormRefRu: string;
	readonly colorTheme: "blue" | "teal" | "purple" | "amber" | "orange";
}

export const STATUTORY_STERILIZATION_REGIMES: readonly SterilizationRegimeDefinition[] = [
	{
		id: "steam_134_5min",
		nameRu: "Паровой метод — 134°C, 2.1 бар, 5 минут (Основной стоматологический)",
		shortLabelRu: "134°C (5 мин) • 2.1 бар",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 134,
		tempToleranceCelsius: { min: 134, max: 138 },
		targetPressureBar: 2.1,
		pressureToleranceBar: { min: 2.0, max: 2.3 },
		exposureTimeMinutes: 5,
		dryingTimeMinutes: 15,
		totalEstimatedMinutes: 38,
		vacuumPulses: 3,
		targetItemsDescriptionRu: "Стоматологические наконечники, боры, хирургический и смотровой инструмент, зеркала, пинцеты, лотки",
		packagingTypesAllowed: ["kraft_pouch_sealed", "kraft_pouch_self_seal", "crepe_paper", "bix_filter"],
		chemicalIndicatorClassRequired: "Класс 4 / 5 (СтериТЕСТ-В-134, ИнтеТЕСТ-В-134/5)",
		sanpinNormRefRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод под давлением)",
		colorTheme: "blue",
	},
	{
		id: "steam_134_20min_prion",
		nameRu: "Паровой усиленный антиприонный режим — 134°C, 2.1 бар, 20 минут",
		shortLabelRu: "134°C Антиприон (20 мин)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 134,
		tempToleranceCelsius: { min: 134, max: 138 },
		targetPressureBar: 2.1,
		pressureToleranceBar: { min: 2.0, max: 2.3 },
		exposureTimeMinutes: 20,
		dryingTimeMinutes: 20,
		totalEstimatedMinutes: 58,
		vacuumPulses: 4,
		targetItemsDescriptionRu: "Хирургический и имплантологический инструментарий высокого риска, костные распаторы, трепаны",
		packagingTypesAllowed: ["kraft_pouch_sealed", "bix_filter", "cassette_bipack"],
		chemicalIndicatorClassRequired: "Класс 5 / 6 (ИнтеТЕСТ-В-134/20)",
		sanpinNormRefRu: "СанПиН 3.3686-21 п. 3628 (Профилактика прионных инфекций)",
		colorTheme: "purple",
	},
	{
		id: "steam_121_20min",
		nameRu: "Паровой деликатный режим — 121°C, 1.1 бар, 20 минут",
		shortLabelRu: "121°C (20 мин) • 1.1 бар",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 121,
		tempToleranceCelsius: { min: 121, max: 125 },
		targetPressureBar: 1.1,
		pressureToleranceBar: { min: 1.0, max: 1.3 },
		exposureTimeMinutes: 20,
		dryingTimeMinutes: 15,
		totalEstimatedMinutes: 46,
		vacuumPulses: 3,
		targetItemsDescriptionRu: "Термолабильные полимеры, резина, OptraGate, силиконовые слепочные ложки, слюноотсосы многоразовые",
		packagingTypesAllowed: ["kraft_pouch_sealed", "kraft_pouch_self_seal", "crepe_paper"],
		chemicalIndicatorClassRequired: "Класс 4 / 5 (СтериТЕСТ-В-121, ИнтеТЕСТ-В-121/20)",
		sanpinNormRefRu: "СанПиН 3.3686-21 Таблица 3.12 (Стерилизация деликатных изделий)",
		colorTheme: "teal",
	},
	{
		id: "dry_heat_180_60min",
		nameRu: "Воздушный метод (Сухожар) — 180°C, 60 минут",
		shortLabelRu: "180°C (60 мин) • Сухожар",
		methodType: "dry_heat_air",
		targetTemperatureCelsius: 180,
		tempToleranceCelsius: { min: 178, max: 185 },
		targetPressureBar: 0,
		pressureToleranceBar: { min: 0, max: 0 },
		exposureTimeMinutes: 60,
		dryingTimeMinutes: 0,
		totalEstimatedMinutes: 90,
		vacuumPulses: 0,
		targetItemsDescriptionRu: "Цельнометаллические инструменты без пайки и оптики, щипцы, элеваторы, шпатели, лотки из нержавеющей стали",
		packagingTypesAllowed: ["kraft_pouch_sealed", "crepe_paper", "open_tray_immediate"],
		chemicalIndicatorClassRequired: "Класс 4 / 5 (МедИС-180, СтериТЕСТ-В-180)",
		sanpinNormRefRu: "СанПиН 3.3686-21 Таблица 3.13 (Воздушный метод)",
		colorTheme: "orange",
	},
	{
		id: "dry_heat_160_150min",
		nameRu: "Воздушный щадящий метод — 160°C, 150 минут",
		shortLabelRu: "160°C (150 мин) • Сухожар",
		methodType: "dry_heat_air",
		targetTemperatureCelsius: 160,
		tempToleranceCelsius: { min: 158, max: 165 },
		targetPressureBar: 0,
		pressureToleranceBar: { min: 0, max: 0 },
		exposureTimeMinutes: 150,
		dryingTimeMinutes: 0,
		totalEstimatedMinutes: 195,
		vacuumPulses: 0,
		targetItemsDescriptionRu: "Металлические изделия с ограниченной термостойкостью",
		packagingTypesAllowed: ["kraft_pouch_sealed", "crepe_paper"],
		chemicalIndicatorClassRequired: "Класс 4 (МедИС-160)",
		sanpinNormRefRu: "СанПиН 3.3686-21 Таблица 3.13",
		colorTheme: "amber",
	},
	{
		id: "bowie_dick_test",
		nameRu: "Тест Бови-Дика (Bowie-Dick) — 134°C, 3.5 мин (Контроль вакуумной системы)",
		shortLabelRu: "Bowie-Dick Test (134°C)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 134,
		tempToleranceCelsius: { min: 134, max: 137 },
		targetPressureBar: 2.1,
		pressureToleranceBar: { min: 2.0, max: 2.3 },
		exposureTimeMinutes: 3.5,
		dryingTimeMinutes: 5,
		totalEstimatedMinutes: 22,
		vacuumPulses: 3,
		targetItemsDescriptionRu: "Тестовый стандартный пакет Бови-Дика (контроль полноты удаления воздуха и проникновения пара)",
		packagingTypesAllowed: ["test_pack_special"],
		chemicalIndicatorClassRequired: "Тест-лист Бови-Дика Класс 2 (ISO 11140-4)",
		sanpinNormRefRu: "ГОСТ ISO 17665-1 / СанПиН 3.3686-21 п. 3640 (Ежедневный утренний тест)",
		colorTheme: "blue",
	},
	{
		id: "helix_pcd_test",
		nameRu: "Хеликс-тест (Helix PCD) — 134°C, 3.5 мин (Контроль полых изделий)",
		shortLabelRu: "Helix-Test PCD (134°C)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 134,
		tempToleranceCelsius: { min: 134, max: 137 },
		targetPressureBar: 2.1,
		pressureToleranceBar: { min: 2.0, max: 2.3 },
		exposureTimeMinutes: 3.5,
		dryingTimeMinutes: 5,
		totalEstimatedMinutes: 22,
		vacuumPulses: 3,
		targetItemsDescriptionRu: "Тестовая капсула Helix с длинной капиллярной трубкой (контроль стерилизации внутренних каналов наконечников)",
		packagingTypesAllowed: ["test_pack_special"],
		chemicalIndicatorClassRequired: "Индикаторная полоска Helix PCD Класс 2 (EN 867-5)",
		sanpinNormRefRu: "СанПиН 3.3686-21 / ГОСТ Р ЕН 867-5 (Контроль стерилизации наконечников)",
		colorTheme: "purple",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. 5 КОНТРОЛЬНЫХ ТОЧЕК КАМЕРЫ СТЕРИЛИЗАТОРА (САНПИН 3.3686-21)
// ─────────────────────────────────────────────────────────────────────────────

export interface ChamberControlPointDefinition {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly nameRu: string;
	readonly physicalLocationRu: string;
	readonly thermodynamicRiskFactorRu: string;
	readonly coordinateX: number; // 0-100% relative coordinates for 2D/3D visualization
	readonly coordinateY: number;
	readonly coordinateZ: number; // depth layer: 0 (front) to 100 (back)
}

export const STATUTORY_CHAMBER_5_POINTS: readonly ChamberControlPointDefinition[] = [
	{
		pointIndex: 1,
		code: "КТ-1",
		nameRu: "Точка 1: Верхний передний угол",
		physicalLocationRu: "Верхняя полка загрузочной клети, левый передний угол камеры",
		thermodynamicRiskFactorRu: "Зона скопления неконденсируемых газов и воздушных карманов",
		coordinateX: 22,
		coordinateY: 20,
		coordinateZ: 25,
	},
	{
		pointIndex: 2,
		code: "КТ-2",
		nameRu: "Точка 2: Нижний угол у стока конденсата",
		physicalLocationRu: "Нижняя полка, правый передний угол у дренажного отверстия",
		thermodynamicRiskFactorRu: "Холодная точка скопления охлажденного конденсата",
		coordinateX: 78,
		coordinateY: 80,
		coordinateZ: 25,
	},
	{
		pointIndex: 3,
		code: "КТ-3",
		nameRu: "Точка 3: Геометрический центр камеры",
		physicalLocationRu: "Центральная корзина, ядро стерилизационной загрузки",
		thermodynamicRiskFactorRu: "Максимальная плотность упаковки и замедленный прогрев",
		coordinateX: 50,
		coordinateY: 50,
		coordinateZ: 50,
	},
	{
		pointIndex: 4,
		code: "КТ-4",
		nameRu: "Точка 4: Зона уплотнителя дверцы",
		physicalLocationRu: "Передний край нижней/средней полки, 3-5 см от силиконовой прокладки двери",
		thermodynamicRiskFactorRu: "Теплопотери через металлическую дверь и уплотнитель",
		coordinateX: 50,
		coordinateY: 82,
		coordinateZ: 10,
	},
	{
		pointIndex: 5,
		code: "КТ-5",
		nameRu: "Точка 5: Задняя стенка у паровыпускного клапана",
		physicalLocationRu: "Задняя часть камеры у парораспределительного коллектора",
		thermodynamicRiskFactorRu: "Перепады давления и градиент насыщения сухого пара",
		coordinateX: 50,
		coordinateY: 25,
		coordinateZ: 90,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. КАТАЛОГ ХИМИЧЕСКИХ И БИОЛОГИЧЕСКИХ ИНДИКАТОРОВ
// ─────────────────────────────────────────────────────────────────────────────

export interface ChemicalIndicatorDefinition {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly manufacturerRu: string;
	readonly indicatorClass: 4 | 5 | 6 | 2;
	readonly indicatorTypeDescriptionRu: string;
	readonly suitableRegimeIds: readonly SterilizationRegimeId[];
	readonly initialColorRu: string;
	readonly passedColorRu: string;
	readonly failedColorRu: string;
	readonly initialColorHex: string;
	readonly passedColorHex: string;
	readonly failedColorHex: string;
	readonly inspectionStandardRu: string;
}

export const STATUTORY_CHEMICAL_INDICATORS: readonly ChemicalIndicatorDefinition[] = [
	{
		id: "steritest_v_134",
		tradeNameRu: "СтериТЕСТ-В-134 (Винар)",
		manufacturerRu: "НПФ «Винар», Россия",
		indicatorClass: 4,
		indicatorTypeDescriptionRu: "Многопеременный химический индикатор 4 класса (температура + время)",
		suitableRegimeIds: ["steam_134_5min", "steam_134_20min_prion"],
		initialColorRu: "Сине-зеленый",
		passedColorRu: "Темно-коричневый / черный",
		failedColorRu: "Светло-коричневый или зеленый (неполный переход)",
		initialColorHex: "#0ea5e9",
		passedColorHex: "#3e2723",
		failedColorHex: "#84cc16",
		inspectionStandardRu: "ГОСТ ISO 11140-1-2011 (Класс 4)",
	},
	{
		id: "intetest_v_134_5",
		tradeNameRu: "ИнтеТЕСТ-В-134/5 (Винар)",
		manufacturerRu: "НПФ «Винар», Россия",
		indicatorClass: 5,
		indicatorTypeDescriptionRu: "Интегрирующий индикатор 5 класса (пар + температура + время)",
		suitableRegimeIds: ["steam_134_5min", "steam_134_20min_prion"],
		initialColorRu: "Фиолетовый",
		passedColorRu: "Ярко-зеленый (точное соответствие эталону)",
		failedColorRu: "Грязно-синий или пурпурный",
		initialColorHex: "#8b5cf6",
		passedColorHex: "#10b981",
		failedColorHex: "#ef4444",
		inspectionStandardRu: "ГОСТ ISO 11140-1-2011 (Класс 5 Интегратор)",
	},
	{
		id: "steritest_v_121",
		tradeNameRu: "СтериТЕСТ-В-121 (Винар)",
		manufacturerRu: "НПФ «Винар», Россия",
		indicatorClass: 4,
		indicatorTypeDescriptionRu: "Химический индикатор 4 класса для деликатного режима 121°C",
		suitableRegimeIds: ["steam_121_20min"],
		initialColorRu: "Розово-красный",
		passedColorRu: "Темно-коричневый",
		failedColorRu: "Оранжевый / светло-красный",
		initialColorHex: "#f43f5e",
		passedColorHex: "#451a03",
		failedColorHex: "#fb923c",
		inspectionStandardRu: "ГОСТ ISO 11140-1-2011 (Класс 4)",
	},
	{
		id: "medis_180",
		tradeNameRu: "МедИС-180 (Медтест)",
		manufacturerRu: "ООО «Медтест-СПб», Россия",
		indicatorClass: 4,
		indicatorTypeDescriptionRu: "Химический индикатор 4 класса для сухожарового шкафа (180°C)",
		suitableRegimeIds: ["dry_heat_180_60min"],
		initialColorRu: "Синий",
		passedColorRu: "Коричневый / темно-коричневый",
		failedColorRu: "Серо-синий",
		initialColorHex: "#2563eb",
		passedColorHex: "#3f2c22",
		failedColorHex: "#64748b",
		inspectionStandardRu: "ГОСТ ISO 11140-1-2011",
	},
	{
		id: "bowie_dick_vinar_sheet",
		tradeNameRu: "Тест-пакет Бови-Дик-ВИНАР",
		manufacturerRu: "НПФ «Винар», Россия",
		indicatorClass: 2,
		indicatorTypeDescriptionRu: "Тест-лист 2 класса для контроля удаления воздуха из автоклава",
		suitableRegimeIds: ["bowie_dick_test"],
		initialColorRu: "Желтый с рисунком",
		passedColorRu: "Равномерно черный по всей площади листа без светлых пятен",
		failedColorRu: "Светло-желтое пятно в центре (воздушный пузырь)",
		initialColorHex: "#eab308",
		passedColorHex: "#09090b",
		failedColorHex: "#f59e0b",
		inspectionStandardRu: "ГОСТ ISO 11140-4",
	},
];

export interface BioIndicatorDefinition {
	readonly id: string;
	readonly microorganismName: string;
	readonly sporeCount: string;
	readonly suitableMethod: SterilizerMethodType;
	readonly incubationHours: number;
	readonly incubationTempCelsius: number;
	readonly growthSignRu: string;
	readonly sterileSignRu: string;
	readonly periodicityRu: string;
	readonly sanpinNormRefRu: string;
}

export const STATUTORY_BIO_INDICATORS: readonly BioIndicatorDefinition[] = [
	{
		id: "bio_geobacillus_stearothermophilus",
		microorganismName: "Geobacillus stearothermophilus (штамм ATCC 7953 / ВКМ В-718)",
		sporeCount: "1.0 × 10^6 спор на носителе",
		suitableMethod: "steam_autoclave",
		incubationHours: 48,
		incubationTempCelsius: 55,
		growthSignRu: "Помутнение питательной среды и изменение цвета с фиолетового на желтый (БРАК)",
		sterileSignRu: "Среда прозрачная, цвет фиолетовый сохранен (СТЕРИЛЬНО)",
		periodicityRu: "1 раз в 6 месяцев, а также после монтажа, ремонта и при неудовлетворительном химконтроле",
		sanpinNormRefRu: "СанПиН 3.3686-21 п. 3642 и МУК 4.2.1990-05",
	},
	{
		id: "bio_bacillus_atrophaeus",
		microorganismName: "Bacillus atrophaeus (штамм ATCC 9372 / ВКМ В-828)",
		sporeCount: "1.0 × 10^6 спор на носителе",
		suitableMethod: "dry_heat_air",
		incubationHours: 48,
		incubationTempCelsius: 37,
		growthSignRu: "Помутнение среды и выпадение хлопьевидного осадка",
		sterileSignRu: "Питательная среда абсолютно прозрачная",
		periodicityRu: "1 раз в 6 месяцев / после ТО сухожара",
		sanpinNormRefRu: "СанПиН 3.3686-21 п. 3642",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. УПАКОВОЧНЫЕ МАТЕРИАЛЫ И СРОКИ СОХРАНЕНИЯ СТЕРИЛЬНОСТИ
// ─────────────────────────────────────────────────────────────────────────────

export type PackagingTypeId =
	| "kraft_pouch_sealed"
	| "kraft_pouch_self_seal"
	| "crepe_paper"
	| "bix_filter"
	| "cassette_bipack"
	| "open_tray_immediate"
	| "test_pack_special";

export interface PackagingTypeDefinition {
	readonly id: PackagingTypeId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly shelfLifeDays: number;
	readonly shelfLifeDescriptionRu: string;
	readonly sealingMethodRu: string;
	readonly sanpinRequirementRu: string;
}

export const STATUTORY_PACKAGING_TYPES: readonly PackagingTypeDefinition[] = [
	{
		id: "kraft_pouch_sealed",
		nameRu: "Пакет комбинированный термосварной (бумага + прозрачная пленка)",
		shortLabelRu: "Термошов (комби)",
		shelfLifeDays: 60,
		shelfLifeDescriptionRu: "До 60 суток базово (до 180 суток в чистых боксах по СанПиН 3.3686-21 Табл. 3.14)",
		sealingMethodRu: "Импульсный термосварочный аппарат (180–200°C)",
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3632: Обязательная маркировка даты, времени, смены и подписи",
	},
	{
		id: "kraft_pouch_self_seal",
		nameRu: "Крафт-пакет самоклеящийся с клейкой лентой",
		shortLabelRu: "Крафт-самоклейка",
		shelfLifeDays: 30,
		shelfLifeDescriptionRu: "До 30 суток в закрытых сухих шкафах (СанПиН 3.3686-21 п. 3632)",
		sealingMethodRu: "Защитная клейкая полоса с ручным прижимом",
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3632",
	},
	{
		id: "crepe_paper",
		nameRu: "Крепированная стерилизационная бумага (двойная обертка)",
		shortLabelRu: "Креп-бумага (2 сл.)",
		shelfLifeDays: 60,
		shelfLifeDescriptionRu: "До 60 суток в двойной стерилизационной обертке (СанПиН 3.3686-21 п. 3633)",
		sealingMethodRu: "Метод конверта с фиксацией индикаторной лентой",
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3633",
	},
	{
		id: "bix_filter",
		nameRu: "Стерилизационная коробка (Бикс КФ с антибактериальным фильтром)",
		shortLabelRu: "Бикс КФ (фильтр)",
		shelfLifeDays: 20,
		shelfLifeDescriptionRu: "До 20 суток при целостности фильтров",
		sealingMethodRu: "Замковый механизм бикса + сменные хлопчатобумажные фильтры",
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3635",
	},
	{
		id: "cassette_bipack",
		nameRu: "Хирургическая кассета в двойном барьерном пакете (Бипак)",
		shortLabelRu: "Кассета-Бипак",
		shelfLifeDays: 60,
		shelfLifeDescriptionRu: "До 60 суток для имплантологических наборов",
		sealingMethodRu: "Двойной термосварной шов",
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3634",
	},
	{
		id: "open_tray_immediate",
		nameRu: "Открытый лоток (для немедленного использования у кресла)",
		shortLabelRu: "Без упаковки (сразу)",
		shelfLifeDays: 0,
		shelfLifeDescriptionRu: "Использование в течение 1 часа на стерильном столе",
		sealingMethodRu: "Без упаковки / накрытый стерильной салфеткой стол",
		sanpinRequirementRu: "СанПиН 3.3686-21 п. 3638 (Запрещено длительное хранение)",
	},
	{
		id: "test_pack_special",
		nameRu: "Специальный тестовый пакет контроля (Bowie-Dick / Helix PCD)",
		shortLabelRu: "Тест-пакет PCD",
		shelfLifeDays: 0,
		shelfLifeDescriptionRu: "Распечатывается сразу после цикла для оценки теста",
		sealingMethodRu: "Заводская контрольная сборка",
		sanpinRequirementRu: "ГОСТ ISO 11140-4",
	},
];
